import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { usePublicProducts } from '@/hooks/useProducts';
import { Loader2 } from 'lucide-react';

const FloorSamples = () => {
  const { floorSamples, isLoading } = usePublicProducts();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return floorSamples;
    const categoryMap: Record<string, string[]> = {
      'bedroom_set': ['Bedroom Set', 'bedroom_set'],
      'dining_set': ['Dining Set', 'dining_set'],
      'sofa_set': ['Sofa Set', 'sofa_set'],
      'accessories': ['Accessories', 'accessories'],
    };
    const matchTerms = categoryMap[selectedCategory] || [selectedCategory];
    return floorSamples.filter(p => 
      matchTerms.some(term => 
        p.productType?.toLowerCase() === term.toLowerCase() ||
        p.name.toLowerCase().includes(term.toLowerCase().replace('_', ' '))
      )
    );
  }, [floorSamples, selectedCategory]);

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
            {isLoading ? '...' : filteredProducts.length} items available now in store
          </div>
        </div>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ProductGrid products={filteredProducts} />
        )}
      </div>
    </Layout>
  );
};

export default FloorSamples;
