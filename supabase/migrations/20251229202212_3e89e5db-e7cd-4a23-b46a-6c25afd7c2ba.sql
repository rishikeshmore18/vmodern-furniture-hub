-- =====================================================
-- SET ITEM IMAGES TABLE (for multiple images per set item)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.set_item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_item_id UUID REFERENCES public.set_items(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.set_item_images ENABLE ROW LEVEL SECURITY;

-- Set item images are publicly readable
CREATE POLICY "Set item images are publicly readable"
  ON public.set_item_images FOR SELECT
  USING (true);

-- Only admins can manage set item images
CREATE POLICY "Admins can insert set item images"
  ON public.set_item_images FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update set item images"
  ON public.set_item_images FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete set item images"
  ON public.set_item_images FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));