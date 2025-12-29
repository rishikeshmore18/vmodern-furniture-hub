import { useState, useRef } from 'react';
import { ZoomIn, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const allImages = images.length > 0 ? images : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  };

  return (
    <div className="flex flex-col gap-4" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Main Image Container */}
      <div className="relative">
        <div
          ref={imageContainerRef}
          className={cn(
            "relative overflow-hidden rounded-xl border border-border bg-muted cursor-zoom-in",
            "aspect-square md:aspect-[4/3]"
          )}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
          onClick={() => setIsLightboxOpen(true)}
        >
          <img
            src={allImages[selectedIndex]}
            alt={`${productName} - Image ${selectedIndex + 1}`}
            className={cn(
              "h-full w-full object-contain transition-transform duration-200",
              isZoomed && "scale-150"
            )}
            style={isZoomed ? { 
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` 
            } : undefined}
            draggable={false}
            loading={selectedIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={selectedIndex === 0 ? "high" : "auto"}
          />
          
          {/* Zoom indicator */}
          <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">
            <ZoomIn className="h-3 w-3" />
            <span className="hidden sm:inline">Hover to zoom</span>
          </div>
        </div>

        {/* Navigation arrows for desktop */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 rounded-full shadow-lg bg-background/90 hover:bg-background"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 rounded-full shadow-lg bg-background/90 hover:bg-background"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {allImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-lg overflow-hidden border-2 transition-all",
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <img
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
                loading="lazy"
                decoding="async"
              />
              {selectedIndex === index && (
                <div className="absolute inset-0 bg-primary/10" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Mobile swipe hint */}
      {allImages.length > 1 && (
        <p className="text-xs text-center text-muted-foreground md:hidden">
          Tap thumbnails to switch • Tap image to enlarge
        </p>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur-xl border-none">
          <div className="relative flex items-center justify-center h-[90vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-background/80 hover:bg-background"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation */}
            {allImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-background/80 hover:bg-background"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-background/80 hover:bg-background"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Full image */}
            <img
              src={allImages[selectedIndex]}
              alt={`${productName} - Image ${selectedIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain"
              draggable={false}
            />

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
              {selectedIndex + 1} / {allImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
