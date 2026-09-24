import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { formatCurrency, formatDate, toBanglaNumber } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  Calendar, 
  Tag, 
  DollarSign, 
  X, 
  Check, 
  Building2, 
  Users, 
  Zap, 
  Coffee, 
  Truck, 
  Wrench,
  Search
} from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const expenseCategories: ExpenseCategory[] = [
  'দোকান ভাড়া',
  'কর্মচারীর বেতন',
  'বিদ্যুৎ বিল',
  'পরিবহন খরচ',
  'আপ্যায়ন/নাস্তা',
  'পণ্য লোড/আনলোড',
  'দোকান মেরামত',
  'কুরিয়ার রিটার্ন ক্ষতি',
  'অন্যান্য',
];

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('দোকান ভাড়া');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  // Quick Open Modal for specific expenses (Rent, Salary, etc.)
  const handleOpenQuickExpense = (cat: ExpenseCategory, defaultTitle: string) => {
    setCategory(cat);
    setTitle(defaultTitle);
    setAmount(0);
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const currentMonthName = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('bn-BD', { month: 'long', year: 'numeric' }).format(new Date());
    } catch {
      return 'চলতি মাস';
    }
  }, []);

  // Category Summaries
  const categoryTotals = useMemo(() => {
    let rentTotal = 0;
    let salaryTotal = 0;
    let utilityTotal = 0;
    let otherTotal = 0;

    expenses.forEach((e) => {
      if (e.category === 'দোকান ভাড়া') rentTotal += e.amount;
      else if (e.category === 'কর্মচারীর বেতন') salaryTotal += e.amount;
      else if (e.category === 'বিদ্যুৎ বিল') utilityTotal += e.amount;
      else otherTotal += e.amount;
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      total,
      rentTotal,
      salaryTotal,
      utilityTotal,
      otherTotal,
    };
  }, [expenses]);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCategory = selectedFilterCategory === 'all' || e.category === selectedFilterCategory;
      const matchSearch = searchTerm.trim() === '' || 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.note && e.note.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [expenses, selectedFilterCategory, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('অনুগ্রহ করে খরচের বিবরণ লিখুন');
      return;
    }
    if (amount <= 0) {
      alert('সঠিক টাকার পরিমাণ দিন');
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      category,
      amount,
      date: new Date(date).toISOString(),
      note: note.trim() || undefined,
    };

    onAddExpense(newExpense);
    setTitle('');
    setAmount(0);
    setNote('');
    setIsModalOpen(false);
  };

  return (
    <div id="expense-tracker-view" className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            <span>দোকানের ব্যয় ও খরচ খাতা (ভাড়া, বেতন, বিল)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            দোকান পরিচালনা খরচ যেমন দোকান ভাড়া, কর্মচারীর বেতন ও অন্যান্য ব্যয় লিপিবদ্ধ করুন
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium">সর্বমোট খরচ:</span>
            <p className="text-lg font-bold text-rose-600 leading-tight">
              {formatCurrency(categoryTotals.total)}
            </p>
          </div>

          <button
            id="btn-add-expense"
            onClick={() => {
              setTitle('');
              setCategory('দোকান ভাড়া');
              setAmount(0);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন খরচ যোগ</span>
          </button>
        </div>
      </div>

      {/* Prominent Quick-Action Cards for Rent, Salary, and Bills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Quick Card 1: Shop Rent */}
        <div 
          onClick={() => handleOpenQuickExpense('দোকান ভাড়া', `দোকান ভাড়া (${currentMonthName})`)}
          className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 p-4 rounded-xl hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              + ভাড়া এন্ট্রি
            </span>
          </div>
          <h3 className="font-bold text-slate-900 mt-2 text-sm">দোকান ভাড়া প্রদান</h3>
          <p className="text-xs text-slate-500 mt-0.5">মোট ভাড়া পরিশোধ: <b className="text-indigo-800">{formatCurrency(categoryTotals.rentTotal)}</b></p>
        </div>

        {/* Quick Card 2: Staff Salary */}
        <div 
          onClick={() => handleOpenQuickExpense('কর্মচারীর বেতন', `কর্মচারীর বেতন (${currentMonthName})`)}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              + বেতন এন্ট্রি
            </span>
          </div>
          <h3 className="font-bold text-slate-900 mt-2 text-sm">কর্মচারীর বেতন প্রদান</h3>
          <p className="text-xs text-slate-500 mt-0.5">মোট বেতন পরিশোধ: <b className="text-emerald-800">{formatCurrency(categoryTotals.salaryTotal)}</b></p>
        </div>

        {/* Quick Card 3: Utility & Electricity */}
        <div 
          onClick={() => handleOpenQuickExpense('বিদ্যুৎ বিল', `বিদ্যুৎ ও ইউটিলিটি বিল (${currentMonthName})`)}
          className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 p-4 rounded-xl hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              + বিল এন্ট্রি
            </span>
          </div>
          <h3 className="font-bold text-slate-900 mt-2 text-sm">বিদ্যুৎ ও অন্যান্য বিল</h3>
          <p className="text-xs text-slate-500 mt-0.5">মোট বিল পরিশোধ: <b className="text-amber-800">{formatCurrency(categoryTotals.utilityTotal)}</b></p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'সকল খরচ' },
            { id: 'দোকান ভাড়া', label: 'দোকান ভাড়া' },
            { id: 'কর্মচারীর বেতন', label: 'কর্মচারীর বেতন' },
            { id: 'বিদ্যুৎ বিল', label: 'বিদ্যুৎ বিল' },
            { id: 'আপ্যায়ন/নাস্তা', label: 'আপ্যায়ন/নাস্তা' },
            { id: 'পরিবহন খরচ', label: 'পরিবহন খরচ' },
            { id: 'অন্যান্য', label: 'অন্যান্য' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedFilterCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="খরচের নাম বা বিবরণ খুঁজুন..."
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase">
                <th className="py-2.5 px-3">তারিখ</th>
                <th className="py-2.5 px-3">খরচের খাত (ক্যাটাগরি)</th>
                <th className="py-2.5 px-3">খরচের বিবরণ</th>
                <th className="py-2.5 px-3">মন্তব্য / নোট</th>
                <th className="py-2.5 px-3 text-right">টাকার পরিমাণ</th>
                <th className="py-2.5 px-3 text-center">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-1 opacity-50" />
                    <p className="text-xs font-semibold">কোনো খরচের হিসাব পাওয়া যায়নি</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">উপরের বাটন দিয়ে দোকান ভাড়া বা বেতন এন্ট্রি করুন</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        expense.category === 'দোকান ভাড়া'
                          ? 'bg-indigo-100 text-indigo-800'
                          : expense.category === 'কর্মচারীর বেতন'
                          ? 'bg-emerald-100 text-emerald-800'
                          : expense.category === 'বিদ্যুৎ বিল'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {expense.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">
                      {expense.note || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`আপনি কি "${expense.title}" খরচটি মুছে ফেলতে চান?`)) {
                            onDeleteExpense(expense.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                <span>নতুন খরচ এন্ট্রি (দোকান ভাড়া / বেতন / বিল)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-rose-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  খরচের খাত (ক্যাটাগরি) *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as ExpenseCategory;
                    setCategory(newCat);
                    if (!title || title.includes('দোকান ভাড়া') || title.includes('কর্মচারীর বেতন') || title.includes('বিদ্যুৎ বিল')) {
                      setTitle(`${newCat} (${currentMonthName})`);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  খরচের বিবরণ বা নাম *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: দোকান ভাড়া চলতি মাস, শাকিল এর বেতন"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <MoneyInput
                    id="input-expense-amount"
                    required
                    min={1}
                    value={amount}
                    onChange={setAmount}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    তারিখ
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  মন্তব্য বা নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="যেমন: চেকে পরিশোধ, ভাউচার নং ১২"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  খরচ সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
