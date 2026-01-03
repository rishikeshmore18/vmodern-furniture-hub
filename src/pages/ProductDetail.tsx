import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, Phone, MapPin, Clock, Tag, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { storeInfo } from '@/data/storeInfo';
import { Product } from '@/types/product';
import { ProductGallery } from '@/components/products/ProductGallery';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { products, isLoading: productsLoading, getProductById } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const fetchedIdRef = useRef<string | null>(null);

  // Memoized fetch function to avoid re-creating on every render
  const fetchProduct = useCallback(async (productId: string) => {
    if (fetchedIdRef.current === productId) return;
    fetchedIdRef.current = productId;
    
    setIsLoading(true);
    const result = await getProductById(productId);
    setProduct(result);
    setIsLoading(false);
    setFetchAttempted(true);
  }, [getProductById]);

  useEffect(() => {
    if (!id) return;

    // Check if product is in cached products list
    const cachedProduct = products.find((p) => p.id === id);
    if (cachedProduct) {
      setProduct(cachedProduct);
      setIsLoading(false);
      fetchedIdRef.current = id;
      return;
    }

    // If products are still loading, wait for them
    if (productsLoading) return;

    // If products finished loading but product not found, try direct fetch
    if (!fetchAttempted || fetchedIdRef.current !== id) {
      fetchProduct(id);
    }
  }, [id, products, productsLoading, fetchProduct, fetchAttempted]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 md:py-12">
          <div className="grid gap-8 lg:gap-12 md:grid-cols-2">
            {/* Image skeleton */}
            <div className="md:sticky md:top-24 md:self-start">
              <div className="aspect-square md:aspect-[4/3] rounded-xl border border-border bg-muted animate-pulse" />
            </div>
            {/* Content skeleton */}
            <div className="flex flex-col space-y-6">
              <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
              <div className="h-10 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-32 bg-muted rounded w-full animate-pulse" />
              <div className="h-12 bg-muted rounded w-full animate-pulse" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Product Not Found</h1>
          <p className="mt-2 text-muted-foreground">The product you're looking for doesn't exist.</p>
          <Button asChild className="mt-6">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const hasDiscount = product.discountPercent > 0;
  const isFloorSample = product.category === 'floor_sample';

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Back button */}
        <Link
          to={isFloorSample ? '/floor-samples' : '/online-inventory'}
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {isFloorSample ? 'Floor Samples' : 'Online Inventory'}
        </Link>

        <div className="grid gap-8 lg:gap-12 md:grid-cols-2">
          {/* Product Gallery - Amazon style */}
          <div className="md:sticky md:top-24 md:self-start">
            <ProductGallery 
              images={product.imageUrls && product.imageUrls.length > 0 
                ? product.imageUrls 
                : [product.mainImageUrl]} 
              productName={product.name} 
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Tags */}
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant={isFloorSample ? 'default' : 'secondary'}>
                {isFloorSample ? 'Floor Sample' : 'Online Inventory'}
              </Badge>
              {product.tags.includes('new') && <Badge variant="accent">New Arrival</Badge>}
              {product.tags.includes('staff_pick') && (
                <Badge variant="outline">Staff Pick</Badge>
              )}
              {hasDiscount && (
                <Badge variant="highlight">{product.discountPercent}% OFF</Badge>
              )}
            </div>

            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-foreground">
                ${product.priceFinal.toFixed(2)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    ${product.priceOriginal.toFixed(2)}
                  </span>
                  <Badge variant="highlight" className="text-sm">
                    Save ${(product.priceOriginal - product.priceFinal).toFixed(2)}
                  </Badge>
                </>
              )}
            </div>

            {/* Availability */}
            <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    {isFloorSample ? 'Available Now' : 'Made to Order'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isFloorSample
                      ? 'This item is in our showroom. Visit us to see it in person, purchase, and take it home or schedule delivery.'
                      : 'This item must be ordered first. Once you place an order, we purchase it from our supplier and deliver it to you.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h2 className="font-medium text-foreground">Description</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>

            {/* CTA */}
            <div className="mt-8 space-y-4">
              <Button asChild size="lg" className="w-full">
                <a href={`tel:${storeInfo.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call to Purchase – {storeInfo.phone}
                </a>
              </Button>
              {isFloorSample && (
                <Button variant="outline" size="lg" className="w-full" asChild>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(storeInfo.fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Visit Our Showroom
                  </a>
                </Button>
              )}
            </div>

            {/* Store info */}
            <div className="mt-8 rounded-lg border border-border p-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{storeInfo.hours.weekdays}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{storeInfo.fullAddress}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
