-- Add performance indexes for faster product queries
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_set_items_product_id ON public.set_items(product_id);
CREATE INDEX IF NOT EXISTS idx_set_item_images_set_item_id ON public.set_item_images(set_item_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_product_images_product_order ON public.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_set_items_product_order ON public.set_items(product_id, display_order);