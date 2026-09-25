import React, { useState, useMemo } from 'react';
import { Product, ProductBundle } from '../types';
import { formatCurrency } from '../utils/formatters';
import { BundleModal } from './BundleModal';
import { MoneyInput } from './MoneyInput';
import {
  Package,
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  TrendingUp,
  Tag,
  X,
  Check,
} from 'lucide-react';

interface StockManagementProps {
  products: Product[];
  bundles: ProductBundle[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddBundle: (bundle: ProductBundle) => void;
  onUpdateBundle: (bundle: ProductBundle) => void;
  onDeleteBundle: (bundleId: string) => void;
}

export const StockManagement: React.FC<StockManagementProps> = ({
  products,
  bundles,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddBundle,
  onUpdateBundle,
  onDeleteBundle,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'bundles'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    code: '',
    sku: '',
    category: '',
    purchasePrice: 0,
    sellingPrice: 0,
    stockQty: 0,
    minStockAlert: 5,
    unit: 'পিস',
  });

  // Bundle modal state
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ProductBundle | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, searchQuery, categoryFilter]);

  // Inventory valuation summary stats
  const stats = useMemo(() => {
    const totalQty = products.reduce((s, p) => s + p.stockQty, 0);
    const totalCost = products.reduce((s, p) => s + (p.purchasePrice || 0) * p.stockQty, 0);
    const totalRetail = products.reduce((s, p) => s + p.sellingPrice * p.stockQty, 0);
    const lowStockCount = products.filter((p) => p.stockQty <= p.minStockAlert).length;

    return {
      totalProducts: products.length,
      totalQty,
      totalCost,
      totalRetail,
      potentialProfit: totalRetail - totalCost,
      lowStockCount,
    };
  }, [products]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      code: `P-${Math.floor(100 + Math.random() * 900)}`,
      sku: '',
      category: '',
      purchasePrice: 0,
      sellingPrice: 0,
      stockQty: 10,
      minStockAlert: 5,
      unit: 'পিস',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdForm({
      name: prod.name,
      code: prod.code || '',
      sku: prod.sku || '',
      category: prod.category || '',
      purchasePrice: prod.purchasePrice || 0,
      sellingPrice: prod.sellingPrice || 0,
      stockQty: prod.stockQty || 0,
      minStockAlert: prod.minStockAlert || 5,
      unit: prod.unit || 'পিস',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim()) {
      alert('পণ্যের নাম প্রদান করুন!');
      return;
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: prodForm.name.trim(),
        code: prodForm.code.trim() || undefined,
        sku: prodForm.sku.trim() || undefined,
        category: prodForm.category.trim() || undefined,
        purchasePrice: Number(prodForm.purchasePrice) || 0,
        sellingPrice: Number(prodForm.sellingPrice) || 0,
        stockQty: Number(prodForm.stockQty) || 0,
        minStockAlert: Number(prodForm.minStockAlert) || 5,
        unit: prodForm.unit.trim() || 'পিস',
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddProduct({
        id: `prod-${Date.now()}`,
        name: prodForm.name.trim(),
        code: prodForm.code.trim() || undefined,
        sku: prodForm.sku.trim() || undefined,
        category: prodForm.category.trim() || undefined,
        purchasePrice: Number(prodForm.purchasePrice) || 0,
        sellingPrice: Number(prodForm.sellingPrice) || 0,
        stockQty: Number(prodForm.stockQty) || 0,
        minStockAlert: Number(prodForm.minStockAlert) || 5,
        unit: prodForm.unit.trim() || 'পিস',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProd = (prod: Product) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${prod.name}" পণ্যটি তালিকা থেকে মুছে ফেলতে চান?`)) {
      onDeleteProduct(prod.id);
    }
  };

  const handleOpenAddBundle = () => {
    setEditingBundle(null);
    setIsBundleModalOpen(true);
  };

  const handleOpenEditBundle = (bundle: ProductBundle) => {
    setEditingBundle(bundle);
    setIsBundleModalOpen(true);
  };

  const handleDeleteBun = (bundle: ProductBundle) => {
    if (confirm(`আপনি কি "${bundle.name}" বান্ডেল প্যাকেজটি মুছে ফেলতে চান?`)) {
      onDeleteBundle(bundle.id);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Inventory Valuation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">মোট পণ্য ও পদ</span>
          <span className="text-lg font-bold text-slate-900">{stats.totalProducts} টি</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">মোট মজুদ: {stats.totalQty} পিস</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">ইনভেন্টরি ক্রয়মূল্য</span>
          <span className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalCost)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">আসল কেনা দর</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">সম্ভাব্য বিক্রয় মূল্য</span>
          <span className="text-lg font-bold text-emerald-800">{formatCurrency(stats.totalRetail)}</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">
            সম্ভাব্য মোট লাভ: {formatCurrency(stats.potentialProfit)}
          </span>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-xs ${
          stats.lowStockCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <span className="text-[11px] font-semibold text-amber-800 block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>স্বল্প স্টক সতর্কতা</span>
          </span>
          <span className="text-lg font-bold text-amber-950">{stats.lowStockCount} টি পণ্য</span>
          <span className="text-[10px] text-amber-700 block mt-0.5">রি-অর্ডার করা প্রয়োজন</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Tabs & Actions */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Toggle between Products and Bundles */}
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              <span>একক পণ্য তালিকা ({products.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bundles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'bundles'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>বান্ডেল / প্যাকেজ ({bundles.length})</span>
            </button>
          </div>

          {/* Search & Add Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="পণ্য বা কোড খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {activeTab === 'products' && (
              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন পণ্য যোগ করুন</span>
              </button>
            )}

            {activeTab === 'bundles' && (
              <button
                type="button"
                onClick={handleOpenAddBundle}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন কম্বো বান্ডেল তৈরি</span>
              </button>
            )}
          </div>
        </div>

        {/* PRODUCTS VIEW */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">পণ্যের নাম ও কোড</th>
                  <th className="p-3">ক্যাটাগরি</th>
                  <th className="p-3 text-right">ক্রয় দর</th>
                  <th className="p-3 text-right">বিক্রয় দর</th>
                  <th className="p-3 text-center">বর্তমান স্টক</th>
                  <th className="p-3 text-right">মোট স্টক মূল্য</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => {
                  const isLow = prod.stockQty <= prod.minStockAlert;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{prod.name}</div>
                        {(prod.code || prod.sku) && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {prod.code || prod.sku}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{prod.category || '—'}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(prod.purchasePrice)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {formatCurrency(prod.sellingPrice)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            prod.stockQty <= 0
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {prod.stockQty} {prod.unit || 'পিস'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">
                        {formatCurrency(prod.sellingPrice * prod.stockQty)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(prod)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProd(prod)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      কোনো পণ্য পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* BUNDLES VIEW */}
        {activeTab === 'bundles' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-slate-50 border border-teal-200 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-full">
                      {bundle.category || 'প্যাকেজ'}
                    </span>
                    <span className="text-base font-extrabold text-teal-900">
                      {formatCurrency(bundle.bundlePrice)}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mb-1">{bundle.name}</h4>
                  {bundle.description && (
                    <p className="text-xs text-slate-500 mb-2">{bundle.description}</p>
                  )}

                  <div className="space-y-1 mb-3 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      বান্ডেল এর পণ্যসমূহ:
                    </span>
                    {bundle.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span className="truncate">{it.productName || 'পণ্য'}</span>
                        <span className="font-semibold text-slate-500">×{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleOpenEditBundle(bundle)}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>এডিট</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBun(bundle)}
                    className="px-3 py-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>
                </div>
              </div>
            ))}

            {bundles.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                কোনো বান্ডেল কম্বো প্যাকেজ তৈরি করা হয়নি। উপরে "নতুন কম্বো বান্ডেল তৈরি" বাটনে ক্লিক করুন।
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>{editingProduct ? 'পণ্য সংশোধন করুন' : 'নতুন পণ্য যোগ করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">পণ্যের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: সুতি পাঞ্জাবি"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">কোড / বারকোড</label>
                  <input
                    type="text"
                    value={prodForm.code}
                    onChange={(e) => setProdForm({ ...prodForm, code: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ক্যাটাগরি</label>
                  <input
                    type="text"
                    placeholder="যেমন: পোশাক"
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ক্রয় মূল্য (৳)</label>
                  <MoneyInput
                    value={prodForm.purchasePrice}
                    onChange={(val) => setProdForm({ ...prodForm, purchasePrice: val })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">বিক্রয় মূল্য (৳) *</label>
                  <MoneyInput
                    value={prodForm.sellingPrice}
                    onChange={(val) => setProdForm({ ...prodForm, sellingPrice: val })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">মজুদ (স্টক)</label>
                  <input
                    type="number"
                    value={prodForm.stockQty}
                    onChange={(e) => setProdForm({ ...prodForm, stockQty: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">সতর্কতা লিমিট</label>
                  <input
                    type="number"
                    value={prodForm.minStockAlert}
                    onChange={(e) => setProdForm({ ...prodForm, minStockAlert: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">একক (Unit)</label>
                  <input
                    type="text"
                    value={prodForm.unit}
                    onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {editingProduct ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUNDLE COMBO MODAL */}
      <BundleModal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        bundleToEdit={editingBundle}
        products={products}
        onSaveBundle={(savedBundle) => {
          if (editingBundle) {
            onUpdateBundle(savedBundle);
          } else {
            onAddBundle(savedBundle);
          }
          setIsBundleModalOpen(false);
        }}
      />
    </div>
  );
};
