// src/db/repository.ts
import { db } from './index.ts';
import { 
  products, 
  customers, 
  orders, 
  purchases, 
  supplierDuePayments, 
  duePayments, 
  expenses, 
  cashAdjustments, 
  storeSettings 
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import type { AppStateData, Product, Customer, Order, PurchaseRecord, SupplierDuePayment, DuePaymentRecord, Expense, CashAdjustment, StoreSettings } from '../types.ts';

export async function getStoreData(userId: string): Promise<Partial<AppStateData>> {
  try {
    const [
      dbProducts,
      dbCustomers,
      dbOrders,
      dbPurchases,
      dbSupplierDuePayments,
      dbDuePayments,
      dbExpenses,
      dbCashAdjustments,
      dbSettingsList,
    ] = await Promise.all([
      db.select().from(products).where(eq(products.userId, userId)),
      db.select().from(customers).where(eq(customers.userId, userId)),
      db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)),
      db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.createdAt)),
      db.select().from(supplierDuePayments).where(eq(supplierDuePayments.userId, userId)),
      db.select().from(duePayments).where(eq(duePayments.userId, userId)),
      db.select().from(expenses).where(eq(expenses.userId, userId)),
      db.select().from(cashAdjustments).where(eq(cashAdjustments.userId, userId)),
      db.select().from(storeSettings).where(eq(storeSettings.userId, userId)).limit(1),
    ]);

    const formattedProducts: Product[] = dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      banglaName: p.banglaName || undefined,
      category: p.category,
      barcode: p.barcode || undefined,
      purchasePrice: Number(p.purchasePrice),
      sellingPrice: Number(p.sellingPrice),
      stockQty: p.stockQty,
      minStockAlert: p.minStockAlert,
      unit: p.unit as any,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    }));

    const formattedCustomers: Customer[] = dbCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      whatsappPhone: c.whatsappPhone || undefined,
      address: c.address || undefined,
      totalDue: Number(c.totalDue),
      totalPurchased: Number(c.totalPurchased),
      totalPaid: Number(c.totalPaid),
      notes: c.notes || undefined,
      createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? c.updatedAt.toISOString() : new Date().toISOString(),
    }));

    const formattedOrders: Order[] = dbOrders.map((o) => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      date: o.date,
      orderType: o.orderType as any,
      customerId: o.customerId || undefined,
      customerName: o.customerName,
      customerPhone: o.customerPhone || undefined,
      customerWhatsapp: o.customerWhatsapp || undefined,
      deliveryAddress: o.deliveryAddress || undefined,
      isDifferentRecipient: o.isDifferentRecipient || false,
      recipientName: o.recipientName || undefined,
      recipientPhone: o.recipientPhone || undefined,
      recipientAddress: o.recipientAddress || undefined,
      items: o.items as any,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      deliveryCharge: Number(o.deliveryCharge),
      tax: Number(o.tax),
      grandTotal: Number(o.grandTotal),
      paidAmount: Number(o.paidAmount),
      dueAmount: Number(o.dueAmount),
      codAmount: Number(o.codAmount),
      paymentMethod: o.paymentMethod as any,
      status: o.status as any,
      courierName: o.consignmentId || undefined,
      courierTrackingCode: o.trackingCode || undefined,
      note: o.notes || undefined,
      createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
    }));

    const formattedPurchases: PurchaseRecord[] = dbPurchases.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      supplierName: p.supplierName,
      supplierPhone: p.supplierPhone || undefined,
      date: p.date,
      items: p.items as any,
      totalAmount: Number(p.totalAmount),
      paidAmount: Number(p.paidAmount),
      dueAmount: Number(p.dueAmount),
      paymentMethod: p.paymentMethod as any,
      note: p.note || undefined,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
    }));

    const formattedSupplierDuePayments: SupplierDuePayment[] = dbSupplierDuePayments.map((sd) => ({
      id: sd.id,
      purchaseId: sd.purchaseId,
      invoiceNumber: sd.invoiceNumber,
      supplierName: sd.supplierName,
      amount: Number(sd.amount),
      paymentMethod: sd.paymentMethod as any,
      date: sd.date,
      note: sd.note || undefined,
    }));

    const formattedDuePayments: DuePaymentRecord[] = dbDuePayments.map((dp) => ({
      id: dp.id,
      orderId: dp.orderId || undefined,
      customerId: dp.customerId,
      customerName: dp.customerName,
      amount: Number(dp.amount),
      date: dp.date,
      paymentMethod: dp.paymentMethod as any,
      note: dp.notes || undefined,
    }));

    const formattedExpenses: Expense[] = dbExpenses.map((e) => ({
      id: e.id,
      title: e.category,
      category: e.category as any,
      amount: Number(e.amount),
      date: e.date,
      note: e.note || undefined,
      paymentMethod: (e.paymentMethod as any) || 'cash',
    }));

    const formattedAdjustments: CashAdjustment[] = dbCashAdjustments.map((a) => ({
      id: a.id,
      type: a.type as any,
      channel: (a.channel as any) || 'cash',
      amount: Number(a.amount),
      date: a.date,
      reason: a.reason,
    }));

    const savedSettings = dbSettingsList[0]?.settings as any | undefined;
    const lastCashCount = dbSettingsList[0]?.lastCashCount as any | undefined;
    const loadedBundles = savedSettings?.bundles || [];

    return {
      products: formattedProducts,
      bundles: loadedBundles,
      customers: formattedCustomers,
      orders: formattedOrders,
      purchases: formattedPurchases,
      supplierDuePayments: formattedSupplierDuePayments,
      duePayments: formattedDuePayments,
      expenses: formattedExpenses,
      cashAdjustments: formattedAdjustments,
      settings: savedSettings,
      lastCashCount,
    };
  } catch (error) {
    console.error('Failed to get store data from Cloud SQL:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function syncStoreData(userId: string, data: AppStateData) {
  try {
    // 1. Sync Settings & Last Cash Count & Bundles
    if (data.settings) {
      const settingsPayload = {
        ...data.settings,
        bundles: data.bundles || [],
      };
      await db.insert(storeSettings)
        .values({
          userId,
          settings: settingsPayload,
          lastCashCount: data.lastCashCount || null,
        })
        .onConflictDoUpdate({
          target: storeSettings.userId,
          set: {
            settings: settingsPayload,
            lastCashCount: data.lastCashCount || null,
            updatedAt: new Date(),
          },
        });
    }

    // 2. Sync Products
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        await db.insert(products)
          .values({
            id: p.id,
            userId,
            name: p.name,
            banglaName: p.banglaName || null,
            category: p.category,
            barcode: p.barcode || null,
            purchasePrice: p.purchasePrice.toString(),
            sellingPrice: p.sellingPrice.toString(),
            stockQty: p.stockQty,
            minStockAlert: p.minStockAlert,
            unit: p.unit,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: products.id,
            set: {
              name: p.name,
              banglaName: p.banglaName || null,
              category: p.category,
              barcode: p.barcode || null,
              purchasePrice: p.purchasePrice.toString(),
              sellingPrice: p.sellingPrice.toString(),
              stockQty: p.stockQty,
              minStockAlert: p.minStockAlert,
              unit: p.unit,
              updatedAt: new Date(),
            },
          });
      }
    }

    // 3. Sync Customers
    if (data.customers && data.customers.length > 0) {
      for (const c of data.customers) {
        await db.insert(customers)
          .values({
            id: c.id,
            userId,
            name: c.name,
            phone: c.phone,
            whatsappPhone: c.whatsappPhone || null,
            address: c.address || null,
            totalDue: c.totalDue.toString(),
            totalPurchased: c.totalPurchased.toString(),
            totalPaid: c.totalPaid.toString(),
            notes: c.notes || null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: customers.id,
            set: {
              name: c.name,
              phone: c.phone,
              whatsappPhone: c.whatsappPhone || null,
              address: c.address || null,
              totalDue: c.totalDue.toString(),
              totalPurchased: c.totalPurchased.toString(),
              totalPaid: c.totalPaid.toString(),
              notes: c.notes || null,
              updatedAt: new Date(),
            },
          });
      }
    }

    // 4. Sync Orders
    if (data.orders && data.orders.length > 0) {
      for (const o of data.orders) {
        await db.insert(orders)
          .values({
            id: o.id,
            userId,
            invoiceNumber: o.invoiceNumber,
            date: o.date,
            orderType: o.orderType,
            customerId: o.customerId || null,
            customerName: o.customerName,
            customerPhone: o.customerPhone || null,
            customerWhatsapp: o.customerWhatsapp || null,
            deliveryAddress: o.deliveryAddress || null,
            isDifferentRecipient: o.isDifferentRecipient || false,
            recipientName: o.recipientName || null,
            recipientPhone: o.recipientPhone || null,
            recipientAddress: o.recipientAddress || null,
            items: o.items,
            subtotal: o.subtotal.toString(),
            discount: o.discount.toString(),
            deliveryCharge: o.deliveryCharge.toString(),
            tax: o.tax.toString(),
            grandTotal: o.grandTotal.toString(),
            paidAmount: o.paidAmount.toString(),
            dueAmount: o.dueAmount.toString(),
            codAmount: o.codAmount.toString(),
            paymentMethod: o.paymentMethod,
            status: o.status,
            consignmentId: o.courierName || null,
            trackingCode: o.courierTrackingCode || null,
            notes: o.note || null,
          })
          .onConflictDoUpdate({
            target: orders.id,
            set: {
              status: o.status,
              paidAmount: o.paidAmount.toString(),
              dueAmount: o.dueAmount.toString(),
              codAmount: o.codAmount.toString(),
              consignmentId: o.courierName || null,
              trackingCode: o.courierTrackingCode || null,
              notes: o.note || null,
            },
          });
      }
    }

    // 5. Sync Purchases
    if (data.purchases && data.purchases.length > 0) {
      for (const p of data.purchases) {
        await db.insert(purchases)
          .values({
            id: p.id,
            userId,
            invoiceNumber: p.invoiceNumber,
            supplierName: p.supplierName,
            supplierPhone: p.supplierPhone || null,
            date: p.date,
            items: p.items,
            totalAmount: p.totalAmount.toString(),
            paidAmount: p.paidAmount.toString(),
            dueAmount: p.dueAmount.toString(),
            paymentMethod: p.paymentMethod || 'cash',
            note: p.note || null,
          })
          .onConflictDoUpdate({
            target: purchases.id,
            set: {
              paidAmount: p.paidAmount.toString(),
              dueAmount: p.dueAmount.toString(),
              note: p.note || null,
            },
          });
      }
    }

    // 6. Sync Supplier Due Payments
    if (data.supplierDuePayments && data.supplierDuePayments.length > 0) {
      for (const s of data.supplierDuePayments) {
        await db.insert(supplierDuePayments)
          .values({
            id: s.id,
            userId,
            purchaseId: s.purchaseId,
            invoiceNumber: s.invoiceNumber,
            supplierName: s.supplierName,
            amount: s.amount.toString(),
            paymentMethod: s.paymentMethod,
            date: s.date,
            note: s.note || null,
          })
          .onConflictDoNothing();
      }
    }

    // 7. Sync Customer Due Payments
    if (data.duePayments && data.duePayments.length > 0) {
      for (const d of data.duePayments) {
        await db.insert(duePayments)
          .values({
            id: d.id,
            userId,
            orderId: d.orderId || null,
            customerId: d.customerId,
            customerName: d.customerName,
            amount: d.amount.toString(),
            date: d.date,
            paymentMethod: d.paymentMethod,
            notes: d.note || null,
          })
          .onConflictDoNothing();
      }
    }

    // 8. Sync Expenses
    if (data.expenses && data.expenses.length > 0) {
      for (const e of data.expenses) {
        await db.insert(expenses)
          .values({
            id: e.id,
            userId,
            category: e.category,
            amount: e.amount.toString(),
            date: e.date,
            note: e.note || null,
            paymentMethod: e.paymentMethod || 'cash',
          })
          .onConflictDoNothing();
      }
    }

    // 9. Sync Adjustments
    if (data.cashAdjustments && data.cashAdjustments.length > 0) {
      for (const a of data.cashAdjustments) {
        await db.insert(cashAdjustments)
          .values({
            id: a.id,
            userId,
            type: a.type,
            channel: a.channel || 'cash',
            amount: a.amount.toString(),
            date: a.date,
            reason: a.reason,
          })
          .onConflictDoNothing();
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to sync store data to Cloud SQL:', error);
    throw new Error('Database sync failed. Please try again later.', { cause: error });
  }
}
