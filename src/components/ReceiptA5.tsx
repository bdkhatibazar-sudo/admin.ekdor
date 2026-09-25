import React, { useRef, useState } from 'react';
import { Order, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  Printer,
  ArrowLeft,
  PlusCircle,
  Edit2,
  Share2,
  Download,
  Store,
  Phone,
  MapPin,
  CheckCircle,
} from 'lucide-react';

interface ReceiptA5Props {
  order: Order;
  settings: StoreSettings;
  onBack: () => void;
  onNewSale: () => void;
  onEditOrder: (order: Order) => void;
}

export const ReceiptA5: React.FC<ReceiptA5Props> = ({
  order,
  settings,
  onBack,
  onNewSale,
  onEditOrder,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [paperFormat, setPaperFormat] = useState<'a5' | 'pos80' | 'pos58'>(
    settings.printPaperSize || 'a5'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      {/* Action Bar (Hidden during Print) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ফিরে যান</span>
          </button>

          <button
            type="button"
            onClick={onNewSale}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>নতুন বিক্রি</span>
          </button>

          <button
            type="button"
            onClick={() => onEditOrder(order)}
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>এডিট</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Paper Size Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPaperFormat('a5')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                paperFormat === 'a5' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              A5 মেমো
            </button>
            <button
              type="button"
              onClick={() => setPaperFormat('pos80')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                paperFormat === 'pos80' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              ৮০ মিমি POS
            </button>
            <button
              type="button"
              onClick={() => setPaperFormat('pos58')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                paperFormat === 'pos58' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              ৫৮ মিমি
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>প্রিন্ট করুন</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE RECEIPT CONTAINER */}
      <div className="flex justify-center">
        <div
          ref={receiptRef}
          className={`bg-white border border-slate-300 shadow-lg text-slate-900 font-sans transition-all print:shadow-none print:border-none ${
            paperFormat === 'a5'
              ? 'w-full max-w-[148mm] min-h-[210mm] p-6 sm:p-8 rounded-xl'
              : paperFormat === 'pos80'
              ? 'w-full max-w-[80mm] p-3 text-xs rounded-lg'
              : 'w-full max-w-[58mm] p-2 text-[10px] rounded-lg'
          }`}
        >
          {/* Header Store Info */}
          <div className="text-center pb-3 border-b-2 border-slate-900">
            <h1 className={`${paperFormat === 'a5' ? 'text-xl' : 'text-base'} font-black text-slate-900 leading-tight`}>
              {settings.storeName}
            </h1>
            {settings.storeTagline && (
              <p className="text-xs text-slate-600 font-medium mt-0.5">{settings.storeTagline}</p>
            )}
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              <p className="flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3 inline text-slate-400" />
                <span>{settings.address}</span>
              </p>
              <p className="flex items-center justify-center gap-2 font-semibold">
                <span>ফোন: {settings.phone}</span>
                {settings.alternatePhone && <span>, {settings.alternatePhone}</span>}
              </p>
            </div>
            <div className="mt-2 inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              {order.orderType === 'online' ? 'অনলাইন ক্যাশ মেমো' : 'ক্যাশ মেমো / বিক্রয় চালান'}
            </div>
          </div>

          {/* Invoice Meta & Customer Details */}
          <div className="py-3 border-b border-slate-200 text-xs grid grid-cols-2 gap-2">
            <div>
              <div className="font-bold text-slate-900">
                চালান নং: <span className="font-mono text-emerald-800">#{order.invoiceNumber}</span>
              </div>
              <div className="text-slate-500 mt-0.5">
                তারিখ: {formatDateTime(order.date)}
              </div>
              {order.courierName && (
                <div className="text-blue-700 font-semibold mt-0.5">
                  কুরিয়ার: {order.courierName}{' '}
                  {order.courierTrackingCode && `(${order.courierTrackingCode})`}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="font-bold text-slate-900">
                গ্রাহক: {order.customerName || 'সাধারণ ক্রেতা'}
              </div>
              {order.customerPhone && (
                <div className="text-slate-600 mt-0.5">মোবাইল: {order.customerPhone}</div>
              )}
              {order.customerAddress && (
                <div className="text-slate-500 mt-0.5">{order.customerAddress}</div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-900 text-slate-900 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-1">বিবরণ</th>
                  <th className="py-1 text-center">পরিমাণ</th>
                  <th className="py-1 text-right">দর</th>
                  <th className="py-1 text-right">মোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((it, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 font-medium text-slate-900">{it.productName}</td>
                    <td className="py-1.5 text-center text-slate-700 font-semibold">{it.quantity}</td>
                    <td className="py-1.5 text-right text-slate-600">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-1.5 text-right font-bold text-slate-900">
                      {formatCurrency(it.subtotal || it.unitPrice * it.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="border-t-2 border-slate-900 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>উপমোট:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal)}</span>
            </div>

            {order.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>ছাড় (Discount):</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}

            {order.deliveryCharge !== undefined && order.deliveryCharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>ডেলিভারি চার্জ:</span>
                <span>+{formatCurrency(order.deliveryCharge)}</span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-1 flex justify-between font-black text-sm text-slate-900">
              <span>সর্বমোট বিল:</span>
              <span>{formatCurrency(order.grandTotal)}</span>
            </div>

            <div className="flex justify-between text-emerald-800 font-bold">
              <span>নগদ / পরিশোধিত:</span>
              <span>{formatCurrency(order.paidAmount)}</span>
            </div>

            {order.dueAmount > 0 && (
              <div className="flex justify-between text-rose-700 font-black text-sm bg-rose-50 p-1 rounded">
                <span>বর্তমান বাকি:</span>
                <span>{formatCurrency(order.dueAmount)}</span>
              </div>
            )}

            {order.codAmount !== undefined && order.codAmount > 0 && (
              <div className="flex justify-between text-blue-700 font-bold bg-blue-50 p-1 rounded">
                <span>কুরিয়ার সিওডি শর্ত:</span>
                <span>{formatCurrency(order.codAmount)}</span>
              </div>
            )}
          </div>

          {/* Footer Terms & Signatures */}
          <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-xs">
            <div className="flex items-end justify-between pt-6 text-[11px] text-slate-600">
              <div className="text-center">
                <div className="w-28 border-t border-slate-400 mb-1" />
                <span>ক্রেতার স্বাক্ষর</span>
              </div>
              <div className="text-center">
                <div className="w-28 border-t border-slate-400 mb-1" />
                <span>বিক্রেতার স্বাক্ষর</span>
              </div>
            </div>

            {settings.invoiceFooter && (
              <p className="text-[10px] text-slate-500 text-center mt-6">
                {settings.invoiceFooter}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
