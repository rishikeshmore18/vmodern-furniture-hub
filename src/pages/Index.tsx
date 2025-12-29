import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, Clock, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { storeInfo } from '@/data/storeInfo';
import { usePublicProducts } from '@/hooks/useProducts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const { featuredProducts, getTaggedProducts, isLoading } = usePublicProducts();
  const newArrivals = getTaggedProducts('new');
  const onSale = getTaggedProducts('sale');
  const staffPicks = getTaggedProducts('staff_pick');

  return (
    <Layout>
      {/* Hero Section - Dynamic sizing that adapts to content and viewport */}
      <section className="relative overflow-hidden h-[600px] sm:h-[650px] md:h-[700px] lg:h-[750px]">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-carousel-1.png"
            alt="Vmodern Furniture Store"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 z-10 bg-black/40" />

        {/* Content */}
        <div className="relative z-20 container flex h-full flex-col justify-center py-8 sm:py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="animate-fade-in text-4xl font-semibold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
              {storeInfo.name}
            </h1>
            <p className="animate-fade-in animation-delay-100 mt-6 text-lg text-white/90 drop-shadow-md opacity-0">
              Modern furniture, floor samples ready to take home today or order from our full catalog.
            </p>
            <div className="animate-fade-in animation-delay-200 mt-10 flex flex-col gap-4 opacity-0 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link to="/floor-samples">
                  View Floor Sample Furniture
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick info cards */}
          <div className="animate-fade-in animation-delay-300 mx-auto mt-16 grid max-w-4xl gap-4 opacity-0 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/95 backdrop-blur-md p-4 shadow-xl">
              <MapPin className="h-5 w-5 shrink-0 text-gray-800" />
              <div className="text-sm">
                <p className="font-semibold text-gray-900">Visit Us</p>
                <p className="text-gray-700">{storeInfo.fullAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/95 backdrop-blur-md p-4 shadow-xl">
              <Clock className="h-5 w-5 shrink-0 text-gray-800" />
              <div className="text-sm">
                <p className="font-semibold text-gray-900">Store Hours</p>
                <p className="text-gray-700">{storeInfo.hoursShort.open}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/30 bg-white/95 backdrop-blur-md p-4 shadow-xl">
              <Phone className="h-5 w-5 shrink-0 text-gray-800" />
              <div className="text-sm">
                <p className="font-semibold text-gray-900">Call Us</p>
                <p className="text-gray-700">{storeInfo.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Main Categories Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Floor Sample Block */}
            <div className="group rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Floor Sample Furniture</h2>
              <p className="mt-3 text-muted-foreground">
                Items available in-store that you can buy and take home or schedule delivery immediately. See it, touch it, take it today.
              </p>
              <Button asChild className="mt-6" variant="default">
                <Link to="/floor-samples">
                  Browse Floor Samples
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Online Inventory Block */}
            <div className="group rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-md">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/30">
                <svg className="h-6 w-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Online Inventory</h2>
              <p className="mt-3 text-muted-foreground">
                Items you must order first. We then purchase and deliver them to you. Access our full catalog of modern furniture.
              </p>
              <Button className="mt-6" variant="outline" disabled>
                Coming Soon!
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tagged Items Section */}
      <section className="bg-secondary/30 py-16 md:py-24">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold text-foreground">Featured Collection</h2>
            <p className="mt-3 text-muted-foreground">
              Discover our curated selection of modern furniture
            </p>
          </div>

          <Tabs defaultValue="featured" className="w-full">
            <TabsList className="mx-auto mb-8 flex w-full max-w-md justify-center">
              <TabsTrigger value="featured">All Featured</TabsTrigger>
              <TabsTrigger value="new">New Arrivals</TabsTrigger>
              <TabsTrigger value="sale">On Sale</TabsTrigger>
              <TabsTrigger value="picks">Staff Picks</TabsTrigger>
            </TabsList>
            <TabsContent value="featured">
              <ProductGrid products={featuredProducts} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="new">
              <ProductGrid products={newArrivals} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="sale">
              <ProductGrid products={onSale} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="picks">
              <ProductGrid products={staffPicks} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Visit Us Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid gap-10 md:grid-cols-2">
            {/* Map placeholder */}
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2949.2890814675716!2d-71.8039!3d42.2633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e406543ed9b96f%3A0x8c8e8d6e9e5c1f0a!2s1141%20Main%20St%2C%20Worcester%2C%20MA%2001603!5e0!3m2!1sen!2sus!4v1699999999999!5m2!1sen!2sus"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Store Location"
              />
            </div>

            {/* Contact info */}
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-semibold text-foreground">Visit Our Showroom</h2>
              <p className="mt-4 text-muted-foreground">
                Experience our furniture in person. Our knowledgeable staff is ready to help you find the perfect pieces for your home.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <MapPin className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Address</p>
                    <p className="text-muted-foreground">{storeInfo.fullAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Clock className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Hours</p>
                    <p className="text-muted-foreground">{storeInfo.hours.weekdays}</p>
                    <p className="text-muted-foreground">{storeInfo.hours.sunday}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Phone className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Phone</p>
                    <a href={`tel:${storeInfo.phone}`} className="text-muted-foreground hover:text-foreground">
                      {storeInfo.phone}
                    </a>
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="mt-8 w-fit">
                <a href={`tel:${storeInfo.phone}`}>Call Us Today</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
