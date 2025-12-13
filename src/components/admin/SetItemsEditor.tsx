import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SetItem } from '@/types/product';
import { ImageUpload } from './ImageUpload';

interface SetItemsEditorProps {
  items: SetItem[];
  onChange: (items: SetItem[]) => void;
}

export function SetItemsEditor({ items, onChange }: SetItemsEditorProps) {
  const addItem = () => {
    const newItem: SetItem = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      imageUrl: '',
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof SetItem, value: string | number) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const totalItemsPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Set Items (Optional)</Label>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Items Total: ${totalItemsPrice.toFixed(2)}
          </span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground">
        Add individual items if this is a furniture set (e.g., bedroom set with bed, nightstands, etc.)
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No set items. This will be treated as a single product.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-secondary/30 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Item {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Item Name</Label>
                  <Input
                    placeholder="e.g., Bed, Night Stand"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Item Price ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <ImageUpload
                  label="Item Photo (Optional)"
                  value={item.imageUrl || ''}
                  onChange={(url) => updateItem(item.id, 'imageUrl', url)}
                />
              </div>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Another Item
          </Button>
        </div>
      )}
    </div>
  );
}
