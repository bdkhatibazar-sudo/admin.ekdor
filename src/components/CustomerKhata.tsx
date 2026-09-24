import React, { useState, useMemo } from 'react';
import { Customer, Order, DuePaymentRecord, StoreSettings, CourierSettlementStatus } from '../types';
import { formatCurrency, formatDateTime, resolveWhatsAppNumber, createWhatsAppUrl } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  MessageSquare, 
  MessageCircle,
  X, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Send, 
  Trash2, 
  Edit2,
  Truck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface CustomerKhataProps {
  customers: Customer[];
  orders: Order[];
  duePayments: DuePaymentRecord[];
  settings: StoreSettings;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onRecordDuePayment: (record: DuePaymentRecord) => void;
  onUpdateOrder?: (order: Order) => void;
  onSettleCodOrder?: (order: Order, settledAmount: number, channel: 'bank' | 'bkash' | 'cash', note?: string) => void;
}

export const CustomerKhata: React.FC<CustomerKhataProps> = ({
  customers,
  orders,
  duePayments,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onRecordDuePayment,
  onUpdateOrder,
  onSettleCodOrder,
}) => {
  // Top Division: 1. Customer Due vs 2. COD Courier Due
  const [khataMode, setKhataMode] = useState<'customer' | 'cod'>('customer');

  // Customer Khata State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Add / Edit Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialDue, setInitialDue] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Collect Customer Due Payment Modal
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'bkash' | 'bank'>('cash');
  const [paymentNote, setPaymentNote] = useState('');

  // COD Courier Due State
  const [codSearchTerm, setCodSearchTerm] = useState('');
  const [codStatusFilter, setCodStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [codCourierFilter, setCodCourierFilter] = useState<string>('all');

  // COD Settlement Modal State
  const [settlingOrder, setSettlingOrder] = useState<Order | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleChannel, setSettleChannel] = useState<'bank' | 'bkash' | 'cash'>('bank');
  const [settleNote, setSettleNote] = useState<string>('');

  // COD Courier Charge Adjustment Modal State
  const [adjustingOrder, setAdjustingOrder] = useState<Order | null>(null);
  const [adjustedDeliveryCost, setAdjustedDeliveryCost] = useState<number>(130);
  const [adjustedCodFee, setAdjustedCodFee] = useState<number>(0);

  // --- Customer Khata Metrics ---
  const customerMetrics = useMemo(() => {
    const totalCustomers = customers.length;
    const totalMarketDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
    const customersWithDue = customers.filter((c) => (c.totalDue || 0) > 0).length;
    const totalPaidEver = duePayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalCustomers,
      totalMarketDue,
      customersWithDue,
      totalPaidEver,
    };
  }, [customers, duePayments]);

  // Filtered Customer List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterDueOnly && (c.totalDue || 0) <= 0) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [customers, filterDueOnly, searchTerm]);

  // Selected Customer Details
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    return orders.filter((o) => o.customerId === selectedCustomerId);
  }, [orders, selectedCustomerId]);

  const customerPayments = useMemo(() => {
    if (!selectedCustomerId) return [];
    return duePayments.filter((p) => p.customerId === selectedCustomerId);
  }, [duePayments, selectedCustomerId]);

  // --- COD Courier Khata Orders & Metrics ---
  const codOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.orderType === 'online' || (o.codAmount && o.codAmount > 0) || o.courierSettlementStatus) &&
        o.status !== 'cancelled'
    );
  }, [orders]);

  const courierNamesList = useMemo(() => {
    const set = new Set<string>();
    codOrders.forEach((o) => {
      if (o.courierName) set.add(o.courierName);
    });
    return Array.from(set);
  }, [codOrders]);

  const codMetrics = useMemo(() => {
    let pendingCodNetTotal = 0;
    let totalCodCollectionPending = 0;
    let totalCourierDeductions = 0;
    let totalSettledInBank = 0;
    let pendingOrdersCount = 0;
    let settledOrdersCount = 0;

    codOrders.forEach((o) => {
      const isSettled = o.courierSettlementStatus === 'settled';
      const codAmt = o.codAmount !== undefined && o.codAmount > 0 
        ? o.codAmount 
        : Math.max(0, o.grandTotal - (o.paidAmount || 0));
      
      const deliveryCost = o.courierDeliveryCost !== undefined 
        ? o.courierDeliveryCost 
        : (o.deliveryCharge !== undefined ? o.deliveryCharge : 130);

      const amountAfterDelivery = Math.max(0, codAmt - deliveryCost);
      const codFee = o.courierCodFee !== undefined 
        ? o.courierCodFee 
        : (codAmt > 0 ? Math.max(1, Math.round(amountAfterDelivery * 0.01)) : 0);

      const netPayable = o.courierNetPayable !== undefined 
        ? o.courierNetPayable 
        : Math.max(0, codAmt - deliveryCost - codFee);

      if (isSettled) {
        settledOrdersCount += 1;
        totalSettledInBank += (o.courierSettledAmount !== undefined ? o.courierSettledAmount : netPayable);
      } else {
        pendingOrdersCount += 1;
        pendingCodNetTotal += netPayable;
        totalCodCollectionPending += codAmt;
        totalCourierDeductions += (deliveryCost + codFee);
      }
    });

    return {
      pendingCodNetTotal,
      totalCodCollectionPending,
      totalCourierDeductions,
      totalSettledInBank,
      pendingOrdersCount,
      settledOrdersCount,
    };
  }, [codOrders]);

  // Filtered COD Orders
  const filteredCodOrders = useMemo(() => {
    return codOrders.filter((o) => {
      const isSettled = o.courierSettlementStatus === 'settled';
      if (codStatusFilter === 'pending' && isSettled) return false;
      if (codStatusFilter === 'settled' && !isSettled) return false;

      if (codCourierFilter !== 'all' && o.courierName !== codCourierFilter) return false;

      if (!codSearchTerm.trim()) return true;
      const q = codSearchTerm.toLowerCase().trim();
      return (
        o.invoiceNumber.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q)) ||
        (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q)) ||
        (o.courierTrackingCode && o.courierTrackingCode.toLowerCase().includes(q)) ||
        (o.courierName && o.courierName.toLowerCase().includes(q))
      );
    });
  }, [codOrders, codStatusFilter, codCourierFilter, codSearchTerm]);

  // Helpers to resolve order COD values
  const getOrderCodBreakdown = (o: Order) => {
    const isSettled = o.courierSettlementStatus === 'settled';
    const codAmt = o.codAmount !== undefined && o.codAmount > 0 
      ? o.codAmount 
      : Math.max(0, o.grandTotal - (o.paidAmount || 0));
    
    const deliveryCost = o.courierDeliveryCost !== undefined 
      ? o.courierDeliveryCost 
      : (o.deliveryCharge !== undefined ? o.deliveryCharge : 130);

    const amountAfterDelivery = Math.max(0, codAmt - deliveryCost);
    const codFee = o.courierCodFee !== undefined 
      ? o.courierCodFee 
      : (codAmt > 0 ? Math.max(1, Math.round(amountAfterDelivery * 0.01)) : 0);

    const netPayable = o.courierNetPayable !== undefined 
      ? o.courierNetPayable 
      : Math.max(0, codAmt - deliveryCost - codFee);

    return {
      codAmt,
      deliveryCost,
      codFee,
      netPayable,
      isSettled,
    };
  };

  // Open Settle Modal
  const handleOpenSettleModal = (o: Order) => {
    const { netPayable } = getOrderCodBreakdown(o);
    setSettlingOrder(o);
    setSettleAmount(netPayable);
    setSettleChannel('bank');
    setSettleNote('');
  };

  // Submit Settlement
  const handleSubmitSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingOrder) return;
    if (settleAmount <= 0) {
      if (!confirm('প্রাপ্ত টাকার পরিমাণ ০ টাকা! আপনি কি এটি সম্পন্ন করতে চান?')) {
        return;
      }
    }
    if (onSettleCodOrder) {
      onSettleCodOrder(settlingOrder, settleAmount, settleChannel, settleNote.trim() || undefined);
    }
    setSettlingOrder(null);
  };

  // Open Adjust Courier Charge Modal
  const handleOpenAdjustChargeModal = (o: Order) => {
    const { deliveryCost, codAmt } = getOrderCodBreakdown(o);
    const amountAfterDelivery = Math.max(0, codAmt - deliveryCost);
    const initialCodFee = Math.max(1, Math.round(amountAfterDelivery * 0.01));
    
    setAdjustingOrder(o);
    setAdjustedDeliveryCost(deliveryCost);
    setAdjustedCodFee(o.courierCodFee !== undefined ? o.courierCodFee : initialCodFee);
  };

  // Submit Charge Adjustment
  const handleSubmitAdjustCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingOrder || !onUpdateOrder) return;

    const codAmt = adjustingOrder.codAmount !== undefined && adjustingOrder.codAmount > 0 
      ? adjustingOrder.codAmount 
      : Math.max(0, adjustingOrder.grandTotal - (adjustingOrder.paidAmount || 0));

    const finalDeliveryCost = Number(adjustedDeliveryCost) || 0;
    const finalCodFee = Number(adjustedCodFee) || 0;
    const finalNetPayable = Math.max(0, codAmt - finalDeliveryCost - finalCodFee);

    const updated: Order = {
      ...adjustingOrder,
      courierDeliveryCost: finalDeliveryCost,
      courierCodFee: finalCodFee,
      courierNetPayable: finalNetPayable,
      updatedAt: new Date().toISOString(),
    };

    onUpdateOrder(updated);
    setAdjustingOrder(null);
  };

  // Open Customer Add Modal
  const handleOpenAddCustomerModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setWhatsappPhone('');
    setAddress('');
    setInitialDue(0);
    setNotes('');
    setIsCustomerModalOpen(true);
  };

  // Open Customer Edit Modal
  const handleOpenEditCustomerModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setWhatsappPhone(c.whatsappPhone || '');
    setAddress(c.address || '');
    setInitialDue(c.totalDue || 0);
    setNotes(c.notes || '');
    setIsCustomerModalOpen(true);
  };

  // Save Customer
  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('অনুগ্রহ করে গ্রাহকের নাম ও মোবাইল নম্বর লিখুন');
      return;
    }

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim(),
        whatsappPhone: whatsappPhone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        whatsappPhone: whatsappPhone.trim() || undefined,
        address: address.trim() || undefined,
        totalDue: Number(initialDue) || 0,
        totalPurchased: Number(initialDue) || 0,
        totalPaid: 0,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddCustomer(newCust);
    }
    setIsCustomerModalOpen(false);
  };

  // Open Payment Modal
  const handleOpenPayment = (cust: Customer) => {
    setPaymentModalCustomer(cust);
    setPaymentAmount(cust.totalDue);
    setPaymentMethod('cash');
    setPaymentNote('');
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalCustomer) return;
    if (paymentAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    const record: DuePaymentRecord = {
      id: `pay-${Date.now()}`,
      customerId: paymentModalCustomer.id,
      customerName: paymentModalCustomer.name,
      amount: paymentAmount,
      paymentMethod,
      date: new Date().toISOString(),
      note: paymentNote.trim() || 'বাকি পরিশোধ জমা',
    };

    onRecordDuePayment(record);
    setPaymentModalCustomer(null);
  };

  // Send WhatsApp reminder
  const handleWhatsAppReminder = (cust: Customer) => {
    const targetWa = resolveWhatsAppNumber(cust.whatsappPhone, cust.phone);
    if (!targetWa) {
      alert('গ্রাহকের মোবাইল নম্বর যোগ করা নেই!');
      return;
    }
    const message = `আসসালামু আলাইকুম ${cust.name},\n${settings.storeName} এ আপনার বর্তমান বকেয়া বাকি আছে ৳${cust.totalDue} টাকা।\nসুবিধাজনক সময়ে পরিশোধ করার জন্য বিনীত অনুরোধ করা হলো।\nধন্যবাদান্তে,\n${settings.storeName}\nমোবাইল: ${settings.phone}`;
    const waUrl = createWhatsAppUrl(targetWa, message);
    window.open(waUrl, '_blank');
  };

  return (
    <div id="customer-khata-view" className="space-y-4">
      {/* ============================================================== */}
      {/* TOP KHATA DIVISION: 1. কাস্টমারের বাকী  VS  2. সিওডি বাকী (COD) */}
      {/* ============================================================== */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            id="tab-khata-customer-due"
            onClick={() => setKhataMode('customer')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              khataMode === 'customer'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>১. কাস্টমারের বাকী</span>
            {customerMetrics.totalMarketDue > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                ৳{customerMetrics.totalMarketDue}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-khata-cod-due"
            onClick={() => setKhataMode('cod')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              khataMode === 'cod'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>২. কুরিয়ার সিওডি বাকী (COD)</span>
            {codMetrics.pendingCodNetTotal > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                ৳{codMetrics.pendingCodNetTotal}
              </span>
            )}
          </button>
        </div>

        {khataMode === 'customer' ? (
          <button
            type="button"
            onClick={handleOpenAddCustomerModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>নতুন গ্রাহক যোগ</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-blue-50/70 border border-blue-100 px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>হিসাব: কুরিয়ার চার্জ ও ১% ফি কেটে ব্যাংকে নিট প্রাপ্য</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: কাস্টমারের বাকী (CUSTOMER DUE)                       */}
      {/* ============================================================== */}
      {khataMode === 'customer' && (
        <div className="space-y-4">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1: Total Market Due */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">বাজারে কাস্টমার বাকী</p>
                <p className="text-lg sm:text-xl font-bold text-rose-600 leading-tight">
                  {formatCurrency(customerMetrics.totalMarketDue)}
                </p>
              </div>
            </div>

            {/* Metric 2: Customers with Due */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">বাকিদার গ্রাহক</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {customerMetrics.customersWithDue} জন
                </p>
              </div>
            </div>

            {/* Metric 3: Total Customers */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">মোট গ্রাহক সংখ্যা</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {customerMetrics.totalCustomers} জন
                </p>
              </div>
            </div>

            {/* Metric 4: Total Collected */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">মোট বাকি আদায়</p>
                <p className="text-lg sm:text-xl font-bold text-teal-700 leading-tight">
                  {formatCurrency(customerMetrics.totalPaidEver)}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Due Filter Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="গ্রাহকের নাম, মোবাইল বা ঠিকানা..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={filterDueOnly}
                  onChange={(e) => setFilterDueOnly(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span>শুধু বাকিদার গ্রাহক দেখান</span>
              </label>
            </div>
          </div>

          {/* Customers Table / Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">গ্রাহকের নাম ও যোগাযোগ</th>
                    <th className="py-3 px-4">ঠিকানা</th>
                    <th className="py-3 px-4 text-right">মোট ক্রয়</th>
                    <th className="py-3 px-4 text-right">পরিশোধ</th>
                    <th className="py-3 px-4 text-right">বর্তমান বাকি</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                        <p className="font-semibold text-slate-600 text-sm">কোনো গ্রাহক পাওয়া যায়নি</p>
                        <p className="text-xs text-slate-400 mt-0.5">নতুন গ্রাহক যোগ করতে ওপরের বাটনে চাপুন</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const hasDue = (cust.totalDue || 0) > 0;
                      return (
                        <tr 
                          key={cust.id} 
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Name & Phone */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                                {cust.name.slice(0, 1)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-snug">{cust.name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {cust.phone}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Address */}
                          <td className="py-3 px-4 text-slate-600">
                            {cust.address ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{cust.address}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">ঠিকানা নেই</span>
                            )}
                          </td>

                          {/* Total Purchases */}
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            ৳{cust.totalPurchased || 0}
                          </td>

                          {/* Total Paid */}
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">
                            ৳{cust.totalPaid || 0}
                          </td>

                          {/* Current Due */}
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full font-bold text-xs ${
                                hasDue
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              ৳{cust.totalDue || 0}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Collect Payment Button */}
                              {hasDue && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayment(cust)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="বাকি টাকা জমা নিন"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>আদায়</span>
                                </button>
                              )}

                              {/* WhatsApp Reminder */}
                              {hasDue && (
                                <button
                                  type="button"
                                  onClick={() => handleWhatsAppReminder(cust)}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                  title="হোয়াটসঅ্যাপে তাগাদা পাঠান"
                                >
                                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                                </button>
                              )}

                              {/* View Details Drawer */}
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerId(cust.id)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="লেনদেন খাতা দেখুন"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>

                              {/* Edit Customer */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditCustomerModal(cust)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="এডিট করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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

      {/* ============================================================== */}
      {/* SECTION 2: কুরিয়ার সিওডি বাকী (COURIER COD DUE)                 */}
      {/* ============================================================== */}
      {khataMode === 'cod' && (
        <div className="space-y-4">
          {/* COD Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1: Total COD Due Net (To be credited in Bank) */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-blue-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">ব্যাংকে সিওডি বাকি (প্রাপ্য)</p>
                <p className="text-lg sm:text-xl font-bold text-blue-700 leading-tight">
                  {formatCurrency(codMetrics.pendingCodNetTotal)}
                </p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  {codMetrics.pendingOrdersCount} টি পার্সেল অপেক্ষমান
                </p>
              </div>
            </div>

            {/* Metric 2: Total COD Collected by Courier */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">কুরিয়ারের কাছে গ্রস ক্যাশ</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {formatCurrency(codMetrics.totalCodCollectionPending)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  কাস্টমার থেকে আদায়যোগ্য COD
                </p>
              </div>
            </div>

            {/* Metric 3: Courier Deductions (Delivery + 1% Fee) */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">কুরিয়ার কর্তন (চার্জ + ১%)</p>
                <p className="text-lg sm:text-xl font-bold text-amber-800 leading-tight">
                  {formatCurrency(codMetrics.totalCourierDeductions)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ডেলিভারি খরচ ও ১% সিওডি ফি
                </p>
              </div>
            </div>

            {/* Metric 4: Total Settled in Bank */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">ব্যাংকে গৃহীত (Settled)</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-700 leading-tight">
                  {formatCurrency(codMetrics.totalSettledInBank)}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  {codMetrics.settledOrdersCount} টি পার্সেল সম্পন্ন
                </p>
              </div>
            </div>
          </div>

          {/* COD Explanation Bar */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start sm:items-center gap-2 text-blue-900">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>সিওডি হিসাব সূত্র:</strong> কুরিয়ার কাস্টমার থেকে মোট টাকা আদায়ের পর নির্ধারিত ডেলিভারি চার্জ (ওজন বা ১৩০ টাকা) কাটে, তারপর অবশিষ্ট থেকে <strong>১% সিওডি ফি</strong> কেটে বাকি নিট টাকা আপনার ব্যাংক একাউন্টে জমা দেয়।
              </span>
            </div>
          </div>

          {/* COD Search & Status Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={codSearchTerm}
                onChange={(e) => setCodSearchTerm(e.target.value)}
                placeholder="চালান #, কাস্টমার, ট্র্যাকিং কোড..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCodStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    codStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সবগুলো ({codOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCodStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    codStatusFilter === 'pending'
                      ? 'bg-blue-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🟡 বাকি ({codMetrics.pendingOrdersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCodStatusFilter('settled')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    codStatusFilter === 'settled'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🟢 ব্যাংকে জমা ({codMetrics.settledOrdersCount})
                </button>
              </div>

              {/* Courier Filter */}
              {courierNamesList.length > 0 && (
                <select
                  value={codCourierFilter}
                  onChange={(e) => setCodCourierFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সকল কুরিয়ার</option>
                  {courierNamesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* COD Orders List: Mobile Cards + Desktop Table */}
          
          {/* Mobile Cards (Visible on small screens) */}
          <div className="md:hidden space-y-3">
            {filteredCodOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                <p className="font-semibold text-slate-600 text-sm">কোনো সিওডি অর্ডার পাওয়া যায়নি</p>
                <p className="text-xs text-slate-400 mt-0.5">নতুন অনলাইন সেল করতে POS কাউন্টারে যান</p>
              </div>
            ) : (
              filteredCodOrders.map((o) => {
                const { codAmt, deliveryCost, codFee, netPayable, isSettled } = getOrderCodBreakdown(o);

                return (
                  <div
                    key={o.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5"
                  >
                    {/* Header: Invoice, Date, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs block">
                          #{o.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(o.createdAt)}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSettled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isSettled ? '🟢 ব্যাংকে জমা হয়েছে' : '🟡 সিওডি বাকি'}
                      </span>
                    </div>

                    {/* Customer & Courier Details */}
                    <div className="text-xs space-y-1 bg-slate-50 p-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{o.customerName || 'অনলাইন ক্রেতা'}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{o.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-blue-900">{o.courierName || 'কুরিয়ার'}</span>
                        {o.courierTrackingCode && (
                          <span className="text-[10px] bg-white px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                            #{o.courierTrackingCode}
                          </span>
                        )}
                      </div>
                      {o.deliveryAddress && (
                        <p className="text-[10px] text-slate-500 truncate">{o.deliveryAddress}</p>
                      )}
                    </div>

                    {/* Financial Breakdown Box */}
                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5 text-xs">
                      <div className="grid grid-cols-3 gap-1 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block">কুরিয়ার কালেকশন</span>
                          <span className="font-bold text-slate-800">৳{codAmt}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">কুরিয়ার চার্জ</span>
                          <span className="font-semibold text-rose-600">-৳{deliveryCost}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">১% সিওডি ফি</span>
                          <span className="font-semibold text-rose-600">-৳{codFee}</span>
                        </div>
                      </div>

                      <div className="pt-1.5 flex items-center justify-between border-t border-blue-200/60 font-bold">
                        <span className="text-blue-950 text-xs">
                          {isSettled ? 'ব্যাংকে প্রাপ্ত জমা:' : 'ব্যাংকে প্রাপ্য (বাকি):'}
                        </span>
                        <span className={`text-sm ${isSettled ? 'text-emerald-700' : 'text-blue-700'}`}>
                          ৳{isSettled ? (o.courierSettledAmount ?? netPayable) : netPayable}
                        </span>
                      </div>
                    </div>

                    {/* Settle Note if settled */}
                    {isSettled && (
                      <div className="text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded flex items-center justify-between">
                        <span>জমা মাধ্যম: {o.courierSettledChannel === 'bank' ? 'ব্যাংক একাউন্ট' : o.courierSettledChannel === 'bkash' ? 'বিকাশ' : 'নগদ'}</span>
                        {o.courierSettledDate && (
                          <span className="text-slate-500">{formatDateTime(o.courierSettledDate)}</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustChargeModal(o)}
                        className="px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        চার্জ এডিট
                      </button>

                      {!isSettled && (
                        <button
                          type="button"
                          onClick={() => handleOpenSettleModal(o)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>ব্যাংক জমা নিন</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (Visible on medium+ screens) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">চালান ও তারিখ</th>
                    <th className="py-3 px-4">গ্রাহক ও ডেলিভারি</th>
                    <th className="py-3 px-4">কুরিয়ার ও ট্র্যাকিং</th>
                    <th className="py-3 px-4 text-right">কুরিয়ার কালেকশন</th>
                    <th className="py-3 px-4 text-right">কুরিয়ার চার্জ</th>
                    <th className="py-3 px-4 text-right">১% সিওডি ফি</th>
                    <th className="py-3 px-4 text-right">ব্যাংকে প্রাপ্য (নিট)</th>
                    <th className="py-3 px-4 text-center">স্ট্যাটাস ও অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCodOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                        <p className="font-semibold text-slate-600 text-sm">কোনো সিওডি অর্ডার পাওয়া যায়নি</p>
                        <p className="text-xs text-slate-400 mt-0.5">নতুন অনলাইন সেল করতে POS কাউন্টারে যান</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCodOrders.map((o) => {
                      const { codAmt, deliveryCost, codFee, netPayable, isSettled } = getOrderCodBreakdown(o);

                      return (
                        <tr 
                          key={o.id} 
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Invoice & Date */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 block">
                              #{o.invoiceNumber}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateTime(o.createdAt)}
                            </span>
                          </td>

                          {/* Customer & Address */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{o.customerName || 'অনলাইন ক্রেতা'}</p>
                            <p className="text-xs text-slate-500 font-mono">{o.customerPhone}</p>
                            {o.deliveryAddress && (
                              <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                                {o.deliveryAddress}
                              </p>
                            )}
                          </td>

                          {/* Courier & Tracking */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-slate-900 font-semibold text-xs">
                              <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{o.courierName || 'কুরিয়ার'}</span>
                            </div>
                            {o.courierTrackingCode && (
                              <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 rounded mt-0.5 inline-block">
                                #{o.courierTrackingCode}
                              </span>
                            )}
                          </td>

                          {/* COD Gross */}
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ৳{codAmt}
                          </td>

                          {/* Delivery Cost */}
                          <td className="py-3 px-4 text-right font-semibold text-rose-600">
                            -৳{deliveryCost}
                          </td>

                          {/* 1% COD Fee */}
                          <td className="py-3 px-4 text-right font-semibold text-rose-600">
                            -৳{codFee}
                          </td>

                          {/* Net Payable in Bank */}
                          <td className="py-3 px-4 text-right">
                            <span className={`font-black text-sm ${isSettled ? 'text-emerald-700' : 'text-blue-700'}`}>
                              ৳{isSettled ? (o.courierSettledAmount ?? netPayable) : netPayable}
                            </span>
                          </td>

                          {/* Status & Action */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isSettled ? (
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                    <Check className="w-3 h-3" />
                                    <span>ব্যাংকে জমা</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    {o.courierSettledChannel === 'bank' ? 'ব্যাংক' : o.courierSettledChannel === 'bkash' ? 'বিকাশ' : 'ক্যাশ'}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSettleModal(o)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                                    title="কুরিয়ার থেকে টাকা পেয়ে ব্যাংকে জমা নিশ্চিত করুন"
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>ব্যাংক জমা</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdjustChargeModal(o)}
                                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                    title="চার্জ বা ফি সমন্বয় করুন"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
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
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: COD SETTLEMENT MODAL (কুরিয়ার থেকে ব্যাংকে জমা গ্রহণ) */}
      {/* ============================================================== */}
      {settlingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-bold text-base">ব্যাংক একাউন্টে সিওডি জমা গ্রহণ</h3>
                  <p className="text-xs text-blue-100">চালান #{settlingOrder.invoiceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlingOrder(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitSettlement} className="p-4 space-y-3.5 text-xs sm:text-sm">
              {/* Order Info & Courier Calculation */}
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span>কুরিয়ার: <strong>{settlingOrder.courierName || 'কুরিয়ার'}</strong></span>
                  <span>গ্রাহক: <strong>{settlingOrder.customerName || 'অনলাইন ক্রেতা'}</strong></span>
                </div>

                {(() => {
                  const { codAmt, deliveryCost, codFee, netPayable } = getOrderCodBreakdown(settlingOrder);
                  return (
                    <div className="space-y-1 pt-1.5 border-t border-blue-200/60">
                      <div className="flex justify-between text-slate-600">
                        <span>কাস্টমার থেকে আদায় (COD):</span>
                        <span className="font-bold text-slate-900">৳{codAmt}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>কুরিয়ার ডেলিভারি চার্জ:</span>
                        <span>-৳{deliveryCost}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>১% সিওডি ফি:</span>
                        <span>-৳{codFee}</span>
                      </div>
                      <div className="flex justify-between font-bold text-blue-950 pt-1 border-t border-blue-200 text-sm">
                        <span>নিট প্রাক্কলিত প্রাপ্য:</span>
                        <span>৳{netPayable}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Settlement Input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ব্যাংকে প্রাপ্ত নিট টাকার পরিমাণ (টাকা) <span className="text-rose-500">*</span>
                </label>
                <MoneyInput
                  id="input-settle-amount"
                  min={0}
                  required
                  value={settleAmount}
                  onChange={setSettleAmount}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  কুরিয়ার ব্যাংক স্টেটমেন্ট অনুযায়ী জমা দেওয়া টাকা লিখুন
                </span>
              </div>

              {/* Settlement Channel */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">জমার মাধ্যম / একাউন্ট</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: 'ব্যাংক একাউন্ট', icon: Building2 },
                    { id: 'bkash', label: 'বিকাশ', icon: Phone },
                    { id: 'cash', label: 'নগদ ক্যাশ', icon: DollarSign },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isActive = settleChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setSettleChannel(ch.id as any)}
                        className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note / Reference */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  কুরিয়ার স্টেটমেন্ট / ট্রানজ্যাকশন রেফারেন্স (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="যেমন: Steadfast Invoice #1234, Brac Bank..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettlingOrder(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ব্যাংকে জমা নিশ্চিত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADJUST COURIER CHARGES (ওজন বা বাড়তি চার্জ সমন্বয়)      */}
      {/* ============================================================== */}
      {adjustingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">কুরিয়ার ডেলিভারি চার্জ ও ফি সমন্বয়</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingOrder(null)}
                className="p-1 rounded text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAdjustCharge} className="p-4 space-y-3 text-xs sm:text-sm">
              <p className="text-slate-500 text-xs">
                কুরিয়ার যদি পণ্যের বাড়তি ওজনের জন্য ডেলিভারি চার্জ বেশি বা কম কাটে, তা এখানে আপডেট করুন:
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  কুরিয়ার ডেলিভারি চার্জ (টাকা)
                </label>
                <MoneyInput
                  min={0}
                  required
                  value={adjustedDeliveryCost}
                  onChange={(val) => {
                    setAdjustedDeliveryCost(val);
                    const codAmt = adjustingOrder.codAmount || Math.max(0, adjustingOrder.grandTotal - (adjustingOrder.paidAmount || 0));
                    const rem = Math.max(0, codAmt - val);
                    setAdjustedCodFee(Math.max(1, Math.round(rem * 0.01)));
                  }}
                  placeholder="130"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ১% সিওডি ফি (টাকা)
                </label>
                <MoneyInput
                  min={0}
                  required
                  value={adjustedCodFee}
                  onChange={setAdjustedCodFee}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preview */}
              <div className="p-2.5 bg-blue-50 rounded-xl text-xs flex justify-between font-bold text-blue-900">
                <span>নতুন ব্যাংকে প্রাপ্য:</span>
                <span>
                  ৳{Math.max(0, (adjustingOrder.codAmount || adjustingOrder.grandTotal) - adjustedDeliveryCost - adjustedCodFee)}
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingOrder(null)}
                  className="px-3.5 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ADD / EDIT CUSTOMER MODAL                             */}
      {/* ============================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                {editingCustomer ? 'গ্রাহকের তথ্য এডিট' : 'নতুন গ্রাহক যোগ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitCustomer} className="p-4 space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  গ্রাহকের পুরো নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: রহিম মিয়া"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="যেমন: 01712345678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="যেমন: 01712345678 (খালি রাখলে ১ম নম্বর প্রযোজ্য)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: বাড়ি #১২, রোড #৪, মিরপুর..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    পূর্বের কোনো বাকি থাকলে (টাকা)
                  </label>
                  <MoneyInput
                    min={0}
                    value={initialDue}
                    onChange={setInitialDue}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নোট / মন্তব্য</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="গ্রাহক সম্পর্কে যেকোনো অতিরিক্ত তথ্য..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  {editingCustomer ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: COLLECT CUSTOMER PAYMENT MODAL                        */}
      {/* ============================================================== */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                বাকি পরিশোধ আদায়
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalCustomer(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPayment} className="p-4 space-y-3 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-slate-500 text-xs">গ্রাহকের নাম:</p>
                <p className="font-bold text-slate-900 text-base">{paymentModalCustomer.name}</p>
                <p className="text-rose-600 font-bold text-xs">
                  বর্তমান বাকি: ৳{paymentModalCustomer.totalDue}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  পরিশোধকৃত টাকার পরিমাণ (টাকা) <span className="text-rose-500">*</span>
                </label>
                <MoneyInput
                  min={1}
                  required
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-base font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="cash">💵 ক্যাশ (নগদ)</option>
                  <option value="qr">📱 কিউআর (QR স্ক্যান)</option>
                  <option value="bkash">📲 বিকাশ (bKash)</option>
                  <option value="bank">🏦 ব্যাংক একাউন্ট</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নোট বা রেফারেন্স</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="যেমন: চলতি মাসের কিস্তি..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-lg text-xs flex justify-between">
                <span>পরিশোধের পর অবশিষ্ট বাকি:</span>
                <strong className="text-rose-600">
                  ৳{Math.max(0, paymentModalCustomer.totalDue - paymentAmount)}
                </strong>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalCustomer(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER: CUSTOMER TRANSACTION LEDGER (গ্রাহকের পূর্ণাঙ্গ খাতা)    */}
      {/* ============================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end animate-fade-in">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm">
                  {selectedCustomer.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center shrink-0">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">মোট ক্রয়</span>
                <span className="text-sm font-bold text-slate-900">৳{selectedCustomer.totalPurchased || 0}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">মোট পরিশোধ</span>
                <span className="text-sm font-bold text-emerald-600">৳{selectedCustomer.totalPaid || 0}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">বর্তমান বাকি</span>
                <span className="text-sm font-bold text-rose-600">৳{selectedCustomer.totalDue || 0}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-2 shrink-0">
              {(selectedCustomer.totalDue || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenPayment(selectedCustomer)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>বাকি জমা নিন</span>
                </button>
              )}

              {(selectedCustomer.totalDue || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => handleWhatsAppReminder(selectedCustomer)}
                  className="px-4 py-2 border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>হোয়াটসঅ্যাপ তাগাদা</span>
                </button>
              )}
            </div>

            {/* Tab Body: Purchases & Payments */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Order History */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  ক্রয় ইনভয়েসসমূহ ({customerOrders.length})
                </h4>
                {customerOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">কোনো ক্রয়ের রেকর্ড পাওয়া যায়নি</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="font-mono text-slate-900">#{ord.invoiceNumber}</span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(ord.createdAt)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>মোট বিল: <strong>৳{ord.grandTotal}</strong></span>
                          <span>জমা: <strong className="text-emerald-600">৳{ord.paidAmount}</strong></span>
                          <span>বাকি: <strong className="text-rose-600">৳{ord.dueAmount}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Payment History */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  বাকি পরিশোধের ইতিহাস ({customerPayments.length})
                </h4>
                {customerPayments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">কোনো পরিশোধের রেকর্ড নেই</p>
                ) : (
                  <div className="space-y-2">
                    {customerPayments.map((p) => (
                      <div
                        key={p.id}
                        className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-emerald-900 text-sm block">৳{p.amount}</span>
                          <span className="text-[10px] text-slate-500">{formatDateTime(p.date)}</span>
                          {p.note && <p className="text-[11px] text-slate-600 mt-0.5">{p.note}</p>}
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {p.paymentMethod === 'cash' ? 'ক্যাশ' : p.paymentMethod === 'bkash' ? 'বিকাশ' : p.paymentMethod === 'bank' ? 'ব্যাংক' : 'কিউআর'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
