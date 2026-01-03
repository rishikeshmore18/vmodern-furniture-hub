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

       // Fetch all products with retry - select only needed fields
       const productsResult = await withRetry(async () => {
         const result = await supabase
           .from('products')
           .select('id,name,category,product_type,subcategory,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
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

      // Fetch all related data in parallel with retry - select only needed fields
      const [imagesResult, setItemsResult] = await Promise.all([
        withRetry(async () => {
          const result = await supabase
            .from('product_images')
            .select('id,product_id,image_url,display_order')
            .in('product_id', productIds);
          if (result.error) throw result.error;
          return result;
        }),
        withRetry(async () => {
          const result = await supabase
            .from('set_items')
            .select('id,product_id,name,price,image_url,display_order')
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
              .select('id,set_item_id,image_url,display_order')
              .in('set_item_id', setItemIds);
            if (res.error) throw res.error;
            return res;
          });
          setItemImagesData = result.data as DbSetItemImage[];
        } catch {
          console.warn('set_item_images fetch failed, continuing without');
        }
      }

       // Build maps for O(1) lookups instead of O(n) filters
       const imagesData = imagesResult.data || [];
       const setItemsData = setItemsResult.data || [];
       const setItemImagesDataArray = setItemImagesData || [];

       // Create maps: product_id -> images/setItems, set_item_id -> images
       const imagesByProductId = new Map<string, DbProductImage[]>();
       const setItemsByProductId = new Map<string, DbSetItem[]>();
       const setItemImagesBySetItemId = new Map<string, DbSetItemImage[]>();

       // Build images map
       for (const img of imagesData) {
         const existing = imagesByProductId.get(img.product_id) || [];
         existing.push(img);
         imagesByProductId.set(img.product_id, existing);
       }

       // Build set items map
       for (const item of setItemsData) {
         const existing = setItemsByProductId.get(item.product_id) || [];
         existing.push(item);
         setItemsByProductId.set(item.product_id, existing);
       }

       // Build set item images map
       for (const img of setItemImagesDataArray) {
         const existing = setItemImagesBySetItemId.get(img.set_item_id) || [];
         existing.push(img);
         setItemImagesBySetItemId.set(img.set_item_id, existing);
       }

       // Convert to frontend products using maps (O(n) instead of O(n²))
       const frontendProducts = productsResult.data.map((dbProduct) => {
         const productImages = (imagesByProductId.get(dbProduct.id) || []).sort(
           (a, b) => a.display_order - b.display_order
         ) as DbProductImage[];
         const productSetItems = (setItemsByProductId.get(dbProduct.id) || []).sort(
           (a, b) => a.display_order - b.display_order
         ) as DbSetItem[];
         
         // Get set item images for all set items of this product
         const productSetItemImages: DbSetItemImage[] = [];
         for (const item of productSetItems) {
           const itemImages = setItemImagesBySetItemId.get(item.id) || [];
           productSetItemImages.push(...itemImages);
         }

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

       // Fetch from database with parallel queries and retry - select only needed fields
       const [productResult, imagesResult, setItemsResult] = await Promise.all([
         withRetry(async () => {
           const result = await supabase
             .from('products')
             .select('id,name,category,product_type,subcategory,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
             .eq('id', id)
             .maybeSingle();
           if (result.error) throw result.error;
           return result;
         }),
         withRetry(async () => {
           const result = await supabase
             .from('product_images')
             .select('id,product_id,image_url,display_order')
             .eq('product_id', id);
           if (result.error) throw result.error;
           return result;
         }),
         withRetry(async () => {
           const result = await supabase
             .from('set_items')
             .select('id,product_id,name,price,image_url,display_order')
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
               .select('id,set_item_id,image_url,display_order')
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

const PRODUCT_CACHE_DURATION = 10 * 60 * 1000; // 10 minute cache
const productByIdCache = new Map<string, { product: Product; timestamp: number }>();

function getCachedProductById(id: string) {
  const cached = productByIdCache.get(id);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > PRODUCT_CACHE_DURATION) {
    productByIdCache.delete(id);
    return null;
  }
  return cached.product;
}

function setCachedProductById(product: Product) {
  productByIdCache.set(product.id, { product, timestamp: Date.now() });
}

async function fetchProductById(id: string): Promise<Product | null> {
  const [productResult, imagesResult, setItemsResult] = await Promise.all([
    withRetry(async () => {
      const result = await supabase
        .from('products')
        .select('id,name,category,product_type,subcategory,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
        .eq('id', id)
        .maybeSingle();
      if (result.error) throw result.error;
      return result;
    }),
    withRetry(async () => {
      const result = await supabase
        .from('product_images')
        .select('id,product_id,image_url,display_order')
        .eq('product_id', id);
      if (result.error) throw result.error;
      return result;
    }),
    withRetry(async () => {
      const result = await supabase
        .from('set_items')
        .select('id,product_id,name,price,image_url,display_order')
        .eq('product_id', id);
      if (result.error) throw result.error;
      return result;
    }),
  ]);

  if (!productResult.data) return null;

  const setItemIds = (setItemsResult.data || []).map((item) => item.id);
  let setItemImagesData: DbSetItemImage[] = [];
  if (setItemIds.length > 0) {
    try {
      const result = await withRetry(async () => {
        const res = await supabase
          .from('set_item_images')
          .select('id,set_item_id,image_url,display_order')
          .in('set_item_id', setItemIds);
        if (res.error) throw res.error;
        return res;
      });
      setItemImagesData = (result.data || []) as DbSetItemImage[];
    } catch {
      // Continue without set item images
    }
  }

  return dbToProduct(
    productResult.data as DbProduct,
    (imagesResult.data || []) as DbProductImage[],
    (setItemsResult.data || []) as DbSetItem[],
    setItemImagesData
  );
}

export function useProductById(id?: string) {
  const [product, setProduct] = useState<Product | null>(() => {
    return id ? getCachedProductById(id) : null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    return id ? !getCachedProductById(id) : false;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = getCachedProductById(id);
    if (cached) {
      setProduct(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setError(null);
    setProduct(null);

    fetchProductById(id)
      .then((result) => {
        if (!isActive) return;
        if (result) {
          setCachedProductById(result);
        }
        setProduct(result);
      })
      .catch((err) => {
        if (!isActive) return;
        console.error('Error fetching product:', err);
        setError('Failed to load product');
        setProduct(null);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  return { product, isLoading, error };
}

// Cache for public products
let publicProductsCache: {
  products: Product[];
  timestamp: number;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache

// Lightweight hook for homepage - only fetches featured items (6 max)
export function useFeaturedProducts() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setIsLoading(true);
        
        // Only fetch products with tags (new, sale, staff_pick) and limit to 6
        // Select only essential fields to reduce payload
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id,name,category,product_type,subcategory,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
          .or('tags.cs.{new},tags.cs.{sale},tags.cs.{staff_pick}')
          .order('created_at', { ascending: false })
          .limit(6);

        if (productsError) throw productsError;

        if (!productsData || productsData.length === 0) {
          setFeaturedProducts([]);
          setIsLoading(false);
          return;
        }

        const productIds = productsData.map((p) => p.id);

        // Fetch only main images (first image per product) to reduce payload
        const { data: imagesData } = await supabase
          .from('product_images')
          .select('product_id,image_url,display_order')
          .in('product_id', productIds)
          .eq('display_order', 0); // Only first image

        // Build simple map for images
        const imagesByProductId = new Map<string, string>();
        (imagesData || []).forEach((img) => {
          if (!imagesByProductId.has(img.product_id)) {
            imagesByProductId.set(img.product_id, img.image_url);
          }
        });

        // Convert to frontend products (simplified - no set items for homepage)
        const products = productsData.map((dbProduct) => {
          const mainImage = imagesByProductId.get(dbProduct.id) || dbProduct.main_image_url;
          
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
            mainImageUrl: mainImage,
            imageUrls: mainImage ? [mainImage] : undefined,
            createdAt: dbProduct.created_at,
            updatedAt: dbProduct.updated_at,
          } as Product;
        });

        setFeaturedProducts(products);
      } catch (err) {
        console.error('Error fetching featured products:', err);
        setFeaturedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  // Helper functions for tagged products (using the 6 featured items)
  const getTaggedProducts = (tag: 'new' | 'sale' | 'staff_pick') =>
    featuredProducts.filter((p) => p.tags.includes(tag));

  return {
    featuredProducts: featuredProducts.slice(0, 6),
    newArrivals: getTaggedProducts('new'),
    onSale: getTaggedProducts('sale'),
    staffPicks: getTaggedProducts('staff_pick'),
    isLoading,
  };
}

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
             .select('id,name,category,product_type,subcategory,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
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

        // Fetch all related data in parallel with retry - select only needed fields
        const [imagesResult, setItemsResult] = await Promise.all([
          withRetry(async () => {
            const result = await supabase
              .from('product_images')
              .select('id,product_id,image_url,display_order')
              .in('product_id', productIds);
            if (result.error) throw result.error;
            return result;
          }),
          withRetry(async () => {
            const result = await supabase
              .from('set_items')
              .select('id,product_id,name,price,image_url,display_order')
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
                .select('id,set_item_id,image_url,display_order')
                .in('set_item_id', setItemIds);
              if (res.error) throw res.error;
              return res;
            });
            setItemImagesData = result.data as DbSetItemImage[];
          } catch {
            // Continue without set item images
          }
        }

         // Build maps for O(1) lookups instead of O(n) filters
         const imagesData = imagesResult.data || [];
         const setItemsData = setItemsResult.data || [];
         const setItemImagesDataArray = setItemImagesData || [];

         // Create maps: product_id -> images/setItems, set_item_id -> images
         const imagesByProductId = new Map<string, DbProductImage[]>();
         const setItemsByProductId = new Map<string, DbSetItem[]>();
         const setItemImagesBySetItemId = new Map<string, DbSetItemImage[]>();

         // Build images map
         for (const img of imagesData) {
           const existing = imagesByProductId.get(img.product_id) || [];
           existing.push(img);
           imagesByProductId.set(img.product_id, existing);
         }

         // Build set items map
         for (const item of setItemsData) {
           const existing = setItemsByProductId.get(item.product_id) || [];
           existing.push(item);
           setItemsByProductId.set(item.product_id, existing);
         }

         // Build set item images map
         for (const img of setItemImagesDataArray) {
           const existing = setItemImagesBySetItemId.get(img.set_item_id) || [];
           existing.push(img);
           setItemImagesBySetItemId.set(img.set_item_id, existing);
         }

         // Convert to frontend products using maps (O(n) instead of O(n²))
         const frontendProducts = productsResult.data.map((dbProduct) => {
           const productImages = (imagesByProductId.get(dbProduct.id) || []).sort(
             (a, b) => a.display_order - b.display_order
           ) as DbProductImage[];
           const productSetItems = (setItemsByProductId.get(dbProduct.id) || []).sort(
             (a, b) => a.display_order - b.display_order
           ) as DbSetItem[];
           
           // Get set item images for all set items of this product
           const productSetItemImages: DbSetItemImage[] = [];
           for (const item of productSetItems) {
             const itemImages = setItemImagesBySetItemId.get(item.id) || [];
             productSetItemImages.push(...itemImages);
           }

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

const FLOOR_SAMPLES_CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache
const floorSamplesPageCache = new Map<
  string,
  { products: Product[]; totalCount: number; timestamp: number }
>();

function getFloorSamplesCacheKey(page: number, pageSize: number) {
  return `${page}:${pageSize}`;
}

function getCachedFloorSamplesPage(page: number, pageSize: number) {
  const key = getFloorSamplesCacheKey(page, pageSize);
  const cached = floorSamplesPageCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > FLOOR_SAMPLES_CACHE_DURATION) {
    floorSamplesPageCache.delete(key);
    return null;
  }
  return cached;
}

function setCachedFloorSamplesPage(
  page: number,
  pageSize: number,
  products: Product[],
  totalCount: number
) {
  const key = getFloorSamplesCacheKey(page, pageSize);
  floorSamplesPageCache.set(key, {
    products,
    totalCount,
    timestamp: Date.now(),
  });
}

async function fetchFloorSamplesPage(page: number, pageSize: number) {
  // Get total count first
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'floor_sample');

  const totalCount = count || 0;

  // Fetch paginated products - select only needed fields
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id,name,category,product_type,subcategory,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
    .eq('category', 'floor_sample')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (productsError) throw productsError;

  if (!productsData || productsData.length === 0) {
    return { products: [] as Product[], totalCount };
  }

  const productIds = productsData.map((p) => p.id);

  // Fetch only main images for list view
  const { data: imagesData } = await supabase
    .from('product_images')
    .select('product_id,image_url,display_order')
    .in('product_id', productIds)
    .eq('display_order', 0);

  // Build images map
  const imagesByProductId = new Map<string, string>();
  (imagesData || []).forEach((img) => {
    if (!imagesByProductId.has(img.product_id)) {
      imagesByProductId.set(img.product_id, img.image_url);
    }
  });

  // Convert to frontend products (simplified for list view)
  const frontendProducts = productsData.map((dbProduct) => {
    const mainImage = imagesByProductId.get(dbProduct.id) || dbProduct.main_image_url;

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
      mainImageUrl: mainImage,
      imageUrls: mainImage ? [mainImage] : undefined,
      createdAt: dbProduct.created_at,
      updatedAt: dbProduct.updated_at,
    } as Product;
  });

  setCachedFloorSamplesPage(page, pageSize, frontendProducts, totalCount);

  return { products: frontendProducts, totalCount };
}

export async function prefetchFloorSamplesPage(page: number = 1, pageSize: number = 12) {
  if (getCachedFloorSamplesPage(page, pageSize)) return;
  try {
    await fetchFloorSamplesPage(page, pageSize);
  } catch {
    // Prefetch is best-effort
  }
}

// Hook for paginated floor samples (server-side filtering)
export function usePaginatedFloorSamples(page: number = 1, pageSize: number = 12) {
  const cached = getCachedFloorSamplesPage(page, pageSize);
  const [products, setProducts] = useState<Product[]>(() => cached?.products || []);
  const [isLoading, setIsLoading] = useState(() => !cached);
  const [totalCount, setTotalCount] = useState(() => cached?.totalCount || 0);

  useEffect(() => {
    let isActive = true;

    const loadProducts = async () => {
      try {
        const cachedPage = getCachedFloorSamplesPage(page, pageSize);
        if (cachedPage) {
          setProducts(cachedPage.products);
          setTotalCount(cachedPage.totalCount);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const result = await fetchFloorSamplesPage(page, pageSize);
        if (!isActive) return;
        setProducts(result.products);
        setTotalCount(result.totalCount);
      } catch (err) {
        if (!isActive) return;
        console.error('Error fetching paginated floor samples:', err);
        setProducts([]);
      } finally {
        if (!isActive) return;
        setIsLoading(false);
      }
    };

    loadProducts();

    return () => {
      isActive = false;
    };
  }, [page, pageSize]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    products,
    isLoading,
    totalCount,
    totalPages,
    hasMore: page < totalPages,
  };
}
