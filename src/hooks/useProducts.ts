import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, SetItem, calculateFinalPrice } from '@/types/product';
import { toast } from '@/hooks/use-toast';

// Type for database product
interface DbProduct {
  id: string;
  name: string;
  category: 'floor_sample' | 'online_inventory';
  product_type: string | null;
  subcategory: string | null;
  description: string;
  price_original: number;
  discount_percent: number;
  price_final: number;
  is_new: boolean;
  tags: ('new' | 'sale' | 'staff_pick')[];
  main_image_url: string;
  created_at: string;
  updated_at: string;
}

interface DbProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
}

interface DbSetItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
}

interface DbSetItemImage {
  id: string;
  set_item_id: string;
  image_url: string;
  display_order: number;
}

// Helper function to retry failed requests with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delay: number = 300
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

// Convert database product to frontend Product type
function dbToProduct(
  dbProduct: DbProduct,
  images: DbProductImage[],
  setItems: DbSetItem[],
  setItemImages: DbSetItemImage[] = []
): Product {
  const imageUrls = images
    .sort((a, b) => a.display_order - b.display_order)
    .map((img) => img.image_url);

  const productSetItems: SetItem[] = setItems
    .sort((a, b) => a.display_order - b.display_order)
    .map((item) => {
      const itemImages = setItemImages
        .filter((img) => img.set_item_id === item.id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((img) => img.image_url);

      return {
        id: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.image_url || undefined,
        imageUrls: itemImages.length > 0 ? itemImages : undefined,
      };
    });

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    category: dbProduct.category,
    productType: dbProduct.product_type || undefined,
    subcategory: dbProduct.subcategory || undefined,
    description: dbProduct.description,
    priceOriginal: dbProduct.price_original,
    discountPercent: dbProduct.discount_percent,
    priceFinal: dbProduct.price_final,
    isNew: dbProduct.is_new,
    tags: dbProduct.tags || [],
    mainImageUrl: dbProduct.main_image_url,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    setItems: productSetItems.length > 0 ? productSetItems : undefined,
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all products with retry
      const productsResult = await withRetry(async () => {
        const result = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (result.error) throw result.error;
        return result;
      });

      if (!productsResult.data || productsResult.data.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      const productIds = productsResult.data.map((p) => p.id);

      // Fetch all related data in parallel with retry
      const [imagesResult, setItemsResult] = await Promise.all([
        withRetry(async () => {
          const result = await supabase
            .from('product_images')
            .select('*')
            .in('product_id', productIds);
          if (result.error) throw result.error;
          return result;
        }),
        withRetry(async () => {
          const result = await supabase
            .from('set_items')
            .select('*')
            .in('product_id', productIds);
          if (result.error) throw result.error;
          return result;
        }),
      ]);

      // Fetch set item images if we have set items
      const setItemIds = (setItemsResult.data || []).map((item) => item.id);
      let setItemImagesData: DbSetItemImage[] | null = null;
      if (setItemIds.length > 0) {
        try {
          const result = await withRetry(async () => {
            const res = await supabase
              .from('set_item_images')
              .select('*')
              .in('set_item_id', setItemIds);
            if (res.error) throw res.error;
            return res;
          });
          setItemImagesData = result.data as DbSetItemImage[];
        } catch {
          console.warn('set_item_images fetch failed, continuing without');
        }
      }

      // Convert to frontend products
      const imagesData = imagesResult.data || [];
      const setItemsData = setItemsResult.data || [];
      const frontendProducts = productsResult.data.map((dbProduct) => {
        const productImages = imagesData.filter(
          (img) => img.product_id === dbProduct.id
        ) as DbProductImage[];
        const productSetItems = setItemsData.filter(
          (item) => item.product_id === dbProduct.id
        ) as DbSetItem[];
        const productSetItemImages = ((setItemImagesData || []) as DbSetItemImage[]).filter(
          (img) => productSetItems.some((item) => item.id === img.set_item_id)
        );

        return dbToProduct(
          dbProduct as DbProduct,
          productImages,
          productSetItems,
          productSetItemImages
        );
      });

      setProducts(frontendProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceFinal'>
  ) => {
    try {
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: product.name,
          category: product.category,
          product_type: product.productType || null,
          subcategory: product.subcategory || null,
          description: product.description,
          price_original: product.priceOriginal,
          discount_percent: product.discountPercent,
          is_new: product.isNew,
          tags: product.tags,
          main_image_url: product.mainImageUrl,
        })
        .select()
        .single();

      if (productError) throw productError;

      if (product.imageUrls && product.imageUrls.length > 0) {
        const imageInserts = product.imageUrls.map((url, index) => ({
          product_id: newProduct.id,
          image_url: url,
          display_order: index,
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }

      if (product.setItems && product.setItems.length > 0) {
        const setItemInserts = product.setItems.map((item, index) => ({
          product_id: newProduct.id,
          name: item.name,
          price: item.price,
          image_url:
            item.imageUrl ||
            (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null),
          display_order: index,
        }));

        const { data: insertedSetItems, error: setItemsError } = await supabase
          .from('set_items')
          .insert(setItemInserts)
          .select();

        if (setItemsError) throw setItemsError;

        if (insertedSetItems) {
          const setItemImageInserts: Array<{
            set_item_id: string;
            image_url: string;
            display_order: number;
          }> = [];

          product.setItems.forEach((item, itemIndex) => {
            const insertedItem = insertedSetItems[itemIndex];
            if (insertedItem && item.imageUrls && item.imageUrls.length > 0) {
              item.imageUrls.forEach((url, imgIndex) => {
                setItemImageInserts.push({
                  set_item_id: insertedItem.id,
                  image_url: url,
                  display_order: imgIndex,
                });
              });
            }
          });

          if (setItemImageInserts.length > 0) {
            const { error: setItemImagesError } = await supabase
              .from('set_item_images')
              .insert(setItemImageInserts);

            if (setItemImagesError) {
              console.warn('Failed to insert set item images:', setItemImagesError);
            }
          }
        }
      }

      const now = new Date().toISOString();
      const newFrontendProduct: Product = {
        id: newProduct.id,
        name: product.name,
        category: product.category,
        productType: product.productType,
        subcategory: product.subcategory,
        description: product.description,
        priceOriginal: product.priceOriginal,
        discountPercent: product.discountPercent,
        priceFinal: calculateFinalPrice(product.priceOriginal, product.discountPercent),
        isNew: product.isNew,
        tags: product.tags,
        mainImageUrl: product.mainImageUrl,
        imageUrls: product.imageUrls,
        setItems: product.setItems,
        createdAt: now,
        updatedAt: now,
      };

      setProducts((prev) => [newFrontendProduct, ...prev]);

      toast({ title: 'Product added successfully' });
      return newProduct;
    } catch (err: any) {
      console.error('Error adding product:', err);
      await fetchProducts();
      const errorMessage = err?.message || 'Unknown error occurred';
      toast({
        title: 'Failed to add product',
        description:
          errorMessage.length > 100
            ? 'Please check the console for details.'
            : errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateProduct = async (
    id: string,
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceFinal'>
  ) => {
    try {
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: product.name,
          category: product.category,
          product_type: product.productType || null,
          subcategory: product.subcategory || null,
          description: product.description,
          price_original: product.priceOriginal,
          discount_percent: product.discountPercent,
          is_new: product.isNew,
          tags: product.tags,
          main_image_url: product.mainImageUrl,
        })
        .eq('id', id);

      if (productError) throw productError;

      await supabase.from('product_images').delete().eq('product_id', id);

      if (product.imageUrls && product.imageUrls.length > 0) {
        const imageInserts = product.imageUrls.map((url, index) => ({
          product_id: id,
          image_url: url,
          display_order: index,
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }

      const { data: existingSetItems } = await supabase
        .from('set_items')
        .select('id')
        .eq('product_id', id);

      if (existingSetItems && existingSetItems.length > 0) {
        const existingSetItemIds = existingSetItems.map((item) => item.id);
        await supabase
          .from('set_item_images')
          .delete()
          .in('set_item_id', existingSetItemIds);
      }

      await supabase.from('set_items').delete().eq('product_id', id);

      if (product.setItems && product.setItems.length > 0) {
        const setItemInserts = product.setItems.map((item, index) => ({
          product_id: id,
          name: item.name,
          price: item.price,
          image_url:
            item.imageUrl ||
            (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null),
          display_order: index,
        }));

        const { data: insertedSetItems, error: setItemsError } = await supabase
          .from('set_items')
          .insert(setItemInserts)
          .select();

        if (setItemsError) throw setItemsError;

        if (insertedSetItems) {
          const setItemImageInserts: Array<{
            set_item_id: string;
            image_url: string;
            display_order: number;
          }> = [];

          product.setItems.forEach((item, itemIndex) => {
            const insertedItem = insertedSetItems[itemIndex];
            if (insertedItem && item.imageUrls && item.imageUrls.length > 0) {
              item.imageUrls.forEach((url, imgIndex) => {
                setItemImageInserts.push({
                  set_item_id: insertedItem.id,
                  image_url: url,
                  display_order: imgIndex,
                });
              });
            }
          });

          if (setItemImageInserts.length > 0) {
            const { error: setItemImagesError } = await supabase
              .from('set_item_images')
              .insert(setItemImageInserts);

            if (setItemImagesError) {
              console.warn('Failed to insert set item images:', setItemImagesError);
            }
          }
        }
      }

      const now = new Date().toISOString();
      const updatedProduct: Product = {
        id,
        name: product.name,
        category: product.category,
        productType: product.productType,
        subcategory: product.subcategory,
        description: product.description,
        priceOriginal: product.priceOriginal,
        discountPercent: product.discountPercent,
        priceFinal: calculateFinalPrice(product.priceOriginal, product.discountPercent),
        isNew: product.isNew,
        tags: product.tags,
        mainImageUrl: product.mainImageUrl,
        imageUrls: product.imageUrls,
        setItems: product.setItems,
        createdAt: '',
        updatedAt: now,
      };

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            return { ...updatedProduct, createdAt: p.createdAt };
          }
          return p;
        })
      );

      toast({ title: 'Product updated successfully' });
    } catch (err: any) {
      console.error('Error updating product:', err);
      await fetchProducts();
      const errorMessage = err?.message || 'Unknown error occurred';
      toast({
        title: 'Failed to update product',
        description:
          errorMessage.length > 100
            ? 'Please check the console for details.'
            : errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setProducts((prev) => prev.filter((p) => p.id !== id));

      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        await fetchProducts();
        throw error;
      }

      toast({ title: 'Product deleted' });
    } catch (err) {
      console.error('Error deleting product:', err);
      toast({
        title: 'Failed to delete product',
        description: 'Please try again.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const getProductById = async (id: string): Promise<Product | null> => {
    try {
      // First check if product is already in cache
      const cachedProduct = products.find((p) => p.id === id);
      if (cachedProduct) {
        return cachedProduct;
      }

      // Fetch from database with parallel queries and retry
      const [productResult, imagesResult, setItemsResult] = await Promise.all([
        withRetry(async () => {
          const result = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          if (result.error) throw result.error;
          return result;
        }),
        withRetry(async () => {
          const result = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', id);
          if (result.error) throw result.error;
          return result;
        }),
        withRetry(async () => {
          const result = await supabase
            .from('set_items')
            .select('*')
            .eq('product_id', id);
          if (result.error) throw result.error;
          return result;
        }),
      ]);

      if (!productResult.data) return null;

      // Fetch set item images if we have set items
      const setItemIds = (setItemsResult.data || []).map((item) => item.id);
      let setItemImagesData: DbSetItemImage[] | null = null;
      if (setItemIds.length > 0) {
        try {
          const result = await withRetry(async () => {
            const res = await supabase
              .from('set_item_images')
              .select('*')
              .in('set_item_id', setItemIds);
            if (res.error) throw res.error;
            return res;
          });
          setItemImagesData = result.data as DbSetItemImage[];
        } catch {
          // Continue without set item images
        }
      }

      return dbToProduct(
        productResult.data as DbProduct,
        (imagesResult.data || []) as DbProductImage[],
        (setItemsResult.data || []) as DbSetItem[],
        (setItemImagesData || []) as DbSetItemImage[]
      );
    } catch (err) {
      console.error('Error fetching product:', err);
      return null;
    }
  };

  return {
    products,
    isLoading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
  };
}

// Cache for public products
let publicProductsCache: {
  products: Product[];
  timestamp: number;
} | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

// Hook for public product display (read-only) with caching
export function usePublicProducts() {
  const [products, setProducts] = useState<Product[]>(() => {
    if (publicProductsCache && Date.now() - publicProductsCache.timestamp < CACHE_DURATION) {
      return publicProductsCache.products;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    return !(publicProductsCache && Date.now() - publicProductsCache.timestamp < CACHE_DURATION);
  });
  const fetchInProgress = useRef(false);

  useEffect(() => {
    const fetchProducts = async () => {
      // Use cache if fresh
      if (publicProductsCache && Date.now() - publicProductsCache.timestamp < CACHE_DURATION) {
        setProducts(publicProductsCache.products);
        setIsLoading(false);
        return;
      }

      // Prevent duplicate fetches
      if (fetchInProgress.current) return;
      fetchInProgress.current = true;

      try {
        setIsLoading(true);

        const productsResult = await withRetry(async () => {
          const result = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
          if (result.error) throw result.error;
          return result;
        });

        if (!productsResult.data || productsResult.data.length === 0) {
          setProducts([]);
          publicProductsCache = { products: [], timestamp: Date.now() };
          setIsLoading(false);
          fetchInProgress.current = false;
          return;
        }

        const productIds = productsResult.data.map((p) => p.id);

        // Fetch all related data in parallel with retry
        const [imagesResult, setItemsResult] = await Promise.all([
          withRetry(async () => {
            const result = await supabase
              .from('product_images')
              .select('*')
              .in('product_id', productIds);
            if (result.error) throw result.error;
            return result;
          }),
          withRetry(async () => {
            const result = await supabase
              .from('set_items')
              .select('*')
              .in('product_id', productIds);
            if (result.error) throw result.error;
            return result;
          }),
        ]);

        // Fetch set item images if we have set items
        const setItemIds = (setItemsResult.data || []).map((item) => item.id);
        let setItemImagesData: DbSetItemImage[] | null = null;
        if (setItemIds.length > 0) {
          try {
            const result = await withRetry(async () => {
              const res = await supabase
                .from('set_item_images')
                .select('*')
                .in('set_item_id', setItemIds);
              if (res.error) throw res.error;
              return res;
            });
            setItemImagesData = result.data as DbSetItemImage[];
          } catch {
            // Continue without set item images
          }
        }

        const imagesData = imagesResult.data || [];
        const setItemsData = setItemsResult.data || [];
        const frontendProducts = productsResult.data.map((dbProduct) => {
          const productImages = imagesData.filter(
            (img) => img.product_id === dbProduct.id
          ) as DbProductImage[];
          const productSetItems = setItemsData.filter(
            (item) => item.product_id === dbProduct.id
          ) as DbSetItem[];
          const productSetItemImages = (
            (setItemImagesData || []) as DbSetItemImage[]
          ).filter((img) => productSetItems.some((item) => item.id === img.set_item_id));

          return dbToProduct(
            dbProduct as DbProduct,
            productImages,
            productSetItems,
            productSetItemImages
          );
        });

        // Update cache
        publicProductsCache = { products: frontendProducts, timestamp: Date.now() };
        setProducts(frontendProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
        fetchInProgress.current = false;
      }
    };

    fetchProducts();
  }, []);

  const floorSamples = products.filter((p) => p.category === 'floor_sample');
  const onlineInventory = products.filter((p) => p.category === 'online_inventory');
  const featuredProducts = products
    .filter(
      (p) =>
        p.tags.includes('new') ||
        p.tags.includes('sale') ||
        p.tags.includes('staff_pick')
    )
    .slice(0, 6);

  const getTaggedProducts = (tag: 'new' | 'sale' | 'staff_pick') =>
    products.filter((p) => p.tags.includes(tag));

  return {
    products,
    floorSamples,
    onlineInventory,
    featuredProducts,
    getTaggedProducts,
    isLoading,
  };
}
