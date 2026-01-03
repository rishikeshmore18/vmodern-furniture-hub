import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customSubcategoryInput, setCustomSubcategoryInput] = useState('');

  useEffect(() => {
    setCategories(getStoredCategories());
  }, []);

  const formatLabel = (value: string) =>
    value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

  const currentCategory = categories.find((c) => c.name === category);
  const subcategories = currentCategory?.subcategories || [];
  const categoryBySlug = categories.find((c) => normalizeKey(c.name) === normalizeKey(category));
  const displayCategory = category
    ? categoryBySlug?.name || formatLabel(category)
    : '';
  const needsHiddenCategoryItem = category.length > 0 && !currentCategory;

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

  const subcategoryMatch = subcategories.find((sub) => sub === subcategory);
  const displaySubcategory = subcategory ? formatLabel(subcategory) : '';
  const needsHiddenSubcategoryItem = subcategory.length > 0 && !subcategoryMatch;

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
          <Select value={category || ''} onValueChange={handleCategorySelect}>
            <SelectTrigger className="mt-1">
              {displayCategory ? (
                <SelectValue>{displayCategory}</SelectValue>
              ) : (
                <SelectValue placeholder="Select category" />
              )}
            </SelectTrigger>
            <SelectContent>
              {needsHiddenCategoryItem && (
                <SelectItem value={category} className="hidden">
                  {displayCategory}
                </SelectItem>
              )}
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">
                <span className="flex items-center gap-2 text-primary">
                  <Plus className="h-4 w-4" />
                  Add Custom...
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
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
          <Select value={subcategory || ''} onValueChange={handleSubcategorySelect}>
            <SelectTrigger className="mt-1">
              {displaySubcategory ? (
                <SelectValue>{displaySubcategory}</SelectValue>
              ) : (
                <SelectValue placeholder="Select subcategory" />
              )}
            </SelectTrigger>
            <SelectContent>
              {needsHiddenSubcategoryItem && (
                <SelectItem value={subcategory} className="hidden">
                  {displaySubcategory}
                </SelectItem>
              )}
              {subcategories.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">
                  <span className="flex items-center gap-2 text-primary">
                    <Plus className="h-4 w-4" />
                    Add Custom...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
