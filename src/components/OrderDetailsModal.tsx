import React from 'react';
import { Order, StoreSettings } from '../types';
import { formatCurrency, formatDateTime, resolveWhatsAppNumber, createWhatsAppUrl } from '../utils/formatters';
import { 
  X, 
  Printer, 
  MessageCircle, 
  Truck, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Receipt, 
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: StoreSettings;
  onViewReceipt?: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  settings,
  onViewReceipt,
}) => {
  if (!isOpen || !order) return null;

  const targetWa = resolveWhatsAppNumber(order.customerWhatsapp, order.customerPhone);

  const handleSendWhatsApp = () => {
    if (!targetWa) {
      alert('কাস্টমারের কোনো মোবাইল নম্বর পাওয়া যায়নি!');
      return;
    }

    const itemsSummary = order.items
      .map((it, idx) => `${idx + 1}. ${it.productName} (${it.quantity} ${it.unit}) - ৳${it.total}`)
      .join('\n');

    const message = 
`*${settings?.storeName || 'একদর ডট নেট'}*
*অর্ডার মেমো #${order.invoiceNumber}*
তারিখ: ${formatDateTime(order.date)}
গ্রাহক: ${order.customerName}

*পণ্যের বিবরণ:*
-----------------------------
${itemsSummary}
-----------------------------
মোট পণ্যের মূল্য: ৳${order.subtotal}
${order.discount > 0 ? `ছাড় / ডিসকাউন্ট: -৳${order.discount}\n` : ''}${order.deliveryCharge > 0 ? `ডেলিভারি চার্জ: +৳${order.deliveryCharge}\n` : ''}*সর্বমোট মূল্য: ৳${order.grandTotal}*
পরিশোধিত: ৳${order.paidAmount}
${order.codAmount > 0 ? `*কুরিয়ার COD কালেকশন: ৳${order.codAmount}*\n` : ''}${order.dueAmount > 0 ? `*বকেয়া বাকি: ৳${order.dueAmount}*\n` : ''}${order.courierTrackingCode ? `কুরিয়ার ট্র্যাকিং কোড: #${order.courierTrackingCode}\n` : ''}
ধন্যবাদ সাথে থাকার জন্য!
${settings?.storeName || ''}`;

    const url = createWhatsAppUrl(targetWa, message);
    window.open(url, '_blank');
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'confirmed':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold">✅ কনফার্মড</span>;
      case 'draft':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-bold">⏳ ড্রাফট / কোটেশন</span>;
      case 'processing':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs px-2.5 py-1 rounded-full font-bold">📦 প্যাকিং / প্রসেসিং</span>;
      case 'shipped':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs px-2.5 py-1 rounded-full font-bold">🚚 কুরিয়ারে বুকিং</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">🎉 সফলভাবে ডেলিভার্ড</span>;
      case 'cancelled':
        return <span className="bg-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-full font-bold">❌ বাতিল</span>;
      case 'returned':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs px-2.5 py-1 rounded-full font-bold">↩️ পার্সেল রিটার্ন</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-900">
                  চালান #{order.invoiceNumber}
                </h3>
                {getStatusBadge()}
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  order.orderType === 'online' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  {order.orderType === 'online' ? 'অনলাইন / কুরিয়ার' : 'দোকান বিক্রি'}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateTime(order.date)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Customer & Shipping Information Card */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>গ্রাহক ও ডেলিভারি বিবরণ</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">গ্রাহকের নাম:</span>
                <span className="font-bold text-slate-900 text-sm">{order.customerName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">মোবাইল নম্বর:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-slate-800">{order.customerPhone || 'তথ্য নেই'}</span>
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="text-blue-600 hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <Phone className="w-3 h-3" /> কল
                    </a>
                  )}
                  {targetWa && (
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="text-emerald-700 hover:underline flex items-center gap-0.5 text-[11px] font-medium"
                    >
                      <MessageCircle className="w-3 h-3" /> হোয়াটসঅ্যাপ
                    </button>
                  )}
                </div>
              </div>

              {(order.deliveryAddress || order.recipientAddress) && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">ডেলিভারি ঠিকানা:</span>
                  <p className="font-medium text-slate-800 mt-0.5 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{order.recipientAddress || order.deliveryAddress}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Courier Details if Online */}
            {order.orderType === 'online' && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">
                    কুরিয়ার: {order.courierName || 'স্টিডফাস্ট কুরিয়ার'}
                  </span>
                </div>
                {order.courierTrackingCode && (
                  <div className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    ট্র্যাকিং কোড: <strong className="text-blue-700 font-bold">{order.courierTrackingCode}</strong>
                  </div>
                )}
                {order.courierSettlementStatus && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    order.courierSettlementStatus === 'settled'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {order.courierSettlementStatus === 'settled' ? '🟢 কুরিয়ার বিল ব্যাংকে জমা' : '⏳ কুরিয়ার বিল বাকি (COD Pending)'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>অর্ডারের পণ্যসমূহ ({order.items.length}টি আইটেম)</span>
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">পণ্যের নাম</th>
                    <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                    <th className="py-2.5 px-3 text-right">একক মূল্য</th>
                    <th className="py-2.5 px-3 text-right">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {order.items.map((it, idx) => (
                    <tr key={`${it.productId}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {it.productName}
                        {it.bundleName && (
                          <span className="ml-1.5 text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-bold inline-block">
                            🎁 {it.bundleName}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-700">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(it.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing & Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment & Channel Info */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <span>পেমেন্ট মাধ্যম ও স্ট্যাটাস</span>
              </h5>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">পেমেন্ট মেথড:</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {order.paymentMethod === 'cash' ? 'ক্যাশ (নগদ)' :
                     order.paymentMethod === 'bkash' ? 'বিকাশ / নগদ' :
                     order.paymentMethod === 'bank' ? 'ব্যাংক ট্রান্সফার' :
                     order.paymentMethod === 'qr' ? 'কিউআর পেমেন্ট' :
                     order.paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি (COD)' : 'বাকি'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">পরিশোধিত টাকা:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(order.paidAmount)}</span>
                </div>
                {order.appliedAdvance && order.appliedAdvance > 0 && (
                  <div className="flex justify-between text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                    <span>অগ্রিম জমা থেকে সমন্বয়:</span>
                    <span>-{formatCurrency(order.appliedAdvance)}</span>
                  </div>
                )}
                {order.codAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-semibold">কুরিয়ার COD কালেকশন:</span>
                    <span className="font-bold text-blue-700">{formatCurrency(order.codAmount)}</span>
                  </div>
                )}
                {order.dueAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-bold">বকেয়া বাকি:</span>
                    <span className="font-bold text-rose-600">{formatCurrency(order.dueAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bill Totals */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>পণ্য উপ-মোট:</span>
                <span className="font-medium text-slate-900">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>বিশেষ ছাড় (ডিসকাউন্ট):</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              {order.deliveryCharge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>ডেলিভারি চার্জ:</span>
                  <span className="font-medium text-slate-900">+{formatCurrency(order.deliveryCharge)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>সর্বমোট প্রদেয়:</span>
                <span className="text-base text-emerald-700 font-black">{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.note && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <span className="font-bold block mb-0.5">অর্ডার নোট / মন্তব্য:</span>
              <p>{order.note}</p>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            বন্ধ করুন
          </button>

          <div className="flex items-center gap-2">
            {targetWa && (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>হোয়াটসঅ্যাপ মেমো</span>
              </button>
            )}

            {onViewReceipt && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewReceipt(order);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>রসিদ প্রিন্ট / ভিউ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
