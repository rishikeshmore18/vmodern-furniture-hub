import { useState, useEffect, useCallback } from 'react';
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
      // Get images for this set item
      const itemImages = setItemImages
        .filter((img) => img.set_item_id === item.id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((img) => img.image_url);

      return {
        id: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.image_url || undefined, // Backward compatibility
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

      // Fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        return;
      }

      const productIds = productsData.map((p) => p.id);

      // Fetch all images for these products
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .in('product_id', productIds);

      if (imagesError) throw imagesError;

      // Fetch all set items for these products
      const { data: setItemsData, error: setItemsError } = await supabase
        .from('set_items')
        .select('*')
        .in('product_id', productIds);

      if (setItemsError) throw setItemsError;

      // Fetch all set item images
      const setItemIds = (setItemsData || []).map((item) => item.id);
      const { data: setItemImagesData, error: setItemImagesError } = await supabase
        .from('set_item_images')
        .select('*')
        .in('set_item_id', setItemIds);

      if (setItemImagesError) {
        // Table might not exist yet, continue without set item images
        console.warn('set_item_images table not found, continuing without set item images');
      }

      // Convert to frontend products
      const frontendProducts = productsData.map((dbProduct) => {
        const productImages = (imagesData || []).filter(
          (img) => img.product_id === dbProduct.id
        ) as DbProductImage[];
        const productSetItems = (setItemsData || []).filter(
          (item) => item.product_id === dbProduct.id
        ) as DbSetItem[];
        const productSetItemImages = ((setItemImagesData || []) as DbSetItemImage[]).filter(
          (img) => productSetItems.some((item) => item.id === img.set_item_id)
        );

        return dbToProduct(dbProduct as DbProduct, productImages, productSetItems, productSetItemImages);
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

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceFinal'>) => {
    try {
      // Insert product
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

      // Insert images if any
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

      // Insert set items if any
      if (product.setItems && product.setItems.length > 0) {
        const setItemInserts = product.setItems.map((item, index) => ({
          product_id: newProduct.id,
          name: item.name,
          price: item.price,
          image_url: item.imageUrl || (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null),
          display_order: index,
        }));

        const { data: insertedSetItems, error: setItemsError } = await supabase
          .from('set_items')
          .insert(setItemInserts)
          .select();

        if (setItemsError) throw setItemsError;

        // Insert set item images if any
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
              // Table might not exist yet, log warning but don't fail
              console.warn('Failed to insert set item images:', setItemImagesError);
            }
          }
        }
      }

      toast({ title: 'Product added successfully' });
      await fetchProducts();
      return newProduct;
    } catch (err: any) {
      console.error('Error adding product:', err);
      const errorMessage = err?.message || 'Unknown error occurred';
      toast({
        title: 'Failed to add product',
        description: errorMessage.length > 100 ? 'Please check the console for details.' : errorMessage,
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
      // Update product
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

      // Delete existing images and re-insert
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

      // Delete existing set items and re-insert
      // First get existing set item IDs to delete their images
      const { data: existingSetItems } = await supabase
        .from('set_items')
        .select('id')
        .eq('product_id', id);

      if (existingSetItems && existingSetItems.length > 0) {
        const existingSetItemIds = existingSetItems.map((item) => item.id);
        // Delete set item images
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
          image_url: item.imageUrl || (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null),
          display_order: index,
        }));

        const { data: insertedSetItems, error: setItemsError } = await supabase
          .from('set_items')
          .insert(setItemInserts)
          .select();

        if (setItemsError) throw setItemsError;

        // Insert set item images if any
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
              // Table might not exist yet, log warning but don't fail
              console.warn('Failed to insert set item images:', setItemImagesError);
            }
          }
        }
      }

      toast({ title: 'Product updated successfully' });
      await fetchProducts();
    } catch (err: any) {
      console.error('Error updating product:', err);
      const errorMessage = err?.message || 'Unknown error occurred';
      toast({
        title: 'Failed to update product',
        description: errorMessage.length > 100 ? 'Please check the console for details.' : errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;

      toast({ title: 'Product deleted' });
      await fetchProducts();
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
      const { data: dbProduct, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (productError) throw productError;
      if (!dbProduct) return null;

      const { data: imagesData } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id);

      const { data: setItemsData } = await supabase
        .from('set_items')
        .select('*')
        .eq('product_id', id);

      const setItemIds = (setItemsData || []).map((item) => item.id);
      const { data: setItemImagesData } = await supabase
        .from('set_item_images')
        .select('*')
        .in('set_item_id', setItemIds);

      return dbToProduct(
        dbProduct as DbProduct,
        (imagesData || []) as DbProductImage[],
        (setItemsData || []) as DbSetItem[],
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

// Hook for public product display (read-only)
export function usePublicProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        if (!productsData || productsData.length === 0) {
          setProducts([]);
          return;
        }

        const productIds = productsData.map((p) => p.id);

        const { data: imagesData } = await supabase
          .from('product_images')
          .select('*')
          .in('product_id', productIds);

        const { data: setItemsData } = await supabase
          .from('set_items')
          .select('*')
          .in('product_id', productIds);

        const setItemIds = (setItemsData || []).map((item) => item.id);
        const { data: setItemImagesData } = await supabase
          .from('set_item_images')
          .select('*')
          .in('set_item_id', setItemIds);

        const frontendProducts = productsData.map((dbProduct) => {
          const productImages = (imagesData || []).filter(
            (img) => img.product_id === dbProduct.id
          ) as DbProductImage[];
          const productSetItems = (setItemsData || []).filter(
            (item) => item.product_id === dbProduct.id
          ) as DbSetItem[];
          const productSetItemImages = ((setItemImagesData || []) as DbSetItemImage[]).filter(
            (img) => productSetItems.some((item) => item.id === img.set_item_id)
          );

          return dbToProduct(dbProduct as DbProduct, productImages, productSetItems, productSetItemImages);
        });

        setProducts(frontendProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
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
