import React, { useState, useMemo } from 'react';
import { Product, ProductBundle, UnitType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { BundleModal } from './BundleModal';
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
  Truck,
  Sparkles,
  TrendingDown,
  Gift,
  Globe
} from 'lucide-react';

interface StockManagementProps {
  products: Product[];
  bundles?: ProductBundle[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddBundle?: (bundle: ProductBundle) => void;
  onUpdateBundle?: (bundle: ProductBundle) => void;
  onDeleteBundle?: (bundleId: string) => void;
  onOpenWebsiteSync?: () => void;
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
  bundles = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddBundle,
  onUpdateBundle,
  onDeleteBundle,
  onOpenWebsiteSync,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'bundles'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Bundle states
  const [bundleSearchTerm, setBundleSearchTerm] = useState('');
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ProductBundle | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper: calculate available bundle stock based on underlying product inventory
  const getBundleStockInfo = (bundle: ProductBundle) => {
    if (!bundle.items || bundle.items.length === 0) return { count: 0, bottleneck: null };
    let minSets = Infinity;
    let bottleneck: { name: string; stock: number; required: number } | null = null;
    for (const item of bundle.items) {
      const prod = products.find((p) => p.id === item.productId);
      const stock = prod ? prod.stockQty : 0;
      const sets = item.quantity > 0 ? Math.floor(stock / item.quantity) : 0;
      if (sets < minSets) {
        minSets = sets;
        bottleneck = {
          name: item.productName,
          stock,
          required: item.quantity,
        };
      }
    }
    return {
      count: minSets === Infinity ? 0 : Math.max(0, minSets),
      bottleneck,
    };
  };

  const filteredBundles = useMemo(() => {
    const list = bundles || [];
    const q = bundleSearchTerm.toLowerCase().trim();
    if (!q) return list;
    return list.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.category && b.category.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      b.items.some((it) => it.productName.toLowerCase().includes(q))
    );
  }, [bundles, bundleSearchTerm]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [banglaName, setBanglaName] = useState('');
  const [category, setCategory] = useState('হিজামা');
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [regularPrice, setRegularPrice] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [unit, setUnit] = useState<UnitType>('পিস');
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState<number>(70);
  const [deliveryDhaka, setDeliveryDhaka] = useState<number>(70);
  const [deliverySubDhaka, setDeliverySubDhaka] = useState<number>(100);
  const [deliveryOutside, setDeliveryOutside] = useState<number>(130);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [pdId, setPdId] = useState<number | string>('');
  const [serialNo, setSerialNo] = useState<number>(0);
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
    setCategory('হিজামা');
    setBarcode('');
    setPurchasePrice(0);
    setSellingPrice(0);
    setRegularPrice(0);
    setStockQty(10);
    setMinStockAlert(5);
    setUnit('পিস');
    setDefaultDeliveryCharge(70);
    setDeliveryDhaka(70);
    setDeliverySubDhaka(100);
    setDeliveryOutside(130);
    setImageUrl('');
    setVideoUrl('');
    setDescription('');
    setSearchKeywords('');
    setIsActive(true);
    setPdId('');
    setSerialNo(products.length + 1);
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
    setRegularPrice(p.regularPrice !== undefined ? p.regularPrice : p.sellingPrice);
    setStockQty(p.stockQty);
    setMinStockAlert(p.minStockAlert);
    setUnit(p.unit);
    setDefaultDeliveryCharge(p.defaultDeliveryCharge !== undefined ? p.defaultDeliveryCharge : 70);
    setDeliveryDhaka(p.deliveryDhaka !== undefined ? p.deliveryDhaka : 70);
    setDeliverySubDhaka(p.deliverySubDhaka !== undefined ? p.deliverySubDhaka : 100);
    setDeliveryOutside(p.deliveryOutside !== undefined ? p.deliveryOutside : 130);
    setImageUrl(p.imageUrl || '');
    setVideoUrl(p.videoUrl || '');
    setDescription(p.description || '');
    setSearchKeywords(p.searchKeywords || '');
    setIsActive(p.isActive !== false);
    setPdId(p.pdId !== undefined ? p.pdId : p.id);
    setSerialNo(p.serialNo || 0);
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
        pdId: pdId !== '' ? pdId : editingProductId,
        serialNo: Number(serialNo) > 0 ? Number(serialNo) : undefined,
        name: name.trim(),
        banglaName: banglaName.trim() || undefined,
        category: category.trim() || 'সাধারণ',
        barcode: barcode.trim() || undefined,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        regularPrice: Number(regularPrice) > 0 ? Number(regularPrice) : Number(sellingPrice),
        stockQty: Number(stockQty) || 0,
        minStockAlert: Number(minStockAlert) || 5,
        unit,
        defaultDeliveryCharge: Number(deliveryDhaka) || Number(defaultDeliveryCharge) || 70,
        deliveryDhaka: Number(deliveryDhaka) || 70,
        deliverySubDhaka: Number(deliverySubDhaka) || 100,
        deliveryOutside: Number(deliveryOutside) || 130,
        imageUrl: imageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        description: description.trim() || undefined,
        searchKeywords: searchKeywords.trim() || undefined,
        isActive,
        weightKg: Number(weightKg) > 0 ? Number(weightKg) : undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updated);
    } else {
      const newProdId = pdId !== '' ? String(pdId) : String(Date.now());
      const newProd: Product = {
        id: newProdId,
        pdId: pdId !== '' ? pdId : newProdId,
        serialNo: Number(serialNo) > 0 ? Number(serialNo) : products.length + 1,
        name: name.trim(),
        banglaName: banglaName.trim() || undefined,
        category: category.trim() || 'সাধারণ',
        barcode: barcode.trim() || undefined,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        regularPrice: Number(regularPrice) > 0 ? Number(regularPrice) : Number(sellingPrice),
        stockQty: Number(stockQty) || 0,
        minStockAlert: Number(minStockAlert) || 5,
        unit,
        defaultDeliveryCharge: Number(deliveryDhaka) || Number(defaultDeliveryCharge) || 70,
        deliveryDhaka: Number(deliveryDhaka) || 70,
        deliverySubDhaka: Number(deliverySubDhaka) || 100,
        deliveryOutside: Number(deliveryOutside) || 130,
        imageUrl: imageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        description: description.trim() || undefined,
        searchKeywords: searchKeywords.trim() || undefined,
        isActive,
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

  // Bundle handlers
  const handleSaveBundle = (bundle: ProductBundle) => {
    if (editingBundle) {
      if (onUpdateBundle) onUpdateBundle(bundle);
      setToastMessage(`'${bundle.name}' বান্ডেলটি সফলভাবে আপডেট করা হয়েছে!`);
    } else {
      if (onAddBundle) onAddBundle(bundle);
      setToastMessage(`'${bundle.name}' নতুন বান্ডেলটি সফলভাবে তৈরি ও সংরক্ষণ করা হয়েছে!`);
    }
    setActiveSubTab('bundles');
    setIsBundleModalOpen(false);
    setEditingBundle(null);
  };

  const handleDeleteBundle = (bundleId: string, bundleName: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে '${bundleName}' বান্ডেলটি মুছে ফেলতে চান?`)) {
      if (onDeleteBundle) {
        onDeleteBundle(bundleId);
        setToastMessage(`'${bundleName}' বান্ডেলটি সফলভাবে ডিলিট করা হয়েছে!`);
      }
    }
  };

  // Bundle metrics
  const bundleMetrics = useMemo(() => {
    const list = bundles || [];
    const totalBundles = list.length;
    const totalReadySets = list.reduce((sum, b) => sum + getBundleStockInfo(b).count, 0);
    const maxSavings = list.length > 0
      ? Math.max(0, ...list.map((b) => {
          const reg = b.items.reduce((s, it) => s + (it.originalSellingPrice || 0) * (it.quantity || 1), 0);
          return reg - b.bundlePrice;
        }))
      : 0;
    const totalReadyProfit = list.reduce((sum, b) => {
      const readySets = getBundleStockInfo(b).count;
      const cost = b.items.reduce((s, it) => {
        const prod = products.find((p) => p.id === it.productId);
        return s + (prod?.purchasePrice || 0) * (it.quantity || 1);
      }, 0);
      const profitPerSet = b.bundlePrice - cost;
      return sum + (profitPerSet * readySets);
    }, 0);

    return { totalBundles, totalReadySets, maxSavings, totalReadyProfit };
  }, [bundles, products]);

  return (
    <div id="stock-management-view" className="space-y-4">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Tab Navigation Bar: Single Products vs Bundles */}
      <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            id="tab-single-products"
            onClick={() => setActiveSubTab('products')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'products'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span>একক পণ্য তালিকা</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.2 rounded-full font-bold">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-bundle-packages"
            onClick={() => setActiveSubTab('bundles')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'bundles'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-300" />
            <span>বান্ডেল ও কম্বো প্যাকেজ</span>
            <span className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
              activeSubTab === 'bundles' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {(bundles || []).length}
            </span>
          </button>
        </div>

        {activeSubTab === 'bundles' && (
          <button
            type="button"
            id="btn-create-new-bundle"
            onClick={() => {
              setEditingBundle(null);
              setIsBundleModalOpen(true);
            }}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বান্ডেল তৈরি করুন</span>
          </button>
        )}
      </div>

      {/* VIEW 1: SINGLE PRODUCTS */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
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

          {/* Website Sync Button */}
          {onOpenWebsiteSync && (
            <button
              id="btn-website-sync"
              onClick={onOpenWebsiteSync}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="কাস্টমার ওয়েবসাইট ekdor.net এ পণ্য, ক্যাটাগরি ও বান্ডেল সিঙ্ক করুন"
            >
              <Globe className="w-4 h-4 text-emerald-300" />
              <span>🌐 ওয়েবসাইট সিঙ্ক</span>
            </button>
          )}

          {/* Add Product Button */}
          <button
            id="btn-add-product"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
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
    </div>
  )}

      {/* VIEW 2: BUNDLES & COMBO PACKAGES */}
      {activeSubTab === 'bundles' && (
        <div className="space-y-4">
          {/* Bundle Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">মোট সক্রিয় বান্ডেল</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {bundleMetrics.totalBundles} টি প্যাকেজ
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">ইনভেন্টরি থেকে প্রস্তুত সেট</p>
                <p className="text-lg sm:text-xl font-bold text-blue-800 leading-tight">
                  {bundleMetrics.totalReadySets} সেট
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">প্রস্তুত স্টকে প্রত্যাশিত নিট লাভ</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-700 leading-tight">
                  {formatCurrency(bundleMetrics.totalReadyProfit)}
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">সর্বোচ্চ গ্রাহক সাশ্রয়</p>
                <p className="text-lg sm:text-xl font-bold text-indigo-700 leading-tight">
                  {formatCurrency(bundleMetrics.maxSavings)}
                </p>
              </div>
            </div>
          </div>

          {/* Bundle Search Bar & Action Header */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-bundles-input"
                type="text"
                value={bundleSearchTerm}
                onChange={(e) => setBundleSearchTerm(e.target.value)}
                placeholder="বান্ডেলের নাম, ক্যাটাগরি বা অন্তর্ভুক্ত পণ্য খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingBundle(null);
                setIsBundleModalOpen(true);
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন বান্ডেল তৈরি</span>
            </button>
          </div>

          {/* Bundles Grid */}
          {filteredBundles.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-100">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">কোনো বান্ডেল প্যাকেজ পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                একাধিক পণ্যকে একসাথে বান্ডেল তৈরি করে বিশেষ মূল্যে বিক্রি করুন। যেমন: হিজামা পেন + নিডেল বক্স + ৩২ কাপ সেট = ফুল সেট।
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingBundle(null);
                  setIsBundleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>প্রথম বান্ডেল তৈরি করুন</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBundles.map((bundle) => {
                const stockInfo = getBundleStockInfo(bundle);
                const regularTotal = bundle.items.reduce(
                  (sum, it) => sum + (it.originalSellingPrice || 0) * (it.quantity || 1),
                  0
                );
                const bundleCost = bundle.items.reduce((sum, it) => {
                  const prod = products.find((p) => p.id === it.productId);
                  return sum + (prod?.purchasePrice || 0) * (it.quantity || 1);
                }, 0);
                const bundleProfit = bundle.bundlePrice - bundleCost;
                const bundleMargin = bundle.bundlePrice > 0 ? ((bundleProfit / bundle.bundlePrice) * 100).toFixed(1) : '0.0';
                const savings = Math.max(0, regularTotal - bundle.bundlePrice);
                const savingsPercent = regularTotal > 0 ? ((savings / regularTotal) * 100).toFixed(1) : 0;

                return (
                  <div
                    key={bundle.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-white p-4 border-b border-slate-200/80 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200/60">
                              {bundle.category || 'বান্ডেল'}
                            </span>
                            {savings > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {formatCurrency(savings)} ছাড় ({savingsPercent}%)
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                            {bundle.name}
                          </h3>
                          {bundle.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {bundle.description}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons: Edit & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBundle(bundle);
                              setIsBundleModalOpen(true);
                            }}
                            className="p-1.5 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                            title="বান্ডেল সম্পাদনা করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBundle(bundle.id, bundle.name)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="বান্ডেল ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Pricing & Profit Details Block */}
                      <div className="p-4 bg-teal-50/40 border-b border-teal-100/60 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">
                              বান্ডেল বিক্রয় দর
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg sm:text-xl font-black text-teal-900">
                                {formatCurrency(bundle.bundlePrice)}
                              </span>
                              {regularTotal > bundle.bundlePrice && (
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  {formatCurrency(regularTotal)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Available Sets Stock Badge */}
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">
                              প্রস্তুত স্টক
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                              stockInfo.count === 0
                                ? 'bg-rose-100 text-rose-700'
                                : stockInfo.count <= 3
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              <Package className="w-3.5 h-3.5" />
                              <span>{stockInfo.count} সেট সম্ভব</span>
                            </span>
                          </div>
                        </div>

                        {/* Cost & Profit Row */}
                        <div className="grid grid-cols-2 gap-2 bg-white/80 p-2 rounded-xl border border-teal-100 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">উপাদান ক্রয় খরচ</span>
                            <span className="font-bold text-slate-700">{formatCurrency(bundleCost)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">
                              {bundleProfit < 0 ? '⚠️ নিট লোকসান' : '💰 নিট লাভ (প্রতি সেট)'}
                            </span>
                            <span className={`font-black ${bundleProfit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {bundleProfit >= 0 ? `+${formatCurrency(bundleProfit)}` : `-${formatCurrency(Math.abs(bundleProfit))}`}
                              <span className="text-[10px] font-bold text-slate-500 ml-1">({bundleMargin}%)</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Component Items List */}
                      <div className="p-4 space-y-2">
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">
                          অন্তর্ভুক্ত উপাদান পণ্যসমূহ ({bundle.items.length}টি):
                        </span>
                        <div className="space-y-1.5">
                          {bundle.items.map((it, idx) => {
                            const prod = products.find((p) => p.id === it.productId);
                            const itemStock = prod ? prod.stockQty : 0;
                            const isLow = itemStock <= 3;
                            const itemCost = (prod?.purchasePrice || 0) * (it.quantity || 1);
                            const itemRevenue = (it.bundleSellingPrice || 0) * (it.quantity || 1);
                            const itemProfit = itemRevenue - itemCost;

                            return (
                              <div
                                key={it.productId || idx}
                                className="text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-slate-800 block truncate">
                                    {it.productName}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                                    <span>পরিমাণ: {it.quantity} {it.unit}</span>
                                    <span>•</span>
                                    <span>ক্রয়: {formatCurrency(prod?.purchasePrice || 0)}</span>
                                    <span>•</span>
                                    <span className={isLow ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                                      স্টক: {itemStock} {it.unit}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="font-bold text-teal-950 block">
                                    {formatCurrency(it.bundleSellingPrice)}
                                  </span>
                                  <span className={`text-[10px] font-bold block ${itemProfit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    {itemProfit >= 0 ? `+${formatCurrency(itemProfit)}` : `-${formatCurrency(Math.abs(itemProfit))}`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Stock Alert or Quick Edit */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                      {stockInfo.bottleneck && stockInfo.count <= 3 ? (
                        <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 truncate">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{stockInfo.bottleneck.name}-এর স্টক কম ({stockInfo.bottleneck.stock} পিস)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          বিক্রির সময় উপাদানগুলোর স্টক স্বয়ংক্রিয়ভাবে কমবে
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingBundle(bundle);
                          setIsBundleModalOpen(true);
                        }}
                        className="text-teal-700 hover:text-teal-900 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>সম্পাদনা</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ক্রয়মূল্য <span className="text-rose-500">*</span>
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
                    বিক্রি মূল্য <span className="text-rose-500">*</span>
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
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    রেগুলার দর (ছাড়ের পূর্বে)
                  </label>
                  <MoneyInput
                    id="input-product-regular-price"
                    min={0}
                    value={regularPrice}
                    onChange={setRegularPrice}
                    placeholder="যেমন 750"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600"
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

              {/* Website Settings Section */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                    <Globe className="w-4 h-4 text-emerald-700" />
                    <span>🌐 কাস্টমার ওয়েবসাইট সেটিংস (ekdor.net)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-900">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>ওয়েবসাইটে লাইভ দেখাবে</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ছবির লিংক (Image URL)
                    </label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://...image.webp"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ভিডিওর লিংক (YouTube URL)
                    </label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtu.be/..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {imageUrl && (
                  <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                    <img 
                      src={imageUrl} 
                      alt="Product Preview" 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                      onError={(e) => { (e.target as any).style.display = 'none'; }}
                    />
                    <span className="text-[11px] text-slate-500 truncate">ছবির প্রিভিউ</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    পণ্যের বিস্তারিত বিবরণ / বর্ণনা
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="পণ্য সম্পর্কে বিস্তারিত তথ্য লিখুন..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* 3 Zone Delivery Charges */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    এলাকাভিত্তিক কুরিয়ার ডেলিভারি চার্জ (টাকা)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">ঢাকা সিটি</span>
                      <MoneyInput
                        id="input-delivery-dhaka"
                        min={0}
                        value={deliveryDhaka}
                        onChange={setDeliveryDhaka}
                        placeholder="70"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white font-semibold text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">পার্শ্ববর্তী</span>
                      <MoneyInput
                        id="input-delivery-sub-dhaka"
                        min={0}
                        value={deliverySubDhaka}
                        onChange={setDeliverySubDhaka}
                        placeholder="100"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white font-semibold text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">ঢাকার বাইরে</span>
                      <MoneyInput
                        id="input-delivery-outside"
                        min={0}
                        value={deliveryOutside}
                        onChange={setDeliveryOutside}
                        placeholder="130"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white font-semibold text-center"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সার্চ কি-ওয়ার্ড (কমা দিয়ে আলাদা করুন)
                  </label>
                  <input
                    type="text"
                    value={searchKeywords}
                    onChange={(e) => setSearchKeywords(e.target.value)}
                    placeholder="যেমন: hijama set, ১২ কাপ হিজামা..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ওজন (কেজি)</label>
                  <MoneyInput
                    id="input-product-weight-kg"
                    min={0}
                    value={weightKg}
                    onChange={setWeightKg}
                    placeholder="0.5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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

      {/* BUNDLE CREATE / EDIT MODAL */}
      <BundleModal
        isOpen={isBundleModalOpen}
        onClose={() => {
          setIsBundleModalOpen(false);
          setEditingBundle(null);
        }}
        bundleToEdit={editingBundle}
        products={products}
        onSaveBundle={handleSaveBundle}
      />
    </div>
  );
};
