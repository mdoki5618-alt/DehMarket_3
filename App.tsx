import React, { useState, useEffect, useRef } from 'react';
import { Product, Contact, Transaction, AppState } from './types';
import { seedDemoState, toJalali, getPersianTime, toPersianDigits, deduplicateById } from './utils/helpers';
import storeLogo from './assets/images/store_logo_icon_1785884107554.jpg';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Transactions from './components/Transactions';
import Contacts from './components/Contacts';
import Reports from './components/Reports';
import AnalogClock from './components/AnalogClock';
import FloatingActionButton from './components/FloatingActionButton';
import ScanToast from './components/ScanToast';
import { 
  Building2, 
  LayoutDashboard, 
  Package, 
  Receipt, 
  Users, 
  BarChart3, 
  Calendar, 
  Clock,
  Store,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'motion/react';

// Detect if running inside the Electron desktop app (nodeIntegration is enabled
// there, so window.require exists) vs. a plain browser preview.
const electronIpc = (() => {
  try {
    const req = (window as any).require;
    if (!req) return null;
    return req('electron').ipcRenderer;
  } catch {
    return null;
  }
})();

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [tickerTime, setTickerTime] = useState<string>('');

  // Core App DB state
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Selected Transaction reference to auto-open in print mode
  const [selectedTransactionExternal, setSelectedTransactionExternal] = useState<Transaction | null>(null);

  // Global scanner toast & pending scanned product
  const [scanToast, setScanToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    product?: Product;
    scannedCode?: string;
  } | null>(null);

  const [pendingScannedProduct, setPendingScannedProduct] = useState<Product | null>(null);

  // Global barcode scanner hardware listener across entire app
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    let timer: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore system hotkeys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Handle Enter key
      if (e.key === 'Enter') {
        // If the scan landed inside a focused input field (e.g. the dedicated
        // barcode field on the invoice screen), that field's own handler
        // already processes it — skip here to avoid adding the item twice.
        if (buffer.length >= 2 && !isInputFocused) {
          processScannedBarcode(buffer.trim());
          e.preventDefault();
        }
        buffer = '';
        return;
      }

      // Handle character keystrokes
      if (e.key.length === 1) {
        // If keys arrive in rapid succession (< 80ms) OR if user is not in a text input field
        if (timeDiff < 80 || !isInputFocused) {
          buffer += e.key;

          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            if (buffer.length >= 3 && !isInputFocused) {
              processScannedBarcode(buffer.trim());
            }
            buffer = '';
          }, 250);
        } else {
          // Slow manual typing inside an input field
          buffer = e.key;
        }
      }
    };

    const processScannedBarcode = (rawCode: string) => {
      if (!rawCode) return;
      // Convert Persian digits if scanned with Persian layout
      const normalizedCode = rawCode.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString()).toLowerCase();

      // Find matching product by code or ID
      const matched = products.find(p => 
        p.code.toLowerCase() === normalizedCode || 
        p.id.toLowerCase() === normalizedCode ||
        p.code.replace(/[^0-9a-zA-Z]/g, '').toLowerCase() === normalizedCode.replace(/[^0-9a-zA-Z]/g, '')
      );

      if (matched) {
        // Navigate to transactions tab in new-sale mode
        localStorage.setItem('temp_intent', 'new-sale');
        setCurrentTab('transactions');
        setPendingScannedProduct(matched);

        setScanToast({
          message: `کالای «${matched.name}» با اسکن بارکد به فاکتور فروش اضافه شد!`,
          type: 'success',
          product: matched,
          scannedCode: rawCode
        });
      } else {
        setScanToast({
          message: `کالا با بارکد «${rawCode}» در انبار یافت نشد.`,
          type: 'error',
          scannedCode: rawCode
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [products]);

  // Load from LocalStorage on mount (falling back to the on-disk auto-backup
  // file if localStorage is empty/corrupted, e.g. after a reinstall/update)
  useEffect(() => {
    const seedFromDemo = () => {
      const demoData = seedDemoState();
      const pP = deduplicateById(demoData.products);
      const pC = deduplicateById(demoData.contacts);
      const pT = deduplicateById(demoData.transactions);
      setProducts(pP);
      setContacts(pC);
      setTransactions(pT);
      localStorage.setItem('shop_products', JSON.stringify(pP));
      localStorage.setItem('shop_contacts', JSON.stringify(pC));
      localStorage.setItem('shop_transactions', JSON.stringify(pT));
    };

    const restoreFromDiskBackup = async (): Promise<boolean> => {
      if (!electronIpc) return false;
      try {
        const res = await electronIpc.invoke('backup:read-latest');
        if (res && res.ok && res.data) {
          const parsed = JSON.parse(res.data);
          const pP = deduplicateById(parsed.products || []);
          const pC = deduplicateById(parsed.contacts || []);
          const pT = deduplicateById(parsed.transactions || []);
          setProducts(pP);
          setContacts(pC);
          setTransactions(pT);
          localStorage.setItem('shop_products', JSON.stringify(pP));
          localStorage.setItem('shop_contacts', JSON.stringify(pC));
          localStorage.setItem('shop_transactions', JSON.stringify(pT));
          return true;
        }
      } catch {
        // ignore, fall through to other strategies
      }
      return false;
    };

    const init = async () => {
      const cachedProducts = localStorage.getItem('shop_products');
      const cachedContacts = localStorage.getItem('shop_contacts');
      const cachedTransactions = localStorage.getItem('shop_transactions');

      if (cachedProducts && cachedContacts && cachedTransactions) {
        try {
          const parsedP = deduplicateById(JSON.parse(cachedProducts));
          const parsedC = deduplicateById(JSON.parse(cachedContacts));
          const parsedT = deduplicateById(JSON.parse(cachedTransactions));

          setProducts(parsedP);
          setContacts(parsedC);
          setTransactions(parsedT);

          localStorage.setItem('shop_products', JSON.stringify(parsedP));
          localStorage.setItem('shop_contacts', JSON.stringify(parsedC));
          localStorage.setItem('shop_transactions', JSON.stringify(parsedT));
        } catch (err) {
          // localStorage was corrupted: try the disk backup before giving up
          const restored = await restoreFromDiskBackup();
          if (!restored) seedFromDemo();
        }
      } else {
        // Nothing in localStorage (e.g. fresh install after an update wiped it):
        // try to recover from the automatic disk backup first.
        const restored = await restoreFromDiskBackup();
        if (!restored) seedFromDemo();
      }
    };

    init();

    // Live Clock timer
    setTickerTime(getPersianTime(new Date()));
    const interval = setInterval(() => {
      setTickerTime(getPersianTime(new Date()));
    }, 1000); // update every 1 second
    return () => clearInterval(interval);
  }, []);

  // Automatic disk backup: whenever data changes, write a debounced snapshot
  // to a real file in the OS user-data folder (survives reinstalls/updates,
  // unlike localStorage).
  const backupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAutoBackup = (p: Product[], c: Contact[], t: Transaction[]) => {
    if (!electronIpc) return;
    if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(() => {
      const payload = JSON.stringify({
        products: p,
        contacts: c,
        transactions: t,
        savedAt: new Date().toISOString()
      });
      electronIpc.invoke('backup:write', payload).catch(() => {});
    }, 1200);
  };

  // Trigger the auto-backup any time the underlying data changes, regardless
  // of which handler caused the change.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    scheduleAutoBackup(products, contacts, transactions);
  }, [products, contacts, transactions]);

  // Utility to update & cash states
  const updateCachedProducts = (updated: Product[]) => {
    const clean = deduplicateById(updated);
    setProducts(clean);
    localStorage.setItem('shop_products', JSON.stringify(clean));
  };

  const updateCachedContacts = (updated: Contact[]) => {
    const clean = deduplicateById(updated);
    setContacts(clean);
    localStorage.setItem('shop_contacts', JSON.stringify(clean));
  };

  const updateCachedTransactions = (updated: Transaction[]) => {
    const clean = deduplicateById(updated);
    setTransactions(clean);
    localStorage.setItem('shop_transactions', JSON.stringify(clean));
  };

  // CALLBACKS FOR PRODUCTS
  const handleAddProduct = (newP: Product) => {
    setProducts(prev => {
      const existingIdx = prev.findIndex(p => p.id === newP.id || (p.code && p.code === newP.code));
      let updatedList: Product[];
      if (existingIdx > -1) {
        updatedList = [...prev];
        updatedList[existingIdx] = { ...updatedList[existingIdx], ...newP };
      } else {
        updatedList = [newP, ...prev];
      }
      const clean = deduplicateById(updatedList);
      localStorage.setItem('shop_products', JSON.stringify(clean));
      return clean;
    });
  };

  const handleUpdateProduct = (updatedP: Product) => {
    updateCachedProducts(products.map(p => p.id === updatedP.id ? updatedP : p));
  };

  const handleDeleteProduct = (id: string) => {
    updateCachedProducts(products.filter(p => p.id !== id));
  };

  // CALLBACKS FOR CONTACTS
  const handleAddContact = (newC: Contact) => {
    updateCachedContacts([newC, ...contacts]);
  };

  const handleUpdateContact = (updatedC: Contact) => {
    updateCachedContacts(contacts.map(c => c.id === updatedC.id ? updatedC : c));
  };

  const handleDeleteContact = (id: string) => {
    updateCachedContacts(contacts.filter(c => c.id !== id));
  };

  // Adjust balance with manual receipt
  const handleAdjustContactBalance = (contactId: string, amountChange: number, notes?: string) => {
    updateCachedContacts(contacts.map(c => {
      if (c.id === contactId) {
        return { ...c, balance: c.balance + amountChange };
      }
      return c;
    }));

    // Generate a formal accounting receipt transaction! This keeps system journal transparent!
    const updatedContactsList = contacts.map(c => {
      if (c.id === contactId) {
        return { ...c, balance: c.balance + amountChange };
      }
      return c;
    });
    const selectedContact = updatedContactsList.find(c => c.id === contactId);

    const isRec = amountChange < 0; // Negative change means customer paid us money (we receive)
    const isPay = amountChange > 0; // Positive change means we paid money to supplier (we pay)

    const titlePrefix = isRec ? 'دریافت وجه' : 'پرداخت وجه';

    const newSystemReceipt: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      type: isRec ? 'sale' : 'purchase',
      invoiceNumber: `FIN-${toJalali(new Date().toISOString()).replace(/\//g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString(),
      contactId,
      contactName: selectedContact ? selectedContact.name : 'طرف حساب تجاری',
      items: [
        {
          productId: 'receipt',
          name: `${titlePrefix} دفتری و موازنه صندوق`,
          quantity: 1,
          price: Math.abs(amountChange),
          total: Math.abs(amountChange)
        }
      ],
      totalAmount: Math.abs(amountChange),
      discount: 0,
      finalAmount: Math.abs(amountChange),
      paymentType: 'cash',
      notes: notes || 'ثبت دستی حواله دفتری جهت تسویه بدهکاری/طلبکاری'
    };

    updateCachedTransactions([newSystemReceipt, ...transactions]);
  };

  // CALLBACK FOR TRANSACTIONS (Auto stock deduction and balance synchronization!)
  const handleAddTransaction = (newT: Transaction) => {
    // 1. Record transaction invoice
    updateCachedTransactions([newT, ...transactions]);

    // 2. Adjust inventories levels
    const updatedProducts = products.map(p => {
      const item = newT.items.find(i => i.productId === p.id);
      if (item) {
        const qtyChange = item.quantity;
        const newStock = newT.type === 'sale' ? (p.stock - qtyChange) : (p.stock + qtyChange);
        return { ...p, stock: Math.max(0, newStock) };
      }
      return p;
    });
    updateCachedProducts(updatedProducts);

    // 3. Adjust contact ledger balance if transaction was 'debt' type
    if (newT.paymentType === 'debt' && newT.contactId) {
      const updatedContacts = contacts.map(c => {
        if (c.id === newT.contactId) {
          const multiplier = newT.type === 'sale' ? 1 : -1;
          const balanceChange = newT.finalAmount * multiplier;
          return { ...c, balance: c.balance + balanceChange };
        }
        return c;
      });
      updateCachedContacts(updatedContacts);
    }
  };

  // SYSTEM BACKUPS LOADER
  const handleImportBackupState = (newState: AppState) => {
    updateCachedProducts(newState.products || []);
    updateCachedContacts(newState.contacts || []);
    updateCachedTransactions(newState.transactions || []);
  };

  // RESET TO DEFAULT VALUES
  const handleResetToDefaultDemo = () => {
    const demoData = seedDemoState();
    updateCachedProducts(demoData.products);
    updateCachedContacts(demoData.contacts);
    updateCachedTransactions(demoData.transactions);
    setCurrentTab('dashboard');
  };

  // Navigate & select invoice from dashboard
  const handleSelectTransactionFromDashboard = (t: Transaction) => {
    setSelectedTransactionExternal(t);
    setCurrentTab('transactions');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* Top Navigation Bar Status line */}
      <header className="bg-slate-900 text-white shadow-md print:hidden sticky top-0 z-40 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo Brand info */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-400/40 shadow-md shrink-0 bg-indigo-600">
              <img 
                src={storeLogo} 
                alt="لوگوی فروشگاه" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                <span>سامانه حسابداری توانا</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded-full">نسخه فروشگاهی</span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">مدیریت موجودی کالا و فاکتورها</p>
            </div>
          </div>

          {/* Clock Info status line */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-850 rounded-xl border border-slate-800">
              <Calendar size={13} className="text-indigo-400" />
              <span className="font-semibold">{toJalali(new Date().toISOString())}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-850 rounded-xl border border-slate-800">
              <Clock size={13} className="text-emerald-400" />
              <span className="font-mono text-emerald-300">{toPersianDigits(tickerTime)}</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Nav menu (Hidden on print) */}
        <aside className="w-full md:w-64 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit sticky top-24 print:hidden space-y-1.5 shrink-0">
          <p className="text-xs text-slate-400 font-extrabold px-3 py-1.5 uppercase tracking-wider">منوی اصلی سامانه</p>
          
          {/* Dashboard tab key */}
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={18} />
            <span>خلاصه وضعیت (پیشخوان)</span>
          </button>

          {/* Product management Inventory */}
          <button
            onClick={() => setCurrentTab('inventory')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'inventory' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Package size={18} />
            <span>مدیریت کالا و انبار</span>
          </button>

          {/* Invoices book */}
          <button
            onClick={() => setCurrentTab('transactions')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'transactions' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Receipt size={18} />
            <span>فاکتورها و تسویه‌ها</span>
          </button>

          {/* Contacts and accounts ledger */}
          <button
            onClick={() => setCurrentTab('contacts')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'contacts' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users size={18} />
            <span>حساب اشخاص (دفتر کل)</span>
          </button>

          {/* Financial Statements reports */}
          <button
            onClick={() => setCurrentTab('reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'reports' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={18} />
            <span>گزارش عملکرد و بازیابی</span>
          </button>

          {/* Footer visual decoration credit */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 text-center space-y-1">
            <p className="font-semibold text-slate-500">اپلیکیشن ۱۰۰٪ آفلاین و امن</p>
            <p className="text-[11px]">تمام داده‌ها در سیستم شما محفوظ است</p>
          </div>
        </aside>

        {/* Dynamic Display content wrapper */}
        <section className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex-1 animate-fade-in-up">
            {currentTab === 'dashboard' && (
              <Dashboard 
                products={products}
                contacts={contacts}
                transactions={transactions}
                onNavigate={(tab) => {
                  if (tab === 'new-sale') {
                    setCurrentTab('transactions');
                    // wait, to trigger creation form we must let Transactions view handle the tab index
                    localStorage.setItem('temp_intent', 'new-sale');
                  } else if (tab === 'new-purchase') {
                    setCurrentTab('transactions');
                    localStorage.setItem('temp_intent', 'new-purchase');
                  } else {
                    setCurrentTab(tab);
                  }
                }}
                onSelectTransaction={handleSelectTransactionFromDashboard}
              />
            )}

            {currentTab === 'inventory' && (
              <Inventory 
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
              />
            )}

            {currentTab === 'transactions' && (
              <Transactions 
                products={products}
                contacts={contacts}
                transactions={transactions}
                currentMode={
                  localStorage.getItem('temp_intent') === 'new-sale' 
                    ? 'new-sale' 
                    : localStorage.getItem('temp_intent') === 'new-purchase' 
                      ? 'new-purchase' 
                      : 'list'
                }
                setMode={(mode) => {
                  if (mode === 'list') {
                    localStorage.removeItem('temp_intent');
                  } else {
                    localStorage.setItem('temp_intent', mode);
                  }
                  // force state reload
                  setCurrentTab('transactions');
                }}
                onAddTransaction={handleAddTransaction}
                onAddProduct={handleAddProduct}
                selectedTransactionExternal={selectedTransactionExternal}
                clearSelectedTransactionExternal={() => setSelectedTransactionExternal(null)}
                pendingScannedProduct={pendingScannedProduct}
                clearPendingScannedProduct={() => setPendingScannedProduct(null)}
              />
            )}

            {currentTab === 'contacts' && (
              <Contacts 
                contacts={contacts}
                transactions={transactions}
                onAddContact={handleAddContact}
                onUpdateContact={handleUpdateContact}
                onDeleteContact={handleDeleteContact}
                onAdjustBalance={handleAdjustContactBalance}
              />
            )}

            {currentTab === 'reports' && (
              <Reports 
                products={products}
                contacts={contacts}
                transactions={transactions}
                onImportState={handleImportBackupState}
                onResetDatabase={handleResetToDefaultDemo}
              />
            )}
          </div>
        </section>

      </main>

      {/* Global Floating Action Button (FAB) */}
      <FloatingActionButton 
        onNewSale={() => {
          localStorage.setItem('temp_intent', 'new-sale');
          setCurrentTab('transactions');
        }}
        onNewPurchase={() => {
          localStorage.setItem('temp_intent', 'new-purchase');
          setCurrentTab('transactions');
        }}
        onGoToInventory={() => {
          setCurrentTab('inventory');
        }}
      />

      {/* Global Barcode Scan Toast Notification */}
      <ScanToast 
        toast={scanToast}
        onClose={() => setScanToast(null)}
        onNavigateToInventory={() => setCurrentTab('inventory')}
      />

      {/* Footer copyright */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs print:hidden shrink-0">
        <p>© ۱۴۰۵ سامانه حسابداری فروشگاهی هوشمند توانا. تمام حقوق مادی و معنوی محفوظ است.</p>
        <p className="text-[10px] text-slate-500 mt-1">توسعه یافته بر پایه موتور شبیه‌ساز مالی یکپارچه دفتری</p>
      </footer>
    </div>
  );
}
