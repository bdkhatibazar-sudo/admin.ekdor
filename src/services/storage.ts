import { AppStateData, Product, ProductBundle, Customer, Order, DuePaymentRecord, SupplierDuePayment, CashAdjustment, Expense, PurchaseRecord, StoreSettings } from '../types';
import { seedProducts, seedBundles } from '../data/seedCatalog';

const STORAGE_KEY = 'dokan_khata_pos_data_v2';
const LEGACY_STORAGE_KEY = 'dokan_khata_pos_data_v1';

const defaultSettings: StoreSettings = {
  storeName: 'নিরাময় হিজামা কেন্দ্র - খাঁটি বাজার',
  storeTagline: 'ন্যাচারাল হেলথ ও খাঁটি পণ্য (Ekdor.net)',
  ownerName: 'মো: আব্দুল আলিম',
  phone: '০১৭১০-৭২৪৩৪৩',
  alternatePhone: '',
  address: 'মসজিদে মাহমুদ, আশিয়ান সিটি ২ নং গেট, এয়ারপোর্ট, ঢাকা।',
  website: 'ekdor.net',
  logoUrl: 'https://raw.githubusercontent.com/bdkhatibazar-sudo/images/main/ekdor_logo_bt.png',
  currencySymbol: '৳',
  invoiceFooter: 'অর্ডার করা খুবই সহজ 👉 ekdor.net (একদর.নেট)',
  printPaperSize: 'A5',
  autoPrintReceipt: false,
  vatTaxPercentage: 0,
  defaultDeliveryCharge: 120,
  courierProvider: 'steadfast',
  courierApiKey: 'ic4pg2oo3xdnruhyalv7yy4qfgxyoytl',
  courierSecretKey: 'rheawkurrnuoyznnfypbpjfs',
  supabaseUrl: '',
  supabaseAnonKey: '',
  autoSyncSupabase: true,
  githubRepo: 'bdkhatibazar-sudo/ekdor',
  githubBranch: 'main',
  githubProductsPath: 'products.json',
  githubCategoriesPath: 'categories.json',
  githubBundlePath: 'bundle.json',
};

export const initialPurchases: PurchaseRecord[] = [
  {
    id: 'purch-1',
    invoiceNumber: 'INV-MH-102',
    supplierName: 'সিটি অয়েল মিল্স ও সাপ্লাই',
    supplierPhone: '০১৯১১-২২৩৩৪৪',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    items: [
      {
        productId: 'prod-1',
        productName: 'তীর সয়াবিন তেল (৫ লিটার)',
        quantity: 20,
        unit: 'লিটার',
        unitCost: 820,
        totalCost: 16400,
      }
    ],
    totalAmount: 16400,
    paidAmount: 10000,
    dueAmount: 6400,
    paymentMethod: 'cash',
    note: 'প্রথম চালান ডেলিভারি গ্রহণ করা হয়েছে',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'purch-2',
    invoiceNumber: 'INV-RK-450',
    supplierName: 'রহিম রাইস এজেন্সি',
    supplierPhone: '০১৭২২-৩৩৪৪৫৫',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    items: [
      {
        productId: 'prod-2',
        productName: 'মিনিকেট প্রিমিয়াম চাল (২৫ কেজি বস্তা)',
        quantity: 15,
        unit: 'বস্তা',
        unitCost: 1650,
        totalCost: 24750,
      }
    ],
    totalAmount: 24750,
    paidAmount: 24750,
    dueAmount: 0,
    paymentMethod: 'bank',
    note: 'সম্পূর্ণ পরিশোধিত',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const initialProducts: Product[] = seedProducts;
export const initialBundles: ProductBundle[] = seedBundles;

const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'মো: রফিকুল ইসলাম',
    phone: '01712-889900',
    address: 'বাড়ি নং #২৪, রোড #৩, ব্লক-এ, মিরপুর',
    totalDue: 850,
    totalPurchased: 7450,
    totalPaid: 6600,
    notes: 'বিশ্বস্ত নিয়মিত গ্রাহক, প্রতি মাসের ১ তারিখে বাকি দেন।',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    name: 'আব্দুল করিম সওদাগর',
    phone: '01823-112233',
    address: 'বাজার রোড, দোকান নং ০৭',
    totalDue: 1420,
    totalPurchased: 12800,
    totalPaid: 11380,
    notes: 'হোটেল ব্যবসায়ী, সপ্তাহে একবার হিসাব করেন।',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    name: 'তানভীর আহমেদ',
    phone: '01934-445566',
    address: 'সেকশন-৬, মিরপুর',
    totalDue: 0,
    totalPurchased: 3500,
    totalPaid: 3500,
    notes: 'নগদ ক্রেতা',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const initialOrders: Order[] = [
  {
    id: 'ord-1',
    invoiceNumber: 'INV-260921-1001',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    orderType: 'store',
    customerId: 'cust-1',
    customerName: 'মো: রফিকুল ইসলাম',
    customerPhone: '01712-889900',
    items: [
      {
        productId: 'prod-1',
        productName: 'তীর সয়াবিন তেল (৫ লিটার)',
        quantity: 1,
        unit: 'লিটার',
        unitPrice: 890,
        purchasePrice: 820,
        total: 890,
      },
      {
        productId: 'prod-3',
        productName: 'দেশি চিনি (১ কেজি)',
        quantity: 2,
        unit: 'কেজি',
        unitPrice: 140,
        purchasePrice: 125,
        total: 280,
      }
    ],
    subtotal: 1170,
    discount: 20,
    deliveryCharge: 0,
    tax: 0,
    grandTotal: 1150,
    paidAmount: 500,
    dueAmount: 650,
    codAmount: 0,
    paymentMethod: 'cash',
    note: '৬৫০ টাকা বাকি রাখা হয়েছে',
    status: 'delivered',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'ord-2',
    invoiceNumber: 'INV-260921-1002',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    orderType: 'online',
    customerId: 'cust-2',
    customerName: 'আব্দুল করিম সওদাগর',
    customerPhone: '01823-112233',
    deliveryAddress: 'বাড়ি #৫, রোড #৪, উত্তরা সেক্টর ৭, ঢাকা',
    isDifferentRecipient: true,
    recipientName: 'ফারজানা আক্তার (ভাবী)',
    recipientPhone: '০১৭৫০০-১১২২৩৩',
    recipientAddress: 'বাড়ি #৫, রোড #৪, উত্তরা সেক্টর ৭, ঢাকা',
    courierName: 'Steadfast Courier',
    courierTrackingCode: 'STDF-998812',
    items: [
      {
        productId: 'prod-2',
        productName: 'মিনিকেট প্রিমিয়াম চাল (২৫ কেজি বস্তা)',
        quantity: 1,
        unit: 'বস্তা',
        unitPrice: 1820,
        purchasePrice: 1650,
        total: 1820,
      },
      {
        productId: 'prod-4',
        productName: 'দেশি মসুর ডাল (১ কেজি)',
        quantity: 3,
        unit: 'কেজি',
        unitPrice: 155,
        purchasePrice: 130,
        total: 465,
      }
    ],
    subtotal: 2285,
    discount: 35,
    deliveryCharge: 120,
    tax: 0,
    grandTotal: 2370,
    paidAmount: 500,
    dueAmount: 0,
    codAmount: 1870,
    paymentMethod: 'bkash',
    note: '৫০০ টাকা অগ্রিম বিকাশে দেওয়া হয়েছে, বাকি ১৮৭০ টাকা কুরিয়ারে ক্যাশ অন ডেলিভারি',
    status: 'shipped',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'ord-3',
    invoiceNumber: 'INV-260921-1003',
    date: new Date().toISOString(),
    orderType: 'store',
    customerName: 'সাধারণ নগদ ক্রেতা',
    customerPhone: '',
    items: [
      {
        productId: 'prod-7',
        productName: 'ইস্পাহানি মির্জাপুর চা ৪০০ গ্রাম',
        quantity: 1,
        unit: 'প্যাকেট',
        unitPrice: 250,
        purchasePrice: 215,
        total: 250,
      }
    ],
    subtotal: 250,
    discount: 0,
    deliveryCharge: 0,
    tax: 0,
    grandTotal: 250,
    paidAmount: 250,
    dueAmount: 0,
    codAmount: 0,
    paymentMethod: 'qr',
    status: 'delivered',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const initialDuePayments: DuePaymentRecord[] = [
  {
    id: 'pay-1',
    customerId: 'cust-1',
    customerName: 'মো: রফিকুল ইসলাম',
    amount: 500,
    paymentMethod: 'cash',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    note: 'মাসিক কিস্তি জমা',
  }
];

const initialSupplierDuePayments: SupplierDuePayment[] = [
  {
    id: 'sup-pay-1',
    purchaseId: 'purch-1',
    invoiceNumber: 'INV-MH-102',
    supplierName: 'সিটি অয়েল মিল্স ও সাপ্লাই',
    amount: 2000,
    paymentMethod: 'bank',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    note: 'ব্যাংক চেক মারফত আংশিক বাকি পরিশোধ',
  }
];

const initialCashAdjustments: CashAdjustment[] = [
  {
    id: 'adj-1',
    type: 'opening',
    channel: 'cash',
    amount: 5000,
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    reason: 'দোকান ক্যাশবাক্স খোলার প্রারম্ভিক ক্যাশ (Opening Float)',
  }
];

const initialExpenses: Expense[] = [
  {
    id: 'exp-1',
    title: 'দোকানের বিদ্যুৎ বিল (চলতি মাস)',
    category: 'বিদ্যুৎ বিল',
    amount: 1450,
    paymentMethod: 'bkash',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    note: 'পল্লী বিদ্যুৎ অফিস কাউন্টারে জমা',
  },
  {
    id: 'exp-2',
    title: 'দোকান কর্মীদের দুপুরের নাস্তা ও চা',
    category: 'আপ্যায়ন/নাস্তা',
    amount: 180,
    paymentMethod: 'cash',
    date: new Date().toISOString(),
    note: 'দৈনিক নাস্তা',
  },
];

export const loadAppState = (): AppStateData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      const defaultState: AppStateData = {
        products: initialProducts,
        bundles: initialBundles,
        customers: initialCustomers,
        orders: initialOrders,
        duePayments: initialDuePayments,
        supplierDuePayments: initialSupplierDuePayments,
        expenses: initialExpenses,
        purchases: initialPurchases,
        cashAdjustments: initialCashAdjustments,
        settings: defaultSettings,
        version: '2.0.0',
        lastBackupAt: new Date().toISOString(),
      };
      saveAppState(defaultState);
      return defaultState;
    }
    const parsed = JSON.parse(raw);
    const loadedSettings: StoreSettings = { 
      ...defaultSettings, 
      ...(parsed.settings || {}),
      courierApiKey: (parsed.settings?.courierApiKey || '').trim() || defaultSettings.courierApiKey,
      courierSecretKey: (parsed.settings?.courierSecretKey || '').trim() || defaultSettings.courierSecretKey,
    };

    // Ensure catalog products exist in products list
    let existingProducts: Product[] = parsed.products || initialProducts;
    // Filter out obsolete dummy grocery products
    existingProducts = existingProducts.filter(p => !p.id.startsWith('prod-'));
    const existingIds = new Set(existingProducts.map(p => p.id));
    const missingInitialProducts = initialProducts.filter(p => !existingIds.has(p.id));
    if (missingInitialProducts.length > 0) {
      existingProducts = [...existingProducts, ...missingInitialProducts];
    }
    // Enrich with seed details (images, descriptions, delivery rates)
    existingProducts = existingProducts.map(p => {
      const seed = initialProducts.find(s => s.id === p.id);
      if (seed) {
        return {
          ...seed,
          ...p,
          pdId: p.pdId !== undefined ? p.pdId : seed.pdId,
          regularPrice: p.regularPrice !== undefined ? p.regularPrice : seed.regularPrice,
          imageUrl: p.imageUrl || seed.imageUrl,
          videoUrl: p.videoUrl || seed.videoUrl,
          description: p.description || seed.description,
          deliveryDhaka: p.deliveryDhaka || seed.deliveryDhaka,
          deliverySubDhaka: p.deliverySubDhaka || seed.deliverySubDhaka,
          deliveryOutside: p.deliveryOutside || seed.deliveryOutside,
          searchKeywords: p.searchKeywords || seed.searchKeywords,
        };
      }
      return p;
    });

    const loadedBundles: ProductBundle[] = 
      parsed.bundles && parsed.bundles.length > 0 && parsed.bundles.some((b: any) => b.bundleId)
        ? parsed.bundles 
        : initialBundles;

    const loadedOrders: Order[] = (parsed.orders || initialOrders).map((o: any) => ({
      ...o,
      orderType: o.orderType || 'store',
      paymentMethod: o.paymentMethod === 'card' ? 'bank' : (o.paymentMethod || 'cash'),
      deliveryCharge: o.deliveryCharge || 0,
      codAmount: o.codAmount || 0,
      status: o.status === 'completed' ? 'delivered' : o.status || 'delivered',
      isDifferentRecipient: o.isDifferentRecipient || false,
      recipientName: o.recipientName || '',
      recipientPhone: o.recipientPhone || '',
      recipientAddress: o.recipientAddress || '',
    }));

    return {
      products: existingProducts,
      bundles: loadedBundles,
      customers: parsed.customers || initialCustomers,
      orders: loadedOrders,
      duePayments: (parsed.duePayments || initialDuePayments).map((p: any) => ({
        ...p,
        paymentMethod: p.paymentMethod || 'cash',
      })),
      supplierDuePayments: parsed.supplierDuePayments || initialSupplierDuePayments,
      expenses: (parsed.expenses || initialExpenses).map((e: any) => ({
        ...e,
        paymentMethod: e.paymentMethod || 'cash',
      })),
      purchases: (parsed.purchases || initialPurchases).map((p: any) => ({
        ...p,
        paymentMethod: p.paymentMethod || 'cash',
      })),
      cashAdjustments: parsed.cashAdjustments || initialCashAdjustments,
      courierRemittances: parsed.courierRemittances || [],
      lastCashCount: parsed.lastCashCount,
      settings: loadedSettings,
      version: '2.0.0',
      lastBackupAt: parsed.lastBackupAt,
      lastSyncedAt: parsed.lastSyncedAt,
    };
  } catch (err) {
    console.error('Error loading app state from localStorage:', err);
    return {
      products: initialProducts,
      bundles: initialBundles,
      customers: initialCustomers,
      orders: initialOrders,
      duePayments: initialDuePayments,
      supplierDuePayments: initialSupplierDuePayments,
      expenses: initialExpenses,
      purchases: initialPurchases,
      cashAdjustments: initialCashAdjustments,
      courierRemittances: [],
      settings: defaultSettings,
      version: '2.0.0',
    };
  }
};

export const saveAppState = (data: AppStateData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Broadcast change across tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('ekdor_pos_sync_channel');
        channel.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
        channel.close();
      } catch {}
    }
  } catch (err) {
    console.error('Error saving app state to localStorage:', err);
  }
};

export const exportDataBackup = (data: AppStateData): void => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `ekdor-pos-backup-${timestamp}.json`;
  const exportPayload = {
    ...data,
    exportedAt: new Date().toISOString(),
    appName: 'নিরাময় হিজামা কেন্দ্র - খাঁটি বাজার (Ekdor POS)',
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importDataBackup = (file: File): Promise<AppStateData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.products || !parsed.orders) {
          throw new Error('অকার্যকর ব্যাকআপ ফাইল! পণ্যের তথ্য বা অর্ডারের তালিকা পাওয়া যায়নি।');
        }
        const state: AppStateData = {
          products: parsed.products || [],
          bundles: Array.isArray(parsed.bundles) && parsed.bundles.length > 0 ? parsed.bundles : (parsed.bundles || initialBundles),
          customers: parsed.customers || [],
          orders: parsed.orders || [],
          duePayments: parsed.duePayments || [],
          supplierDuePayments: parsed.supplierDuePayments || [],
          expenses: parsed.expenses || [],
          purchases: parsed.purchases || [],
          cashAdjustments: parsed.cashAdjustments || [],
          courierRemittances: parsed.courierRemittances || [],
          lastCashCount: parsed.lastCashCount,
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
          version: '2.0.0',
          lastBackupAt: new Date().toISOString(),
        };
        saveAppState(state);
        resolve(state);
      } catch (err: any) {
        reject(err.message || 'ফাইল রিড করতে সমস্যা হয়েছে');
      }
    };
    reader.onerror = () => reject('ফাইল লোড করতে ব্যর্থ হয়েছে');
    reader.readAsText(file);
  });
};

export const resetToDemoData = (): AppStateData => {
  const demoState: AppStateData = {
    products: initialProducts,
    bundles: initialBundles,
    customers: initialCustomers,
    orders: initialOrders,
    duePayments: initialDuePayments,
    supplierDuePayments: initialSupplierDuePayments,
    expenses: initialExpenses,
    purchases: initialPurchases,
    cashAdjustments: initialCashAdjustments,
    courierRemittances: [],
    settings: defaultSettings,
    version: '2.0.0',
    lastBackupAt: new Date().toISOString(),
  };
  saveAppState(demoState);
  return demoState;
};
