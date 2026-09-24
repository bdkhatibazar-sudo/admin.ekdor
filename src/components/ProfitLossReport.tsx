import React, { useState, useMemo } from 'react';
import { Order, Expense, Product } from '../types';
import { formatCurrency, formatDate, toBanglaNumber } from '../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart,
  BarChart3,
  CheckCircle2,
  Clock,
  CalendarDays
} from 'lucide-react';

interface ProfitLossReportProps {
  orders: Order[];
  expenses: Expense[];
  products: Product[];
  storeName: string;
}

type PeriodType = 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'last_month' | 'all' | 'custom_date';

export const ProfitLossReport: React.FC<ProfitLossReportProps> = ({
  orders,
  expenses,
  products,
  storeName,
}) => {
  const [period, setPeriod] = useState<PeriodType>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Date Range calculation based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === 'yesterday') {
      const yesterday = new Date(now.getTime() - 86400000);
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    } else if (period === 'last_7_days') {
      start = new Date(now.getTime() - 7 * 86400000);
      end = now;
    } else if (period === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'custom_date') {
      const cd = new Date(customDate);
      start = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate(), 0, 0, 0);
      end = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate(), 23, 59, 59);
    } else {
      start = new Date(2020, 0, 1);
      end = new Date(2030, 11, 31);
    }

    return { start, end };
  }, [period, customDate]);

  // Filtered Orders & Expenses for the active period
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.date);
      return d >= dateRange.start && d <= dateRange.end && o.status !== 'cancelled';
    });
  }, [orders, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [expenses, dateRange]);

  // Helper function to calculate financials for any set of orders & expenses
  const calculateFinancials = (orderList: Order[], expenseList: Expense[]) => {
    const totalSales = orderList.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalPaid = orderList.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalDue = orderList.reduce((sum, o) => sum + o.dueAmount, 0);

    let totalCOGS = 0;
    orderList.forEach((order) => {
      order.items.forEach((item) => {
        const itemCOGS = (item.purchasePrice || 0) * item.quantity;
        totalCOGS += itemCOGS;
      });
    });

    const grossProfit = totalSales - totalCOGS;
    const totalExpenses = expenseList.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0';

    return {
      orderCount: orderList.length,
      totalSales,
      totalPaid,
      totalDue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      profitMargin,
    };
  };

  // Active Period Financials
  const reportData = useMemo(() => {
    return calculateFinancials(filteredOrders, filteredExpenses);
  }, [filteredOrders, filteredExpenses]);

  // Today's Dedicated Financials (always calculated)
  const todayFinancials = useMemo(() => {
    const now = new Date();
    const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const tEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayOrders = orders.filter((o) => {
      const d = new Date(o.date);
      return d >= tStart && d <= tEnd && o.status !== 'cancelled';
    });
    const todayExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= tStart && d <= tEnd;
    });

    return calculateFinancials(todayOrders, todayExpenses);
  }, [orders, expenses]);

  // Day-by-Day Daily Profit breakdown (last 14 days or current month)
  const dailyProfitTable = useMemo(() => {
    // Collect unique dates from orders and expenses
    const daysMap = new Map<string, { orders: Order[]; expenses: Expense[] }>();

    // Seed with last 14 days
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const dayDate = new Date(now.getTime() - i * 86400000);
      const key = dayDate.toISOString().slice(0, 10);
      daysMap.set(key, { orders: [], expenses: [] });
    }

    orders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const key = o.date.slice(0, 10);
      if (!daysMap.has(key)) {
        daysMap.set(key, { orders: [], expenses: [] });
      }
      daysMap.get(key)!.orders.push(o);
    });

    expenses.forEach((e) => {
      const key = e.date.slice(0, 10);
      if (!daysMap.has(key)) {
        daysMap.set(key, { orders: [], expenses: [] });
      }
      daysMap.get(key)!.expenses.push(e);
    });

    // Convert map to array and calculate metrics per day
    const rows = Array.from(daysMap.entries()).map(([dateStr, data]) => {
      const fin = calculateFinancials(data.orders, data.expenses);
      return {
        dateStr,
        ...fin,
      };
    });

    // Sort descending by date
    rows.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    return rows.slice(0, 15); // Show latest 15 days
  }, [orders, expenses]);

  // Expense breakdown by category for active period
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const cur = map.get(e.category) || 0;
      map.set(e.category, cur + e.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="profit-loss-view" className="space-y-4">
      {/* TODAY'S PROFIT HIGHLIGHT BANNER (User Request: "দৈনিক কত লাভ হল ওটা দেখার ব্যবস্থা করুন") */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-600/30">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-[11px] font-bold text-emerald-200">
                আজকের দিনের হিসাব
              </span>
              <span className="text-xs text-emerald-200 font-medium">
                {formatDate(new Date().toISOString())}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 flex items-center gap-2">
              <span>আজকে মোট লাভ হয়েছে:</span>
              <span className={todayFinancials.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {formatCurrency(todayFinancials.netProfit)}
              </span>
            </h2>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              বিক্রয় ৳{todayFinancials.totalSales} — পণ্যের ক্রয়মূল্য ৳{todayFinancials.totalCOGS} — দোকান খরচ ৳{todayFinancials.totalExpenses}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === 'today'
                  ? 'bg-white text-emerald-900 shadow-md'
                  : 'bg-emerald-600/50 hover:bg-emerald-600 text-white'
              }`}
            >
              আজকের বিস্তারিত দেখুন
            </button>
          </div>
        </div>

        {/* 4 Mini Cards for Today */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-emerald-500/30 text-xs">
          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
            <span className="text-[11px] text-emerald-200 block">আজকের বিক্রি</span>
            <span className="font-bold text-base text-white">{formatCurrency(todayFinancials.totalSales)}</span>
            <span className="text-[10px] text-emerald-200/80 block">{toBanglaNumber(todayFinancials.orderCount)} টি অর্ডারে</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
            <span className="text-[11px] text-emerald-200 block">পণ্যের কেনা দর (COGS)</span>
            <span className="font-bold text-base text-white">{formatCurrency(todayFinancials.totalCOGS)}</span>
            <span className="text-[10px] text-emerald-200/80 block">আসল পণ্যের ক্রয় খরচ</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
            <span className="text-[11px] text-emerald-200 block">আজকের দোকান খরচ</span>
            <span className="font-bold text-base text-rose-300">{formatCurrency(todayFinancials.totalExpenses)}</span>
            <span className="text-[10px] text-emerald-200/80 block">ভাড়া, বেতন ও খরচাদি</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
            <span className="text-[11px] text-emerald-200 block">আজকের নিট লাভ মার্জিন</span>
            <span className="font-bold text-base text-emerald-300">{todayFinancials.profitMargin}%</span>
            <span className="text-[10px] text-emerald-200/80 block">বিক্রির তুলনায় লাভ হার</span>
          </div>
        </div>
      </div>

      {/* Header & Filter Controls */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>সময়ভিত্তিক ও দৈনিক লাভ-ক্ষতির বিশ্লেষণ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            যে কোনো দিন, সপ্তাহ বা মাসের আয়-ব্যয় এবং নিট লাভ দেখতে ফিল্টার নির্বাচন করুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold overflow-x-auto scrollbar-none">
            {[
              { id: 'today', label: 'আজকের দিন' },
              { id: 'yesterday', label: 'গতকাল' },
              { id: 'last_7_days', label: 'বিগত ৭ দিন' },
              { id: 'this_month', label: 'চলতি মাস' },
              { id: 'last_month', label: 'গত মাস' },
              { id: 'custom_date', label: 'নির্দিষ্ট তারিখ' },
              { id: 'all', label: 'সব সময়' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  period === p.id
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Input if selected */}
          {period === 'custom_date' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
            />
          )}

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Main Selected Period Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Sales */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">নির্বাচিত সময়ের মোট বিক্রয়</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatCurrency(reportData.totalSales)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>অর্ডার: {toBanglaNumber(reportData.orderCount)} টি</span>
            <span className="text-emerald-700 font-semibold">আদায়: {formatCurrency(reportData.totalPaid)}</span>
          </div>
        </div>

        {/* 2. Cost of Goods (COGS) */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">পণ্যের ক্রয়মূল্য (COGS)</span>
            <ArrowDownRight className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatCurrency(reportData.totalCOGS)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>মোট ক্রয় দর</span>
            <span className="text-slate-700 font-medium">আসল পণ্যের খরচ</span>
          </div>
        </div>

        {/* 3. Shop Expenses */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">দোকানের পরিচালনা খরচ</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-600">
            {formatCurrency(reportData.totalExpenses)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>ভাড়া, বেতন ও বিল</span>
            <span className="text-rose-600 font-medium">{filteredExpenses.length} টি ভাউচার</span>
          </div>
        </div>

        {/* 4. Net Profit */}
        <div className={`p-4 rounded-xl shadow-xs border ${
          reportData.netProfit >= 0 
            ? 'bg-emerald-50/80 border-emerald-300' 
            : 'bg-rose-50/80 border-rose-300'
        }`}>
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-xs font-bold">প্রকৃত নিট লাভ (Net Profit)</span>
            {reportData.netProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-700" />
            )}
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${
            reportData.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
          }`}>
            {formatCurrency(reportData.netProfit)}
          </p>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mt-2 pt-2 border-t border-slate-200">
            <span>লাভের মার্জিন:</span>
            <span className={reportData.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
              {reportData.profitMargin}%
            </span>
          </div>
        </div>
      </div>

      {/* DAY-BY-DAY DAILY PROFIT BREAKDOWN TABLE */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span>দৈনিক কত লাভ হল (প্রতিদিনের লাভ-ক্ষতির তালিকা)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              গত ১৫ দিনের তারিখভিত্তিক বিক্রয়, কেনা খরচ, দোকান খরচ ও নিট লাভের পূর্ণাঙ্গ টেবিল
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
            দৈনিক লাভ = বিক্রয় - ক্রয়মূল্য - দোকান খরচ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-[11px] font-bold uppercase">
                <th className="py-2.5 px-3">তারিখ (দিন)</th>
                <th className="py-2.5 px-3 text-center">অর্ডার সংখ্যা</th>
                <th className="py-2.5 px-3 text-right">মোট বিক্রি (Revenue)</th>
                <th className="py-2.5 px-3 text-right">পণ্যের ক্রয়মূল্য (COGS)</th>
                <th className="py-2.5 px-3 text-right">দোকান খরচ (Expense)</th>
                <th className="py-2.5 px-3 text-right">দৈনিক নিট লাভ (Profit)</th>
                <th className="py-2.5 px-3 text-center">মার্জিন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyProfitTable.map((row) => {
                const isToday = row.dateStr === new Date().toISOString().slice(0, 10);
                return (
                  <tr 
                    key={row.dateStr}
                    className={`transition-colors ${
                      isToday ? 'bg-emerald-50/40 font-semibold' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{formatDate(row.dateStr)}</span>
                        {isToday && (
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                            আজ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {toBanglaNumber(row.orderCount)} টি
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {formatCurrency(row.totalSales)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {formatCurrency(row.totalCOGS)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600">
                      {row.totalExpenses > 0 ? formatCurrency(row.totalExpenses) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={row.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {formatCurrency(row.netProfit)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                        row.netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {row.profitMargin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accounting Statement Table (Print Friendly) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              লাভ-ক্ষতির বিস্তারিত বিবরণী (Profit & Loss Statement)
            </h3>
            <p className="text-xs text-slate-500">
              প্রতিষ্ঠান: {storeName} | সময়কাল: {formatDate(dateRange.start.toISOString())} হতে {formatDate(dateRange.end.toISOString())} পর্যন্ত
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          {/* Section 1: Sales Income */}
          <div className="bg-slate-50 p-3 rounded-lg space-y-1.5">
            <div className="flex justify-between font-bold text-slate-900 text-sm">
              <span>(ক) মোট বিক্রয় রাজস্ব (Sales Revenue)</span>
              <span>{formatCurrency(reportData.totalSales)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pl-4 text-xs">
              <span>বিক্রয় থেকে নগদ ও অনলাইন আদায়:</span>
              <span>{formatCurrency(reportData.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pl-4 text-xs">
              <span>বিক্রয় বাকি (পরিশোধ বকেয়া):</span>
              <span>{formatCurrency(reportData.totalDue)}</span>
            </div>
          </div>

          {/* Section 2: Cost of Goods Sold */}
          <div className="bg-slate-50 p-3 rounded-lg space-y-1.5">
            <div className="flex justify-between font-bold text-slate-900 text-sm">
              <span>(খ) বিক্রিত পণ্যের মোট ক্রয়মূল্য (COGS)</span>
              <span>- {formatCurrency(reportData.totalCOGS)}</span>
            </div>
            <p className="text-slate-500 pl-4 text-xs">
              যে পণ্যগুলো বিক্রি হয়েছে তাদের প্রকৃত ক্রয় দর (সরাসরি খরচ)
            </p>
          </div>

          {/* Section 3: Gross Profit */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex justify-between font-bold text-emerald-900">
            <span>(গ) মোট ব্যবসায়িক লাভ / Gross Profit (ক - খ)</span>
            <span>{formatCurrency(reportData.grossProfit)}</span>
          </div>

          {/* Section 4: Operating Expenses (Rent, Salary, etc.) */}
          <div className="bg-slate-50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between font-bold text-slate-900 text-sm">
              <span>(ঘ) দোকান পরিচালনা খরচ (Operating Expenses)</span>
              <span className="text-rose-600">- {formatCurrency(reportData.totalExpenses)}</span>
            </div>

            {expenseByCategory.length > 0 ? (
              <div className="pl-4 space-y-1 pt-1 border-t border-slate-200/60 text-xs text-slate-600">
                {expenseByCategory.map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between">
                    <span>• {cat}:</span>
                    <span className="font-semibold">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 pl-4 text-xs">এই সময়কালে কোনো দোকান খরচ নেই</p>
            )}
          </div>

          {/* Section 5: Net Profit */}
          <div className={`p-4 rounded-xl border flex items-center justify-between text-base font-bold ${
            reportData.netProfit >= 0
              ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
              : 'bg-rose-100/70 text-rose-900 border-rose-300'
          }`}>
            <div>
              <span>(ঙ) প্রকৃত নিট লাভ / ক্ষতি (Net Profit) (গ - ঘ)</span>
              <p className="text-xs font-normal text-slate-600 mt-0.5">
                সকল পণ্যের খরচ, দোকান ভাড়া, বেতন ও অন্যান্য ব্যয় পরিশোধের পর মালিকের চূড়ান্ত লাভ
              </p>
            </div>
            <span className="text-xl sm:text-2xl">
              {formatCurrency(reportData.netProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
