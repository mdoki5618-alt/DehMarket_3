import React, { useState } from 'react';
import { Product, Transaction, Contact } from '../types';
import { formatCurrency, toPersianDigits, toJalali } from '../utils/helpers';
import AnalogClock from './AnalogClock';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  ArrowLeftRight, 
  Percent, 
  Layers, 
  Users,
  Calendar,
  Coins
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  products: Product[];
  contacts: Contact[];
  transactions: Transaction[];
  onNavigate: (view: string) => void;
  onSelectTransaction: (t: Transaction) => void;
}

export default function Dashboard({ 
  products, 
  contacts, 
  transactions, 
  onNavigate, 
  onSelectTransaction 
}: DashboardProps) {
  // Calculations
  const sales = transactions.filter(t => t.type === 'sale');
  const purchases = transactions.filter(t => t.type === 'purchase');
  
  const totalSales = sales.reduce((acc, curr) => acc + curr.finalAmount, 0);
  const totalPurchases = purchases.reduce((acc, curr) => acc + curr.finalAmount, 0);
  
  // Daily Sales calculation (Today's Sales)
  const todayJalali = toJalali(new Date().toISOString());
  const todaySalesList = sales.filter(s => {
    if (!s.date) return false;
    const sJalali = toJalali(s.date);
    if (sJalali === todayJalali) return true;
    const d1 = new Date(s.date);
    const d2 = new Date();
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  });
  const todaySalesTotal = todaySalesList.reduce((acc, curr) => acc + curr.finalAmount, 0);
  const todaySalesCount = todaySalesList.length;
  
  // Total Inventory cost: SUM(stock * purchasePrice)
  const inventoryCostValue = products.reduce((acc, curr) => acc + (curr.stock * curr.purchasePrice), 0);
  // Total Inventory sale value: SUM(stock * salePrice)
  const inventorySaleValue = products.reduce((acc, curr) => acc + (curr.stock * curr.salePrice), 0);

  // Exact profit: Profit = Sales Revenue - Cost of Goods Sold
  // Let's compute Cost of Goods Sold for every sold item
  let costOfGoodsSold = 0;
  sales.forEach(invoice => {
    invoice.items.forEach(item => {
      const originalProduct = products.find(p => p.id === item.productId);
      const buyPrice = originalProduct ? originalProduct.purchasePrice : (item.price * 0.7); // fallback if product deleted
      costOfGoodsSold += item.quantity * buyPrice;
    });
  });
  
  // Account for discounts in Sales and add estimated gross profit
  // Total Revenue of sales was totalSales
  // Estimated Profit = revenue - COGS (proportioned by discount)
  // Let's calculate:
  const estimatedProfit = Math.max(0, totalSales - costOfGoodsSold);

  // Low Stock Items
  const lowStockItems = products.filter(p => p.stock <= p.minStock).slice(0, 5);

  // Sales and Purchase by Category for Bar/Donut Chart
  const categorySales: { [cat: string]: number } = {};
  products.forEach(p => {
    categorySales[p.category || 'متفرقه'] = 0;
  });
  sales.forEach(s => {
    s.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const cat = p ? p.category : 'متفرقه';
      categorySales[cat] = (categorySales[cat] || 0) + item.total;
    });
  });

  const categories = Object.keys(categorySales);
  const maxCategoryVal = Math.max(...Object.values(categorySales), 1);

  // Recent 5 Transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header & Clock Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        <div className="lg:col-span-3 flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">پیشخوان امور مالی و انبار</h1>
            <p className="text-sm text-slate-500 mt-1">خلاصه‌ای از وضعیت موجودی کالاها، بدهکاری اشخاص و گردش صندوق فروشگاه شما</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => onNavigate('new-sale')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm shadow-emerald-100 active:scale-95 duration-150 cursor-pointer"
            >
              <TrendingUp size={16} />
              <span>ثبت فاکتور فروش (جدید)</span>
            </button>
            <button 
              onClick={() => onNavigate('new-purchase')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition shadow-sm shadow-indigo-100 active:scale-95 duration-150 cursor-pointer"
            >
              <TrendingDown size={16} />
              <span>ثبت خرید از تامین‌کننده</span>
            </button>
          </div>
        </div>

        {/* Clock Box */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center">
          <AnalogClock />
        </div>
      </div>

      {/* Grid Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Daily Sales (Today) */}
        <div 
          className="p-5 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl shadow-md border border-teal-400/20 flex flex-col justify-between h-36 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-teal-100 text-sm font-medium flex items-center gap-1.5">
              <Calendar size={14} className="text-teal-200" />
              <span>فروش روزانه (امروز)</span>
            </span>
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
              <Coins size={20} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(todaySalesTotal)}</h3>
            <p className="text-xs text-teal-100/90 mt-1 flex items-center justify-between">
              <span>{toPersianDigits(todaySalesCount)} فاکتور امروز</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">روزانه</span>
            </p>
          </div>
        </div>

        {/* Total Sales */}
        <div 
          className="p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-md border border-emerald-400/20 flex flex-col justify-between h-36 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-emerald-100 text-sm font-medium">کل فروش کل دوره</span>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <TrendingUp size={20} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(totalSales)}</h3>
            <p className="text-xs text-emerald-100/80 mt-1 flex items-center justify-between">
              <span>{toPersianDigits(sales.length)} فاکتور کل</span>
            </p>
          </div>
        </div>

        {/* Total Purchases */}
        <div 
          className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-md border border-indigo-400/20 flex flex-col justify-between h-36 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-indigo-100 text-sm font-medium">کل هزینه‌های خرید کالا</span>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <TrendingDown size={20} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(totalPurchases)}</h3>
            <p className="text-xs text-indigo-100/80 mt-1 flex items-center gap-1">
              <span>{toPersianDigits(purchases.length)} فاکتور ورود به انبار</span>
            </p>
          </div>
        </div>

        {/* Net Estimated Profit */}
        <div 
          className="p-5 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-md border border-amber-400/20 flex flex-col justify-between h-36 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-amber-100 text-sm font-medium">سود ناخالص تخمینی</span>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Percent size={20} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(estimatedProfit)}</h3>
            <p className="text-xs text-amber-100/80 mt-1">
              میانگین سود: {totalSales > 0 ? toPersianDigits(Math.round((estimatedProfit / totalSales) * 100)) : '۰'}٪ کل
            </p>
          </div>
        </div>

        {/* Total Inventory Value */}
        <div 
          className="p-5 bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-2xl shadow-md border border-slate-600/20 flex flex-col justify-between h-36 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-200 text-sm font-medium">ارزش موجودی انبار</span>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Package size={20} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(inventoryCostValue)}</h3>
            <p className="text-xs text-slate-300 mt-1">
              ارزش فروش: {formatCurrency(inventorySaleValue, false)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Category Custom Native Chart */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Layers className="text-indigo-500" size={18} />
              <span>فروش به‌تفکیک گروه‌های کالا</span>
            </h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md">بر اساس مبالغ معاملاتی</span>
          </div>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package size={36} className="stroke-1 mb-2 opacity-50" />
              <p className="text-xs">داده‌ای برای دسته‌بندی مبالغ فروش یافت نشد.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((cat, index) => {
                const total = categorySales[cat];
                const pct = (total / maxCategoryVal) * 100;
                const pctOfTotal = totalSales > 0 ? (total / totalSales) * 100 : 0;
                
                return (
                  <div key={cat} className="group">
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                      <span className="font-medium group-hover:text-indigo-600 transition">{cat}</span>
                      <div className="flex gap-2">
                        <span className="text-indigo-600 font-semibold">{formatCurrency(total)}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-400 font-mono text-[10px]">{toPersianDigits(pctOfTotal.toFixed(1))}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          index % 3 === 0 
                            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' 
                            : index % 3 === 1 
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                              : 'bg-gradient-to-r from-amber-500 to-amber-600'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={18} />
                <span>هشدارهای نقطه سفارش انبار</span>
              </h3>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {toPersianDigits(products.filter(p => p.stock <= p.minStock).length)} مورد
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-emerald-600 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-100">
                <Package className="mb-2 opacity-80" size={32} />
                <p className="text-xs font-medium">موجودی کلیه محصولات در حد مطلوب است!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex justify-between items-center p-2.5 bg-slate-50/70 hover:bg-slate-50 rounded-lg transition border border-slate-100">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">کد کالا: {toPersianDigits(item.code)}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${
                        item.stock === 0 
                          ? 'bg-rose-50 text-rose-600' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.stock === 0 ? 'ناموجود' : `موجودی: ${toPersianDigits(item.stock)}`}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1 font-medium">حداقل: {toPersianDigits(item.minStock)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {lowStockItems.length > 5 && (
            <button 
              onClick={() => onNavigate('inventory')}
              className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 font-bold mt-4 pt-3 border-t border-slate-100 cursor-pointer"
            >
              مشاهده تمام کسری‌های انبار ←
            </button>
          )}
        </div>
      </div>

      {/* Recent Activity Ledger */}
      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <ArrowLeftRight className="text-slate-600" size={18} />
            <span>آخرین تراکنش‌ها و فاکتورها</span>
          </h3>
          <button 
            onClick={() => onNavigate('reports')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
          >
            مشاهده دفتر معین و مالی ←
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">هیچ خریدی یا فروشی هنوز ثبت نشده است.</p>
            <p className="text-xs mt-1">تراکنش جدید ثبت کنید تا در اینجا نمایش داده شود.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="recent-transactions-table" className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="pb-3 text-right">شماره فاکتور</th>
                  <th className="pb-3 text-right">نوع</th>
                  <th className="pb-3 text-right">طرف حساب</th>
                  <th className="pb-3 text-right">تاریخ</th>
                  <th className="pb-3 text-left">مبلغ نهایی</th>
                  <th className="pb-3 text-right">نحوه تسویه</th>
                  <th className="pb-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/75">
                {recentTransactions.map((t, idx) => (
                  <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-3.5 font-bold text-slate-700">{toPersianDigits(t.invoiceNumber)}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.type === 'sale' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {t.type === 'sale' ? 'فروش' : 'خرید'}
                      </span>
                    </td>
                    <td className="py-3.5 font-medium text-slate-600">{t.contactName || 'مشتری متفرقه'}</td>
                    <td className="py-3.5 text-slate-400 font-mono">{toJalali(t.date)}</td>
                    <td className="py-3.5 text-left font-bold text-slate-800">{formatCurrency(t.finalAmount)}</td>
                    <td className="py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${
                        t.paymentType === 'cash' 
                          ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                          : t.paymentType === 'card' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-amber-50 text-amber-800 border border-amber-100'
                      }`}>
                        {t.paymentType === 'cash' ? 'نقدی' : t.paymentType === 'card' ? 'کارتخوان' : 'دفتری/نسیه'}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <button 
                        onClick={() => onSelectTransaction(t)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 hover:text-indigo-600 rounded-md text-slate-600 font-medium transition cursor-pointer"
                      >
                        نمایش فاکتور
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helpful Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100 flex items-start gap-4">
          <div className="p-3 bg-emerald-600 rounded-xl text-white shrink-0 shadow-sm">
            <Users size={20} />
          </div>
          <div>
            <h4 className="font-bold text-emerald-800 text-sm">حساب دفتری مشتریان</h4>
            <p className="text-xs text-emerald-700/80 mt-1 leading-relaxed">
              شما می‌توانید مبالغ بدهکاری مشتریان را در تب «حساب اشخاص» بررسی کنید. هنگام ثبت فاکتور نسیه (دفتری)، ارزش فاکتور به‌طور خودکار به مانده حساب فرد افزوده می‌شود.
            </p>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shrink-0 shadow-sm">
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <h4 className="font-bold text-indigo-800 text-sm">پشتیبان‌گیری مکرر</h4>
            <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
              تمامی اطلاعات حساب شما در فضای فبلتِ مرورگر شما ذخیره می‌شود. جهت اطمینان از عدم مفقودی اطلاعات در پاکسازی مروگر، حتماً از قابلیت خروجی فایل پشتیبان در بخش «دفتر مالی» استفاده نمائید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
