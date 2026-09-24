import React, { useState } from 'react';
import { Order, OrderStatus, StoreSettings } from '../types';
import { formatCurrency, formatDateTime, resolveWhatsAppNumber, createWhatsAppUrl } from '../utils/formatters';
import { 
  createSteadfastOrder, 
  checkSteadfastFraudScore, 
  checkSteadfastStatus, 
  getSteadfastTrackingUrl,
  SteadfastFraudCheckResponse,
  SteadfastStatusResponse
} from '../services/steadfast';
import { 
  CheckCircle2, 
  Printer, 
  MessageCircle, 
  Copy, 
  Edit3, 
  ShoppingCart, 
  FileText, 
  Phone, 
  MapPin, 
  Truck, 
  Check, 
  ArrowRight, 
  Coins, 
  Building2, 
  Smartphone, 
  Clock, 
  Sparkles,
  Receipt,
  Share2,
  Calendar,
  AlertCircle,
  Zap,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface SaleSuccessViewProps {
  order: Order;
  settings: StoreSettings;
  onNewSale: () => void;
  onEditOrder: (order: Order) => void;
  onViewA5Receipt: (order: Order) => void;
  onUpdateOrderStatus?: (
    orderId: string,
    status: OrderStatus,
    meta?: {
      courierName?: string;
      trackingCode?: string;
      returnLossAmount?: number;
    }
  ) => void;
}

export const SaleSuccessView: React.FC<SaleSuccessViewProps> = ({
  order,
  settings,
  onNewSale,
  onEditOrder,
  onViewA5Receipt,
  onUpdateOrderStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Courier States
  const [isBookingCourier, setIsBookingCourier] = useState(false);
  const [courierBookingResult, setCourierBookingResult] = useState<{
    success: boolean;
    consignmentId?: string;
    trackingCode?: string;
    trackingUrl?: string;
    message: string;
  } | null>(null);

  const [isCheckingFraud, setIsCheckingFraud] = useState(false);
  const [fraudResult, setFraudResult] = useState<SteadfastFraudCheckResponse | null>(null);

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [liveStatusResult, setLiveStatusResult] = useState<SteadfastStatusResponse | null>(null);

  const activeTrackingCode = order.courierTrackingCode || courierBookingResult?.trackingCode || courierBookingResult?.consignmentId || '';
  const isShipped = order.status === 'shipped' || !!activeTrackingCode;

  // 1-Click Steadfast API Booking Handler
  const handleBookCourier = async () => {
    setIsBookingCourier(true);
    setCourierBookingResult(null);
    try {
      const res = await createSteadfastOrder(order, settings);
      if (res.success && (res.consignmentId || res.trackingCode)) {
        const cId = res.consignmentId || res.trackingCode || '';
        setCourierBookingResult({
          success: true,
          consignmentId: res.consignmentId,
          trackingCode: res.trackingCode,
          trackingUrl: res.trackingUrl,
          message: res.message || 'কুরিয়ারে পার্সেল সফলভাবে বুক হয়েছে!',
        });
        if (onUpdateOrderStatus) {
          onUpdateOrderStatus(order.id, 'shipped', {
            courierName: 'Steadfast Courier',
            trackingCode: cId,
          });
        }
      } else {
        setCourierBookingResult({
          success: false,
          message: res.message || 'বুকিং সম্পন্ন হয়নি। কি বা তথ্য যাচাই করুন।',
        });
      }
    } catch (err: any) {
      setCourierBookingResult({
        success: false,
        message: err.message || 'কুরিয়ার সার্ভারে অনুরোধ পাঠানো যায়নি।',
      });
    } finally {
      setIsBookingCourier(false);
    }
  };

  // Fraud check handler
  const handleFraudCheck = async () => {
    const phone = order.isDifferentRecipient && order.recipientPhone ? order.recipientPhone : order.customerPhone;
    if (!phone) {
      alert('গ্রাহকের ফোন নম্বর পাওয়া যায়নি।');
      return;
    }
    setIsCheckingFraud(true);
    try {
      const res = await checkSteadfastFraudScore(phone, settings);
      setFraudResult(res);
    } catch (err: any) {
      alert(err.message || 'ফ্রড চেক ব্যর্থ হয়েছে');
    } finally {
      setIsCheckingFraud(false);
    }
  };

  // Check live status
  const handleCheckStatus = async () => {
    if (!activeTrackingCode) return;
    setIsCheckingStatus(true);
    try {
      const res = await checkSteadfastStatus(activeTrackingCode, settings);
      setLiveStatusResult(res);
    } catch (err: any) {
      alert(err.message || 'স্ট্যাটাস চেক ব্যর্থ হয়েছে');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Generate clean Bengali formatted text invoice
  const generateTextInvoice = (): string => {
    const itemsList = order.items
      .map((it, idx) => `${idx + 1}. ${it.productName} (${it.quantity} ${it.unit}) - ৳${it.total}`)
      .join('\n');

    let paymentMethodName = 'নগদ ক্যাশ';
    if (order.paymentMethod === 'bkash') paymentMethodName = 'বিকাশ';
    else if (order.paymentMethod === 'bank') paymentMethodName = 'ব্যাংক';
    else if (order.paymentMethod === 'qr') paymentMethodName = 'কিউআর কোড';
    else if (order.paymentMethod === 'due') paymentMethodName = 'বাকি';

    let balanceInfo = '';
    if (order.orderType === 'online' && order.codAmount > 0) {
      balanceInfo = `কুরিয়ার ক্যাশ কালেকশন (COD): ৳${order.codAmount}`;
    } else if (order.dueAmount > 0) {
      balanceInfo = `বকেয়া বাকি: ৳${order.dueAmount}`;
    } else if (order.excessAdvanceAdded && order.excessAdvanceAdded > 0) {
      balanceInfo = `অতিরিক্ত অগ্রিম জমা: ৳${order.excessAdvanceAdded}`;
    } else {
      balanceInfo = 'পরিশোধ স্ট্যাটাস: সম্পূর্ণ পরিশোধিত';
    }

    return `*${settings.storeName}*
${settings.address || ''}
মোবাইল: ${settings.phone || ''}
--------------------------------
চালান নং: #${order.invoiceNumber}
তারিখ: ${formatDateTime(order.date)}
গ্রাহক: ${order.customerName}
মোবাইল: ${order.customerPhone || 'প্রযোজ্য নয়'}
${order.deliveryAddress ? `ঠিকানা: ${order.deliveryAddress}\n` : ''}${order.courierName ? `কুরিয়ার: ${order.courierName}\n` : ''}--------------------------------
ক্রয়কৃত পণ্যের বিবরণ:
${itemsList}
--------------------------------
উপমোট: ৳${order.subtotal}
${order.discount > 0 ? `ছাড় (Discount): -৳${order.discount}\n` : ''}${order.deliveryCharge > 0 ? `ডেলিভারি চার্জ: +৳${order.deliveryCharge}\n` : ''}সর্বমোট বিল: ৳${order.grandTotal}
${order.appliedAdvance && order.appliedAdvance > 0 ? `পূর্বের জমা সমন্বয়: -৳${order.appliedAdvance}\n` : ''}পরিশোধ: ৳${order.paidAmount} (${paymentMethodName})
${balanceInfo}
--------------------------------
আমাদের সেবা গ্রহণের জন্য আন্তরিক ধন্যবাদ!`;
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    const targetPhone = resolveWhatsAppNumber(order.customerWhatsapp, order.customerPhone);
    const invoiceText = generateTextInvoice();
    const url = createWhatsAppUrl(targetPhone, invoiceText);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Memo Handler
  const handleCopyMemo = async () => {
    try {
      const invoiceText = generateTextInvoice();
      await navigator.clipboard.writeText(invoiceText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  // Direct Thermal Browser Print
  const handlePrintThermal = () => {
    try {
      const printWindow = window.open('', '_blank', 'width=380,height=600');
      if (!printWindow) {
        onViewA5Receipt(order);
        return;
      }

    const itemsRows = order.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">
            <div style="font-weight: bold;">${it.productName}</div>
            <div style="font-size: 11px; color: #555;">${it.quantity} ${it.unit} x ৳${it.unitPrice}</div>
          </td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: right; vertical-align: bottom; font-weight: bold;">
            ৳${it.total}
          </td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>POS থার্মাল রসিদ #${order.invoiceNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'SolaimanLipi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            font-size: 12px;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .store-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .dashed { border-bottom: 1px dashed #000; margin: 6px 0; }
          .table { width: 100%; border-collapse: collapse; }
          .flex { display: flex; justify-content: space-between; }
          .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .grand { font-size: 14px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; }
          @media print {
            body { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="store-name">${settings.storeName}</div>
          ${settings.address ? `<div>${settings.address}</div>` : ''}
          ${settings.phone ? `<div>ফোন: ${settings.phone}</div>` : ''}
        </div>
        <div class="dashed"></div>
        <div class="flex"><span>চালান: #${order.invoiceNumber}</span></div>
        <div class="flex"><span>তারিখ: ${formatDateTime(order.date)}</span></div>
        <div class="flex"><span>গ্রাহক: ${order.customerName}</span></div>
        ${order.customerPhone ? `<div class="flex"><span>ফোন: ${order.customerPhone}</span></div>` : ''}
        ${order.deliveryAddress ? `<div>ঠিকানা: ${order.deliveryAddress}</div>` : ''}
        <div class="dashed"></div>
        <table class="table">
          <thead>
            <tr style="text-align: left; border-bottom: 1px dashed #000;">
              <th style="padding-bottom: 4px;">পণ্য</th>
              <th style="padding-bottom: 4px; text-align: right;">মোট</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div style="margin-top: 6px;">
          <div class="totals-row"><span>সাব-টোটাল:</span><span>৳${order.subtotal}</span></div>
          ${order.discount > 0 ? `<div class="totals-row"><span>ছাড়:</span><span>-৳${order.discount}</span></div>` : ''}
          ${order.deliveryCharge > 0 ? `<div class="totals-row"><span>ডেলিভারি:</span><span>+৳${order.deliveryCharge}</span></div>` : ''}
          <div class="grand flex">
            <span>সর্বমোট:</span>
            <span>৳${order.grandTotal}</span>
          </div>
          <div class="totals-row"><span>পরিশোধ:</span><span>৳${order.paidAmount}</span></div>
          ${order.orderType === 'online' && order.codAmount > 0 
            ? `<div class="totals-row bold"><span>কুরিয়ার COD:</span><span>৳${order.codAmount}</span></div>` 
            : order.dueAmount > 0 
            ? `<div class="totals-row bold"><span>বাকি:</span><span>৳${order.dueAmount}</span></div>` 
            : ''
          }
        </div>
        <div class="dashed"></div>
        <div class="center" style="font-size: 11px; margin-top: 8px;">
          আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!<br />
          আবার আসবেন
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    } catch {
      onViewA5Receipt(order);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 animate-fadeIn">
      {/* 1. SUCCESS HERO BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        {/* Background glow circle */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-7 h-7 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  বিক্রি সফলভাবে সম্পন্ন হয়েছে!
                </h1>
                <span className="bg-white/20 text-white border border-white/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  #{order.invoiceNumber}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                চালান সংরক্ষিত হয়েছে এবং ইনভেন্টরি স্টক স্বয়ংক্রিয়ভাবে সমন্বয় করা হয়েছে।
              </p>
            </div>
          </div>

          {/* Quick Meta Badges */}
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs text-emerald-100 font-medium shrink-0">
            <span className="bg-black/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-200" />
              <span>{formatDateTime(order.date)}</span>
            </span>
            <span className="bg-black/20 px-2.5 py-1 rounded-lg">
              {order.orderType === 'online' ? '🚚 কুরিয়ার ডেলিভারি' : '🏪 দোকান কাউন্টার বিক্রি'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN SALE DETAILS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Information Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>গ্রাহক ও ডেলিভারি তথ্য</span>
            </span>
            {order.orderType === 'online' && (
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                অনলাইন অর্ডার
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">গ্রাহকের নাম</span>
              <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
            </div>

            {order.customerPhone && (
              <div>
                <span className="text-slate-400 block text-[11px]">মোবাইল নম্বর</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-slate-800 font-mono">{order.customerPhone}</span>
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold transition"
                  >
                    কল করুন
                  </a>
                </div>
              </div>
            )}

            {order.deliveryAddress && (
              <div>
                <span className="text-slate-400 block text-[11px]">ডেলিভারি ঠিকানা</span>
                <p className="text-slate-700 font-medium flex items-start gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{order.deliveryAddress}</span>
                </p>
              </div>
            )}

            {order.isDifferentRecipient && (
              <div className="pt-2 border-t border-slate-100 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 space-y-0.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  🎁 ভিন্ন প্রাপকের তথ্য (Recipient)
                </span>
                {order.recipientName && (
                  <p className="font-bold text-slate-900">{order.recipientName}</p>
                )}
                {order.recipientPhone && (
                  <p className="font-mono text-slate-700 text-[11px]">{order.recipientPhone}</p>
                )}
                {order.recipientAddress && (
                  <p className="text-slate-600 text-[11px]">{order.recipientAddress}</p>
                )}
              </div>
            )}

            {order.orderType === 'online' && order.courierName && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-slate-400 block text-[11px]">কুরিয়ার সার্ভিস</span>
                <p className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{order.courierName}</span>
                </p>
                {order.courierTrackingCode && (
                  <p className="text-[11px] font-mono text-slate-600">
                    ট্র্যাকিং কোড: <span className="font-bold text-slate-900">{order.courierTrackingCode}</span>
                  </p>
                )}
              </div>
            )}

            {order.note && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[11px]">অর্ডার নোট</span>
                <p className="text-slate-600 italic mt-0.5 bg-slate-50 p-2 rounded-lg">
                  "{order.note}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Settlement Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              <span>আর্থিক হিসাব ও পেমেন্ট</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {order.paymentMethod === 'cash' ? 'নগদ ক্যাশ' : order.paymentMethod === 'bkash' ? 'বিকাশ' : order.paymentMethod === 'bank' ? 'ব্যাংক' : order.paymentMethod === 'qr' ? 'কিউআর' : 'বাকি'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>পণ্য সাব-টোটাল:</span>
              <span className="font-semibold text-slate-800">৳{order.subtotal}</span>
            </div>

            {order.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>ছাড় (Discount):</span>
                <span>-৳{order.discount}</span>
              </div>
            )}

            {order.deliveryCharge > 0 && (
              <div className="flex justify-between text-blue-700">
                <span>ডেলিভারি চার্জ:</span>
                <span>+৳{order.deliveryCharge}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-100">
              <span>সর্বমোট বিল:</span>
              <span className="text-base text-emerald-700">৳{order.grandTotal}</span>
            </div>

            {order.appliedAdvance && order.appliedAdvance > 0 && (
              <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>পূর্বের জমা সমন্বয়:</span>
                </span>
                <span>-৳{order.appliedAdvance}</span>
              </div>
            )}

            <div className="flex justify-between pt-1 border-t border-slate-100">
              <span>পরিশোধকৃত টাকা:</span>
              <span className="font-bold text-emerald-700">৳{order.paidAmount}</span>
            </div>

            {/* Due or COD or Excess Advance */}
            {order.orderType === 'online' && order.codAmount > 0 ? (
              <div className="flex justify-between items-center bg-blue-50 text-blue-900 p-2 rounded-xl border border-blue-200 font-bold mt-1">
                <span>কুরিয়ার COD কালেকশন:</span>
                <span className="text-sm">৳{order.codAmount}</span>
              </div>
            ) : order.dueAmount > 0 ? (
              <div className="flex justify-between items-center bg-rose-50 text-rose-800 p-2 rounded-xl border border-rose-200 font-bold mt-1">
                <span>বকেয়া বাকি:</span>
                <span className="text-sm">৳{order.dueAmount}</span>
              </div>
            ) : order.excessAdvanceAdded && order.excessAdvanceAdded > 0 ? (
              <div className="flex justify-between items-center bg-emerald-50 text-emerald-900 p-2 rounded-xl border border-emerald-200 font-bold mt-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>অতিরিক্ত অগ্রিম জমা:</span>
                </span>
                <span className="text-sm">৳{order.excessAdvanceAdded}</span>
              </div>
            ) : (
              <div className="text-center bg-emerald-50 text-emerald-700 py-1.5 rounded-xl font-bold text-xs mt-1 border border-emerald-100">
                ✅ সম্পূর্ণ পরিশোধিত
              </div>
            )}
          </div>
        </div>

        {/* Quick Order Actions Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block pb-2 border-b border-slate-100">
              পরবর্তী পদক্ষেপ
            </span>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              আপনি চাইলে এখনই কাস্টমারকে মেমোটি শেয়ার করতে পারেন, প্রিন্ট দিতে পারেন অথবা কোনো তথ্য ভুল হলে সরাসরি এডিট করতে পারেন।
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onNewSale}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>পরবর্তী নতুন বিক্রি শুরু করুন</span>
            </button>

            <button
              type="button"
              onClick={() => onEditOrder(order)}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-amber-700" />
              <span>অর্ডারের তথ্য সংশোধন / এডিট করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.5. ONLINE COURIER DISPATCH & PACKZY / STEADFAST 1-CLICK BOOKING */}
      {order.orderType === 'online' && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    স্টেডফাস্ট / প্যাকজি কুরিয়ার বুকিং ও ট্র্যাকিং
                  </h3>
                  {isShipped ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ বুকিং সম্পন্ন
                    </span>
                  ) : (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      বুকিং অপেক্ষমাণ
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-200/80">
                  portal.packzy.com এপিআই-এর মাধ্যমে সরাসরি বুকিং ও পার্সেল মনিটরিং
                </p>
              </div>
            </div>

            {/* Fraud check quick trigger */}
            <button
              type="button"
              onClick={handleFraudCheck}
              disabled={isCheckingFraud}
              className="self-start sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-100 text-xs font-semibold rounded-lg border border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCheckingFraud ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              )}
              <span>{isCheckingFraud ? 'যাচাই হচ্ছে...' : 'গ্রাহক ফ্রড চেক'}</span>
            </button>
          </div>

          {/* Recipient Details & COD Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-white/5 p-3.5 rounded-xl border border-white/10">
            <div>
              <span className="text-indigo-200/70 block text-[11px]">প্রাপকের নাম</span>
              <p className="font-bold text-white truncate">
                {(order.isDifferentRecipient && order.recipientName ? order.recipientName : order.customerName) || 'গ্রাহকের নাম'}
              </p>
            </div>
            <div>
              <span className="text-indigo-200/70 block text-[11px]">প্রাপকের মোবাইল</span>
              <p className="font-mono font-bold text-emerald-300">
                {(order.isDifferentRecipient && order.recipientPhone ? order.recipientPhone : order.customerPhone) || 'নম্বর নেই'}
              </p>
            </div>
            <div>
              <span className="text-indigo-200/70 block text-[11px]">ডেলিভারি ঠিকানা</span>
              <p className="text-white/90 truncate">
                {(order.isDifferentRecipient && order.recipientAddress ? order.recipientAddress : order.deliveryAddress) || 'ঠিকানা দেওয়া হয়নি'}
              </p>
            </div>
            <div>
              <span className="text-indigo-200/70 block text-[11px]">কুরিয়ার COD কালেকশন</span>
              <p className="font-bold text-amber-300 text-sm">
                ৳{order.codAmount || 0}
              </p>
            </div>
          </div>

          {/* Fraud Check Result Banner */}
          {fraudResult && (
            <div className={`p-3 rounded-xl border text-xs font-medium flex items-start justify-between gap-3 ${
              fraudResult.success
                ? fraudResult.level === 'danger'
                  ? 'bg-rose-950/60 text-rose-200 border-rose-600/40'
                  : fraudResult.level === 'warning'
                  ? 'bg-amber-950/60 text-amber-200 border-amber-600/40'
                  : 'bg-emerald-950/60 text-emerald-200 border-emerald-600/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>কাস্টমার ফ্রড স্কোর: {fraudResult.score ?? 'N/A'}/১০০</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-mono bg-white/20">
                      {fraudResult.level}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    {fraudResult.level === 'danger' 
                      ? '⚠️ এই নম্বরে কুরিয়ার পার্সেল রিটার্নের রেকর্ড আছে বা ঝুঁকি বেশি। অগ্রিম ডেলিভারি চার্জ নিতে পারেন।'
                      : fraudResult.level === 'warning'
                      ? 'সতর্কতা: মাঝারি রিস্ক লেভেল।'
                      : '✅ নিরাপদ গ্রাহক, অতীতের সফল ডেলিভারি রেকর্ড ভালো।'}
                    {fraudResult.totalReports ? ` • মোট রিপোর্ট: ${fraudResult.totalReports}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFraudResult(null)}
                className="text-white/60 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Courier Action Buttons & Status */}
          <div className="space-y-3 pt-1">
            {!activeTrackingCode ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleBookCourier}
                  disabled={isBookingCourier}
                  className="w-full sm:w-auto flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isBookingCourier ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>স্টেডফাস্ট এপিআই-এ পার্সেল বুক হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-emerald-200" />
                      <span>১-ক্লিকে সরাসরি Steadfast কুরিয়ারে বুকিং করুন</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-indigo-200">ট্র্যাকিং কোড / কনসাইনমেন্ট:</span>
                    <span className="font-mono font-bold text-sm bg-white/20 px-2 py-0.5 rounded text-white">
                      {activeTrackingCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeTrackingCode);
                        setCopiedTracking(true);
                        setTimeout(() => setCopiedTracking(false), 2000);
                      }}
                      className="p-1 hover:bg-white/20 rounded text-indigo-200 hover:text-white cursor-pointer"
                      title="ট্র্যাকিং কোড কপি করুন"
                    >
                      {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCheckStatus}
                      disabled={isCheckingStatus}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                      <span>{isCheckingStatus ? 'যাচাই হচ্ছে...' : 'লাইভ স্ট্যাটাস দেখুন'}</span>
                    </button>

                    <a
                      href={getSteadfastTrackingUrl(activeTrackingCode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 text-indigo-200" />
                      <span>ট্র্যাকিং পেজ</span>
                    </a>
                  </div>
                </div>

                {liveStatusResult && (
                  <div className="p-2.5 bg-white/10 rounded-lg text-xs flex items-center justify-between text-indigo-100">
                    <span>কুরিয়ার সার্ভার রেসপন্স:</span>
                    <span className="font-bold text-emerald-300">
                      {liveStatusResult.deliveryStatusBangla || liveStatusResult.deliveryStatus}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Courier Booking Result Notification */}
            {courierBookingResult && (
              <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                courierBookingResult.success
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50'
                  : 'bg-rose-950/80 text-rose-200 border-rose-500/50'
              }`}>
                {courierBookingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{courierBookingResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ORDERED PRODUCTS TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>ক্রয়কৃত পণ্যের তালিকা ({order.items.length}টি আইটেম)</span>
          </h3>
          <span className="text-xs font-bold text-slate-600">
            মোট পরিমাণ: {order.items.reduce((sum, it) => sum + it.quantity, 0)} টি
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4 w-12 text-center">নং</th>
                <th className="py-2.5 px-4">পণ্যের বিবরণ</th>
                <th className="py-2.5 px-4 text-center">একক দর</th>
                <th className="py-2.5 px-4 text-center">পরিমাণ</th>
                <th className="py-2.5 px-4 text-right">মোট টাকা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((it, idx) => (
                <tr key={it.productId || idx} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 text-center text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{it.productName}</p>
                    <p className="text-[11px] text-slate-400">আইডি: {it.productId}</p>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-medium">
                    ৳{it.unitPrice}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md text-xs">
                      {it.quantity} {it.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    ৳{it.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PINNED BOTTOM ACTION TOOLBAR - INVOICE SHARE, PRINT & EDIT */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Left: Share Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="গ্রাহকের হোয়াটসঅ্যাপে চালানের বিস্তারিত মেসেজ পাঠান"
          >
            <MessageCircle className="w-4 h-4" />
            <span>হোয়াটসঅ্যাপে ইনভয়েস শেয়ার</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMemo}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-200 cursor-pointer"
            title="ক্লিপবোর্ডে সম্পূর্ণ মেমোর টেক্সট কপি করুন"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>মেমো টেক্সট কপি</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Print, Edit & New Sale Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrintThermal}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="৮০মিমি বা ৫৮মিমি থার্মাল পিওএস রসিদ প্রিন্ট"
          >
            <Printer className="w-4 h-4" />
            <span>থার্মাল স্লিপ (POS)</span>
          </button>

          <button
            type="button"
            onClick={() => onViewA5Receipt(order)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="এ৫ সাইজের পূর্ণাঙ্গ ইনভয়েস ক্যাশ মেমো ভিউ ও প্রিন্ট"
          >
            <FileText className="w-4 h-4" />
            <span>A5 ইনভয়েস প্রিন্ট</span>
          </button>

          <button
            type="button"
            onClick={() => onEditOrder(order)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="অর্ডারের পণ্য, দর, গ্রাহক বা পেমেন্ট সংশোধন করতে ক্লিক করুন"
          >
            <Edit3 className="w-4 h-4" />
            <span>অর্ডার এডিট করুন</span>
          </button>

          <button
            type="button"
            onClick={onNewSale}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            title="কাউন্টার ক্লিয়ার করে নতুন বিক্রি শুরু করুন"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-700" />
            <span>নতুন বিক্রি</span>
          </button>
        </div>
      </div>
    </div>
  );
};
