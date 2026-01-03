import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { fetchFloorSampleSubcategories, usePaginatedFloorSamples } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Product } from '@/types/product';
import { SubcategoryFilter } from '@/components/products/SubcategoryFilter';

const PAGE_SIZE = 12;
const CATEGORY_LABELS: Record<string, string> = {
  bedroom_set: 'Bedroom Set',
  dining_set: 'Dining Set',
  sofa_set: 'Sofa Set',
  accessories: 'Accessories',
};

const FloorSamples = () => {
  const [page, setPage] = useState(1);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const { products: pageProducts, isLoading, totalCount, hasMore } = usePaginatedFloorSamples(page, PAGE_SIZE);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);
  const [isSubcategoryLoading, setIsSubcategoryLoading] = useState(false);

  useEffect(() => {
    if (page === 1) {
      setLoadedProducts(pageProducts);
      return;
    }
    if (pageProducts.length === 0) return;
    setLoadedProducts((prev) => {
      const merged = new Map(prev.map((product) => [product.id, product]));
      pageProducts.forEach((product) => merged.set(product.id, product));
      return Array.from(merged.values());
    });
  }, [page, pageProducts]);

  useEffect(() => {
    let isActive = true;

    if (!selectedCategory) {
      setAvailableSubcategories([]);
      setSelectedSubcategory(null);
      setIsSubcategoryLoading(false);
      return () => {
        isActive = false;
      };
    }

    const categoryLabel = CATEGORY_LABELS[selectedCategory] || selectedCategory;
    setSelectedSubcategory(null);
    setIsSubcategoryLoading(true);

    fetchFloorSampleSubcategories(categoryLabel)
      .then((subcategories) => {
        if (!isActive) return;
        setAvailableSubcategories(subcategories);
      })
      .catch((err) => {
        if (!isActive) return;
        console.error('Error fetching subcategories:', err);
        setAvailableSubcategories([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsSubcategoryLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    let filtered = loadedProducts;

    if (selectedCategory) {
      const categoryLabel = CATEGORY_LABELS[selectedCategory] || selectedCategory;
      const normalizedLabel = categoryLabel.toLowerCase();
      const normalizedId = selectedCategory.toLowerCase();
      filtered = filtered.filter((product) => {
        const productType = product.productType?.toLowerCase() || '';
        return (
          productType === normalizedLabel ||
          productType === normalizedId ||
          product.name.toLowerCase().includes(normalizedLabel.replace('_', ' '))
        );
      });
    }

    if (selectedSubcategory) {
      const normalizedSubcategory = selectedSubcategory.toLowerCase();
      filtered = filtered.filter(
        (product) => product.subcategory?.toLowerCase() === normalizedSubcategory
      );
    }

    if (!selectedCategory) {
      filtered = [...filtered].sort((a, b) => {
        const aIsSet = a.isSet ? 1 : 0;
        const bIsSet = b.isSet ? 1 : 0;
        if (aIsSet !== bIsSet) {
          return bIsSet - aIsSet;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return filtered;
  }, [loadedProducts, selectedCategory, selectedSubcategory]);

  const isInitialLoading = isLoading && loadedProducts.length === 0;
  const displayCount =
    selectedCategory || selectedSubcategory ? filteredProducts.length : (totalCount || filteredProducts.length);

  return (
    <Layout>
      <div className="container py-12 md:py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
            Floor Sample – In-Store Furniture
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Items available in store. These can be purchased and taken or delivered immediately. 
            See it in person, touch the materials, and take it home today.
          </p>
          <div className="mt-4 inline-flex items-center rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"></span>
            {isInitialLoading ? '...' : displayCount} items available now in store
          </div>
        </div>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {selectedCategory && (
          <SubcategoryFilter
            subcategories={availableSubcategories}
            selectedSubcategory={selectedSubcategory}
            onSubcategoryChange={setSelectedSubcategory}
            isLoading={isSubcategoryLoading}
          />
        )}

        <ProductGrid products={filteredProducts} isLoading={isInitialLoading} />

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={isLoading && loadedProducts.length > 0}
            >
              {isLoading && loadedProducts.length > 0 ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FloorSamples;
