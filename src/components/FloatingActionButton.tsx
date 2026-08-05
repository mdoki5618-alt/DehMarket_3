import React, { useState } from 'react';
import { 
  Plus, 
  ShoppingCart, 
  PackagePlus, 
  Receipt, 
  ScanLine, 
  X,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingActionButtonProps {
  onNewSale: () => void;
  onNewPurchase: () => void;
  onGoToInventory: () => void;
}

export default function FloatingActionButton({
  onNewSale,
  onNewPurchase,
  onGoToInventory
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50 print:hidden flex flex-col items-start gap-3">
      {/* Expanded Quick Action Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 shadow-2xl text-white min-w-56"
          >
            <p className="text-[11px] font-extrabold text-slate-400 px-2 pt-1 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>میانبرهای سریع سامانه</span>
              <Sparkles size={13} className="text-amber-400" />
            </p>

            {/* New Sale Button */}
            <button
              onClick={() => {
                onNewSale();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-600/30 text-emerald-300 hover:text-white transition-all text-xs font-bold cursor-pointer text-right group"
            >
              <div className="p-2 bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white rounded-lg transition-colors">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="font-extrabold">ثبت فاکتور فروش (جدید)</p>
                <p className="text-[10px] text-slate-400 font-normal">صدور فاکتور مشتری و خروج کالا</p>
              </div>
            </button>

            {/* New Purchase Button */}
            <button
              onClick={() => {
                onNewPurchase();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-600/30 text-indigo-300 hover:text-white transition-all text-xs font-bold cursor-pointer text-right group"
            >
              <div className="p-2 bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white rounded-lg transition-colors">
                <TrendingDown size={16} />
              </div>
              <div>
                <p className="font-extrabold">ثبت خرید از تامین‌کننده</p>
                <p className="text-[10px] text-slate-400 font-normal">افزایش موجودی و ثبت بدهی</p>
              </div>
            </button>

            {/* Go to Inventory */}
            <button
              onClick={() => {
                onGoToInventory();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold cursor-pointer text-right group"
            >
              <div className="p-2 bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white rounded-lg transition-colors">
                <PackagePlus size={16} />
              </div>
              <div>
                <p className="font-extrabold">مدیریت و افزودن کالا</p>
                <p className="text-[10px] text-slate-400 font-normal">بررسی کالاها و تغییر قیمت</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Floating Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-4 py-3.5 rounded-full shadow-2xl text-white font-extrabold text-sm transition-all duration-200 active:scale-95 cursor-pointer border ${
            isOpen 
              ? 'bg-slate-900 border-slate-700' 
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400/30 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30 hover:shadow-emerald-900/50'
          }`}
          title="منوی شناور دسترسی سریع"
        >
          {isOpen ? (
            <X size={20} className="text-slate-300" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
              </div>
              <span className="hidden sm:inline">فاکتور فروش جدید</span>
            </div>
          )}
        </button>

        {/* Quick Direct Button if FAB menu is collapsed */}
        {!isOpen && (
          <button
            onClick={onNewSale}
            className="sm:hidden flex items-center justify-center p-3.5 bg-emerald-600 text-white rounded-full shadow-lg active:scale-95 border border-emerald-400/30"
            title="فاکتور جدید"
          >
            <Plus size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
