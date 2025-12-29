export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] bg-muted" />
      
      {/* Content skeleton */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2 mt-2" />
        <div className="h-6 bg-muted rounded w-1/4 mt-auto pt-4" />
        <div className="h-10 bg-muted rounded w-full mt-4" />
      </div>
    </div>
  );
}

