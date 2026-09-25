import React, { useState, useMemo } from 'react';
import { Expense } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Calendar,
  Tag,
  CreditCard,
  DollarSign,
  TrendingDown,
  X,
} from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const COMMON_CATEGORIES = [
  'দোকান ভাড়া',
  'বিদ্যুৎ ও ইউটিলিটি বিল',
  'কর্মচারীর বেতন',
  'আপ্যায়ন ও নাস্তা',
  'পরিবহন ও যাতায়াত',
  'প্যাকেজিং সামগ্রী',
  'কুরিয়ার চার্জ',
  'মেরামত ও রক্ষণাবেক্ষণ',
  'বিজ্ঞাপন ও প্রচারণা',
  'অন্যান্য খরচ',
];

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('আপ্যায়ন ও নাস্তা');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');

  // Expenses filtered
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return expenses.filter((e) => {
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
      const matchQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.note?.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [expenses, searchQuery, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);

    const todayTotal = expenses
      .filter((e) => e.date.slice(0, 10) === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    const monthTotal = expenses
      .filter((e) => e.date.slice(0, 7) === thisMonthPrefix)
      .reduce((sum, e) => sum + e.amount, 0);

    const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { todayTotal, monthTotal, grandTotal, totalCount: expenses.length };
  }, [expenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      alert('অনুগ্রহ করে খরচের বিবরণ এবং সঠিক টাকার পরিমাণ প্রদান করুন!');
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      category,
      amount,
      date: new Date(date).toISOString(),
      paymentMethod,
      note: note.trim() || undefined,
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
    setTitle('');
    setAmount(0);
    setNote('');
  };

  const handleDelete = (exp: Expense) => {
    if (confirm(`আপনি কি "${exp.title}" খরচের রেকর্ডটি মুছে ফেলতে চান?`)) {
      onDeleteExpense(exp.id);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">আজকের মোট খরচ</span>
          <span className="text-xl font-bold text-rose-600 block mt-1">
            {formatCurrency(stats.todayTotal)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">আজকের ব্যয়ের খাতা</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">চলতি মাসের খরচ</span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            {formatCurrency(stats.monthTotal)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">মাসিক মোট ব্যয়</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">সর্বকালীন মোট খরচ</span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            {formatCurrency(stats.grandTotal)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">মোট {stats.totalCount}টি ভাউচার</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">দোকানের দৈনন্দিন খরচ তালিকা</h3>
              <p className="text-xs text-slate-400">প্রতিটি খরচের হিসাব ও ক্যাটাগরি</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="খরচের নাম খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="all">সব ক্যাটাগরি</option>
              {COMMON_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন খরচ যোগ করুন</span>
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">খরচের বিবরণ</th>
                <th className="p-3">ক্যাটাগরি</th>
                <th className="p-3">পেমেন্ট মাধ্যম</th>
                <th className="p-3 text-right">টাকার পরিমাণ</th>
                <th className="p-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3 text-slate-600 font-medium">
                    {formatDate(exp.date)}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{exp.title}</div>
                    {exp.note && <div className="text-[11px] text-slate-400 mt-0.5">{exp.note}</div>}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-600 uppercase text-xs">
                      {exp.paymentMethod || 'নগদ'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-rose-600 text-sm">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(exp)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    কোনো খরচ পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600" />
                <span>নতুন খরচ ভাউচার এন্ট্রি</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">খরচের শিরোনাম / বিবরণ *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: চা-বিস্কুট ও নাস্তা"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                  >
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">টাকার পরিমাণ (৳) *</label>
                  <MoneyInput
                    value={amount}
                    onChange={(val) => setAmount(val)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-rose-300 rounded-xl font-bold text-rose-700 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 uppercase font-semibold"
                  >
                    <option value="cash">নগদ (Cash)</option>
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="bank">ব্যাংক (Bank)</option>
                    <option value="nagad">নগদ ওয়ালেট</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="নোট বা ভাউচার নম্বর..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
