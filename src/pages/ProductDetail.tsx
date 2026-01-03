import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Clock, Tag } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProductById } from '@/hooks/useProducts';
import { storeInfo } from '@/data/storeInfo';
import { ProductGallery } from '@/components/products/ProductGallery';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { product, parentSet, setChildren, isLoading } = useProductById(id);

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
  const isSetProduct = !!product.isSet || (product.setItems && product.setItems.length > 0);
  const legacySetItems = product.setItems || [];
  const hasSetChildren = setChildren.length > 0;
  const includedItemsTotal = hasSetChildren
    ? setChildren.reduce((sum, item) => sum + item.priceFinal, 0)
    : legacySetItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const setSavings =
    includedItemsTotal > 0 && includedItemsTotal > product.priceFinal
      ? includedItemsTotal - product.priceFinal
      : 0;

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

            {/* Set items */}
            {isSetProduct && (hasSetChildren || legacySetItems.length > 0) && (
              <div className="mt-8 rounded-lg border border-border bg-secondary/20 p-4">
                <h2 className="text-lg font-semibold text-foreground">What&apos;s Included</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each item can be viewed individually, or purchased together as a complete set.
                </p>
                <div className="mt-4 space-y-3">
                  {hasSetChildren
                    ? setChildren.map((item) => (
                        <Link
                          key={item.id}
                          to={`/product/${item.id}`}
                          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.mainImageUrl}
                              alt={item.name}
                              className="h-14 w-14 rounded-md object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                            <div>
                              <p className="font-medium text-foreground">{item.name}</p>
                              {item.subcategory && (
                                <p className="text-sm text-muted-foreground">
                                  {item.subcategory}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            ${item.priceFinal.toFixed(2)}
                          </div>
                        </Link>
                      ))
                    : legacySetItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                        >
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          <span className="text-sm font-semibold text-foreground">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                </div>
                {includedItemsTotal > 0 && (
                  <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Individual items total</span>
                      <span>${includedItemsTotal.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-muted-foreground">
                      <span>Set price</span>
                      <span>${product.priceFinal.toFixed(2)}</span>
                    </div>
                    {setSavings > 0 && (
                      <div className="mt-1 flex items-center justify-between font-medium text-foreground">
                        <span>You save</span>
                        <span>${setSavings.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Part of set */}
            {!isSetProduct && parentSet && (
              <div className="mt-8 rounded-lg border border-border bg-secondary/20 p-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Part of {parentSet.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This item is included in a complete set. Save by purchasing the full set.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Set price
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      ${parentSet.priceFinal.toFixed(2)}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link to={`/product/${parentSet.id}`}>View Complete Set</Link>
                  </Button>
                </div>
              </div>
            )}

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
