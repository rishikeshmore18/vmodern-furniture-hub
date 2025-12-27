import { useState, useRef } from 'react';
import { Upload, Camera, Link as LinkIcon, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MultipleImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}

export function MultipleImageUpload({ value, onChange, label = 'Product Images' }: MultipleImageUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'upload' | 'camera'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newUrls: string[] = [];
      let processed = 0;

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          newUrls.push(result);
          processed++;
          
          if (processed === files.length) {
            onChange([...value, ...newUrls]);
            setIsDialogOpen(false);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange([...value, urlInput.trim()]);
      setUrlInput('');
      setIsDialogOpen(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onChange([...value, result]);
        setIsDialogOpen(false);
        if (cameraInputRef.current) {
          cameraInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Image Grid */}
      {value.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {index === 0 ? 'Main' : index + 1}
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 shadow-lg"
                onClick={() => handleRemoveImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            {value.length > 0 ? 'Add More Images' : 'Add Images'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Images</DialogTitle>
          </DialogHeader>
          
          {/* Tab buttons */}
          <div className="flex gap-2 border-b border-border pb-3">
            <Button
              type="button"
              variant={activeTab === 'url' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('url')}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              URL
            </Button>
            <Button
              type="button"
              variant={activeTab === 'upload' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('upload')}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button
              type="button"
              variant={activeTab === 'camera' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('camera')}
            >
              <Camera className="mr-2 h-4 w-4" />
              Camera
            </Button>
          </div>

          {/* URL tab */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <Label>Image URL</Label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={handleUrlSubmit} className="flex-1">
                  Add URL
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setUrlInput('');
                    setIsDialogOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Upload tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span>Click to upload from device</span>
                  <span className="text-xs text-muted-foreground">You can select multiple images</span>
                </div>
              </Button>
            </div>
          )}

          {/* Camera tab */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => cameraInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Take a photo</span>
                </div>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Camera capture works best on mobile devices
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          First image will be used as the main product image. You can add up to 10 images.
        </p>
      )}
    </div>
  );
}

