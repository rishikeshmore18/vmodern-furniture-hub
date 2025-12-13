export type ProductCategory = 'floor_sample' | 'online_inventory';

export type ProductTag = 'new' | 'sale' | 'staff_pick';

// Product categories for classification
export type ProductType = 'sofa_set' | 'dining_set' | 'bedroom_set' | 'accessories' | string;

// Set item for product bundles
export interface SetItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  productType?: ProductType;
  subcategory?: string;
  description: string;
  priceOriginal: number;
  discountPercent: number;
  priceFinal: number;
  isNew: boolean;
  tags: ProductTag[];
  mainImageUrl: string;
  setItems?: SetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  source: string;
  itemNo: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineAmount: number;
}

export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card';

export interface Invoice {
  id: string;
  orderNumber: number;
  date: string;
  billToName: string;
  billToAddress: string;
  billToPhone: string;
  shipToName: string;
  shipToAddress: string;
  shipToPhone: string;
  sameAsBillTo: boolean;
  lineItems: InvoiceLineItem[];
  deliveryCharges: number;
  subtotal: number;
  salesTax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

// Helper function to calculate final price
export function calculateFinalPrice(originalPrice: number, discountPercent: number): number {
  if (!discountPercent || discountPercent <= 0) {
    return originalPrice;
  }
  return originalPrice * (1 - discountPercent / 100);
}

// Helper function to calculate line item amount
export function calculateLineAmount(quantity: number, unitPrice: number, discountPercent: number): number {
  const subtotal = quantity * unitPrice;
  if (!discountPercent || discountPercent <= 0) {
    return subtotal;
  }
  return subtotal * (1 - discountPercent / 100);
}

// Sales tax rate for Massachusetts
export const SALES_TAX_RATE = 0.0625;

// Default product categories and subcategories
export interface CategoryConfig {
  name: string;
  subcategories: string[];
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: 'Sofa Set', subcategories: ['Sofa', 'Loveseat', 'Side Seat'] },
  { name: 'Dining Set', subcategories: ['Chairs', 'Dining Table'] },
  { name: 'Bedroom Set', subcategories: ['Bed', 'Night Stand', 'Side Table', 'Closet'] },
  { name: 'Accessories', subcategories: ['Decor', 'Lighting'] },
];

// Helper to get/set categories from localStorage
const CATEGORIES_KEY = 'vmodern_categories';

export function getStoredCategories(): CategoryConfig[] {
  const stored = localStorage.getItem(CATEGORIES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }
  return DEFAULT_CATEGORIES;
}

export function saveCategories(categories: CategoryConfig[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function addCustomCategory(categoryName: string): CategoryConfig[] {
  const categories = getStoredCategories();
  if (!categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
    categories.push({ name: categoryName, subcategories: [] });
    saveCategories(categories);
  }
  return categories;
}

export function addCustomSubcategory(categoryName: string, subcategoryName: string): CategoryConfig[] {
  const categories = getStoredCategories();
  const category = categories.find(c => c.name === categoryName);
  if (category && !category.subcategories.includes(subcategoryName)) {
    category.subcategories.push(subcategoryName);
    saveCategories(categories);
  }
  return categories;
}
