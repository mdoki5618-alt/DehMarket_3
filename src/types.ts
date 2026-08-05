export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  description?: string;
}

export interface Contact {
  id: string;
  name: string;
  role: 'customer' | 'supplier' | 'both';
  phone: string;
  address?: string;
  balance: number; // مثبت: بدهکار به ما (باید پرداخت کند)، منفی: طلبکار از ما (باید بپردازیم)
}

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'purchase';
  invoiceNumber: string;
  date: string; // ISO date string
  contactId?: string;
  contactName?: string;
  items: TransactionItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentType: 'cash' | 'card' | 'debt';
  notes?: string;
}

export interface AppState {
  products: Product[];
  contacts: Contact[];
  transactions: Transaction[];
}
