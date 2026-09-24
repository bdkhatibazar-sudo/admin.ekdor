import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Order, DuePaymentRecord, StoreSettings } from '../types';
import { formatCurrency, formatDateTime, resolveWhatsAppNumber, createWhatsAppUrl } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { OrderDetailsModal } from './OrderDetailsModal';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  MessageCircle, 
  X, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  ShoppingBag, 
  ShoppingCart, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  ExternalLink, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface CustomerDirectoryProps {
  customers: Customer[];
  orders: Order[];
  duePayments: DuePaymentRecord[];
  settings: StoreSettings;
  initialCustomerId?: string | null;
  onBackToDueKhata?: () => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onRecordDuePayment: (record: DuePaymentRecord) => void;
  onNavigateToPos: (customer: Customer) => void;
  onViewReceipt?: (order: Order) => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  customers,
  orders,
  duePayments,
  settings,
  initialCustomerId,
  onBackToDueKhata,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onRecordDuePayment,
  onNavigateToPos,
  onViewReceipt,
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'advance' | 'frequent'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
    if (initialCustomerId) return initialCustomerId;
    return customers.length > 0 ? customers[0].id : null;
  });

  // Mobile Drilldown view state (when on small screens)
  const [mobileShowDetail, setMobileShowDetail] = useState(Boolean(initialCustomerId));

  // Sync selectedCustomerId when initialCustomerId prop changes (e.g. from Due Khata click)
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      setMobileShowDetail(true);
    }
  }, [initialCustomerId]);

  // Selected Order for Modal Popup
  const [modalOrder, setModalOrder] = useState<Order | null>(null);

  // Add / Edit Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialDue, setInitialDue] = useState<number>(0);
  const [initialAdvance, setInitialAdvance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Collect Payment / Advance Deposit Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'bkash' | 'bank'>('cash');
  const [paymentNote, setPaymentNote] = useState('');

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsappPhone && c.whatsappPhone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === 'due') {
        return (c.totalDue || 0) > 0;
      }
      if (filterType === 'advance') {
        return (c.advanceBalance || 0) > 0;
      }
      if (filterType === 'frequent') {
        const orderCount = orders.filter((o) => o.customerId === c.id).length;
        return orderCount >= 2;
      }

      return true;
    });
  }, [customers, searchTerm, filterType, orders]);

  // Selected Customer Object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Orders for Selected Customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders
      .filter((o) => o.customerId === selectedCustomer.id || (o.customerPhone && o.customerPhone === selectedCustomer.phone))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, selectedCustomer]);

  // Payments for Selected Customer
  const customerPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    return duePayments
      .filter((p) => p.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [duePayments, selectedCustomer]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const withDue = customers.filter((c) => (c.totalDue || 0) > 0).length;
    const withAdvance = customers.filter((c) => (c.advanceBalance || 0) > 0).length;
    const totalDueAmount = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
    const totalAdvanceAmount = customers.reduce((sum, c) => sum + (c.advanceBalance || 0), 0);

    return { totalCustomers, withDue, withAdvance, totalDueAmount, totalAdvanceAmount };
  }, [customers]);

  // Add / Edit Handlers
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setWhatsappPhone('');
    setAddress('');
    setInitialDue(0);
    setInitialAdvance(0);
    setNotes('');
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setWhatsappPhone(cust.whatsappPhone || '');
    setAddress(cust.address || '');
    setInitialDue(cust.totalDue || 0);
    setInitialAdvance(cust.advanceBalance || 0);
    setNotes(cust.notes || '');
    setIsCustomerModalOpen(true);
  };

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
        advanceBalance: Number(initialAdvance) || 0,
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
        advanceBalance: Number(initialAdvance) || 0,
        totalPurchased: Number(initialDue) || 0,
        totalPaid: Number(initialAdvance) || 0,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddCustomer(newCust);
      setSelectedCustomerId(newCust.id);
    }
    setIsCustomerModalOpen(false);
  };

  // Payment Modal Handlers
  const handleOpenPaymentModal = () => {
    if (!selectedCustomer) return;
    // Default to the due amount if they owe money, else suggest 0 for advance deposit
    setPaymentAmount(selectedCustomer.totalDue > 0 ? selectedCustomer.totalDue : 0);
    setPaymentMethod('cash');
    setPaymentNote('');
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (paymentAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    const currentDue = selectedCustomer.totalDue || 0;
    const isOverpayment = paymentAmount > currentDue;

    const record: DuePaymentRecord = {
      id: `pay-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: paymentAmount,
      paymentMethod,
      date: new Date().toISOString(),
      note: paymentNote.trim() || (currentDue === 0 ? 'অগ্রিম জমা গ্রহণ' : isOverpayment ? 'বকেয়া পরিশোধ ও অতিরিক্ত জমা' : 'বাকি আদায়'),
      isAdvanceDeposit: isOverpayment || currentDue === 0,
    };

    onRecordDuePayment(record);
    setIsPaymentModalOpen(false);
  };

  // Send WhatsApp message to customer
  const handleSendWhatsApp = () => {
    if (!selectedCustomer) return;
    const targetWa = resolveWhatsAppNumber(selectedCustomer.whatsappPhone, selectedCustomer.phone);
    if (!targetWa) {
      alert('গ্রাহকের মোবাইল নম্বর যোগ করা নেই!');
      return;
    }

    let balanceText = '';
    if ((selectedCustomer.totalDue || 0) > 0) {
      balanceText = `বর্তমান বকেয়া বাকি: ৳${selectedCustomer.totalDue} টাকা। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ করা হলো।`;
    } else if ((selectedCustomer.advanceBalance || 0) > 0) {
      balanceText = `আপনার একাউন্টে ৳${selectedCustomer.advanceBalance} টাকা অতিরিক্ত জমা আছে, যা পরবর্তী কেনাকাটায় বাদ দেওয়া হবে।`;
    } else {
      balanceText = 'আপনার পূর্বের সকল হিসাব পরিশোধিত আছে।';
    }

    const message = `আসসালামু আলাইকুম ${selectedCustomer.name},\n${settings.storeName} এ আপনাকে স্বাগতম।\n${balanceText}\n\nধন্যবাদান্তে,\n${settings.storeName}\nমোবাইল: ${settings.phone}`;
    const waUrl = createWhatsAppUrl(targetWa, message);
    window.open(waUrl, '_blank');
  };

  return (
    <div id="customer-directory-view" className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>গ্রাহক খাতা ও পূর্ণাঙ্গ প্রোফাইল</span>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
              মোট {metrics.totalCustomers} জন গ্রাহক
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            সকল গ্রাহকের হিসাব, কেনাকাটার ইতিহাস, জমা/বাকি এবং নতুন অর্ডারের খাতা
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onBackToDueKhata && (
            <button
              type="button"
              onClick={onBackToDueKhata}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
              title="বাকীর খাতায় ফিরে যান"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>বাকীর খাতায় ফিরুন</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddCustomer}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>নতুন গ্রাহক যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">মোট নিবন্ধিত গ্রাহক</span>
          <span className="text-lg font-bold text-slate-900">{metrics.totalCustomers} জন</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-rose-200 bg-rose-50/30 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 block">বকেয়া বাকি রয়েছে</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-rose-700">{formatCurrency(metrics.totalDueAmount)}</span>
            <span className="text-[10px] text-rose-600 font-medium">({metrics.withDue} জন)</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">অগ্রিম জমা ব্যালেন্স</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-emerald-700">{formatCurrency(metrics.totalAdvanceAmount)}</span>
            <span className="text-[10px] text-emerald-600 font-medium">({metrics.withAdvance} জন)</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">মোট অর্ডার সংখ্যা</span>
          <span className="text-lg font-bold text-slate-900">{orders.length} টি</span>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN: Customer List with Search & Filters (4 Cols)     */}
        {/* ============================================================== */}
        <div className={`lg:col-span-4 space-y-3 ${mobileShowDetail ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-3">
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="গ্রাহকের নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."
                className="w-full text-xs font-medium pl-8 pr-7 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সকল ({customers.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('due')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer flex items-center gap-1 ${
                  filterType === 'due'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                বাকি ({metrics.withDue})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('advance')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer flex items-center gap-1 ${
                  filterType === 'advance'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                জমা ({metrics.withAdvance})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('frequent')}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer ${
                  filterType === 'frequent'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                নিয়মিত ক্রেতা
              </button>
            </div>

            {/* Customer List Scroll Container */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">কোনো গ্রাহক পাওয়া যায়নি</p>
                  <p className="text-[11px] mt-0.5">নতুন গ্রাহক যোগ করতে ওপরের বাটনে চাপুন</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  const custOrders = orders.filter((o) => o.customerId === cust.id);
                  const hasDue = (cust.totalDue || 0) > 0;
                  const hasAdvance = (cust.advanceBalance || 0) > 0;

                  return (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setMobileShowDetail(true);
                      }}
                      className={`p-3 rounded-xl transition cursor-pointer my-1 text-left flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/80 border border-indigo-300 shadow-xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelected 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cust.name.substring(0, 1)}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {cust.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{cust.phone}</span>
                            <span className="text-slate-300">•</span>
                            <span>{custOrders.length}টি অর্ডার</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {hasDue ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 block">
                            বাকি: ৳{cust.totalDue}
                          </span>
                        ) : hasAdvance ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 block">
                            জমা: ৳{cust.advanceBalance}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 block">
                            পরিশোধিত
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          মোট: {formatCurrency(cust.totalPurchased || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: Selected Customer 360° Profile & Khata (8 Cols)  */}
        {/* ============================================================== */}
        <div className={`lg:col-span-8 space-y-4 ${mobileShowDetail ? 'block' : 'hidden lg:block'}`}>
          {selectedCustomer ? (
            <div className="space-y-4">
              
              {/* Profile Card Header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                
                {/* Mobile Back Button */}
                <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMobileShowDetail(false)}
                    className="text-xs font-bold text-indigo-600 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>সকল গ্রাহক তালিকায় ফিরুন</span>
                  </button>
                  <span className="text-[10px] text-slate-400">গ্রাহক আইডি: {selectedCustomer.id}</span>
                </div>

                {/* Profile Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                      {selectedCustomer.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900">
                          {selectedCustomer.name}
                        </h3>
                        {(selectedCustomer.totalDue || 0) > 0 ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            বকেয়া বাকি ৳{selectedCustomer.totalDue}
                          </span>
                        ) : (selectedCustomer.advanceBalance || 0) > 0 ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>অগ্রিম জমা ৳{selectedCustomer.advanceBalance}</span>
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                            হিসাব পরিশোধিত (০)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedCustomer.phone}</span>
                          <a
                            href={`tel:${selectedCustomer.phone}`}
                            className="text-blue-600 hover:underline text-[11px] ml-1"
                          >
                            (কল করুন)
                          </a>
                        </div>

                        {selectedCustomer.whatsappPhone && (
                          <div className="flex items-center gap-1 font-medium text-emerald-800">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WA: {selectedCustomer.whatsappPhone}</span>
                          </div>
                        )}

                        {selectedCustomer.address && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{selectedCustomer.address}</span>
                          </div>
                        )}
                      </div>

                      {selectedCustomer.notes && (
                        <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 px-2 py-1 rounded inline-block">
                          নোট: {selectedCustomer.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for this customer */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onNavigateToPos(selectedCustomer)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      title="এই গ্রাহকের জন্য পিওএস কাউন্টারে নতুন বিল তৈরি করুন"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>নতুন অর্ডার</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenPaymentModal}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      title="বাকি আদায় বা অতিরিক্ত অগ্রিম জমা গ্রহণ"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>টাকা জমা নিন</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition cursor-pointer"
                      title="হোয়াটসঅ্যাপে মেসেজ পাঠান"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditCustomer(selectedCustomer)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="গ্রাহকের তথ্য এডিট করুন"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4 Financial Stat Cards for Customer */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 block">মোট অর্ডার</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 block">
                      {customerOrders.length} টি
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 block">মোট কেনাকাটা</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 block">
                      {formatCurrency(selectedCustomer.totalPurchased || 0)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 block">মোট পরিশোধ</span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5 block">
                      {formatCurrency(selectedCustomer.totalPaid || 0)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border text-center ${
                    (selectedCustomer.totalDue || 0) > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : (selectedCustomer.advanceBalance || 0) > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <span className="text-[11px] font-bold block">
                      {(selectedCustomer.totalDue || 0) > 0 
                        ? 'বর্তমান বকেয়া বাকি' 
                        : (selectedCustomer.advanceBalance || 0) > 0 
                        ? 'অতিরিক্ত জমা ব্যালেন্স' 
                        : 'বর্তমান হিসাব স্থিতি'}
                    </span>
                    <span className="text-base sm:text-lg font-black mt-0.5 block">
                      {(selectedCustomer.totalDue || 0) > 0
                        ? formatCurrency(selectedCustomer.totalDue || 0)
                        : (selectedCustomer.advanceBalance || 0) > 0
                        ? formatCurrency(selectedCustomer.advanceBalance || 0)
                        : 'পরিশোধিত (০)'}
                    </span>
                  </div>
                </div>

                {/* Overpayment / Advance Balance Explanation Banner */}
                {(selectedCustomer.advanceBalance || 0) > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">অগ্রিম জমা ব্যালেন্স ব্যবহারের সুবিধা:</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        এই গ্রাহকের পূর্বে ৳{selectedCustomer.advanceBalance} টাকা অতিরিক্ত জমা দেওয়া আছে। পরবর্তীতে পিওএস কাউন্টারে নতুন কোনো অর্ডার তৈরি করার সময় এই টাকা স্বয়ংক্রিয়ভাবে বিল থেকে বাদ যাবে।
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* ORDERS LIST: All Orders for this Customer (নীচে অর্ডারের লিস্ট)*/}
              {/* ============================================================== */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    <span>এই গ্রাহকের সকল অর্ডার তালিকা ({customerOrders.length}টি)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">বিস্তারিত দেখতে যে কোনো অর্ডারে ক্লিক করুন</span>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">এই গ্রাহকের কোনো অর্ডার রেকর্ড নেই</p>
                    <button
                      type="button"
                      onClick={() => onNavigateToPos(selectedCustomer)}
                      className="mt-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>প্রথম অর্ডার তৈরি করুন</span>
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">চালান #</th>
                          <th className="py-2.5 px-3">তারিখ</th>
                          <th className="py-2.5 px-3">পণ্যের বিবরণ</th>
                          <th className="py-2.5 px-3 text-right">মোট টাকা</th>
                          <th className="py-2.5 px-3 text-right">পরিশোধ</th>
                          <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                          <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {customerOrders.map((ord) => {
                          const itemsSummary = ord.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ');

                          return (
                            <tr
                              key={ord.id}
                              onClick={() => setModalOrder(ord)}
                              className="hover:bg-indigo-50/60 cursor-pointer transition-colors group"
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                                #{ord.invoiceNumber}
                              </td>

                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {formatDateTime(ord.date).split(',')[0]}
                              </td>

                              <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={itemsSummary}>
                                {itemsSummary}
                              </td>

                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {formatCurrency(ord.grandTotal)}
                              </td>

                              <td className="py-2.5 px-3 text-right font-medium">
                                <span className="text-emerald-700">{formatCurrency(ord.paidAmount)}</span>
                                {ord.codAmount > 0 ? (
                                  <span className="block text-[10px] text-blue-700 font-bold">
                                    COD: {formatCurrency(ord.codAmount)}
                                  </span>
                                ) : ord.dueAmount > 0 ? (
                                  <span className="block text-[10px] text-rose-600 font-bold">
                                    বাকি: {formatCurrency(ord.dueAmount)}
                                  </span>
                                ) : null}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                  ord.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                                  ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  ord.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                                  ord.status === 'cancelled' ? 'bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {ord.status === 'delivered' ? 'ডেলিভার্ড' :
                                   ord.status === 'shipped' ? 'কুরিয়ারে' :
                                   ord.status === 'confirmed' ? 'কনফার্ম' :
                                   ord.status === 'draft' ? 'ড্রাফট' :
                                   ord.status === 'cancelled' ? 'বাতিল' : 'রিটার্ন'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setModalOrder(ord)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 group-hover:underline flex items-center justify-center gap-0.5 mx-auto"
                                >
                                  <span>বিস্তারিত</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* PAYMENTS HISTORY: Previous payments by this customer           */}
              {/* ============================================================== */}
              {customerPayments.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>টাকা জমার ইতিহাস ({customerPayments.length}টি লেনদেন)</span>
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">তারিখ</th>
                          <th className="py-2 px-3">পদ্ধতি</th>
                          <th className="py-2 px-3">বিবরণ / নোট</th>
                          <th className="py-2 px-3 text-right">গৃহীত টাকা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {customerPayments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-600 font-mono">
                              {formatDateTime(pay.date)}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800 capitalize">
                              {pay.paymentMethod === 'cash' ? 'ক্যাশ (নগদ)' :
                               pay.paymentMethod === 'bkash' ? 'বিকাশ' :
                               pay.paymentMethod === 'bank' ? 'ব্যাংক' : 'কিউআর'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {pay.note || 'বাকি আদায় / জমা'}
                              {pay.isAdvanceDeposit && (
                                <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                  অগ্রিম জমা
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              +{formatCurrency(pay.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-base text-slate-700">কোনো গ্রাহক নির্বাচন করা হয়নি</h3>
              <p className="text-xs text-slate-500 mt-1">
                বাম পাশের তালিকা থেকে যে কোনো গ্রাহকে ক্লিক করুন তার পূর্ণাঙ্গ খাতা ও অর্ডার দেখতে
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ORDER DETAILS POPUP (পপআপে অর্ডারের বিস্তারিত)        */}
      {/* ============================================================== */}
      <OrderDetailsModal
        order={modalOrder}
        isOpen={!!modalOrder}
        onClose={() => setModalOrder(null)}
        settings={settings}
        onViewReceipt={onViewReceipt}
      />

      {/* ============================================================== */}
      {/* MODAL 2: ADD / EDIT CUSTOMER MODAL                             */}
      {/* ============================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>{editingCustomer ? 'গ্রাহকের তথ্য এডিট করুন' : 'নতুন গ্রাহক যোগ করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  গ্রাহকের নাম: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    মোবাইল (১ম নম্বর): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="০১৭১১..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    হোয়াটসঅ্যাপ (২য় নম্বর):
                  </label>
                  <input
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="হোয়াটসঅ্যাপ নম্বর..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ঠিকানা / ডেলিভারি এলাকা:
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: বাড়ি ১২, রোড ৪, মিরপুর-১০, ঢাকা"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {!editingCustomer && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      পূর্বের বাকি (যদি থাকে):
                    </label>
                    <MoneyInput
                      id="input-initial-due"
                      min={0}
                      value={initialDue}
                      onChange={setInitialDue}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      অগ্রিম জমা (যদি থাকে):
                    </label>
                    <MoneyInput
                      id="input-initial-advance"
                      min={0}
                      value={initialAdvance}
                      onChange={setInitialAdvance}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-emerald-700"
                    />
                  </div>
                </div>
              )}

              {editingCustomer && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <label className="block text-emerald-900 font-semibold mb-1">
                    অগ্রিম জমা ব্যালেন্স (৳):
                  </label>
                  <MoneyInput
                    id="input-edit-advance"
                    min={0}
                    value={initialAdvance}
                    onChange={setInitialAdvance}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-emerald-700 mt-1 block">
                    কাস্টমার চাইলে পরবর্তীতে কেনাকাটায় ব্যবহারের জন্য জমা রাখতে পারে
                  </span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  নোট বা মন্তব্য:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: বিশ্বস্ত কাস্টমার, প্রতি শুক্রবারে মাল নেয়..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  {editingCustomer ? 'তথ্য আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: COLLECT DUE PAYMENT OR ACCEPT ADVANCE DEPOSIT        */}
      {/* ============================================================== */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>টাকা জমা গ্রহণ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">গ্রাহক: {selectedCustomer.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4 text-xs sm:text-sm">
              
              {/* Account Status Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block">বর্তমান বকেয়া বাকি:</span>
                  <span className="text-base font-black text-rose-600">
                    ৳{selectedCustomer.totalDue || 0}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-500 text-[11px] block">পূর্বের অগ্রিম জমা:</span>
                  <span className="text-base font-bold text-emerald-700">
                    ৳{selectedCustomer.advanceBalance || 0}
                  </span>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  জমা টাকার পরিমাণ (৳): <span className="text-rose-500">*</span>
                </label>
                <MoneyInput
                  id="input-collect-payment"
                  min={1}
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  className="w-full text-base font-black py-2.5 px-3 bg-white border-2 border-blue-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Overpayment / Advance Notice */}
              {paymentAmount > (selectedCustomer.totalDue || 0) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>অতিরিক্ত টাকা অগ্রিম হিসেবে জমা থাকবে</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    বকেয়া পরিশোধের পর অতিরিক্ত <strong>৳{paymentAmount - (selectedCustomer.totalDue || 0)} টাকা</strong> কাস্টমারের অ্যাকাউন্টে "অগ্রিম জমা (Advance Balance)" হিসেবে সংরক্ষিত থাকবে এবং পরবর্তী কেনাকাটায় স্বয়ংক্রিয়ভাবে সমন্বয় হবে।
                  </p>
                </div>
              )}

              {/* Payment Channel */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">টাকা গ্রহণের মাধ্যম:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'ক্যাশ (নগদ)' },
                    { id: 'bkash', label: 'বিকাশ' },
                    { id: 'bank', label: 'ব্যাংক' },
                    { id: 'qr', label: 'কিউআর' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2 px-1 text-center rounded-xl font-bold text-xs border transition cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">মন্তব্য / বিবরণ (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="যেমন: ক্যাশ টাকা দিলেন বা ব্যাংক ট্রান্সফার..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>জমা নিশ্চিত করুন</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
