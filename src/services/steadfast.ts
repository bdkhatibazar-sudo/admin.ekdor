/**
 * Steadfast / Packzy Courier API Integration Service
 * Official API Documentation: https://portal.packzy.com/api/v1
 * Portal: https://portal.packzy.com / https://portal.steadfast.com.bd
 */

import { Order, StoreSettings } from '../types';

export interface SteadfastCreateOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
}

export interface SteadfastOrderResponse {
  success: boolean;
  message: string;
  consignmentId?: string;
  trackingCode?: string;
  trackingUrl?: string;
  status?: string;
  raw?: any;
}

export interface SteadfastBalanceResponse {
  success: boolean;
  balance?: number;
  message?: string;
}

export interface SteadfastFraudCheckResponse {
  success: boolean;
  phone: string;
  score?: number;
  level?: 'safe' | 'warning' | 'danger' | string;
  totalReports?: number;
  reasons?: string[];
  message?: string;
}

export interface SteadfastStatusResponse {
  success: boolean;
  deliveryStatus?: string;
  deliveryStatusBangla?: string;
  message?: string;
}

// Map English delivery statuses to clear Bengali terms
export const STEADFAST_STATUS_MAP: Record<string, string> = {
  pending: 'অপেক্ষমাণ (Pending - কুরিয়ারে বুকিং গৃহীত)',
  in_review: 'পর্যালোচনাধীন (In Review - অনুমোদনের অপেক্ষায়)',
  hold: 'হোল্ডে আছে (Hold - ঠিকানা বা পেমেন্ট যাচাই)',
  delivered_approval_pending: 'ডেলিভার্ড (অনুমোদনের অপেক্ষায়)',
  partial_delivered_approval_pending: 'আংশিক ডেলিভার্ড (অনুমোদনের অপেক্ষায়)',
  cancelled_approval_pending: 'বাতিল (অনুমোদনের অপেক্ষায়)',
  unknown_approval_pending: 'যাচাইকরণ প্রক্রিয়াধীন',
  delivered: 'ডেলিভার্ড সম্পন্ন (Delivered - COD সংগ্রহ সম্পন্ন)',
  partial_delivered: 'আংশিক ডেলিভারি সম্পন্ন (Partial Delivered)',
  cancelled: 'ডেলিভারি বাতিল (Cancelled - পার্সেল ফেরত আসবে)',
  exceptional: 'বিশেষ অবস্থা (Exceptional - কুরিয়ার হেল্পলাইনে যোগাযোগ করুন)',
  unknown: 'অজানা স্ট্যাটাস',
};

// Convert Bengali numbers to English digits
const normalizeToEnglishDigits = (input: string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let result = input;
  banglaDigits.forEach((digit, index) => {
    result = result.split(digit).join(index.toString());
  });
  return result;
};

// Clean strings according to Packzy API documentation:
// Replace { } ; < > $ with space and enforce length limits
const sanitizeField = (str: string, maxLen: number): string => {
  if (!str) return '';
  const cleaned = str.replace(/[{}\;<>\\$]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.substring(0, maxLen);
};

// Normalize Bangladeshi phone number for courier
export const normalizeCourierPhone = (rawPhone: string): string => {
  if (!rawPhone) return '';
  const converted = normalizeToEnglishDigits(rawPhone);
  // Keep numbers and optional leading +
  let clean = converted.replace(/[^0-9+]/g, '');

  if (clean.startsWith('+880')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('880')) {
    clean = '0' + clean.slice(3);
  }

  return clean.substring(0, 40);
};

// Helper to make API calls through server proxy first, then direct if feasible
const makeCourierRequest = async (
  path: string,
  options: {
    method?: string;
    apiKey?: string;
    secretKey?: string;
    body?: any;
  } = {}
): Promise<{ ok: boolean; status: number; data: any; error?: string }> => {
  const { method = 'GET', apiKey = '', secretKey = '', body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) headers['Api-Key'] = apiKey;
  if (secretKey) headers['Secret-Key'] = secretKey;

  // 1. Try local server-side proxy route (/api/steadfast/*)
  try {
    const proxyUrl = `/api/steadfast${path}`;
    const res = await fetch(proxyUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      return { ok: true, status: res.status, data };
    }
    if (data) {
      return { ok: false, status: res.status, data, error: data.message || (data.errors ? JSON.stringify(data.errors) : undefined) };
    }
  } catch (err: any) {
    console.warn('Proxy fetch failed, attempting direct Packzy fallback:', err);
  }

  // 2. Direct Packzy URL fallback (in case proxy is unreachable)
  try {
    const directUrl = `https://portal.packzy.com/api/v1${path}`;
    const directRes = await fetch(directUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const directData = await directRes.json().catch(() => null);
    if (directRes.ok && directData) {
      return { ok: true, status: directRes.status, data: directData };
    }
    return { ok: false, status: directRes.status, data: directData, error: directData?.message };
  } catch (err: any) {
    return { ok: false, status: 500, data: null, error: err?.message || 'কুরিয়ার সার্ভার সাড়া দিচ্ছে না' };
  }
};

/**
 * Ping check - verify courier server connectivity
 */
export const pingSteadfast = async (): Promise<boolean> => {
  const result = await makeCourierRequest('/ping');
  return result.ok && result.data?.status === 200;
};

/**
 * Get current balance from Steadfast / Packzy
 */
export const getSteadfastBalance = async (
  settings: StoreSettings
): Promise<SteadfastBalanceResponse> => {
  const apiKey = (settings.courierApiKey || '').trim();
  const secretKey = (settings.courierSecretKey || '').trim();

  if (!apiKey || !secretKey) {
    return {
      success: false,
      message: 'সেটিংসে কুরিয়ার এপিআই কি (Api Key) ও সিক্রেট কি (Secret Key) বসান।',
    };
  }

  const result = await makeCourierRequest('/get_balance', {
    method: 'GET',
    apiKey,
    secretKey,
  });

  if (result.ok && result.data && result.data.status === 200) {
    return {
      success: true,
      balance: result.data.current_balance ?? 0,
      message: `বর্তমান কুরিয়ার ব্যালেন্স: ৳${result.data.current_balance ?? 0}`,
    };
  }

  return {
    success: false,
    message: result.error || 'ব্যালেন্স তথ্য পাওয়া যায়নি। কি যাচাই করুন।',
  };
};

/**
 * Check customer phone fraud score (0 to 100)
 */
export const checkSteadfastFraudScore = async (
  rawPhone: string,
  settings: StoreSettings
): Promise<SteadfastFraudCheckResponse> => {
  const phone = normalizeCourierPhone(rawPhone);
  const apiKey = (settings.courierApiKey || '').trim();
  const secretKey = (settings.courierSecretKey || '').trim();

  if (!phone) {
    return { success: false, phone: '', message: 'মোবাইল নম্বর পাওয়া যায়নি।' };
  }

  if (!apiKey || !secretKey) {
    return { success: false, phone, message: 'কুরিয়ার এপিআই কি সেটিংসে যুক্ত নেই।' };
  }

  const result = await makeCourierRequest(`/fraud_check/score/${phone}`, {
    method: 'GET',
    apiKey,
    secretKey,
  });

  if (result.ok && result.data && result.data.status === 200) {
    const data = result.data;
    return {
      success: true,
      phone,
      score: data.score,
      level: data.level,
      totalReports: data.total_reports || 0,
      reasons: data.reasons || [],
      message: `ফ্রড স্কোর: ${data.score}/১০০ (লেভেল: ${data.level})`,
    };
  }

  return {
    success: false,
    phone,
    message: result.error || 'ফ্রড চেক সম্পন্ন করা যায়নি।',
  };
};

/**
 * Check live parcel delivery status
 */
export const checkSteadfastStatus = async (
  consignmentIdOrTracking: string,
  settings: StoreSettings
): Promise<SteadfastStatusResponse> => {
  const query = (consignmentIdOrTracking || '').trim();
  const apiKey = (settings.courierApiKey || '').trim();
  const secretKey = (settings.courierSecretKey || '').trim();

  if (!query) {
    return { success: false, message: 'কনসাইনমেন্ট আইডি বা ট্র্যাকিং কোড প্রয়োজন।' };
  }

  if (!apiKey || !secretKey) {
    return { success: false, message: 'কুরিয়ার এপিআই কি যুক্ত নেই।' };
  }

  // If numeric, check by consignment id, else tracking code
  const isNumeric = /^\d+$/.test(query);
  const path = isNumeric ? `/status_by_cid/${query}` : `/status_by_trackingcode/${query}`;

  const result = await makeCourierRequest(path, {
    method: 'GET',
    apiKey,
    secretKey,
  });

  if (result.ok && result.data && result.data.status === 200) {
    const statusKey = result.data.delivery_status || 'unknown';
    const statusBangla = STEADFAST_STATUS_MAP[statusKey] || statusKey;
    return {
      success: true,
      deliveryStatus: statusKey,
      deliveryStatusBangla: statusBangla,
      message: `বর্তমান অবস্থা: ${statusBangla}`,
    };
  }

  return {
    success: false,
    message: result.error || 'স্ট্যাটাস জানা যায়নি।',
  };
};

/**
 * Create order / book parcel in Steadfast / Packzy
 */
export const createSteadfastOrder = async (
  order: Order,
  settings: StoreSettings
): Promise<SteadfastOrderResponse> => {
  const apiKey = (settings.courierApiKey || '').trim();
  const secretKey = (settings.courierSecretKey || '').trim();

  if (!apiKey || !secretKey) {
    return {
      success: false,
      message: 'স্টেডফাস্ট এপিআই কি (Api Key) বা সিক্রেট কি (Secret Key) সেটিংসে পাওয়া যায়নি। অনুগ্রহ করে সেটিংস পেজে কি বসান অথবা ম্যানুয়ালি কনসাইনমেন্ট আইডি লিখুন।',
    };
  }

  const rawRecipientName = (order.isDifferentRecipient && order.recipientName ? order.recipientName : order.customerName) || '';
  const rawRecipientPhone = (order.isDifferentRecipient && order.recipientPhone ? order.recipientPhone : order.customerPhone) || '';
  const rawRecipientAddress = (order.isDifferentRecipient && order.recipientAddress ? order.recipientAddress : order.deliveryAddress) || '';

  const recipientName = sanitizeField(rawRecipientName, 100);
  const recipientPhone = normalizeCourierPhone(rawRecipientPhone);
  const recipientAddress = sanitizeField(rawRecipientAddress, 490);
  const invoice = sanitizeField(order.invoiceNumber, 100);
  const note = sanitizeField(order.note || `Ekdor.net Invoice #${order.invoiceNumber}`, 480);

  if (!recipientName) {
    return { success: false, message: 'প্রাপকের নাম আবশ্যক।' };
  }
  if (!recipientPhone || recipientPhone.length < 10) {
    return { success: false, message: 'প্রাপকের সঠিক মোবাইল নম্বর আবশ্যক (কমপক্ষে ১১ ডিজিট)।' };
  }
  if (!recipientAddress) {
    return { success: false, message: 'প্রাপকের ডেলিভারি পূর্ণাঙ্গ ঠিকানা আবশ্যক।' };
  }

  // COD amount must be an integer >= 0
  const codAmount = Math.max(0, Math.round(order.codAmount ?? 0));

  const payload: SteadfastCreateOrderPayload = {
    invoice,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_address: recipientAddress,
    cod_amount: codAmount,
    note,
  };

  const result = await makeCourierRequest('/create_order', {
    method: 'POST',
    apiKey,
    secretKey,
    body: payload,
  });

  if (result.ok && result.data && (result.data.status === 200 || result.data.consignment)) {
    const consignment = result.data.consignment || {};
    const consignmentId = consignment.consignment_id?.toString() || consignment.id?.toString();
    const trackingCode = consignment.tracking_code?.toString() || consignmentId;
    const trackingLink = consignment.tracking_link || `https://steadfast.com.bd/t/${trackingCode || consignmentId}`;

    return {
      success: true,
      message: result.data.message || 'স্টেডফাস্ট কুরিয়ারে পার্সেল সফলভাবে বুকিং হয়েছে!',
      consignmentId: consignmentId || trackingCode,
      trackingCode: trackingCode || consignmentId,
      trackingUrl: trackingLink,
      status: consignment.status || 'in_review',
      raw: result.data,
    };
  }

  let errorDetails = result.error || 'বুকিং ব্যর্থ হয়েছে';
  if (result.data?.errors) {
    try {
      const errList = Object.entries(result.data.errors)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join(' | ');
      errorDetails = errList;
    } catch {
      // Ignore
    }
  }

  return {
    success: false,
    message: `স্টেডফাস্ট বুকিং ব্যর্থ: ${errorDetails}। তথ্য যাচাই করে আবার চেষ্টা করুন অথবা ম্যানুয়ালি কনসাইনমেন্ট আইডি লিখুন।`,
    raw: result.data,
  };
};

export const getSteadfastTrackingUrl = (trackingCodeOrId: string): string => {
  const clean = (trackingCodeOrId || '').trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://steadfast.com.bd/t/${clean}`;
};
