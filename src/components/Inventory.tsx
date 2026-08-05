import React, { useState, useMemo, useRef } from 'react';
import { Product } from '../types';
import { formatCurrency, toPersianDigits, generateId, normalizeImportedBackup } from '../utils/helpers';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  X, 
  TrendingUp, 
  Coins, 
  Box, 
  CheckCircle,
  HelpCircle,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export default function Inventory({ products, onAddProduct, onUpdateProduct, onDeleteProduct }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importNotice, setImportNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [description, setDescription] = useState('');

  // Dropdown categories
  const categories = useMemo(() => {
    const cats = products.map(p => p.category);
    return Array.from(new Set(cats)).filter(Boolean);
  }, [products]);

  // Filters
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.code.includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = p.stock <= p.minStock;
      } else if (stockFilter === 'out') {
        matchesStock = p.stock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Aggregate stats
  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const lowStockCount = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  const totalValue = products.reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setCode(String(Math.floor(1000 + Math.random() * 9000))); // Random 4-digit initial code
    setName('');
    setCategory('');
    setPurchasePrice(0);
    setSalePrice(0);
    setStock(0);
    setMinStock(5);
    setDescription('');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setPurchasePrice(p.purchasePrice);
    setSalePrice(p.salePrice);
    setStock(p.stock);
    setMinStock(p.minStock);
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const targetProduct: Product = {
      id: editingProduct ? editingProduct.id : generateId(),
      code: code ? code.trim() : generateId().toUpperCase(),
      name: name.trim(),
      category: category.trim() || 'متفرقه',
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      stock: Number(stock),
      minStock: Number(minStock),
      description: description.trim()
    };

    if (editingProduct) {
      onUpdateProduct(targetProduct);
    } else {
      onAddProduct(targetProduct);
    }
    setIsModalOpen(false);
  };

  // Upload and parse inventory backup file (JSON or CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const textContent = event.target?.result as string;
        let importedProducts: Product[] = [];

        if (file.name.toLowerCase().endsWith('.json') || textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
          const parsed = JSON.parse(textContent);
          const normalized = normalizeImportedBackup(parsed);
          importedProducts = normalized.products;
        } else {
          // Parse CSV / Text lines
          const lines = textContent.split(/\r?\n/).filter(line => line.trim().length > 0);
          lines.forEach((line, idx) => {
            // skip header if contains non-numeric
            if (idx === 0 && (line.includes('نام') || line.includes('name') || line.includes('کد'))) return;
            const parts = line.split(/[,;\t]/).map(p => p.trim());
            if (parts.length >= 2) {
              const buy = Number(parts[3]) || 0;
              const sell = Number(parts[4]) || 0;
              importedProducts.push({
                id: generateId(),
                code: parts[0] || generateId().substring(0, 5),
                name: parts[1],
                category: parts[2] || 'عمومی',
                purchasePrice: buy,
                salePrice: sell,
                stock: Number(parts[5]) || 10,
                minStock: Number(parts[6]) || 5,
                description: 'وارد شده از CSV'
              });
            }
          });
        }

        if (importedProducts.length === 0) {
          setImportNotice({
            message: 'هیچ کالای معتبری در فایل پیدا نشد. لطفاً ساختار فایل را بررسی کنید.',
            type: 'error'
          });
          return;
        }

        let addedCount = 0;
        importedProducts.forEach(newP => {
          if (newP.name) {
            onAddProduct(newP);
            addedCount++;
          }
        });

        setImportNotice({
          message: `تعداد ${toPersianDigits(addedCount)} کالا با موفقیت از فایل پشتیبان به انبار افزوده شد!`,
          type: 'success'
        });

      } catch (err) {
        setImportNotice({
          message: 'خطا در خواندن فایل پشتیبان! فرمت فایل باید JSON یا CSV معتبر باشد.',
          type: 'error'
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Export current inventory products
  const handleExportProducts = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ products }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mojoodi-anbar-backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Backup Upload */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".json,.csv,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت موجودی انبار و کالاها</h2>
          <p className="text-xs text-slate-500 mt-1">تعریف قیمت خرید، قیمت فروش، نقطه سفارش و ورود فایل پشتیبان کالاها</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="ورود لیست کالاها از فایل بکآپ یا اکسل"
          >
            <Upload size={15} />
            <span>بارگذاری فایل پشتیبان کالاها</span>
          </button>

          <button 
            onClick={handleExportProducts}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            title="دانلود نسخه پشتیبان از اقلام انبار"
          >
            <Download size={15} />
            <span>دانلود بکآپ انبار</span>
          </button>

          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 duration-150 cursor-pointer"
          >
            <Plus size={16} />
            <span>افزودن کالای جدید</span>
          </button>
        </div>
      </div>

      {/* Import Status Notice Banner */}
      {importNotice && (
        <div 
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-opacity ${
            importNotice.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotice.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{importNotice.message}</span>
          </div>
          <button 
            onClick={() => setImportNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-slate-200/65 rounded-xl shrink-0 text-slate-600">
            <Box size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-medium">کل اقلام ثبت‌شده</p>
            <h4 className="text-base font-bold text-slate-800">{toPersianDigits(totalProducts)} کالا</h4>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] text-amber-500 font-medium">کسری انبار (نیاز به خرید)</p>
            <h4 className="text-base font-bold text-amber-800">{toPersianDigits(lowStockCount)} کالا</h4>
          </div>
        </div>

        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0">
            <X size={20} />
          </div>
          <div>
            <p className="text-[10px] text-rose-500 font-medium">اقلام تمام‌شده (ناموجود)</p>
            <h4 className="text-base font-bold text-rose-800">{toPersianDigits(outOfStockCount)} کالا</h4>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <p className="text-[10px] text-emerald-500 font-medium">سرمایه در گردش (بهای خرید)</p>
            <h4 className="text-sm font-bold text-emerald-800 truncate">{formatCurrency(totalValue)}</h4>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="جستجو با نام کالا یا بارکد و کد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative md:col-span-3 flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-100 rounded-xl outline-none cursor-pointer"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Filter tabs */}
          <div className="md:col-span-4 flex rounded-xl bg-slate-100 p-1 self-center w-full">
            <button
              onClick={() => setStockFilter('all')}
              className={`flex-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all ${
                stockFilter === 'all' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              همه موجودی
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`flex-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all ${
                stockFilter === 'low' 
                  ? 'bg-amber-100 text-amber-800 shadow-sm' 
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              کسری انبار
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`flex-1 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all ${
                stockFilter === 'out' 
                  ? 'bg-rose-100 text-rose-800 shadow-sm' 
                  : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              ناموجود
            </button>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Box size={44} className="mx-auto stroke-1 text-slate-300 mb-3" />
            <p className="text-sm font-medium">هیچ کالا یا محصولی با فیلتر کنونی پیدا نشد!</p>
            <p className="text-xs text-slate-400 mt-1">با بازنشانی جستجو یا افزودن کالا اقدام کنید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="product-list-table" className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">کد سیستم</th>
                  <th className="py-3.5 px-3">نام و مشخصات کالا</th>
                  <th className="py-3.5 px-3">دسته‌بندی</th>
                  <th className="py-3.5 px-3 text-left">فی خرید (تومان)</th>
                  <th className="py-3.5 px-3 text-left">فی فروش (تومان)</th>
                  <th className="py-3.5 px-3 text-center">ضریب سود فروش</th>
                  <th className="py-3.5 px-3 text-center">موجودی انبار</th>
                  <th className="py-3.5 px-6 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/75">
                {filteredProducts.map((p, idx) => {
                  const isLow = p.stock <= p.minStock && p.stock > 0;
                  const isOut = p.stock === 0;
                  const profitMargin = p.purchasePrice > 0 ? ((p.salePrice - p.purchasePrice) / p.purchasePrice) * 100 : 0;

                  return (
                    <tr key={`${p.id}-${idx}`} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-mono text-slate-400 font-semibold">{toPersianDigits(p.code)}</td>
                      <td className="py-4 px-3">
                        <div>
                          <p className="font-bold text-slate-800 text-[13px]">{p.name}</p>
                          {p.description && <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">{p.description}</p>}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-left font-semibold text-slate-600 font-mono">
                        {toPersianDigits(p.purchasePrice.toLocaleString())}
                      </td>
                      <td className="py-4 px-3 text-left font-bold text-slate-800 font-mono">
                        {toPersianDigits(p.salePrice.toLocaleString())}
                      </td>
                      <td className="py-4 px-3 text-center font-bold text-emerald-600 font-mono">
                        {toPersianDigits(profitMargin.toFixed(0))}%
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex flex-col items-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                            isOut 
                              ? 'bg-rose-50 text-rose-600' 
                              : isLow 
                                ? 'bg-amber-50 text-amber-700' 
                                : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {isOut ? 'ناموجود' : `${toPersianDigits(p.stock)} عدد`}
                          </span>
                          {isLow && (
                            <span className="text-[9px] text-amber-500 mt-1 font-semibold flex items-center gap-0.5">
                              <AlertTriangle size={10} />
                              نیاز به سفارش مجدد
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-lg transition cursor-pointer"
                            title="ویرایش کالا"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`آیا از حذف محصول «${p.name}» مطمئن هستید؟`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg transition cursor-pointer"
                            title="حذف کالا"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingProduct ? 'ویرایش کالا سیستم' : 'افزودن نام و حساب کالای جدید'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Code */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">بارکد یا کد محصول</label>
                    <input 
                      type="text" 
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="کد مثلاً 1002"
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">دسته‌بندی</label>
                    <input 
                      type="text" 
                      list="categories-list"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="مثال: مواد غذایی، لبنیات"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition"
                    />
                    <datalist id="categories-list">
                      {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">نام کامل محصول</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: روغن آفتابگردان ۱.۵ لیتری ورامین"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Purchase Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">بهای خرید (تومان)</label>
                    <input 
                      type="number" 
                      value={purchasePrice || ''}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      placeholder="مبلغ خرید خام"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition text-left"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {purchasePrice > 0 ? formatCurrency(purchasePrice) : ''}
                    </span>
                  </div>

                  {/* Sale Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">قیمت فروش مصرف‌کننده (تومان)</label>
                    <input 
                      type="number" 
                      value={salePrice || ''}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                      placeholder="مبلغ نهایی مصرف‌کننده"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition text-left"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {salePrice > 0 ? formatCurrency(salePrice) : ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Stock */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">موجودی اولیه انبار</label>
                    <input 
                      type="number" 
                      value={stock}
                      onChange={(e) => setStock(Number(e.target.value))}
                      placeholder="تعداد موجود هم اکنون"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition text-center"
                    />
                  </div>

                  {/* Min Stock */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">حداقل آلارم کسری (نقطه سفارش)</label>
                    <input 
                      type="number" 
                      value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))}
                      placeholder="هنگام رسیدن به این عدد هشدار بده"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition text-center"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">یادداشت و توضیحات اضافی</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="مثلا: محل چیدن (قفسه آ-۲) یا برند تولیدکننده..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition resize-none"
                  />
                </div>

                {/* Submit actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    ثبت و ذخیره نهایی
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
