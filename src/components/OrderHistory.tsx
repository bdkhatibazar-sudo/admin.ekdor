import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Product, Customer, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { OrderDetailsModal } from './OrderDetailsModal';
import {
  FileText,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
} from 'lucide-react';

interface OrderHistoryProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  settings: StoreSettings;
  onViewReceipt: (order: Order) => void;
  onUpdateOrder: (updatedOrder: Order, originalOrder: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onEditInPos: (order: Order) => void;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchType = typeFilter === 'all' || (o.orderType || 'cash') === typeFilter;
      const matchQuery =
        !q ||
        o.invoiceNumber.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.toLowerCase().includes(q) ||
        o.courierTrackingCode?.toLowerCase().includes(q);

      return matchStatus && matchType && matchQuery;
    });
  }, [orders, searchQuery, statusFilter, typeFilter]);

  const handleDelete = (order: Order) => {
    if (confirm(`আপনি কি নিশ্চিত যে চালান #${order.invoiceNumber} মুছে ফেলতে চান? বিক্রিত পণ্যের স্টক ইনভেন্টরিতে ফেরত যাবে।`)) {
      onDeleteOrder(order.id);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">নিশ্চিত (Confirmed)</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800">ডেলিভার্ড</span>;
      case 'shipped':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">শিপড্</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">পেন্ডিং</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">বাতিল</span>;
      case 'returned':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">রিটার্নড</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Header & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">অর্ডার হিস্ট্রি ও বিক্রয় তালিকা</h2>
            <p className="text-xs text-slate-500">মোট {orders.length}টি বিক্রয় চালান সংরক্ষিত আছে</p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="চালান নং, নাম, ফোন বা ট্র্যাকিং..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">সব স্ট্যাটাস</option>
            <option value="confirmed">নিশ্চিত (Confirmed)</option>
            <option value="shipped">শিপড্ (Shipped)</option>
            <option value="delivered">ডেলিভার্ড</option>
            <option value="pending">পেন্ডিং</option>
            <option value="cancelled">বাতিল</option>
            <option value="returned">রিটার্ন</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="all">সব মাধ্যম</option>
            <option value="cash">নগদ বিক্রয়</option>
            <option value="online">অনলাইন/কুরিয়ার</option>
            <option value="due">বাকি</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3">চালান নং ও তারিখ</th>
                <th className="p-3">গ্রাহক</th>
                <th className="p-3">আইটেম সংখ্যা</th>
                <th className="p-3 text-right">মোট টাকা</th>
                <th className="p-3 text-right">জমা</th>
                <th className="p-3 text-right">বাকি</th>
                <th className="p-3 text-center">স্ট্যাটাস</th>
                <th className="p-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition">
                  {/* Invoice & Date */}
                  <td className="p-3">
                    <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                      <span>#{order.invoiceNumber}</span>
                      {order.orderType === 'online' && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-sans font-semibold">
                          অনলাইন
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(order.date)}</span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">
                      {order.customerName || 'সাধারণ গ্রাহক'}
                    </div>
                    {order.customerPhone && (
                      <div className="text-[11px] text-slate-400">{order.customerPhone}</div>
                    )}
                  </td>

                  {/* Items Count */}
                  <td className="p-3">
                    <span className="text-slate-600 font-medium">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} পিস ({order.items.length} পদ)
                    </span>
                  </td>

                  {/* Grand Total */}
                  <td className="p-3 text-right font-bold text-slate-900">
                    {formatCurrency(order.grandTotal)}
                  </td>

                  {/* Paid */}
                  <td className="p-3 text-right font-semibold text-emerald-700">
                    {formatCurrency(order.paidAmount)}
                  </td>

                  {/* Due */}
                  <td className="p-3 text-right font-bold text-rose-600">
                    {order.dueAmount > 0 ? formatCurrency(order.dueAmount) : '—'}
                  </td>

                  {/* Status Dropdown */}
                  <td className="p-3 text-center">
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="confirmed">নিশ্চিত</option>
                      <option value="shipped">শিপড্</option>
                      <option value="delivered">ডেলিভার্ড</option>
                      <option value="pending">পেন্ডিং</option>
                      <option value="cancelled">বাতিল</option>
                      <option value="returned">রিটার্ন</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View Details */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDetails(order)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="বিস্তারিত দেখুন"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Receipt Print */}
                      <button
                        type="button"
                        onClick={() => onViewReceipt(order)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="রশিদ দেখুন / প্রিন্ট"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit in POS */}
                      <button
                        type="button"
                        onClick={() => onEditInPos(order)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="অর্ডারটি এডিট করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(order)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="অর্ডার মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    কোনো অর্ডার পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER DETAILS POPUP */}
      <OrderDetailsModal
        isOpen={!!selectedOrderForDetails}
        order={selectedOrderForDetails}
        settings={settings}
        onClose={() => setSelectedOrderForDetails(null)}
        onViewReceipt={onViewReceipt}
        onEditInPos={onEditInPos}
      />
    </div>
  );
};
