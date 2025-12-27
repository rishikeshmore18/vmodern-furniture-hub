-- =====================================================
-- PRODUCTS DATABASE SCHEMA FOR VMODERN FURNITURE
-- =====================================================

-- Create enum for product category (floor_sample or online_inventory)
CREATE TYPE public.product_category AS ENUM ('floor_sample', 'online_inventory');

-- Create enum for product tags
CREATE TYPE public.product_tag AS ENUM ('new', 'sale', 'staff_pick');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- =====================================================
-- USER ROLES TABLE (for admin authentication)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are publicly readable
CREATE POLICY "Categories are publicly readable"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can modify categories
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SUBCATEGORIES TABLE
-- =====================================================
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Subcategories are publicly readable
CREATE POLICY "Subcategories are publicly readable"
  ON public.subcategories FOR SELECT
  USING (true);

-- Only admins can modify subcategories
CREATE POLICY "Admins can manage subcategories"
  ON public.subcategories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT 'floor_sample',
  product_type TEXT,
  subcategory TEXT,
  description TEXT NOT NULL DEFAULT '',
  price_original NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  price_final NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_new BOOLEAN NOT NULL DEFAULT false,
  tags product_tag[] NOT NULL DEFAULT '{}',
  main_image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products are publicly readable
CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  USING (true);

-- Only admins can manage products
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PRODUCT IMAGES TABLE (for multiple images per product)
-- =====================================================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Product images are publicly readable
CREATE POLICY "Product images are publicly readable"
  ON public.product_images FOR SELECT
  USING (true);

-- Only admins can manage product images
CREATE POLICY "Admins can insert product images"
  ON public.product_images FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
  ON public.product_images FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
  ON public.product_images FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SET ITEMS TABLE (for product bundles/sets)
-- =====================================================
CREATE TABLE public.set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.set_items ENABLE ROW LEVEL SECURITY;

-- Set items are publicly readable
CREATE POLICY "Set items are publicly readable"
  ON public.set_items FOR SELECT
  USING (true);

-- Only admins can manage set items
CREATE POLICY "Admins can insert set items"
  ON public.set_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update set items"
  ON public.set_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete set items"
  ON public.set_items FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for subcategories
CREATE TRIGGER update_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate final price
CREATE OR REPLACE FUNCTION public.calculate_final_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.discount_percent > 0 THEN
    NEW.price_final = NEW.price_original * (1 - NEW.discount_percent / 100);
  ELSE
    NEW.price_final = NEW.price_original;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-calculate final price
CREATE TRIGGER calculate_product_final_price
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_final_price();

-- =====================================================
-- STORAGE BUCKET FOR PRODUCT IMAGES
-- =====================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images bucket
CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- INSERT DEFAULT CATEGORIES
-- =====================================================
INSERT INTO public.categories (name) VALUES
  ('Sofa Set'),
  ('Dining Set'),
  ('Bedroom Set'),
  ('Accessories');

-- Insert default subcategories
INSERT INTO public.subcategories (category_id, name)
SELECT c.id, s.name FROM public.categories c
CROSS JOIN (VALUES 
  ('Sofa Set', 'Sofa'),
  ('Sofa Set', 'Loveseat'),
  ('Sofa Set', 'Side Seat'),
  ('Dining Set', 'Chairs'),
  ('Dining Set', 'Dining Table'),
  ('Bedroom Set', 'Bed'),
  ('Bedroom Set', 'Night Stand'),
  ('Bedroom Set', 'Side Table'),
  ('Bedroom Set', 'Closet'),
  ('Accessories', 'Decor'),
  ('Accessories', 'Lighting')
) AS s(cat_name, name)
WHERE c.name = s.cat_name;