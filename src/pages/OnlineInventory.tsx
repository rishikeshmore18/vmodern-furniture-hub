import { Layout } from '@/components/layout/Layout';

const OnlineInventory = () => {
  return (
    <Layout>
      <div className="container flex min-h-[60vh] items-center justify-center py-12 md:py-16">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-foreground md:text-5xl">
            Coming Soon!
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Our online inventory is currently being prepared. Check back later!
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default OnlineInventory;
