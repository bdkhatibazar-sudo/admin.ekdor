import React, { useState, useMemo, useEffect } from 'react';
import { Order, CourierRemittanceBatch, CourierRemittanceItem, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { 
  X, 
  Truck, 
  Check, 
  Search, 
  Building2, 
  DollarSign, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Percent,
  Plus,
  Trash2,
  HelpCircle
} from 'lucide-react';

interface CourierBatchRemittanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  initialSelectedOrderIds?: string[];
  settings?: StoreSettings;
  onSettleBatch: (batch: CourierRemittanceBatch, createInwardExpense?: boolean) => void;
}

export const CourierBatchRemittanceModal: React.FC<CourierBatchRemittanceModalProps> = ({
  isOpen,
  onClose,
  orders,
  initialSelectedOrderIds = [],
  settings,
  onSettleBatch,
}) => {
  // 1. Available pending COD orders
  const pendingCodOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.orderType === 'online' || (o.codAmount && o.codAmount > 0) || o.courierSettlementStatus) &&
        o.status !== 'cancelled' &&
        o.courierSettlementStatus !== 'settled'
    );
  }, [orders]);

  // Extract unique courier names
  const availableCouriers = useMemo(() => {
    const list = new Set<string>();
    orders.forEach((o) => {
      if (o.courierName?.trim()) list.add(o.courierName.trim());
    });
    if (list.size === 0) {
      list.add('Steadfast Courier');
      list.add('Pathao Courier');
      list.add('RedX');
      list.add('Paperfly');
      list.add('সুন্দরবন কুরিয়ার');
    }
    return Array.from(list);
  }, [orders]);

  // Form States
  const [selectedCourier, setSelectedCourier] = useState<string>('Steadfast Courier');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [remittanceDate, setRemittanceDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentChannel, setPaymentChannel] = useState<'bank' | 'bkash' | 'cash'>('bank');
  const [bankReference, setBankReference] = useState<string>('');
  const [generalNote, setGeneralNote] = useState<string>('');

  // Selected Order IDs map: orderId -> { codCollection: number, deliveryCharge: number }
  const [selectedItemsMap, setSelectedItemsMap] = useState<
    Record<string, { codCollection: number; deliveryCharge: number }>
  >({});

  // Other deductions (যেমন কেনা মালের কুরিয়ার চার্জ বা রিটার্ন কর্তন)
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [otherDeductionsNote, setOtherDeductionsNote] = useState<string>('কেনা মালের কুরিয়ার চার্জ বাবদ কর্তন');
  const [createExpenseForDeduction, setCreateExpenseForDeduction] = useState<boolean>(true);

  // COD fee options
  const [codFeeMethod, setCodFeeMethod] = useState<'after_deductions' | 'total_collection'>('after_deductions');
  const [codPercentage, setCodPercentage] = useState<number>(1);
  const [customCodFeeOverride, setCustomCodFeeOverride] = useState<string>(''); // if user manually enters fee
  const [useCustomCodFee, setUseCustomCodFee] = useState<boolean>(false);

  // Search in parcel selector
  const [parcelSearch, setParcelSearch] = useState<string>('');
  const [courierFilter, setCourierFilter] = useState<string>('all');

  // Initialize batch number and preselected orders when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const generatedBatchNo = `REM-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${randomSuffix}`;
      setBatchNumber(generatedBatchNo);
      setRemittanceDate(now.toISOString().slice(0, 10));

      const newMap: Record<string, { codCollection: number; deliveryCharge: number }> = {};
      
      const ordersToPreselect = initialSelectedOrderIds.length > 0 
        ? pendingCodOrders.filter(o => initialSelectedOrderIds.includes(o.id))
        : [];

      ordersToPreselect.forEach((o) => {
        const codAmt = o.codAmount !== undefined && o.codAmount > 0 
          ? o.codAmount 
          : Math.max(0, o.grandTotal - (o.paidAmount || 0));
        const delCharge = o.courierDeliveryCost !== undefined 
          ? o.courierDeliveryCost 
          : (o.deliveryCharge !== undefined && o.deliveryCharge > 0 ? o.deliveryCharge : 130);
        newMap[o.id] = {
          codCollection: codAmt,
          deliveryCharge: delCharge,
        };
      });

      setSelectedItemsMap(newMap);
      if (ordersToPreselect.length > 0 && ordersToPreselect[0].courierName) {
        setSelectedCourier(ordersToPreselect[0].courierName);
      }
    }
  }, [isOpen, initialSelectedOrderIds, pendingCodOrders]);

  // Filtered pending orders available to add
  const filteredAvailableOrders = useMemo(() => {
    return pendingCodOrders.filter((o) => {
      if (courierFilter !== 'all' && o.courierName !== courierFilter) {
        return false;
      }
      if (!parcelSearch.trim()) return true;
      const q = parcelSearch.toLowerCase().trim();
      return (
        o.invoiceNumber.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.includes(q)) ||
        (o.courierTrackingCode && o.courierTrackingCode.toLowerCase().includes(q)) ||
        (o.courierName && o.courierName.toLowerCase().includes(q))
      );
    });
  }, [pendingCodOrders, courierFilter, parcelSearch]);

  // Toggle order selection
  const handleToggleOrder = (order: Order) => {
    setSelectedItemsMap((prev) => {
      const next = { ...prev };
      if (next[order.id]) {
        delete next[order.id];
      } else {
        const codAmt = order.codAmount !== undefined && order.codAmount > 0 
          ? order.codAmount 
          : Math.max(0, order.grandTotal - (order.paidAmount || 0));
        const delCharge = order.courierDeliveryCost !== undefined 
          ? order.courierDeliveryCost 
          : (order.deliveryCharge !== undefined && order.deliveryCharge > 0 ? order.deliveryCharge : 130);
        next[order.id] = {
          codCollection: codAmt,
          deliveryCharge: delCharge,
        };
      }
      return next;
    });
  };

  // Select all filtered orders
  const handleSelectAllFiltered = () => {
    setSelectedItemsMap((prev) => {
      const next = { ...prev };
      filteredAvailableOrders.forEach((o) => {
        if (!next[o.id]) {
          const codAmt = o.codAmount !== undefined && o.codAmount > 0 
            ? o.codAmount 
            : Math.max(0, o.grandTotal - (o.paidAmount || 0));
          const delCharge = o.courierDeliveryCost !== undefined 
            ? o.courierDeliveryCost 
            : (o.deliveryCharge !== undefined && o.deliveryCharge > 0 ? o.deliveryCharge : 130);
          next[o.id] = {
            codCollection: codAmt,
            deliveryCharge: delCharge,
          };
        }
      });
      return next;
    });
  };

  // Unselect all
  const handleUnselectAll = () => {
    setSelectedItemsMap({});
  };

  // Update specific item collection or delivery charge
  const handleUpdateItemValue = (
    orderId: string, 
    field: 'codCollection' | 'deliveryCharge', 
    val: number
  ) => {
    setSelectedItemsMap((prev) => {
      const current = prev[orderId];
      if (!current) return prev;
      return {
        ...prev,
        [orderId]: {
          ...current,
          [field]: Math.max(0, isNaN(val) ? 0 : val),
        },
      };
    });
  };

  // Calculated batch metrics
  const selectedOrderIds = Object.keys(selectedItemsMap);
  const selectedCount = selectedOrderIds.length;

  const {
    totalCollected,
    totalDeliveryCharges,
    totalNetParcel,
  } = useMemo(() => {
    let coll = 0;
    let deliv = 0;

    selectedOrderIds.forEach((id) => {
      const item = selectedItemsMap[id];
      if (item) {
        coll += item.codCollection;
        deliv += item.deliveryCharge;
      }
    });

    return {
      totalCollected: coll,
      totalDeliveryCharges: deliv,
      totalNetParcel: Math.max(0, coll - deliv),
    };
  }, [selectedItemsMap, selectedOrderIds]);

  // Total delivery and other deductions
  const totalDeliveryAndDeductions = totalDeliveryCharges + (Number(otherDeductions) || 0);

  // Balance before COD Fee
  // E.g.: 9,500 - (700 + 300) = 8,500 BDT
  const balanceBeforeCodFee = Math.max(0, totalCollected - totalDeliveryAndDeductions);

  // COD Fee calculation
  const calculatedCodFee = useMemo(() => {
    if (useCustomCodFee && customCodFeeOverride !== '') {
      return Number(customCodFeeOverride) || 0;
    }
    const rate = (Number(codPercentage) || 0) / 100;
    if (codFeeMethod === 'after_deductions') {
      // 1% of (Total Collected - Total Delivery/Other Deductions)
      return Math.round(balanceBeforeCodFee * rate);
    } else {
      // 1% of Total Collection
      return Math.round(totalCollected * rate);
    }
  }, [useCustomCodFee, customCodFeeOverride, codPercentage, codFeeMethod, balanceBeforeCodFee, totalCollected]);

  // Net Bank Deposit: Balance before COD Fee - COD Fee
  // E.g.: 8,500 - 85 = 8,415 BDT
  const netBankPayable = Math.max(0, balanceBeforeCodFee - calculatedCodFee);

  // Actual received amount in bank
  const [actualReceivedInput, setActualReceivedInput] = useState<string>('');
  
  // Keep actual received input synchronized with calculated net unless user edited
  useEffect(() => {
    setActualReceivedInput(netBankPayable.toString());
  }, [netBankPayable]);

  const finalActualBankReceived = Number(actualReceivedInput) || netBankPayable;

  // Handle Submit Batch Settlement
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCount === 0) {
      alert('অনুগ্রহ করে বিল সমন্বয় করতে কমপক্ষে ১টি পার্সেল বা অর্ডার নির্বাচন করুন।');
      return;
    }

    if (!batchNumber.trim()) {
      alert('অনুগ্রহ করে কুরিয়ার বিল বা রেমিট্যান্স নম্বর প্রদান করুন।');
      return;
    }

    const items: CourierRemittanceItem[] = selectedOrderIds.map((orderId) => {
      const order = orders.find((o) => o.id === orderId);
      const val = selectedItemsMap[orderId];
      return {
        orderId,
        invoiceNumber: order ? order.invoiceNumber : orderId,
        customerName: order ? order.customerName : 'গ্রাহক',
        customerPhone: order?.customerPhone,
        trackingCode: order?.courierTrackingCode,
        codCollection: val.codCollection,
        deliveryCharge: val.deliveryCharge,
        netOrderAmount: Math.max(0, val.codCollection - val.deliveryCharge),
      };
    });

    const batch: CourierRemittanceBatch = {
      id: `rem-batch-${Date.now()}`,
      batchNumber: batchNumber.trim(),
      courierName: selectedCourier,
      date: remittanceDate,
      items,
      orderCount: selectedCount,
      totalCollected,
      totalDeliveryCharges,
      otherDeductions: Number(otherDeductions) || 0,
      otherDeductionsNote: (Number(otherDeductions) || 0) > 0 ? otherDeductionsNote : undefined,
      totalDeliveryAndDeductions,
      balanceBeforeCodFee,
      codFeePercentage: codPercentage,
      codFeeAmount: calculatedCodFee,
      netBankPayable,
      actualBankReceived: finalActualBankReceived,
      paymentChannel,
      bankReference: bankReference.trim() || undefined,
      note: generalNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSettleBatch(batch, createExpenseForDeduction && (Number(otherDeductions) || 0) > 0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">কুরিয়ার বাল্ক বিল / রেমিট্যান্স এন্ট্রি</h2>
                <span className="bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                  একসাথে একাধিক বিল রিকনসিল
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                কুরিয়ারের প্রদত্ত হিসাব অনুযায়ী কালেকশন, ডেলিভারি চার্জ, অন্যান্য কর্তন ও ১% বাদ দিয়ে ব্যাংক সমন্বয়
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* STEP 1: COURIER & RECONCILIATION INFO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-3">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>১. কুরিয়ার ও বিল স্টেটমেন্ট তথ্য</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Courier Selection */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">কুরিয়ার সংস্থা *</label>
                <div className="relative">
                  <select
                    value={selectedCourier}
                    onChange={(e) => {
                      setSelectedCourier(e.target.value);
                      setCourierFilter(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {availableCouriers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="অন্যান্য কুরিয়ার">অন্যান্য কুরিয়ার</option>
                  </select>
                </div>
              </div>

              {/* Batch / Invoice Number */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  রেমিট্যান্স / বিল ভাউচার নং *
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="যেমন: REM-2026-09-01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Remittance Date */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">বিল প্রদানের তারিখ *</label>
                <input
                  type="date"
                  required
                  value={remittanceDate}
                  onChange={(e) => setRemittanceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Payment Channel */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">যে একাউন্টে টাকা ঢুকেছে *</label>
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                >
                  <option value="bank">🏦 ব্যাংক একাউন্ট (Bank Deposit)</option>
                  <option value="bkash">📱 বিকাশ মার্চেন্ট/ব্যক্তিগত (bKash)</option>
                  <option value="cash">💵 সরাসরি ক্যাশ রিসিভ (Cash)</option>
                </select>
              </div>
            </div>

            {/* Bank Reference & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  ব্যাংক ট্রানজেকশন আইডি / চেক নং (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  placeholder="যেমন: Dutch Bangla A/C 123... বা TrxID: 9X82K..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  অতিরিক্ত মন্তব্য / নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  placeholder="যেমন: সেপ্টেম্বর মাসের ১ম সপ্তাহের কুরিয়ার পেমেন্ট"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: PARCEL SELECTOR (TABLE OF ORDERS IN THE BILL) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  ২. বিলে অন্তর্ভুক্ত পার্সেলসমূহ নির্বাচন ও চার্জ সমন্বয়
                </h3>
                <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-xs">
                  {selectedCount} টি নির্বাচিত
                </span>
              </div>

              {/* Action Buttons: Select All / Unselect */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold transition cursor-pointer"
                >
                  সবগুলো যোগ করুন ({filteredAvailableOrders.length})
                </button>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleUnselectAll}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold transition cursor-pointer"
                  >
                    নির্বাচন বাতিল
                  </button>
                )}
              </div>
            </div>

            {/* Filter and Search Bar for Orders */}
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-100/70 p-2.5 rounded-xl text-xs">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={parcelSearch}
                  onChange={(e) => setParcelSearch(e.target.value)}
                  placeholder="চালান নং, কাস্টমার নাম, মোবাইল, ট্র্যাকিং কোড দিয়ে খুঁজুন..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={courierFilter}
                  onChange={(e) => setCourierFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">ফিল্টার: সকল কুরিয়ার</option>
                  {availableCouriers.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table / List of Orders */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center w-10">নির্বাচন</th>
                      <th className="p-2.5">চালান ও গ্রাহক</th>
                      <th className="p-2.5">কুরিয়ার ও ট্র্যাকিং</th>
                      <th className="p-2.5 text-right w-28">কুরিয়ার কালেকশন (৳)</th>
                      <th className="p-2.5 text-right w-28">ডেলিভারি চার্জ (৳)</th>
                      <th className="p-2.5 text-right w-24">নিট জমা (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredAvailableOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          <Truck className="w-8 h-8 mx-auto text-slate-300 mb-1 opacity-60" />
                          <p className="font-semibold text-slate-600">কোনো বকেয়া সিওডি পার্সেল পাওয়া যায়নি</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">সবগুলো পার্সেল ইতিমধ্যেই ব্যাংকে সমন্বিত বা খালাস হয়েছে।</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAvailableOrders.map((order) => {
                        const isSelected = !!selectedItemsMap[order.id];
                        const itemVal = selectedItemsMap[order.id];
                        const defaultCodAmt = order.codAmount !== undefined && order.codAmount > 0 
                          ? order.codAmount 
                          : Math.max(0, order.grandTotal - (order.paidAmount || 0));
                        const defaultDelCharge = order.courierDeliveryCost !== undefined 
                          ? order.courierDeliveryCost 
                          : (order.deliveryCharge !== undefined && order.deliveryCharge > 0 ? order.deliveryCharge : 130);

                        const currentCod = itemVal ? itemVal.codCollection : defaultCodAmt;
                        const currentDel = itemVal ? itemVal.deliveryCharge : defaultDelCharge;
                        const netOrder = Math.max(0, currentCod - currentDel);

                        return (
                          <tr
                            key={order.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleOrder(order)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Invoice & Customer */}
                            <td className="p-2.5">
                              <div className="font-mono font-bold text-slate-900">
                                #{order.invoiceNumber}
                              </div>
                              <div className="text-[11px] text-slate-600 truncate max-w-[180px]">
                                {order.customerName}
                                {order.customerPhone && (
                                  <span className="text-slate-400 font-mono ml-1">({order.customerPhone})</span>
                                )}
                              </div>
                            </td>

                            {/* Courier & Tracking */}
                            <td className="p-2.5">
                              <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                                {order.courierName || selectedCourier}
                              </span>
                              {order.courierTrackingCode && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  #{order.courierTrackingCode}
                                </div>
                              )}
                            </td>

                            {/* COD Collection Input */}
                            <td className="p-2 text-right">
                              {isSelected ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={itemVal.codCollection}
                                  onChange={(e) =>
                                    handleUpdateItemValue(order.id, 'codCollection', parseFloat(e.target.value))
                                  }
                                  className="w-24 text-right px-2 py-1 border border-blue-300 rounded font-bold text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                              ) : (
                                <span className="font-bold text-slate-700">৳{defaultCodAmt}</span>
                              )}
                            </td>

                            {/* Delivery Charge Input */}
                            <td className="p-2 text-right">
                              {isSelected ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={itemVal.deliveryCharge}
                                  onChange={(e) =>
                                    handleUpdateItemValue(order.id, 'deliveryCharge', parseFloat(e.target.value))
                                  }
                                  className="w-24 text-right px-2 py-1 border border-blue-300 rounded font-medium text-rose-600 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                              ) : (
                                <span className="text-rose-600 font-medium">৳{defaultDelCharge}</span>
                              )}
                            </td>

                            {/* Net Order Amount */}
                            <td className="p-2.5 text-right font-bold text-blue-900">
                              ৳{netOrder}
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

          {/* STEP 3: FINANCIAL RECONCILIATION SUMMARY BOX (USER'S EXACT FORMULA) */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  ৩. কুরিয়ার বিল হিসাব, কেনা মালের চার্জ কর্তন ও ১% সিওডি ফি সমন্বয়
                </h3>
              </div>
              <span className="text-xs font-semibold text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-lg">
                পার্সেল: {selectedCount} টি
              </span>
            </div>

            {/* Calculations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              
              {/* Left Column: Breakdowns */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
                
                {/* 1. Total COD Collection */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">
                    মোট পার্সেল কালেকশন ({selectedCount} টি):
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(totalCollected)}
                  </span>
                </div>

                {/* 2. Parcel Delivery Charges */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">
                    পার্সেল ডেলিভারি চার্জ বাবদ কর্তন:
                  </span>
                  <span className="font-semibold text-rose-600 text-sm">
                    - {formatCurrency(totalDeliveryCharges)}
                  </span>
                </div>

                {/* 3. Other Courier Deductions (যেমন কেনা মালের কুরিয়ার চার্জ) */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-900 block text-xs">
                        অন্যান্য কর্তন (যেমন: কেনা মালের কুরিয়ার চার্জ):
                      </span>
                      <span className="text-[10px] text-amber-700 block">
                        মহাজনের মাল রিসিভ বা রিটার্ন পার্সেল চার্জ থাকলে এখানে লিখুন
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-rose-600 text-sm">- ৳</span>
                      <input
                        type="number"
                        min="0"
                        value={otherDeductions === 0 ? '' : otherDeductions}
                        onChange={(e) => setOtherDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="যেমন: 300"
                        className="w-24 text-right px-2 py-1 border border-amber-300 rounded font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {otherDeductions > 0 && (
                    <div className="pt-2 border-t border-amber-200 space-y-2">
                      <input
                        type="text"
                        value={otherDeductionsNote}
                        onChange={(e) => setOtherDeductionsNote(e.target.value)}
                        placeholder="কর্তনের বিবরণ (যেমন: কেনা মালের কুরিয়ার ভাড়া)"
                        className="w-full px-2.5 py-1 border border-amber-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />

                      <label className="flex items-center gap-2 cursor-pointer text-amber-900 text-[11px] font-medium">
                        <input
                          type="checkbox"
                          checked={createExpenseForDeduction}
                          onChange={(e) => setCreateExpenseForDeduction(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>
                          এই <strong>৳{otherDeductions}</strong> টাকা দোকানের <strong>পরিবহন খরচে (Expense)</strong> স্বয়ংক্রিয়ভাবে যোগ করুন
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Subtotal of Deductions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700">
                    মোট ডেলিভারি ও অন্যান্য কর্তন:
                  </span>
                  <span className="font-bold text-rose-700">
                    {formatCurrency(totalDeliveryAndDeductions)}
                  </span>
                </div>

                {/* Balance before COD Fee */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      কর্তন বাদে উদ্বৃত্ত ব্যালেন্স:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({totalCollected} - {totalDeliveryAndDeductions})
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(balanceBeforeCodFee)}
                  </span>
                </div>
              </div>

              {/* Right Column: 1% COD Fee & Net Bank Received */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-100 shadow-2xs flex flex-col justify-between">
                
                {/* 1% COD Fee Config */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-blue-900 font-bold">
                      <Percent className="w-3.5 h-3.5 text-blue-600" />
                      <span>কুরিয়ার সিওডি কমিশন ফি</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600 font-medium">হার:</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={codPercentage}
                        onChange={(e) => setCodPercentage(parseFloat(e.target.value) || 0)}
                        className="w-14 text-center px-1 py-0.5 border border-blue-300 rounded font-bold text-slate-900 bg-white"
                      />
                      <span className="font-bold text-blue-900">%</span>
                    </div>
                  </div>

                  {/* Calculation Basis Option (User's specific: after delivery deduction vs total collection) */}
                  <div className="space-y-1 text-[11px] text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="codBasis"
                        checked={codFeeMethod === 'after_deductions'}
                        onChange={() => setCodFeeMethod('after_deductions')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        কর্তন বাদে অবশিষ্ট উদ্বৃত্তের উপর {codPercentage}% (যেমন: ৳{balanceBeforeCodFee} × {codPercentage}% = <strong>৳{Math.round(balanceBeforeCodFee * (codPercentage / 100))}</strong>)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="codBasis"
                        checked={codFeeMethod === 'total_collection'}
                        onChange={() => setCodFeeMethod('total_collection')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        মোট কালেকশনের উপর {codPercentage}% (যেমন: ৳{totalCollected} × {codPercentage}% = <strong>৳{Math.round(totalCollected * (codPercentage / 100))}</strong>)
                      </span>
                    </label>
                  </div>

                  {/* Calculated COD Fee & Custom Override */}
                  <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                    <span className="font-bold text-slate-700">
                      সিওডি ফি বাবদ কর্তন:
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-rose-600 font-bold">- ৳</span>
                      <input
                        type="number"
                        min="0"
                        value={useCustomCodFee ? customCodFeeOverride : calculatedCodFee}
                        onChange={(e) => {
                          setUseCustomCodFee(true);
                          setCustomCodFeeOverride(e.target.value);
                        }}
                        className="w-20 text-right px-2 py-0.5 border border-blue-300 rounded font-bold text-rose-600 bg-white"
                        title="কুরিয়ার স্টেটমেন্টের সাথে মিল রাখতে সরাসরি পরিবর্তন করতে পারেন"
                      />
                    </div>
                  </div>
                </div>

                {/* FINAL NET BANK AMOUNT HERO CARD */}
                <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs uppercase font-bold tracking-wider opacity-90">
                      ব্যাংকে নিট জমা (Net Bank Credit)
                    </span>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {paymentChannel === 'bank' ? 'ব্যাংক একাউন্ট' : paymentChannel === 'bkash' ? 'বিকাশ' : 'ক্যাশ'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {formatCurrency(finalActualBankReceived)}
                      </span>
                    </div>

                    <div className="text-right text-[11px] opacity-90">
                      <span>প্রাপ্য: ৳{netBankPayable}</span>
                    </div>
                  </div>

                  {/* Manual adjustment if bank received slightly differs (rounding or bank charge) */}
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                    <span className="opacity-90">ব্যাংকে প্রকৃত ক্রেডিট টাকা:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold">৳</span>
                      <input
                        type="number"
                        value={actualReceivedInput}
                        onChange={(e) => setActualReceivedInput(e.target.value)}
                        className="w-24 px-2 py-0.5 rounded bg-white text-slate-900 font-bold text-right text-xs focus:ring-2 focus:ring-emerald-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </form>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {selectedCount === 0 ? (
              <span className="text-amber-700 font-semibold">⚠️ অনুগ্রহ করে কমপক্ষে একটি পার্সেল নির্বাচন করুন</span>
            ) : (
              <span>
                <strong>{selectedCount} টি পার্সেল</strong> রিকনসিল হবে এবং <strong>৳{finalActualBankReceived}</strong> টাকা আপনার <strong>{paymentChannel === 'bank' ? 'ব্যাংক' : paymentChannel === 'bkash' ? 'বিকাশ' : 'ক্যাশ'}</strong> তহবিলে জমা হবে।
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              বাতিল
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedCount === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>বিল কনফার্ম ও ব্যাংকে ৳{finalActualBankReceived} জমা করুন</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
