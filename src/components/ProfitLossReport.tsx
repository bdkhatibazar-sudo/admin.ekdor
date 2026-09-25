import React, { useState, useMemo } from 'react';
import { Order, Expense, Product } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Printer,
  DollarSign,
  PieChart,
  ShoppingBag,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';

interface ProfitLossReportProps {
  orders: Order[];
  expenses: Expense[];
  products: Product[];
  storeName: string;
}

export const ProfitLossReport: React.FC<ProfitLossReportProps> = ({
  orders,
  expenses,
  products,
  storeName,
}) => {
  const [timeRange, setTimeRange] = useState<'today' | 'this_week' | 'this_month' | 'all'>('this_month');

  // Filter helper
  const isWithinRange = (dateStr: string) => {
    if (timeRange === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();

    if (timeRange === 'today') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }

    if (timeRange === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return date >= startOfWeek;
    }

    if (timeRange === 'this_month') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }

    return true;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelled' && isWithinRange(o.date));
  }, [orders, timeRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isWithinRange(e.date));
  }, [expenses, timeRange]);

  // Product price lookup
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.id, p.purchasePrice || 0));
    return map;
  }, [products]);

  // Calculations
  const report = useMemo(() => {
    let totalSales = 0;
    let totalCOGS = 0;
    let totalCashCollected = 0;
    let totalDueFromPeriod = 0;

    filteredOrders.forEach((o) => {
      totalSales += o.grandTotal;
      totalCashCollected += o.paidAmount || 0;
      totalDueFromPeriod += o.dueAmount || 0;

      o.items.forEach((it) => {
        const cost = it.purchasePrice !== undefined ? it.purchasePrice : (productCostMap.get(it.productId) || 0);
        totalCOGS += cost * it.quantity;
      });
    });

    const grossProfit = totalSales - totalCOGS;
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // Expenses by category
    const expenseByCategory: { [cat: string]: number } = {};
    filteredExpenses.forEach((e) => {
      const cat = e.category || 'সাধারণ খরচ';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });

    return {
      totalSales,
      totalCOGS,
      grossProfit,
      grossMargin,
      totalExpenses,
      netProfit,
      netMargin,
      totalCashCollected,
      totalDueFromPeriod,
      orderCount: filteredOrders.length,
      expenseByCategory,
    };
  }, [filteredOrders, filteredExpenses, productCostMap]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Top Banner & Range Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">লাভ ও ক্ষতির পূর্ণাঙ্গ রিপোর্ট</h2>
            <p className="text-xs text-slate-500">{storeName} • হিসাব বিবরণী</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'today', label: 'আজকের' },
              { id: 'this_week', label: 'চলতি সপ্তাহ' },
              { id: 'this_month', label: 'চলতি মাস' },
              { id: 'all', label: 'সব সময়' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">প্রিন্ট রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">মোট বিক্রয় (Sales)</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block mt-1">
            {formatCurrency(report.totalSales)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {report.orderCount}টি সফল চালান
          </span>
        </div>

        {/* COGS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">মাল ক্রয় খরচ (COGS)</span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 block mt-1">
            {formatCurrency(report.totalCOGS)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">বিক্রিত পণ্যের আসল দর</span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">মোট লাভ (Gross)</span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
              {report.grossMargin.toFixed(1)}%
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block mt-1">
            {formatCurrency(report.grossProfit)}
          </span>
          <span className="text-[11px] text-emerald-600 mt-1 block">বিক্রি বিয়োগ মাল খরচ</span>
        </div>

        {/* Net Profit */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            report.netProfit >= 0
              ? 'bg-teal-50 border-teal-200 text-teal-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">নিট লাভ (Net Profit)</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                report.netProfit >= 0 ? 'bg-teal-200 text-teal-900' : 'bg-rose-200 text-rose-900'
              }`}
            >
              {report.netMargin.toFixed(1)}%
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black block mt-1">
            {formatCurrency(report.netProfit)}
          </span>
          <span className="text-[11px] opacity-75 mt-1 block">সব দোকান খরচ বাদে নিট লাভ</span>
        </div>
      </div>

      {/* Financial Statement Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income Statement Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>লাভ-ক্ষতি বিবরণী (P&L Statement)</span>
            <span className="text-xs font-normal text-slate-400">
              {timeRange === 'today'
                ? 'আজকের'
                : timeRange === 'this_week'
                ? 'চলতি সপ্তাহ'
                : timeRange === 'this_month'
                ? 'চলতি মাস'
                : 'সর্বকালীন'}
            </span>
          </h3>

          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-700">১. মোট পণ্য বিক্রয় (Gross Sales):</span>
              <span className="font-bold text-slate-900">{formatCurrency(report.totalSales)}</span>
            </div>

            <div className="flex justify-between py-1 text-slate-600">
              <span>(বাদ) বিক্রিত পণ্যের মূল ক্রয়মূল্য (COGS):</span>
              <span className="font-semibold text-rose-600">-{formatCurrency(report.totalCOGS)}</span>
            </div>

            <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-emerald-800 bg-emerald-50/50 p-2 rounded-xl">
              <span>গ্রস লাভ (Gross Profit):</span>
              <span>{formatCurrency(report.grossProfit)}</span>
            </div>

            <div className="flex justify-between py-1 text-slate-600">
              <span>(বাদ) মোট দোকান পরিচালন খরচ (Expenses):</span>
              <span className="font-semibold text-rose-600">-{formatCurrency(report.totalExpenses)}</span>
            </div>

            <div
              className={`border-t border-slate-200 pt-3 flex justify-between font-black text-base p-3 rounded-xl ${
                report.netProfit >= 0 ? 'bg-teal-50 text-teal-900' : 'bg-rose-50 text-rose-900'
              }`}
            >
              <span>চূড়ান্ত নিট লাভ / ক্ষতি (Net Profit):</span>
              <span>{formatCurrency(report.netProfit)}</span>
            </div>
          </div>
        </div>

        {/* Operating Expenses Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>দোকান খরচের খাতওয়ারি বিবরণ</span>
            <span className="text-xs font-bold text-rose-600">
              মোট: {formatCurrency(report.totalExpenses)}
            </span>
          </h3>

          <div className="space-y-2">
            {Object.entries(report.expenseByCategory).map(([cat, amt]) => {
              const pct = report.totalExpenses > 0 ? (amt / report.totalExpenses) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{cat}</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(amt)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {Object.keys(report.expenseByCategory).length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                নির্বাচিত সময়সীমার মধ্যে কোনো খরচ রেকর্ড করা হয়নি।
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
