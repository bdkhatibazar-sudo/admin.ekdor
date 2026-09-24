export type UnitType = 'পিস' | 'কেজি' | 'গ্রাম' | 'লিটার' | 'প্যাকেট' | 'বক্স' | 'ডজন' | 'বস্তা' | 'মিটার';

export interface Product {
  id: string;
  name: string;
  banglaName?: string;
  category: string;
  barcode?: string;
  purchasePrice: number; // ক্রয়মূল্য
  sellingPrice: number;  // বিক্রয়মূল্য
  stockQty: number;      // বর্তমান স্টক
  minStockAlert: number; // কম স্টক সতর্কবার্তা সীমা
  unit: UnitType;
  defaultDeliveryCharge?: number; // পণ্যের আনুমানিক কুরিয়ার ডেলিভারি চার্জ (যেমন ১৩০ টাকা)
  weightKg?: number;             // পণ্যের ওজন (কেজি) - কুরিয়ার ওজন চার্জ হিসাবের জন্য
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;              // ১ম নম্বর: বুকিং / কল নম্বর
  whatsappPhone?: string;     // ২য় নম্বর: হোয়াটসঅ্যাপ নম্বর (না থাকলে ১ম নম্বরই প্রযোজ্য)
  address?: string;
  totalDue: number;           // বর্তমান বাকি
  advanceBalance?: number;    // অতিরিক্ত জমা / অগ্রিম ব্যালেন্স (পরবর্তী কেনাকাটায় সমন্বয় হবে)
  totalPurchased: number;     // মোট কেনাকাটা
  totalPaid: number;          // মোট পরিশোধিত
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;     // বিক্রয়মূল্য
  purchasePrice: number; // ক্রয়মূল্য (লাভ গণনার জন্য)
  total: number;
}

// কাস্টমার সাধারণত দেয়: ১. ক্যাশ, ২. কিউআর, ৩. বিকাশ, ৪. ব্যাংক (এবং অনলাইন COD ও বাকি)
export type PaymentMethod = 'cash' | 'qr' | 'bkash' | 'bank' | 'due' | 'cod';

export type OrderType = 'store' | 'online';

export type OrderStatus = 
  | 'draft'       // ড্রাফট / কোটেশন (হোয়াটসঅ্যাপে বিল পাঠিয়ে কনফার্মেশনের অপেক্ষা)
  | 'confirmed'   // কনফার্মড / নিশ্চিত অর্ডার
  | 'processing'  // প্যাকিং / প্রক্রিয়াকরণ
  | 'shipped'     // কুরিয়ারে বুকিং দেওয়া হয়েছে
  | 'delivered'   // কাস্টমার রিসিভ করেছে / ডেলিভার্ড
  | 'cancelled'   // বাতিল / ক্যানসেলড
  | 'returned';   // কাস্টমার নেয়নি / পার্সেল রিটার্ন

export type CourierSettlementStatus = 'pending' | 'settled';

export interface Order {
  id: string;
  invoiceNumber: string;
  date: string;          // ISO string
  orderType: OrderType;
  customerId?: string;
  customerName: string;
  customerPhone?: string;     // ১ম নম্বর: বুকিং / কল নম্বর
  customerWhatsapp?: string;  // ২য় নম্বর: হোয়াটসঅ্যাপ নম্বর
  customerNote?: string;      // গ্রাহক সংক্রান্ত বিশেষ নোট
  deliveryAddress?: string;

  // অনলাইন কাস্টমার অন্যের জন্য কিনলে প্রাপকের আলাদা তথ্য
  isDifferentRecipient?: boolean;
  recipientName?: string;     // প্রাপকের নাম
  recipientPhone?: string;    // প্রাপকের মোবাইল নম্বর
  recipientAddress?: string;  // প্রাপকের ডেলিভারি ঠিকানা

  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;    // অগ্রিম বা মোট পরিশোধ
  dueAmount: number;     // কাস্টমারের বাকি (দোকান বিক্রির ক্ষেত্রে)
  codAmount: number;     // কুরিয়ার ক্যাশ অন ডেলিভারি কালেকশন টাকা
  appliedAdvance?: number; // গ্রাহকের পূর্বের অতিরিক্ত জমা থেকে সমন্বয়কৃত টাকা
  excessAdvanceAdded?: number; // অতিরিক্ত পরিশোধের ফলে গ্রাহকের জমা অ্যাকাউন্টে যোগ হওয়া টাকা
  paymentMethod: PaymentMethod;
  courierName?: string;
  courierTrackingCode?: string; // কনসাইনমেন্ট আইডি বা ট্র্যাকিং কোড

  // কুরিয়ার সিওডি হিসাব ও কর্তন (Courier COD & Bank Settlement)
  courierDeliveryCost?: number;        // কুরিয়ার প্রকৃত ডেলিভারি চার্জ (যেমন ১৩০ টাকা বা ওজন অনুযায়ী কর্তন)
  courierCodPercentage?: number;       // সিওডি ফি শতকরা হার (ডিফল্ট শতকরা ১ টাকা / 1%)
  courierCodFee?: number;              // ১% সিওডি ফি (টাকা)
  courierNetPayable?: number;          // কুরিয়ার কর্তন শেষে ব্যাংকে নিট প্রাপ্য টাকা
  courierSettlementStatus?: CourierSettlementStatus; // 'pending' (সিওডি বাকি) | 'settled' (ব্যাংকে জমা হয়েছে)
  courierSettledDate?: string;         // ব্যাংকে জমা হওয়ার তারিখ
  courierSettledAmount?: number;       // ব্যাংকে গৃহীত মোট টাকা
  courierSettledChannel?: 'bank' | 'bkash' | 'cash'; // জমার মাধ্যম
  courierSettlementNote?: string;      // জমার মন্তব্য / ব্যাংক স্টেটমেন্ট রেফারেন্স
  remittanceBatchId?: string;          // কুরিয়ার ব্যাচ রিকনসিলিয়েশন আইডি

  note?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

// কুরিয়ারের একসাথে একাধিক অর্ডারের বিল রিকনসিলিয়েশন ব্যাচ (Courier Batch Remittance Sheet)
export interface CourierRemittanceItem {
  orderId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  trackingCode?: string;
  codCollection: number; // কুরিয়ার কালেকশন (টাকা)
  deliveryCharge: number; // কুরিয়ার ডেলিভারি চার্জ (টাকা)
  netOrderAmount: number; // কালেকশন - ডেলিভারি চার্জ
}

export interface CourierRemittanceBatch {
  id: string;
  batchNumber: string;                 // রেমিন্ট্যান্স বা কুরিয়ার বিল নম্বর (যেমন REM-2026-001)
  courierName: string;                 // কুরিয়ারের নাম (স্টিডফাস্ট, রেডেক্স ইত্যাদি)
  date: string;                        // বিল প্রাপ্তির তারিখ
  items: CourierRemittanceItem[];      // বিলে অন্তর্ভুক্ত প্রতিটি অর্ডারের কালেকশন ও চার্জ
  orderCount: number;                  // ডেলিভারিকৃত মোট পার্সেল সংখ্যা (যেমন ১০টি)
  totalCollected: number;              // মোট কালেকশন (যেমন ৯,৫০০ টাকা)
  totalDeliveryCharges: number;        // মোট ডেলিভারি চার্জ (যেমন ৭০০ টাকা)
  otherDeductions: number;             // অন্যান্য কর্তন (যেমন কেনা মালের কুরিয়ার চার্জ বা রিটার্ন কর্তন, যেমন ৩০০ টাকা)
  otherDeductionsNote?: string;        // কর্তনের বিবরণ (যেমন: কেনা মালের কুরিয়ার ভাড়া কর্তন)
  totalDeliveryAndDeductions: number;  // মোট ডেলিভারি ও অন্যান্য কর্তন (যেমন ৭০০ + ৩০০ = ১,০০০ টাকা)
  balanceBeforeCodFee: number;         // ডেলিভারি বাদে উদ্বৃত্ত (যেমন ৯,৫০০ - ১,০০০ = ৮,৫০০ টাকা)
  codFeePercentage: number;            // সিওডি ফি শতকরা হার (১%)
  codFeeAmount: number;                // ১% সিওডি ফি (যেমন ৮৫ টাকা)
  netBankPayable: number;              // ব্যাংকে নিট জমা প্রাপ্য (যেমন ৮,৪১৫ টাকা)
  actualBankReceived: number;          // ব্যাংকে প্রকৃত জমা হওয়া টাকা
  paymentChannel: 'bank' | 'bkash' | 'cash'; // যে একাউন্টে টাকা ঢুকেছে
  bankReference?: string;              // ব্যাংক স্টেটমেন্ট বা ট্রানজেকশন রেফারেন্স
  note?: string;                       // অতিরিক্ত নোট
  createdAt: string;
}

export interface DuePaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  amount: number;
  paymentMethod: 'cash' | 'qr' | 'bkash' | 'bank';
  date: string;
  note?: string;
  isAdvanceDeposit?: boolean; // অতিরিক্ত বা অগ্রিম জমা
}

// মহাজনের বাকি পরিশোধের রেকর্ড
export interface SupplierDuePayment {
  id: string;
  purchaseId: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  paymentMethod: 'cash' | 'qr' | 'bkash' | 'bank';
  date: string;
  note?: string;
}

// ক্যাশ ড্রয়ার ও ব্যালেন্স সমন্বয় (Opening float, Cash in, Cash out)
export interface CashAdjustment {
  id: string;
  type: 'in' | 'out' | 'opening'; // ক্যাশ জমা / উত্তোলন / প্রারম্ভিক ক্যাশ
  channel: 'cash' | 'qr' | 'bkash' | 'bank';
  amount: number;
  date: string;
  reason: string;
  recordedBy?: string;
}

export type ExpenseCategory = 
  | 'দোকান ভাড়া' 
  | 'বিদ্যুৎ বিল' 
  | 'কর্মচারীর বেতন' 
  | 'পরিবহন খরচ' 
  | 'আপ্যায়ন/নাস্তা' 
  | 'পণ্য লোড/আনলোড' 
  | 'দোকান মেরামত' 
  | 'কুরিয়ার রিটার্ন ক্ষতি' 
  | 'অন্যান্য';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod?: 'cash' | 'qr' | 'bkash' | 'bank';
  note?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType;
  unitCost: number;     // প্রতি ইউনিটের ক্রয় দর
  totalCost: number;    // মোট খরচ
}

export interface PurchaseRecord {
  id: string;
  invoiceNumber: string; // মহাজন / সাপ্লায়ারের চালান বা ভাউচার নম্বর
  supplierName: string;  // মহাজন বা কোম্পানির নাম
  supplierPhone?: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;   // মোট কেনা পণ্যের মূল্য
  paidAmount: number;    // পরিশোধিত
  dueAmount: number;     // মহাজনের কাছে বাকি
  paymentMethod?: 'cash' | 'qr' | 'bkash' | 'bank';
  note?: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  ownerName: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  currencySymbol: string;
  invoiceFooter: string;
  printPaperSize: 'A5' | 'POS-80mm';
  autoPrintReceipt: boolean;
  vatTaxPercentage: number;
  defaultDeliveryCharge: number;
  courierProvider: string;
  courierApiKey?: string;      // Steadfast API Key
  courierSecretKey?: string;  // Steadfast Secret Key
  logoUrl?: string;
  website?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  autoSyncSupabase?: boolean; // স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক
}

export interface AppStateData {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  duePayments: DuePaymentRecord[];
  supplierDuePayments: SupplierDuePayment[];
  expenses: Expense[];
  purchases: PurchaseRecord[];
  cashAdjustments: CashAdjustment[];
  courierRemittances?: CourierRemittanceBatch[];
  lastCashCount?: {
    countedAt: string;
    countedAmount: number;
    difference: number;
    note?: string;
  };
  settings: StoreSettings;
  version: string;
  lastBackupAt?: string;
  lastSyncedAt?: string;
}

export type ActiveTab = 
  | 'pos'            // বিক্রয় কাউন্টার
  | 'cash_register'  // ক্যাশবাক্স ও ব্যালেন্স হিসাব
  | 'orders'         // পুরাতন অর্ডার ও এডিট
  | 'stock'          // স্টক ও ইনভেন্টরি
  | 'purchases'      // মাল ক্রয় ও মহাজনের বাকি
  | 'due_khata'      // বাকীর খাতা (কাস্টমারের বাকি ও কুরিয়ার সিওডি)
  | 'customers'      // গ্রাহক (সকল গ্রাহক, প্রোফাইল, হিস্ট্রি, অর্ডার লিস্ট)
  | 'profit_loss'    // লাভ-ক্ষতির রিপোর্ট
  | 'expenses'       // দোকান খরচ (ভাড়া, বেতন)
  | 'backup_sync'    // ব্যাকআপ, সেটিংস ও Supabase
  | 'receipt_view'   // এ৫ রসিদ প্রিন্ট ভিউ
  | 'sale_success';  // বিক্রি সফল তথ্য সারাংশ ও ইনভয়েস শেয়ার/এডিট
