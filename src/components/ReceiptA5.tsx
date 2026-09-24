import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Order, StoreSettings } from '../types';
import { toBanglaNumber, resolveWhatsAppNumber, createWhatsAppUrl } from '../utils/formatters';
import { 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Share2, 
  MessageCircle, 
  Download, 
  Copy,
  Loader2,
  FileDown,
  Edit3,
  X,
  Eye
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface ReceiptA5Props {
  order: Order;
  settings: StoreSettings;
  onBack: () => void;
  onNewSale?: () => void;
  onEditOrder?: (order: Order) => void;
}

export const ReceiptA5: React.FC<ReceiptA5Props> = ({
  order,
  settings,
  onBack,
  onNewSale,
  onEditOrder,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const rawLogoSrc = settings.logoUrl || 'https://raw.githubusercontent.com/bdkhatibazar-sudo/images/main/ekdor_logo_bt.png';
  const [logoSrc, setLogoSrc] = useState<string>(rawLogoSrc);

  // Pre-load logo as safe base64 Data URL to completely eliminate CORS canvas tainting
  useEffect(() => {
    let isMounted = true;
    const loadSafeLogo = async () => {
      if (!rawLogoSrc || rawLogoSrc.startsWith('data:')) {
        setLogoSrc(rawLogoSrc);
        return;
      }
      try {
        const response = await fetch(rawLogoSrc, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && typeof reader.result === 'string') {
            setLogoSrc(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Failed to pre-convert logo to Data URL:', err);
      }
    };
    loadSafeLogo();
    return () => {
      isMounted = false;
    };
  }, [rawLogoSrc]);

  // Parcel ID or tracking code (for courier delivery / online orders)
  const parcelId = order.courierTrackingCode || (order.orderType === 'online' ? order.invoiceNumber : null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Render QR Code onto the canvas
  useEffect(() => {
    if (parcelId && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        parcelId.toString(),
        {
          width: 80,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QRCode Error:', error);
        }
      );
    }
  }, [parcelId]);

  // Direct native A5 printing
  const handlePrint = () => {
    document.body.classList.add('print-invoice');
    setTimeout(() => {
      window.print();
    }, 250);

    window.onafterprint = () => {
      document.body.classList.remove('print-invoice');
      window.onafterprint = null;
    };
  };

  // Safe canvas generation helper
  const captureInvoiceCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    try {
      return await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 5000,
      });
    } catch (primaryErr) {
      console.warn('Primary html2canvas capture failed, attempting fallback capture:', primaryErr);
      return await html2canvas(element, {
        scale: 1.5,
        useCORS: false,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
    }
  };

  // Trigger file download
  const triggerDownload = (url: string, filename: string, cleanup?: () => void) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      if (cleanup) cleanup();
    }, 1500);
  };

  // Download Invoice as Direct PDF using jsPDF
  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-template');
    if (!element) return;

    try {
      setIsCapturing(true);
      const canvas = await captureInvoiceCanvas(element);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // A5 dimensions: 148 x 210 mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const custName = (order.customerName || 'Customer').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
      pdf.save(`Invoice_${custName}_${order.invoiceNumber}.pdf`);
      showFeedback('চালান PDF সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error('Download PDF Error:', err);
      showFeedback('পিডিএফ ডাউনলোড তৈরিতে সমস্যা হয়েছে। "এ৫ প্রিন্ট" বাটন দিয়ে "Save as PDF" করুন।');
    } finally {
      setIsCapturing(false);
    }
  };

  // Download Invoice as PNG Image
  const handleDownloadImage = async () => {
    const element = document.getElementById('invoice-template');
    if (!element) return;

    try {
      setIsCapturing(true);
      const canvas = await captureInvoiceCanvas(element);
      const custName = (order.customerName || 'Customer').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
      const filename = `Invoice_${custName}_${order.invoiceNumber}.png`;

      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) {
            const dataUrl = canvas.toDataURL('image/png');
            triggerDownload(dataUrl, filename);
            return;
          }
          const url = URL.createObjectURL(blob);
          triggerDownload(url, filename, () => URL.revokeObjectURL(url));
          showFeedback('চালানের ছবি (PNG) সফলভাবে ডাউনলোড হয়েছে!');
        }, 'image/png');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        triggerDownload(dataUrl, filename);
        showFeedback('চালানের ছবি (PNG) সফলভাবে ডাউনলোড হয়েছে!');
      }
    } catch (err) {
      console.error('Download Image Error:', err);
      showFeedback('ছবি তৈরিতে সাময়িক সমস্যা হয়েছে। আপনি "PDF ডাউনলোড" বাটন দিয়ে সেভ করতে পারেন।');
    } finally {
      setIsCapturing(false);
    }
  };

  // Copy Invoice Image to Clipboard
  const handleCopyImage = async () => {
    const element = document.getElementById('invoice-template');
    if (!element) return;

    try {
      setIsCapturing(true);
      const canvas = await captureInvoiceCanvas(element);

      if (canvas.toBlob) {
        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error('Blob creation failed');
          if (navigator.clipboard && window.ClipboardItem) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
              ]);
              showFeedback('চালানের ছবি ক্লিপবোর্ডে কপি হয়েছে! হোয়াটসঅ্যাপে গিয়ে সরাসরি Paste (Ctrl+V) করুন।');
              return;
            } catch (clipErr) {
              console.warn('Clipboard write failed, downloading instead:', clipErr);
            }
          }
          const custName = (order.customerName || 'Customer').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
          const url = URL.createObjectURL(blob);
          triggerDownload(url, `Invoice_${custName}_${order.invoiceNumber}.png`, () => URL.revokeObjectURL(url));
          showFeedback('ছবিটি ডাউনলোড হয়েছে! হোয়াটসঅ্যাপ বা ফেসবুকে পাঠিয়ে দিন।');
        }, 'image/png');
      } else {
        const custName = (order.customerName || 'Customer').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
        const dataUrl = canvas.toDataURL('image/png');
        triggerDownload(dataUrl, `Invoice_${custName}_${order.invoiceNumber}.png`);
      }
    } catch (err) {
      console.error('Copy Image Error:', err);
      showFeedback('ছবি কপি করতে সমস্যা হয়েছে, "ছবি ডাউনলোড" বাটন ব্যবহার করুন।');
    } finally {
      setIsCapturing(false);
    }
  };

  // Share Invoice as Image or Open Image Preview Modal
  const handleShareImage = async () => {
    const element = document.getElementById('invoice-template');
    if (!element) return;

    try {
      setIsCapturing(true);
      const canvas = await captureInvoiceCanvas(element);
      const dataUrl = canvas.toDataURL('image/png');

      const custName = (order.customerName || 'Customer').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');

      if (canvas.toBlob) {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.share && navigator.canShare) {
            const file = new File([blob], `${custName}_${order.invoiceNumber}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  title: `চালান #${order.invoiceNumber} - ${settings.storeName}`,
                  text: `সম্মানিত গ্রাহক ${order.customerName || ''}, আপনার অর্ডারের চালান ছবি সংযুক্ত করা হলো।`,
                  files: [file],
                });
                showFeedback('চালানের ছবি সফলভাবে শেয়ার করা হয়েছে!');
                return;
              } catch (shareErr) {
                console.warn('Share dialog dismissed:', shareErr);
              }
            }
          }
          // If navigator.share is not supported or cancelled, open Image Preview Modal with direct save
          setPreviewImageModal(dataUrl);
        }, 'image/png');
      } else {
        setPreviewImageModal(dataUrl);
      }
    } catch (err) {
      console.error('Share Image Error:', err);
      showFeedback('ছবি তৈরিতে সমস্যা হয়েছে। "ছবি ডাউনলোড" বা "PDF ডাউনলোড" বাটন ব্যবহার করুন।');
    } finally {
      setIsCapturing(false);
    }
  };

  // WhatsApp text memo
  const handleSendWhatsApp = () => {
    const itemsText = order.items
      .map((it, idx) => `${idx + 1}. ${it.productName} (${it.quantity} ${it.unit}) - ৳${it.total}`)
      .join('\n');

    const message = 
`*${settings.storeName}*
*চালান নং: #${order.invoiceNumber}*

সম্মানিত গ্রাহক: ${order.customerName || 'গ্রাহক'}
তারিখ: ${new Date(order.date).toLocaleDateString('bn-BD')} ${new Date(order.date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true })}
-----------------------------
${itemsText}
-----------------------------
মোট পণ্যের মূল্য: ৳${order.subtotal}
${order.discount > 0 ? `ছাড়: -৳${order.discount}\n` : ''}${order.deliveryCharge > 0 ? `ডেলিভারি চার্জ: +৳${order.deliveryCharge}\n` : ''}*সর্বমোট বিল: ৳${order.grandTotal}*
${order.paidAmount > 0 ? `অগ্রিম জমা: ৳${order.paidAmount}\n` : ''}${order.codAmount > 0 ? `*কুরিয়ারে ডেলিভারির সময় প্রদেয় (COD): ৳${order.codAmount}*\n` : ''}${order.dueAmount > 0 ? `*বাকি টাকা: ৳${order.dueAmount}*\n` : ''}${order.courierTrackingCode ? `কুরিয়ার ট্র্যাকিং কোড: ${order.courierTrackingCode}\n` : ''}${order.deliveryAddress ? `ডেলিভারি ঠিকানা: ${order.deliveryAddress}\n` : ''}-----------------------------
${settings.invoiceFooter || 'অর্ডার করা খুবই সহজ 👉 ekdor.net (একদর.নেট)'}`;

    const targetWa = resolveWhatsAppNumber(order.customerWhatsapp, order.customerPhone);
    const waUrl = createWhatsAppUrl(targetWa, message);
    window.open(waUrl, '_blank');
  };

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(order.date);
      const datePart = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart} ${timePart}`;
    } catch {
      return order.date;
    }
  }, [order.date]);

  // Payment channel label in Bengali
  const paymentChannelLabel = useMemo(() => {
    switch (order.paymentMethod) {
      case 'qr': return 'কিউআর কোড (বাংলা QR)';
      case 'bkash': return 'বিকাশ (bKash)';
      case 'bank': return 'ব্যাংক একাউন্ট';
      case 'due': return 'বাকি (Due)';
      default: return 'ক্যাশ (নগদ)';
    }
  }, [order.paymentMethod]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="no-print">
        {feedbackMsg && (
          <div className="mb-3 p-3 bg-emerald-600 text-white font-medium text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              id="btn-receipt-back"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              ফিরে যান
            </button>

            {onEditOrder && (
              <button
                onClick={() => onEditOrder(order)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                title="এই অর্ডার সংশোধন বা এডিট করুন"
              >
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>অর্ডার এডিট</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNewSale && (
              <button
                id="btn-new-sale"
                onClick={onNewSale}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>নতুন বিক্রি</span>
              </button>
            )}

            {/* Direct PDF Download using jsPDF */}
            <button
              id="btn-download-pdf"
              onClick={handleDownloadPDF}
              disabled={isCapturing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="ইনভয়েসটি সরাসরি PDF ফাইল হিসেবে ডাউনলোড করুন"
            >
              {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-rose-600" />}
              <span>PDF ডাউনলোড</span>
            </button>

            {/* Download as Image (PNG) */}
            <button
              id="btn-download-image"
              onClick={handleDownloadImage}
              disabled={isCapturing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="ইনভয়েসটি ছবি (PNG) হিসেবে ডাউনলোড করুন"
            >
              {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-indigo-600" />}
              <span>ছবি ডাউনলোড</span>
            </button>

            {/* Share or Preview Image */}
            <button
              id="btn-share-image"
              onClick={handleShareImage}
              disabled={isCapturing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="ইনভয়েসের ছবি শেয়ার বা প্রিভিউ দেখুন"
            >
              {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4 text-violet-600" />}
              <span>ছবি শেয়ার</span>
            </button>

            {/* Copy Image to Clipboard */}
            <button
              id="btn-copy-image"
              onClick={handleCopyImage}
              disabled={isCapturing}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="ছবি ক্লিপবোর্ডে কপি করুন (হোয়াটসঅ্যাপ বা মেসেঞ্জারে গিয়ে Ctrl+V দিয়ে সরাসরি পেস্ট করুন)"
            >
              {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4 text-teal-600" />}
              <span>ছবি কপি (Paste)</span>
            </button>

            {/* WhatsApp Text Memo */}
            <button
              id="btn-whatsapp-receipt"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="হোয়াটসঅ্যাপে বিলের মেমো পাঠান"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>হোয়াটসঅ্যাপ</span>
            </button>

            {/* Print / Save as PDF */}
            <button
              id="btn-print-a5"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="প্রিন্ট ডায়লগে 'Save as PDF' অপশন দিয়ে প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4" />
              <span>এ৫ প্রিন্ট</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Container Structure */}
      <div className="overflow-x-auto flex justify-center pb-8">
        <div id="invoice-template" className="shadow-lg border border-slate-300 bg-white">
          <div className="pdf-container">
            
            {/* Header Section */}
            <div className="inv-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
              <img 
                src={logoSrc} 
                alt="Logo" 
                style={{ width: '75px', height: 'auto', objectFit: 'contain' }}
                crossOrigin="anonymous"
              />
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                  {settings.storeName || 'নিরাময় হিজামা কেন্দ্র - খাঁটি বাজার'}
                </h2>
                <p style={{ margin: '3px 0', fontSize: '12px' }}>
                  {settings.address || 'মসজিদে মাহমুদ, আশিয়ান সিটি ২ নং গেট, এয়ারপোর্ট, ঢাকা।'}
                </p>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  📞 {toBanglaNumber(settings.phone || '০১৭১০-৭২৪৩৪৩')} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 🌐 {settings.website || 'ekdor.net'}
                </p>
              </div>
            </div>
            
            {/* Customer & Bill Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '5px' }}>
              <div style={{ width: '60%' }}>
                <b>বিল নং:</b> <span>#{toBanglaNumber(order.invoiceNumber)}</span><br />
                <b>ক্রেতার নাম:</b> <span>{order.customerName || 'খুচরা নগদ ক্রেতা'}</span><br />
                <b>ঠিকানা:</b> <span>{order.deliveryAddress || 'দোকান থেকে সরবরাহ'}</span>
              </div>
              <div style={{ textAlign: 'right', width: '40%' }}>
                <b>তারিখ:</b> <span>{formattedDate}</span><br />
                <b>মোবাইল:</b> <span>{toBanglaNumber(order.customerPhone || '')}</span>
                {order.customerWhatsapp && (
                  <div>
                    <b>হোয়াটসঅ্যাপ:</b> <span>{toBanglaNumber(order.customerWhatsapp)}</span>
                  </div>
                )}
                <div>
                  <small style={{ color: '#475569' }}>পেমেন্ট: {paymentChannelLabel}</small>
                </div>
              </div>
            </div>

            {/* Separate Recipient Information if Third-party / Gift delivery */}
            {order.isDifferentRecipient && order.recipientName && (
              <div style={{ 
                margin: '6px 0', 
                padding: '6px 8px', 
                background: '#f1f5f9', 
                border: '1px dashed #64748b', 
                borderRadius: '4px',
                fontSize: '12px',
                textAlign: 'left'
              }}>
                <b>📦 পার্সেল প্রাপক (Receiver):</b> {order.recipientName} &nbsp;|&nbsp; 
                <b>ফোন:</b> {toBanglaNumber(order.recipientPhone || '')}<br />
                <b>প্রাপকের ঠিকানা:</b> {order.recipientAddress || order.deliveryAddress}
              </div>
            )}

            {/* Product Items Table */}
            <table className="inv-table">
              <thead>
                <tr style={{ background: '#f2f2f2' }}>
                  <th style={{ width: '10%' }}>ক্র:</th>
                  <th style={{ width: '50%' }}>পণ্যের নাম</th>
                  <th style={{ width: '10%' }}>সংখ্যা</th>
                  <th style={{ width: '15%' }}>দর</th>
                  <th style={{ width: '15%' }}>মোট</th>
                </tr>
              </thead>
              <tbody id="p-items">
                {order.items.map((item, index) => (
                  <tr key={item.productId || index}>
                    <td style={{ textAlign: 'center' }}>{toBanglaNumber(index + 1)}</td>
                    <td>{item.productName}</td>
                    <td style={{ textAlign: 'center' }}>{toBanglaNumber(item.quantity)}</td>
                    <td style={{ textAlign: 'center' }}>{toBanglaNumber(item.unitPrice)}</td>
                    <td style={{ textAlign: 'right' }}>{toBanglaNumber(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer Summary & QR/Parcel Box */}
            <div style={{ display: 'flex', justifyContent: parcelId ? 'space-between' : 'flex-end', alignItems: 'flex-start', marginTop: '5px', width: '100%' }}>
              {/* Courier Parcel ID & QR Code Box */}
              {parcelId ? (
                <div className="parcel-box" id="p-parcel-container" style={{ marginRight: 'auto' }}>
                  <div className="parcel-info">
                    <div className="parcel-title">Parcel ID :</div>
                    <div className="parcel-id" id="p-parcel-id">{parcelId}</div>
                  </div>
                  <div id="qrcode">
                    <canvas ref={qrCanvasRef} style={{ width: '80px', height: '80px' }} />
                  </div>
                </div>
              ) : null}

              {/* Financial Calculations */}
              <div className="inv-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>মোট বিল:</span> <span>{toBanglaNumber(order.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ডেলিভারী:</span> <span>{toBanglaNumber(order.deliveryCharge || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ছাড়:</span> <span>{toBanglaNumber(order.discount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', fontWeight: 'bold' }}>
                  <span>সর্বমোট:</span> <span>{toBanglaNumber(order.grandTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>পরিশোধ:</span> <span>{toBanglaNumber(order.paidAmount || 0)}</span>
                </div>
                <div className="due-border" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{order.codAmount > 0 ? 'কুরিয়ার COD / প্রদেয়:' : 'প্রদেয়:'}</span> 
                  <span>{toBanglaNumber(order.dueAmount || order.codAmount || 0)}</span>
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div className="page-footer">
              {settings.invoiceFooter || 'অর্ডার করা খুবই সহজ 👉 ekdor.net (একদর.নেট)'}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview & Share Fallback Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 space-y-3 border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>চালানের ছবি প্রস্তুত</span>
              </h3>
              <button onClick={() => setPreviewImageModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-lg p-1 bg-slate-50 flex justify-center">
              <img src={previewImageModal} alt="Invoice Preview" className="max-w-full h-auto rounded" />
            </div>

            <p className="text-xs text-slate-500 text-center">
              ছবিটি ডাউনলোড করে হোয়াটসঅ্যাপে বা মেসেঞ্জারে পাঠিয়ে দিন
            </p>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewImageModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                বন্ধ
              </button>
              <button
                onClick={() => {
                  const custName = (order.customerName || 'Customer').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
                  triggerDownload(previewImageModal, `Invoice_${custName}_${order.invoiceNumber}.png`);
                  setPreviewImageModal(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ছবি ডাউনলোড করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
