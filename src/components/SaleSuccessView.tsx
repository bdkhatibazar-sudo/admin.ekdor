import React from 'react';
import { Order, OrderStatus, StoreSettings } from '../types';
import { formatCurrency, formatDateTime, createWhatsAppUrl } from '../utils/formatters';
import {
  CheckCircle2,
  Printer,
  PlusCircle,
  Edit2,
  MessageCircle,
  Truck,
  Share2,
  Receipt,
  User,
  Phone,
  ArrowRight,
} from 'lucide-react';

interface SaleSuccessViewProps {
  order: Order;
  settings: StoreSettings;
  onNewSale: () => void;
  onEditOrder: (order: Order) => void;
  onViewA5Receipt: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
}

export const SaleSuccessView: React.FC<SaleSuccessViewProps> = ({
  order,
  settings,
  onNewSale,
  onEditOrder,
  onViewA5Receipt,
  onUpdateOrderStatus,
}) => {
  const handleShareWhatsApp = () => {
    const phone = order.customerPhone || '';
    const itemsList = order.items
      .map((it) => `- ${it.productName} (${it.quantity}টি) = ${formatCurrency(it.subtotal)}`)
      .join('\n');

    const msg = `আসসালামু আলাইকুম ${order.customerName || 'গ্রাহক'},
${settings.storeName} থেকে আপনার চালান প্রস্তুত হয়েছে।

চালান নম্বর: #${order.invoiceNumber}
তারিখ: ${formatDateTime(order.date)}

পণ্যের বিবরণ:
${itemsList}

সর্বমোট বিল: ${formatCurrency(order.grandTotal)}
জমা: ${formatCurrency(order.paidAmount)}
${order.dueAmount > 0 ? `বাকি: ${formatCurrency(order.dueAmount)}\n` : ''}${
      order.codAmount ? `কুরিয়ার সিওডি: ${formatCurrency(order.codAmount)}\n` : ''
    }
ধন্যবাদ!`;

    const url = createWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 pt-4 animate-in fade-in duration-200">
      {/* Success Banner */}
      <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg text-center space-y-2 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-white/20 text-white flex items-center justify-center mx-auto mb-2 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black">বিক্রি সফলভাবে সম্পন্ন হয়েছে!</h2>
        <p className="text-emerald-100 text-xs sm:text-sm font-medium">
          চালান নং <span className="font-mono font-bold text-white">#{order.invoiceNumber}</span> সফলভাবে তৈরি এবং সংরক্ষিত হয়েছে।
        </p>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        {/* Customer & Total Highlights */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">ক্রেতা / কাস্টমার</span>
            <h3 className="font-bold text-base text-slate-900">
              {order.customerName || 'সাধারণ ক্রেতা'}
            </h3>
            {order.customerPhone && (
              <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                <span>{order.customerPhone}</span>
              </span>
            )}
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold text-slate-400 block">সর্বমোট বিল</span>
            <span className="text-2xl font-black text-emerald-700">
              {formatCurrency(order.grandTotal)}
            </span>
            <div className="text-xs mt-0.5 space-x-2">
              <span className="text-emerald-800 font-semibold">জমা: {formatCurrency(order.paidAmount)}</span>
              {order.dueAmount > 0 && (
                <span className="text-rose-600 font-bold">বাকি: {formatCurrency(order.dueAmount)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Items Summary */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ক্রয়কৃত পণ্যের তালিকা ({order.items.length}টি পদ)
          </h4>
          <div className="bg-slate-50 rounded-2xl p-3 divide-y divide-slate-200/60 text-xs">
            {order.items.map((it, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <span className="font-bold text-slate-900">{it.productName}</span>
                  <span className="text-slate-500 ml-2">× {it.quantity}</span>
                </div>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(it.subtotal || it.unitPrice * it.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Courier info if any */}
        {(order.courierName || order.courierTrackingCode) && (
          <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-2xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-bold text-blue-900">{order.courierName}</span>
                {order.courierTrackingCode && (
                  <span className="text-blue-700 ml-2 font-mono">({order.courierTrackingCode})</span>
                )}
              </div>
            </div>
            {order.codAmount !== undefined && (
              <span className="font-bold text-blue-900">
                সিওডি: {formatCurrency(order.codAmount)}
              </span>
            )}
          </div>
        )}

        {/* Actions Grid */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* View Print Receipt */}
          <button
            type="button"
            onClick={() => onViewA5Receipt(order)}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 text-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>A5 মেমো / প্রিন্ট কপি</span>
          </button>

          {/* New Sale */}
          <button
            type="button"
            onClick={onNewSale}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 text-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>নতুন বিক্রি (Next Sale)</span>
          </button>

          {/* Send on WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-2xl flex items-center justify-center gap-2 text-xs transition cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>হোয়াটসঅ্যাপে রশিদ পাঠান</span>
          </button>

          {/* Edit Order */}
          <button
            type="button"
            onClick={() => onEditOrder(order)}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 text-xs transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>অর্ডারে ভুল হলে এডিট করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
