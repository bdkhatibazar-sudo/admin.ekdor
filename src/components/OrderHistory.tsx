import React, { useState, useMemo } from 'react';
import { Order, Product, Customer, OrderItem, OrderStatus, StoreSettings } from '../types';
import { formatCurrency, formatDateTime, resolveWhatsAppNumber, createWhatsAppUrl } from '../utils/formatters';
import { createSteadfastOrder } from '../services/steadfast';
import { MoneyInput } from './MoneyInput';
import { 
  Search, 
  Calendar, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  Plus, 
  Minus, 
  Check, 
  AlertTriangle,
  Receipt,
  FileText,
  Printer,
  Truck,
  RotateCcw,
  Ban,
  CheckCircle2,
  Clock,
  Send,
  MessageCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  PackageCheck,
  Zap,
  Loader2
} from 'lucide-react';

interface OrderHistoryProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  settings?: StoreSettings;
  onViewReceipt: (order: Order) => void;
  onUpdateOrder: (updatedOrder: Order, originalOrder: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onUpdateOrderStatus: (
    orderId: string, 
    newStatus: OrderStatus, 
    options?: { courierName?: string; trackingCode?: string; returnLossAmount?: number }
  ) => void;
  onEditInPos?: (order: Order) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  products,
  customers,
  settings,
  onViewReceipt,
  onUpdateOrder,
  onDeleteOrder,
  onUpdateOrderStatus,
  onEditInPos,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'store' | 'online'>('all');

  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [originalEditingOrder, setOriginalEditingOrder] = useState<Order | null>(null);
  const [addProductId, setAddProductId] = useState('');
  const [editProductSearch, setEditProductSearch] = useState('');

  // Courier Shipping Modal State
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  const [shippingCourier, setShippingCourier] = useState('Steadfast Courier');
  const [shippingTrackingCode, setShippingTrackingCode] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [isCallingSteadfast, setIsCallingSteadfast] = useState(false);
  const [steadfastError, setSteadfastError] = useState<string | null>(null);

  // Filter logic
  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return orders.filter((order) => {
      const orderDate = new Date(order.date);

      // Date match
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = orderDate >= today;
      } else if (dateFilter === 'yesterday') {
        const orderDay = new Date(orderDate);
        orderDay.setHours(0, 0, 0, 0);
        matchesDate = orderDay.getTime() === yesterday.getTime();
      } else if (dateFilter === 'this_month') {
        matchesDate = orderDate >= startOfMonth;
      }

      // Status match
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = order.status === statusFilter;
      }

      // Type match
      let matchesType = true;
      if (typeFilter !== 'all') {
        matchesType = order.orderType === typeFilter;
      }

      // Search match
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.invoiceNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (order.customerPhone && order.customerPhone.includes(q)) ||
        (order.courierTrackingCode && order.courierTrackingCode.toLowerCase().includes(q));

      return matchesDate && matchesStatus && matchesType && matchesSearch;
    });
  }, [orders, dateFilter, statusFilter, typeFilter, searchTerm]);

  // Handle Edit initiation
  const handleStartEdit = (order: Order) => {
    setOriginalEditingOrder(JSON.parse(JSON.stringify(order)));
    setEditingOrder(JSON.parse(JSON.stringify(order)));
    setAddProductId('');
    setEditProductSearch('');
  };

  // Quick add product by ID in edit modal
  const handleAddProductById = (prodId: string) => {
    if (!editingOrder || !prodId) return;
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const existing = editingOrder.items.find((it) => it.productId === prod.id);
    let updatedItems: OrderItem[];
    if (existing) {
      updatedItems = editingOrder.items.map((it) =>
        it.productId === prod.id
          ? { ...it, quantity: it.quantity + 1, total: (it.quantity + 1) * it.unitPrice }
          : it
      );
    } else {
      updatedItems = [
        ...editingOrder.items,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unit: prod.unit,
          unitPrice: prod.sellingPrice,
          purchasePrice: prod.purchasePrice,
          total: prod.sellingPrice,
        },
      ];
    }
    recalcEditingOrder(updatedItems, editingOrder.discount, editingOrder.paidAmount);
  };

  // Products filtered for the edit order modal
  const editMatchingProducts = useMemo(() => {
    if (!editProductSearch.trim()) {
      return products.slice(0, 6);
    }
    const q = editProductSearch.toLowerCase().trim();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.banglaName && p.banglaName.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q))
    ).slice(0, 10);
  }, [products, editProductSearch]);

  // Edit item quantity
  const handleEditItemQty = (productId: string, newQty: number) => {
    if (!editingOrder) return;
    if (newQty <= 0) {
      handleRemoveEditItem(productId);
      return;
    }

    const updatedItems = editingOrder.items.map((it) => {
      if (it.productId === productId) {
        return {
          ...it,
          quantity: newQty,
          total: Math.round(newQty * it.unitPrice),
        };
      }
      return it;
    });

    recalcEditingOrder(updatedItems, editingOrder.discount, editingOrder.paidAmount);
  };

  // Remove item from edit
  const handleRemoveEditItem = (productId: string) => {
    if (!editingOrder) return;
    if (editingOrder.items.length <= 1) {
      alert('অর্ডারে কমপক্ষে ১টি পণ্য থাকতে হবে! আপনি চাইলে সম্পূর্ণ অর্ডার বাতিল করতে পারেন।');
      return;
    }
    const updatedItems = editingOrder.items.filter((it) => it.productId !== productId);
    recalcEditingOrder(updatedItems, editingOrder.discount, editingOrder.paidAmount);
  };

  // Add product to editing order
  const handleAddProductToEdit = () => {
    if (!editingOrder || !addProductId) return;
    const prod = products.find((p) => p.id === addProductId);
    if (!prod) return;

    const existing = editingOrder.items.find((it) => it.productId === prod.id);
    let updatedItems: OrderItem[];
    if (existing) {
      updatedItems = editingOrder.items.map((it) =>
        it.productId === prod.id
          ? { ...it, quantity: it.quantity + 1, total: (it.quantity + 1) * it.unitPrice }
          : it
      );
    } else {
      updatedItems = [
        ...editingOrder.items,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unit: prod.unit,
          unitPrice: prod.sellingPrice,
          purchasePrice: prod.purchasePrice,
          total: prod.sellingPrice,
        },
      ];
    }

    setAddProductId('');
    recalcEditingOrder(updatedItems, editingOrder.discount, editingOrder.paidAmount);
  };

  // Recalculate totals during edit
  const recalcEditingOrder = (items: OrderItem[], discountVal: number, paidVal: number) => {
    if (!editingOrder) return;
    const newSubtotal = items.reduce((sum, it) => sum + it.total, 0);
    const dCharge = editingOrder.deliveryCharge || 0;
    const newGrandTotal = Math.max(0, newSubtotal - (discountVal || 0) + dCharge);
    
    let newDue = 0;
    let newCod = 0;
    let newCourierDeliveryCost = editingOrder.courierDeliveryCost || dCharge || 130;
    let newCourierCodFee = editingOrder.courierCodFee || 0;
    let newCourierNetPayable = editingOrder.courierNetPayable;

    if (editingOrder.orderType === 'online') {
      newCod = Math.max(0, newGrandTotal - (paidVal || 0));
      const rem = Math.max(0, newCod - newCourierDeliveryCost);
      newCourierCodFee = newCod > 0 ? Math.max(1, Math.round(rem * 0.01)) : 0;
      newCourierNetPayable = Math.max(0, newCod - newCourierDeliveryCost - newCourierCodFee);
    } else {
      newDue = Math.max(0, newGrandTotal - (paidVal || 0));
    }

    setEditingOrder({
      ...editingOrder,
      items,
      subtotal: newSubtotal,
      discount: discountVal,
      grandTotal: newGrandTotal,
      paidAmount: paidVal,
      dueAmount: newDue,
      codAmount: newCod,
      courierDeliveryCost: newCourierDeliveryCost,
      courierCodFee: newCourierCodFee,
      courierNetPayable: newCourierNetPayable,
    });
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !originalEditingOrder) return;

    const finalOrder: Order = {
      ...editingOrder,
      updatedAt: new Date().toISOString(),
    };

    onUpdateOrder(finalOrder, originalEditingOrder);
    setEditingOrder(null);
    setOriginalEditingOrder(null);
  };

  // Send WhatsApp bill message to customer
  const handleSendWhatsAppBill = (order: Order) => {
    const itemsText = order.items
      .map((it, idx) => `${idx + 1}. ${it.productName} (${it.quantity} ${it.unit}) - ৳${it.total}`)
      .join('\n');

    const statusBangla = {
      draft: 'ড্রাফট কোটেশন',
      confirmed: 'অর্ডার কনফার্মড',
      processing: 'প্রস্তুত হচ্ছে',
      shipped: `কুরিয়ারে পাঠানো হয়েছে (${order.courierName || 'কুরিয়ার'})`,
      delivered: 'ডেলিভার্ড ও পেইড',
      cancelled: 'বাতিল',
      returned: 'পার্সেল রিটার্ন',
    }[order.status] || order.status;

    const message = 
`*একদর ডট নেট (Ekdor.net)*
*অর্ডার ইনভয়েস: #${order.invoiceNumber}*

সম্মানিত গ্রাহক: ${order.customerName}
অর্ডার স্ট্যাটাস: *${statusBangla}*
-----------------------------
${itemsText}
-----------------------------
পণ্যের মূল্য: ৳${order.subtotal}
${order.discount > 0 ? `ছাড়: -৳${order.discount}\n` : ''}${order.deliveryCharge > 0 ? `ডেলিভারি চার্জ: +৳${order.deliveryCharge}\n` : ''}*সর্বমোট বিল: ৳${order.grandTotal}*
${order.paidAmount > 0 ? `পরিশোধিত/অগ্রিম: ৳${order.paidAmount}\n` : ''}${order.codAmount > 0 ? `*কুরিয়ারে ডেলিভারির সময় প্রদেয় (COD): ৳${order.codAmount}*\n` : ''}${order.dueAmount > 0 ? `*বাকি টাকা: ৳${order.dueAmount}*\n` : ''}${order.courierTrackingCode ? `কুরিয়ার ট্র্যাকিং কোড: ${order.courierTrackingCode}\n` : ''}${order.deliveryAddress ? `ডেলিভারি ঠিকানা: ${order.deliveryAddress}\n` : ''}-----------------------------
একদর ডট নেট থেকে কেনাকাটা করার জন্য ধন্যবাদ! যেকোনো প্রয়োজনে যোগাযোগ করুন।`;

    const targetWa = resolveWhatsAppNumber(order.customerWhatsapp, order.customerPhone);
    const waUrl = createWhatsAppUrl(targetWa, message);
    window.open(waUrl, '_blank');
  };

  // Open Courier Shipping Booking
  const handleOpenShipping = (order: Order) => {
    setShippingOrder(order);
    setShippingCourier(order.courierName || 'Steadfast Courier');
    setShippingTrackingCode(order.courierTrackingCode || '');
    setBookingSuccess(null);
    setSteadfastError(null);
  };

  // 1-Click Direct API Booking with Steadfast
  const handleSteadfastApiBooking = async () => {
    if (!shippingOrder) return;
    if (!settings) {
      setSteadfastError('দোকান সেটিংস পাওয়া যায়নি। অনুগ্রহ করে ম্যানুয়ালি কনসাইনমেন্ট আইডি লিখুন।');
      return;
    }

    try {
      setIsCallingSteadfast(true);
      setSteadfastError(null);
      const res = await createSteadfastOrder(shippingOrder, settings);

      if (res.success && (res.consignmentId || res.trackingCode)) {
        const cId = res.consignmentId || res.trackingCode || '';
        setShippingTrackingCode(cId);
        setBookingSuccess(`স্টেডফাস্টে সরাসরি বুকিং সফল হয়েছে! কনসাইনমেন্ট আইডি: ${cId}`);
        // Also update order status
        onUpdateOrderStatus(shippingOrder.id, 'shipped', {
          courierName: 'Steadfast Courier',
          trackingCode: cId,
        });
      } else {
        setSteadfastError(res.message || 'বুকিং ব্যর্থ হয়েছে। অনুগ্রহ করে কনসাইনমেন্ট আইডি ম্যানুয়ালি লিখুন।');
      }
    } catch (err: any) {
      setSteadfastError(err?.message || 'স্টেডফাস্ট সার্ভারে সংযোগ করা যায়নি। ম্যানুয়ালি আইডি লিখুন।');
    } finally {
      setIsCallingSteadfast(false);
    }
  };

  // Confirm Courier Dispatch / Save Consignment
  const handleConfirmShipping = () => {
    if (!shippingOrder) return;
    const tracking = shippingTrackingCode.trim();

    onUpdateOrderStatus(shippingOrder.id, 'shipped', {
      courierName: shippingCourier,
      trackingCode: tracking,
    });

    setBookingSuccess(`পার্সেল সফলভাবে ${shippingCourier}-এ বুকিং করা হয়েছে! ট্র্যাকিং কোড: ${tracking || 'ম্যানুয়েল'}`);
    setTimeout(() => {
      setShippingOrder(null);
      setBookingSuccess(null);
      setSteadfastError(null);
    }, 1500);
  };

  // Handle Return RTO (Package Returned from Courier)
  const handleMarkReturn = (order: Order) => {
    const lossAmt = order.deliveryCharge || 120;
    const confirmMsg = 
`সতর্কতা: পার্সেলটি রিটার্ন হিসেবে চিহ্নিত করলে:
১. অর্ডারভুক্ত পণ্যসমূহ স্বয়ংক্রিয়ভাবে আবার স্টকে ফেরত যোগ হবে।
২. কুরিয়ারের ডেলিভারি চার্জ (৳${lossAmt}) আপনার পকেট থেকে দোকান খরচে 'কুরিয়ার রিটার্ন ক্ষতি' হিসেবে যুক্ত হবে।

আপনি কি পার্সেলটি রিটার্ন চিহ্নিত করতে চান?`;

    if (confirm(confirmMsg)) {
      onUpdateOrderStatus(order.id, 'returned', {
        returnLossAmount: lossAmt,
      });
      alert(`অর্ডার #${order.invoiceNumber} রিটার্ন হিসেবে রেকর্ড হয়েছে এবং ৳${lossAmt} ডেলিভারি লোকসান দোকান খরচে যোগ হয়েছে।`);
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = (order: Order) => {
    if (confirm(`আপনি কি চালান #${order.invoiceNumber} বাতিল করতে চান? পণ্যসমূহ স্টকে ফেরত দেওয়া হবে।`)) {
      onUpdateOrderStatus(order.id, 'cancelled');
    }
  };

  // Handle Re-activate / Re-confirm Order (e.g. Next day customer calls back to confirm)
  const handleReactivateOrder = (order: Order) => {
    if (confirm(`গ্রাহক অর্ডারটি নিশ্চিত করেছেন? পুনরায় স্টক থেকে পণ্য বিয়োগ করে অর্ডারটি 'কনফার্ম' করা হবে।`)) {
      onUpdateOrderStatus(order.id, 'confirmed');
      alert(`অর্ডার #${order.invoiceNumber} সফলভাবে পুনরায় কনফার্ম করা হয়েছে!`);
    }
  };

  // Handle direct status change from table dropdown
  const handleDirectStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (newStatus === order.status) return;

    if (newStatus === 'shipped') {
      if (order.orderType === 'online') {
        handleOpenShipping(order);
      } else {
        onUpdateOrderStatus(order.id, 'shipped');
      }
      return;
    }

    if (newStatus === 'returned') {
      handleMarkReturn(order);
      return;
    }

    if (newStatus === 'cancelled') {
      handleCancelOrder(order);
      return;
    }

    if (newStatus === 'delivered') {
      if (confirm(`চালান #${order.invoiceNumber} কে 'ডেলিভার্ড' (পণ্য পৌঁছেছে ও কালেকশন সম্পন্ন) হিসেবে চিহ্নিত করবেন?`)) {
        onUpdateOrderStatus(order.id, 'delivered');
      }
      return;
    }

    if (newStatus === 'confirmed') {
      if (order.status === 'cancelled') {
        handleReactivateOrder(order);
      } else {
        onUpdateOrderStatus(order.id, 'confirmed');
      }
      return;
    }

    // draft, processing
    onUpdateOrderStatus(order.id, newStatus);
  };

  // Render status badge
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>ড্রাফট কোটেশন</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <PackageCheck className="w-3 h-3" />
            <span>কনফার্মড</span>
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
            <PackageCheck className="w-3 h-3" />
            <span>প্রসেসিং</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span>কুরিয়ারে পাঠানো হয়েছে</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>ডেলিভার্ড</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
            <Ban className="w-3 h-3" />
            <span>বাতিল (Cancelled)</span>
          </span>
        );
      case 'returned':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            <span>রিটার্ন (RTO)</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="order-history-view" className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-orders-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="চালান নং, কাস্টমারের নাম, ফোন বা কুরিয়ার ট্র্যাকিং..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Order Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">সকল মাধ্যম (দোকান + অনলাইন)</option>
            <option value="online">শুধু অনলাইন / কুরিয়ার</option>
            <option value="store">শুধু দোকানে বিক্রি</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">সকল স্ট্যাটাস</option>
            <option value="draft">ড্রাফট / কোটেশন</option>
            <option value="confirmed">কনফার্মড</option>
            <option value="processing">প্রসেসিং</option>
            <option value="shipped">কুরিয়ারে পাঠানো</option>
            <option value="delivered">ডেলিভার্ড</option>
            <option value="cancelled">বাতিলকৃত</option>
            <option value="returned">রিটার্ন (RTO)</option>
          </select>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            {[
              { id: 'all', label: 'সব' },
              { id: 'today', label: 'আজ' },
              { id: 'yesterday', label: 'গতকাল' },
              { id: 'this_month', label: 'চলতি মাস' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Orders Card View (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center text-slate-400 border border-slate-200">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-60" />
            <p className="font-medium text-slate-600">কোনো অর্ডার পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400 mt-1">অন্য কোনো ফিল্টার নির্বাচন করুন</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 ${
                order.status === 'cancelled' ? 'opacity-70 bg-slate-50' : ''
              }`}
            >
              {/* Header: Invoice + Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 font-mono text-sm">#{order.invoiceNumber}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    order.orderType === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {order.orderType === 'online' ? 'অনলাইন' : 'দোকান'}
                  </span>
                </div>
                <div>{renderStatusBadge(order.status)}</div>
              </div>

              {/* Customer & Bill Summary */}
              <div className="flex items-start justify-between text-xs pt-1 border-t border-slate-100">
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-sm truncate">{order.customerName}</p>
                  {order.customerPhone && <p className="text-slate-500 text-xs">{order.customerPhone}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(order.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-slate-400 text-[10px]">সর্বমোট বিল</p>
                  <p className="font-bold text-slate-900 text-base">৳{order.grandTotal}</p>
                  {order.dueAmount > 0 ? (
                    <p className="text-rose-600 font-bold text-xs">বাকি: ৳{order.dueAmount}</p>
                  ) : (
                    <p className="text-emerald-600 font-semibold text-[11px]">পরিশোধিত</p>
                  )}
                </div>
              </div>

              {/* Items List Snippet */}
              <div className="text-xs bg-slate-50 p-2 rounded-lg text-slate-600">
                <p className="font-semibold text-slate-500 text-[11px] mb-1">অর্ডারের পণ্যসমূহ ({order.items.length}টি):</p>
                <div className="space-y-0.5">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700 text-xs">
                      <span className="truncate pr-2">• {it.productName} × {it.quantity} {it.unit}</span>
                      <span className="font-semibold shrink-0">৳{it.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Quick Action Buttons (Touch Friendly) */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => onViewReceipt(order)}
                  className="flex-1 min-h-[38px] py-1.5 px-2.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>রসিদ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppBill(order)}
                  className="min-h-[38px] py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>হোয়াটসঅ্যাপ</span>
                </button>
                {order.orderType === 'online' && (
                  <button
                    type="button"
                    onClick={() => handleOpenShipping(order)}
                    className="min-h-[38px] py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>কুরিয়ার</span>
                  </button>
                )}
                {order.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => (onEditInPos ? onEditInPos(order) : handleStartEdit(order))}
                    className="min-h-[38px] py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>এডিট</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Orders Table (hidden on mobile, full width on desktop) */}
      <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-3.5">চালান নং ও তারিখ</th>
                <th className="py-3 px-3.5">গ্রাহক ও ডেলিভারি</th>
                <th className="py-3 px-3.5">পণ্যের তালিকা</th>
                <th className="py-3 px-3.5 text-right">মোট বিল</th>
                <th className="py-3 px-3.5 text-right">পরিশোধ / COD</th>
                <th className="py-3 px-3.5 text-center">স্ট্যাটাস পরিবর্তন</th>
                <th className="py-3 px-3.5 text-center">অ্যাকশন ও কুরিয়ার</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-medium text-slate-600">কোনো অর্ডার পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400 mt-1">অন্য কোনো ফিল্টার নির্বাচন করুন</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => onViewReceipt(order)}
                      className={`hover:bg-emerald-50/50 transition-colors cursor-pointer group ${
                        order.status === 'cancelled' ? 'opacity-65 bg-slate-50/40' : ''
                      }`}
                      title="চালান ও মেমো দেখতে এই সারিতে ক্লিক করুন"
                    >
                      {/* Invoice & Date */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 font-mono group-hover:text-emerald-700 transition-colors">
                            #{order.invoiceNumber}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            order.orderType === 'online' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {order.orderType === 'online' ? 'অনলাইন' : 'দোকান'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDateTime(order.date)}
                        </p>
                      </td>

                      {/* Customer & Address */}
                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        {order.customerPhone && (
                          <p className="text-[11px] text-slate-500">{order.customerPhone}</p>
                        )}
                        {order.deliveryAddress && (
                          <p className="text-[10px] text-slate-500 truncate max-w-[180px]" title={order.deliveryAddress}>
                            📍 {order.deliveryAddress}
                          </p>
                        )}
                        {order.note && (
                          <p className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5 max-w-[180px] truncate" title={order.note}>
                            📝 {order.note}
                          </p>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5 max-w-[200px]">
                          {order.items.slice(0, 2).map((it, idx) => (
                            <p key={idx} className="text-xs text-slate-700 truncate">
                              • {it.productName} × {it.quantity}
                            </p>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              + আরো {order.items.length - 2} টি পণ্য...
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(order.grandTotal)}
                        {order.deliveryCharge > 0 && (
                          <span className="block text-[10px] font-normal text-blue-600">
                            (ডেলিভারি ৳{order.deliveryCharge})
                          </span>
                        )}
                      </td>

                      {/* Paid & COD */}
                      <td className="py-3 px-3.5 text-right">
                        <p className="text-emerald-700 font-semibold text-xs">
                          জমা: {formatCurrency(order.paidAmount)}
                        </p>
                        {order.codAmount > 0 ? (
                          <p className="text-blue-700 font-bold text-xs mt-0.5">
                            কুরিয়ার COD: {formatCurrency(order.codAmount)}
                          </p>
                        ) : order.dueAmount > 0 ? (
                          <p className="text-rose-600 font-bold text-xs mt-0.5">
                            বাকি: {formatCurrency(order.dueAmount)}
                          </p>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium">পরিশোধিত</span>
                        )}
                      </td>

                      {/* Status Selector Dropdown */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-1 min-w-[130px]">
                          <div className="relative w-full">
                            <select
                              value={order.status}
                              onChange={(e) => handleDirectStatusChange(order, e.target.value as OrderStatus)}
                              className={`w-full text-xs font-bold py-1.5 pl-2.5 pr-6 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none transition-all shadow-xs ${
                                order.status === 'confirmed'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                                  : order.status === 'draft'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : order.status === 'processing'
                                  ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                                  : order.status === 'shipped'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100'
                                  : order.status === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : order.status === 'cancelled'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                              }`}
                              title="অর্ডার স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন"
                            >
                              <option value="confirmed">✅ কনফার্মড</option>
                              <option value="draft">⏳ পেন্ডিং / ড্রাফট</option>
                              <option value="processing">📦 প্রসেসিং</option>
                              <option value="shipped">🚚 কুরিয়ারে পাঠানো</option>
                              <option value="delivered">🎉 ডেলিভার্ড</option>
                              <option value="cancelled">❌ বাতিল</option>
                              <option value="returned">↩️ রিটার্ন</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                          {order.courierTrackingCode && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{order.courierTrackingCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1.5 items-center">
                          {/* Row 1: Common Actions */}
                          <div className="flex items-center gap-1">
                            {/* View Receipt */}
                            <button
                              onClick={() => onViewReceipt(order)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="এ৫ রসিদ দেখুন ও প্রিন্ট করুন"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-700" />
                            </button>

                            {/* WhatsApp Share */}
                            <button
                              onClick={() => handleSendWhatsAppBill(order)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                              title="হোয়াটসঅ্যাপে বিল পাঠান"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Order */}
                            {order.status !== 'cancelled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onEditInPos) {
                                    onEditInPos(order);
                                  } else {
                                    handleStartEdit(order);
                                  }
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                                title="অর্ডার এডিট / সংশোধন করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                <span>এডিট</span>
                              </button>
                            )}

                            {/* Delete Order */}
                            <button
                              onClick={() => {
                                if (confirm(`আপনি কি চালান #${order.invoiceNumber} স্থায়ীভাবে মুছে ফেলতে চান?`)) {
                                  onDeleteOrder(order.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Row 2: Pipeline State Workflow Transition Controls */}
                          {order.status === 'draft' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'confirmed')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>কনফার্ম করুন</span>
                            </button>
                          )}

                          {order.status === 'confirmed' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenShipping(order)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Truck className="w-3 h-3" />
                                <span>কুরিয়ারে পাঠান</span>
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="px-1.5 py-1 text-slate-500 hover:text-rose-600 text-[10px] font-semibold"
                                title="অর্ডার বাতিল করুন"
                              >
                                বাতিল
                              </button>
                            </div>
                          )}

                          {order.status === 'shipped' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md shadow-xs cursor-pointer"
                              >
                                ডেলিভার্ড
                              </button>
                              <button
                                onClick={() => handleMarkReturn(order)}
                                className="px-1.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold rounded-md cursor-pointer"
                                title="কাস্টমার নেয়নি, পার্সেল ফেরত এসেছে"
                              >
                                রিটার্ন
                              </button>
                            </div>
                          )}

                          {order.status === 'cancelled' && (
                            <button
                              onClick={() => handleReactivateOrder(order)}
                              className="px-2 py-1 bg-slate-900 hover:bg-black text-white text-[10px] font-bold rounded-md flex items-center gap-1 cursor-pointer"
                              title="কাস্টমার পুনরায় চাইলে আবার কনফার্ম করুন"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>পুনরায় কনফার্ম</span>
                            </button>
                          )}
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

      {/* COURIER SHIPPING & API BOOKING MODAL */}
      {shippingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base">কুরিয়ার বুকিং ও চালান প্রেরণ</h3>
              </div>
              <button
                onClick={() => setShippingOrder(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs sm:text-sm">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-1">
                <p className="font-bold text-blue-950">
                  চালান: #{shippingOrder.invoiceNumber} • {shippingOrder.customerName}
                </p>
                <p className="text-xs text-blue-800">
                  ফোন: {shippingOrder.customerPhone || 'দেওয়া হয়নি'}
                </p>
                <p className="text-xs text-blue-800">
                  ডেলিভারি ঠিকানা: {shippingOrder.deliveryAddress || 'হোম ডেলিভারি'}
                </p>
                <div className="pt-1.5 flex justify-between font-bold text-xs border-t border-blue-200 text-blue-900">
                  <span>কুরিয়ার ক্যাশ কালেকশন (COD):</span>
                  <span className="text-sm">৳{shippingOrder.codAmount}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  কুরিয়ার সার্ভিস নির্বাচন করুন:
                </label>
                <select
                  value={shippingCourier}
                  onChange={(e) => setShippingCourier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Steadfast Courier">Steadfast Courier (স্টেডফাস্ট - এপিআই ও ম্যানুয়েল সাপোর্টেড)</option>
                  <option value="Pathao Courier">Pathao Courier (পাঠাও)</option>
                  <option value="RedX">RedX (রেডএক্স)</option>
                  <option value="সুন্দরবন কুরিয়ার">সুন্দরবন কুরিয়ার সার্ভিস</option>
                  <option value="এসএ পরিবহন">এসএ পরিবহন</option>
                  <option value="পেপারফ্লাই">পেপারফ্লাই (Paperfly)</option>
                </select>
              </div>

              {/* 1-Click Steadfast API Action Button */}
              {shippingCourier === 'Steadfast Courier' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span>১-ক্লিকে সরাসরি Steadfast API বুকিং</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                      অটোমেটিক
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    বাটনে ক্লিক করলেই পার্সেলটি স্টেডফাস্ট পোর্টালে বুক হয়ে কনসাইনমেন্ট আইডি চলে আসবে।
                  </p>
                  <button
                    type="button"
                    onClick={handleSteadfastApiBooking}
                    disabled={isCallingSteadfast}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isCallingSteadfast ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>স্টেডফাস্টে পাঠানো হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>স্টেডফাস্টে বুকিং করুন (১-ক্লিক)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {steadfastError && (
                <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>এপিআই বুকিং বার্তা:</span>
                  </div>
                  <p>{steadfastError}</p>
                  <p className="text-[11px] text-amber-700 font-medium">
                    👉 স্টেডফাস্ট অ্যাপে ম্যানুয়ালি পার্সেল এন্ট্রি করে থাকলে নিচের ঘরে কনসাইনমেন্ট আইডি লিখে "সংরক্ষণ" করুন।
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  কুরিয়ার ট্র্যাকিং কোড / কনসাইনমেন্ট আইডি (ম্যানুয়েল বা এপিআই):
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={shippingTrackingCode}
                    onChange={(e) => setShippingTrackingCode(e.target.value)}
                    placeholder="যেমন: STDF-982341 বা 123456"
                    className="flex-1 px-3 py-2 font-mono font-bold text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShippingTrackingCode(`STDF-${Math.floor(100000 + Math.random() * 900000)}`)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    title="র‍্যান্ডম কোড জেনারেট করুন"
                  >
                    কোড জেনারেট
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  স্টেডফাস্ট অ্যাপ বা ওয়েবসাইট থেকে পাওয়া কনসাইনমেন্ট আইডি এখানে লিখে রাখলে মেমো ও ট্র্যাকিংয়ে থাকবে।
                </p>
              </div>

              {bookingSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShippingOrder(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmShipping}
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>কুরিয়ারে বুকিং সম্পন্ন করুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ORDER MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  <span>অর্ডার সংশোধন ও স্টক সমন্বয়</span>
                </h3>
                <p className="text-xs text-slate-400">
                  চালান: #{editingOrder.invoiceNumber} | তারিখ: {formatDateTime(editingOrder.date)}
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
              {/* Customer and Delivery info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">গ্রাহকের নাম:</label>
                  <input
                    type="text"
                    value={editingOrder.customerName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">মোবাইল নম্বর:</label>
                  <input
                    type="text"
                    value={editingOrder.customerPhone || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerPhone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">অর্ডার স্ট্যাটাস (Order Status):</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as OrderStatus })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="confirmed">✅ নিশ্চিত / কনফার্মড</option>
                    <option value="draft">⏳ পেন্ডিং / ড্রাফট কোটেশন</option>
                    <option value="processing">📦 প্রসেসিং / প্যাকিং</option>
                    <option value="shipped">🚚 কুরিয়ারে পাঠানো হয়েছে</option>
                    <option value="delivered">🎉 কাস্টমার পেয়েছে / ডেলিভার্ড</option>
                    <option value="cancelled">❌ বাতিল (Cancelled)</option>
                    <option value="returned">↩️ রিটার্ন (Returned)</option>
                  </select>
                </div>
                {editingOrder.orderType === 'online' && (
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">ডেলিভারি ঠিকানা:</label>
                    <input
                      type="text"
                      value={editingOrder.deliveryAddress || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, deliveryAddress: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Items in order */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800">অর্ডারের পণ্যসমূহ (পরিমাণ সংশোধন করুন):</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {editingOrder.items.map((it) => (
                    <div key={it.productId} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{it.productName}</p>
                        <p className="text-slate-500">দর: ৳{it.unitPrice} প্রতি {it.unit}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleEditItemQty(it.productId, it.quantity - 1)}
                            className="p-1 rounded hover:bg-white text-slate-700"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold text-slate-900">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditItemQty(it.productId, it.quantity + 1)}
                            className="p-1 rounded hover:bg-white text-slate-700"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="w-16 text-right font-bold text-slate-900">৳{it.total}</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(it.productId)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add item to edit - Instant Search & 1-Click Addition */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>অর্ডারে পণ্য যুক্ত করুন (সহজে খুঁজুন ও ১-ক্লিকে যোগ করুন):</span>
                  </span>
                  {editProductSearch && (
                    <button
                      type="button"
                      onClick={() => setEditProductSearch('')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      ক্লিয়ার
                    </button>
                  )}
                </div>

                {/* Instant Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={editProductSearch}
                    onChange={(e) => setEditProductSearch(e.target.value)}
                    placeholder="🔍 পণ্যের নাম লিখে খুঁজুন (যেমন: মধু, তেল, কালোজিরা)..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Quick Add Product List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {editMatchingProducts.map((p) => {
                    const inOrder = editingOrder.items.find((i) => i.productId === p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-white hover:bg-emerald-50/50 rounded-lg border border-slate-200 text-xs transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            দর: ৳{p.sellingPrice} | স্টক: {p.stockQty} {p.unit}
                            {inOrder && (
                              <span className="ml-2 font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded text-[10px]">
                                অর্ডারে আছে: {inOrder.quantity} {inOrder.unit}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddProductById(p.id)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
                            inOrder
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{inOrder ? '+ পরিমাণ বাড়ান' : 'যোগ করুন'}</span>
                        </button>
                      </div>
                    );
                  })}
                  {editMatchingProducts.length === 0 && (
                    <p className="text-center py-3 text-xs text-slate-400">
                      কোনো পণ্য পাওয়া যায়নি
                    </p>
                  )}
                </div>
              </div>

              {/* Totals & Discounts */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>পণ্য সাব-টোটাল:</span>
                  <span>৳{editingOrder.subtotal}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">ছাড় (Discount):</span>
                  <MoneyInput
                    id="input-edit-order-discount"
                    min={0}
                    value={editingOrder.discount}
                    onChange={(val) =>
                      recalcEditingOrder(
                        editingOrder.items,
                        val,
                        editingOrder.paidAmount
                      )
                    }
                    className="w-24 text-right px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                  />
                </div>

                {editingOrder.orderType === 'online' && (
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 font-semibold">ডেলিভারি চার্জ:</span>
                    <MoneyInput
                      id="input-edit-order-delivery"
                      min={0}
                      value={editingOrder.deliveryCharge}
                      onChange={(newD) => {
                        const newGrand = Math.max(0, editingOrder.subtotal - editingOrder.discount + newD);
                        const newCod = Math.max(0, newGrand - editingOrder.paidAmount);
                        setEditingOrder({
                          ...editingOrder,
                          deliveryCharge: newD,
                          grandTotal: newGrand,
                          codAmount: newCod,
                        });
                      }}
                      className="w-24 text-right px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
                  <span>নতুন সর্বমোট:</span>
                  <span className="text-emerald-700 text-base">৳{editingOrder.grandTotal}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      {editingOrder.orderType === 'online' ? 'অগ্রিম পরিশোধ:' : 'জমা / পরিশোধ (৳):'}
                    </label>
                    <MoneyInput
                      id="input-edit-order-paid"
                      min={0}
                      value={editingOrder.paidAmount}
                      onChange={(val) =>
                        recalcEditingOrder(
                          editingOrder.items,
                          editingOrder.discount,
                          val
                        )
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      {editingOrder.orderType === 'online' ? 'কুরিয়ার COD কালেকশন:' : 'বাকি টাকা:'}
                    </label>
                    <div className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-bold text-xs text-rose-600">
                      ৳{editingOrder.orderType === 'online' ? editingOrder.codAmount : editingOrder.dueAmount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Note / Remarks */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>অর্ডার নোট / রিমার্কস (ঐচ্ছিক):</span>
                </label>
                <input
                  type="text"
                  value={editingOrder.note || ''}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      note: e.target.value,
                    })
                  }
                  placeholder="যেমন: জরুরি ডেলিভারি, ২টার মধ্যে দিতে হবে..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  সংশোধন ও স্টক আপডেট সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
