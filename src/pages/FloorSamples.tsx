import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { usePaginatedFloorSamples } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Product } from '@/types/product';

const PAGE_SIZE = 12;

const FloorSamples = () => {
  const [page, setPage] = useState(1);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const { products: pageProducts, isLoading, totalCount, hasMore } = usePaginatedFloorSamples(page, PAGE_SIZE);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return loadedProducts;
    const categoryMap: Record<string, string[]> = {
      'bedroom_set': ['Bedroom Set', 'bedroom_set'],
      'dining_set': ['Dining Set', 'dining_set'],
      'sofa_set': ['Sofa Set', 'sofa_set'],
      'accessories': ['Accessories', 'accessories'],
    };
    const matchTerms = categoryMap[selectedCategory] || [selectedCategory];
    return loadedProducts.filter(p => 
      matchTerms.some(term => 
        p.productType?.toLowerCase() === term.toLowerCase() ||
        p.name.toLowerCase().includes(term.toLowerCase().replace('_', ' '))
      )
    );
  }, [loadedProducts, selectedCategory]);

  const isInitialLoading = isLoading && loadedProducts.length === 0;
  const displayCount = selectedCategory ? filteredProducts.length : (totalCount || filteredProducts.length);

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
