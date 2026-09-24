import React, { useState, useMemo } from 'react';
import { 
  Order, 
  Expense, 
  PurchaseRecord, 
  DuePaymentRecord, 
  SupplierDuePayment, 
  CashAdjustment,
  AppStateData 
} from '../types';
import { formatCurrency, formatDate, toBanglaNumber } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { 
  Wallet, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowRightLeft, 
  Coins, 
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  FileText,
  Boxes,
  HelpCircle,
  History
} from 'lucide-react';

interface CashBalanceRegisterProps {
  orders: Order[];
  expenses: Expense[];
  purchases: PurchaseRecord[];
  duePayments: DuePaymentRecord[];
  supplierDuePayments: SupplierDuePayment[];
  cashAdjustments: CashAdjustment[];
  lastCashCount?: AppStateData['lastCashCount'];
  onSaveCashAdjustment: (adj: CashAdjustment) => void;
  onSaveCashCount: (countData: { countedAmount: number; difference: number; note?: string }) => void;
}

export const CashBalanceRegister: React.FC<CashBalanceRegisterProps> = ({
  orders,
  expenses,
  purchases,
  duePayments,
  supplierDuePayments,
  cashAdjustments,
  lastCashCount,
  onSaveCashAdjustment,
  onSaveCashCount,
}) => {
  const [dateRange, setDateRange] = useState<'today' | 'this_month' | 'all'>('all');
  
  // Physical Denomination Counter state (Optional helper for counting bills)
  const [showDenomCalculator, setShowDenomCalculator] = useState(false);
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  });

  // Actual physical / present money in hand & accounts
  const [manualCountedCash, setManualCountedCash] = useState<number>(lastCashCount?.countedAmount || 0);
  const [countNote, setCountNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cash / Balance Adjustment Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjType, setAdjType] = useState<'in' | 'out' | 'opening'>('in');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');

  // Date filtering helper
  const filterByDate = (dateStr: string) => {
    if (dateRange === 'all') return true;
    const itemDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === 'today') {
      return itemDate >= today;
    }
    if (dateRange === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return itemDate >= startOfMonth;
    }
    return true;
  };

  // Filtered collections & outflows
  const filteredOrders = useMemo(() => orders.filter((o) => filterByDate(o.date) && o.status !== 'cancelled'), [orders, dateRange]);
  const filteredDuePayments = useMemo(() => duePayments.filter((p) => filterByDate(p.date)), [duePayments, dateRange]);
  const filteredPurchases = useMemo(() => purchases.filter((p) => filterByDate(p.date)), [purchases, dateRange]);
  const filteredSupplierDues = useMemo(() => supplierDuePayments.filter((p) => filterByDate(p.date)), [supplierDuePayments, dateRange]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => filterByDate(e.date)), [expenses, dateRange]);
  const filteredAdjustments = useMemo(() => cashAdjustments.filter((a) => filterByDate(a.date)), [cashAdjustments, dateRange]);

  // Unified Financial Totals (মোট ব্যালেন্স হিসাব - কোনো চ্যানেল বিভক্ত ছাড়া)
  const summary = useMemo(() => {
    // 1. All inflows (মোট জমা)
    const salesPaid = filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const customerDuePaid = filteredDuePayments.reduce((sum, dp) => sum + (dp.amount || 0), 0);
    const adjustmentsIn = filteredAdjustments.reduce((sum, adj) => {
      return adj.type === 'in' || adj.type === 'opening' ? sum + adj.amount : sum;
    }, 0);

    const totalInflow = salesPaid + customerDuePaid + adjustmentsIn;

    // 2. All outflows (মোট খরচ ও পরিশোধ)
    const purchasesPaid = filteredPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const supplierDuesPaid = filteredSupplierDues.reduce((sum, sd) => sum + (sd.amount || 0), 0);
    const expensesPaid = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const adjustmentsOut = filteredAdjustments.reduce((sum, adj) => {
      return adj.type === 'out' ? sum + adj.amount : sum;
    }, 0);

    const totalOutflow = purchasesPaid + supplierDuesPaid + expensesPaid + adjustmentsOut;

    // 3. Expected Total Balance (মোট ব্যালেন্স কত থাকার কথা)
    const expectedTotalBalance = totalInflow - totalOutflow;

    return {
      salesPaid,
      customerDuePaid,
      adjustmentsIn,
      totalInflow,

      purchasesPaid,
      supplierDuesPaid,
      expensesPaid,
      adjustmentsOut,
      totalOutflow,

      expectedTotalBalance,
    };
  }, [filteredOrders, filteredDuePayments, filteredPurchases, filteredSupplierDues, filteredExpenses, filteredAdjustments]);

  // Denominations Total for note calculator
  const denomTotal = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [val, count]) => {
      return sum + Number(val) * (Number(count) || 0);
    }, 0);
  }, [denominations]);

  const handleDenomChange = (val: number, count: number) => {
    const updated = { ...denominations, [val]: Math.max(0, count) };
    setDenominations(updated);
    const total = Object.entries(updated).reduce((sum, [v, c]) => sum + Number(v) * (Number(c) || 0), 0);
    setManualCountedCash(total);
  };

  // Discrepancy (কম বা বেশি টাকা)
  // difference = actual present money - expected balance
  const discrepancy = manualCountedCash - summary.expectedTotalBalance;

  // 1-Click Auto-Reconciliation (কম বা বেশি স্বয়ংক্রিয়ভাবে মিলিয়ে নেওয়া)
  const handleAutoReconcile = () => {
    if (discrepancy === 0) {
      // Nothing to reconcile, just save the count
      handleSaveCount();
      return;
    }

    if (discrepancy < 0) {
      // Shortage / কম আছে: create adjustment type: 'out'
      const shortageAmount = Math.abs(discrepancy);
      onSaveCashAdjustment({
        id: `adj-reconcile-${Date.now()}`,
        type: 'out',
        channel: 'cash',
        amount: shortageAmount,
        date: new Date().toISOString(),
        reason: countNote.trim() || `ব্যালেন্সের ঘাটতি সমন্বয় / কম টাকা মিলিয়ে নেওয়া (ঘাটতি: ৳${shortageAmount})`,
      });

      onSaveCashCount({
        countedAmount: manualCountedCash,
        difference: 0,
        note: countNote.trim() || 'ঘাটতি সমন্বয় করে ব্যালেন্স মেলানো হয়েছে',
      });

      setToastMessage(`ব্যালেন্সের ৳${shortageAmount} ঘাটতি সমন্বয় করে ব্যালেন্স সফলভাবে মিলিয়ে নেওয়া হয়েছে!`);
    } else {
      // Surplus / বেশি আছে: create adjustment type: 'in'
      const surplusAmount = discrepancy;
      onSaveCashAdjustment({
        id: `adj-reconcile-${Date.now()}`,
        type: 'in',
        channel: 'cash',
        amount: surplusAmount,
        date: new Date().toISOString(),
        reason: countNote.trim() || `ব্যালেন্সের বাড়তি টাকা সমন্বয় / অতিরিক্ত জমা (বাড়তি: ৳${surplusAmount})`,
      });

      onSaveCashCount({
        countedAmount: manualCountedCash,
        difference: 0,
        note: countNote.trim() || 'বাড়তি টাকা যোগ করে ব্যালেন্স মেলানো হয়েছে',
      });

      setToastMessage(`বাড়তি ৳${surplusAmount} যোগ করে ব্যালেন্স সফলভাবে মিলিয়ে নেওয়া হয়েছে!`);
    }

    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save Cash Reconciliation Record without adjusting balance
  const handleSaveCount = () => {
    onSaveCashCount({
      countedAmount: manualCountedCash,
      difference: discrepancy,
      note: countNote.trim() || undefined,
    });
    setToastMessage('বর্তমান ব্যালেন্সের হিসাব সফলভাবে সংরক্ষণ করা হয়েছে!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Submit Balance In / Out Adjustment
  const handleAddAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjAmount <= 0) {
      alert('সঠিক টাকার পরিমাণ দিন');
      return;
    }
    if (!adjReason.trim()) {
      alert('জমা বা উত্তোলনের কারণ লিখুন');
      return;
    }

    onSaveCashAdjustment({
      id: `adj-${Date.now()}`,
      type: adjType,
      channel: 'cash',
      amount: adjAmount,
      date: new Date().toISOString(),
      reason: adjReason.trim(),
    });

    setAdjAmount(0);
    setAdjReason('');
    setIsAdjModalOpen(false);
    setToastMessage('ব্যালেন্স লেনদেন সফলভাবে সংরক্ষণ করা হয়েছে!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Unified recent ledger list
  const recentLedger = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      title: string;
      category: 'sale' | 'due_collection' | 'purchase' | 'supplier_due' | 'expense' | 'adj_in' | 'adj_out';
      amount: number;
      type: 'in' | 'out';
      note?: string;
    }> = [];

    // Orders
    filteredOrders.forEach((o) => {
      if ((o.paidAmount || 0) > 0) {
        list.push({
          id: `ord-${o.id}`,
          date: o.date,
          title: `বিক্রয় মেমো #${o.invoiceNumber}`,
          category: 'sale',
          amount: o.paidAmount,
          type: 'in',
          note: o.customerName ? `গ্রাহক: ${o.customerName}` : undefined,
        });
      }
    });

    // Customer Dues
    filteredDuePayments.forEach((dp) => {
      list.push({
        id: `dp-${dp.id}`,
        date: dp.date,
        title: `কাস্টমার বকেয়া আদায়`,
        category: 'due_collection',
        amount: dp.amount,
        type: 'in',
        note: dp.customerName ? `গ্রাহক: ${dp.customerName}` : undefined,
      });
    });

    // Purchases
    filteredPurchases.forEach((p) => {
      if ((p.paidAmount || 0) > 0) {
        list.push({
          id: `pur-${p.id}`,
          date: p.date,
          title: `মহাজনের চালান #${p.invoiceNumber}`,
          category: 'purchase',
          amount: p.paidAmount,
          type: 'out',
          note: `মহাজন: ${p.supplierName}`,
        });
      }
    });

    // Supplier Dues
    filteredSupplierDues.forEach((sd) => {
      list.push({
        id: `sd-${sd.id}`,
        date: sd.date,
        title: `মহাজনের বকেয়া পরিশোধ`,
        category: 'supplier_due',
        amount: sd.amount,
        type: 'out',
        note: `মহাজন: ${sd.supplierName}`,
      });
    });

    // Expenses
    filteredExpenses.forEach((e) => {
      list.push({
        id: `exp-${e.id}`,
        date: e.date,
        title: `দোকান খরচ: ${e.category}`,
        category: 'expense',
        amount: e.amount,
        type: 'out',
        note: e.note,
      });
    });

    // Adjustments
    filteredAdjustments.forEach((adj) => {
      list.push({
        id: adj.id,
        date: adj.date,
        title: adj.type === 'out' ? 'ব্যালেন্স উত্তোলন (-)' : 'ব্যালেন্স জমা (+)',
        category: adj.type === 'out' ? 'adj_out' : 'adj_in',
        amount: adj.amount,
        type: adj.type === 'out' ? 'out' : 'in',
        note: adj.reason,
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredOrders, filteredDuePayments, filteredPurchases, filteredSupplierDues, filteredExpenses, filteredAdjustments]);

  return (
    <div id="cash-balance-register-view" className="space-y-5">
      {/* Top Notification Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-md text-xs sm:text-sm font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Date Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              দোকানের মোট ব্যালেন্স ও হিসাব
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট কত টাকা থাকার কথা এবং বাস্তবে কত টাকা আছে তা সরাসরি এক জায়গায় দেখে মিলিয়ে রাখুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date Range Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'today', label: 'আজকের হিসাব' },
              { id: 'this_month', label: 'চলতি মাস' },
              { id: 'all', label: 'সর্বমোট ব্যালেন্স' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Balance In / Out Adjustment Button */}
          <button
            onClick={() => setIsAdjModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ব্যালেন্স জমা / উত্তোলন</span>
          </button>
        </div>
      </div>

      {/* UNIFIED HERO BALANCE METRICS (এক নজরে মোট ব্যালেন্স) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Main Total Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
              <Wallet className="w-4 h-4" />
              বর্তমান মোট ব্যালেন্স (হাতে ও একাউন্টে থাকার কথা)
            </span>
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
              মোট তহবিল
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight text-white flex items-baseline gap-2">
            <span>{formatCurrency(summary.expectedTotalBalance)}</span>
            {dateRange !== 'all' && (
              <span className="text-xs text-slate-400 font-normal">({dateRange === 'today' ? 'আজকের নেট' : 'চলতি মাসের নেট'})</span>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-xs flex flex-wrap justify-between gap-2 text-slate-300">
            <span className="text-emerald-400 font-semibold">
              মোট জমা: +{formatCurrency(summary.totalInflow)}
            </span>
            <span className="text-rose-400 font-semibold">
              মোট খরচ ও পরিশোধ: -{formatCurrency(summary.totalOutflow)}
            </span>
          </div>
        </div>

        {/* 2. Total Inflow (মোট সংগৃহীত টাকা) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              মোট সংগৃহীত টাকা (ইনফ্লো)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-2">
              +{formatCurrency(summary.totalInflow)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between"><span>বিক্রি থেকে:</span><b>+{formatCurrency(summary.salesPaid)}</b></div>
            <div className="flex justify-between"><span>বাকি আদায়:</span><b>+{formatCurrency(summary.customerDuePaid)}</b></div>
            {summary.adjustmentsIn > 0 && (
              <div className="flex justify-between text-emerald-700"><span>অতিরিক্ত জমা:</span><b>+{formatCurrency(summary.adjustmentsIn)}</b></div>
            )}
          </div>
        </div>

        {/* 3. Total Outflow (মোট পরিশোধ ও ব্যয়) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              মোট খরচ ও পরিশোধ (আউটফ্লো)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-2">
              -{formatCurrency(summary.totalOutflow)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between"><span>মাল ক্রয় বিল:</span><b>-{formatCurrency(summary.purchasesPaid)}</b></div>
            <div className="flex justify-between"><span>মহাজনকে দেওয়া:</span><b>-{formatCurrency(summary.supplierDuesPaid)}</b></div>
            <div className="flex justify-between"><span>দোকান খরচ:</span><b>-{formatCurrency(summary.expensesPaid)}</b></div>
          </div>
        </div>
      </div>

      {/* BALANCE RECONCILIATION & AUTO-ADJUST (বাস্তবে কত আছে এবং কম থাকলে মিলিয়ে নেওয়া) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                ব্যালেন্স মিলানো ও তাৎক্ষণিক সমন্বয় (Balance Reconciliation)
              </h3>
              <p className="text-xs text-slate-400">
                বাস্তবে আপনার কাছে মোট কত টাকা আছে তা লিখুন। কম বা বেশি থাকলে ১-ক্লিকেই হিসাব মিলিয়ে নিতে পারবেন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDenomCalculator(!showDenomCalculator)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              {showDenomCalculator ? 'নোট গণক বন্ধ করুন' : 'কাগজের নোট গণক'}
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Expected Balance Summary */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              সফটওয়্যার হিসাব অনুযায়ী থাকার কথা:
            </span>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-emerald-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  মোট বিক্রয় থেকে জমা:
                </span>
                <span className="font-bold">+{formatCurrency(summary.salesPaid)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  কাস্টমারদের বকেয়া আদায়:
                </span>
                <span className="font-bold">+{formatCurrency(summary.customerDuePaid)}</span>
              </div>

              {summary.adjustmentsIn > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ব্যালেন্সে অতিরিক্ত জমা:
                  </span>
                  <span className="font-bold">+{formatCurrency(summary.adjustmentsIn)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-rose-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  মহাজনের মাল ক্রয়ে পরিশোধ:
                </span>
                <span className="font-bold">-{formatCurrency(summary.purchasesPaid)}</span>
              </div>

              {summary.supplierDuesPaid > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    মহাজনের বকেয়া পরিশোধ:
                  </span>
                  <span className="font-bold">-{formatCurrency(summary.supplierDuesPaid)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-rose-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  দোকানের দৈনন্দিন খরচ:
                </span>
                <span className="font-bold">-{formatCurrency(summary.expensesPaid)}</span>
              </div>

              {summary.adjustmentsOut > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    ব্যালেন্স উত্তোলন / সমন্বয়:
                  </span>
                  <span className="font-bold">-{formatCurrency(summary.adjustmentsOut)}</span>
                </div>
              )}

              <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center text-slate-900 font-bold text-sm sm:text-base">
                <span>মোট থাকার কথা:</span>
                <span className="text-emerald-700 font-extrabold text-lg">
                  {formatCurrency(summary.expectedTotalBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actual Total Count & 1-Click Reconcile */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              বাস্তবে মোট কত টাকা আছে (Physical & Account Total):
            </span>

            {/* Optional Physical Notes Counter */}
            {showDenomCalculator && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    কাগজের নোট গণক (ঐচ্ছিক):
                  </span>
                  <span className="text-xs text-indigo-700 font-bold">
                    মোট: {formatCurrency(denomTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {[1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map((val) => (
                    <div key={val} className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">
                        ৳{val} এর নোট:
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={denominations[val] || ''}
                        onChange={(e) => handleDenomChange(val, parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-center font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block text-center mt-0.5">
                        = ৳{(denominations[val] || 0) * val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actual Money Input */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  বাস্তবে আপনার কাছে মোট কত টাকা আছে (টাকা):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                  <MoneyInput
                    id="input-manual-counted-cash"
                    value={manualCountedCash}
                    onChange={(val) => setManualCountedCash(val)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-extrabold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 ক্যাশবাক্স, ড্রয়ার কিংবা একাউন্ট মিলিয়ে আপনার কাছে বাস্তবে মোট কত টাকা আছে তা এখানে লিখুন।
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={countNote}
                  onChange={(e) => setCountNote(e.target.value)}
                  placeholder="মন্তব্য (ঐচ্ছিক, যেমন: আজকের ব্যালেন্স মেলানো হয়েছে)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Discrepancy & Reconciliation Action Box */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                discrepancy === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : discrepancy < 0
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-indigo-50 border-indigo-300 text-indigo-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {discrepancy === 0 ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${discrepancy < 0 ? 'text-rose-600' : 'text-indigo-600'}`} />
                    )}
                    <div>
                      <h4 className="font-bold text-sm sm:text-base">
                        {discrepancy === 0
                          ? 'আলহামদুলিল্লাহ! আপনার মোট ব্যালেন্স ও হিসেব ১০০% নির্ভুলভাবে মিলেছে।'
                          : discrepancy < 0
                          ? `ব্যালেন্সে ৳${Math.abs(discrepancy)} কম (ঘাটতি) রয়েছে!`
                          : `ব্যালেন্সে ৳${discrepancy} অতিরিক্ত (বাড়তি টাকা) রয়েছে!`}
                      </h4>
                      <p className="text-xs opacity-80 mt-1">
                        হিসাব অনুযায়ী থাকার কথা: <b>৳{summary.expectedTotalBalance}</b> • বাস্তবে গুনে পাওয়া গেছে: <b>৳{manualCountedCash}</b>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1-Click Action Buttons */}
                <div className="pt-2 border-t border-current/10 flex flex-wrap items-center justify-end gap-2">
                  {discrepancy !== 0 && (
                    <button
                      type="button"
                      onClick={handleAutoReconcile}
                      className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 ${
                        discrepancy < 0
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      title="পার্থক্য স্বয়ংক্রিয়ভাবে ব্যালেন্সে সমন্বয় করুন"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {discrepancy < 0 
                          ? `⚡ ৳${Math.abs(discrepancy)} ঘাটতি সমন্বয় করে ব্যালেন্স মিলিয়ে নিন` 
                          : `⚡ ৳${discrepancy} বাড়তি টাকা যোগ করে মিলিয়ে নিন`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveCount}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    হিসাব সংরক্ষণ করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* UNIFIED TRANSACTION & BALANCE HISTORY (সর্বশেষ লেনদেন ও ব্যালেন্স হিস্ট্রি) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">
              সর্বশেষ লেনদেন ও ব্যালেন্স হিস্ট্রি
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            মোট রেকর্ড: {toBanglaNumber(recentLedger.length)} টি
          </span>
        </div>

        {recentLedger.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            এই সময়ের মধ্যে কোনো লেনদেন পাওয়া যায়নি
          </div>
        ) : (
          <>
            {/* Mobile Cards View (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100">
              {recentLedger.slice(0, 30).map((item) => (
                <div key={item.id} className="p-3 space-y-1.5 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(item.date)}</p>
                    </div>
                    <span className={`text-xs font-black shrink-0 ${
                      item.type === 'in' ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {item.type === 'in' ? '+' : '-'}{formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="truncate max-w-[180px]">{item.note || '—'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      item.type === 'in'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.type === 'in' ? 'জমা (+)' : 'খরচ / পরিশোধ (-)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3 text-left">তারিখ ও সময়</th>
                    <th className="py-2.5 px-3 text-left">বিবরণ / খাত</th>
                    <th className="py-2.5 px-3 text-left">মন্তব্য</th>
                    <th className="py-2.5 px-3 text-center">লেনদেনের ধরণ</th>
                    <th className="py-2.5 px-3 text-right">টাকার পরিমাণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLedger.slice(0, 30).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {item.note || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.type === 'in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.type === 'in' ? 'জমা (+)' : 'ব্যয় / পরিশোধ (-)'}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-extrabold ${
                        item.type === 'in' ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {item.type === 'in' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Balance Adjustment Modal (জমা বা উত্তোলন) - NO CHANNEL REQUIRED */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 border border-slate-200 space-y-4 animate-fadeIn">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
              <span>ব্যালেন্স জমা / উত্তোলন এন্ট্রি</span>
            </h3>

            <form onSubmit={handleAddAdjustment} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">লেনদেনের ধরণ:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'in', label: 'ব্যালেন্সে জমা (+)' },
                    { id: 'out', label: 'উত্তোলন (-)' },
                    { id: 'opening', label: 'প্রারম্ভিক মূলধন' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAdjType(t.id as any)}
                      className={`py-2 px-2 rounded-lg font-bold text-xs border transition cursor-pointer ${
                        adjType === t.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳) *</label>
                <MoneyInput
                  id="input-adj-amount"
                  value={adjAmount}
                  onChange={setAdjAmount}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">কারণ বা বিবরণ *</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="যেমন: অতিরিক্ত মূলধন জমা বা ব্যক্তিগত প্রয়োজনে উত্তোলন"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
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
