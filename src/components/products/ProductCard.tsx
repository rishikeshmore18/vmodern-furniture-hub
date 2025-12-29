import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.discountPercent > 0;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md cursor-pointer h-full">
        {/* Image container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={product.mainImageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          {/* Tags */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {product.tags.includes('new') && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                New
              </Badge>
            )}
            {hasDiscount && (
              <Badge variant="destructive" className="bg-highlight text-highlight-foreground">
                {product.discountPercent}% OFF
              </Badge>
            )}
            {product.tags.includes('staff_pick') && (
              <Badge variant="outline" className="border-primary/30 bg-card/90 text-foreground">
                Staff Pick
              </Badge>
            )}
          </div>
          {/* Category badge */}
          <div className="absolute bottom-3 right-3">
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                product.category === 'floor_sample'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {product.category === 'floor_sample' ? 'Floor Sample' : 'Online'}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-medium text-foreground line-clamp-1">{product.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>

          {/* Availability note */}
          <p className="mt-2 text-xs text-muted-foreground">
            {product.category === 'floor_sample'
              ? 'Available now in store'
              : 'Order first – we purchase and deliver'}
          </p>

          {/* Price */}
          <div className="mt-auto pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground">
                ${product.priceFinal.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.priceOriginal.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* View Details button - still shows but entire card is clickable */}
          <div className="mt-4 w-full">
            <span className="block w-full rounded-md border border-input bg-background px-4 py-2 text-center text-sm font-medium text-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              View Details
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
