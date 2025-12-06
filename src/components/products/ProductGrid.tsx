import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4;
}

export function ProductGrid({ products, columns = 3 }: ProductGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  if (products.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-muted-foreground">No products found.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${gridCols[columns]}`}>
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-fade-in opacity-0"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
