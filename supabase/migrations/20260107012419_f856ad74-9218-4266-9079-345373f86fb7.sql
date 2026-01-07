-- Add product relationship columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_set boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS part_of_set uuid REFERENCES public.products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS can_be_sold_separately boolean NOT NULL DEFAULT true;

-- Add child_product_id to set_items table
ALTER TABLE public.set_items 
ADD COLUMN IF NOT EXISTS child_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_is_set ON public.products(is_set);
CREATE INDEX IF NOT EXISTS idx_products_part_of_set ON public.products(part_of_set);
CREATE INDEX IF NOT EXISTS idx_set_items_child_product_id ON public.set_items(child_product_id);

-- Backfill: Mark products that have set_items as is_set = true
UPDATE public.products p
SET is_set = true
WHERE EXISTS (
  SELECT 1 FROM public.set_items si WHERE si.product_id = p.id
);