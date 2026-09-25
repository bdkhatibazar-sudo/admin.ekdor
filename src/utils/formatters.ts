/**
 * Format currency with Bangladeshi Taka (৳) symbol and comma separation
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '৳0';
  }
  const rounded = Math.round(amount);
  return `৳${rounded.toLocaleString('en-IN')}`;
}

/**
 * Convert English digits to Bengali digits
 */
export function toBanglaNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => banglaDigits[+w]);
}

/**
 * Format date in localized / readable format
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Format date and time
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Resolves phone number for WhatsApp URL (adds 88 country code if BD local number)
 */
export function resolveWhatsAppNumber(phone?: string, fallbackPhone?: string): string {
  const raw = phone || fallbackPhone || '';
  let cleaned = raw.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('0088')) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.startsWith('880')) {
    return cleaned;
  }

  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return `88${cleaned}`;
  }

  if (cleaned.startsWith('1') && cleaned.length === 10) {
    return `880${cleaned}`;
  }

  return cleaned;
}

/**
 * Creates WhatsApp deep link / web link
 */
export function createWhatsAppUrl(phone: string, message: string): string {
  const target = resolveWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${target}?text=${encodedText}`;
}
