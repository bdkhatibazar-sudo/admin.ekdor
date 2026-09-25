import React, { useState, useMemo } from 'react';
import { Product, PurchaseRecord, PurchaseItem, SupplierDuePayment } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import {
  Boxes,
  Plus,
  Search,
  Trash2,
  Calendar,
  User,
  Phone,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';

interface PurchaseStockInProps {
  products: Product[];
  purchases: PurchaseRecord[];
  supplierDuePayments: SupplierDuePayment[];
  onAddPurchase: (purchase: PurchaseRecord) => void;
  onDeletePurchase: (purchaseId: string) => void;
  onPaySupplierDue: (payment: SupplierDuePayment) => void;
}

export const PurchaseStockIn: React.FC<PurchaseStockInProps> = ({
  products,
  purchases,
  supplierDuePayments,
  onAddPurchase,
  onDeletePurchase,
  onPaySupplierDue,
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'supplier_dues'>('purchases');
  const [searchQuery, setSearchQuery] = useState('');

  // New Purchase Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemCost, setItemCost] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Supplier Due Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPurchaseForPay, setSelectedPurchaseForPay] = useState<PurchaseRecord | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');

  // Calculate stats
  const stats = useMemo(() => {
    let totalPurchased = 0;
    let totalPaid = 0;
    let totalDue = 0;

    purchases.forEach((p) => {
      totalPurchased += p.totalAmount;
      totalPaid += p.paidAmount;
      totalDue += p.dueAmount;
    });

    const supplierPaidExtra = supplierDuePayments.reduce((s, p) => s + p.amount, 0);
    const netSupplierDue = Math.max(0, totalDue - supplierPaidExtra);

    return {
      totalPurchased,
      totalPaid: totalPaid + supplierPaidExtra,
      netSupplierDue,
      invoiceCount: purchases.length,
    };
  }, [purchases, supplierDuePayments]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return purchases.filter((p) => {
      return (
        !q ||
        p.supplierName.toLowerCase().includes(q) ||
        p.invoiceNumber?.toLowerCase().includes(q) ||
        p.supplierPhone?.toLowerCase().includes(q)
      );
    });
  }, [purchases, searchQuery]);

  const handleAddItem = () => {
    if (!selectedProductId || itemQty <= 0) {
      alert('পণ্য এবং পরিমাণ নির্বাচন করুন!');
      return;
    }
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const unitCost = itemCost > 0 ? itemCost : prod.purchasePrice;
    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        quantity: itemQty,
        unitCost,
        subtotal: itemQty * unitCost,
      },
    ]);

    setSelectedProductId('');
    setItemQty(1);
    setItemCost(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPurchaseAmount = useMemo(() => {
    return items.reduce((sum, i) => sum + i.subtotal, 0);
  }, [items]);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || items.length === 0) {
      alert('সাপ্লায়ারের নাম এবং অন্তত একটি পণ্য তালিকায় যুক্ত করুন!');
      return;
    }

    const dueAmount = Math.max(0, totalPurchaseAmount - (paidAmount || 0));

    const newPurchase: PurchaseRecord = {
      id: `pur-${Date.now()}`,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date(purchaseDate).toISOString(),
      items,
      totalAmount: totalPurchaseAmount,
      paidAmount: paidAmount || 0,
      dueAmount,
      notes: notes.trim() || undefined,
    };

    onAddPurchase(newPurchase);
    setIsPurchaseModalOpen(false);
    setSupplierName('');
    setSupplierPhone('');
    setInvoiceNumber('');
    setItems([]);
    setPaidAmount(0);
    setNotes('');
  };

  const handleOpenPayModal = (pur: PurchaseRecord) => {
    setSelectedPurchaseForPay(pur);
    setPayAmount(pur.dueAmount);
    setIsPayModalOpen(true);
  };

  const handleSavePaySupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseForPay || payAmount <= 0) return;

    const payment: SupplierDuePayment = {
      id: `sup-pay-${Date.now()}`,
      purchaseId: selectedPurchaseForPay.id,
      supplierName: selectedPurchaseForPay.supplierName,
      amount: payAmount,
      date: new Date().toISOString(),
      paymentMethod: payMethod,
      note: payNote.trim() || `চালান #${selectedPurchaseForPay.invoiceNumber} এর বাকি পরিশোধ`,
    };

    onPaySupplierDue(payment);
    setIsPayModalOpen(false);
    setSelectedPurchaseForPay(null);
    setPayAmount(0);
    setPayNote('');
  };

  const handleDeletePur = (pur: PurchaseRecord) => {
    if (confirm(`আপনি কি "${pur.supplierName}" এর চালান #${pur.invoiceNumber} মুছে ফেলতে চান? যুক্ত করা স্টক ইনভেন্টরি থেকে বাদ দেওয়া হবে।`)) {
      onDeletePurchase(pur.id);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">মোট মাল ক্রয় (Purchases)</span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            {formatCurrency(stats.totalPurchased)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">মোট {stats.invoiceCount}টি চালান</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">পরিশোধিত মোট অর্থ</span>
          <span className="text-xl font-bold text-emerald-700 block mt-1">
            {formatCurrency(stats.totalPaid)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">সাপ্লায়ারকে দেওয়া হয়েছে</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 block">মহাজন / সাপ্লায়ার বাকি</span>
          <span className="text-xl font-bold text-rose-700 block mt-1">
            {formatCurrency(stats.netSupplierDue)}
          </span>
          <span className="text-[11px] text-rose-500 mt-1 block">পরিশোধ করতে হবে</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'purchases'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-600" />
              <span>মাল ক্রয় ও চালান ({purchases.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supplier_dues')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'supplier_dues'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>বাকি পরিশোধ হিস্ট্রি ({supplierDuePayments.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="সাপ্লায়ার বা চালান নং..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন চালান স্টক-ইন</span>
            </button>
          </div>
        </div>

        {/* PURCHASES LIST */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">তারিখ ও চালান নং</th>
                  <th className="p-3">মহাজন / সাপ্লায়ার</th>
                  <th className="p-3">পণ্যের বিবরণ</th>
                  <th className="p-3 text-right">মোট বিল</th>
                  <th className="p-3 text-right">পরিশোধ</th>
                  <th className="p-3 text-right">বাকি</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 font-mono">
                        #{pur.invoiceNumber || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(pur.date)}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-800">{pur.supplierName}</div>
                      {pur.supplierPhone && (
                        <div className="text-[11px] text-slate-400">{pur.supplierPhone}</div>
                      )}
                    </td>

                    <td className="p-3 text-slate-600">
                      {pur.items.map((i, idx) => (
                        <span key={idx} className="block text-xs">
                          {i.productName} ({i.quantity} × {formatCurrency(i.unitCost)})
                        </span>
                      ))}
                    </td>

                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(pur.totalAmount)}
                    </td>

                    <td className="p-3 text-right font-semibold text-emerald-700">
                      {formatCurrency(pur.paidAmount)}
                    </td>

                    <td className="p-3 text-right font-bold text-rose-600">
                      {pur.dueAmount > 0 ? formatCurrency(pur.dueAmount) : '—'}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {pur.dueAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(pur)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition"
                          >
                            বাকি শোধ
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePur(pur)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="মুছুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      কোনো ক্রয়ের চালান পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SUPPLIER DUES PAYMENTS LIST */}
        {activeTab === 'supplier_dues' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">মহাজন / সাপ্লায়ার</th>
                  <th className="p-3">পেমেন্ট মাধ্যম</th>
                  <th className="p-3">নোট</th>
                  <th className="p-3 text-right">পরিশোধিত টাকা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplierDuePayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 text-slate-600">{formatDate(pay.date)}</td>
                    <td className="p-3 font-bold text-slate-900">{pay.supplierName}</td>
                    <td className="p-3 text-xs uppercase font-semibold text-slate-700">
                      {pay.paymentMethod || 'cash'}
                    </td>
                    <td className="p-3 text-slate-500 text-xs">{pay.note || '—'}</td>
                    <td className="p-3 text-right font-bold text-emerald-700 text-sm">
                      {formatCurrency(pay.amount)}
                    </td>
                  </tr>
                ))}

                {supplierDuePayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                      মহাজন বাকি পরিশোধের কোনো রেকর্ড নেই।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW PURCHASE STOCK IN MODAL */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-5 space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>নতুন মাল ক্রয় ও স্টক ইনভেন্টরিতে যুক্ত করুন</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs overflow-y-auto pr-1">
              {/* Supplier Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">মহাজন / সাপ্লায়ারের নাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: আল-মদিনা ফেব্রিক্স"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    placeholder="০১xxxxxxxxx"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">চালান / মেমো নম্বর</label>
                  <input
                    type="text"
                    placeholder="যেমন: SUP-1001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Add Product Line */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block">পণ্যের স্টক যোগ করুন:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = products.find((x) => x.id === e.target.value);
                        if (p) setItemCost(p.purchasePrice || 0);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">-- পণ্য বেছে নিন --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (বর্তমান স্টক: {p.stockQty})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="পরিমাণ"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="কেনা দর"
                      value={itemCost || ''}
                      onChange={(e) => setItemCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg transition"
                >
                  + তালিকায় আইটেম যোগ করুন
                </button>
              </div>

              {/* Items List Preview */}
              {items.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="p-2">পণ্য</th>
                        <th className="p-2 text-center">পরিমাণ</th>
                        <th className="p-2 text-right">কেনা দর</th>
                        <th className="p-2 text-right">মোট</th>
                        <th className="p-2 text-right">মুছুন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">{it.productName}</td>
                          <td className="p-2 text-center">{it.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(it.unitCost)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(it.subtotal)}</td>
                          <td className="p-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total & Payment */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-bold text-sm text-slate-900">
                  <span>চালানের সর্বমোট ক্রয় মূল্য:</span>
                  <span className="text-emerald-700">{formatCurrency(totalPurchaseAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">নগদ প্রদান (Paid):</span>
                  <MoneyInput
                    value={paidAmount}
                    onChange={(val) => setPaidAmount(val)}
                    className="w-32 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-xs"
                  />
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>মহাজন বাকি থাকবে:</span>
                  <span>{formatCurrency(Math.max(0, totalPurchaseAmount - (paidAmount || 0)))}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl"
                >
                  চালান সম্পন্ন ও স্টক আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER DUE PAYMENT MODAL */}
      {isPayModalOpen && selectedPurchaseForPay && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                মহাজন বাকি পরিশোধ: {selectedPurchaseForPay.supplierName}
              </h3>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaySupplier} className="space-y-3 text-xs">
              <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-900 font-semibold flex justify-between">
                <span>চালান #{selectedPurchaseForPay.invoiceNumber} বাকি:</span>
                <span>{formatCurrency(selectedPurchaseForPay.dueAmount)}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">পরিশোধের পরিমাণ (৳) *</label>
                <MoneyInput
                  value={payAmount}
                  onChange={(val) => setPayAmount(val)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl uppercase font-semibold"
                >
                  <option value="cash">নগদ (Cash)</option>
                  <option value="bank">ব্যাংক (Bank)</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="নোট..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  পরিশোধ নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
