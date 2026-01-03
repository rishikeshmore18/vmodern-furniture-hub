import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  getStoredCategories,
  addCustomCategory,
  addCustomSubcategory,
  CategoryConfig,
} from '@/types/product';

interface CategorySelectorProps {
  category: string;
  subcategory: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
}

export function CategorySelector({
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
}: CategorySelectorProps) {
  // Initialize categories immediately to avoid timing issues
  const [categories, setCategories] = useState<CategoryConfig[]>(() => getStoredCategories());
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customSubcategoryInput, setCustomSubcategoryInput] = useState('');

  useEffect(() => {
    // Refresh categories in case they were updated elsewhere
    setCategories(getStoredCategories());
  }, []);

  const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

  // Find exact match first, then try normalized match
  const currentCategory = categories.find((c) => c.name === category);
  const categoryBySlug = categories.find((c) => normalizeKey(c.name) === normalizeKey(category));
  const subcategories = (currentCategory || categoryBySlug)?.subcategories || [];

  const handleAddCustomCategory = () => {
    if (customCategoryInput.trim()) {
      const updated = addCustomCategory(customCategoryInput.trim());
      setCategories(updated);
      onCategoryChange(customCategoryInput.trim());
      onSubcategoryChange('');
      setCustomCategoryInput('');
      setShowCustomCategory(false);
    }
  };

  const handleAddCustomSubcategory = () => {
    if (customSubcategoryInput.trim() && category) {
      const updated = addCustomSubcategory(category, customSubcategoryInput.trim());
      setCategories(updated);
      onSubcategoryChange(customSubcategoryInput.trim());
      setCustomSubcategoryInput('');
      setShowCustomSubcategory(false);
    }
  };

  const handleCategorySelect = (value: string) => {
    if (value === '__custom__') {
      setShowCustomCategory(true);
    } else {
      onCategoryChange(value);
      onSubcategoryChange('');
      setShowCustomCategory(false);
    }
  };

  const handleSubcategorySelect = (value: string) => {
    if (value === '__custom__') {
      setShowCustomSubcategory(true);
    } else {
      onSubcategoryChange(value);
      setShowCustomSubcategory(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category */}
      <div>
        <Label>Category (Product Type)</Label>
        {showCustomCategory ? (
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Enter new category name"
              value={customCategoryInput}
              onChange={(e) => setCustomCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
            />
            <Button type="button" onClick={handleAddCustomCategory}>
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCustomCategory(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <RadioGroup
              value={category || undefined}
              onValueChange={handleCategorySelect}
              className="flex flex-wrap gap-4"
            >
              {categories.map((cat) => {
                const id = `category-${normalizeKey(cat.name)}`;
                return (
                  <div key={cat.name} className="inline-flex items-center space-x-2">
                    <RadioGroupItem value={cat.name} id={id} />
                    <Label htmlFor={id} className="font-normal cursor-pointer">
                      {cat.name}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            <Button
              type="button"
              variant="ghost"
              className="justify-start px-0 text-primary"
              onClick={() => setShowCustomCategory(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Custom...
            </Button>
          </div>
        )}
      </div>

      {/* Subcategory */}
      {category && (
        <div>
          <Label>Subcategory</Label>
          {showCustomSubcategory ? (
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Enter new subcategory name"
                value={customSubcategoryInput}
                onChange={(e) => setCustomSubcategoryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSubcategory()}
              />
              <Button type="button" onClick={handleAddCustomSubcategory}>
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCustomSubcategory(false)}
              >
                Cancel
              </Button>
            </div>
        ) : (
          <div className="mt-2 space-y-3">
            <RadioGroup
              value={subcategory || undefined}
              onValueChange={handleSubcategorySelect}
              className="flex flex-wrap gap-4"
            >
              {subcategories.map((sub) => {
                const id = `subcategory-${normalizeKey(sub)}`;
                return (
                  <div key={sub} className="inline-flex items-center space-x-2">
                    <RadioGroupItem value={sub} id={id} />
                    <Label htmlFor={id} className="font-normal cursor-pointer">
                      {sub}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            <Button
              type="button"
              variant="ghost"
              className="justify-start px-0 text-primary"
              onClick={() => setShowCustomSubcategory(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Custom...
            </Button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
