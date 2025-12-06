export type ProductCategory = 'floor_sample' | 'online_inventory';

export type ProductTag = 'new' | 'sale' | 'staff_pick';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  priceOriginal: number;
  discountPercent: number;
  priceFinal: number;
  isNew: boolean;
  tags: ProductTag[];
  mainImageUrl: string;
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
