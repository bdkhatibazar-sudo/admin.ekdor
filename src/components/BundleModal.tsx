import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductBundle, BundleItem } from '../types';
import { formatCurrency } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import {
  X,
  Plus,
  Trash2,
  Package,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Info
} from 'lucide-react';

interface BundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundleToEdit?: ProductBundle | null;
  products: Product[];
  onSaveBundle: (bundle: ProductBundle) => void;
}

export const BundleModal: React.FC<BundleModalProps> = ({
  isOpen,
  onClose,
  bundleToEdit,
  products,
  onSaveBundle,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('হিজামা প্যাকেজ');
  const [description, setDescription] = useState('');
  const [bundlePrice, setBundlePrice] = useState<number>(0);
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState<number>(130);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form when modal opens or bundleToEdit changes
  useEffect(() => {
    if (bundleToEdit) {
      setName(bundleToEdit.name);
      setCategory(bundleToEdit.category || 'হিজামা প্যাকেজ');
      setDescription(bundleToEdit.description || '');
      setBundlePrice(bundleToEdit.bundlePrice);
      setDefaultDeliveryCharge(bundleToEdit.defaultDeliveryCharge ?? 130);
      setItems(bundleToEdit.items.map((it) => ({ ...it })));
    } else {
      setName('');
      setCategory('হিজামা প্যাকেজ');
      setDescription('');
      setBundlePrice(0);
      setDefaultDeliveryCharge(130);
      setItems([]);
    }
    setErrorMessage(null);
    setSelectedProductIdToAdd('');
  }, [bundleToEdit, isOpen]);

  // Calculations
  const regularTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.originalSellingPrice || 0) * (it.quantity || 1), 0);
  }, [items]);

  const itemsAssignedTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.bundleSellingPrice || 0) * (it.quantity || 1), 0);
  }, [items]);

  // Total cost / purchase price of all items in bundle
  const totalPurchaseCost = useMemo(() => {
    return items.reduce((sum, it) => {
      const prod = products.find((p) => p.id === it.productId);
      const purchasePrice = prod ? prod.purchasePrice : 0;
      return sum + purchasePrice * (it.quantity || 1);
    }, 0);
  }, [items, products]);

  // Expected Net Profit
  const bundleProfit = useMemo(() => {
    return Math.round(bundlePrice - totalPurchaseCost);
  }, [bundlePrice, totalPurchaseCost]);

  // Profit Margin Percentage
  const profitMarginPercent = useMemo(() => {
    if (bundlePrice <= 0) return '0.0';
    return ((bundleProfit / bundlePrice) * 100).toFixed(1);
  }, [bundleProfit, bundlePrice]);

  const priceDiscrepancy = useMemo(() => {
    return Math.round(itemsAssignedTotal - bundlePrice);
  }, [itemsAssignedTotal, bundlePrice]);

  const savingsAmount = useMemo(() => {
    return Math.round(regularTotal - bundlePrice);
  }, [regularTotal, bundlePrice]);

  const savingsPercent = useMemo(() => {
    if (regularTotal <= 0) return 0;
    return ((savingsAmount / regularTotal) * 100).toFixed(1);
  }, [regularTotal, savingsAmount]);

  // Max producible bundle stock from constituent inventory
  const bundleStockInfo = useMemo<{
    count: number;
    bottleneckItem: { name: string; stock: number; required: number } | null;
  }>(() => {
    if (items.length === 0) return { count: 0, bottleneckItem: null };
    let minSets = Infinity;
    let bottleneck: { name: string; stock: number; required: number } | null = null;

    items.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const stock = prod ? prod.stockQty : 0;
      const setsPossible = it.quantity > 0 ? Math.floor(stock / it.quantity) : 0;
      if (setsPossible < minSets) {
        minSets = setsPossible;
        bottleneck = {
          name: it.productName,
          stock,
          required: it.quantity,
        };
      }
    });

    return {
      count: minSets === Infinity ? 0 : Math.max(0, minSets),
      bottleneckItem: bottleneck,
    };
  }, [items, products]);

  if (!isOpen) return null;

  // Add a product to bundle items
  const handleAddItem = (productId: string) => {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    // Check if already in bundle
    const existingIndex = items.findIndex((i) => i.productId === productId);
    if (existingIndex >= 0) {
      // Increase quantity
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex
            ? { ...it, quantity: it.quantity + 1 }
            : it
        )
      );
    } else {
      const newItem: BundleItem = {
        productId: prod.id,
        productName: prod.name,
        originalSellingPrice: prod.sellingPrice,
        bundleSellingPrice: prod.sellingPrice,
        quantity: 1,
        unit: prod.unit || 'পিস',
      };
      setItems((prev) => [...prev, newItem]);
    }

    setSelectedProductIdToAdd('');
  };

  const handleUpdateItem = (index: number, updates: Partial<BundleItem>) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, ...updates } : it))
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Auto-distribute the declared bundle price proportionally among items
  const handleAutoDistribute = () => {
    if (items.length === 0 || bundlePrice <= 0) return;

    // Sum of regular prices as weight
    const totalWeight = items.reduce(
      (sum, it) => sum + (it.originalSellingPrice || 1) * (it.quantity || 1),
      0
    );

    if (totalWeight <= 0) return;

    let distributedSum = 0;
    const updated = items.map((it, idx) => {
      if (idx === items.length - 1) {
        // Last item absorbs any rounding remainder
        const remainingForTotal = bundlePrice - distributedSum;
        const itemPrice = Math.max(0, Math.round(remainingForTotal / (it.quantity || 1)));
        return {
          ...it,
          bundleSellingPrice: itemPrice,
        };
      } else {
        const itemWeight = (it.originalSellingPrice || 1) * (it.quantity || 1);
        const ratio = itemWeight / totalWeight;
        const allocatedTotal = Math.round(bundlePrice * ratio);
        distributedSum += allocatedTotal;
        const itemPrice = Math.max(0, Math.round(allocatedTotal / (it.quantity || 1)));
        return {
          ...it,
          bundleSellingPrice: itemPrice,
        };
      }
    });

    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('অনুগ্রহ করে বান্ডেলের একটি সুন্দর নাম লিখুন (যেমন: হিজামা ৩২ কাপ ফুল সেট)');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('বান্ডেলে কমপক্ষে একটি বা একাধিক পণ্য যুক্ত করুন');
      return;
    }
    if (bundlePrice <= 0) {
      setErrorMessage('অনুগ্রহ করে বান্ডেলের মোট বিক্রয়মূল্য নির্ধারণ করুন');
      return;
    }

    if (bundlePrice < totalPurchaseCost) {
      const loss = totalPurchaseCost - bundlePrice;
      const isConfirmed = window.confirm(
        `সতর্কতা: ঘোষিত বান্ডেল বিক্রয় দর (৳${bundlePrice}) উপাদানগুলোর মোট ক্রয়মূল্য (৳${totalPurchaseCost}) এর চেয়ে কম!\n\nপ্রতিটি বান্ডেলে আপনার ৳${loss} টাকা লোকসান হবে।\n\nআপনি কি নিশ্চিত যে লোকসানেই এই কম্বো বান্ডেলটি সংরক্ষণ করতে চান?`
      );
      if (!isConfirmed) return;
    }

    const newBundle: ProductBundle = {
      id: bundleToEdit ? bundleToEdit.id : `bundle-${Date.now()}`,
      name: name.trim(),
      category: category.trim() || 'হিজামা প্যাকেজ',
      description: description.trim() || undefined,
      bundlePrice: Number(bundlePrice),
      defaultDeliveryCharge: Number(defaultDeliveryCharge) || 130,
      items,
      createdAt: bundleToEdit ? bundleToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveBundle(newBundle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/50 flex items-center justify-center border border-teal-400/30">
              <Layers className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {bundleToEdit ? 'বান্ডেল / কম্বো প্যাকেজ সম্পাদনা' : 'নতুন পণ্য বান্ডেল / কম্বো প্যাকেজ তৈরি'}
              </h2>
              <p className="text-xs text-teal-200">
                একাধিক পণ্যকে একসাথে প্যাকেজ করে বিশেষ মূল্যে বিক্রি করুন (স্টক স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকবে)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বান্ডেলের নাম <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: হিজামা ৩২ কাপ ফুল সেট"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="যেমন: হিজামা প্যাকেজ"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Price, Cost & Real-Time Profit Bar */}
          <div className="bg-teal-50/60 p-3.5 sm:p-4 rounded-xl border border-teal-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-teal-900 mb-1">
                  ঘোষিত মোট বান্ডেল বিক্রয় মূল্য (৳) <span className="text-rose-500">*</span>
                </label>
                <MoneyInput
                  value={bundlePrice}
                  onChange={(val) => setBundlePrice(val)}
                  className={`w-full px-3 py-2 text-sm sm:text-base font-bold bg-white border rounded-xl focus:outline-none focus:ring-2 ${
                    items.length > 0 && bundlePrice > 0 && bundlePrice < totalPurchaseCost
                      ? 'border-rose-400 text-rose-700 focus:ring-rose-500'
                      : 'border-teal-300 text-teal-900 focus:ring-teal-600'
                  }`}
                  placeholder="যেমন: ১৭৯০"
                />
                <p className="text-[11px] text-teal-700 mt-1">
                  কাস্টমার এই প্যাকেজের জন্য মোট যে টাকা পরিশোধ করবেন।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কুরিয়ার ডেলিভারি চার্জ (ঐচ্ছিক)
                </label>
                <MoneyInput
                  value={defaultDeliveryCharge}
                  onChange={(val) => setDefaultDeliveryCharge(val)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="যেমন: ১৩০"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  অনলাইন অর্ডারে স্বয়ংক্রিয়ভাবে প্রযোজ্য হবে
                </p>
              </div>
            </div>

            {/* LIVE PROFIT & COST SUMMARY CHIPS */}
            {items.length > 0 && (
              <div className="pt-2.5 border-t border-teal-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                {/* Cost Price */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-medium">১. উপাদান ক্রয়মূল্য (কেনা খরচ)</span>
                  <span className="font-bold text-slate-800 text-sm sm:text-base">{formatCurrency(totalPurchaseCost)}</span>
                </div>

                {/* Regular Price */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-medium">২. আসল রেগুলার বিক্রয়মূল্য</span>
                  <span className="font-bold text-slate-500 text-sm sm:text-base line-through">{formatCurrency(regularTotal)}</span>
                </div>

                {/* Net Profit / Loss */}
                <div className={`p-2.5 rounded-xl border ${
                  bundlePrice <= 0
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : bundleProfit < 0
                    ? 'bg-rose-100 border-rose-300 text-rose-900'
                    : 'bg-emerald-100 border-emerald-300 text-emerald-950'
                }`}>
                  <span className="text-[11px] block font-bold">
                    {bundleProfit < 0 ? '⚠️ লোকসান হবে' : '৩. প্রত্যাশিত নিট লাভ'}
                  </span>
                  <span className={`text-sm sm:text-base font-black ${bundleProfit < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {bundleProfit >= 0 ? `+${formatCurrency(bundleProfit)}` : `-${formatCurrency(Math.abs(bundleProfit))}`}
                  </span>
                </div>

                {/* Profit Margin % */}
                <div className={`p-2.5 rounded-xl border ${
                  bundleProfit < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-teal-100/70 border-teal-200 text-teal-900'
                }`}>
                  <span className="text-[11px] block font-medium">৪. নিট মুনাফার হার</span>
                  <span className="text-sm sm:text-base font-bold">
                    {profitMarginPercent}% মার্জিন
                  </span>
                </div>
              </div>
            )}

            {/* LOSS ALERT BANNER (If Selling Below Cost) */}
            {items.length > 0 && bundlePrice > 0 && bundlePrice < totalPurchaseCost && (
              <div className="p-3 bg-rose-100/90 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 animate-in fade-in">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm">
                    🚨 লোকসানের ঝুঁকি! কেনা দামের নিচে কম্বো বিক্রি করা হচ্ছে!
                  </p>
                  <p className="mt-0.5 text-rose-800">
                    উপাদান পণ্যগুলোর মোট ক্রয়মূল্য <b>{formatCurrency(totalPurchaseCost)}</b>, কিন্তু আপনি বিক্রয় দর দিয়েছেন <b>{formatCurrency(bundlePrice)}</b>। 
                    এভাবে বিক্রি করলে প্রতিটি বান্ডেল বিক্রিতে আপনার <b>{formatCurrency(totalPurchaseCost - bundlePrice)} টাকা লোকসান</b> হবে।
                  </p>
                </div>
              </div>
            )}

            {/* PROFIT CONFIRMATION BANNER (If in profit) */}
            {items.length > 0 && bundlePrice >= totalPurchaseCost && bundlePrice > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    নিরাপদ ও লাভজনক প্যাকেজ: প্রতি সেটে আপনার <b>লাভ হবে {formatCurrency(bundleProfit)}</b> (মার্জিন: {profitMarginPercent}%)
                  </span>
                </div>
                {savingsAmount > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-700 hidden sm:inline">
                    গ্রাহকের সাশ্রয়: {formatCurrency(savingsAmount)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bundle Items Section */}
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 bg-slate-50/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-teal-600" />
                  <span>বান্ডেলের উপাদান পণ্যসমূহ ({items.length}টি)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  বান্ডেলে থাকা পণ্যগুলোর নাম এবং এই বান্ডেলের মধ্যে বিক্রয়মূল্য পরিবর্তন করে রাখতে পারেন
                </p>
              </div>

              {/* Add Product Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProductIdToAdd}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProductIdToAdd(id);
                    if (id) handleAddItem(id);
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-teal-300 text-teal-900 rounded-lg font-medium shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">➕ পণ্য নির্বাচন করে যুক্ত করুন...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — স্টক: {p.stockQty} {p.unit} (মূল্য: {p.sellingPrice}৳)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Item Rows Table */}
            {items.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-1 opacity-40 text-slate-400" />
                <p className="text-xs font-medium">এখনও কোনো পণ্য যুক্ত করা হয়নি।</p>
                <p className="text-[11px]">উপরের ড্রপডাউন থেকে হিজামা পেন, নিডেল বক্স ইত্যাদি পণ্য নির্বাচন করুন।</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const prod = products.find((p) => p.id === item.productId);
                  const availableStock = prod ? prod.stockQty : 0;
                  const itemSubtotal = (item.bundleSellingPrice || 0) * (item.quantity || 1);

                  return (
                    <div
                      key={item.productId || idx}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          {/* Editable Product Name in Bundle */}
                          <div className="flex-1">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) =>
                                handleUpdateItem(idx, { productName: e.target.value })
                              }
                              className="w-full text-xs sm:text-sm font-semibold text-slate-800 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-teal-500"
                              title="বান্ডেলের জন্য পণ্যের নাম পরিবর্তন করতে পারেন"
                            />
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span>মূল পণ্য: {prod?.name || item.productName}</span>
                              <span>•</span>
                              <span className={availableStock <= 3 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                                বর্তমান স্টক: {availableStock} {item.unit}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delete Item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="এই পণ্যটি বান্ডেল থেকে বাদ দিন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Row Inputs: Quantity, Cost, Regular Price & Bundle Price */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-100 text-xs items-end">
                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-0.5">পরিমাণ</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, {
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-center font-bold text-slate-800"
                            />
                            <span className="text-slate-500 text-[11px]">{item.unit}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                            একক ক্রয়মূল্য (কেনা)
                          </label>
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-semibold text-xs">
                            {formatCurrency(prod?.purchasePrice || 0)}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                            আসল বিক্রয় মূল্য
                          </label>
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-500 rounded-md font-semibold line-through text-xs">
                            {formatCurrency(item.originalSellingPrice)}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] text-teal-800 font-bold mb-0.5">
                            বান্ডেলে বিক্রয় দর
                          </label>
                          <MoneyInput
                            value={item.bundleSellingPrice}
                            onChange={(val) =>
                              handleUpdateItem(idx, { bundleSellingPrice: val })
                            }
                            className={`w-full px-2 py-1 rounded-md text-right font-bold text-xs focus:bg-white focus:ring-1 ${
                              (item.bundleSellingPrice ?? 0) < (prod?.purchasePrice || 0)
                                ? 'bg-rose-50 border border-rose-300 text-rose-800 focus:ring-rose-500'
                                : 'bg-teal-50/50 border border-teal-300 text-teal-900 focus:ring-teal-500'
                            }`}
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1 text-right pt-1 sm:pt-0">
                          {(() => {
                            const itemCost = (prod?.purchasePrice || 0) * (item.quantity || 1);
                            const itemProfit = itemSubtotal - itemCost;
                            const isBelowCost = itemSubtotal < itemCost;
                            return (
                              <div>
                                <span className="text-[10px] text-slate-400 block">উপাদান মোট / লাভ</span>
                                <span className="font-bold text-slate-800 text-xs block">
                                  {formatCurrency(itemSubtotal)}
                                </span>
                                <span className={`text-[10px] font-bold block ${isBelowCost ? 'text-rose-600' : 'text-emerald-700'}`}>
                                  {isBelowCost ? `⚠️ লোকসান: ${formatCurrency(Math.abs(itemProfit))}` : `লাভ: +${formatCurrency(itemProfit)}`}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* REAL-TIME DISCREPANCY & SAVINGS ANALYZER (গড়মিল ও সাশ্রয় ক্যালকুলেটর) */}
          {items.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>বান্ডেল মূল্য ও উপাদান মূল্যের গড়মিল বিশ্লেষণ (Price Analyzer)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  উপাদান সংখ্যা: {items.length}টি
                </span>
              </div>

              <div className="p-4 space-y-3 bg-white">
                {/* 4 Metric Summary Boxes with Cost & Profit */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block font-medium">
                      ১. উপাদান ক্রয়মূল্য (কেনা)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-800">
                      {formatCurrency(totalPurchaseCost)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block font-medium">
                      ২. রেগুলার বিক্রয় দর
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-500 line-through">
                      {formatCurrency(regularTotal)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
                    <span className="text-[11px] block font-medium">
                      ৩. ঘোষিত বান্ডেল দর
                    </span>
                    <span className="text-sm sm:text-base font-bold text-teal-800">
                      {formatCurrency(bundlePrice)}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    bundleProfit < 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}>
                    <span className="text-[11px] block font-medium">
                      {bundleProfit < 0 ? '৪. লোকসান' : '৪. নিট লাভ'}
                    </span>
                    <span className={`text-sm sm:text-base font-black ${bundleProfit < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {bundleProfit >= 0 ? `+${formatCurrency(bundleProfit)}` : `-${formatCurrency(Math.abs(bundleProfit))}`}
                    </span>
                    <span className="text-[10px] block font-bold text-slate-500 mt-0.5">
                      ({profitMarginPercent}% মার্জিন)
                    </span>
                  </div>
                </div>

                {/* Discrepancy Notice / Status Alert */}
                {priceDiscrepancy !== 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <p className="font-bold">
                          ⚠️ গড়মিল রয়েছে: উপাদানগুলোর মূল্যের যোগফল ({formatCurrency(itemsAssignedTotal)}) এবং ঘোষিত বান্ডেল মূল্যের ({formatCurrency(bundlePrice)}) মধ্যে {formatCurrency(Math.abs(priceDiscrepancy))} পার্থক্য রয়েছে!
                        </p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          {priceDiscrepancy > 0
                            ? `উপাদানগুলোতে ধার্যকৃত মূল্য বান্ডেলের দাম থেকে ${formatCurrency(priceDiscrepancy)} বেশি আছে।`
                            : `উপাদানগুলোতে ধার্যকৃত মূল্য বান্ডেলের দাম থেকে ${formatCurrency(Math.abs(priceDiscrepancy))} কম আছে।`}
                        </p>
                      </div>
                    </div>

                    {/* Auto Distribute Button */}
                    <button
                      type="button"
                      onClick={handleAutoDistribute}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
                      title="ঘোষিত বান্ডেলের মূল্যের সাথে উপাদানগুলোর দাম স্বয়ংক্রিয়ভাবে সমানুপাতিক সমন্বয় করুন"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>স্বয়ংক্রিয় সমন্বয় করুন</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">
                      ✅ নিখুঁত মিল! উপাদানগুলোর দামের যোগফল এবং বান্ডেলের ঘোষিত বিক্রয় মূল্য হুবহু সমান ({formatCurrency(bundlePrice)})।
                    </span>
                  </div>
                )}

                {/* Customer Savings Card */}
                {savingsAmount > 0 && (
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-indigo-600" />
                      <span>
                        রেগুলার মূল্যের চেয়ে গ্রাহকের <b>সাশ্রয়: {formatCurrency(savingsAmount)}</b> ({savingsPercent}% ছাড়)
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-700">
                      আকর্ষণীয় বান্ডেল অফার
                    </span>
                  </div>
                )}

                {/* Stock Readiness Info */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" />
                    <span>
                      উপাদান অনুযায়ী বর্তমান ইনভেন্টরি থেকে <b>সর্বোচ্চ {bundleStockInfo.count} টি বান্ডেল</b> বিক্রি করা সম্ভব
                    </span>
                  </div>
                  {bundleStockInfo.bottleneckItem && bundleStockInfo.count <= 5 && (
                    <span className="text-[11px] text-amber-700 font-medium">
                      (সতর্কতা: {bundleStockInfo.bottleneckItem.name}-এর স্টক কম: মাত্র {bundleStockInfo.bottleneckItem.stock} পিস)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              বিবরণ / প্যাকেজ নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: ৩২ কাপ সেট + প্রফেশনাল হিজামা পেন + ১০০ পিস নিডেল কম্বো প্যাকেজ"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              বাতিল
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{bundleToEdit ? 'বান্ডেল আপডেট করুন' : 'বান্ডেল সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
