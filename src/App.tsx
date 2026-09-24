import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppStateData, 
  Product, 
  Customer, 
  Order, 
  OrderStatus,
  DuePaymentRecord, 
  Expense, 
  StoreSettings, 
  ActiveTab,
  PurchaseRecord,
  CashAdjustment,
  SupplierDuePayment,
  CourierSettlementStatus,
  CourierRemittanceBatch
} from './types';
import { loadAppState, saveAppState } from './services/storage';
import { formatCurrency } from './utils/formatters';

// Components
import { PosCounter } from './components/PosCounter';
import { CashBalanceRegister } from './components/CashBalanceRegister';
import { OrderHistory } from './components/OrderHistory';
import { StockManagement } from './components/StockManagement';
import { CustomerKhata } from './components/CustomerKhata';
import { CustomerDirectory } from './components/CustomerDirectory';
import { ProfitLossReport } from './components/ProfitLossReport';
import { ExpenseTracker } from './components/ExpenseTracker';
import { PurchaseStockIn } from './components/PurchaseStockIn';
import { BackupAndSettings } from './components/BackupAndSettings';
import { ReceiptA5 } from './components/ReceiptA5';
import { SaleSuccessView } from './components/SaleSuccessView';

// Icons
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  Users, 
  BookOpen,
  TrendingUp, 
  Receipt, 
  Settings, 
  Wifi, 
  WifiOff,
  Store,
  Printer,
  PlusCircle,
  AlertCircle,
  Boxes,
  Wallet,
  Cloud,
  CloudCheck,
  RefreshCw,
  LogIn,
  LogOut,
  Database,
  Menu,
  X,
  HardDrive,
  ChevronRight,
  Truck
} from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function App() {
  const [appState, setAppState] = useState<AppStateData>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [posPreselectedCustomerId, setPosPreselectedCustomerId] = useState<string | null>(null);
  const [customerDirectorySelectedId, setCustomerDirectorySelectedId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const handleStartEditOrder = (order: Order) => {
    setEditingOrder(order);
    setActiveTab('pos');
  };

  const {
    currentUser,
    loginWithGoogle,
    logout,
    cloudSyncStatus,
    lastSyncedAt,
    loadFromCloud,
    saveToCloud,
  } = useAuth();

  // Monitor network online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync state with Cloud SQL when user signs in
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    (async () => {
      try {
        const cloudData = await loadFromCloud();
        if (!isMounted || !cloudData) return;

        // If cloud database has data, load it into appState
        if (
          (cloudData.products && cloudData.products.length > 0) ||
          (cloudData.orders && cloudData.orders.length > 0)
        ) {
          setAppState((prev) => ({
            ...prev,
            ...cloudData,
          }));
        } else {
          // If cloud is newly initialized, save existing state into Cloud SQL
          await saveToCloud(appState);
        }
      } catch (err) {
        console.error('Failed to sync with Cloud SQL on login:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Save to localStorage and Cloud SQL whenever state changes
  const updateStateAndPersist = (updater: (prev: AppStateData) => AppStateData) => {
    setAppState((prev) => {
      const next = updater(prev);
      saveAppState(next);
      if (currentUser) {
        saveToCloud(next);
      }
      return next;
    });
  };

  // Today's summary stats
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = new Date().toISOString().slice(0, 10);

    const todayOrders = appState.orders.filter((o) => {
      const d = new Date(o.date);
      return d >= today && o.status !== 'cancelled';
    });

    const totalSalesToday = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const cashCollectedToday = todayOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalDueMarket = appState.customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
    const totalCodDue = appState.orders.reduce((sum, o) => {
      if (o.status === 'cancelled' || o.status === 'returned' || o.courierSettlementStatus === 'settled') return sum;
      if (o.orderType === 'online' || (o.codAmount && o.codAmount > 0)) {
        const codAmt = o.codAmount !== undefined && o.codAmount > 0 
          ? o.codAmount 
          : Math.max(0, o.grandTotal - (o.paidAmount || 0));
        const deliveryCost = o.courierDeliveryCost !== undefined 
          ? o.courierDeliveryCost 
          : (o.deliveryCharge !== undefined ? o.deliveryCharge : 130);
        const amountAfterDelivery = Math.max(0, codAmt - deliveryCost);
        const codFee = o.courierCodFee !== undefined 
          ? o.courierCodFee 
          : (codAmt > 0 ? Math.max(1, Math.round(amountAfterDelivery * 0.01)) : 0);
        const net = o.courierNetPayable !== undefined 
          ? o.courierNetPayable 
          : Math.max(0, codAmt - deliveryCost - codFee);
        return sum + net;
      }
      return sum;
    }, 0);

    const lowStockCount = appState.products.filter(
      (p) => p.stockQty <= p.minStockAlert
    ).length;

    // Today COGS and Net Profit
    let todayCOGS = 0;
    todayOrders.forEach((o) => {
      o.items.forEach((it) => {
        todayCOGS += (it.purchasePrice || 0) * it.quantity;
      });
    });
    const todayExpenses = appState.expenses
      .filter((e) => e.date.slice(0, 10) === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
    const todayNetProfit = totalSalesToday - todayCOGS - todayExpenses;

    return {
      totalSalesToday,
      cashCollectedToday,
      totalDueMarket,
      totalCodDue,
      lowStockCount,
      todayNetProfit,
      orderCount: todayOrders.length,
    };
  }, [appState.orders, appState.customers, appState.products, appState.expenses]);

  // Complete a Sale from POS
  const handleCompleteSale = (order: Order) => {
    updateStateAndPersist((prev) => {
      // 1. Reduce product stock only if order is not draft
      let updatedProducts = prev.products;
      if (order.status !== 'draft') {
        updatedProducts = prev.products.map((prod) => {
          const itemSold = order.items.find((it) => it.productId === prod.id);
          if (itemSold) {
            return {
              ...prod,
              stockQty: Math.max(0, prod.stockQty - itemSold.quantity),
              updatedAt: new Date().toISOString(),
            };
          }
          return prod;
        });
      }

      // 2. Update Customer due, advance & purchases if identified and not draft
      let updatedCustomers = prev.customers;
      if (order.customerId && order.status !== 'draft') {
        updatedCustomers = prev.customers.map((cust) => {
          if (cust.id === order.customerId) {
            let currentDue = cust.totalDue || 0;
            let currentAdvance = cust.advanceBalance || 0;

            // Step 1: If advance balance was applied on this order
            if (order.appliedAdvance && order.appliedAdvance > 0) {
              currentAdvance = Math.max(0, currentAdvance - order.appliedAdvance);
            }

            // Step 2: Add due amount from this order if any
            if (order.dueAmount > 0) {
              currentDue += order.dueAmount;
            }

            // Step 3: If excess payment was made on this order
            if (order.excessAdvanceAdded && order.excessAdvanceAdded > 0) {
              if (currentDue > 0) {
                const settleAmount = Math.min(currentDue, order.excessAdvanceAdded);
                currentDue -= settleAmount;
                const rem = order.excessAdvanceAdded - settleAmount;
                currentAdvance += rem;
              } else {
                currentAdvance += order.excessAdvanceAdded;
              }
            }

            return {
              ...cust,
              totalPurchased: cust.totalPurchased + order.grandTotal,
              totalPaid: cust.totalPaid + order.paidAmount + (order.appliedAdvance || 0),
              totalDue: currentDue,
              advanceBalance: currentAdvance,
              updatedAt: new Date().toISOString(),
            };
          }
          return cust;
        });
      }

      return {
        ...prev,
        orders: [order, ...prev.orders],
        products: updatedProducts,
        customers: updatedCustomers,
      };
    });

    // Switch to Sale Success summary view (with sale details, share buttons & edit button)
    setActiveReceiptOrder(order);
    setEditingOrder(null);
    setActiveTab('sale_success');
  };

  // Update order status across pipeline (draft -> confirmed -> shipped -> delivered / returned / cancelled)
  const handleUpdateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    options?: { courierName?: string; trackingCode?: string; returnLossAmount?: number }
  ) => {
    updateStateAndPersist((prev) => {
      const targetOrder = prev.orders.find((o) => o.id === orderId);
      if (!targetOrder) return prev;
      const prevStatus = targetOrder.status;

      let updatedProducts = prev.products;
      let updatedExpenses = prev.expenses;
      let updatedCustomers = prev.customers;

      const isActiveStatus = (s: OrderStatus) =>
        s === 'confirmed' || s === 'processing' || s === 'shipped' || s === 'delivered';
      const isInactiveStatus = (s: OrderStatus) =>
        s === 'draft' || s === 'cancelled' || s === 'returned';

      // Deduct stock if transitioning from inactive to active
      if (isInactiveStatus(prevStatus) && isActiveStatus(newStatus)) {
        updatedProducts = prev.products.map((prod) => {
          const itemSold = targetOrder.items.find((i) => i.productId === prod.id);
          if (itemSold) {
            return {
              ...prod,
              stockQty: Math.max(0, prod.stockQty - itemSold.quantity),
              updatedAt: new Date().toISOString(),
            };
          }
          return prod;
        });
      }

      // Restore stock if transitioning from active to inactive
      if (isActiveStatus(prevStatus) && isInactiveStatus(newStatus)) {
        updatedProducts = prev.products.map((prod) => {
          const itemSold = targetOrder.items.find((i) => i.productId === prod.id);
          if (itemSold) {
            return {
              ...prod,
              stockQty: prod.stockQty + itemSold.quantity,
              updatedAt: new Date().toISOString(),
            };
          }
          return prod;
        });
      }

      // If returned (RTO), record courier loss into expenses
      if (newStatus === 'returned' && options?.returnLossAmount) {
        const returnExpense: Expense = {
          id: `exp-return-${Date.now()}`,
          title: `কুরিয়ার রিটার্ন ক্ষতি - চালান #${targetOrder.invoiceNumber}`,
          category: 'কুরিয়ার রিটার্ন ক্ষতি',
          amount: options.returnLossAmount,
          date: new Date().toISOString(),
          note: `কাস্টমার পার্সেল গ্রহণ করেননি - কুরিয়ার ডেলিভারি চার্জ ক্ষতি`,
        };
        updatedExpenses = [returnExpense, ...prev.expenses];
      }

      // If marked as delivered, online COD is received!
      let updatedPaid = targetOrder.paidAmount;
      let updatedCod = targetOrder.codAmount;
      if (newStatus === 'delivered' && targetOrder.orderType === 'online') {
        updatedPaid = targetOrder.grandTotal;
        updatedCod = 0;
      }

      const updatedOrder: Order = {
        ...targetOrder,
        status: newStatus,
        courierName: options?.courierName || targetOrder.courierName,
        courierTrackingCode: options?.trackingCode || targetOrder.courierTrackingCode,
        paidAmount: updatedPaid,
        codAmount: updatedCod,
        updatedAt: new Date().toISOString(),
      };

      const updatedOrders = prev.orders.map((o) => (o.id === orderId ? updatedOrder : o));

      return {
        ...prev,
        orders: updatedOrders,
        products: updatedProducts,
        expenses: updatedExpenses,
        customers: updatedCustomers,
      };
    });
  };

  // Update/Edit an existing order
  const handleUpdateOrder = (updatedOrder: Order, originalOrder: Order) => {
    updateStateAndPersist((prev) => {
      const isActiveStatus = (s: OrderStatus) =>
        s === 'confirmed' || s === 'processing' || s === 'shipped' || s === 'delivered';

      const origIsActive = isActiveStatus(originalOrder.status);
      const newIsActive = isActiveStatus(updatedOrder.status);

      // 1. Calculate stock difference
      const updatedProducts = prev.products.map((prod) => {
        const origItem = originalOrder.items.find((i) => i.productId === prod.id);
        const newItem = updatedOrder.items.find((i) => i.productId === prod.id);
        const origQty = origIsActive && origItem ? origItem.quantity : 0;
        const newQty = newIsActive && newItem ? newItem.quantity : 0;
        const stockDiff = origQty - newQty; // positive means stock returned

        if (stockDiff !== 0) {
          return {
            ...prod,
            stockQty: Math.max(0, prod.stockQty + stockDiff),
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      });

      // 2. Calculate customer due difference
      let updatedCustomers = prev.customers;
      if (updatedOrder.customerId) {
        const dueDiff = updatedOrder.dueAmount - originalOrder.dueAmount;
        const totalDiff = updatedOrder.grandTotal - originalOrder.grandTotal;
        const paidDiff = updatedOrder.paidAmount - originalOrder.paidAmount;

        updatedCustomers = prev.customers.map((cust) => {
          if (cust.id === updatedOrder.customerId) {
            return {
              ...cust,
              totalPurchased: Math.max(0, cust.totalPurchased + totalDiff),
              totalPaid: Math.max(0, cust.totalPaid + paidDiff),
              totalDue: Math.max(0, (cust.totalDue || 0) + dueDiff),
              updatedAt: new Date().toISOString(),
            };
          }
          return cust;
        });
      }

      // 3. Update orders array
      const updatedOrders = prev.orders.map((o) =>
        o.id === updatedOrder.id ? updatedOrder : o
      );

      return {
        ...prev,
        orders: updatedOrders,
        products: updatedProducts,
        customers: updatedCustomers,
      };
    });

    // Navigate to Sale Success view with updated order details
    setActiveReceiptOrder(updatedOrder);
    setEditingOrder(null);
    setActiveTab('sale_success');
  };

  // Settle Courier COD payment directly into bank/channel
  const handleSettleCodOrder = (
    order: Order,
    settledAmount: number,
    channel: 'bank' | 'bkash' | 'cash',
    note?: string
  ) => {
    updateStateAndPersist((prev) => {
      const updatedOrders = prev.orders.map((o) => {
        if (o.id === order.id) {
          return {
            ...o,
            courierSettlementStatus: 'settled' as CourierSettlementStatus,
            courierSettledDate: new Date().toISOString(),
            courierSettledAmount: settledAmount,
            courierSettledChannel: channel,
            courierSettlementNote: note || undefined,
            status: (o.status === 'shipped' || o.status === 'confirmed' || o.status === 'processing') ? ('delivered' as OrderStatus) : o.status,
            paidAmount: o.grandTotal,
            codAmount: 0,
            updatedAt: new Date().toISOString(),
          };
        }
        return o;
      });

      const adjustment: CashAdjustment = {
        id: `adj-cod-${Date.now()}`,
        type: 'in',
        channel: channel,
        amount: settledAmount,
        date: new Date().toISOString(),
        reason: `কুরিয়ার সিওডি রেমিট্যান্স জমা - চালান #${order.invoiceNumber} (${order.courierName || 'কুরিয়ার'})`,
      };

      return {
        ...prev,
        orders: updatedOrders,
        cashAdjustments: [adjustment, ...(prev.cashAdjustments || [])],
      };
    });

    alert(`চালান #${order.invoiceNumber} এর সিওডি বাবদ ৳${settledAmount} টাকা ${channel === 'bank' ? 'ব্যাংক' : channel === 'bkash' ? 'বিকাশ' : 'ক্যাশ'} একাউন্টে সফলভাবে জমা হয়েছে!`);
  };

  // Settle multiple courier orders in a batch remittance (একসাথে একাধিক পার্সেল সিওডি বিল রিকনসিল)
  const handleSettleBatchRemittance = (
    batch: CourierRemittanceBatch,
    createInwardExpense?: boolean
  ) => {
    updateStateAndPersist((prev) => {
      const orderIdsMap = new Map(batch.items.map((it) => [it.orderId, it]));

      // 1. Update all orders in batch to settled
      const updatedOrders = prev.orders.map((o) => {
        const item = orderIdsMap.get(o.id);
        if (item) {
          return {
            ...o,
            courierSettlementStatus: 'settled' as CourierSettlementStatus,
            courierSettledDate: batch.date,
            courierSettledAmount: item.netOrderAmount,
            courierSettledChannel: batch.paymentChannel,
            courierDeliveryCost: item.deliveryCharge,
            remittanceBatchId: batch.id,
            status: (o.status === 'shipped' || o.status === 'confirmed' || o.status === 'processing') ? ('delivered' as OrderStatus) : o.status,
            paidAmount: o.grandTotal,
            codAmount: 0,
            updatedAt: new Date().toISOString(),
          };
        }
        return o;
      });

      // 2. Add bank adjustment for actual received amount
      const adjustment: CashAdjustment = {
        id: `adj-rem-${batch.id}`,
        type: 'in',
        channel: batch.paymentChannel,
        amount: batch.actualBankReceived,
        date: batch.date,
        reason: `কুরিয়ার ব্যাচ রেমিট্যান্স #${batch.batchNumber} (${batch.courierName}) - ${batch.orderCount}টি পার্সেল জমা`,
      };

      // 3. If there are other deductions (e.g. ৳300 কেনা মালের কুরিয়ার চার্জ কর্তন) and user opted to create expense
      const newExpenses = [...(prev.expenses || [])];
      if (createInwardExpense && batch.otherDeductions > 0) {
        newExpenses.unshift({
          id: `exp-rem-${batch.id}`,
          title: `কুরিয়ার বিল কর্তন: ${batch.otherDeductionsNote || 'কেনা মালের কুরিয়ার চার্জ'} (ব্যাচ #${batch.batchNumber})`,
          category: 'পরিবহন খরচ',
          amount: batch.otherDeductions,
          date: batch.date,
          paymentMethod: batch.paymentChannel,
          note: batch.otherDeductionsNote || 'কেনা মালের কুরিয়ার চার্জ কর্তন',
        });
      }

      const prevRemittances = prev.courierRemittances || [];

      return {
        ...prev,
        orders: updatedOrders,
        cashAdjustments: [adjustment, ...(prev.cashAdjustments || [])],
        expenses: newExpenses,
        courierRemittances: [batch, ...prevRemittances],
      };
    });

    alert(`কুরিয়ার ব্যাচ বিল #${batch.batchNumber} সফলভাবে সমন্বিত হয়েছে!\n${batch.orderCount}টি পার্সেল থেকে ৳${batch.actualBankReceived} টাকা ${batch.paymentChannel === 'bank' ? 'ব্যাংক' : batch.paymentChannel === 'bkash' ? 'বিকাশ' : 'ক্যাশ'} তহবিলে জমা হয়েছে।`);
  };

  // Delete / Revert courier batch remittance (কুরিয়ার রেমিট্যান্স ভাউচার বাতিল)
  const handleDeleteBatchRemittance = (batchId: string) => {
    updateStateAndPersist((prev) => {
      const targetBatch = (prev.courierRemittances || []).find((b) => b.id === batchId);
      if (!targetBatch) return prev;

      const batchOrderIds = new Set(targetBatch.items.map((it) => it.orderId));

      // Revert orders' courier settlement status to pending
      const updatedOrders = prev.orders.map((o) => {
        if (batchOrderIds.has(o.id)) {
          return {
            ...o,
            courierSettlementStatus: 'pending' as CourierSettlementStatus,
            courierSettledDate: undefined,
            courierSettledAmount: undefined,
            courierSettledChannel: undefined,
            remittanceBatchId: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return o;
      });

      // Remove cash adjustment
      const updatedCashAdjustments = (prev.cashAdjustments || []).filter(
        (a) => a.id !== `adj-rem-${batchId}`
      );

      // Remove expense if created
      const updatedExpenses = (prev.expenses || []).filter(
        (e) => e.id !== `exp-rem-${batchId}`
      );

      // Remove batch from remittances
      const updatedRemittances = (prev.courierRemittances || []).filter(
        (b) => b.id !== batchId
      );

      return {
        ...prev,
        orders: updatedOrders,
        cashAdjustments: updatedCashAdjustments,
        expenses: updatedExpenses,
        courierRemittances: updatedRemittances,
      };
    });

    alert('কুরিয়ার রেমিট্যান্স ভাউচারটি সফলভাবে বাতিল করা হয়েছে এবং পার্সেলগুলো পুনরায় বাকি হিসেবে সংরক্ষিত হয়েছে।');
  };

  // Delete an order (returns stock to inventory)
  const handleDeleteOrder = (orderId: string) => {
    updateStateAndPersist((prev) => {
      const targetOrder = prev.orders.find((o) => o.id === orderId);
      if (!targetOrder) return prev;

      // Restore stock
      const updatedProducts = prev.products.map((prod) => {
        const itemSold = targetOrder.items.find((it) => it.productId === prod.id);
        if (itemSold) {
          return {
            ...prod,
            stockQty: prod.stockQty + itemSold.quantity,
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      });

      // Restore customer due
      let updatedCustomers = prev.customers;
      if (targetOrder.customerId && targetOrder.dueAmount > 0) {
        updatedCustomers = prev.customers.map((c) => {
          if (c.id === targetOrder.customerId) {
            return {
              ...c,
              totalDue: Math.max(0, (c.totalDue || 0) - targetOrder.dueAmount),
              totalPurchased: Math.max(0, c.totalPurchased - targetOrder.grandTotal),
              totalPaid: Math.max(0, c.totalPaid - targetOrder.paidAmount),
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });
      }

      return {
        ...prev,
        orders: prev.orders.filter((o) => o.id !== orderId),
        products: updatedProducts,
        customers: updatedCustomers,
      };
    });
  };

  // Record due payment from customer
  const handleRecordDuePayment = (record: DuePaymentRecord) => {
    updateStateAndPersist((prev) => {
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id === record.customerId) {
          const currentDue = c.totalDue || 0;
          let currentAdvance = c.advanceBalance || 0;
          let newDue = currentDue;

          if (record.amount <= currentDue) {
            newDue = currentDue - record.amount;
          } else {
            const excess = record.amount - currentDue;
            newDue = 0;
            currentAdvance += excess;
          }

          return {
            ...c,
            totalDue: newDue,
            advanceBalance: currentAdvance,
            totalPaid: (c.totalPaid || 0) + record.amount,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      return {
        ...prev,
        duePayments: [record, ...prev.duePayments],
        customers: updatedCustomers,
      };
    });

    alert(`৳${record.amount} টাকা বাকি আদায় / জমা সফলভাবে রেকর্ড করা হয়েছে!`);
  };

  // Product Operations
  const handleAddProduct = (product: Product) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      products: [product, ...prev.products],
    }));
  };

  const handleUpdateProduct = (product: Product) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === product.id ? product : p)),
    }));
  };

  const handleDeleteProduct = (productId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
  };

  // Customer Operations
  const handleAddCustomer = (customer: Customer) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      customers: [customer, ...prev.customers],
    }));
  };

  const handleUpdateCustomer = (customer: Customer) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === customer.id ? customer : c)),
    }));
  };

  const handleDeleteCustomer = (customerId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== customerId),
    }));
  };

  // Expense Operations
  const handleAddExpense = (expense: Expense) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      expenses: [expense, ...prev.expenses],
    }));
  };

  const handleDeleteExpense = (expenseId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
  };

  // Purchase / Stock In Operations
  const handleAddPurchase = (purchase: PurchaseRecord) => {
    updateStateAndPersist((prev) => {
      const updatedProducts = prev.products.map((prod) => {
        const item = purchase.items.find((i) => i.productId === prod.id);
        if (item) {
          return {
            ...prod,
            stockQty: prod.stockQty + item.quantity,
            purchasePrice: item.unitCost > 0 ? item.unitCost : prod.purchasePrice,
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      });

      return {
        ...prev,
        products: updatedProducts,
        purchases: [purchase, ...(prev.purchases || [])],
      };
    });
  };

  const handleDeletePurchase = (purchaseId: string) => {
    updateStateAndPersist((prev) => {
      const target = (prev.purchases || []).find((p) => p.id === purchaseId);
      let updatedProducts = prev.products;
      if (target) {
        updatedProducts = prev.products.map((prod) => {
          const item = target.items.find((i) => i.productId === prod.id);
          if (item) {
            return {
              ...prod,
              stockQty: Math.max(0, prod.stockQty - item.quantity),
              updatedAt: new Date().toISOString(),
            };
          }
          return prod;
        });
      }

      return {
        ...prev,
        products: updatedProducts,
        purchases: (prev.purchases || []).filter((p) => p.id !== purchaseId),
      };
    });
  };

  // Cash Register Operations
  const handleAddCashAdjustment = (adjustment: CashAdjustment) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      cashAdjustments: [adjustment, ...(prev.cashAdjustments || [])],
    }));
  };

  const handleDeleteCashAdjustment = (id: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      cashAdjustments: (prev.cashAdjustments || []).filter((a) => a.id !== id),
    }));
  };

  const handleUpdateCashCount = (data: { countedAmount: number; difference: number; note?: string }) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      lastCashCount: {
        ...data,
        countedAt: new Date().toISOString(),
      },
    }));
  };

  // Supplier Due Payments
  const handleAddSupplierDuePayment = (payment: SupplierDuePayment) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      supplierDuePayments: [payment, ...(prev.supplierDuePayments || [])],
    }));
  };

  // Total Net Available Balance (দোকানের মোট ব্যালেন্স ও তহবিল)
  const currentCashBalance = useMemo(() => {
    // All payments collected from sales
    const salesPaid = appState.orders.reduce((sum, o) => {
      if (o.status === 'cancelled') return sum;
      return sum + (o.paidAmount || 0);
    }, 0);

    // Customer dues collected
    const duePaid = (appState.duePayments || []).reduce((sum, d) => {
      return sum + (d.amount || 0);
    }, 0);

    // Operating expenses
    const totalExpenses = (appState.expenses || []).reduce((sum, e) => {
      return sum + (e.amount || 0);
    }, 0);

    // Goods purchase payments
    const purchasesPaid = (appState.purchases || []).reduce((sum, p) => {
      return sum + (p.paidAmount || 0);
    }, 0);

    // Supplier dues paid
    const supplierDuesPaid = (appState.supplierDuePayments || []).reduce((sum, s) => {
      return sum + (s.amount || 0);
    }, 0);

    // Cash/fund adjustments (in vs out)
    const adjustments = (appState.cashAdjustments || []).reduce((sum, a) => {
      return a.type === 'in' || a.type === 'opening' ? sum + a.amount : sum - a.amount;
    }, 0);

    return salesPaid + duePaid + adjustments - totalExpenses - purchasesPaid - supplierDuesPaid;
  }, [appState]);

  // Settings & Restore
  const handleUpdateSettings = (newSettings: StoreSettings) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      settings: newSettings,
    }));
  };

  const handleRestoreState = (newState: AppStateData) => {
    setAppState(newState);
  };

  // Open receipt view
  const handleViewReceipt = (order: Order) => {
    setActiveReceiptOrder(order);
    setActiveTab('receipt_view');
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* APP TOP NAVBAR (Hidden during printing) */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        {/* Brand & Store Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Hamburger Menu & Logo */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              id="btn-open-mobile-menu"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer shrink-0"
              aria-label="সকল মেনু খুলুন"
              title="সকল মেনু দেখুন"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo & Store Title */}
            <div 
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-2 cursor-pointer min-w-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate leading-tight">
                  {appState.settings.storeName}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-500 truncate hidden sm:block">
                  {appState.settings.storeTagline || 'দোকান খাতা ও বিক্রয় পয়েন্ট'}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Center: Top Quick Stats (Sales, Net Profit, Due, Cash in Hand) */}
          <div className="hidden md:flex items-center gap-2.5 text-xs">
            {/* Clickable Cash Register Pill */}
            <button
              onClick={() => setActiveTab('cash_register')}
              className={`border px-3 py-1.5 rounded-lg text-right transition-colors cursor-pointer ${
                activeTab === 'cash_register'
                  ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-400'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-200'
              }`}
              title="দোকানের মোট ব্যালেন্স ও হিসাব দেখতে ক্লিক করুন"
            >
              <span className="text-[10px] text-amber-800 font-semibold block flex items-center justify-end gap-1">
                <Wallet className="w-3 h-3 text-amber-600" />
                <span>মোট ব্যালেন্স</span>
              </span>
              <span className="font-bold text-amber-950 text-sm">
                {formatCurrency(currentCashBalance)}
              </span>
            </button>

            <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg text-right">
              <span className="text-[10px] text-emerald-700 font-semibold block">আজকের বিক্রি</span>
              <span className="font-bold text-emerald-900 text-sm">
                {formatCurrency(todayStats.totalSalesToday)}
              </span>
            </div>

            <div className={`border px-3 py-1.5 rounded-lg text-right ${
              todayStats.todayNetProfit >= 0 
                ? 'bg-teal-50 border-teal-200 text-teal-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <span className="text-[10px] font-semibold block opacity-80">আজকের লাভ</span>
              <span className="font-bold text-sm">
                {formatCurrency(todayStats.todayNetProfit)}
              </span>
            </div>

            {/* Customer Due Pill */}
            <button
              onClick={() => setActiveTab('customers')}
              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-right transition cursor-pointer"
              title="কাস্টমার বাকি দেখতে ক্লিক করুন"
            >
              <span className="text-[10px] text-rose-700 font-semibold block">কাস্টমার বাকি</span>
              <span className="font-bold text-rose-900 text-sm">
                {formatCurrency(todayStats.totalDueMarket)}
              </span>
            </button>

            {/* Courier COD Due Pill */}
            {todayStats.totalCodDue > 0 && (
              <button
                onClick={() => setActiveTab('customers')}
                className="bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-right transition cursor-pointer"
                title="কুরিয়ার সিওডি বাকি দেখতে ক্লিক করুন"
              >
                <span className="text-[10px] text-blue-700 font-semibold block flex items-center justify-end gap-1">
                  <Truck className="w-2.5 h-2.5" />
                  <span>সিওডি বাকি</span>
                </span>
                <span className="font-bold text-blue-900 text-sm">
                  {formatCurrency(todayStats.totalCodDue)}
                </span>
              </button>
            )}
          </div>

          {/* Right Action: Mobile Cash Pill + Offline Free Badge + Quick Sell */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Cash Balance Quick Pill */}
            <button
              onClick={() => setActiveTab('cash_register')}
              className="md:hidden px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="ক্যাশ ব্যালেন্স"
            >
              <Wallet className="w-3 h-3 text-amber-600" />
              <span>{formatCurrency(currentCashBalance)}</span>
            </button>

            {/* Offline Local Free Badge (100% Free, No Google Cloud Bill) */}
            <div 
              onClick={() => setActiveTab('backup_sync')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              title="১০০% অফলাইন ও লোকাল খাতা সক্রিয় (সম্পূর্ণ ফ্রি)"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">লোকাল খাতা (১০০% ফ্রি)</span>
              <span className="lg:hidden text-[11px]">ফ্রি খাতা</span>
            </div>

            {/* Quick POS Button */}
            <button
              id="nav-quick-pos-btn"
              onClick={() => {
                setEditingOrder(null);
                setActiveTab('pos');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 sm:px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">বিক্রি</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar (Horizontal Swipeable on Mobile, Clean on Desktop) */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-100 py-1.5 text-xs sm:text-sm font-semibold touch-pan-x">
          {[
            { id: 'pos', label: 'বিক্রয় কাউন্টার (POS)', icon: ShoppingCart },
            { id: 'cash_register', label: 'মোট ব্যালেন্স ও হিসাব', icon: Wallet },
            { id: 'orders', label: 'পুরাতন অর্ডার ও এডিট', icon: FileText, badge: appState.orders.length },
            { id: 'purchases', label: 'মাল ক্রয় ও মহাজন খাতা', icon: Boxes, badge: appState.purchases?.length ? `${appState.purchases.length}` : undefined },
            { id: 'stock', label: 'স্টক ও পণ্য তালিকা', icon: Package, badge: todayStats.lowStockCount > 0 ? `${todayStats.lowStockCount} কম` : undefined },
            { id: 'due_khata', label: 'বাকীর খাতা', icon: BookOpen, badge: todayStats.totalDueMarket > 0 ? `৳${todayStats.totalDueMarket}` : undefined },
            { id: 'customers', label: 'গ্রাহক', icon: Users, badge: `${appState.customers.length}` },
            { id: 'profit_loss', label: 'লাভ-ক্ষতির রিপোর্ট', icon: TrendingUp },
            { id: 'expenses', label: 'দোকান খরচ', icon: Receipt },
            { id: 'backup_sync', label: 'ব্যাকআপ ও সেটিংস', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all cursor-pointer min-h-[38px] ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* MOBILE NAVIGATION DRAWER (Slide-out menu for Phones) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{appState.settings.storeName}</h3>
                  <p className="text-[10px] text-slate-400 truncate">স্মার্ট দোকান খাতা</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Banner in Drawer */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 mb-2">আজকের সারসংক্ষেপ</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">ক্যাশ ব্যালেন্স</span>
                  <span className="font-bold text-amber-700">{formatCurrency(currentCashBalance)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">আজকের বিক্রি</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(todayStats.totalSalesToday)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">আজকের লাভ</span>
                  <span className={`font-bold ${todayStats.todayNetProfit >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                    {formatCurrency(todayStats.todayNetProfit)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">মোট বাকি</span>
                  <span className="font-bold text-rose-600">{formatCurrency(todayStats.totalDueMarket)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Navigation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {[
                { id: 'pos', label: 'বিক্রয় কাউন্টার (POS)', icon: ShoppingCart },
                { id: 'cash_register', label: 'মোট ব্যালেন্স ও হিসাব', icon: Wallet },
                { id: 'orders', label: 'পুরাতন অর্ডার ও এডিট', icon: FileText, badge: appState.orders.length },
                { id: 'purchases', label: 'মাল ক্রয় ও মহাজন খাতা', icon: Boxes, badge: appState.purchases?.length },
                { id: 'stock', label: 'স্টক ও পণ্য তালিকা', icon: Package, badge: todayStats.lowStockCount > 0 ? `${todayStats.lowStockCount} কম` : undefined },
                { id: 'due_khata', label: 'বাকীর খাতা', icon: BookOpen, badge: todayStats.totalDueMarket > 0 ? `৳${todayStats.totalDueMarket}` : undefined },
                { id: 'customers', label: 'গ্রাহক', icon: Users, badge: `${appState.customers.length}` },
                { id: 'profit_loss', label: 'লাভ-ক্ষতির রিপোর্ট', icon: TrendingUp },
                { id: 'expenses', label: 'দোকান খরচ', icon: Receipt },
                { id: 'backup_sync', label: 'ব্যাকআপ ও সেটিংস', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as ActiveTab);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tab.badge && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>১০০% অফলাইন ও লোকাল ডাটাবেজে সক্রিয়</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {/* TAB 1: POS COUNTER */}
        {activeTab === 'pos' && (
          <PosCounter
            products={appState.products}
            customers={appState.customers}
            initialCustomerId={posPreselectedCustomerId}
            onClearInitialCustomerId={() => setPosPreselectedCustomerId(null)}
            editingOrder={editingOrder}
            onCancelEdit={() => {
              setEditingOrder(null);
              if (activeReceiptOrder) {
                setActiveTab('sale_success');
              } else {
                setActiveTab('orders');
              }
            }}
            onCompleteSale={handleCompleteSale}
            onUpdateOrder={(updatedOrder, originalOrder) => {
              handleUpdateOrder(updatedOrder, originalOrder);
            }}
            onQuickAddCustomer={handleAddCustomer}
          />
        )}

        {/* TAB: CASH REGISTER & CASH BALANCE */}
        {activeTab === 'cash_register' && (
          <CashBalanceRegister
            orders={appState.orders}
            duePayments={appState.duePayments || []}
            expenses={appState.expenses || []}
            purchases={appState.purchases || []}
            supplierDuePayments={appState.supplierDuePayments || []}
            cashAdjustments={appState.cashAdjustments || []}
            lastCashCount={appState.lastCashCount}
            onSaveCashAdjustment={handleAddCashAdjustment}
            onSaveCashCount={handleUpdateCashCount}
          />
        )}

        {/* TAB 2: ORDER HISTORY & EDIT */}
        {activeTab === 'orders' && (
          <OrderHistory
            orders={appState.orders}
            products={appState.products}
            customers={appState.customers}
            settings={appState.settings}
            onViewReceipt={handleViewReceipt}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onEditInPos={handleStartEditOrder}
          />
        )}

        {/* TAB 3: STOCK MANAGEMENT */}
        {activeTab === 'stock' && (
          <StockManagement
            products={appState.products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {/* TAB 4: DUE KHATA (CUSTOMER DUE & COURIER COD) */}
        {activeTab === 'due_khata' && (
          <CustomerKhata
            customers={appState.customers}
            orders={appState.orders}
            duePayments={appState.duePayments}
            settings={appState.settings}
            courierRemittances={appState.courierRemittances || []}
            onOpenCustomerProfile={(cust) => {
              setCustomerDirectorySelectedId(cust.id);
              setActiveTab('customers');
            }}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRecordDuePayment={handleRecordDuePayment}
            onUpdateOrder={(upd) => {
              const orig = appState.orders.find((o) => o.id === upd.id) || upd;
              handleUpdateOrder(upd, orig);
            }}
            onSettleCodOrder={handleSettleCodOrder}
            onSettleBatchRemittance={handleSettleBatchRemittance}
            onDeleteBatchRemittance={handleDeleteBatchRemittance}
          />
        )}

        {/* TAB 5: CUSTOMER DIRECTORY & 360 PROFILE */}
        {activeTab === 'customers' && (
          <CustomerDirectory
            customers={appState.customers}
            orders={appState.orders}
            duePayments={appState.duePayments || []}
            settings={appState.settings}
            initialCustomerId={customerDirectorySelectedId}
            onBackToDueKhata={() => setActiveTab('due_khata')}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRecordDuePayment={handleRecordDuePayment}
            onNavigateToPos={(cust) => {
              setPosPreselectedCustomerId(cust.id);
              setActiveTab('pos');
            }}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {/* TAB 5: PROFIT & LOSS REPORT */}
        {activeTab === 'profit_loss' && (
          <ProfitLossReport
            orders={appState.orders}
            expenses={appState.expenses}
            products={appState.products}
            storeName={appState.settings.storeName}
          />
        )}

        {/* TAB 6: EXPENSE TRACKER */}
        {activeTab === 'expenses' && (
          <ExpenseTracker
            expenses={appState.expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {/* TAB: PURCHASES & STOCK IN */}
        {activeTab === 'purchases' && (
          <PurchaseStockIn
            products={appState.products}
            purchases={appState.purchases || []}
            supplierDuePayments={appState.supplierDuePayments || []}
            onAddPurchase={handleAddPurchase}
            onDeletePurchase={handleDeletePurchase}
            onPaySupplierDue={handleAddSupplierDuePayment}
          />
        )}

        {/* TAB 7: BACKUP & SETTINGS */}
        {activeTab === 'backup_sync' && (
          <BackupAndSettings
            settings={appState.settings}
            appState={appState}
            onUpdateSettings={handleUpdateSettings}
            onRestoreState={handleRestoreState}
          />
        )}

        {/* TAB 8: A5 RECEIPT PRINT VIEW */}
        {activeTab === 'receipt_view' && activeReceiptOrder && (
          <ReceiptA5
            order={activeReceiptOrder}
            settings={appState.settings}
            onBack={() => setActiveTab('sale_success')}
            onNewSale={() => {
              setEditingOrder(null);
              setActiveTab('pos');
            }}
            onEditOrder={(ord) => {
              handleStartEditOrder(ord || activeReceiptOrder);
            }}
          />
        )}

        {/* TAB 9: SALE SUCCESS SUMMARY VIEW */}
        {activeTab === 'sale_success' && activeReceiptOrder && (
          <SaleSuccessView
            order={activeReceiptOrder}
            settings={appState.settings}
            onNewSale={() => {
              setEditingOrder(null);
              setActiveTab('pos');
            }}
            onEditOrder={(ord) => {
              handleStartEditOrder(ord || activeReceiptOrder);
            }}
            onViewA5Receipt={(ord) => {
              setActiveReceiptOrder(ord || activeReceiptOrder);
              setActiveTab('receipt_view');
            }}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="no-print bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <p>
          {appState.settings.storeName} • সম্পূর্ণ অফলাইন ও দ্রুতগতির ক্যাশ মেমো এবং দোকান খাতা সফটওয়্যার
        </p>
      </footer>
    </div>
  );
}
