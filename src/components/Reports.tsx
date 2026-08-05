import React, { useRef, useState } from 'react';
import { Product, Transaction, Contact, AppState } from '../types';
import { formatCurrency, toPersianDigits, toJalali, seedDemoState, normalizeImportedBackup } from '../utils/helpers';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Percent, 
  DollarSign, 
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

interface ReportsProps {
  products: Product[];
  contacts: Contact[];
  transactions: Transaction[];
  onImportState: (state: AppState) => void;
  onResetDatabase: () => void;
}

export default function Reports({ 
  products, 
  contacts, 
  transactions, 
  onImportState, 
  onResetDatabase 
}: ReportsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Filter transactions based on date
  const filteredTransactions = transactions.filter(t => {
    if (dateFilter === 'all') return true;
    
    const transDate = new Date(t.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - transDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (dateFilter === 'today') return diffDays <= 1;
    if (dateFilter === 'week') return diffDays <= 7;
    if (dateFilter === 'month') return diffDays <= 30;
    return true;
  });

  // Calculate Metrics
  const sales = filteredTransactions.filter(t => t.type === 'sale');
  const purchases = filteredTransactions.filter(t => t.type === 'purchase');

  const totalSales = sales.reduce((acc, curr) => acc + curr.finalAmount, 0);
  const totalPurchases = purchases.reduce((acc, curr) => acc + curr.finalAmount, 0);
  const totalDiscountsGiven = sales.reduce((acc, curr) => acc + curr.discount, 0);

  // Compute Cost of Goods Sold & Profit
  let costOfGoodsSold = 0;
  sales.forEach(invoice => {
    invoice.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const buyPrice = p ? p.purchasePrice : (item.price * 0.7);
      costOfGoodsSold += item.quantity * buyPrice;
    });
  });

  const estimatedProfit = Math.max(0, totalSales - costOfGoodsSold);

  // Export Entire Database state to JSON
  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ products, contacts, transactions }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hesabdari-backup-${toJalali(new Date().toISOString()).replace(/\//g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON State
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const normalized = normalizeImportedBackup(parsed);

        if (normalized.products.length > 0 || normalized.contacts.length > 0 || normalized.transactions.length > 0) {
          onImportState(normalized as AppState);
          alert(`اطلاعات پشتیبان با موفقیت بارگذاری شد!\nتعداد کالاها: ${normalized.products.length}\nتعداد فاکتورها: ${normalized.transactions.length}\nتعداد اشخاص: ${normalized.contacts.length}`);
        } else {
          alert('فرمت فایل پشتیبان شناسایی نشد یا فایل خالی است.');
        }
      } catch (err) {
        alert('خطا در خواندن فایل پشتیبان! فرمت فایل باید JSON معتبر باشد.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">گزارشات آماری و پشتیبان‌گیری دفتری</h2>
          <p className="text-xs text-slate-500 mt-1">بررسی سود و زیان مالی کل دوره، حاشیه بازده محصولات، بارگیری و استخراج فایل‌های پشتیبان سیستم</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1 w-full sm:w-auto self-center">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              dateFilter === 'all' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            همه دوران
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              dateFilter === 'today' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500'
            }`}
          >
            امروز
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              dateFilter === 'week' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500'
            }`}
          >
            ۷ روز گذشته
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              dateFilter === 'month' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500'
            }`}
          >
            ۳۰ روز گذشته
          </button>
        </div>
      </div>

      {/* Grid of Financial Reports */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sales metric card */}
        <div className="p-4 bg-white border border-slate-100 shadow-xs rounded-2xl">
          <div className="flex gap-2.5 items-center mb-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">فروش ثبت شده</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">{formatCurrency(totalSales)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">{toPersianDigits(sales.length)} فاکتور تایید شده</p>
        </div>

        {/* Purchase Metric card */}
        <div className="p-4 bg-white border border-slate-100 shadow-xs rounded-2xl">
          <div className="flex gap-2.5 items-center mb-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingDown size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">مجموع خرید و هزینه‌ها</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">{formatCurrency(totalPurchases)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">{toPersianDigits(purchases.length)} بار ورود کالا دفتری</p>
        </div>

        {/* Estimated Profit card */}
        <div className="p-4 bg-white border border-slate-100 shadow-xs rounded-2xl">
          <div className="flex gap-2.5 items-center mb-2">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Percent size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">سود ناخالص تخمینی دوره</span>
          </div>
          <h3 className="text-base font-extrabold text-emerald-600">{formatCurrency(estimatedProfit)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">با محاسبه خودکار بهای تمام شده</p>
        </div>

        {/* Net discounts Given */}
        <div className="p-4 bg-white border border-slate-100 shadow-xs rounded-2xl">
          <div className="flex gap-2.5 items-center mb-2">
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <DollarSign size={16} />
            </span>
            <span className="text-xs font-bold text-slate-500">مجموع تخفیفات صادر شده</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">{formatCurrency(totalDiscountsGiven)}</h3>
          <p className="text-[10px] text-rose-400 mt-1">کسر شده از تراز نهایی فروشگاه</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Product Sales margin table ledger */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <FileSpreadsheet size={16} className="text-indigo-600" />
            <span>گزارش بازدهی و تراز حاشیه سود به تفکیک کالاها</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            مقایسه بهای خرید با بهای فروش مصرف‌کننده و درصد سود خالص حاصله از تامین آن کالا
          </p>

          <div className="overflow-x-auto">
            <table id="profit-margin-table" className="w-full text-right text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-150">
                <tr>
                  <th className="py-2.5 px-3">نام و مشخصات محصول</th>
                  <th className="py-2.5 px-3 text-left">فی خرید</th>
                  <th className="py-2.5 px-3 text-left">فی فروش</th>
                  <th className="py-2.5 px-3 text-center">حاشیه سود٪</th>
                  <th className="py-2.5 px-3 text-center">موجودی کالا</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/75">
                {products.slice(0, 8).map(p => {
                  const profit = p.salePrice - p.purchasePrice;
                  const marginPct = p.purchasePrice > 0 ? ((profit / p.purchasePrice) * 100).toFixed(0) : '0';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40">
                      <td className="py-3 px-3 font-bold text-slate-700">{p.name}</td>
                      <td className="py-3 px-3 text-left text-slate-500 font-mono">{toPersianDigits(p.purchasePrice.toLocaleString())}</td>
                      <td className="py-3 px-3 text-left text-slate-800 font-bold font-mono">{toPersianDigits(p.salePrice.toLocaleString())}</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-extrabold font-mono">{toPersianDigits(marginPct)}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.stock === 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {toPersianDigits(p.stock)} عدد
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database backup restoration controller */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
              <RefreshCw size={16} className="text-teal-600" />
              <span>پشتیبان‌گیری و بازنشانی دیتابیس</span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              تمامی فاکتورها، حساب اشخاص و کالاها در دیتابیس LocalStorage مرورگر شما ذخیره شده‌اند. از ابزار زير برای استخراج یا بازیابی اطلاعات استفاده نمائید:
            </p>

            <div className="space-y-3">
              {/* Export backup */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-50 cursor-pointer"
              >
                <Download size={14} />
                <span>برون‌بری فایل پشتیبان (بک‌آپ)</span>
              </button>

              {/* Import backup trigger */}
              <button
                type="button"
                onClick={handleTriggerFileInput}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-50 cursor-pointer"
              >
                <Upload size={14} />
                <span>بارگیری فایل پشتیبان قبلی</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden" 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3.5">
            <h4 className="font-bold text-slate-800 text-xs">عملیات بحرانی پیشخوان:</h4>
            
            <button
              type="button"
              onClick={() => {
                if (confirm('⚠ هشدار جدی: آیا از پاکسازی تمامی اطلاعات و بازنشانی دیتابیس به نمونه محصولات تجای اولیه مطمئن هستید؟ دیتای زنده کنونی کلاً حذف خواهد شد.')) {
                  onResetDatabase();
                }
              }}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-extrabold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>پاکسازی کل بانک اطلاعاتی و بارگذاری نمونه</span>
            </button>
          </div>
        </div>
      </div>

      {/* Helpful Instructions banner */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 text-slate-500">
        <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
        <div className="text-[11px] leading-relaxed">
          <p className="font-bold text-slate-700 mb-0.5">آموزش موازنه حساب دفتری اشخاص:</p>
          <p>
            هنگامی که فاکتور فروش یا فاکتوری از جنس خرید با متد پرداخت صندوف «دفتری نسیه» فاکتور می‌خورد، مبالغ آن مستقیماً در تراز حساب معین اشخاص تاثیر گذاشته و نیازی به ثبت دستی حواله مالی ثانویه نخواهد بود. جهت موازنه نقدی از دکمه «ثبت تسویه و حواله» در سرفصل حساب اشخاص استفاده نمائید.
          </p>
        </div>
      </div>
    </div>
  );
}
