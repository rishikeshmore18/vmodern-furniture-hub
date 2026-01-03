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
  is_set: boolean;
  part_of_set: string | null;
  can_be_sold_separately: boolean;
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
  child_product_id: string | null;
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
        childProductId: item.child_product_id || undefined,
      };
    });

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    category: dbProduct.category,
    productType: dbProduct.product_type || undefined,
    subcategory: dbProduct.subcategory || undefined,
    isSet: dbProduct.is_set,
    partOfSet: dbProduct.part_of_set || undefined,
    canBeSoldSeparately: dbProduct.can_be_sold_separately,
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
           .select('id,name,category,product_type,subcategory,is_set,part_of_set,can_be_sold_separately,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
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
            .select('id,product_id,name,price,image_url,display_order,child_product_id')
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
      const hasSetItems = !!(product.setItems && product.setItems.length > 0);
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: product.name,
          category: product.category,
          product_type: product.productType || null,
          subcategory: product.subcategory || null,
          is_set: hasSetItems,
          part_of_set: product.partOfSet || null,
          can_be_sold_separately: product.canBeSoldSeparately ?? true,
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

      const childProductIdsByIndex = hasSetItems
        ? new Array(product.setItems?.length || 0).fill(null)
        : [];

      if (hasSetItems && product.setItems) {
        for (const [index, item] of product.setItems.entries()) {
          const itemName = item.name?.trim() || `${product.name} Item ${index + 1}`;
          const itemImageUrls =
            item.imageUrls && item.imageUrls.length > 0
              ? item.imageUrls
              : item.imageUrl
                ? [item.imageUrl]
                : [];
          const childMainImageUrl = itemImageUrls[0] || product.mainImageUrl;

          const { data: childProduct, error: childProductError } = await supabase
            .from('products')
            .insert({
              name: itemName,
              category: product.category,
              product_type: product.productType || null,
              subcategory: itemName || null,
              description: product.description,
              price_original: item.price,
              discount_percent: 0,
              is_new: product.isNew,
              tags: product.tags,
              main_image_url: childMainImageUrl,
              is_set: false,
              part_of_set: newProduct.id,
              can_be_sold_separately: true,
            })
            .select()
            .single();

          if (childProductError) throw childProductError;

          childProductIdsByIndex[index] = childProduct.id;

          if (itemImageUrls.length > 0) {
            const childImageInserts = itemImageUrls.map((url, imgIndex) => ({
              product_id: childProduct.id,
              image_url: url,
              display_order: imgIndex,
            }));

            const { error: childImagesError } = await supabase
              .from('product_images')
              .insert(childImageInserts);

            if (childImagesError) throw childImagesError;
          }
        }
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
          child_product_id: childProductIdsByIndex[index] || null,
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
        isSet: hasSetItems,
        partOfSet: product.partOfSet,
        canBeSoldSeparately: product.canBeSoldSeparately,
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

      if (hasSetItems) {
        await fetchProducts();
      } else {
        setProducts((prev) => [newFrontendProduct, ...prev]);
      }

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
      const hasSetItems = !!(product.setItems && product.setItems.length > 0);
      const productUpdate: Record<string, unknown> = {
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
        is_set: hasSetItems,
      };

      if (product.partOfSet !== undefined) {
        productUpdate.part_of_set = product.partOfSet || null;
      }
      if (product.canBeSoldSeparately !== undefined) {
        productUpdate.can_be_sold_separately = product.canBeSoldSeparately;
      }

      const { error: productError } = await supabase
        .from('products')
        .update(productUpdate)
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
        .select('id,child_product_id')
        .eq('product_id', id);

      if (existingSetItems && existingSetItems.length > 0) {
        const existingSetItemIds = existingSetItems.map((item) => item.id);
        await supabase
          .from('set_item_images')
          .delete()
          .in('set_item_id', existingSetItemIds);
      }

      await supabase.from('set_items').delete().eq('product_id', id);

      const existingChildIds = (existingSetItems || [])
        .map((item) => item.child_product_id)
        .filter((value): value is string => !!value);

      const usedChildIds = new Set<string>();
      const childProductIdsByIndex =
        product.setItems && product.setItems.length > 0
          ? new Array(product.setItems.length).fill(null)
          : [];

      if (product.setItems && product.setItems.length > 0) {
        for (const [index, item] of product.setItems.entries()) {
          const itemName = item.name?.trim() || `${product.name} Item ${index + 1}`;
          const itemImageUrls =
            item.imageUrls && item.imageUrls.length > 0
              ? item.imageUrls
              : item.imageUrl
                ? [item.imageUrl]
                : [];
          const childMainImageUrl = itemImageUrls[0] || product.mainImageUrl;

          if (item.childProductId) {
            usedChildIds.add(item.childProductId);

            const { error: childUpdateError } = await supabase
              .from('products')
              .update({
                name: itemName,
                category: product.category,
                product_type: product.productType || null,
                subcategory: itemName || null,
                description: product.description,
                price_original: item.price,
                discount_percent: 0,
                is_new: product.isNew,
                tags: product.tags,
                main_image_url: childMainImageUrl,
                is_set: false,
                part_of_set: id,
                can_be_sold_separately: true,
              })
              .eq('id', item.childProductId);

            if (childUpdateError) throw childUpdateError;

            await supabase.from('product_images').delete().eq('product_id', item.childProductId);

            if (itemImageUrls.length > 0) {
              const childImageInserts = itemImageUrls.map((url, imgIndex) => ({
                product_id: item.childProductId,
                image_url: url,
                display_order: imgIndex,
              }));

              const { error: childImagesError } = await supabase
                .from('product_images')
                .insert(childImageInserts);

              if (childImagesError) throw childImagesError;
            }

            childProductIdsByIndex[index] = item.childProductId;
            continue;
          }

          const { data: childProduct, error: childProductError } = await supabase
            .from('products')
            .insert({
              name: itemName,
              category: product.category,
              product_type: product.productType || null,
              subcategory: itemName || null,
              description: product.description,
              price_original: item.price,
              discount_percent: 0,
              is_new: product.isNew,
              tags: product.tags,
              main_image_url: childMainImageUrl,
              is_set: false,
              part_of_set: id,
              can_be_sold_separately: true,
            })
            .select()
            .single();

          if (childProductError) throw childProductError;

          usedChildIds.add(childProduct.id);
          childProductIdsByIndex[index] = childProduct.id;

          if (itemImageUrls.length > 0) {
            const childImageInserts = itemImageUrls.map((url, imgIndex) => ({
              product_id: childProduct.id,
              image_url: url,
              display_order: imgIndex,
            }));

            const { error: childImagesError } = await supabase
              .from('product_images')
              .insert(childImageInserts);

            if (childImagesError) throw childImagesError;
          }
        }

        const setItemInserts = product.setItems.map((item, index) => ({
          product_id: id,
          name: item.name,
          price: item.price,
          image_url:
            item.imageUrl ||
            (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null),
          display_order: index,
          child_product_id: childProductIdsByIndex[index] || null,
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

      const removedChildIds = existingChildIds.filter((childId) => !usedChildIds.has(childId));
      if (removedChildIds.length > 0) {
        await supabase
          .from('products')
          .update({ part_of_set: null, is_set: false, can_be_sold_separately: true })
          .in('id', removedChildIds);
      }

      const now = new Date().toISOString();
      const updatedProduct: Product = {
        id,
        name: product.name,
        category: product.category,
        productType: product.productType,
        subcategory: product.subcategory,
        isSet: hasSetItems,
        partOfSet: product.partOfSet,
        canBeSoldSeparately: product.canBeSoldSeparately,
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

      if (hasSetItems) {
        await fetchProducts();
      } else {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === id) {
              return { ...updatedProduct, createdAt: p.createdAt };
            }
            return p;
          })
        );
      }

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

      const { data: productInfo } = await supabase
        .from('products')
        .select('id,part_of_set,is_set')
        .eq('id', id)
        .maybeSingle();

      if (productInfo?.part_of_set) {
        await supabase.from('set_items').delete().eq('child_product_id', id);
      }

      if (productInfo?.is_set) {
        const { data: childProducts } = await supabase
          .from('products')
          .select('id')
          .eq('part_of_set', id);

        const childIds = (childProducts || []).map((child) => child.id);
        if (childIds.length > 0) {
          await supabase
            .from('products')
            .update({ part_of_set: null, is_set: false, can_be_sold_separately: true })
            .in('id', childIds);
        }
      }

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
             .select('id,name,category,product_type,subcategory,is_set,part_of_set,can_be_sold_separately,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
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
             .select('id,product_id,name,price,image_url,display_order,child_product_id')
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
        .select('id,name,category,product_type,subcategory,is_set,part_of_set,can_be_sold_separately,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
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
        .select('id,product_id,name,price,image_url,display_order,child_product_id')
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

async function fetchChildProductsForSet(setId: string): Promise<Product[]> {
  const result = await withRetry(async () => {
    const res = await supabase
      .from('products')
      .select('id,name,category,product_type,subcategory,is_set,part_of_set,can_be_sold_separately,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
      .eq('part_of_set', setId)
      .order('created_at', { ascending: true });
    if (res.error) throw res.error;
    return res;
  });

  if (!result.data || result.data.length === 0) return [];

  return result.data.map((dbProduct) => dbToProduct(dbProduct as DbProduct, [], [], []));
}

export function useProductById(id?: string) {
  const [product, setProduct] = useState<Product | null>(() => {
    return id ? getCachedProductById(id) : null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    return id ? !getCachedProductById(id) : false;
  });
  const [error, setError] = useState<string | null>(null);
  const [parentSet, setParentSet] = useState<Product | null>(null);
  const [setChildren, setSetChildren] = useState<Product[]>([]);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setParentSet(null);
      setSetChildren([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    const loadRelations = (result: Product | null) => {
      if (!isActive) return;
      setParentSet(null);
      setSetChildren([]);

      if (!result) return;

      const relationTasks: Promise<void>[] = [];

      if (result.isSet) {
        relationTasks.push(
          fetchChildProductsForSet(result.id).then((children) => {
            if (!isActive) return;
            setSetChildren(children);
          })
        );
      }

      if (result.partOfSet) {
        relationTasks.push(
          fetchProductById(result.partOfSet).then((parent) => {
            if (!isActive) return;
            setParentSet(parent);
          })
        );
      }

      if (relationTasks.length > 0) {
        Promise.all(relationTasks).catch((err) => {
          if (!isActive) return;
          console.error('Error loading product relations:', err);
        });
      }
    };

    const cached = getCachedProductById(id);
    if (cached) {
      setProduct(cached);
      loadRelations(cached);
      setIsLoading(false);
      setError(null);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    setError(null);
    setProduct(null);
    setParentSet(null);
    setSetChildren([]);

    fetchProductById(id)
      .then((result) => {
        if (!isActive) return;
        if (result) {
          setCachedProductById(result);
        }
        setProduct(result);
        loadRelations(result);
      })
      .catch((err) => {
        if (!isActive) return;
        console.error('Error fetching product:', err);
        setError('Failed to load product');
        setProduct(null);
        setParentSet(null);
        setSetChildren([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  return { product, parentSet, setChildren, isLoading, error };
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
          .select('id,name,category,product_type,subcategory,is_set,part_of_set,can_be_sold_separately,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
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
            isSet: dbProduct.is_set,
            partOfSet: dbProduct.part_of_set || undefined,
            canBeSoldSeparately: dbProduct.can_be_sold_separately,
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
             .select('id,name,category,product_type,subcategory,is_set,part_of_set,can_be_sold_separately,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
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
              .select('id,product_id,name,price,image_url,display_order,child_product_id')
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
const FLOOR_SAMPLES_COUNT_CACHE_DURATION = 5 * 60 * 1000;
let floorSamplesCountCache: { count: number; timestamp: number } | null = null;
const FLOOR_SAMPLES_PAGE_STORAGE_PREFIX = 'vmodern_floor_samples_page_v1:';
const FLOOR_SAMPLES_COUNT_STORAGE_KEY = 'vmodern_floor_samples_count_v1';

function getStoredFloorSamplesPage(page: number, pageSize: number) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${FLOOR_SAMPLES_PAGE_STORAGE_PREFIX}${page}:${pageSize}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { products: Product[]; totalCount: number; timestamp: number };
    if (!parsed || !Array.isArray(parsed.products)) return null;
    if (Date.now() - parsed.timestamp > FLOOR_SAMPLES_CACHE_DURATION) {
      localStorage.removeItem(`${FLOOR_SAMPLES_PAGE_STORAGE_PREFIX}${page}:${pageSize}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setStoredFloorSamplesPage(
  page: number,
  pageSize: number,
  products: Product[],
  totalCount: number
) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({
      products,
      totalCount,
      timestamp: Date.now(),
    });
    localStorage.setItem(`${FLOOR_SAMPLES_PAGE_STORAGE_PREFIX}${page}:${pageSize}`, payload);
  } catch {
    // Ignore storage write errors
  }
}

function getStoredFloorSamplesCount() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FLOOR_SAMPLES_COUNT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { count: number; timestamp: number };
    if (typeof parsed?.count !== 'number') return null;
    if (Date.now() - parsed.timestamp > FLOOR_SAMPLES_COUNT_CACHE_DURATION) {
      localStorage.removeItem(FLOOR_SAMPLES_COUNT_STORAGE_KEY);
      return null;
    }
    return parsed.count;
  } catch {
    return null;
  }
}

function setStoredFloorSamplesCount(count: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      FLOOR_SAMPLES_COUNT_STORAGE_KEY,
      JSON.stringify({ count, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage write errors
  }
}

function getCachedFloorSamplesCount() {
  if (!floorSamplesCountCache) {
    const stored = getStoredFloorSamplesCount();
    if (stored === null) return null;
    floorSamplesCountCache = { count: stored, timestamp: Date.now() };
    return stored;
  }
  if (Date.now() - floorSamplesCountCache.timestamp > FLOOR_SAMPLES_COUNT_CACHE_DURATION) {
    floorSamplesCountCache = null;
    return null;
  }
  return floorSamplesCountCache.count;
}

function setCachedFloorSamplesCount(count: number) {
  floorSamplesCountCache = { count, timestamp: Date.now() };
  setStoredFloorSamplesCount(count);
  for (const [key, cached] of floorSamplesPageCache.entries()) {
    floorSamplesPageCache.set(key, { ...cached, totalCount: count });
  }
}

async function fetchFloorSamplesCount() {
  const cached = getCachedFloorSamplesCount();
  if (cached !== null) return cached;

  const result = await withRetry(async () => {
    const res = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'floor_sample');
    if (res.error) throw res.error;
    return res;
  });

  const totalCount = result.count || 0;
  setCachedFloorSamplesCount(totalCount);
  return totalCount;
}

function getFloorSamplesCacheKey(page: number, pageSize: number) {
  return `${page}:${pageSize}`;
}

function getCachedFloorSamplesPage(page: number, pageSize: number) {
  const key = getFloorSamplesCacheKey(page, pageSize);
  const cached = floorSamplesPageCache.get(key);
  if (!cached) {
    const stored = getStoredFloorSamplesPage(page, pageSize);
    if (!stored) return null;
    floorSamplesPageCache.set(key, {
      products: stored.products,
      totalCount: stored.totalCount,
      timestamp: stored.timestamp,
    });
    return stored;
  }
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
  setStoredFloorSamplesPage(page, pageSize, products, totalCount);
}

async function fetchFloorSamplesPage(page: number, pageSize: number) {
  // Fetch paginated products only; count is fetched separately to avoid blocking
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id,name,category,product_type,subcategory,is_set,part_of_set,can_be_sold_separately,description,price_original,discount_percent,price_final,is_new,tags,main_image_url,created_at,updated_at')
    .eq('category', 'floor_sample')
    .order('is_set', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (productsError) throw productsError;

  const totalCount = getCachedFloorSamplesCount() || 0;

  if (!productsData || productsData.length === 0) {
    return { products: [] as Product[], totalCount };
  }

  // Convert to frontend products (simplified for list view)
  const frontendProducts = productsData.map((dbProduct) => {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      category: dbProduct.category,
      productType: dbProduct.product_type || undefined,
      subcategory: dbProduct.subcategory || undefined,
      isSet: dbProduct.is_set,
      partOfSet: dbProduct.part_of_set || undefined,
      canBeSoldSeparately: dbProduct.can_be_sold_separately,
      description: dbProduct.description,
      priceOriginal: dbProduct.price_original,
      discountPercent: dbProduct.discount_percent,
      priceFinal: dbProduct.price_final,
      isNew: dbProduct.is_new,
      tags: dbProduct.tags || [],
      mainImageUrl: dbProduct.main_image_url,
      imageUrls: dbProduct.main_image_url ? [dbProduct.main_image_url] : undefined,
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

export async function fetchFloorSampleSubcategories(productType: string): Promise<string[]> {
  const normalized = productType.trim();
  if (!normalized) return [];

  const result = await withRetry(async () => {
    const res = await supabase
      .from('products')
      .select('subcategory')
      .eq('category', 'floor_sample')
      .eq('product_type', normalized)
      .not('subcategory', 'is', null);
    if (res.error) throw res.error;
    return res;
  });

  const unique = Array.from(
    new Set((result.data || []).map((row) => row.subcategory).filter(Boolean))
  ) as string[];

  return unique.sort((a, b) => a.localeCompare(b));
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

  useEffect(() => {
    let isActive = true;
    const cachedCount = getCachedFloorSamplesCount();
    if (cachedCount !== null) {
      setTotalCount(cachedCount);
      return () => {
        isActive = false;
      };
    }

    fetchFloorSamplesCount()
      .then((count) => {
        if (!isActive) return;
        setTotalCount(count);
      })
      .catch((err) => {
        if (!isActive) return;
        console.error('Error fetching floor sample count:', err);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

  return {
    products,
    isLoading,
    totalCount,
    totalPages,
    hasMore: totalCount > 0 ? page < totalPages : products.length === pageSize,
  };
}
