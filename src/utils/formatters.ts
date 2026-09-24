// Bengali numbers & currency formatting helpers

export const banglaDigits: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

export const englishDigits: { [key: string]: string } = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/**
 * Converts Bengali numerals (০-৯) to English numerals (0-9)
 */
export const toEnglishDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  return str.replace(/[০-৯]/g, (d) => englishDigits[d] || d);
};

/**
 * Safely parses any number input string (supports both English and Bengali digits, and decimal point)
 */
export const parseNumberInput = (raw: string | number | undefined | null): number => {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const eng = toEnglishDigits(raw);
  const cleaned = eng.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const toBanglaNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '০';
  const str = Math.round(Number(num) * 100) / 100;
  return str
    .toString()
    .replace(/\d/g, (d) => banglaDigits[d] || d);
};

export const formatCurrency = (amount: number, useBanglaDigits = false): string => {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount || 0);

  if (useBanglaDigits) {
    return `৳${formatted.replace(/\d/g, (d) => banglaDigits[d] || d)}`;
  }
  return `৳ ${formatted}`;
};

export const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })} | ${d.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  } catch {
    return dateStr;
  }
};

// Generate human-friendly invoice numbers
export const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${random}`;
};

// Resolve WhatsApp phone: 2nd WhatsApp number if provided, else 1st primary phone
export const resolveWhatsAppNumber = (whatsapp?: string, phone?: string): string => {
  if (whatsapp && whatsapp.trim()) {
    return whatsapp.trim();
  }
  if (phone && phone.trim()) {
    return phone.trim();
  }
  return '';
};

// Generate clean wa.me URL
export const createWhatsAppUrl = (phone: string, text: string): string => {
  const clean = phone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);
  if (!clean) {
    return `https://wa.me/?text=${encoded}`;
  }
  // If Bangladesh 11 digit e.g. 017..., add 88 prefix
  if (clean.length === 11 && clean.startsWith('01')) {
    return `https://wa.me/88${clean}?text=${encoded}`;
  }
  if (clean.startsWith('8801')) {
    return `https://wa.me/${clean}?text=${encoded}`;
  }
  return `https://wa.me/${clean}?text=${encoded}`;
};

