// Persian utilities for Store Accounting

/**
 * Converts English digits in a string or number to Persian digits
 */
export function toPersianDigits(num: number | string): string {
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

/**
 * Formats currency in Tomans with thousands separators
 */
export function formatCurrency(amount: number, showSymbol = true): string {
  const formatted = new Intl.NumberFormat('fa-IR', {
    style: 'decimal',
    useGrouping: true,
  }).format(amount);
  
  return showSymbol ? `${formatted} تومان` : formatted;
}

/**
 * Converts Gregorian date to Jalali (Shamsi) Date (yyyy/mm/dd)
 */
export function toJalali(dateInput: string | Date | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  
  let gy = date.getFullYear();
  let gm = date.getMonth() + 1;
  let gd = date.getDate();

  let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  
  let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/**
 * Gets a friendly string of the current Persian time: e.g. "۱۴:۳۲"
 */
export function getPersianTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${hours}:${minutes}`);
}

/**
 * Generates a unique short ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Ensures all elements in an array have unique IDs
 */
export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];

  items.forEach((item, index) => {
    if (!item) return;
    let itemId = item.id ? String(item.id) : generateId();
    if (seen.has(itemId)) {
      itemId = `${itemId}_${index}_${generateId()}`;
    }
    seen.add(itemId);
    result.push({ ...item, id: itemId });
  });

  return result;
}

/**
 * Normalizes any backup JSON (e.g. products, invoices, customers or AppState)
 */
export function normalizeImportedBackup(data: any): {
  products: any[];
  contacts: any[];
  transactions: any[];
} {
  let rawProducts: any[] = [];
  let rawContacts: any[] = [];
  let rawTransactions: any[] = [];

  if (Array.isArray(data)) {
    // Top-level array of products
    rawProducts = data;
  } else if (data && typeof data === 'object') {
    // Check products key
    if (Array.isArray(data.products)) {
      rawProducts = data.products;
    }
    // Check contacts or customers
    if (Array.isArray(data.contacts)) {
      rawContacts = data.contacts;
    } else if (Array.isArray(data.customers)) {
      rawContacts = data.customers;
    }
    // Check transactions or invoices
    if (Array.isArray(data.transactions)) {
      rawTransactions = data.transactions;
    } else if (Array.isArray(data.invoices)) {
      rawTransactions = data.invoices;
    }
  }

  // Normalize Products with unique ID tracking
  const seenProductIds = new Set<string>();
  const products = rawProducts.map((p: any, idx: number) => {
    const buy = Number(p.purchasePrice ?? p.buyPrice ?? p.costPrice ?? 0);
    const sell = Number(p.salePrice ?? p.sellPrice ?? p.price ?? 0);
    const code = String(p.code || p.id || generateId().substring(0, 6));
    const descParts = [];
    if (p.description) descParts.push(p.description);
    if (p.unit) descParts.push(`واحد: ${p.unit}`);
    if (p.expiryDate) descParts.push(`انقضا: ${p.expiryDate}`);

    let id = String(p.id || code || generateId());
    if (seenProductIds.has(id)) {
      id = `${id}_${idx}_${generateId()}`;
    }
    seenProductIds.add(id);

    return {
      id,
      code: code,
      name: p.name || 'کالای بدون نام',
      category: p.category || 'عمومی',
      purchasePrice: buy,
      salePrice: sell,
      stock: Number(p.stock ?? 10),
      minStock: Number(p.minStock ?? 5),
      description: descParts.join(' | ')
    };
  });

  // Normalize Contacts/Customers with unique ID tracking
  const seenContactIds = new Set<string>();
  const contacts = rawContacts.map((c: any, idx: number) => {
    let balance = Number(c.balance || 0);
    if (Array.isArray(c.transactions)) {
      c.transactions.forEach((t: any) => {
        if (t.type === 'DEBT') balance += Number(t.amount || 0);
        if (t.type === 'PAYMENT') balance -= Number(t.amount || 0);
      });
    }

    let id = String(c.id || generateId());
    if (seenContactIds.has(id)) {
      id = `${id}_${idx}_${generateId()}`;
    }
    seenContactIds.add(id);

    return {
      id,
      name: c.name || 'شخص بدون نام',
      role: (c.role === 'supplier' || c.role === 'both') ? (c.role as 'supplier' | 'both') : ('customer' as const),
      phone: c.phone || c.customerPhone || '',
      address: c.address || '',
      balance: balance
    };
  });

  // Normalize Transactions/Invoices with unique ID tracking
  const seenTxIds = new Set<string>();
  const transactions = rawTransactions.map((t: any, idx: number) => {
    // payment method mapping
    let pType: 'cash' | 'card' | 'debt' = 'card';
    const methodStr = String(t.paymentMethod || t.paymentType || '').toUpperCase();
    if (methodStr.includes('DEBT') || methodStr.includes('CREDIT') || methodStr.includes('نسیه')) {
      pType = 'debt';
    } else if (methodStr.includes('CASH') || methodStr.includes('نقد')) {
      pType = 'cash';
    } else {
      pType = 'card';
    }

    // items mapping
    const rawItems = Array.isArray(t.items) ? t.items : [];
    const normItems = rawItems.map((item: any) => {
      const priceVal = Number(item.price ?? item.sellPrice ?? item.buyPrice ?? 0);
      const qtyVal = Number(item.quantity ?? item.qty ?? 1);
      return {
        productId: String(item.productId || generateId()),
        name: item.name || item.productName || 'کالا',
        quantity: qtyVal,
        price: priceVal,
        total: Number(item.total ?? (priceVal * qtyVal))
      };
    });

    const sub = Number(t.subtotal ?? t.totalAmount ?? 0);
    const disc = Number(t.discount ?? 0);
    const finalAmt = Number(t.totalBill ?? t.finalAmount ?? (sub - disc));

    let id = String(t.id || generateId());
    if (seenTxIds.has(id)) {
      id = `${id}_${idx}_${generateId()}`;
    }
    seenTxIds.add(id);

    return {
      id,
      type: (t.type === 'purchase' || t.invoiceType === 'purchase') ? ('purchase' as const) : ('sale' as const),
      invoiceNumber: String(t.invoiceNumber || t.id || `INV-${generateId()}`),
      date: t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
      contactId: t.contactId ? String(t.contactId) : undefined,
      contactName: t.contactName || t.customerName || 'مشتری حضوری',
      items: normItems,
      totalAmount: sub || normItems.reduce((acc: number, x: any) => acc + x.total, 0),
      discount: disc,
      finalAmount: finalAmt || normItems.reduce((acc: number, x: any) => acc + x.total, 0),
      paymentType: pType,
      notes: t.notes || (t.cashierName ? `صندوق‌دار: ${t.cashierName}` : '')
    };
  });

  return {
    products,
    contacts,
    transactions
  };
}

export function formatQuantityDisplay(qty: number): string {
  if (!qty || qty <= 0) return '۰';
  if (Number.isInteger(qty)) {
    return toPersianDigits(qty);
  }
  const grams = Math.round(qty * 1000);
  return `${toPersianDigits(qty)} کیلو (${toPersianDigits(grams)} گرم)`;
}

/**
 * Demo Data Seeder to give a premium initial experience 
 */
export const seedDemoState = () => ({
  products: [
    { id: 'p1', code: '1001', name: 'روغن آفتابگردان ۱.۵ لیتری', category: 'مواد غذایی', purchasePrice: 48000, salePrice: 62000, stock: 45, minStock: 10, description: 'روغن مایع پخت و پز آفتابگردان' },
    { id: 'p2', code: '1002', name: 'برنج هاشمی درجه یک (۱۰ کیلویی)', category: 'مواد غذایی', purchasePrice: 850000, salePrice: 990000, stock: 12, minStock: 5, description: 'برنج شمال، سورت شده ممتاز' },
    { id: 'p3', code: '1003', name: 'مایع ظرفشویی ۴ لیتری', category: 'شوینده و بهداشتی', purchasePrice: 72000, salePrice: 89000, stock: 8, minStock: 10, description: 'پاک‌کنندگی قوی با رایحه لیمو' },
    { id: 'p4', code: '1004', name: 'رب گوجه فرنگی ۸۰۰ گرمی', category: 'مواد غذایی', purchasePrice: 31000, salePrice: 39500, stock: 60, minStock: 15 },
    { id: 'p5', code: '1005', name: 'چای سیاه معطر خارجی ۵۰۰ گرمی', category: 'مواد غذایی', purchasePrice: 165000, salePrice: 198000, stock: 3, minStock: 8, description: 'برند ممتاز سیلان معطر گوزل' },
    { id: 'p6', code: '1006', name: 'شامپو تقویتی سر', category: 'شوینده و بهداشتی', purchasePrice: 42000, salePrice: 55000, stock: 22, minStock: 6 },
    { id: 'p7', code: '1007', name: 'لوبیا چیتی اعلا (کیلوگرم)', category: 'حبوبات و غلات', purchasePrice: 95000, salePrice: 125000, stock: 80, minStock: 10, description: 'فروش به صورت کیلویی و گرمی' },
    { id: 'p8', code: '1008', name: 'لوبیا قرمز دستچین (کیلوگرم)', category: 'حبوبات و غلات', purchasePrice: 90000, salePrice: 118000, stock: 50, minStock: 10, description: 'فروش به صورت کیلویی و گرمی' },
    { id: 'p9', code: '1009', name: 'عدس کانادایی درجه یک (کیلوگرم)', category: 'حبوبات و غلات', purchasePrice: 80000, salePrice: 105000, stock: 65, minStock: 15, description: 'فروش به صورت کیلویی و گرمی' }
  ],
  contacts: [
    { id: 'c1', name: 'علی رضایی (مشتری دائمی)', role: 'customer' as const, phone: '09123456789', address: 'تهران، خیابان آزادی، پلاک ۱۲', balance: 145000 },
    { id: 'c2', name: 'شرکت پخش گلستان', role: 'supplier' as const, phone: '02188442200', address: 'بزرگراه ستاری، نبش یاس سوم', balance: -1200000 },
    { id: 'c3', name: 'مریم حسینی', role: 'customer' as const, phone: '09198765432', address: 'کرج، جهانشهر، کوچه نسترن', balance: 0 },
    { id: 'c4', name: 'هایپر مارکت عمده البرز', role: 'supplier' as const, phone: '0263445566', address: 'کرج، جاده ملارد، نبش گلستان ۵', balance: -450000 }
  ],
  transactions: [
    {
      id: 't1',
      type: 'sale' as const,
      invoiceNumber: 'S-۱۴۰۵-۰۰۱',
      date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      contactId: 'c1',
      contactName: 'علی رضایی (مشتری دائمی)',
      items: [
        { productId: 'p1', name: 'روغن آفتابگردان ۱.۵ لیتری', quantity: 2, price: 62000, total: 124000 },
        { productId: 'p4', name: 'رب گوجه فرنگی ۸۰۰ گرمی', quantity: 3, price: 39500, total: 118500 }
      ],
      totalAmount: 242500,
      discount: 12500,
      finalAmount: 230000,
      paymentType: 'card' as const,
      notes: 'خرید حضوری با کارتخوان'
    },
    {
      id: 't2',
      type: 'purchase' as const,
      invoiceNumber: 'P-۱۴۰۵-۰۰۱',
      date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      contactId: 'c2',
      contactName: 'شرکت پخش گلستان',
      items: [
        { productId: 'p1', name: 'روغن آفتابگردان ۱.۵ لیتری', quantity: 20, price: 48000, total: 960000 },
        { productId: 'p5', name: 'چای سیاه معطر خارجی ۵۰۰ گرمی', quantity: 10, price: 165000, total: 1650000 }
      ],
      totalAmount: 2610000,
      discount: 110000,
      finalAmount: 2500000,
      paymentType: 'debt' as const,
      notes: 'ثبت فاکتور خرید امانی از موزع'
    },
    {
      id: 't3',
      type: 'sale' as const,
      invoiceNumber: 'S-۱۴۰۵-۰۰۲',
      date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      contactId: 'c1',
      contactName: 'علی رضایی (مشتری دائمی)',
      items: [
        { productId: 'p2', name: 'برنج هاشمی درجه یک (۱۰ کیلویی)', quantity: 1, price: 990000, total: 990000 }
      ],
      totalAmount: 990000,
      discount: 40000,
      finalAmount: 950000,
      paymentType: 'debt' as const,
      notes: 'ثبت به عنوان حساب دفتری با تایید مدیر'
    }
  ]
});
