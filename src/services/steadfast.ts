/**
 * Steadfast Courier API Integration Service
 * Documentation & Portal: https://portal.steadfast.com.bd/
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
  raw?: any;
}

export const createSteadfastOrder = async (
  order: Order,
  settings: StoreSettings
): Promise<SteadfastOrderResponse> => {
  const apiKey = (settings.courierApiKey || '').trim();
  const secretKey = (settings.courierSecretKey || '').trim();

  if (!apiKey || !secretKey) {
    return {
      success: false,
      message: 'স্টেডফাস্ট এপিআই কি (Api Key) বা সিক্রেট কি (Secret Key) সেটিংসে পাওয়া যায়নি। অনুগ্রহ করে সেটিংসে কি বসান অথবা ম্যানুয়ালি কনসাইনমেন্ট আইডি লিখুন।',
    };
  }

  const recipientName = (order.isDifferentRecipient && order.recipientName ? order.recipientName : order.customerName).trim();
  const recipientPhone = (order.isDifferentRecipient && order.recipientPhone ? order.recipientPhone : (order.customerPhone || '')).replace(/[^0-9+]/g, '');
  const recipientAddress = (order.isDifferentRecipient && order.recipientAddress ? order.recipientAddress : (order.deliveryAddress || '')).trim();

  if (!recipientName) {
    return { success: false, message: 'প্রাপকের নাম আবশ্যক।' };
  }
  if (!recipientPhone) {
    return { success: false, message: 'প্রাপকের সঠিক মোবাইল নম্বর আবশ্যক।' };
  }
  if (!recipientAddress) {
    return { success: false, message: 'প্রাপকের ডেলিভারি ঠিকানা আবশ্যক।' };
  }

  const payload: SteadfastCreateOrderPayload = {
    invoice: order.invoiceNumber,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_address: recipientAddress,
    cod_amount: Math.round(order.codAmount || 0),
    note: order.note || `Ekdor POS Invoice #${order.invoiceNumber}`,
  };

  // Try via proxy first (/api/steadfast/create_order), then fallback to direct
  const endpoints = ['/api/steadfast/create_order', 'https://portal.steadfast.com.bd/api/v1/create_order'];

  let lastErrorMsg = '';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data) {
        if (data.status === 200 || data.consignment) {
          const consignment = data.consignment || {};
          const consignmentId = consignment.consignment_id?.toString() || consignment.id?.toString();
          const trackingCode = consignment.tracking_code?.toString() || consignmentId;

          return {
            success: true,
            message: data.message || 'স্টেডফাস্ট কুরিয়ারে পার্সেল সফলভাবে বুকিং হয়েছে!',
            consignmentId: consignmentId || trackingCode,
            trackingCode: trackingCode || consignmentId,
            trackingUrl: `https://steadfast.com.bd/t/${trackingCode || consignmentId}`,
            raw: data,
          };
        } else {
          lastErrorMsg = data.message || (data.errors ? JSON.stringify(data.errors) : 'বুকিং ব্যর্থ হয়েছে');
        }
      } else if (data && data.message) {
        lastErrorMsg = data.message;
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || 'নেটওয়ার্ক সংযোগ ত্রুটি';
    }
  }

  return {
    success: false,
    message: `স্টেডফাস্ট বুকিং ব্যর্থ: ${lastErrorMsg || 'সার্ভার সাড়া দেয়নি'}। আপনি চাইলে ম্যানুয়ালি তাদের অ্যাপে বুকিং দিয়ে কনসাইনমেন্ট আইডি নিচে লিখে দিতে পারেন।`,
  };
};

export const getSteadfastTrackingUrl = (trackingCodeOrId: string): string => {
  const clean = (trackingCodeOrId || '').trim();
  return `https://steadfast.com.bd/t/${clean}`;
};
