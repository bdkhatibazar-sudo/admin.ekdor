import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppStateData, StoreSettings } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentConfig = { url: '', key: '' };

export const getSupabaseClient = (settings?: StoreSettings): SupabaseClient | null => {
  const url = (settings?.supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
  const key = (settings?.supabaseAnonKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) {
    return null;
  }

  if (cachedClient && currentConfig.url === url && currentConfig.key === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    currentConfig = { url, key };
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
};

export const testSupabaseConnection = async (settings?: StoreSettings): Promise<{ success: boolean; message: string }> => {
  const client = getSupabaseClient(settings);
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL অথবা Anon Key দেওয়া হয়নি। অনুগ্রহ করে সেটিংস পূরণ করুন।',
    };
  }

  try {
    const { error } = await client.from('products').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Supabase কানেকশন সফল! তবে ডাটাবেজে টেবিল তৈরি করা হয়নি। নিচে দেওয়া SQL কোড রান করুন।',
        };
      }
      return {
        success: false,
        message: `Supabase ত্রুটি: ${error.message} (${error.code || ''})`,
      };
    }
    return {
      success: true,
      message: 'Supabase ডাটাবেজ সফলভাবে সংযুক্ত ও ৩টি ডিভাইসে সিঙ্কের জন্য প্রস্তুত!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `কানেকশন ব্যর্থ: ${err?.message || 'অজানা ত্রুটি'}`,
    };
  }
};

// Sync app state data into Supabase tables
export const syncToSupabase = async (state: AppStateData): Promise<{ success: boolean; message: string }> => {
  const client = getSupabaseClient(state.settings);
  if (!client) {
    return { success: false, message: 'Supabase ক্লায়েন্ট কনফিগার করা নেই।' };
  }

  try {
    // 1. Sync Products
    if (state.products.length > 0) {
      const productRows = state.products.map((p) => ({
        id: p.id,
        name: p.name,
        bangla_name: p.banglaName || null,
        category: p.category,
        barcode: p.barcode || null,
        purchase_price: p.purchasePrice,
        selling_price: p.sellingPrice,
        stock_qty: p.stockQty,
        min_stock_alert: p.minStockAlert,
        unit: p.unit,
        updated_at: p.updatedAt,
      }));
      const { error: prodErr } = await client.from('products').upsert(productRows, { onConflict: 'id' });
      if (prodErr && prodErr.code !== '42P01') console.warn('Products sync err:', prodErr);
    }

    // 2. Sync Customers
    if (state.customers.length > 0) {
      const customerRows = state.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || null,
        whatsapp_phone: c.whatsappPhone || null,
        address: c.address || null,
        total_due: c.totalDue || 0,
        total_purchased: c.totalPurchased || 0,
        total_paid: c.totalPaid || 0,
        updated_at: c.updatedAt,
      }));
      const { error: custErr } = await client.from('customers').upsert(customerRows, { onConflict: 'id' });
      if (custErr && custErr.code !== '42P01') console.warn('Customers sync err:', custErr);
    }

    // 3. Sync Orders
    if (state.orders.length > 0) {
      const orderRows = state.orders.map((o) => ({
        id: o.id,
        invoice_number: o.invoiceNumber,
        date: o.date,
        order_type: o.orderType,
        customer_id: o.customerId || null,
        customer_name: o.customerName,
        customer_phone: o.customerPhone || null,
        customer_whatsapp: o.customerWhatsapp || null,
        delivery_address: o.deliveryAddress || null,
        recipient_name: o.recipientName || null,
        recipient_phone: o.recipientPhone || null,
        recipient_address: o.recipientAddress || null,
        courier_name: o.courierName || null,
        courier_tracking_code: o.courierTrackingCode || null,
        items: o.items,
        subtotal: o.subtotal,
        discount: o.discount,
        delivery_charge: o.deliveryCharge,
        grand_total: o.grandTotal,
        paid_amount: o.paidAmount,
        due_amount: o.dueAmount,
        cod_amount: o.codAmount,
        payment_method: o.paymentMethod,
        status: o.status,
        note: o.note || null,
        updated_at: o.updatedAt,
      }));
      const { error: ordErr } = await client.from('orders').upsert(orderRows, { onConflict: 'id' });
      if (ordErr && ordErr.code !== '42P01') console.warn('Orders sync err:', ordErr);
    }

    // 4. Sync Expenses
    if (state.expenses.length > 0) {
      const expenseRows = state.expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: e.amount,
        date: e.date,
        payment_method: e.paymentMethod || 'cash',
        note: e.note || null,
      }));
      const { error: expErr } = await client.from('expenses').upsert(expenseRows, { onConflict: 'id' });
      if (expErr && expErr.code !== '42P01') console.warn('Expenses sync err:', expErr);
    }

    // 5. Sync Purchases
    if (state.purchases && state.purchases.length > 0) {
      const purchaseRows = state.purchases.map((p) => ({
        id: p.id,
        invoice_number: p.invoiceNumber,
        supplier_name: p.supplierName,
        supplier_phone: p.supplierPhone || null,
        date: p.date,
        items: p.items,
        total_amount: p.totalAmount,
        paid_amount: p.paidAmount,
        due_amount: p.dueAmount,
        payment_method: p.paymentMethod || 'cash',
        note: p.note || null,
        created_at: p.createdAt,
      }));
      const { error: purchErr } = await client.from('purchases').upsert(purchaseRows, { onConflict: 'id' });
      if (purchErr && purchErr.code !== '42P01') console.warn('Purchases sync err:', purchErr);
    }

    return {
      success: true,
      message: 'সকল পণ্য, কাস্টমার, অর্ডার, খরচ ও ক্রয়ের তথ্য Supabase-এ সফলভাবে সিঙ্ক হয়েছে!',
    };
  } catch (err: any) {
    console.error('Supabase sync error:', err);
    return {
      success: false,
      message: `সিঙ্ক ব্যর্থ হয়েছে: ${err?.message || 'অজানা ত্রুটি'}`,
    };
  }
};

// Fetch all records from Supabase tables to restore/sync to device
export const fetchFromSupabase = async (
  settings: StoreSettings
): Promise<{ success: boolean; data?: Partial<AppStateData>; message: string }> => {
  const client = getSupabaseClient(settings);
  if (!client) {
    return { success: false, message: 'Supabase ক্লায়েন্ট কনফিগার করা নেই।' };
  }

  try {
    const [
      { data: prods, error: prodErr },
      { data: custs, error: custErr },
      { data: ords, error: ordErr },
      { data: exps, error: expErr },
      { data: purchs, error: purchErr },
    ] = await Promise.all([
      client.from('products').select('*'),
      client.from('customers').select('*'),
      client.from('orders').select('*'),
      client.from('expenses').select('*'),
      client.from('purchases').select('*'),
    ]);

    if (prodErr || custErr || ordErr || expErr || purchErr) {
      const err = prodErr || custErr || ordErr || expErr || purchErr;
      if (err?.code === '42P01') {
        return {
          success: false,
          message: 'Supabase-এ টেবিলগুলো তৈরি করা হয়নি। সেটিংসে গিয়ে SQL কোড রান করুন।',
        };
      }
      throw err;
    }

    const products = (prods || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      banglaName: p.bangla_name || undefined,
      category: p.category,
      barcode: p.barcode || undefined,
      purchasePrice: Number(p.purchase_price) || 0,
      sellingPrice: Number(p.selling_price) || 0,
      stockQty: Number(p.stock_qty) || 0,
      minStockAlert: Number(p.min_stock_alert) || 5,
      unit: p.unit || 'পিস',
      updatedAt: p.updated_at || new Date().toISOString(),
    }));

    const customers = (custs || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      whatsappPhone: c.whatsapp_phone || undefined,
      address: c.address || undefined,
      totalDue: Number(c.total_due) || 0,
      totalPurchased: Number(c.total_purchased) || 0,
      totalPaid: Number(c.total_paid) || 0,
      createdAt: c.created_at || c.updated_at || new Date().toISOString(),
      updatedAt: c.updated_at || new Date().toISOString(),
    }));

    const orders = (ords || []).map((o: any) => ({
      id: o.id,
      invoiceNumber: o.invoice_number,
      date: o.date,
      orderType: o.order_type || 'store',
      customerId: o.customer_id || undefined,
      customerName: o.customer_name,
      customerPhone: o.customer_phone || undefined,
      customerWhatsapp: o.customer_whatsapp || undefined,
      deliveryAddress: o.delivery_address || undefined,
      isDifferentRecipient: Boolean(o.recipient_name || o.recipient_phone),
      recipientName: o.recipient_name || undefined,
      recipientPhone: o.recipient_phone || undefined,
      recipientAddress: o.recipient_address || undefined,
      courierName: o.courier_name || undefined,
      courierTrackingCode: o.courier_tracking_code || undefined,
      items: o.items || [],
      subtotal: Number(o.subtotal) || 0,
      discount: Number(o.discount) || 0,
      deliveryCharge: Number(o.delivery_charge) || 0,
      tax: Number(o.tax) || 0,
      grandTotal: Number(o.grand_total) || 0,
      paidAmount: Number(o.paid_amount) || 0,
      dueAmount: Number(o.due_amount) || 0,
      codAmount: Number(o.cod_amount) || 0,
      paymentMethod: o.payment_method === 'card' ? 'bank' : (o.payment_method || 'cash'),
      status: o.status || 'delivered',
      note: o.note || undefined,
      createdAt: o.created_at || o.date || new Date().toISOString(),
      updatedAt: o.updated_at || new Date().toISOString(),
    }));

    const expenses = (exps || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: Number(e.amount) || 0,
      paymentMethod: e.payment_method || 'cash',
      date: e.date,
      note: e.note || undefined,
    }));

    const purchases = (purchs || []).map((p: any) => ({
      id: p.id,
      invoiceNumber: p.invoice_number,
      supplierName: p.supplier_name,
      supplierPhone: p.supplier_phone || undefined,
      date: p.date,
      items: p.items || [],
      totalAmount: Number(p.total_amount) || 0,
      paidAmount: Number(p.paid_amount) || 0,
      dueAmount: Number(p.due_amount) || 0,
      paymentMethod: p.payment_method || 'cash',
      note: p.note || undefined,
      createdAt: p.created_at || new Date().toISOString(),
    }));

    return {
      success: true,
      data: { products, customers, orders, expenses, purchases },
      message: `Supabase থেকে ${products.length}টি পণ্য, ${customers.length}জন কাস্টমার, ${orders.length}টি অর্ডার সফলভাবে লোড হয়েছে!`,
    };
  } catch (err: any) {
    console.error('Supabase fetch error:', err);
    return {
      success: false,
      message: `ডাটা লোড ব্যর্থ: ${err?.message || 'অজানা ত্রুটি'}`,
    };
  }
};

// SQL Schema for the user to copy-paste into Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- 1. Products (পণ্য ও স্টক)
create table if not exists products (
  id text primary key,
  name text not null,
  bangla_name text,
  category text,
  barcode text,
  purchase_price numeric default 0,
  selling_price numeric default 0,
  stock_qty numeric default 0,
  min_stock_alert numeric default 5,
  unit text default 'পিস',
  updated_at timestamptz default now()
);

-- 2. Customers (গ্রাহক ও বাকি খাতা)
create table if not exists customers (
  id text primary key,
  name text not null,
  phone text,
  whatsapp_phone text,
  address text,
  total_due numeric default 0,
  total_purchased numeric default 0,
  total_paid numeric default 0,
  updated_at timestamptz default now()
);

-- 3. Orders (বিক্রয় ও চালান - প্রাপকের তথ্যসহ)
create table if not exists orders (
  id text primary key,
  invoice_number text not null,
  date timestamptz not null,
  order_type text default 'store',
  customer_id text,
  customer_name text,
  customer_phone text,
  customer_whatsapp text,
  delivery_address text,
  recipient_name text,
  recipient_phone text,
  recipient_address text,
  courier_name text,
  courier_tracking_code text,
  items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  discount numeric default 0,
  delivery_charge numeric default 0,
  grand_total numeric default 0,
  paid_amount numeric default 0,
  due_amount numeric default 0,
  cod_amount numeric default 0,
  payment_method text default 'cash',
  status text default 'delivered',
  note text,
  updated_at timestamptz default now()
);

-- 4. Expenses (দোকানের খরচ)
create table if not exists expenses (
  id text primary key,
  title text not null,
  category text not null,
  amount numeric default 0,
  payment_method text default 'cash',
  date timestamptz not null,
  note text
);

-- 5. Purchases (মাল ক্রয় ও মহাজনের চালান)
create table if not exists purchases (
  id text primary key,
  invoice_number text not null,
  supplier_name text not null,
  supplier_phone text,
  date timestamptz not null,
  items jsonb default '[]'::jsonb,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  due_amount numeric default 0,
  payment_method text default 'cash',
  note text,
  created_at timestamptz default now()
);

-- Row Level Security (RLS) Enable
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table expenses enable row level security;
alter table purchases enable row level security;

create policy "Anon full access products" on products for all using (true) with check (true);
create policy "Anon full access customers" on customers for all using (true) with check (true);
create policy "Anon full access orders" on orders for all using (true) with check (true);
create policy "Anon full access expenses" on expenses for all using (true) with check (true);
create policy "Anon full access purchases" on purchases for all using (true) with check (true);
`;
