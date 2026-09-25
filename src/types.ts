export type ActiveTab =
  | 'pos'
  | 'cash_register'
  | 'orders'
  | 'purchases'
  | 'stock'
  | 'due_khata'
  | 'customers'
  | 'profit_loss'
  | 'expenses'
  | 'backup_sync'
  | 'receipt_view'
  | 'sale_success';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled';

export type CourierSettlementStatus = 'pending' | 'settled' | 'partial';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  purchasePrice?: number;
  subtotal: number;
  unit?: string;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  date: string;
  orderType?: 'cash' | 'courier' | 'online' | 'due';
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge?: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  appliedAdvance?: number;
  excessAdvanceAdded?: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'card' | 'bank' | 'due' | 'courier_cod' | string;
  status: OrderStatus;
  courierName?: string;
  courierTrackingId?: string;
  courierTrackingCode?: string;
  codAmount?: number;
  courierDeliveryCost?: number;
  courierCodFee?: number;
  courierNetPayable?: number;
  courierSettlementStatus?: CourierSettlementStatus;
  courierSettledDate?: string;
  courierSettledAmount?: number;
  courierSettledChannel?: 'bank' | 'bkash' | 'cash' | string;
  courierSettlementNote?: string;
  remittanceBatchId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  code?: string;
  sku?: string;
  category?: string;
  sellingPrice: number;
  purchasePrice: number;
  stockQty: number;
  minStockAlert: number;
  unit?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BundleItem {
  productId: string;
  quantity: number;
  productName: string;
  sellingPrice?: number;
  purchasePrice?: number;
  bundleSellingPrice?: number;
  originalSellingPrice?: number;
  unit?: string;
}

export interface ProductBundle {
  id: string;
  name: string;
  category?: string;
  description?: string;
  bundlePrice: number;
  defaultDeliveryCharge?: number;
  items: BundleItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsappPhone?: string;
  address?: string;
  notes?: string;
  totalPurchased: number;
  totalPaid: number;
  totalDue: number;
  advanceBalance?: number;
  totalOrders?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DuePaymentRecord {
  id: string;
  customerId: string;
  customerName?: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  note?: string;
  receivedBy?: string;
  isAdvanceDeposit?: boolean;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  note?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseRecord {
  id: string;
  supplierName: string;
  supplierPhone?: string;
  invoiceNumber?: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
}

export interface SupplierDuePayment {
  id: string;
  purchaseId?: string;
  supplierName: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  note?: string;
}

export interface CashAdjustment {
  id: string;
  type: 'in' | 'out' | 'opening' | 'add' | 'remove';
  channel?: 'bank' | 'bkash' | 'cash' | string;
  amount: number;
  reason: string;
  date: string;
  performedBy?: string;
}

export interface CourierRemittanceItem {
  orderId: string;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  trackingCode?: string;
  collectedCod?: number;
  codCollection?: number;
  deliveryCharge: number;
  codFee?: number;
  netOrderAmount: number;
  status?: string;
}

export interface CourierRemittanceBatch {
  id: string;
  batchNumber: string;
  courierName: string;
  date: string;
  orderCount: number;
  totalCodAmount?: number;
  totalCollected?: number;
  totalDeliveryCharges: number;
  totalDeliveryAndDeductions?: number;
  totalCodFees?: number;
  balanceBeforeCodFee?: number;
  codFeePercentage?: number;
  codFeeAmount?: number;
  netRemittanceAmount?: number;
  netBankPayable?: number;
  otherDeductions: number;
  otherDeductionsNote?: string;
  actualBankReceived: number;
  paymentChannel: 'bank' | 'bkash' | 'cash';
  transactionReference?: string;
  bankReference?: string;
  note?: string;
  items: CourierRemittanceItem[];
  createdAt?: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline?: string;
  ownerName?: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  website?: string;
  logoUrl?: string;
  invoiceFooter?: string;
  printPaperSize?: 'a5' | 'pos58' | 'pos80';
  courierApiKey?: string;
  courierSecretKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface AppStateData {
  products: Product[];
  bundles?: ProductBundle[];
  customers: Customer[];
  orders: Order[];
  duePayments: DuePaymentRecord[];
  expenses: Expense[];
  purchases?: PurchaseRecord[];
  supplierDuePayments?: SupplierDuePayment[];
  cashAdjustments?: CashAdjustment[];
  lastCashCount?: {
    countedAmount: number;
    difference: number;
    note?: string;
    countedAt?: string;
  };
  courierRemittances?: CourierRemittanceBatch[];
  settings: StoreSettings;
}
