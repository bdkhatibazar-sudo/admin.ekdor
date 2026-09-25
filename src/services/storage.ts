import { AppStateData } from '../types';

const STORAGE_KEY = 'ekdor_pos_app_state_v1';

export const DEFAULT_DEMO_STATE: AppStateData = {
  settings: {
    storeName: 'একদর ফ্যাশন ও স্টোর',
    storeTagline: 'স্মার্ট বিক্রয় পয়েন্ট ও ডিজিটাল হিসাব খাতা',
    ownerName: 'মো: আব্দুল্লাহ',
    phone: '01711000000',
    alternatePhone: '01811000000',
    address: 'দোকান নং ১২, নিউ মার্কেট কমপ্লেক্স, ঢাকা',
    website: 'www.ekdor.shop',
    invoiceFooter: 'আমাদের সাথে থাকার জন্য ধন্যবাদ! বিক্রিত মাল ৭ দিনের মধ্যে পরিবর্তনযোগ্য।',
    printPaperSize: 'a5',
    courierApiKey: '',
    courierSecretKey: '',
  },
  products: [
    {
      id: 'prod-1',
      name: 'প্রিমিয়াম সুতি পাঞ্জাবি (সাদা)',
      code: 'PANJ-001',
      sku: 'PJ-WH-01',
      category: 'পোশাক',
      sellingPrice: 1250,
      purchasePrice: 850,
      stockQty: 25,
      minStockAlert: 5,
      unit: 'পিস',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-2',
      name: 'ডিজাইনার কাবলি সেট (নেভি ব্লু)',
      code: 'KAB-002',
      sku: 'KB-NB-02',
      category: 'পোশাক',
      sellingPrice: 1850,
      purchasePrice: 1300,
      stockQty: 18,
      minStockAlert: 4,
      unit: 'সেট',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-3',
      name: 'হাতে বোনা কটন টুপি',
      code: 'TOPI-003',
      sku: 'TP-CT-03',
      category: 'এক্সেসরিজ',
      sellingPrice: 180,
      purchasePrice: 100,
      stockQty: 50,
      minStockAlert: 10,
      unit: 'পিস',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-4',
      name: 'খাস আতর (১০ মিলি)',
      code: 'ATR-004',
      sku: 'AT-KH-04',
      category: 'সুগন্ধি',
      sellingPrice: 450,
      purchasePrice: 280,
      stockQty: 30,
      minStockAlert: 6,
      unit: 'বোতল',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  bundles: [
    {
      id: 'bun-1',
      name: 'স্পেশাল ঈদ কম্বো প্যাকেজ',
      category: 'ঈদ অফার',
      description: '১টি পাঞ্জাবি + ১টি টুপি + ১টি আতর এর আকর্ষণীয় কম্বো',
      bundlePrice: 1750,
      defaultDeliveryCharge: 130,
      items: [
        { productId: 'prod-1', quantity: 1, productName: 'প্রিমিয়াম সুতি পাঞ্জাবি (সাদা)', sellingPrice: 1250, purchasePrice: 850 },
        { productId: 'prod-3', quantity: 1, productName: 'হাতে বোনা কটন টুপি', sellingPrice: 180, purchasePrice: 100 },
        { productId: 'prod-4', quantity: 1, productName: 'খাস আতর (১০ মিলি)', sellingPrice: 450, purchasePrice: 280 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  customers: [
    {
      id: 'cust-1',
      name: 'মোহাম্মদ রফিকুল ইসলাম',
      phone: '01712345678',
      whatsappPhone: '01712345678',
      address: 'মিরপুর-১০, ঢাকা',
      notes: 'নিয়মিত ও বিশ্বস্ত গ্রাহক',
      totalPurchased: 4500,
      totalPaid: 3500,
      totalDue: 1000,
      advanceBalance: 0,
      totalOrders: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust-2',
      name: 'তানভীর আহমেদ',
      phone: '01898765432',
      whatsappPhone: '01898765432',
      address: 'উত্তরা সেক্টর ৭, ঢাকা',
      notes: 'অনলাইন শপ অর্ডারি গ্রাহক',
      totalPurchased: 2200,
      totalPaid: 2200,
      totalDue: 0,
      advanceBalance: 300,
      totalOrders: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  orders: [
    {
      id: 'ord-1',
      invoiceNumber: 'INV-1001',
      date: new Date().toISOString(),
      orderType: 'cash',
      customerId: 'cust-1',
      customerName: 'মোহাম্মদ রফিকুল ইসলাম',
      customerPhone: '01712345678',
      customerAddress: 'মিরপুর-১০, ঢাকা',
      items: [
        {
          productId: 'prod-1',
          productName: 'প্রিমিয়াম সুতি পাঞ্জাবি (সাদা)',
          quantity: 1,
          unitPrice: 1250,
          purchasePrice: 850,
          subtotal: 1250,
        },
        {
          productId: 'prod-4',
          productName: 'খাস আতর (১০ মিলি)',
          quantity: 1,
          unitPrice: 450,
          purchasePrice: 280,
          subtotal: 450,
        }
      ],
      subtotal: 1700,
      discount: 100,
      grandTotal: 1600,
      paidAmount: 600,
      dueAmount: 1000,
      paymentMethod: 'cash',
      status: 'confirmed',
      notes: 'প্রথম কিস্তি নগদ দিয়েছেন',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  duePayments: [
    {
      id: 'due-pay-1',
      customerId: 'cust-1',
      customerName: 'মোহাম্মদ রফিকুল ইসলাম',
      amount: 500,
      date: new Date().toISOString(),
      paymentMethod: 'bkash',
      note: 'বিকাশে ৫০০ টাকা জমা',
      receivedBy: 'মো: আব্দুল্লাহ',
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      title: 'দোকান ভাড়া (চলতি মাস)',
      category: 'ভাড়া',
      amount: 5000,
      date: new Date().toISOString(),
      paymentMethod: 'bank',
      note: 'মালিককে চেক প্রদান',
    },
    {
      id: 'exp-2',
      title: 'চা-নাস্তা ও আপ্যায়ন',
      category: 'আপ্যায়ন',
      amount: 150,
      date: new Date().toISOString(),
      paymentMethod: 'cash',
      note: '',
    }
  ],
  purchases: [
    {
      id: 'pur-1',
      supplierName: 'আল-মদিনা ফেব্রিক্স',
      supplierPhone: '01911223344',
      invoiceNumber: 'SUP-4421',
      date: new Date().toISOString(),
      items: [
        {
          productId: 'prod-1',
          productName: 'প্রিমিয়াম সুতি পাঞ্জাবি (সাদা)',
          quantity: 20,
          unitCost: 850,
          subtotal: 17000,
        }
      ],
      totalAmount: 17000,
      paidAmount: 10000,
      dueAmount: 7000,
      notes: 'বাকি ৭,০০০ টাকা পরবর্তী চালানের আগে পরিশোধ করতে হবে',
    }
  ],
  supplierDuePayments: [],
  cashAdjustments: [
    {
      id: 'adj-open-1',
      type: 'in',
      channel: 'cash',
      amount: 3000,
      reason: 'সকালের প্রারম্ভিক ক্যাশ ওপেনিং',
      date: new Date().toISOString(),
      performedBy: 'ম্যানেজার',
    }
  ],
  lastCashCount: {
    countedAmount: 3500,
    difference: 0,
    note: 'ক্যাশ রেজিস্টার ব্যালেন্স ঠিক আছে',
    countedAt: new Date().toISOString(),
  },
  courierRemittances: [],
};

export function loadAppState(): AppStateData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DEMO_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DEMO_STATE,
      ...parsed,
      settings: {
        ...DEFAULT_DEMO_STATE.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch (err) {
    console.error('Failed to parse saved state from localStorage:', err);
    return DEFAULT_DEMO_STATE;
  }
}

export function saveAppState(state: AppStateData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function exportDataBackup(state: AppStateData): void {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `ekdor_pos_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importDataBackup(file: File): Promise<AppStateData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('অবৈধ ব্যাকআপ ফাইল ফরম্যাট');
        }
        saveAppState(parsed);
        resolve(parsed);
      } catch (err: any) {
        reject(err.message || 'ফাইল পার্সিং ব্যর্থ হয়েছে');
      }
    };
    reader.onerror = () => reject('ফাইল পড়া সম্ভব হয়নি');
    reader.readAsText(file);
  });
}

export function resetToDemoData(): AppStateData {
  saveAppState(DEFAULT_DEMO_STATE);
  return DEFAULT_DEMO_STATE;
}
