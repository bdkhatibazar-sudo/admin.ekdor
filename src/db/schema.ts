import { boolean, integer, jsonb, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  banglaName: text('bangla_name'),
  category: text('category').notNull(),
  barcode: text('barcode'),
  purchasePrice: numeric('purchase_price').notNull(),
  sellingPrice: numeric('selling_price').notNull(),
  stockQty: integer('stock_qty').notNull(),
  minStockAlert: integer('min_stock_alert').notNull().default(5),
  unit: text('unit').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Customers table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  whatsappPhone: text('whatsapp_phone'),
  address: text('address'),
  totalDue: numeric('total_due').notNull().default('0'),
  totalPurchased: numeric('total_purchased').notNull().default('0'),
  totalPaid: numeric('total_paid').notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  date: text('date').notNull(),
  orderType: text('order_type').notNull(),
  customerId: text('customer_id'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerWhatsapp: text('customer_whatsapp'),
  deliveryAddress: text('delivery_address'),
  isDifferentRecipient: boolean('is_different_recipient').default(false),
  recipientName: text('recipient_name'),
  recipientPhone: text('recipient_phone'),
  recipientAddress: text('recipient_address'),
  items: jsonb('items').notNull(),
  subtotal: numeric('subtotal').notNull(),
  discount: numeric('discount').notNull().default('0'),
  deliveryCharge: numeric('delivery_charge').notNull().default('0'),
  tax: numeric('tax').notNull().default('0'),
  grandTotal: numeric('grand_total').notNull(),
  paidAmount: numeric('paid_amount').notNull(),
  dueAmount: numeric('due_amount').notNull().default('0'),
  codAmount: numeric('cod_amount').notNull().default('0'),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('delivered'),
  consignmentId: text('consignment_id'),
  trackingCode: text('tracking_code'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Purchases table (মহাজন থেকে ক্রয়)
export const purchases = pgTable('purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  supplierName: text('supplier_name').notNull(),
  supplierPhone: text('supplier_phone'),
  date: text('date').notNull(),
  items: jsonb('items').notNull(),
  totalAmount: numeric('total_amount').notNull(),
  paidAmount: numeric('paid_amount').notNull(),
  dueAmount: numeric('due_amount').notNull().default('0'),
  paymentMethod: text('payment_method').notNull().default('cash'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Supplier Due Payments (মহাজনের বাকি পরিশোধ)
export const supplierDuePayments = pgTable('supplier_due_payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  purchaseId: text('purchase_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  supplierName: text('supplier_name').notNull(),
  amount: numeric('amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  date: text('date').notNull(),
  note: text('note'),
});

// Customer Due Payments (কাস্টমার বকেয়া আদায়)
export const duePayments = pgTable('due_payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  orderId: text('order_id'),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  amount: numeric('amount').notNull(),
  date: text('date').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  notes: text('notes'),
});

// Operating Expenses (দোকান খরচ)
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount').notNull(),
  date: text('date').notNull(),
  note: text('note'),
  paymentMethod: text('payment_method').default('cash'),
});

// Cash / Fund Adjustments (ব্যালেন্স সমন্বয় / উত্তোলন / জমা)
export const cashAdjustments = pgTable('cash_adjustments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(), // 'in' | 'out' | 'opening'
  channel: text('channel').notNull().default('cash'),
  amount: numeric('amount').notNull(),
  date: text('date').notNull(),
  reason: text('reason').notNull(),
});

// Settings & Cash Register State
export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  settings: jsonb('settings').notNull(),
  lastCashCount: jsonb('last_cash_count'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
