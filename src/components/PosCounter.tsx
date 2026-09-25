import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  ProductBundle,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
} from '../types';
import { formatCurrency } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  UserPlus,
  Package,
  Layers,
  Percent,
  Truck,
  CreditCard,
  CheckCircle,
  X,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface PosCounterProps {
  products: Product[];
  bundles: ProductBundle[];
  customers: Customer[];
  initialCustomerId: string | null;
  onClearInitialCustomerId: () => void;
  editingOrder: Order | null;
  onCancelEdit: () => void;
  onCompleteSale: (order: Order) => void;
  onUpdateOrder: (updatedOrder: Order, originalOrder: Order) => void;
  onQuickAddCustomer: (customer: Customer) => void;
  onOpenBundleManagement: () => void;
}

export const PosCounter: React.FC<PosCounterProps> = ({
  products,
  bundles,
  customers,
  initialCustomerId,
  onClearInitialCustomerId,
  editingOrder,
  onCancelEdit,
  onCompleteSale,
  onUpdateOrder,
  onQuickAddCustomer,
  onOpenBundleManagement,
}) => {
  // Cart Items
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderType, setOrderType] = useState<'cash' | 'courier' | 'online' | 'due'>('cash');
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [courierName, setCourierName] = useState<string>('Steadfast');
  const [courierTrackingCode, setCourierTrackingCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('confirmed');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [itemTypeView, setItemTypeView] = useState<'products' | 'bundles'>('products');

  // Quick Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Preselected customer from props
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      onClearInitialCustomerId();
    }
  }, [initialCustomerId]);

  // Load editing order
  useEffect(() => {
    if (editingOrder) {
      setCart(editingOrder.items.map((i) => ({ ...i })));
      setSelectedCustomerId(editingOrder.customerId || '');
      setOrderType(editingOrder.orderType || 'cash');
      setDiscount(editingOrder.discount || 0);
      setDeliveryCharge(editingOrder.deliveryCharge || 0);
      setPaidAmount(editingOrder.paidAmount || 0);
      setPaymentMethod(editingOrder.paymentMethod || 'cash');
      setCourierName(editingOrder.courierName || 'Steadfast');
      setCourierTrackingCode(editingOrder.courierTrackingCode || '');
      setNotes(editingOrder.notes || '');
      setOrderStatus(editingOrder.status || 'confirmed');
    } else {
      setCart([]);
      setDiscount(0);
      setDeliveryCharge(0);
      setPaidAmount(0);
      setNotes('');
      setOrderStatus('confirmed');
    }
  }, [editingOrder]);

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
      const matchCat = activeCategory === 'all' || p.category === activeCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, searchQuery, activeCategory]);

  // Filtered bundles
  const filteredBundles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bundles.filter((b) => {
      return (
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q)
      );
    });
  }, [bundles, searchQuery]);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          subtotal: product.sellingPrice,
        },
      ];
    });
  };

  const handleAddBundleToCart = (bundle: ProductBundle) => {
    bundle.items.forEach((bItem) => {
      const prod = products.find((p) => p.id === bItem.productId);
      const price = bItem.bundleSellingPrice || (prod ? prod.sellingPrice : 0);
      const cost = prod ? prod.purchasePrice : 0;
      const name = bItem.productName || (prod ? prod.name : 'পণ্য');

      setCart((prev) => {
        const existing = prev.find((i) => i.productId === bItem.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === bItem.productId
              ? {
                  ...i,
                  quantity: i.quantity + bItem.quantity,
                  subtotal: (i.quantity + bItem.quantity) * i.unitPrice,
                }
              : i
          );
        }
        return [
          ...prev,
          {
            productId: bItem.productId,
            productName: name,
            quantity: bItem.quantity,
            unitPrice: price,
            purchasePrice: cost,
            subtotal: price * bItem.quantity,
          },
        ];
      });
    });

    if (bundle.defaultDeliveryCharge && orderType === 'online') {
      setDeliveryCharge(bundle.defaultDeliveryCharge);
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              subtotal: nextQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[];
    });
  };

  const handleUpdateItemPrice = (productId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              unitPrice: newPrice,
              subtotal: item.quantity * newPrice,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.subtotal || item.unitPrice * item.quantity), 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    const base = Math.max(0, subtotal - (discount || 0));
    const extra = (orderType === 'online' || orderType === 'courier') ? (deliveryCharge || 0) : 0;
    return base + extra;
  }, [subtotal, discount, deliveryCharge, orderType]);

  // Selected customer
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Set default paidAmount when grandTotal changes if not editing
  useEffect(() => {
    if (!editingOrder) {
      if (orderType === 'cash') {
        setPaidAmount(grandTotal);
      } else if (orderType === 'due') {
        setPaidAmount(0);
      } else if (orderType === 'online' || orderType === 'courier') {
        // usually advance delivery charge paid, rest COD
        setPaidAmount(deliveryCharge);
      }
    }
  }, [grandTotal, orderType, editingOrder]);

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - (paidAmount || 0));
  }, [grandTotal, paidAmount]);

  const codAmount = useMemo(() => {
    if (orderType === 'online' || orderType === 'courier') {
      return Math.max(0, grandTotal - (paidAmount || 0));
    }
    return 0;
  }, [orderType, grandTotal, paidAmount]);

  // Submit sale / update
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি পণ্য বা বান্ডেল কার্টে যোগ করুন!');
      return;
    }

    const orderData: Order = {
      id: editingOrder ? editingOrder.id : `ord-${Date.now()}`,
      invoiceNumber: editingOrder ? editingOrder.invoiceNumber : `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: editingOrder ? editingOrder.date : new Date().toISOString(),
      orderType,
      customerId: selectedCustomer ? selectedCustomer.id : undefined,
      customerName: selectedCustomer ? selectedCustomer.name : undefined,
      customerPhone: selectedCustomer ? selectedCustomer.phone : undefined,
      customerAddress: selectedCustomer ? selectedCustomer.address : undefined,
      items: cart,
      subtotal,
      discount,
      deliveryCharge: (orderType === 'online' || orderType === 'courier') ? deliveryCharge : 0,
      grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod,
      status: orderStatus,
      courierName: (orderType === 'online' || orderType === 'courier') ? courierName : undefined,
      courierTrackingCode: (orderType === 'online' || orderType === 'courier') ? courierTrackingCode : undefined,
      codAmount,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (editingOrder) {
      onUpdateOrder(orderData, editingOrder);
    } else {
      onCompleteSale(orderData);
    }
  };

  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('গ্রাহকের নাম ও ফোন নম্বর আবশ্যক!');
      return;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      whatsappPhone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      totalPurchased: 0,
      totalPaid: 0,
      totalDue: 0,
      advanceBalance: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onQuickAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-12">
      {/* LEFT: PRODUCTS & BUNDLES SELECTION (7 COLS) */}
      <div className="lg:col-span-7 space-y-3">
        {/* Top bar: Mode Switcher & Search */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Toggle: Products vs Bundles */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setItemTypeView('products')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  itemTypeView === 'products'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>একক পণ্য ({products.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setItemTypeView('bundles')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  itemTypeView === 'bundles'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>কম্বো / বান্ডেল ({bundles.length})</span>
              </button>
            </div>

            {/* Bundle management link */}
            <button
              type="button"
              onClick={onOpenBundleManagement}
              className="text-xs text-teal-700 font-semibold hover:underline flex items-center justify-end gap-1 cursor-pointer"
            >
              <span>+ নতুন বান্ডেল তৈরি</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                itemTypeView === 'products'
                  ? 'পণ্যের নাম, কোড বা বারকোড খুঁজুন...'
                  : 'বান্ডেল বা প্যাকেজের নাম দিয়ে খুঁজুন...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs for Products */}
          {itemTypeView === 'products' && categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সব পণ্য
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCTS GRID */}
        {itemTypeView === 'products' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.map((prod) => {
              const inCartItem = cart.find((i) => i.productId === prod.id);
              const isLowStock = prod.stockQty <= prod.minStockAlert;

              return (
                <div
                  key={prod.id}
                  onClick={() => handleAddToCart(prod)}
                  className={`p-3 bg-white rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-emerald-300 relative group ${
                    inCartItem ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] text-slate-400 font-mono">{prod.code || prod.sku || 'N/A'}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          prod.stockQty <= 0
                            ? 'bg-rose-100 text-rose-700'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        স্টক: {prod.stockQty} {prod.unit || 'টি'}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                      {prod.name}
                    </h4>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-emerald-700">
                      {formatCurrency(prod.sellingPrice)}
                    </span>
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                        inCartItem ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                কোনো পণ্য খুঁজে পাওয়া যায়নি।
              </div>
            )}
          </div>
        )}

        {/* BUNDLES GRID */}
        {itemTypeView === 'bundles' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredBundles.map((bun) => (
              <div
                key={bun.id}
                onClick={() => handleAddBundleToCart(bun)}
                className="p-4 bg-white rounded-2xl border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      {bun.category || 'প্যাকেজ'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {bun.items.length}টি আইটেম
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{bun.name}</h4>
                  {bun.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{bun.description}</p>
                  )}

                  {/* Included items preview */}
                  <div className="space-y-1 mb-2">
                    {bun.items.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                        <span className="truncate">{it.productName || 'পণ্য'}</span>
                        <span className="text-slate-400">×{it.quantity}</span>
                      </div>
                    ))}
                    {bun.items.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        + আরো {bun.items.length - 3}টি
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-base font-extrabold text-teal-700">
                    {formatCurrency(bun.bundlePrice)}
                  </span>
                  <button
                    type="button"
                    className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 group-hover:bg-teal-700 transition"
                  >
                    <span>যোগ করুন</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredBundles.length === 0 && (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                কোনো বান্ডেল প্যাকেজ পাওয়া যায়নি।
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: CART & BILLING PANEL (5 COLS) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Cart Header */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {editingOrder ? `চালান #${editingOrder.invoiceNumber} এডিট` : 'বিক্রয় রশিদ ও কার্ট'}
              </h3>
              <p className="text-[11px] text-slate-400">{cart.length}টি পণ্য নির্বাচিত</p>
            </div>
          </div>

          {editingOrder && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs text-rose-300 hover:text-rose-100 font-semibold underline cursor-pointer"
            >
              এডিট বাতিল
            </button>
          )}
        </div>

        {/* Customer Selector & Type Selector */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 space-y-2.5">
          {/* Order Type Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setOrderType('cash')}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                orderType === 'cash' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              নগদ বিক্রয়
            </button>
            <button
              type="button"
              onClick={() => setOrderType('online')}
              className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                orderType === 'online' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3 h-3 text-blue-600" />
              <span>অনলাইন/কুরিয়ার</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderType('due')}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                orderType === 'due' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাকি
            </button>
            <button
              type="button"
              onClick={() => setOrderType('courier')}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                orderType === 'courier' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সিওডি
            </button>
          </div>

          {/* Customer Selection */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- সাধারণ গ্রাহক (Walk-in Customer) --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.totalDue > 0 ? `• বাকি: ৳${c.totalDue}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
              title="নতুন গ্রাহক যুক্ত করুন"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>নতুন</span>
            </button>
          </div>

          {selectedCustomer && (
            <div className="bg-emerald-50/80 border border-emerald-200 p-2 rounded-xl text-[11px] flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950">{selectedCustomer.name}</span>
                <span className="text-emerald-700 ml-1.5">({selectedCustomer.phone})</span>
              </div>
              <div className="space-x-2">
                {selectedCustomer.totalDue > 0 && (
                  <span className="text-rose-600 font-bold">পূর্বের বাকি: ৳{selectedCustomer.totalDue}</span>
                )}
                {selectedCustomer.advanceBalance && selectedCustomer.advanceBalance > 0 ? (
                  <span className="text-teal-700 font-bold">অগ্রিম জমা: ৳{selectedCustomer.advanceBalance}</span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px]">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 truncate">{item.productName}</div>
                <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                  <div className="flex items-center gap-1">
                    <span>দর:</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-semibold"
                    />
                  </div>
                  <span>= {formatCurrency(item.subtotal)}</span>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleUpdateQuantity(item.productId, -1)}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-bold text-slate-900">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => handleUpdateQuantity(item.productId, 1)}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.productId)}
                  className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              কার্টে কোনো পণ্য নেই। বাম পাশ থেকে পণ্য যোগ করুন।
            </div>
          )}
        </div>

        {/* Courier / Shipping Details if Online */}
        {(orderType === 'online' || orderType === 'courier') && (
          <div className="p-3 bg-blue-50/50 border-t border-slate-200 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">কুরিয়ার</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Steadfast">Steadfast Courier</option>
                  <option value="Pathao">Pathao Courier</option>
                  <option value="RedX">RedX</option>
                  <option value="Sundarban">সুন্দরবন কুরিয়ার</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">ট্র্যাকিং নম্বর</label>
                <input
                  type="text"
                  placeholder="যেমন: STF12345"
                  value={courierTrackingCode}
                  onChange={(e) => setCourierTrackingCode(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Billing Calculation Panel */}
        <form onSubmit={handleSubmit} className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>উপমোট:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span>ছাড় (৳):</span>
              <MoneyInput
                value={discount}
                onChange={(val) => setDiscount(val)}
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-semibold text-xs"
              />
            </div>

            {(orderType === 'online' || orderType === 'courier') && (
              <div className="flex items-center justify-between gap-2">
                <span>ডেলিভারি চার্জ (৳):</span>
                <MoneyInput
                  value={deliveryCharge}
                  onChange={(val) => setDeliveryCharge(val)}
                  className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-semibold text-xs"
                />
              </div>
            )}

            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-sm sm:text-base text-slate-900">
              <span>সর্বমোট:</span>
              <span className="text-emerald-700">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-emerald-800">জমা / পরিশোধ (৳):</span>
              <MoneyInput
                value={paidAmount}
                onChange={(val) => setPaidAmount(val)}
                className="w-28 px-2 py-1 bg-white border border-emerald-400 rounded-lg text-right font-bold text-emerald-700 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {dueAmount > 0 && (
              <div className="flex justify-between font-bold text-rose-600">
                <span>বাকি থাকবে:</span>
                <span>{formatCurrency(dueAmount)}</span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px] shrink-0">পেমেন্ট:</span>
            <div className="flex gap-1 flex-1">
              {['cash', 'bkash', 'nagad', 'bank'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
                    paymentMethod === method
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={cart.length === 0}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-sm transition cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{editingOrder ? 'অর্ডার আপডেট করুন' : 'বিক্রি সম্পন্ন করুন (রশিদ দেখুন)'}</span>
          </button>
        </form>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>নতুন গ্রাহক যুক্ত করুন</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">গ্রাহকের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মো: করিম"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">মোবাইল নম্বর *</label>
                <input
                  type="text"
                  required
                  placeholder="০১৭xxxxxxxx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="ঠিকানা..."
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
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
