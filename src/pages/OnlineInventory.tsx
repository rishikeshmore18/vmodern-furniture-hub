import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { getOnlineInventory } from '@/data/mockProducts';

const OnlineInventory = () => {
  const products = getOnlineInventory();

  return (
    <Layout>
      <div className="container py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
            Online Inventory
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Items that must be ordered first. Once you order, Vmodern Furniture purchases and delivers them to you.
            Access our full catalog of modern furniture from top brands.
          </p>
          <div className="mt-4 inline-flex items-center rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent"></span>
            {products.length} items available to order
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid products={products} />
      </div>
    </Layout>
  );
};

export default OnlineInventory;
