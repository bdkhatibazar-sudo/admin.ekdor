import { StoreSettings } from '../types';

export async function pingSteadfast(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

export async function getSteadfastBalance(
  settings: StoreSettings
): Promise<{ success: boolean; balance?: number; message?: string }> {
  try {
    const apiKey = settings.courierApiKey?.trim() || '';
    const secretKey = settings.courierSecretKey?.trim() || '';

    if (!apiKey || !secretKey) {
      return {
        success: false,
        message: 'Steadfast API Key এবং Secret Key প্রদান করুন।',
      };
    }

    const res = await fetch('/api/steadfast/get_balance', {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.error || errData.message || `সার্ভার রেসপন্স কোড: ${res.status}`,
      };
    }

    const data = await res.json();
    // Steadfast typically returns { status: 200, current_balance: 1540 }
    const balance = data.current_balance ?? data.balance ?? 0;
    return {
      success: true,
      balance: Number(balance),
      message: 'ব্যালেন্স সফলভাবে চেক করা হয়েছে।',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'কুরিয়ার ব্যালেন্স চেক করতে সমস্যা হয়েছে।',
    };
  }
}

export async function createSteadfastOrder(
  orderData: any,
  settings: StoreSettings
): Promise<{ success: boolean; trackingCode?: string; message?: string }> {
  try {
    const apiKey = settings.courierApiKey?.trim() || '';
    const secretKey = settings.courierSecretKey?.trim() || '';

    const res = await fetch('/api/steadfast/create_order', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.status === 200 || data.consignment)) {
      return {
        success: true,
        trackingCode: data.consignment?.tracking_code || data.tracking_code,
        message: 'পার্সেল সফলভাবে কুরিয়ারে বুকিং হয়েছে!',
      };
    }

    return {
      success: false,
      message: data.message || data.error || 'অর্ডার বুকিং করা সম্ভব হয়নি।',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'কুরিয়ার বুকিং এ সমস্যা হয়েছে।',
    };
  }
}
