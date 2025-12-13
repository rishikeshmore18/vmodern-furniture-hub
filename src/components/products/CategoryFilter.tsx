import { cn } from '@/lib/utils';
import { Armchair, UtensilsCrossed, Bed, Lamp } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const categories = [
  { id: 'bedroom_set', label: 'Bedroom Set', icon: Bed },
  { id: 'dining_set', label: 'Dining Set', icon: UtensilsCrossed },
  { id: 'sofa_set', label: 'Sofa Set', icon: Armchair },
  { id: 'accessories', label: 'Accessories', icon: Lamp },
];

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-3">
        {/* All button */}
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all',
            selectedCategory === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
          )}
        >
          All
        </button>
        
        {/* Category cubes */}
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(isSelected ? null : cat.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
