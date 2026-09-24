import React, { useState, useMemo } from 'react';
import { Product, UnitType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  X, 
  Check, 
  ArrowUpDown,
  Barcode,
  Truck
} from 'lucide-react';

interface StockManagementProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

const unitOptions: UnitType[] = [
  'পিস',
  'কেজি',
  'গ্রাম',
  'লিটার',
  'প্যাকেট',
  'বক্স',
  'ডজন',
  'বস্তা',
  'মিটার'
];

export const StockManagement: React.FC<StockManagementProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [banglaName, setBanglaName] = useState('');
  const [category, setCategory] = useState('মুদি সামগ্রী');
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [unit, setUnit] = useState<UnitType>('পিস');
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState<number>(130);
  const [weightKg, setWeightKg] = useState<number>(0);

  // Quick adjust modal
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Inventory Overview Metrics
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalStockCost = products.reduce((sum, p) => sum + p.purchasePrice * p.stockQty, 0);
    const totalStockRevenue = products.reduce((sum, p) => sum + p.sellingPrice * p.stockQty, 0);
    const expectedProfit = Math.max(0, totalStockRevenue - totalStockCost);
    const lowStockCount = products.filter((p) => p.stockQty > 0 && p.stockQty <= p.minStockAlert).length;
    const outOfStockCount = products.filter((p) => p.stockQty <= 0).length;

    return {
      totalProducts,
      totalStockCost,
      totalStockRevenue,
      expectedProfit,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      let matchesStockStatus = true;
      if (stockStatusFilter === 'low') {
        matchesStockStatus = p.stockQty > 0 && p.stockQty <= p.minStockAlert;
      } else if (stockStatusFilter === 'out') {
        matchesStockStatus = p.stockQty <= 0;
      }

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.banglaName && p.banglaName.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        p.category.toLowerCase().includes(q);

      return matchesCategory && matchesStockStatus && matchesSearch;
    });
  }, [products, selectedCategory, stockStatusFilter, searchTerm]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setName('');
    setBanglaName('');
    setCategory('মুদি সামগ্রী');
    setBarcode('');
    setPurchasePrice(0);
    setSellingPrice(0);
    setStockQty(10);
    setMinStockAlert(5);
    setUnit('পিস');
    setDefaultDeliveryCharge(130);
    setWeightKg(0);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: Product) => {
    setEditingProductId(p.id);
    setName(p.name);
    setBanglaName(p.banglaName || '');
    setCategory(p.category);
    setBarcode(p.barcode || '');
    setPurchasePrice(p.purchasePrice);
    setSellingPrice(p.sellingPrice);
    setStockQty(p.stockQty);
    setMinStockAlert(p.minStockAlert);
    setUnit(p.unit);
    setDefaultDeliveryCharge(p.defaultDeliveryCharge !== undefined ? p.defaultDeliveryCharge : 130);
    setWeightKg(p.weightKg || 0);
    setIsModalOpen(true);
  };

  // Save Product
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('অনুগ্রহ করে পণ্যের নাম লিখুন!');
      return;
    }
    if (sellingPrice < purchasePrice) {
      if (!confirm('সতর্কতা: বিক্রয়মূল্য ক্রয়মূল্যের চেয়ে কম! আপনি কি এই পণ্যটি সংরক্ষণ করতে চান?')) {
        return;
      }
    }

    if (editingProductId) {
      const updated: Product = {
        id: editingProductId,
        name: name.trim(),
        banglaName: banglaName.trim() || undefined,
        category: category.trim() || 'সাধারণ',
        barcode: barcode.trim() || undefined,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stockQty: Number(stockQty) || 0,
        minStockAlert: Number(minStockAlert) || 5,
        unit,
        defaultDeliveryCharge: Number(defaultDeliveryCharge) >= 0 ? Number(defaultDeliveryCharge) : 130,
        weightKg: Number(weightKg) > 0 ? Number(weightKg) : undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updated);
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: name.trim(),
        banglaName: banglaName.trim() || undefined,
        category: category.trim() || 'সাধারণ',
        barcode: barcode.trim() || undefined,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stockQty: Number(stockQty) || 0,
        minStockAlert: Number(minStockAlert) || 5,
        unit,
        defaultDeliveryCharge: Number(defaultDeliveryCharge) >= 0 ? Number(defaultDeliveryCharge) : 130,
        weightKg: Number(weightKg) > 0 ? Number(weightKg) : undefined,
        updatedAt: new Date().toISOString(),
      };
      onAddProduct(newProd);
    }

    setIsModalOpen(false);
  };

  // Handle Quick Adjust Save
  const handleSaveQuickAdjust = () => {
    if (!quickAdjustProduct) return;
    const change = adjustType === 'add' ? adjustAmount : -adjustAmount;
    const newQty = Math.max(0, quickAdjustProduct.stockQty + change);
    onUpdateProduct({
      ...quickAdjustProduct,
      stockQty: newQty,
      updatedAt: new Date().toISOString(),
    });
    setQuickAdjustProduct(null);
  };

  return (
    <div id="stock-management-view" className="space-y-4">
      {/* Top Inventory Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Products */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">মোট পণ্য সংখ্যা</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {metrics.totalProducts} টি
            </p>
          </div>
        </div>

        {/* Metric 2: Total Stock Cost Value */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">মোট স্টক ইনভেস্টমেন্ট (ক্রয়)</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {formatCurrency(metrics.totalStockCost)}
            </p>
          </div>
        </div>

        {/* Metric 3: Expected Retail Revenue */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">প্রত্যাশিত বিক্রয় মূল্য</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {formatCurrency(metrics.totalStockRevenue)}
            </p>
          </div>
        </div>

        {/* Metric 4: Low Stock Alerts */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">কম স্টক / শেষ পণ্য</p>
            <p className="text-lg sm:text-xl font-bold text-rose-600 leading-tight">
              {metrics.lowStockCount + metrics.outOfStockCount} টি
            </p>
          </div>
        </div>
      </div>

      {/* Action Header & Search Controls */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-stock-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="পণ্যের নাম, বারকোড বা ক্যাটাগরি খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Low Stock Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                stockStatusFilter === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল পণ্য
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
                stockStatusFilter === 'low'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              কম স্টক ({metrics.lowStockCount})
            </button>
            <button
              onClick={() => setStockStatusFilter('out')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
                stockStatusFilter === 'out'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              স্টক শেষ ({metrics.outOfStockCount})
            </button>
          </div>

          {/* Add Product Button */}
          <button
            id="btn-add-product"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন পণ্য যোগ করুন</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'সকল ক্যাটাগরি' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Products Card View (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center text-slate-400 border border-slate-200">
            <Package className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-60" />
            <p className="font-medium text-slate-600">কোনো পণ্য পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400 mt-1">নতুন পণ্য যোগ করতে উপরের বাটনে চাপুন</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLow = p.stockQty > 0 && p.stockQty <= p.minStockAlert;
            const isOut = p.stockQty <= 0;
            const unitProfit = p.sellingPrice - p.purchasePrice;

            return (
              <div 
                key={p.id} 
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3"
              >
                {/* Product Name & Category */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{p.banglaName || p.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium">
                        {p.category}
                      </span>
                      {p.barcode && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{p.barcode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-xs shrink-0 ${
                      isOut
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : isLow
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {p.stockQty} {p.unit}
                  </span>
                </div>

                {/* Price & Profit Details */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">ক্রয়মূল্য</span>
                    <span className="font-semibold text-slate-700">৳{p.purchasePrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">বিক্রয়মূল্য</span>
                    <span className="font-bold text-slate-900">৳{p.sellingPrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">লাভ / একক</span>
                    <span className={`font-bold ${unitProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      +৳{unitProfit}
                    </span>
                  </div>
                </div>

                {/* Delivery & Weight Note */}
                {(p.defaultDeliveryCharge !== undefined || p.weightKg) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-100 font-medium">
                    <Truck className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>কুরিয়ার ডেলিভারি চার্জ: ৳{p.defaultDeliveryCharge ?? 130}</span>
                    {p.weightKg ? <span className="text-slate-400">| ওজন: {p.weightKg} কেজি</span> : null}
                  </div>
                )}

                {/* Mobile Quick Actions: Adjust Stock & Edit/Delete */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAdjustProduct(p);
                      setAdjustAmount(1);
                      setAdjustType('add');
                    }}
                    className="min-h-[38px] px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>স্টক সমন্বয় (+/-)</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>এডিট</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`আপনি কি নিশ্চিত যে "${p.name}" পণ্যটি মুছে ফেলতে চান?`)) {
                          onDeleteProduct(p.id);
                        }
                      }}
                      className="min-h-[38px] px-2.5 py-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Products Table (hidden on mobile, full width on desktop) */}
      <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4">পণ্যের নাম ও ক্যাটাগরি</th>
                <th className="py-3 px-4 text-center">একক</th>
                <th className="py-3 px-4 text-right">ক্রয়মূল্য</th>
                <th className="py-3 px-4 text-right">বিক্রয়মূল্য</th>
                <th className="py-3 px-4 text-right">লাভ / একক</th>
                <th className="py-3 px-4 text-center">বর্তমান স্টক</th>
                <th className="py-3 px-4 text-right">মোট স্টক ভ্যালু</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-medium text-slate-600">কোনো পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400 mt-1">নতুন পণ্য যোগ করতে উপরের বাটনে চাপুন</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stockQty > 0 && p.stockQty <= p.minStockAlert;
                  const isOut = p.stockQty <= 0;
                  const unitProfit = p.sellingPrice - p.purchasePrice;
                  const totalValue = p.stockQty * p.purchasePrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Category */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {p.category}
                          </span>
                          {p.barcode && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                              <Barcode className="w-3 h-3" />
                              {p.barcode}
                            </span>
                          )}
                          {(p.defaultDeliveryCharge !== undefined || p.weightKg) && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 font-medium">
                              <Truck className="w-2.5 h-2.5" />
                              <span>ডেলিভারি: ৳{p.defaultDeliveryCharge ?? 130}</span>
                              {p.weightKg ? <span>({p.weightKg} কেজি)</span> : null}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4 text-center text-slate-600">
                        {p.unit}
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        ৳{p.purchasePrice}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ৳{p.sellingPrice}
                      </td>

                      {/* Profit per unit */}
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${unitProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          +৳{unitProfit}
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.stockQty} {p.unit}
                          </span>
                          <button
                            onClick={() => {
                              setQuickAdjustProduct(p);
                              setAdjustAmount(1);
                              setAdjustType('add');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 cursor-pointer"
                            title="দ্রুত স্টক যোগ বা বিয়োগ করুন"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        ৳{totalValue}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="তথ্য পরিবর্তন বা এডিট করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`আপনি কি নিশ্চিত যে "${p.name}" পণ্যটি মুছে ফেলতে চান?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="পণ্য ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>{editingProductId ? 'পণ্যের তথ্য পরিবর্তন করুন' : 'নতুন পণ্য যোগ করুন'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitProduct} className="p-4 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  পণ্যের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: তীর সয়াবিন তেল (৫ লিটার)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="যেমন: মুদি, চাল, তেল"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">পরিমাপের একক</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ক্রয়মূল্য (টাকা) <span className="text-rose-500">*</span>
                  </label>
                  <MoneyInput
                    id="input-product-purchase-price"
                    min={0}
                    required
                    value={purchasePrice}
                    onChange={setPurchasePrice}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    বিক্রয়মূল্য (টাকা) <span className="text-rose-500">*</span>
                  </label>
                  <MoneyInput
                    id="input-product-selling-price"
                    min={0}
                    required
                    value={sellingPrice}
                    onChange={setSellingPrice}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">বর্তমান স্টক সংখ্যা</label>
                  <MoneyInput
                    id="input-product-stock-qty"
                    min={0}
                    value={stockQty}
                    onChange={setStockQty}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">কম স্টক সতর্কতা সীমা</label>
                  <MoneyInput
                    id="input-product-min-stock-alert"
                    min={1}
                    value={minStockAlert}
                    onChange={(val) => setMinStockAlert(val || 5)}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">বারকোড / কোড (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="বারকোড স্ক্যানার বা কোড..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Delivery Charge & Weight for COD Courier */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>কুরিয়ার ও সিওডি ডেলিভারি হিসাব (ঐচ্ছিক)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      আনুমানিক ডেলিভারি চার্জ (টাকা)
                    </label>
                    <MoneyInput
                      id="input-product-delivery-charge"
                      min={0}
                      value={defaultDeliveryCharge}
                      onChange={setDefaultDeliveryCharge}
                      placeholder="130"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    <span className="text-[10px] text-slate-500">গড়ে ১৩০ টাকা বা নির্ধারিত</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      পণ্যের ওজন (কেজি)
                    </label>
                    <MoneyInput
                      id="input-product-weight-kg"
                      min={0}
                      value={weightKg}
                      onChange={setWeightKg}
                      placeholder="0.5"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    <span className="text-[10px] text-slate-500">কুরিয়ার ওজন স্ল্যাব চার্জের জন্য</span>
                  </div>
                </div>
              </div>

              {/* Profit preview card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600">প্রতি এককে সম্ভাব্য মুনাফা:</span>
                <span className={`font-bold text-sm ${sellingPrice - purchasePrice >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ৳{Math.round((sellingPrice - purchasePrice) * 100) / 100}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProductId ? 'আপডেট করুন' : 'পণ্য যোগ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUST MODAL */}
      {quickAdjustProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">
                স্টক সমন্বয়: {quickAdjustProduct.name}
              </h4>
              <button
                onClick={() => setQuickAdjustProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              বর্তমান স্টক: <strong className="text-slate-800">{quickAdjustProduct.stockQty} {quickAdjustProduct.unit}</strong>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                  adjustType === 'add'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                + স্টক যোগ করুন
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('subtract')}
                className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                  adjustType === 'subtract'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                - স্টক বিয়োগ করুন
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পরিমাণ ({quickAdjustProduct.unit}):
              </label>
              <MoneyInput
                id="input-quick-adjust-amount"
                min={1}
                value={adjustAmount}
                onChange={(val) => setAdjustAmount(Math.max(1, val))}
                placeholder="1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between">
              <span>নতুন স্টক হবে:</span>
              <strong className="text-emerald-700">
                {Math.max(
                  0,
                  quickAdjustProduct.stockQty + (adjustType === 'add' ? adjustAmount : -adjustAmount)
                )}{' '}
                {quickAdjustProduct.unit}
              </strong>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setQuickAdjustProduct(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveQuickAdjust}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
