import React from 'react';
import { Order, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { X, Printer, Receipt, User, Phone, MapPin, Truck, Calendar, Tag, CreditCard } from 'lucide-react';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  settings?: StoreSettings;
  onViewReceipt?: (order: Order) => void;
  onEditInPos?: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  settings,
  onViewReceipt,
  onEditInPos,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>চালান #{order.invoiceNumber}</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    order.status === 'confirmed' || order.status === 'delivered'
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : order.status === 'shipped'
                      ? 'bg-blue-500/30 text-blue-200'
                      : order.status === 'cancelled' || order.status === 'returned'
                      ? 'bg-rose-500/30 text-rose-200'
                      : 'bg-amber-500/30 text-amber-200'
                  }`}
                >
                  {order.status}
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateTime(order.date)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Customer & Delivery Info */}
          {(order.customerName || order.customerPhone || order.customerAddress) && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5" />
                <span>গ্রাহক বিবরণ</span>
              </h3>
              {order.customerName && (
                <div className="font-bold text-slate-900">{order.customerName}</div>
              )}
              {order.customerPhone && (
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {order.customerAddress && (
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customerAddress}</span>
                </div>
              )}
            </div>
          )}

          {/* Courier Info if applicable */}
          {(order.courierName || order.courierTrackingCode || order.courierTrackingId) && (
            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-1.5">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>কুরিয়ার শিপিং তথ্য</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">কুরিয়ার:</span>{' '}
                  <span className="font-semibold text-slate-900">{order.courierName || 'Steadfast'}</span>
                </div>
                <div>
                  <span className="text-slate-500">ট্র্যাকিং কোড:</span>{' '}
                  <span className="font-mono font-semibold text-blue-800">
                    {order.courierTrackingCode || order.courierTrackingId || 'N/A'}
                  </span>
                </div>
                {order.codAmount !== undefined && order.codAmount > 0 && (
                  <div>
                    <span className="text-slate-500">সিওডি অর্থ:</span>{' '}
                    <span className="font-bold text-slate-900">{formatCurrency(order.codAmount)}</span>
                  </div>
                )}
                {order.courierSettlementStatus && (
                  <div>
                    <span className="text-slate-500">সেটেলমেন্ট:</span>{' '}
                    <span className="font-semibold text-emerald-700">{order.courierSettlementStatus}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              অর্ডারের আইটেমসমূহ
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">আইটেম</th>
                    <th className="p-2.5 text-center">পরিমাণ</th>
                    <th className="p-2.5 text-right">দর</th>
                    <th className="p-2.5 text-right">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-900">{item.productName}</td>
                      <td className="p-2.5 text-center text-slate-600">{item.quantity}</td>
                      <td className="p-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2.5 text-right font-semibold text-slate-900">
                        {formatCurrency(item.subtotal || item.unitPrice * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Financials Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <span>উপমোট (Subtotal):</span>
              <span className="font-medium text-slate-900">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>ছাড় (Discount):</span>
                <span className="font-medium">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.deliveryCharge !== undefined && order.deliveryCharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-medium text-slate-900">+{formatCurrency(order.deliveryCharge)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm sm:text-base">
              <span>সর্বমোট (Grand Total):</span>
              <span>{formatCurrency(order.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>পরিশোধিত (Paid):</span>
              <span>{formatCurrency(order.paidAmount)}</span>
            </div>
            {order.dueAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>বাকি (Due):</span>
                <span>{formatCurrency(order.dueAmount)}</span>
              </div>
            )}
            <div className="pt-1 flex items-center justify-between text-slate-500 text-xs">
              <span className="flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                <span>পেমেন্ট মাধ্যম:</span>
              </span>
              <span className="font-semibold text-slate-700 uppercase">{order.paymentMethod || 'cash'}</span>
            </div>
          </div>

          {order.notes && (
            <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-800">নোট:</span> {order.notes}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {onEditInPos ? (
            <button
              onClick={() => {
                onClose();
                onEditInPos(order);
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition"
            >
              অর্ডার এডিট করুন
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onViewReceipt && (
              <button
                onClick={() => {
                  onClose();
                  onViewReceipt(order);
                }}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>রশিদ / প্রিন্ট</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
