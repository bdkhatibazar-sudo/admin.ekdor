import React, { useRef } from 'react';
import { CourierRemittanceBatch, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { X, Printer, Truck, CheckCircle2, Building2, Calendar, FileText, Download } from 'lucide-react';

interface CourierRemittanceBatchViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: CourierRemittanceBatch | null;
  settings?: StoreSettings;
  onDeleteBatch?: (batchId: string) => void;
}

export const CourierRemittanceBatchViewModal: React.FC<CourierRemittanceBatchViewModalProps> = ({
  isOpen,
  onClose,
  batch,
  settings,
  onDeleteBatch,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !batch) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER - No print */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">কুরিয়ার রেমিট্যান্স বিল স্টেটমেন্ট</h2>
              <p className="text-xs text-slate-300">
                ভাউচার #{batch.batchNumber} • {batch.courierName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTENT AREA */}
        <div ref={printAreaRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white text-slate-800">
          
          {/* Header & Store Branding */}
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {settings?.storeName || 'একদর - স্মার্ট দোকান ও বিক্রয় খাতা'}
              </h1>
              {settings?.address && (
                <p className="text-xs text-slate-500 mt-0.5">{settings.address}</p>
              )}
              {settings?.phone && (
                <p className="text-xs text-slate-500">মোবাইল: {settings.phone}</p>
              )}
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                কুরিয়ার রিকনসিলিয়েশন ভাউচার
              </span>
              <p className="font-mono font-bold text-sm text-slate-900 mt-1">
                #{batch.batchNumber}
              </p>
              <p className="text-xs text-slate-500">তারিখ: {batch.date}</p>
            </div>
          </div>

          {/* Courier & Bank Meta Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">কুরিয়ার সংস্থা:</span>
              <span className="font-bold text-slate-900 text-sm">{batch.courierName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">মোট পার্সেল সংখ্যা:</span>
              <span className="font-bold text-slate-900 text-sm">{batch.orderCount} টি</span>
            </div>
            <div>
              <span className="text-slate-500 block">জমার মাধ্যম:</span>
              <span className="font-bold text-slate-900 text-sm capitalize">
                {batch.paymentChannel === 'bank' ? 'ব্যাংক একাউন্ট' : batch.paymentChannel === 'bkash' ? 'বিকাশ' : 'নগদ'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">ব্যাংকে নিট ক্রেডিট:</span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatCurrency(batch.actualBankReceived)}
              </span>
            </div>
          </div>

          {/* Itemized Table of Orders */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">ক্রম</th>
                  <th className="p-2.5">চালান নং</th>
                  <th className="p-2.5">গ্রাহকের নাম ও ফোন</th>
                  <th className="p-2.5">কুরিয়ার ট্র্যাকিং নং</th>
                  <th className="p-2.5 text-right">কালেকশন টাকা</th>
                  <th className="p-2.5 text-right">ডেলিভারি চার্জ</th>
                  <th className="p-2.5 text-right">নিট টাকা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batch.items.map((item, idx) => (
                  <tr key={item.orderId || idx} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-2.5 font-bold font-mono text-slate-900">#{item.invoiceNumber}</td>
                    <td className="p-2.5 text-slate-800">
                      <div>{item.customerName}</div>
                      {item.customerPhone && (
                        <div className="text-[10px] text-slate-500 font-mono">{item.customerPhone}</div>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">
                      {item.trackingCode ? `#${item.trackingCode}` : '-'}
                    </td>
                    <td className="p-2.5 text-right font-medium text-slate-900">
                      ৳{item.codCollection}
                    </td>
                    <td className="p-2.5 text-right text-rose-600 font-medium">
                      -৳{item.deliveryCharge}
                    </td>
                    <td className="p-2.5 text-right font-bold text-blue-900">
                      ৳{item.netOrderAmount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Breakdown Calculation Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-700 mb-1">অতিরিক্ত বিবরণ ও রেফারেন্স:</div>
              {batch.bankReference && (
                <p className="text-slate-600">
                  <span className="font-semibold">ব্যাংক রেফারেন্স:</span> {batch.bankReference}
                </p>
              )}
              {batch.otherDeductionsNote && (
                <p className="text-slate-600">
                  <span className="font-semibold">অন্যান্য কর্তনের বিবরণ:</span> {batch.otherDeductionsNote}
                </p>
              )}
              {batch.note && (
                <p className="text-slate-600">
                  <span className="font-semibold">নোট:</span> {batch.note}
                </p>
              )}
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                তৈরি হয়েছে: {formatDateTime(batch.createdAt)}
              </p>
            </div>

            {/* Calculations right */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>মোট পার্সেল কালেকশন ({batch.orderCount} টি):</span>
                <span className="font-bold text-slate-900">{formatCurrency(batch.totalCollected)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>পার্সেল ডেলিভারি চার্জ বাবদ কর্তন:</span>
                <span className="font-semibold text-rose-600">- {formatCurrency(batch.totalDeliveryCharges)}</span>
              </div>
              {batch.otherDeductions > 0 && (
                <div className="flex justify-between text-amber-900 font-medium">
                  <span>অন্যান্য কর্তন ({batch.otherDeductionsNote || 'কেনা মালের চার্জ'}):</span>
                  <span className="font-semibold text-rose-600">- {formatCurrency(batch.otherDeductions)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200">
                <span>মোট ডেলিভারি ও অন্যান্য কর্তন:</span>
                <span className="text-rose-700">{formatCurrency(batch.totalDeliveryAndDeductions)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-semibold">
                <span>কর্তন বাদে উদ্বৃত্ত ব্যালেন্স:</span>
                <span>{formatCurrency(batch.balanceBeforeCodFee)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{batch.codFeePercentage}% কুরিয়ার সিওডি কমিশন ফি:</span>
                <span className="font-semibold text-rose-600">- {formatCurrency(batch.codFeeAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold text-sm pt-2 border-t border-slate-300">
                <span>ব্যাংকে প্রকৃত ক্রেডিট টাকা:</span>
                <span>{formatCurrency(batch.actualBankReceived)}</span>
              </div>
            </div>
          </div>

          {/* Signature and Approval Line for printed voucher */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-500 border-t border-slate-200">
            <div>
              <div className="w-36 border-t border-slate-400 mx-auto pt-1 font-semibold">হিসাবরক্ষক / প্রস্তুতকারক</div>
            </div>
            <div>
              <div className="w-36 border-t border-slate-400 mx-auto pt-1 font-semibold">মালিক / অনুমোদিত স্বাক্ষর</div>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER - No print */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          {onDeleteBatch ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`আপনি কি নিশ্চিত যে রেমিট্যান্স ভাউচার #${batch.batchNumber} বাতিল করতে চান? এতে অর্ডারের স্ট্যাটাস পুনরায় বাকি (pending) হয়ে যাবে।`)) {
                  onDeleteBatch(batch.id);
                  onClose();
                }
              }}
              className="text-rose-600 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50 transition cursor-pointer"
            >
              ভাউচার বাতিল করুন
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              বন্ধ করুন
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট ভাউচার</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
