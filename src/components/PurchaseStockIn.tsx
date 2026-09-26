import React, { useState, useMemo } from 'react';
import { Product, PurchaseRecord, PurchaseItem, UnitType, SupplierDuePayment } from '../types';
import { formatCurrency, formatDate, toBanglaNumber } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { 
  PackagePlus, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  DollarSign, 
  FileText, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Phone,
  ArrowRight,
  Boxes,
  CreditCard,
  Building2,
  Smartphone,
  Coins,
  QrCode,
  Users
} from 'lucide-react';

interface PurchaseStockInProps {
  purchases: PurchaseRecord[];
  products: Product[];
  supplierDuePayments?: SupplierDuePayment[];
  onAddPurchase: (purchase: PurchaseRecord) => void;
  onPaySupplierDue?: (payment: SupplierDuePayment) => void;
  onDeletePurchase?: (purchaseId: string) => void;
}

export const PurchaseStockIn: React.FC<PurchaseStockInProps> = ({
  purchases,
  products,
  supplierDuePayments = [],
  onAddPurchase,
  onPaySupplierDue,
  onDeletePurchase,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'supplier_khata'>('invoices');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseRecord | null>(null);

  // New Purchase Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`CH-${Date.now().toString().slice(-6)}`);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'bkash' | 'bank'>('cash');

  // Items in this purchase
  const [cartItems, setCartItems] = useState<PurchaseItem[]>([]);

  // Item selector state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemCost, setItemCost] = useState<number>(0);

  // Supplier Due Payment Modal
  const [payingPurchase, setPayingPurchase] = useState<PurchaseRecord | null>(null);
  const [duePayAmount, setDuePayAmount] = useState<number>(0);
  const [duePayMethod, setDuePayMethod] = useState<'cash' | 'qr' | 'bkash' | 'bank'>('cash');
  const [duePayNote, setDuePayNote] = useState('');

  // Update itemCost when selecting product
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setItemCost(prod.purchasePrice);
    }
  };

  // Add item to purchase cart
  const handleAddItem = () => {
    if (!selectedProductId) {
      alert('অনুগ্রহ করে পণ্য নির্বাচন করুন');
      return;
    }
    if (itemQty <= 0) {
      alert('সঠিক সংখ্যা দিন');
      return;
    }
    if (itemCost <= 0) {
      alert('সঠিক ক্রয়মূল্য (দর) দিন');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIdx = cartItems.findIndex((it) => it.productId === selectedProductId);
    if (existingIdx >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIdx].quantity + itemQty;
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: newQty,
        unitCost: itemCost,
        totalCost: Math.round(newQty * itemCost),
      };
      setCartItems(updated);
    } else {
      const newItem: PurchaseItem = {
        productId: prod.id,
        productName: prod.name,
        quantity: itemQty,
        unit: prod.unit,
        unitCost: itemCost,
        totalCost: Math.round(itemQty * itemCost),
      };
      setCartItems([...cartItems, newItem]);
    }

    // Reset item input
    setSelectedProductId('');
    setItemQty(1);
    setItemCost(0);
  };

  const handleRemoveItem = (prodId: string) => {
    setCartItems(cartItems.filter((it) => it.productId !== prodId));
  };

  const totalPurchaseAmount = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + it.totalCost, 0);
  }, [cartItems]);

  const dueAmount = useMemo(() => {
    return Math.max(0, totalPurchaseAmount - (paidAmount || 0));
  }, [totalPurchaseAmount, paidAmount]);

  // Submit complete purchase
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('মহাজন বা সাপ্লায়ারের নাম লিখুন');
      return;
    }
    if (cartItems.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি পণ্য যোগ করুন');
      return;
    }

    const newPurchase: PurchaseRecord = {
      id: `purch-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim() || `CH-${Date.now().toString().slice(-6)}`,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || undefined,
      date: new Date(purchaseDate).toISOString(),
      items: cartItems,
      totalAmount: totalPurchaseAmount,
      paidAmount: Number(paidAmount) || 0,
      dueAmount,
      paymentMethod,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onAddPurchase(newPurchase);

    // Reset form
    setSupplierName('');
    setSupplierPhone('');
    setInvoiceNumber(`CH-${Date.now().toString().slice(-6)}`);
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setPaidAmount(0);
    setPaymentMethod('cash');
    setCartItems([]);
    setSelectedProductId('');
    setItemQty(1);
    setItemCost(0);
    setIsModalOpen(false);
  };

  // Open Due Payment Modal for a purchase
  const handleOpenPayDueModal = (purchase: PurchaseRecord) => {
    setPayingPurchase(purchase);
    setDuePayAmount(purchase.dueAmount);
    setDuePayMethod('cash');
    setDuePayNote('');
  };

  // Submit Supplier Due Payment
  const handleSubmitDuePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPurchase || !onPaySupplierDue) return;
    if (duePayAmount <= 0) {
      alert('সঠিক পরিশোধের পরিমাণ দিন');
      return;
    }
    if (duePayAmount > payingPurchase.dueAmount) {
      alert(`পরিশোধের পরিমাণ বকেয়া ৳${payingPurchase.dueAmount}-এর বেশি হতে পারবে না`);
      return;
    }

    const paymentRecord: SupplierDuePayment = {
      id: `sup-pay-${Date.now()}`,
      purchaseId: payingPurchase.id,
      invoiceNumber: payingPurchase.invoiceNumber,
      supplierName: payingPurchase.supplierName,
      amount: duePayAmount,
      paymentMethod: duePayMethod,
      date: new Date().toISOString(),
      note: duePayNote.trim() || undefined,
    };

    onPaySupplierDue(paymentRecord);
    setPayingPurchase(null);
  };

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return purchases;
    return purchases.filter(
      (p) =>
        p.supplierName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        (p.supplierPhone && p.supplierPhone.includes(q))
    );
  }, [purchases, searchTerm]);

  // Aggregated Suppliers for Khata
  const supplierKhataList = useMemo(() => {
    const map = new Map<string, {
      supplierName: string;
      supplierPhone?: string;
      totalPurchases: number;
      totalPaid: number;
      totalDue: number;
      invoices: PurchaseRecord[];
    }>();

    purchases.forEach((p) => {
      const key = p.supplierName.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.totalPurchases += p.totalAmount;
        existing.totalPaid += p.paidAmount;
        existing.totalDue += p.dueAmount;
        existing.invoices.push(p);
        if (!existing.supplierPhone && p.supplierPhone) {
          existing.supplierPhone = p.supplierPhone;
        }
      } else {
        map.set(key, {
          supplierName: p.supplierName,
          supplierPhone: p.supplierPhone,
          totalPurchases: p.totalAmount,
          totalPaid: p.paidAmount,
          totalDue: p.dueAmount,
          invoices: [p],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue);
  }, [purchases]);

  // High-level Metrics
  const metrics = useMemo(() => {
    let totalSpent = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalItemsStocked = 0;

    purchases.forEach((p) => {
      totalSpent += p.totalAmount;
      totalPaid += p.paidAmount;
      totalDue += p.dueAmount;
      p.items.forEach((it) => {
        totalItemsStocked += it.quantity;
      });
    });

    return {
      totalSpent,
      totalPaid,
      totalDue,
      totalItemsStocked,
      invoiceCount: purchases.length,
    };
  }, [purchases]);

  return (
    <div id="purchase-stock-in-view" className="space-y-4">
      {/* Top Header & Action Buttons */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-indigo-600" />
            <span>মহাজনদের মাল ক্রয় ও বাকি খাতা (Stock In & Khata)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            মহাজনদের থেকে মাল ক্রয়ের চালান এন্ট্রি করুন এবং বাকি পরিশোধের হিসাব রাখুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Sub-tabs toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('invoices')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeSubTab === 'invoices' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              চালানের তালিকা
            </button>
            <button
              onClick={() => setActiveSubTab('supplier_khata')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeSubTab === 'supplier_khata' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              মহাজনদের বাকি খাতা
            </button>
          </div>

          <button
            id="btn-open-purchase-modal"
            onClick={() => {
              setInvoiceNumber(`CH-${Date.now().toString().slice(-6)}`);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন চালান এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold block">মোট মাল কেনা হয়েছে</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5">
            {formatCurrency(metrics.totalSpent)}
          </p>
          <span className="text-[10px] text-slate-400">{toBanglaNumber(metrics.invoiceCount)} টি চালানে</span>
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] text-emerald-700 font-semibold block">পরিশোধ করা হয়েছে</span>
          <p className="text-lg font-bold text-emerald-800 mt-0.5">
            {formatCurrency(metrics.totalPaid)}
          </p>
          <span className="text-[10px] text-emerald-600">নগদ / বিকাশ / ব্যাংকে পরিশোধ</span>
        </div>

        <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[11px] text-rose-700 font-semibold block">মহাজনদের বর্তমান বাকি</span>
          <p className="text-lg font-bold text-rose-700 mt-0.5">
            {formatCurrency(metrics.totalDue)}
          </p>
          <span className="text-[10px] text-rose-600">সাপ্লায়ারকে প্রদেয়</span>
        </div>

        <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 shadow-xs">
          <span className="text-[11px] text-indigo-700 font-semibold block">মোট মাল স্টকে যুক্ত হয়েছে</span>
          <p className="text-lg font-bold text-indigo-900 mt-0.5">
            {toBanglaNumber(metrics.totalItemsStocked)} একক
          </p>
          <span className="text-[10px] text-indigo-600">ইনভেন্টরি স্টকে যুক্ত</span>
        </div>
      </div>

      {/* SUB-TAB 1: INVOICES TABLE */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="মহাজন বা চালান নং দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              মোট চালান: {toBanglaNumber(filteredPurchases.length)} টি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase">
                  <th className="py-2.5 px-3">চালান / মেমো নং</th>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3">মহাজন / সাপ্লায়ার</th>
                  <th className="py-2.5 px-3">পণ্যের বিবরণ</th>
                  <th className="py-2.5 px-3 text-right">মোট ক্রয়মূল্য</th>
                  <th className="py-2.5 px-3 text-right">পরিশোধ</th>
                  <th className="py-2.5 px-3 text-right">বাকি</th>
                  <th className="py-2.5 px-3 text-center">একশন ও বাকি পরিশোধ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-1 opacity-50" />
                      <p className="text-xs font-semibold">কোনো মাল ক্রয়ের চালান পাওয়া যায়নি</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">উপরের বাটন দিয়ে নতুন চালান এন্ট্রি করুন</p>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-indigo-700">
                        #{purchase.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {formatDate(purchase.date)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {purchase.supplierName}
                        {purchase.supplierPhone && (
                          <span className="block text-[11px] font-normal text-slate-400">
                            📞 {purchase.supplierPhone}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs max-w-xs">
                        {purchase.items.map((it, idx) => (
                          <span key={idx} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mr-1 mb-0.5">
                            {it.productName} ({toBanglaNumber(it.quantity)} {it.unit} × ৳{it.unitCost})
                          </span>
                        ))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(purchase.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        {formatCurrency(purchase.paidAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {purchase.dueAmount > 0 ? (
                          <span className="text-rose-600">{formatCurrency(purchase.dueAmount)}</span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-semibold">পরিশোধিত</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {purchase.dueAmount > 0 && onPaySupplierDue && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayDueModal(purchase)}
                              className="px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition-colors cursor-pointer"
                              title="মহাজনের বাকি পরিশোধ করুন"
                            >
                              💸 বাকি পরিশোধ
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(purchase)}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
                          >
                            বিস্তারিত
                          </button>
                          {onDeletePurchase && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`আপনি কি চালান #${purchase.invoiceNumber} মুছে ফেলতে চান?`)) {
                                  onDeletePurchase(purchase.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="চালান মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SUPPLIERS KHATA (মহাজনদের বাকি খাতা) */}
      {activeSubTab === 'supplier_khata' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>মহাজন ও সরবরাহকারীদের বকেয়া তালিকা</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              মোট মহাজন: {toBanglaNumber(supplierKhataList.length)} জন
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {supplierKhataList.map((sup, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-xs transition space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{sup.supplierName}</h4>
                    {sup.supplierPhone && (
                      <p className="text-xs text-slate-500 mt-0.5">📞 {sup.supplierPhone}</p>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                    {toBanglaNumber(sup.invoices.length)} টি চালান
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">মোট কেনা:</span>
                    <b className="text-slate-800">{formatCurrency(sup.totalPurchases)}</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">পরিশোধ:</span>
                    <b className="text-emerald-700">{formatCurrency(sup.totalPaid)}</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">অবশিষ্ট বাকি:</span>
                    <b className={sup.totalDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                      {formatCurrency(sup.totalDue)}
                    </b>
                  </div>
                </div>

                {sup.totalDue > 0 && onPaySupplierDue && (
                  <div className="pt-2">
                    {/* If there's an invoice with due, allow paying it */}
                    {sup.invoices.find((inv) => inv.dueAmount > 0) && (
                      <button
                        onClick={() => {
                          const targetInv = sup.invoices.find((inv) => inv.dueAmount > 0);
                          if (targetInv) handleOpenPayDueModal(targetInv);
                        }}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        💸 এই মহাজনের বাকি পরিশোধ করুন
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUPPLIER DUE PAYMENT MODAL */}
      {payingPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>মহাজনের বাকি পরিশোধ</span>
              </h3>
              <button onClick={() => setPayingPurchase(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDuePayment} className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">মহাজন: {payingPurchase.supplierName}</p>
                <p className="text-xs text-slate-500">চালান নং: #{payingPurchase.invoiceNumber}</p>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                  <span className="text-slate-600">বর্তমান বকেয়া বাকি:</span>
                  <span className="text-rose-600 text-sm">{formatCurrency(payingPurchase.dueAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  পরিশোধের পরিমাণ (টাকা) *
                </label>
                <MoneyInput
                  id="input-supplier-due-pay"
                  value={duePayAmount}
                  onChange={setDuePayAmount}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ভাউচার বা মানি রিসিট নোট (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  value={duePayNote}
                  onChange={(e) => setDuePayNote(e.target.value)}
                  placeholder="যেমন: চেক নং #৯৮২৩ বা ক্যাশ রিসিট"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayingPurchase(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  পরিশোধ নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PURCHASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-indigo-600" />
                <span>নতুন মাল ক্রয় / চালান যোগ</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">মহাজন / কোম্পানির নাম *</label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="যেমন: সিটি ওয়েল মিল্স"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">মহাজনের ফোন (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="০১xxxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">চালান / মেমো নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="CH-12345"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Add Product Items */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 text-xs block">চালানভুক্ত পণ্য যোগ করুন:</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] text-slate-600 mb-0.5">পণ্য নির্বাচন:</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">পণ্য বেছে নিন...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (বর্তমান ক্রয়দর: ৳{p.purchasePrice})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-600 mb-0.5">পরিমাণ:</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-600 mb-0.5">ক্রয় দর (৳):</label>
                    <MoneyInput
                      id="input-item-cost"
                      value={itemCost}
                      onChange={setItemCost}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                    >
                      + যোগ করুন
                    </button>
                  </div>
                </div>

                {/* Items in Cart Table */}
                {cartItems.length > 0 && (
                  <div className="mt-3 overflow-x-auto bg-white rounded-lg border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                        <tr>
                          <th className="py-1.5 px-2 text-left">পণ্য</th>
                          <th className="py-1.5 px-2 text-center">পরিমাণ</th>
                          <th className="py-1.5 px-2 text-right">দর</th>
                          <th className="py-1.5 px-2 text-right">মোট</th>
                          <th className="py-1.5 px-2 text-center">বাদ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cartItems.map((it) => (
                          <tr key={it.productId}>
                            <td className="py-1.5 px-2 font-medium">{it.productName}</td>
                            <td className="py-1.5 px-2 text-center">{it.quantity} {it.unit}</td>
                            <td className="py-1.5 px-2 text-right">৳{it.unitCost}</td>
                            <td className="py-1.5 px-2 text-right font-bold">৳{it.totalCost}</td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.productId)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals & Payment */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-xs text-slate-500 block">মোট চালানের বিল:</span>
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(totalPurchaseAmount)}</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">পরিশোধিত টাকা (৳):</label>
                  <MoneyInput
                    id="input-purchase-paid"
                    value={paidAmount}
                    onChange={setPaidAmount}
                    placeholder="0"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">মহাজনের কাছে বাকি:</span>
                  <span className="text-lg font-bold text-rose-600">{formatCurrency(dueAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নোট বা মন্তব্য (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="চালানের কোনো বিশেষ মন্তব্য..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  চালান ও স্টক সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                চালান বিবরণ: #{selectedInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span>মহাজন: <b>{selectedInvoice.supplierName}</b></span>
                <span>তারিখ: <b>{formatDate(selectedInvoice.date)}</b></span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-left">পণ্য</th>
                      <th className="p-2 text-center">পরিমাণ</th>
                      <th className="p-2 text-right">দর</th>
                      <th className="p-2 text-right">মোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.productName}</td>
                        <td className="p-2 text-center">{it.quantity} {it.unit}</td>
                        <td className="p-2 text-right">৳{it.unitCost}</td>
                        <td className="p-2 text-right font-bold">৳{it.totalCost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between"><span>মোট বিল:</span><b>৳{selectedInvoice.totalAmount}</b></div>
                <div className="flex justify-between text-emerald-700"><span>পরিশোধিত:</span><b>৳{selectedInvoice.paidAmount}</b></div>
                <div className="flex justify-between text-rose-600 font-bold"><span>বাকি:</span><b>৳{selectedInvoice.dueAmount}</b></div>
              </div>

              {selectedInvoice.dueAmount > 0 && onPaySupplierDue && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenPayDueModal(selectedInvoice);
                    setSelectedInvoice(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  💸 এই চালানের বাকি (৳{selectedInvoice.dueAmount}) পরিশোধ করুন
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
