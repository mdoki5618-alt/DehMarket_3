import React, { useState, useMemo } from 'react';
import { Contact, Transaction } from '../types';
import { formatCurrency, toPersianDigits, generateId, toJalali } from '../utils/helpers';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Phone, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Receipt,
  UserPlus,
  ArrowDownLeft,
  X,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContactsProps {
  contacts: Contact[];
  transactions: Transaction[];
  onAddContact: (c: Contact) => void;
  onUpdateContact: (c: Contact) => void;
  onDeleteContact: (id: string) => void;
  onAdjustBalance: (contactId: string, amount: number, notes?: string) => void;
}

export default function Contacts({ 
  contacts, 
  transactions, 
  onAddContact, 
  onUpdateContact, 
  onDeleteContact,
  onAdjustBalance 
}: ContactsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [activeContactForAdjustment, setActiveContactForAdjustment] = useState<Contact | null>(null);
  const [activeContactForHistory, setActiveContactForHistory] = useState<Contact | null>(null);

  // Form inputs for Add/Edit
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);

  // Form inputs for balance adjustment receipt
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<'receive' | 'pay'>('receive'); // receive from customer (reduces positive balance) or pay to supplier (reduces negative balance absolute)
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  // Settle calculations
  const debtorsSum = useMemo(() => {
    return contacts.filter(c => c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
  }, [contacts]);

  const creditorsSum = useMemo(() => {
    return contacts.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
  }, [contacts]);

  // Filters
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.phone.includes(searchTerm);
      const matchesRole = roleFilter === 'all' || c.role === roleFilter || c.role === 'both';
      return matchesSearch && matchesRole;
    });
  }, [contacts, searchTerm, roleFilter]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingContact(null);
    setName('');
    setRole('customer');
    setPhone('');
    setAddress('');
    setInitialBalance(0);
    setIsAddModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (c: Contact) => {
    setEditingContact(c);
    setName(c.name);
    setRole(c.role);
    setPhone(c.phone);
    setAddress(c.address || '');
    setInitialBalance(c.balance);
    setIsAddModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const targetContact: Contact = {
      id: editingContact ? editingContact.id : generateId(),
      name: name.trim(),
      role,
      phone: phone.trim(),
      address: address.trim(),
      balance: editingContact ? editingContact.balance : Number(initialBalance)
    };

    if (editingContact) {
      onUpdateContact(targetContact);
    } else {
      onAddContact(targetContact);
    }
    setIsAddModalOpen(false);
  };

  // Open modal for adjustment (Pardakht / Daryaft)
  const handleOpenAdjustment = (c: Contact) => {
    setActiveContactForAdjustment(c);
    setAdjustmentAmount(Math.abs(c.balance));
    setAdjustmentType(c.balance >= 0 ? 'receive' : 'pay');
    setAdjustmentNotes('');
    setIsPayModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactForAdjustment || adjustmentAmount <= 0) return;

    // Receive increases/decreases contact balance.
    // If we receive money from debtor (balance > 0), their debt REDUCES -> so adjustment amount is negative
    // If we pay money to supplier (balance < 0), our credit REDUCES -> so adjustment amount is positive (pushes balance to 0)
    let finalAmountChange = 0;
    if (adjustmentType === 'receive') {
      finalAmountChange = -Number(adjustmentAmount);
    } else {
      finalAmountChange = Number(adjustmentAmount);
    }

    onAdjustBalance(activeContactForAdjustment.id, finalAmountChange, adjustmentNotes);
    setIsPayModalOpen(false);
  };

  // View detailed transaction ledger
  const handleOpenHistory = (c: Contact) => {
    setActiveContactForHistory(c);
    setIsHistoryModalOpen(true);
  };

  // Gather specific customer transactions
  const contactTransactionsList = useMemo(() => {
    if (!activeContactForHistory) return [];
    return transactions.filter(t => t.contactId === activeContactForHistory.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeContactForHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">حساب اشخاص و طرف‌های تجاری</h2>
          <p className="text-xs text-slate-500 mt-1">مدیریت تراز مالی اشخاص (مشتریان بدهکار و تامین‌کنندگان طلبکار) و ثبت تسویه‌های نقدی</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition shadow-sm active:scale-95 duration-150 cursor-pointer"
        >
          <UserPlus size={16} />
          <span>ثبت شخص جدید</span>
        </button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[10px] text-emerald-500 font-medium">کل مطالبات ما (بدهکاران دفتری)</p>
            <h4 className="text-base font-bold text-slate-800">{formatCurrency(debtorsSum)}</h4>
          </div>
        </div>

        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
            <TrendingDown size={22} />
          </div>
          <div>
            <p className="text-[10px] text-rose-500 font-medium">کل بدهی‌های ما (تامین‌کنندگان طلبکار)</p>
            <h4 className="text-base font-bold text-slate-800">{formatCurrency(creditorsSum)}</h4>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-slate-200 text-slate-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-medium">جمع کل طرفین حساب فعال</p>
            <h4 className="text-base font-bold text-slate-800">{toPersianDigits(contacts.length)} شخص حقیقی/حقوقی</h4>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="جستجوی شخص بر اساس نام یا شماره همراه..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-150 focus:border-indigo-500 rounded-xl outline-none transition"
          />
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 w-full md:w-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleFilter === 'all' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            همه اشخاص
          </button>
          <button
            onClick={() => setRoleFilter('customer')}
            className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleFilter === 'customer' 
                ? 'bg-emerald-50 text-emerald-800 shadow-xs' 
                : 'text-slate-500 hover:text-emerald-600'
            }`}
          >
            مشتریان
          </button>
          <button
            onClick={() => setRoleFilter('supplier')}
            className={`px-6 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleFilter === 'supplier' 
                ? 'bg-indigo-50 text-indigo-800 shadow-xs' 
                : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            تامین‌کنندگان
          </button>
        </div>
      </div>

      {/* Grid of Contacts */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <Users size={36} className="mx-auto stroke-1 text-slate-300 mb-2" />
          <p className="text-xs text-slate-400">هیچ شخص منطبقی پیدا نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((c, idx) => {
            const isOwed = c.balance > 0; // customer owes us
            const weOwe = c.balance < 0; // we owe supplier
            
            return (
              <div 
                key={`${c.id}-${idx}`}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                {/* Header info */}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold ${
                      c.role === 'customer' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : c.role === 'supplier' 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'bg-amber-50 text-amber-700'
                    }`}>
                      {c.role === 'customer' ? 'مشتری' : c.role === 'supplier' ? 'تامین‌کننده' : 'همکار دوطرفه'}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 hover:text-indigo-600 rounded"
                        title="ویرایش مشخصات"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`آیا مطمئن هستید حساب «${c.name}» کلاً حذف گردد؟`)) {
                            onDeleteContact(c.id);
                          }
                        }}
                        className="p-1 hover:text-rose-600 rounded"
                        title="حذف حساب"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm mb-2">{c.name}</h3>
                  
                  {/* Demographics details */}
                  <div className="space-y-1.5 text-[11px] text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Phone size={11} />
                      <span className="font-mono">{c.phone ? toPersianDigits(c.phone) : 'ثبت نشده'}</span>
                    </p>
                    {c.address && (
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin size={11} className="shrink-0" />
                        <span>{c.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Ledger info */}
                <div className="mt-4 pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-slate-400">تراز دفتری کنونی:</span>
                    <span className={`font-mono text-xs font-extrabold ${
                      isOwed 
                        ? 'text-emerald-600' 
                        : weOwe 
                          ? 'text-rose-600' 
                          : 'text-slate-400 font-medium'
                    }`}>
                      {c.balance === 0 
                        ? 'بدون مانده (تسویه)' 
                        : isOwed 
                          ? `${formatCurrency(Math.abs(c.balance))} (بدهکار به ما)` 
                          : `${formatCurrency(Math.abs(c.balance))} (طلبکار از ما)`
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenAdjustment(c)}
                      className="py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-100 rounded-lg text-[10px] font-bold transition flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <Receipt size={11} />
                      <span>تسویه و ثبت حواله</span>
                    </button>
                    <button
                      onClick={() => handleOpenHistory(c)}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 rounded-lg text-[10px] font-bold transition flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <History size={11} />
                      <span>ریز فاکتورها</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT CONTACT MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100 flex flex-col"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingContact ? 'ویرایش مشخصات شناسنامه حساب' : 'ایجاد شناسنامه و حساب جدید شخص'}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">نام کامل شخص یا شرکت</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="مثال: عباس بابایی"
                    className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                {/* Role dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">دسته‌بندی نقش تجاری</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="customer">مشتری (خریدار مویرگی/نهادی)</option>
                    <option value="supplier">تامین‌کننده (توزیع‌کننده کالا/بنکدار)</option>
                    <option value="both">دو طرفه (همکار خرید و فروش)</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">شماره تلفن همراه</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 09123456789"
                    className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none text-left font-mono"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">نشانی یا آدرس محل کار / سکونت</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                {/* Initial balance (visible only on CREATE) */}
                {!editingContact && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">تراز افواجی اولیه (تومان)</label>
                    <input 
                      type="number" 
                      value={initialBalance || ''}
                      onChange={(e) => setInitialBalance(Number(e.target.value))}
                      placeholder="عدد مثبت: بدهکار به ما | عدد منفی: طلبکار از ما"
                      className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none text-left"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {initialBalance > 0 
                        ? `${formatCurrency(initialBalance)} بدهکار به ما` 
                        : initialBalance < 0 
                          ? `${formatCurrency(Math.abs(initialBalance))} طلبکار از ما (بدهی ما)` 
                          : 'تراز صفر حساب باز'
                      }
                    </span>
                  </div>
                )}

                {/* Submit button row */}
                <div className="flex gap-2 pt-3 border-t border-slate-50">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    ذخیره مشخصات
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CASH PAYMENT/RECEIPT VOUCHER ADJUSTMENT MODAL */}
      <AnimatePresence>
        {isPayModalOpen && activeContactForAdjustment && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100 flex flex-col"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">ثبت رسید نقدی / تسویه دفتری</h3>
                <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <p className="text-slate-500">طرف حساب: <strong>{activeContactForAdjustment.name}</strong></p>
                  <p className="text-slate-500">
                    مانده حساب فعل: {''}
                    <strong className={activeContactForAdjustment.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatCurrency(activeContactForAdjustment.balance)}
                    </strong>
                  </p>
                </div>

                {/* Adjustment Mode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">ماهیت تسویه در صندوق</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('receive')}
                      className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                        adjustmentType === 'receive' 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'text-slate-500 hover:text-emerald-600'
                      }`}
                    >
                      دریافت وجه (کاهش طلب ما)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('pay')}
                      className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                        adjustmentType === 'pay' 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'text-slate-500 hover:text-rose-600'
                      }`}
                    >
                      پرداخت وجه (کاهش بدهی ما)
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">مبلغ پرداختی / دریافتی (تومان)</label>
                  <input 
                    type="number" 
                    value={adjustmentAmount || ''}
                    onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none text-left"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {adjustmentAmount > 0 ? formatCurrency(adjustmentAmount) : ''}
                  </span>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">شرح سند حواله</label>
                  <textarea 
                    value={adjustmentNotes}
                    onChange={(e) => setAdjustmentNotes(e.target.value)}
                    placeholder="مثال: تسویه بخشی از فاکتور شماره اس-۱۰۰۲ با چک شماره..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none resize-none transition"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-50 font-medium">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    ثبت سند مالی و خروج
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    بستن
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SYSTEM HISTORY PER CONTACT LEDGER MODAL */}
      <AnimatePresence>
        {isHistoryModalOpen && activeContactForHistory && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl border border-slate-100 flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">ریز کارت معین و تراکنش‌های فرد</h3>
                  <p className="text-[10px] text-slate-400 mt-1">دفتر تراز خریداران متعلق به {activeContactForHistory.name}</p>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {contactTransactionsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl">
                    <History size={24} className="mx-auto mb-2 opacity-50 font-medium" />
                    <p className="text-xs">هیچ تراکنش ثبتی دفتری برای این شخص هنوز ثبت نشده است.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contactTransactionsList.map(t => (
                      <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">{toPersianDigits(t.invoiceNumber)}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              t.type === 'sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                            }`}>
                              {t.type === 'sale' ? 'فروش' : 'خرید'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">تعداد ردیف کالا: {toPersianDigits(t.items.length)} ردیف</p>
                        </div>

                        <div className="text-left">
                          <p className="font-bold text-slate-800">{formatCurrency(t.finalAmount)}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">{toJalali(t.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
                <span>تراز کل نهایی شخص: <strong className={activeContactForHistory.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(activeContactForHistory.balance)}</strong></span>
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  بستن دریچه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
