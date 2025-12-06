import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { getFloorSamples } from '@/data/mockProducts';

const FloorSamples = () => {
  const products = getFloorSamples();

  return (
    <Layout>
      <div className="container py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
            Floor Sample – In-Store Furniture
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Items available in store. These can be purchased and taken or delivered immediately. 
            See it in person, touch the materials, and take it home today.
          </p>
          <div className="mt-4 inline-flex items-center rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"></span>
            {products.length} items available now in store
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid products={products} />
      </div>
    </Layout>
  );
};

export default FloorSamples;
