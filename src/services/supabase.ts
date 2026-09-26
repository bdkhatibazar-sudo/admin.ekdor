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
    // 1. Sync Products (with all website and catalog fields)
    if (state.products.length > 0) {
      const productRows = state.products.map((p) => ({
        id: p.id,
        pd_id: p.pdId !== undefined ? String(p.pdId) : null,
        serial_no: p.serialNo !== undefined ? Number(p.serialNo) : null,
        name: p.name,
        bangla_name: p.banglaName || null,
        category: p.category,
        barcode: p.barcode || null,
        purchase_price: p.purchasePrice,
        selling_price: p.sellingPrice,
        regular_price: p.regularPrice !== undefined ? p.regularPrice : null,
        stock_qty: p.stockQty,
        min_stock_alert: p.minStockAlert,
        unit: p.unit,
        image_url: p.imageUrl || null,
        video_url: p.videoUrl || null,
        description: p.description || null,
        search_keywords: p.searchKeywords || null,
        is_active: p.isActive !== false,
        delivery_dhaka: p.deliveryDhaka !== undefined ? p.deliveryDhaka : null,
        delivery_sub_dhaka: p.deliverySubDhaka !== undefined ? p.deliverySubDhaka : null,
        delivery_outside: p.deliveryOutside !== undefined ? p.deliveryOutside : null,
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

    // 6. Sync Bundles (if table exists)
    if (state.bundles && state.bundles.length > 0) {
      const bundleRows = state.bundles.map((b) => ({
        id: b.id,
        bundle_id: b.bundleId !== undefined ? String(b.bundleId) : null,
        name: b.name,
        category: b.category || null,
        description: b.description || null,
        bundle_price: b.bundlePrice,
        items: b.items,
        updated_at: b.updatedAt || new Date().toISOString(),
      }));
      try {
        await client.from('bundles').upsert(bundleRows, { onConflict: 'id' });
      } catch (bundleErr) {
        console.warn('Bundles table sync skip:', bundleErr);
      }
    }

    // 7. Sync Store App State Metadata (for instant exact replica across all devices)
    try {
      await client.from('app_state_backup').upsert({
        id: 'main_store_data',
        payload: {
          products: state.products,
          bundles: state.bundles,
          customers: state.customers,
          orders: state.orders,
          duePayments: state.duePayments,
          supplierDuePayments: state.supplierDuePayments,
          expenses: state.expenses,
          purchases: state.purchases,
          cashAdjustments: state.cashAdjustments,
          courierRemittances: state.courierRemittances,
          settings: state.settings,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (metaErr) {
      // app_state_backup is optional helper
    }

    return {
      success: true,
      message: 'সব ডিভাইসের জন্য পণ্য, কাস্টমার, অর্ডার, খরচ ও ক্রয়ের তথ্য Supabase-এ সফলভাবে সংরক্ষিত হয়েছে!',
    };
  } catch (err: any) {
    console.error('Supabase sync error:', err);
    return {
      success: false,
      message: `সিঙ্ক ব্যর্থ হয়েছে: ${err?.message || 'অজানা ত্রুটি'}`,
    };
  }
};

/**
 * Subscribe to Supabase realtime changes across multiple devices
 */
export const subscribeToSupabaseChanges = (
  settings: StoreSettings,
  onRemoteChange: () => void
): (() => void) => {
  const client = getSupabaseClient(settings);
  if (!client) return () => {};

  try {
    const channel = client
      .channel('ekdor_multidevice_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          onRemoteChange();
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
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
    // First try app_state_backup which stores the full synchronized snapshot
    try {
      const { data: backupRow } = await client
        .from('app_state_backup')
        .select('payload')
        .eq('id', 'main_store_data')
        .single();
      if (backupRow?.payload) {
        const p = backupRow.payload;
        return {
          success: true,
          data: {
            products: p.products || [],
            bundles: p.bundles || [],
            customers: p.customers || [],
            orders: p.orders || [],
            duePayments: p.duePayments || [],
            supplierDuePayments: p.supplierDuePayments || [],
            expenses: p.expenses || [],
            purchases: p.purchases || [],
            cashAdjustments: p.cashAdjustments || [],
            courierRemittances: p.courierRemittances || [],
            settings: { ...settings, ...(p.settings || {}) },
          },
          message: 'Supabase ক্লাউড থেকে সর্বশেষ সমস্ত হিসাব (পণ্য, অর্ডার, বাকি খাতা ও সেটিংস) সফলভাবে লোড হয়েছে!',
        };
      }
    } catch {
      // Fallback to table queries below
    }

    const [
      { data: prods, error: prodErr },
      { data: custs, error: custErr },
      { data: ords, error: ordErr },
      { data: exps, error: expErr },
      { data: purchs, error: purchErr },
      { data: bndls },
    ] = await Promise.all([
      client.from('products').select('*'),
      client.from('customers').select('*'),
      client.from('orders').select('*'),
      client.from('expenses').select('*'),
      client.from('purchases').select('*'),
      client.from('bundles').select('*'),
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
      pdId: p.pd_id || undefined,
      serialNo: p.serial_no ? Number(p.serial_no) : undefined,
      name: p.name,
      banglaName: p.bangla_name || undefined,
      category: p.category,
      barcode: p.barcode || undefined,
      purchasePrice: Number(p.purchase_price) || 0,
      sellingPrice: Number(p.selling_price) || 0,
      regularPrice: p.regular_price ? Number(p.regular_price) : undefined,
      stockQty: Number(p.stock_qty) || 0,
      minStockAlert: Number(p.min_stock_alert) || 5,
      unit: p.unit || 'পিস',
      imageUrl: p.image_url || undefined,
      videoUrl: p.video_url || undefined,
      description: p.description || undefined,
      searchKeywords: p.search_keywords || undefined,
      isActive: p.is_active !== false,
      deliveryDhaka: p.delivery_dhaka ? Number(p.delivery_dhaka) : undefined,
      deliverySubDhaka: p.delivery_sub_dhaka ? Number(p.delivery_sub_dhaka) : undefined,
      deliveryOutside: p.delivery_outside ? Number(p.delivery_outside) : undefined,
      updatedAt: p.updated_at || new Date().toISOString(),
    }));

    const bundles = (bndls || []).map((b: any) => ({
      id: b.id,
      bundleId: b.bundle_id || undefined,
      name: b.name,
      category: b.category || undefined,
      description: b.description || undefined,
      bundlePrice: Number(b.bundle_price) || 0,
      items: b.items || [],
      createdAt: b.created_at || b.updated_at || new Date().toISOString(),
      updatedAt: b.updated_at || new Date().toISOString(),
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
      data: { products, bundles, customers, orders, expenses, purchases },
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
export const SUPABASE_SQL_SCHEMA = `-- 1. App State Master Snapshot (সহজ ও ১০০% নির্ভুল মাল্টি-ডিভাইস সিঙ্ক)
create table if not exists app_state_backup (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 2. Products (পণ্য ও স্টক)
create table if not exists products (
  id text primary key,
  pd_id text,
  serial_no integer,
  name text not null,
  bangla_name text,
  category text,
  barcode text,
  purchase_price numeric default 0,
  selling_price numeric default 0,
  regular_price numeric,
  stock_qty numeric default 0,
  min_stock_alert numeric default 5,
  unit text default 'পিস',
  image_url text,
  video_url text,
  description text,
  search_keywords text,
  is_active boolean default true,
  delivery_dhaka numeric default 70,
  delivery_sub_dhaka numeric default 100,
  delivery_outside numeric default 130,
  updated_at timestamptz default now()
);

-- 3. Bundles (পণ্য বান্ডেল ও প্যাকেজ)
create table if not exists bundles (
  id text primary key,
  bundle_id text,
  name text not null,
  category text,
  description text,
  bundle_price numeric default 0,
  items jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 4. Customers (গ্রাহক ও বাকি খাতা)
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

-- 5. Orders (বিক্রয় ও চালান - প্রাপকের তথ্যসহ)
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

-- 6. Expenses (দোকানের খরচ)
create table if not exists expenses (
  id text primary key,
  title text not null,
  category text not null,
  amount numeric default 0,
  payment_method text default 'cash',
  date timestamptz not null,
  note text
);

-- 7. Purchases (মাল ক্রয় ও মহাজনের চালান)
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
alter table app_state_backup enable row level security;
alter table products enable row level security;
alter table bundles enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table expenses enable row level security;
alter table purchases enable row level security;

create policy "Anon full access app_state_backup" on app_state_backup for all using (true) with check (true);
create policy "Anon full access products" on products for all using (true) with check (true);
create policy "Anon full access bundles" on bundles for all using (true) with check (true);
create policy "Anon full access customers" on customers for all using (true) with check (true);
create policy "Anon full access orders" on orders for all using (true) with check (true);
create policy "Anon full access expenses" on expenses for all using (true) with check (true);
create policy "Anon full access purchases" on purchases for all using (true) with check (true);
`;
