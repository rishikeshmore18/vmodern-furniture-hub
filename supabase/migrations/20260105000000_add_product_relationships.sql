-- =====================================================
-- ADD PARENT/CHILD PRODUCT RELATIONSHIPS FOR SETS
-- =====================================================

-- Products: identify sets and link child items back to parent
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_set BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS part_of_set UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS can_be_sold_separately BOOLEAN NOT NULL DEFAULT true;

-- Set items: optional link to child product record
ALTER TABLE public.set_items
  ADD COLUMN IF NOT EXISTS child_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Backfill: mark existing set products based on current set_items
UPDATE public.products
SET is_set = true
WHERE id IN (
  SELECT DISTINCT product_id
  FROM public.set_items
);

-- Indexes for common relationship queries
CREATE INDEX IF NOT EXISTS idx_products_is_set ON public.products(is_set);
CREATE INDEX IF NOT EXISTS idx_products_part_of_set ON public.products(part_of_set);
CREATE INDEX IF NOT EXISTS idx_products_type_subcategory ON public.products(product_type, subcategory);
CREATE INDEX IF NOT EXISTS idx_set_items_child_product_id ON public.set_items(child_product_id);
