import { Product, calculateFinalPrice } from '@/types/product';

const createProduct = (
  id: string,
  name: string,
  category: 'floor_sample' | 'online_inventory',
  description: string,
  priceOriginal: number,
  discountPercent: number,
  isNew: boolean,
  tags: ('new' | 'sale' | 'staff_pick')[],
  mainImageUrl: string
): Product => ({
  id,
  name,
  category,
  description,
  priceOriginal,
  discountPercent,
  priceFinal: calculateFinalPrice(priceOriginal, discountPercent),
  isNew,
  tags,
  mainImageUrl,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const mockProducts: Product[] = [
  // Floor Samples
  createProduct(
    '1',
    'Oslo Leather Sofa',
    'floor_sample',
    'A stunning mid-century modern leather sofa with solid walnut legs. Perfect for contemporary living spaces. Features premium top-grain leather in a warm cognac color.',
    2499,
    20,
    false,
    ['sale'],
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'
  ),
  createProduct(
    '2',
    'Minimalist Dining Table',
    'floor_sample',
    'Clean lines and solid oak construction define this 6-seater dining table. Features a natural finish that highlights the wood grain.',
    1899,
    0,
    true,
    ['new', 'staff_pick'],
    'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80'
  ),
  createProduct(
    '3',
    'Sculptural Accent Chair',
    'floor_sample',
    'A statement piece with curved lines and premium bouclé upholstery. Solid ash wood frame with a natural finish.',
    899,
    15,
    false,
    ['sale', 'staff_pick'],
    'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80'
  ),
  createProduct(
    '4',
    'Walnut Platform Bed',
    'floor_sample',
    'Queen-size platform bed with integrated nightstands. Solid walnut construction with a low-profile design.',
    2199,
    0,
    true,
    ['new'],
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80'
  ),
  createProduct(
    '5',
    'Marble Coffee Table',
    'floor_sample',
    'Elegant coffee table with Italian Carrara marble top and brass-finished steel legs. A timeless centerpiece.',
    1299,
    10,
    false,
    ['sale'],
    'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&q=80'
  ),
  // Online Inventory
  createProduct(
    '6',
    'Modular Sectional Sofa',
    'online_inventory',
    'Customizable sectional with premium performance fabric. Configure to fit your space perfectly. Available in 12 colors.',
    3499,
    0,
    true,
    ['new', 'staff_pick'],
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80'
  ),
  createProduct(
    '7',
    'Executive Office Desk',
    'online_inventory',
    'Large executive desk with cable management and built-in power outlets. White oak veneer with powder-coated steel frame.',
    1599,
    0,
    false,
    ['staff_pick'],
    'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80'
  ),
  createProduct(
    '8',
    'Linen Upholstered Bed',
    'online_inventory',
    'King-size bed with tall upholstered headboard. Belgian linen in natural or charcoal. Solid wood frame.',
    1899,
    25,
    false,
    ['sale'],
    'https://images.unsplash.com/photo-1588046130717-0eb0c9a3ba15?w=800&q=80'
  ),
  createProduct(
    '9',
    'Ceramic Table Lamp',
    'online_inventory',
    'Handcrafted ceramic table lamp with linen shade. Available in white, sage, or terracotta glaze.',
    289,
    0,
    true,
    ['new'],
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80'
  ),
  createProduct(
    '10',
    'Wool Area Rug',
    'online_inventory',
    'Hand-tufted wool rug in a modern geometric pattern. 8x10 size. Made in India with natural dyes.',
    1199,
    0,
    false,
    [],
    'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800&q=80'
  ),
  createProduct(
    '11',
    'Sideboard Cabinet',
    'online_inventory',
    'Mid-century inspired sideboard with sliding doors and adjustable shelving. Solid oak with brass hardware.',
    1799,
    0,
    true,
    ['new', 'staff_pick'],
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80'
  ),
  createProduct(
    '12',
    'Velvet Dining Chairs',
    'online_inventory',
    'Set of 2 dining chairs with velvet upholstery and gold-finished legs. Available in emerald, navy, or blush.',
    549,
    0,
    false,
    [],
    'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80'
  ),
];

export const getProductById = (id: string): Product | undefined => {
  return mockProducts.find(product => product.id === id);
};

export const getFloorSamples = (): Product[] => {
  return mockProducts.filter(product => product.category === 'floor_sample');
};

export const getOnlineInventory = (): Product[] => {
  return mockProducts.filter(product => product.category === 'online_inventory');
};

export const getTaggedProducts = (tag: 'new' | 'sale' | 'staff_pick'): Product[] => {
  return mockProducts.filter(product => product.tags.includes(tag));
};

export const getFeaturedProducts = (): Product[] => {
  return mockProducts.filter(product => 
    product.tags.includes('new') || 
    product.tags.includes('sale') || 
    product.tags.includes('staff_pick')
  ).slice(0, 6);
};
