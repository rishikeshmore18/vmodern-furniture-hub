import { cn } from '@/lib/utils';

interface SubcategoryFilterProps {
  subcategories: string[];
  selectedSubcategory: string | null;
  onSubcategoryChange: (subcategory: string | null) => void;
  isLoading?: boolean;
}

export function SubcategoryFilter({
  subcategories,
  selectedSubcategory,
  onSubcategoryChange,
  isLoading = false,
}: SubcategoryFilterProps) {
  if (subcategories.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        Filter by item type
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSubcategoryChange(null)}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition-all',
            selectedSubcategory === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
          )}
        >
          All
        </button>
        {isLoading ? (
          <div className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          subcategories.map((subcategory) => {
            const isSelected = selectedSubcategory === subcategory;
            return (
              <button
                key={subcategory}
                onClick={() => onSubcategoryChange(isSelected ? null : subcategory)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-all',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {subcategory}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
