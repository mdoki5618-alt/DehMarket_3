import React from 'react';
import { CheckCircle, AlertTriangle, ScanLine, X, ShoppingCart, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, toPersianDigits } from '../utils/helpers';
import { Product } from '../types';

interface ScanToastProps {
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
    product?: Product;
    scannedCode?: string;
  } | null;
  onClose: () => void;
  onNavigateToInventory?: () => void;
}

export default function ScanToast({ toast, onClose, onNavigateToInventory }: ScanToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 print:hidden"
        >
          <div
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center justify-between gap-3 text-right ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/40'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-950/40'
                : 'bg-slate-900/95 border-indigo-500/50 text-white shadow-indigo-950/40'
            }`}
          >
            {/* Left Icon Badge */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : toast.type === 'error'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}
              >
                {toast.type === 'success' ? (
                  <CheckCircle size={22} className="animate-bounce" />
                ) : toast.type === 'error' ? (
                  <AlertTriangle size={22} />
                ) : (
                  <ScanLine size={22} />
                )}
              </div>

              {/* Message Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
                  <ScanLine size={12} className="text-indigo-400" />
                  <span>اسکن خودکار بارکدخوان</span>
                </div>

                <p className="text-xs font-bold mt-0.5 truncate text-slate-100">
                  {toast.message}
                </p>

                {toast.product && (
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-emerald-300 font-semibold">
                    <span>قیمت: {formatCurrency(toast.product.salePrice)}</span>
                    <span>•</span>
                    <span>کد: {toPersianDigits(toast.product.code)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {toast.type === 'error' && onNavigateToInventory && (
                <button
                  onClick={() => {
                    onNavigateToInventory();
                    onClose();
                  }}
                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>افزودن کالا</span>
                  <ArrowLeft size={12} />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
