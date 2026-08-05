import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Contact, Transaction, TransactionItem } from '../types';
import { formatCurrency, toPersianDigits, toJalali, getPersianTime, generateId, formatQuantityDisplay } from '../utils/helpers';
import Barcode from './Barcode';
import { 
  Plus, 
  Search, 
  Trash2, 
  ShoppingBag, 
  User, 
  DollarSign, 
  Calculator, 
  Receipt, 
  Printer, 
  Calendar, 
  Coins, 
  ArrowLeft, 
  ArrowRight,
  ChevronDown,
  Check,
  X,
  ScanLine,
  Barcode as BarcodeIcon,
  PackagePlus,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionsProps {
  products: Product[];
  contacts: Contact[];
  transactions: Transaction[];
  currentMode: 'list' | 'new-sale' | 'new-purchase';
  setMode: (mode: 'list' | 'new-sale' | 'new-purchase') => void;
  onAddTransaction: (t: Transaction) => void;
  onAddProduct?: (p: Product) => void;
  selectedTransactionExternal: Transaction | null;
  clearSelectedTransactionExternal: () => void;
  pendingScannedProduct?: Product | null;
  clearPendingScannedProduct?: () => void;
}

export default function Transactions({ 
  products, 
  contacts, 
  transactions, 
  currentMode, 
  setMode, 
  onAddTransaction,
  onAddProduct,
  selectedTransactionExternal,
  clearSelectedTransactionExternal,
  pendingScannedProduct,
  clearPendingScannedProduct
}: TransactionsProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'sale' | 'purchase'>('sale');
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);

  // Monitor selectedTransactionExternal from Dashboard
  useEffect(() => {
    if (selectedTransactionExternal) {
      setSelectedInvoice(selectedTransactionExternal);
      clearSelectedTransactionExternal();
    }
  }, [selectedTransactionExternal, clearSelectedTransactionExternal]);

  // Invoice creator form states
  const invoiceType = currentMode === 'new-purchase' ? 'purchase' : 'sale';
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [contactId, setContactId] = useState('');
  const [cashCustomerName, setCashCustomerName] = useState('');
  const [basket, setBasket] = useState<TransactionItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'debt'>('card');
  const [notes, setNotes] = useState('');

  // Item Selector Temporary state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearchFilter, setProductSearchFilter] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemGrams, setItemGrams] = useState<number | ''>('');
  const [itemCustomPrice, setItemCustomPrice] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle product selection from autocomplete search list
  const handleSelectProductFromDropdown = (product: Product) => {
    setSelectedProductId(product.id);
    const price = invoiceType === 'sale' ? product.salePrice : product.purchasePrice;
    setItemCustomPrice(price);
    setProductSearchFilter(product.name);
    setIsSearchDropdownOpen(false);

    // Check if item is weighted/bulk
    const isWeighted = product.name.includes('کیلو') || 
                       product.category?.includes('حبوبات') || 
                       product.category?.includes('غلات') ||
                       product.description?.includes('کیلو');
    
    if (isWeighted) {
      setItemQuantity(1);
      setItemGrams(1000);
    } else {
      setItemQuantity(1);
      setItemGrams('');
    }
  };

  // Sync Grams to Quantity/Kg
  const handleGramsChange = (gramsVal: number | '') => {
    setItemGrams(gramsVal);
    if (gramsVal === '' || Number(gramsVal) <= 0) {
      setItemQuantity(0);
    } else {
      setItemQuantity(Number(gramsVal) / 1000);
    }
  };

  // Sync Quantity/Kg to Grams
  const handleQuantityChange = (qtyVal: number) => {
    setItemQuantity(qtyVal);
    if (qtyVal > 0) {
      setItemGrams(Math.round(qtyVal * 1000));
    } else {
      setItemGrams('');
    }
  };

  // Barcode / Scanner states
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Quick New Product Modal states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [quickCategory, setQuickCategory] = useState('عمومی');
  const [quickPurchasePrice, setQuickPurchasePrice] = useState<number | ''>('');
  const [quickSalePrice, setQuickSalePrice] = useState<number | ''>('');
  const [quickStock, setQuickStock] = useState<number | ''>(10);

  // Initialize Invoice Form details on enter
  useEffect(() => {
    if (currentMode === 'new-sale' || currentMode === 'new-purchase') {
      const isSale = currentMode === 'new-sale';
      const prefix = isSale ? 'S' : 'P';
      const count = transactions.filter(t => t.type === (isSale ? 'sale' : 'purchase')).length + 1;
      const jalaliDateStr = toJalali(new Date().toISOString()).replace(/\//g, '');
      setInvoiceNumber(`${prefix}-${jalaliDateStr}-${String(count).padStart(3, '0')}`);
      setContactId('');
      setCashCustomerName('');
      setBasket([]);
      setDiscount(0);
      setPaymentType(isSale ? 'card' : 'debt');
      setNotes('');
      // reset temp item picker
      setSelectedProductId('');
      setItemQuantity(1);
      setItemCustomPrice(0);
      setBarcodeInput('');
      setScanMessage(null);
    }
  }, [currentMode, transactions]);

  // Handle globally scanned barcode item passed from App.tsx
  useEffect(() => {
    if (pendingScannedProduct) {
      const p = pendingScannedProduct;
      const unitPrice = invoiceType === 'sale' ? p.salePrice : p.purchasePrice;

      setBasket(prev => {
        const existingIndex = prev.findIndex(item => item.productId === p.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
          return updated;
        } else {
          return [...prev, {
            productId: p.id,
            name: p.name,
            quantity: 1,
            price: unitPrice,
            total: unitPrice
          }];
        }
      });

      setScanMessage({ 
        text: `کالای «${p.name}» با اسکن بارکد به فاکتور اضافه شد.`, 
        type: 'success' 
      });

      if (clearPendingScannedProduct) {
        clearPendingScannedProduct();
      }
    }
  }, [pendingScannedProduct, invoiceType, clearPendingScannedProduct]);

  // Available client / supplier filtered list
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (invoiceType === 'sale') return c.role === 'customer' || c.role === 'both';
      return c.role === 'supplier' || c.role === 'both';
    });
  }, [contacts, invoiceType]);

  // Filtered products list for searchable dropdown in invoice
  const filteredProductsForInvoice = useMemo(() => {
    if (!productSearchFilter.trim()) return products;
    const q = productSearchFilter.toLowerCase().trim();
    const normQ = q.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(normQ) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, productSearchFilter]);

  // Selected product details
  const currentProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Sync price when currentProduct changes
  useEffect(() => {
    if (currentProduct) {
      setItemCustomPrice(invoiceType === 'sale' ? currentProduct.salePrice : currentProduct.purchasePrice);
    } else {
      setItemCustomPrice(0);
    }
  }, [currentProduct, invoiceType]);

  // Handle barcode / fast code search scanning
  const handleScanBarcode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Normalize Persian digits if scanned/typed with Persian keyboard
    const normalizedQuery = query.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString()).toLowerCase();

    // Search in products by code, id, or name
    const foundProduct = products.find(p => 
      p.code.toLowerCase() === normalizedQuery ||
      p.id.toLowerCase() === normalizedQuery ||
      p.name.toLowerCase().includes(normalizedQuery)
    );

    if (foundProduct) {
      const unitPrice = invoiceType === 'sale' ? foundProduct.salePrice : foundProduct.purchasePrice;
      
      setBasket(prev => {
        const existingIndex = prev.findIndex(item => item.productId === foundProduct.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
          return updated;
        } else {
          return [...prev, {
            productId: foundProduct.id,
            name: foundProduct.name,
            quantity: 1,
            price: unitPrice,
            total: unitPrice
          }];
        }
      });

      setScanMessage({ text: `کالای «${foundProduct.name}» به سبد فاکتور افزوده شد.`, type: 'success' });
      setBarcodeInput('');
    } else {
      setScanMessage({ text: `کالا با بارکد یا کد «${query}» در انبار یافت نشد.`, type: 'error' });
    }

    // Auto focus back to input
    setTimeout(() => {
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }, 100);
  };

  // Open quick add modal with prefilled code if scan failed
  const handleOpenQuickAddWithCode = () => {
    setQuickCode(barcodeInput.trim());
    setQuickName('');
    setQuickPurchasePrice('');
    setQuickSalePrice('');
    setQuickStock(10);
    setIsQuickAddOpen(true);
  };

  // Save quick product directly to inventory and select it
  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      alert('لطفاً نام کالا را وارد کنید.');
      return;
    }

    const newCode = quickCode.trim() || String(Math.floor(10000 + Math.random() * 90000));
    const purchaseP = Number(quickPurchasePrice) || 0;
    const saleP = Number(quickSalePrice) || 0;
    const stockQty = Number(quickStock) || 0;

    const newProduct: Product = {
      id: generateId(),
      code: newCode,
      name: quickName.trim(),
      category: quickCategory || 'عمومی',
      purchasePrice: purchaseP,
      salePrice: saleP,
      stock: stockQty,
      minStock: 5,
      description: 'ثبت سریع از طریق فاکتور'
    };

    if (onAddProduct) {
      onAddProduct(newProduct);
    }

    // Select and add to current invoice basket
    const unitPrice = invoiceType === 'sale' ? saleP : purchaseP;
    setBasket(prev => [
      ...prev,
      {
        productId: newProduct.id,
        name: newProduct.name,
        quantity: 1,
        price: unitPrice,
        total: unitPrice
      }
    ]);

    setSelectedProductId(newProduct.id);
    setItemCustomPrice(unitPrice);
    setItemQuantity(1);

    setScanMessage({ text: `کالای «${newProduct.name}» با موفقیت در انبار ثبت و به فاکتور افزوده شد.`, type: 'success' });

    // Reset quick product form
    setQuickName('');
    setQuickCode('');
    setQuickCategory('عمومی');
    setQuickPurchasePrice('');
    setQuickSalePrice('');
    setQuickStock(10);
    setIsQuickAddOpen(false);
  };

  // Basket additions via dropdown or search selection
  const handleAddToBasket = () => {
    if (!currentProduct || itemQuantity <= 0) return;
    
    const computedPrice = Number(itemCustomPrice) || 0;
    const computedTotal = Math.round(itemQuantity * computedPrice);

    // Check if product already in basket
    const existingIndex = basket.findIndex(item => item.productId === currentProduct.id);
    if (existingIndex > -1) {
      const updated = [...basket];
      const newQty = updated[existingIndex].quantity + itemQuantity;
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total = Math.round(newQty * updated[existingIndex].price);
      setBasket(updated);
    } else {
      const newItem: TransactionItem = {
        productId: currentProduct.id,
        name: currentProduct.name,
        quantity: itemQuantity,
        price: computedPrice,
        total: computedTotal
      };
      setBasket([...basket, newItem]);
    }

    // Reset picker
    setSelectedProductId('');
    setProductSearchFilter('');
    setItemQuantity(1);
    setItemGrams('');
    setItemCustomPrice(0);
  };

  const handleRemoveFromBasket = (index: number) => {
    const updated = [...basket];
    updated.splice(index, 1);
    setBasket(updated);
  };

  // Financial totals
  const totalAmount = useMemo(() => {
    return basket.reduce((sum, item) => sum + item.total, 0);
  }, [basket]);

  const finalAmount = useMemo(() => {
    return Math.max(0, totalAmount - discount);
  }, [totalAmount, discount]);

  // Save the invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (basket.length === 0) {
      alert('لطفاً حداقل یک کالا به سبد فروشگاه اضافه کنید.');
      return;
    }

    // Enforce structured contact if it's on credit / ledger debt!
    if (paymentType === 'debt' && !contactId) {
      alert('برای خریدهای دفتری و نسیه، انتخاب یکی از حساب‌های اشخاص اجباری است تا تراز دفتر کل بروزرسانی شود.');
      return;
    }

    const selectedContact = contacts.find(c => c.id === contactId);
    const resolvedContactName = selectedContact ? selectedContact.name : (cashCustomerName.trim() || 'مشتری متفرقه (نقدی)');

    const newInvoice: Transaction = {
      id: generateId(),
      type: invoiceType,
      invoiceNumber: invoiceNumber.trim(),
      date: new Date().toISOString(),
      contactId: contactId || undefined,
      contactName: resolvedContactName,
      items: basket,
      totalAmount,
      discount,
      finalAmount,
      paymentType,
      notes: notes.trim()
    };

    onAddTransaction(newInvoice);
    setSelectedInvoice(newInvoice); // immediately show printable invoice!
    setMode('list');
  };

  // Lists searches
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 'sale' | 'purchase'>('all');

  // Today's Sales Calculation in Transactions
  const todayJalali = toJalali(new Date().toISOString());
  const todaySalesInvoices = transactions.filter(t => t.type === 'sale' && (toJalali(t.date) === todayJalali || new Date(t.date).toDateString() === new Date().toDateString()));
  const todaySalesSum = todaySalesInvoices.reduce((a, b) => a + b.finalAmount, 0);

  const todayPurchasesInvoices = transactions.filter(t => t.type === 'purchase' && (toJalali(t.date) === todayJalali || new Date(t.date).toDateString() === new Date().toDateString()));
  const todayPurchasesSum = todayPurchasesInvoices.reduce((a, b) => a + b.finalAmount, 0);

  const filteredInvoicesList = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                            (t.contactName && t.contactName.toLowerCase().includes(invoiceSearch.toLowerCase()));
      const matchesType = listTypeFilter === 'all' || t.type === listTypeFilter;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, invoiceSearch, listTypeFilter]);

  // Printable layout triggers
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. TRANSACTION LISTING MODE */}
      {currentMode === 'list' && !selectedInvoice && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">دفتر ثبت فاکتورهای فروشگاه</h2>
              <p className="text-xs text-slate-500 mt-1">مشاهده فاکتورهای خرید، فاکتورهای فروش نقدی/کارتخوان، اسناد نسیه و امکان چاپ مجدد</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setMode('new-sale')}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
              >
                <Plus size={16} />
                <span>صدور فاکتور فروش کالا</span>
              </button>
              <button 
                onClick={() => setMode('new-purchase')}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
              >
                <Plus size={16} />
                <span>ثبت فاکتور خرید کالا</span>
              </button>
            </div>
          </div>

          {/* Daily Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <Calendar size={13} />
                  <span>فروش امروز (روزانه)</span>
                </span>
                <p className="text-lg font-bold text-emerald-900 mt-1">{formatCurrency(todaySalesSum)}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs">
                {toPersianDigits(todaySalesInvoices.length)} فاکتور
              </span>
            </div>

            <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                  <Calendar size={13} />
                  <span>خرید امروز (روزانه)</span>
                </span>
                <p className="text-lg font-bold text-indigo-900 mt-1">{formatCurrency(todayPurchasesSum)}</p>
              </div>
              <span className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs">
                {toPersianDigits(todayPurchasesInvoices.length)} فاکتور
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-600 font-semibold">تعداد کل اسناد ثبت شده</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{toPersianDigits(transactions.length)} فاکتور</p>
              </div>
              <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
                کل دوره
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="جستجوی شماره فاکتور یا نام طرف حساب..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition"
              />
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1 w-full md:w-auto">
              <button
                onClick={() => setListTypeFilter('all')}
                className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  listTypeFilter === 'all' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                همه اسناد
              </button>
              <button
                onClick={() => setListTypeFilter('sale')}
                className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  listTypeFilter === 'sale' 
                    ? 'bg-emerald-50 text-emerald-800 shadow-xs' 
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                فروش‌ها
              </button>
              <button
                onClick={() => setListTypeFilter('purchase')}
                className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  listTypeFilter === 'purchase' 
                    ? 'bg-indigo-50 text-indigo-800 shadow-xs' 
                    : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                خریدها
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
            {filteredInvoicesList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Receipt size={40} className="mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-sm font-medium">هیچ فاکتوری در دفتر اسناد فروشگاه پیدا نشد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table id="all-transactions-table" className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-4 px-6">شماره سند</th>
                      <th className="py-4 px-3">نوع فاکتور</th>
                      <th className="py-4 px-3">طرف حساب تجاری</th>
                      <th className="py-4 px-3">مبلغ کل اقلام</th>
                      <th className="py-4 px-3">تخفیف فاکتور</th>
                      <th className="py-4 px-3 text-left">مبلغ نهایی پرداخت</th>
                      <th className="py-4 px-3">روش تسویه حساب</th>
                      <th className="py-4 px-3 text-center">تاریخ و ساعت ثبت</th>
                      <th className="py-4 px-6 text-center">عملیات فاکتور</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/75">
                    {filteredInvoicesList.map((t, idx) => (
                      <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-6 font-bold text-slate-700 font-mono">{toPersianDigits(t.invoiceNumber)}</td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            t.type === 'sale' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {t.type === 'sale' ? 'فروش کالا' : 'ورود خرید'}
                          </span>
                        </td>
                        <td className="py-4 px-3 font-semibold text-slate-600">{t.contactName}</td>
                        <td className="py-4 px-3 text-slate-500 font-mono">{toPersianDigits(t.totalAmount.toLocaleString())}</td>
                        <td className="py-4 px-3 text-rose-500 font-mono">{toPersianDigits(t.discount.toLocaleString())}</td>
                        <td className="py-4 px-3 text-left font-extrabold text-slate-800 font-mono">
                          {toPersianDigits(t.finalAmount.toLocaleString())} تومان
                        </td>
                        <td className="py-4 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-medium ${
                            t.paymentType === 'cash' 
                              ? 'bg-slate-100 text-slate-700' 
                              : t.paymentType === 'card' 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-amber-50 text-amber-800'
                          }`}>
                            {t.paymentType === 'cash' ? 'نقدی دفتری' : t.paymentType === 'card' ? 'کارتخوان فروشگاه' : 'نسیه دفتری (حساب باز)'}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center text-slate-400 font-mono">
                          <div className="flex flex-col items-center">
                            <span>{toJalali(t.date)}</span>
                            <span className="text-[10px] text-slate-300 mt-0.5">{getPersianTime(t.date)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => setSelectedInvoice(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-semibold transition border border-slate-100 cursor-pointer"
                          >
                            <Printer size={13} />
                            <span>چاپ و جزئیات</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 2. INVOICE CREATION PROCESS */}
      {(currentMode === 'new-sale' || currentMode === 'new-purchase') && !selectedInvoice && (
        <form onSubmit={handleSaveInvoice} className="space-y-6">
          {/* Header Controls */}
          <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setMode('list')}
                className="p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <ArrowRight size={20} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {invoiceType === 'sale' ? 'صدور سند فروش محصول جدید' : 'ثبت فاکتور خرید کالا و شارژ انبار'}
                </h2>
                <p className="text-[10px] text-slate-400">فاکتور صادر شده تراز و موجودی انبار را بلادرنگ موازنه میکند</p>
              </div>
            </div>
            
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 duration-100 cursor-pointer"
            >
              ثبت و صدور فاکتور نهایی
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column: Invoice Details & Product Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Core Information Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-700 border-b border-slate-50 pb-2">۱. اطلاعات سربرگ فاکتور</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Invoice Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">شماره فاکتور سیستم (اتوماتیک)</label>
                    <input 
                      type="text" 
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700"
                    />
                  </div>

                  {/* Contact Account Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      {invoiceType === 'sale' ? 'انتخاب مشتری' : 'تامین‌کننده / عمده‌فروش'}
                    </label>
                    <select
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none cursor-pointer"
                    >
                      <option value="">-- مشتری آزاد (نقدی عمومی) --</option>
                      {filteredContacts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${toPersianDigits(c.phone)})` : ''} - مانده: {formatCurrency(c.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cash customer manual name description (Optional for sales without contact entry) */}
                {!contactId && invoiceType === 'sale' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">نام خریدار گذری (اختیاری)</label>
                    <input 
                      type="text" 
                      value={cashCustomerName}
                      onChange={(e) => setCashCustomerName(e.target.value)}
                      placeholder="خریدار آزاد نقدی"
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Item Added Area */}
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-50 pb-2.5 gap-2">
                  <h3 className="text-sm font-bold text-slate-700">۲. افزودن اقلام به فاکتور</h3>

                  {/* Quick Add New Product Modal trigger button */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCode('');
                      setQuickName('');
                      setQuickPurchasePrice('');
                      setQuickSalePrice('');
                      setQuickStock(10);
                      setIsQuickAddOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-100 cursor-pointer"
                  >
                    <PackagePlus size={15} />
                    <span>＋ تعریف سریع کالای جدید در انبار</span>
                  </button>
                </div>

                {/* BARCODE SCANNER FAST INPUT BOX */}
                <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-inner space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-indigo-200 flex items-center gap-1.5">
                      <ScanLine size={15} className="text-emerald-400" />
                      <span>ورود خودکار با اسکنر بارکدخوان یا جستجوی کد کالا</span>
                    </label>
                    <span className="text-[10px] text-slate-400">با زدن اینتر یا اسکنر، کالا مستقیماً به سبد افزوده می‌شود</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <BarcodeIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleScanBarcode();
                          }
                        }}
                        placeholder="بارکد یا کد کالا را اسکن کنید یا بنویسید (مثال: 1001)..."
                        className="w-full pr-9 pl-3 py-2 text-xs bg-slate-800 text-white focus:bg-slate-850 border border-slate-700 focus:border-indigo-400 rounded-xl outline-none font-mono transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScanBarcode()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>افزودن سریع</span>
                    </button>
                  </div>

                  {/* Scan status feedback message */}
                  {scanMessage && (
                    <div 
                      className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-opacity ${
                        scanMessage.type === 'success' 
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {scanMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                        <span>{scanMessage.text}</span>
                      </div>
                      
                      {scanMessage.type === 'error' && (
                        <button
                          type="button"
                          onClick={handleOpenQuickAddWithCode}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[10px] font-bold transition cursor-pointer"
                        >
                          ثبت این کد به عنوان کالای جدید ＋
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* SEARCHABLE PRODUCT PICKER & GRAM CALCULATOR */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    
                    {/* Live Search Input & Autocomplete Dropdown List */}
                    <div ref={searchContainerRef} className="md:col-span-5 relative space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-slate-600">جستجو و انتخاب کالا از انبار</label>
                        {productSearchFilter && (
                          <button
                            type="button"
                            onClick={() => {
                              setProductSearchFilter('');
                              setSelectedProductId('');
                            }}
                            className="text-[10px] text-indigo-600 hover:underline font-bold"
                          >
                            پاکسازی ✕
                          </button>
                        )}
                      </div>

                      {/* Live search input box */}
                      <div className="relative">
                        <input 
                          type="text"
                          value={productSearchFilter}
                          onFocus={() => setIsSearchDropdownOpen(true)}
                          onChange={(e) => {
                            setProductSearchFilter(e.target.value);
                            setIsSearchDropdownOpen(true);
                          }}
                          placeholder="🔍 نام کالا، بارکد یا دسته بندی را تایپ کنید..."
                          className="w-full pr-8 pl-3 py-2 text-xs bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition font-medium"
                        />
                        <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Interactive Floating Autocomplete Dropdown List */}
                      {isSearchDropdownOpen && (
                        <div className="absolute right-0 left-0 top-full mt-1 bg-white border border-indigo-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                          {filteredProductsForInvoice.length === 0 ? (
                            <div className="p-4 text-center space-y-2">
                              <p className="text-xs text-slate-500 font-medium">
                                کالایی با عنوان «<strong className="text-slate-800">{productSearchFilter}</strong>» یافت نشد.
                              </p>
                              <button
                                type="button"
                                onClick={handleOpenQuickAddWithCode}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Plus size={14} />
                                <span>ثبت این کالا به عنوان کالای جدید</span>
                              </button>
                            </div>
                          ) : (
                            filteredProductsForInvoice.map((p) => {
                              const isSelected = selectedProductId === p.id;
                              const isOutOfStock = invoiceType === 'sale' && p.stock === 0;
                              const isKg = p.name.includes('کیلو') || p.category?.includes('حبوبات') || p.category?.includes('غلات') || p.description?.includes('کیلو');

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    if (isOutOfStock) return;
                                    handleSelectProductFromDropdown(p);
                                  }}
                                  className={`p-3 transition flex items-center justify-between cursor-pointer ${
                                    isOutOfStock 
                                      ? 'opacity-50 bg-slate-50 cursor-not-allowed' 
                                      : isSelected 
                                        ? 'bg-indigo-50/90 border-r-4 border-indigo-600' 
                                        : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 text-xs">{p.name}</span>
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">کد: {toPersianDigits(p.code)}</span>
                                      {p.category && (
                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">{p.category}</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      <span>موجودی انبار: </span>
                                      <strong className={p.stock === 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                        {toPersianDigits(p.stock)} {isKg ? 'کیلوگرم' : 'عدد'}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="text-left shrink-0">
                                    <p className="text-xs font-extrabold text-slate-900 font-mono">
                                      {formatCurrency(invoiceType === 'sale' ? p.salePrice : p.purchasePrice, false)} تومان
                                    </p>
                                    <span className="text-[9px] text-slate-400">قیمت واحد {isKg ? '(هر کیلو)' : '(هر عدد)'}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Weight & Grams or Quantity inputs */}
                    <div className="md:col-span-4 grid grid-cols-2 gap-2">
                      {/* Quantity in Kg / Unit */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 text-center">
                          تعداد / کیلو
                        </label>
                        <input 
                          type="number" 
                          step="0.001"
                          min="0.001"
                          value={itemQuantity || ''}
                          onChange={(e) => handleQuantityChange(Number(e.target.value))}
                          placeholder="۱"
                          className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl outline-none text-center font-bold text-slate-800"
                        />
                      </div>

                      {/* Weight in Grams */}
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-700 mb-1 text-center">
                          وزن به گرم
                        </label>
                        <input 
                          type="number" 
                          step="10"
                          min="0"
                          value={itemGrams}
                          onChange={(e) => handleGramsChange(e.target.value ? Number(e.target.value) : '')}
                          placeholder="مثال: ۲۵۰ گرم"
                          className="w-full px-2.5 py-2 text-xs bg-indigo-50/50 border border-indigo-200 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-center font-extrabold text-indigo-900 placeholder:font-normal placeholder:text-indigo-300"
                        />
                      </div>
                    </div>

                    {/* Custom Price */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 text-center">فی واحد (تومان)</label>
                      <input 
                        type="number" 
                        value={itemCustomPrice || ''}
                        onChange={(e) => setItemCustomPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none text-center font-bold text-slate-800"
                      />
                    </div>

                    {/* Add action button */}
                    <div className="md:col-span-1">
                      <button
                        type="button"
                        disabled={!selectedProductId || itemQuantity <= 0}
                        onClick={handleAddToBasket}
                        className="w-full py-2 bg-slate-900 border border-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:border-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex justify-center items-center gap-1 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>افزودن</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Weight Presets & Calculation Summary Bar */}
                  {selectedProductId && (
                    <div className="p-2.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[10px] text-indigo-800 font-extrabold">انتخاب سریع وزن (گرمی/کیلویی):</span>
                          {[
                            { label: '۲۵۰ گرم', grams: 250 },
                            { label: '۵۰۰ گرم (نیم کیلو)', grams: 500 },
                            { label: '۷۵۰ گرم', grams: 750 },
                            { label: '۱ کیلوگرم', grams: 1000 },
                            { label: '۱.۵ کیلو', grams: 1500 },
                            { label: '۲ کیلوگرم', grams: 2000 },
                          ].map((preset) => (
                            <button
                              type="button"
                              key={preset.grams}
                              onClick={() => {
                                handleGramsChange(preset.grams);
                              }}
                              className={`px-2 py-1 text-[11px] rounded-lg border font-bold transition cursor-pointer ${
                                Number(itemGrams) === preset.grams 
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                                  : 'bg-white text-indigo-900 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100/60'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Computed total for this line */}
                        <div className="text-xs font-extrabold text-indigo-900 bg-white px-3 py-1 rounded-xl border border-indigo-200 font-mono">
                          مبلغ کل محاسبه‌شده: {formatCurrency(Math.round(itemQuantity * itemCustomPrice))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock Warning alert */}
                {currentProduct && invoiceType === 'sale' && itemQuantity > currentProduct.stock && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg font-semibold animate-pulse">
                    ⚠ توجه: تعداد درخواستی فروش ({toPersianDigits(itemQuantity)}) بزرگتر از کل موجودی فیزیکی کنونی انبار ({toPersianDigits(currentProduct.stock)}) میباشد.
                  </p>
                )}
              </div>

              {/* Added Items table List */}
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
                <h3 className="text-xs font-bold text-slate-500 mb-2">لیست نهایی اقلام انتخاب شده</h3>
                
                {basket.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                    <ShoppingBag size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-medium">هیچ کالایی هنوز به سبد فاکتور وارد نشده است.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table id="basket-items-table" className="w-full text-right text-xs">
                      <thead className="text-slate-400 border-b border-slate-100 font-semibold">
                        <tr>
                          <th className="pb-2.5">نام کالا</th>
                          <th className="pb-2.5 text-center">تعداد کل</th>
                          <th className="pb-2.5 text-left">قیمت واحد (فی)</th>
                          <th className="pb-2.5 text-left">مجموع بها</th>
                          <th className="pb-2.5 text-center w-12">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                        {basket.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/20">
                            <td className="py-2.5 font-bold text-slate-700">{item.name}</td>
                            <td className="py-2.5 text-center font-bold font-mono text-indigo-600">{formatQuantityDisplay(item.quantity)}</td>
                            <td className="py-2.5 text-left font-mono text-slate-500">{toPersianDigits(item.price.toLocaleString())}</td>
                            <td className="py-2.5 text-left font-bold text-slate-800 font-mono">{toPersianDigits(item.total.toLocaleString())} تومان</td>
                            <td className="py-2.5 text-center">
                              <button 
                                type="button"
                                onClick={() => handleRemoveFromBasket(index)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Checkout Summary panel */}
            <div className="space-y-6">
              {/* Financial Box */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col justify-between space-y-6 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-48 h-48 bg-indigo-5050 rounded-full blur-3xl opacity-10 pointer-events-none" />
                
                <div>
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-700/60 pb-3 flex items-center gap-1.5">
                    <Calculator size={16} />
                    <span>خلاصه فاکتور و صندوق</span>
                  </h3>

                  <div className="space-y-4 mt-5">
                    {/* Sum items val */}
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>جمع ناخالص فاکتور:</span>
                      <span className="font-bold font-mono">{toPersianDigits(totalAmount.toLocaleString())} تومان</span>
                    </div>

                    {/* Discount Input */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>کسر تخفیف فاکتور (تومان):</span>
                        {discount > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            ({toPersianDigits(Math.min(100, Math.round((discount / (totalAmount || 1)) * 100)))}٪ تخفیف)
                          </span>
                        )}
                      </div>
                      <input 
                        type="number" 
                        value={discount || ''}
                        onChange={(e) => setDiscount(Math.min(totalAmount, Number(e.target.value)))}
                        placeholder="کاهش مبلغ کلی"
                        className="w-full px-3 py-1.5 text-xs bg-slate-800 focus:bg-slate-800 text-white border border-slate-700 focus:border-amber-400 rounded-xl outline-none text-left"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="font-bold text-slate-300">مجموع قابل پرداخت:</span>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {formatCurrency(finalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement Type */}
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-600 mb-2">۳. روش تسویه حساب تفصیلی</h3>

                {/* Grid payment selectors */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('card')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      paymentType === 'card' 
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Receipt size={16} />
                    <span className="text-[10px]">کارتخوان</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      paymentType === 'cash' 
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-bold' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Coins size={16} />
                    <span className="text-[10px]">نقدی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('debt')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      paymentType === 'debt' 
                        ? 'border-amber-600 bg-amber-50/50 text-amber-700 font-bold' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <User size={16} />
                    <span className="text-[10px]">دفتری (نسیه)</span>
                  </button>
                </div>

                {paymentType === 'debt' && !contactId && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-lg leading-relaxed font-semibold">
                    ⚠ هشدار: برای تسویه دفتری (نسیه) باید «مشتری یا همکار» را در سربرگ فاکتور انتخاب کنید، در غیر این‌صورت موازنه مالی ثبت نخواهد شد.
                  </p>
                )}

                {/* Notes Input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">یادداشت مدیر فاکتور (توضیحات)</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: تحویل داده شد به انبار پیک..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none resize-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* QUICK ADD NEW PRODUCT MODAL */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PackagePlus className="text-indigo-600" size={20} />
                  <h3 className="text-sm font-bold text-slate-800">تعریف سریع کالای جدید در انبار</h3>
                </div>
                <button 
                  onClick={() => setIsQuickAddOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveQuickProduct} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">نام کامل کالا *</label>
                  <input 
                    type="text" 
                    required
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="مثال: نوشابه خانواده ۱.۵ لیتری"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">بارکد / کد کالا</label>
                    <input 
                      type="text" 
                      value={quickCode}
                      onChange={(e) => setQuickCode(e.target.value)}
                      placeholder="خودکار یا اسکن شده"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">دسته‌بندی</label>
                    <input 
                      type="text" 
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      placeholder="مواد غذایی، شوینده..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">قیمت خرید (تومان)</label>
                    <input 
                      type="number" 
                      value={quickPurchasePrice}
                      onChange={(e) => setQuickPurchasePrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="۰"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">قیمت فروش (تومان)</label>
                    <input 
                      type="number" 
                      value={quickSalePrice}
                      onChange={(e) => setQuickSalePrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="۰"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">موجودی اولیه انبار (عدد)</label>
                  <input 
                    type="number" 
                    value={quickStock}
                    onChange={(e) => setQuickStock(e.target.value ? Number(e.target.value) : '')}
                    placeholder="۱۰"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    ذخیره در انبار و افزودن به فاکتور
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. PREMIUM PERSHIAN INVOICE PREVIEW / PRINT WRAPPER */}
      {selectedInvoice && (
        <div className="space-y-6">
          {/* Controls bar (Hidden during print) */}
          <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 shadow-sm print:hidden">
            <button 
              onClick={() => {
                setSelectedInvoice(null);
                setMode('list');
              }}
              className="flex items-center gap-1 px-4 py-2 hover:bg-slate-150 rounded-xl text-slate-600 transition font-medium text-xs cursor-pointer"
            >
              <ArrowRight size={16} />
              <span>بازگشت به دفتر اسناد</span>
            </button>

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
            >
              <Printer size={15} />
              <span>چاپ فاکتور رسمی</span>
            </button>
          </div>

          {/* Printable Facture Wrapper */}
          <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-md max-w-3xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full">
            
            {/* Facture Header with Automatic Barcode */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">فاکتور رسمی فروش افلاین کالا</h1>
                  <p className="text-[10px] text-slate-500 mt-1">سامانه جامع حسابداری و مدیریت مالی انبار</p>
                  
                  {/* Automatic Barcode Representation */}
                  <div className="mt-3">
                    <Barcode value={selectedInvoice.invoiceNumber} width={180} height={46} />
                  </div>
                </div>

                <div className="text-left text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium shrink-0">
                  <p className="mb-1"><strong>شماره فاکتور:</strong> {toPersianDigits(selectedInvoice.invoiceNumber)}</p>
                  <p className="mb-1"><strong>تاریخ فاکتور:</strong> {toJalali(selectedInvoice.date)}</p>
                  <p><strong>ساعت ثبت:</strong> {getPersianTime(selectedInvoice.date)}</p>
                </div>
              </div>

              {/* Company Info row */}
              <div className="grid grid-cols-2 gap-4 mt-6 text-[10px] text-slate-500">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">فروشنده:</h4>
                  <p>فروشگاه تک مارکت (هایپرمواد غذایی)</p>
                  <p className="mt-0.5">مدیریت: تلفن تماس ۰۹۱۲۳۴۵۶۷۸۹</p>
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-800 text-xs mb-1">نام خریدار / طرف حساب:</h4>
                  <p className="font-bold text-indigo-700">{selectedInvoice.contactName || 'مشتری متفرقه عمومی'}</p>
                </div>
              </div>
            </div>

            {/* Facture Body Table */}
            <table className="w-full text-right text-xs border border-slate-200 mb-6 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-extrabold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center">ردیف</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">شرح کالا یا خدمات</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-center w-16">تعداد</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-left w-24">مبلغ واحد (تومان)</th>
                  <th className="py-2.5 px-3 text-left w-28">مجموع بها (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-center border-r border-slate-200 font-bold font-mono">{toPersianDigits(idx + 1)}</td>
                    <td className="py-3 px-3 border-r border-slate-200 font-bold text-slate-700">{item.name}</td>
                    <td className="py-3 px-3 text-center border-r border-slate-200 font-extrabold font-mono text-indigo-600">{formatQuantityDisplay(item.quantity)}</td>
                    <td className="py-3 px-3 text-left border-r border-slate-200 font-mono text-slate-600">{toPersianDigits(item.price.toLocaleString())}</td>
                    <td className="py-3 px-3 text-left font-bold text-slate-900 font-mono">{toPersianDigits(item.total.toLocaleString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Facture Footer summary details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Notes terms */}
              <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 text-[10px] text-slate-500 space-y-1.5">
                <p><strong>توضیحات و یادداشت ملحق شده:</strong></p>
                <p className="text-slate-600 leading-relaxed italic">{selectedInvoice.notes || 'توضیحات خاصی ملحق نگردیده است.'}</p>
                
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <p><strong>شرایط پرداخت و تسویه:</strong></p>
                  <p>
                    مبلغ این قرارداد با توجه به انتخاب گزینه {''}
                    <strong className="text-slate-800">
                      {selectedInvoice.paymentType === 'cash' ? 'پرداخت نقدی' : selectedInvoice.paymentType === 'card' ? 'تراکنش با کارتخوان بانکی' : 'حساب دفتری و نسیه تعهدی'}
                    </strong> {''}
                    تسویه گردیده است.
                  </p>
                </div>
              </div>

              {/* Sum calculations totals footer */}
              <div className="space-y-3.5 pl-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>مجموع ردیف‌ها:</span>
                  <span className="font-bold font-mono">{toPersianDigits(selectedInvoice.totalAmount.toLocaleString())} تومان</span>
                </div>

                <div className="flex justify-between items-center text-xs text-rose-500">
                  <span>تخفیف فاکتور:</span>
                  <span className="font-bold font-mono">({toPersianDigits(selectedInvoice.discount.toLocaleString())}-) تومان</span>
                </div>

                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-3 border-t-2 border-dashed border-slate-200">
                  <span>مجموع کل نهایی پرداخت شده:</span>
                  <span className="text-base font-black text-indigo-600 font-mono">{formatCurrency(selectedInvoice.finalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Signatures Row */}
            <div className="grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-slate-100 text-[10px] text-slate-400 text-center">
              <div>
                <p className="font-bold text-slate-600">امضا و اثرانگشت خریدار</p>
                <div className="h-16 mt-2" />
              </div>
              <div>
                <p className="font-bold text-slate-600">مهر و امضای فروشگاه تک مارکت</p>
                <div className="h-16 mt-2" />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
