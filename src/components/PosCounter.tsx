import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Customer, Order, OrderItem, PaymentMethod, OrderType, OrderStatus } from '../types';
import { formatCurrency, generateInvoiceNumber, resolveWhatsAppNumber, createWhatsAppUrl } from '../utils/formatters';
import { MoneyInput } from './MoneyInput';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  UserPlus, 
  Printer, 
  Tag, 
  Coins, 
  Smartphone, 
  Clock, 
  X, 
  Check, 
  AlertCircle,
  Truck,
  Store,
  Share2,
  Send,
  MessageCircle,
  MapPin,
  Phone,
  UserCheck,
  Users,
  PackageCheck,
  FileText,
  MessageSquare,
  QrCode,
  Building2,
  Gift,
  Sparkles,
  Edit3
} from 'lucide-react';

interface PosCounterProps {
  products: Product[];
  customers: Customer[];
  initialCustomerId?: string | null;
  onClearInitialCustomerId?: () => void;
  editingOrder?: Order | null;
  onCancelEdit?: () => void;
  onCompleteSale: (order: Order) => void;
  onUpdateOrder?: (updatedOrder: Order, originalOrder: Order) => void;
  onQuickAddCustomer: (customer: Customer) => void;
}

export const PosCounter: React.FC<PosCounterProps> = ({
  products,
  customers,
  initialCustomerId,
  onClearInitialCustomerId,
  editingOrder,
  onCancelEdit,
  onCompleteSale,
  onUpdateOrder,
  onQuickAddCustomer,
}) => {
  // Sales mode: Store vs Online
  const [orderType, setOrderType] = useState<OrderType>('store');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(130);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isPaidManuallyTouched, setIsPaidManuallyTouched] = useState(false);
  const [applyAdvance, setApplyAdvance] = useState(true);

  // Customer & Delivery Info
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');      // ১ম নম্বর: বুকিং / কল নম্বর
  const [customCustomerWhatsapp, setCustomCustomerWhatsapp] = useState(''); // ২য় নম্বর: হোয়াটসঅ্যাপ নম্বর
  const [customCustomerNote, setCustomCustomerNote] = useState('');         // কাস্টমার নোট
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [courierName, setCourierName] = useState('Steadfast Courier');
  const [isDifferentRecipient, setIsDifferentRecipient] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('confirmed');
  const [saleNote, setSaleNote] = useState('');

  // Load editingOrder into form when provided (Full Order Edit Access)
  useEffect(() => {
    if (editingOrder) {
      setOrderType(editingOrder.orderType);
      setCart(editingOrder.items.map((it) => ({ ...it })));
      setDiscount(editingOrder.discount || 0);
      setDeliveryCharge(editingOrder.deliveryCharge || 0);
      setPaymentMethod(editingOrder.paymentMethod);
      setPaidAmount(editingOrder.paidAmount);
      setIsPaidManuallyTouched(true);
      setSelectedCustomerId(editingOrder.customerId || '');
      setCustomCustomerName(editingOrder.customerName || '');
      setCustomCustomerPhone(editingOrder.customerPhone || '');
      setCustomCustomerWhatsapp(editingOrder.customerWhatsapp || '');
      setCustomCustomerNote(editingOrder.customerNote || '');
      setDeliveryAddress(editingOrder.deliveryAddress || '');
      setIsDifferentRecipient(Boolean(editingOrder.isDifferentRecipient));
      setRecipientName(editingOrder.recipientName || '');
      setRecipientPhone(editingOrder.recipientPhone || '');
      setRecipientAddress(editingOrder.recipientAddress || '');
      setCourierName(editingOrder.courierName || 'Steadfast Courier');
      setOrderStatus(editingOrder.status);
      setSaleNote(editingOrder.note || '');
    }
  }, [editingOrder]);

  // Handle initialCustomerId pre-selection from Customer Profile
  React.useEffect(() => {
    if (initialCustomerId) {
      const cust = customers.find((c) => c.id === initialCustomerId);
      if (cust) {
        setSelectedCustomerId(cust.id);
        setCustomCustomerName(cust.name);
        setCustomCustomerPhone(cust.phone || '');
        setCustomCustomerWhatsapp(cust.whatsappPhone || '');
        if (cust.address) setDeliveryAddress(cust.address);
        setCustomCustomerNote(cust.notes || '');
      }
      if (onClearInitialCustomerId) {
        onClearInitialCustomerId();
      }
    }
  }, [initialCustomerId, customers, onClearInitialCustomerId]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const customerSearchContainerRef = useRef<HTMLDivElement>(null);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerSearchContainerRef.current &&
        !customerSearchContainerRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Autocomplete suggestions when typing in customer name/phone/address
  const matchedCustomers = useMemo(() => {
    const q = customCustomerName.toLowerCase().trim();
    if (!q) return [];
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsappPhone && c.whatsappPhone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [customers, customCustomerName]);

  // Categories list derived from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        p.name.toLowerCase().includes(q) || 
        (p.banglaName && p.banglaName.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        p.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  // Delivery charge should ONLY be applied for online deliveries, not store sales
  const activeDeliveryCharge = orderType === 'online' ? (Number(deliveryCharge) || 0) : 0;

  const grandTotal = useMemo(() => {
    const total = Math.max(0, subtotal - (discount || 0) + activeDeliveryCharge);
    return total;
  }, [subtotal, discount, activeDeliveryCharge]);

  const selectedCust = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const availableAdvance = (selectedCust?.advanceBalance || 0);

  const appliedAdvanceAmount = useMemo(() => {
    if (!applyAdvance || availableAdvance <= 0) return 0;
    return Math.min(availableAdvance, grandTotal);
  }, [applyAdvance, availableAdvance, grandTotal]);

  const netPayable = useMemo(() => {
    return Math.max(0, grandTotal - appliedAdvanceAmount);
  }, [grandTotal, appliedAdvanceAmount]);

  // Auto-sync paidAmount with netPayable if user hasn't manually altered it
  React.useEffect(() => {
    if (!isPaidManuallyTouched) {
      if (orderType === 'online') {
        if (paymentMethod === 'cod') {
          setPaidAmount(0); // Full Cash on delivery
        } else if (paymentMethod === 'cash' || paymentMethod === 'bkash') {
          // Default to full paid or advance delivery charge
          setPaidAmount(netPayable);
        }
      } else {
        if (paymentMethod === 'due') {
          setPaidAmount(0);
        } else {
          setPaidAmount(netPayable);
        }
      }
    }
  }, [netPayable, paymentMethod, isPaidManuallyTouched, orderType]);

  const dueAmount = useMemo(() => {
    if (orderType === 'store') {
      return Math.max(0, netPayable - (paidAmount || 0));
    }
    return 0; // In online, unpaid portion is COD
  }, [netPayable, paidAmount, orderType]);

  const codAmount = useMemo(() => {
    if (orderType === 'online') {
      return Math.max(0, netPayable - (paidAmount || 0));
    }
    return 0;
  }, [netPayable, paidAmount, orderType]);

  const excessPayment = useMemo(() => {
    return Math.max(0, (paidAmount || 0) - netPayable);
  }, [paidAmount, netPayable]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) {
      alert('সতর্কতা: পণ্যটির স্টক শেষ হয়ে গেছে!');
      return;
    }

    if (cart.length === 0 && product.defaultDeliveryCharge !== undefined && product.defaultDeliveryCharge > 0) {
      setDeliveryCharge(product.defaultDeliveryCharge);
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQty) {
          alert(`সর্বোচ্চ উপলব্ধ স্টক: ${product.stockQty} ${product.unit}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      }

      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unit: product.unit,
        unitPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        total: product.sellingPrice,
      };
      return [...prev, newItem];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (product && newQty > product.stockQty) {
      alert(`উপলব্ধ স্টক মাত্র ${product.stockQty} ${product.unit}`);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQty,
              total: Math.round(newQty * item.unitPrice),
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm('আপনি কি কার্টের সমস্ত পণ্য খালি করতে চান?')) {
      setCart([]);
      setDiscount(0);
      setIsPaidManuallyTouched(false);
    }
  };

  // Quick customer creation
  const handleCreateCustomer = () => {
    if (!customCustomerName.trim()) {
      alert('অনুগ্রহ করে কাস্টমারের নাম লিখুন');
      return;
    }
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: customCustomerName.trim(),
      phone: customCustomerPhone.trim(),
      whatsappPhone: customCustomerWhatsapp.trim() || undefined,
      address: deliveryAddress.trim() || undefined,
      notes: customCustomerNote.trim() || undefined,
      totalDue: 0,
      totalPurchased: 0,
      totalPaid: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onQuickAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowNewCustomerForm(false);
  };

  // Prepare order payload
  const createOrderObject = (status: OrderStatus): Order => {
    let finalCustomerId = selectedCustomerId;
    const trimmedName = customCustomerName.trim();
    const trimmedPhone = customCustomerPhone.trim();
    const trimmedWhatsapp = customCustomerWhatsapp.trim();
    const finalAddress = deliveryAddress.trim();

    // If customer is not picked from dropdown, check if name or phone matches existing customer
    if (!finalCustomerId && (trimmedName || trimmedPhone)) {
      const match = customers.find((c) =>
        (trimmedPhone && c.phone && c.phone === trimmedPhone) ||
        (trimmedName && c.name.toLowerCase() === trimmedName.toLowerCase())
      );

      if (match) {
        finalCustomerId = match.id;
      } else if (trimmedName) {
        // If not found in past records, save as new customer automatically!
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: trimmedName,
          phone: trimmedPhone || '',
          whatsappPhone: trimmedWhatsapp || undefined,
          address: finalAddress || undefined,
          notes: customCustomerNote.trim() || undefined,
          totalDue: 0,
          totalPurchased: 0,
          totalPaid: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onQuickAddCustomer(newCust);
        finalCustomerId = newCust.id;
      }
    }

    const selectedCust = customers.find((c) => c.id === finalCustomerId);
    const customerName = selectedCust 
      ? selectedCust.name 
      : (trimmedName || (orderType === 'online' ? 'অনলাইন কাস্টমার' : 'নগদ ক্রেতা'));
    const customerPhone = trimmedPhone || selectedCust?.phone || undefined;
    const customerWhatsapp = trimmedWhatsapp || selectedCust?.whatsappPhone || undefined;
    const resolvedAddress = finalAddress || (selectedCust?.address || '');

    return {
      id: `ord-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      date: new Date().toISOString(),
      orderType,
      customerId: finalCustomerId || undefined,
      customerName,
      customerPhone,
      customerWhatsapp,
      deliveryAddress: orderType === 'online' ? resolvedAddress : undefined,
      isDifferentRecipient: orderType === 'online' ? isDifferentRecipient : false,
      recipientName: orderType === 'online' && isDifferentRecipient ? recipientName.trim() : undefined,
      recipientPhone: orderType === 'online' && isDifferentRecipient ? recipientPhone.trim() : undefined,
      recipientAddress: orderType === 'online' && isDifferentRecipient ? recipientAddress.trim() : (orderType === 'online' ? resolvedAddress : undefined),
      courierName: orderType === 'online' ? courierName : undefined,
      items: cart,
      subtotal,
      discount,
      deliveryCharge: activeDeliveryCharge,
      tax: 0,
      grandTotal,
      paidAmount,
      dueAmount: orderType === 'store' ? dueAmount : 0,
      codAmount: orderType === 'online' ? codAmount : 0,
      appliedAdvance: appliedAdvanceAmount > 0 ? appliedAdvanceAmount : undefined,
      excessAdvanceAdded: excessPayment > 0 ? excessPayment : undefined,

      // কুরিয়ার সিওডি কর্তন ও ব্যাংকে নিট প্রাপ্য হিসাব
      courierDeliveryCost: orderType === 'online' ? activeDeliveryCharge : undefined,
      courierCodPercentage: orderType === 'online' && codAmount > 0 ? 1 : undefined,
      courierCodFee: orderType === 'online' && codAmount > 0 
        ? Math.max(1, Math.round(Math.max(0, codAmount - activeDeliveryCharge) * 0.01))
        : undefined,
      courierNetPayable: orderType === 'online' && codAmount > 0
        ? Math.max(0, codAmount - activeDeliveryCharge - Math.max(1, Math.round(Math.max(0, codAmount - activeDeliveryCharge) * 0.01)))
        : undefined,
      courierSettlementStatus: orderType === 'online' && codAmount > 0 ? 'pending' : undefined,

      paymentMethod,
      note: saleNote.trim() || undefined,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Checkout submission
  const handleCheckout = (status: OrderStatus = 'confirmed') => {
    if (cart.length === 0) {
      alert('অনুগ্রহ করে কার্টে পণ্য যোগ করুন!');
      return;
    }

    if (orderType === 'online' && !customCustomerPhone.trim() && !selectedCustomerId) {
      if (!confirm('সতর্কতা: অনলাইন কুরিয়ার অর্ডারের জন্য কাস্টমারের মোবাইল নম্বর দেওয়া জরুরি। নম্বর ছাড়াই সেভ করতে চান?')) {
        return;
      }
    }

    // Full Order Edit Mode Submission
    if (editingOrder && onUpdateOrder) {
      let finalCustomerId = selectedCustomerId;
      const trimmedName = customCustomerName.trim();
      const trimmedPhone = customCustomerPhone.trim();
      const trimmedWhatsapp = customCustomerWhatsapp.trim();
      const finalAddress = deliveryAddress.trim();

      const selectedCust = customers.find((c) => c.id === finalCustomerId);
      const customerName = selectedCust 
        ? selectedCust.name 
        : (trimmedName || (orderType === 'online' ? 'অনলাইন কাস্টমার' : 'নগদ ক্রেতা'));
      const customerPhone = trimmedPhone || selectedCust?.phone || undefined;
      const customerWhatsapp = trimmedWhatsapp || selectedCust?.whatsappPhone || undefined;
      const resolvedAddress = finalAddress || (selectedCust?.address || '');

      const updatedOrder: Order = {
        ...editingOrder,
        orderType,
        customerId: finalCustomerId || undefined,
        customerName,
        customerPhone,
        customerWhatsapp,
        deliveryAddress: orderType === 'online' ? resolvedAddress : undefined,
        isDifferentRecipient: orderType === 'online' ? isDifferentRecipient : false,
        recipientName: orderType === 'online' && isDifferentRecipient ? recipientName.trim() : undefined,
        recipientPhone: orderType === 'online' && isDifferentRecipient ? recipientPhone.trim() : undefined,
        recipientAddress: orderType === 'online' && isDifferentRecipient ? recipientAddress.trim() : (orderType === 'online' ? resolvedAddress : undefined),
        courierName: orderType === 'online' ? courierName : undefined,
        items: cart,
        subtotal,
        discount,
        deliveryCharge: activeDeliveryCharge,
        tax: 0,
        grandTotal,
        paidAmount,
        dueAmount: orderType === 'store' ? dueAmount : 0,
        codAmount: orderType === 'online' ? codAmount : 0,
        appliedAdvance: appliedAdvanceAmount > 0 ? appliedAdvanceAmount : undefined,
        excessAdvanceAdded: excessPayment > 0 ? excessPayment : undefined,

        // কুরিয়ার সিওডি কর্তন ও ব্যাংকে প্রাপ্য হিসাব
        courierDeliveryCost: orderType === 'online' ? activeDeliveryCharge : undefined,
        courierCodPercentage: orderType === 'online' && codAmount > 0 ? 1 : undefined,
        courierCodFee: orderType === 'online' && codAmount > 0 
          ? Math.max(1, Math.round(Math.max(0, codAmount - activeDeliveryCharge) * 0.01))
          : undefined,
        courierNetPayable: orderType === 'online' && codAmount > 0
          ? Math.max(0, codAmount - activeDeliveryCharge - Math.max(1, Math.round(Math.max(0, codAmount - activeDeliveryCharge) * 0.01)))
          : undefined,
        courierSettlementStatus: orderType === 'online' && codAmount > 0 ? (editingOrder.courierSettlementStatus || 'pending') : undefined,

        paymentMethod,
        note: saleNote.trim() || undefined,
        status,
        updatedAt: new Date().toISOString(),
      };

      onUpdateOrder(updatedOrder, editingOrder);

      // Reset local state
      setCart([]);
      setDiscount(0);
      setIsPaidManuallyTouched(false);
      setSaleNote('');
      setSelectedCustomerId('');
      setCustomCustomerName('');
      setCustomCustomerPhone('');
      setCustomCustomerWhatsapp('');
      setCustomCustomerNote('');
      setDeliveryAddress('');
      setIsDifferentRecipient(false);
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
      setIsCustomerDropdownOpen(false);
      setMobileCartOpen(false);
      return;
    }

    const newOrder = createOrderObject(status);
    onCompleteSale(newOrder);

    // Reset local state
    setCart([]);
    setDiscount(0);
    setIsPaidManuallyTouched(false);
    setSaleNote('');
    setSelectedCustomerId('');
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setCustomCustomerWhatsapp('');
    setCustomCustomerNote('');
    setDeliveryAddress('');
    setIsDifferentRecipient(false);
    setRecipientName('');
    setRecipientPhone('');
    setRecipientAddress('');
    setIsCustomerDropdownOpen(false);
    setMobileCartOpen(false);
  };

  // Send quote directly to WhatsApp
  const handleSendWhatsAppQuote = () => {
    if (cart.length === 0) {
      alert('কার্টে কোনো পণ্য নেই!');
      return;
    }

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    const phonePrimary = customCustomerPhone.trim() || selectedCust?.phone || '';
    const phoneWhatsapp = customCustomerWhatsapp.trim() || selectedCust?.whatsappPhone || '';
    const targetWhatsApp = resolveWhatsAppNumber(phoneWhatsapp, phonePrimary);
    const name = customCustomerName.trim() || selectedCust?.name || 'সম্মানিত গ্রাহক';

    const itemsText = cart
      .map((it, idx) => `${idx + 1}. ${it.productName} (${it.quantity} ${it.unit}) - ৳${it.total}`)
      .join('\n');

    const message = 
`*একদর ডট নেট (Ekdor.net)*
*অর্ডার ইনভয়েস কোটেশন*

প্রিয় ${name}, আপনার অর্ডারের বিল প্রস্তুত হয়েছে:
-----------------------------
${itemsText}
-----------------------------
পণ্য মূল্য: ৳${subtotal}
${discount > 0 ? `বিশেষ ছাড়: -৳${discount}\n` : ''}${orderType === 'online' ? `ডেলিভারি চার্জ: +৳${deliveryCharge} (${courierName})\n` : ''}*সর্বমোট প্রদেয়: ৳${grandTotal}*
${paidAmount > 0 ? `অগ্রিম জমা: ৳${paidAmount}\n` : ''}${orderType === 'online' && codAmount > 0 ? `*কুরিয়ারে ডেলিভারির সময় ক্যাশ অন ডেলিভারি (COD): ৳${codAmount}*\n` : ''}${deliveryAddress ? `ডেলিভারি ঠিকানা: ${deliveryAddress}\n` : ''}-----------------------------
অনুগ্রহ করে বিলটি দেখে অর্ডারটি কনফার্ম করুন। কনফার্ম করার পর পার্সেল কুরিয়ারে বুকিং দেওয়া হবে। ধন্যবাদ!`;

    const waUrl = createWhatsAppUrl(targetWhatsApp, message);
    window.open(waUrl, '_blank');

    // Also prompt to save as draft quote in system
    if (confirm('কাস্টমারকে হোয়াটসঅ্যাপে মেসেজ পাঠানো হয়েছে। আপনি কি এই বিলটি "ড্রাফট / কোটেশন" হিসেবে সেভ রাখতে চান? কাস্টমার কনফার্ম করলে পরে কনফার্ম করতে পারবেন।')) {
      handleCheckout('draft');
    }
  };

  return (
    <div id="pos-counter-view" className="space-y-3 pb-20 lg:pb-0">
      {/* Edit Mode Top Alert Banner */}
      {editingOrder && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold shrink-0">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-black">অর্ডার সংশোধন মোড (Order Edit Mode)</span>
                <span className="bg-black/20 text-amber-100 border border-white/20 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                  #{editingOrder.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                অর্ডারের পণ্যের পরিমাণ, দর, গ্রাহক বা পেমেন্ট পরিবর্তন করে নিচে "সংশোধন সংরক্ষণ করুন" বাটনে চাপুন।
              </p>
            </div>
          </div>

          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="self-end sm:self-center px-4 py-2 bg-white hover:bg-amber-50 text-amber-900 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            >
              সংশোধন বাতিল
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Product Catalog & Search (Span 7 or 8) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-3">
        {/* Top Controls: Search Bar & Barcode */}
        <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-pos-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="পণ্যের নাম, বাংলা নাম বা বারকোড দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Pill Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'সব পণ্য' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-60" />
              <p className="font-semibold text-slate-700 text-sm">কোনো পণ্য পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400 mt-1">অন্য কোনো নাম দিয়ে সার্চ করুন বা স্টকে নতুন পণ্য যোগ করুন</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const inCartItem = cart.find((i) => i.productId === product.id);
              const isLowStock = product.stockQty <= product.minStockAlert;
              const isOutOfStock = product.stockQty <= 0;

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  className={`bg-white rounded-xl p-3 border transition-all cursor-pointer select-none flex flex-col justify-between relative group ${
                    isOutOfStock
                      ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                      : inCartItem
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-emerald-400 hover:shadow-xs'
                  }`}
                >
                  {/* In-cart badge */}
                  {inCartItem && (
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
                      {inCartItem.quantity}
                    </span>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                        {product.category}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          স্টক শেষ
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {product.stockQty} বাকি
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">
                          স্টক: {product.stockQty} {product.unit}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug">
                      {product.banglaName || product.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block leading-none">বিক্রয়মূল্য</span>
                      <span className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                        ৳{product.sellingPrice}
                      </span>
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout Invoice (Span 5 or 4) */}
      <div
        className={`lg:col-span-5 xl:col-span-4 ${
          mobileCartOpen 
            ? 'fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 flex flex-col justify-end lg:static lg:p-0' 
            : 'hidden lg:block'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[90vh] max-h-[90vh] lg:h-[calc(100vh-100px)] lg:max-h-[850px] overflow-hidden lg:sticky lg:top-20">
          {/* Cart Header (Fixed Top) */}
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm">বিক্রয় কার্ট ও বিল</h3>
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {cart.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-rose-300 hover:text-rose-100 transition-colors"
                >
                  খালি করুন
                </button>
              )}
              {mobileCartOpen && (
                <button
                  type="button"
                  onClick={() => setMobileCartOpen(false)}
                  className="lg:hidden text-white/70 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Cart Content Area */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {/* Mode Switch: In-Store vs Online Courier Order */}
            <div className="p-2.5 bg-slate-100 border-b border-slate-200">
            <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setOrderType('store');
                  setPaymentMethod('cash');
                }}
                className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  orderType === 'store'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>দোকানে বিক্রি</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType('online');
                  setPaymentMethod('cod');
                }}
                className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  orderType === 'online'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>অনলাইন / কুরিয়ার</span>
              </button>
            </div>
          </div>

          {/* Customer Selection, Autocomplete & Dual Phone Input */}
          <div className="p-3 bg-slate-50/90 border-b border-slate-200 space-y-2.5 relative">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {orderType === 'online' ? 'কাস্টমার ও ডেলিভারি তথ্য' : 'গ্রাহক তথ্য ও বাকি খাতা'}
              </span>

              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomCustomerName('');
                    setCustomCustomerPhone('');
                    setCustomCustomerWhatsapp('');
                    setDeliveryAddress('');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  ক্লিয়ার / নতুন
                </button>
              )}
            </div>

            {/* If customer is selected from database, show active customer badge */}
            {selectedCustomerId ? (
              (() => {
                const selectedCust = customers.find((c) => c.id === selectedCustomerId);
                return (
                  <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-xs font-bold text-emerald-950">{selectedCust?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(selectedCust?.advanceBalance || 0) > 0 && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>জমা: ৳{selectedCust?.advanceBalance}</span>
                          </span>
                        )}
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          (selectedCust?.totalDue || 0) > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {(selectedCust?.totalDue || 0) > 0 ? `বাকি: ৳${selectedCust?.totalDue}` : 'বকেয়া নেই'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">১ম নম্বর (কল/বুকিং):</span>
                        <span className="font-semibold text-slate-800">{customCustomerPhone || selectedCust?.phone || 'নম্বর নেই'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">২য় নম্বর (হোয়াটসঅ্যাপ):</span>
                        <span className="font-semibold text-emerald-800">
                          {customCustomerWhatsapp || selectedCust?.whatsappPhone || `${customCustomerPhone || selectedCust?.phone || ''} (১ম নম্বর)`}
                        </span>
                      </div>
                    </div>

                    {(selectedCust?.advanceBalance || 0) > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-emerald-200/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-emerald-900 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          <span>অগ্রিম জমা ব্যালেন্স: ৳{selectedCust?.advanceBalance}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setApplyAdvance(!applyAdvance)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                            applyAdvance
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          {applyAdvance ? '✓ জমা সমন্বয় সক্রিয়' : 'জমা সমন্বয় বন্ধ'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* Customer search with autocomplete dropdown */
              <div className="relative" ref={customerSearchContainerRef}>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  কাস্টমারের নাম / ফোন লিখুন (পুরাতন হলে তালিকা আসবে):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customCustomerName}
                    onChange={(e) => {
                      setCustomCustomerName(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (customCustomerName.trim().length > 0) {
                        setIsCustomerDropdownOpen(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsCustomerDropdownOpen(false);
                      }
                    }}
                    placeholder="নাম, ফোন বা এলাকা লিখে খুঁজুন..."
                    className="w-full text-xs font-medium pl-8 pr-7 py-2 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {customCustomerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomCustomerName('');
                        setCustomCustomerPhone('');
                        setCustomCustomerWhatsapp('');
                        setCustomCustomerNote('');
                        setDeliveryAddress('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown List - ONLY shown when matching customers exist */}
                {isCustomerDropdownOpen && customCustomerName.trim().length > 0 && matchedCustomers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-600 flex items-center justify-between">
                      <span>পুরাতন কাস্টমার তালিকা থেকে বেছে নিন:</span>
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(false)}
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-0.5 text-[10px] font-medium"
                      >
                        <X className="w-3 h-3" /> বন্ধ
                      </button>
                    </div>
                    {matchedCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setCustomCustomerName(cust.name);
                          setCustomCustomerPhone(cust.phone || '');
                          setCustomCustomerWhatsapp(cust.whatsappPhone || '');
                          if (cust.address) setDeliveryAddress(cust.address);
                          setCustomCustomerNote(cust.notes || '');
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-emerald-50/90 cursor-pointer transition-colors text-left flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">{cust.name}</p>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-600">
                            <span>📞 কল: {cust.phone}</span>
                            {cust.whatsappPhone && (
                              <span className="text-emerald-700 font-medium">💬 WA: {cust.whatsappPhone}</span>
                            )}
                          </div>
                          {cust.address && (
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">📍 {cust.address}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {cust.totalDue > 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 block">
                              বাকি: ৳{cust.totalDue}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-600">ক্লিয়ার</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2 Phone Numbers: Primary (Booking/Call) & Secondary (WhatsApp) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  ১ম নম্বর (কল ও কুরিয়ার বুকিং):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customCustomerPhone}
                    onFocus={() => setIsCustomerDropdownOpen(false)}
                    onChange={(e) => setCustomCustomerPhone(e.target.value)}
                    placeholder="০১xxxxxxxxx (বুকিং নম্বর)"
                    className="w-full text-xs pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-800 mb-0.5 flex items-center justify-between">
                  <span>২য় নম্বর (হোয়াটসঅ্যাপ - ঐচ্ছিক):</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customCustomerWhatsapp}
                    onFocus={() => setIsCustomerDropdownOpen(false)}
                    onChange={(e) => setCustomCustomerWhatsapp(e.target.value)}
                    placeholder="হোয়াটসঅ্যাপ নম্বর (না থাকলে ১ম নম্বর)"
                    className="w-full text-xs pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 absolute left-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* If new customer, auto-save status notification */}
            {!selectedCustomerId && customCustomerName.trim() && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <UserPlus className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span className="text-[11px] font-semibold">
                    ✨ নতুন কাস্টমার হিসেবে স্বয়ংক্রিয়ভাবে খাতা ও তালিকায় সেভ হবে
                  </span>
                </div>
                {customCustomerPhone.trim() && (
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors cursor-pointer shrink-0"
                  >
                    এখনই সংরক্ষণ
                  </button>
                )}
              </div>
            )}

            {/* Online Delivery Address & Courier Selection */}
            {orderType === 'online' && (
              <div className="space-y-2 pt-1 border-t border-slate-200/80">
                {/* Toggle for different recipient / gift delivery */}
                <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDifferentRecipient}
                      onChange={(e) => setIsDifferentRecipient(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ক্রেতা ও প্রাপক আলাদা ব্যক্তি? (অন্যকে পাঠানো/উপহার)</span>
                    </span>
                  </label>
                  <p className="text-[10px] text-indigo-800/80 mt-0.5 ml-6">
                    অনলাইন ক্রেতা নিজে কিনে অন্যের কাছে পার্সেল পাঠালে প্রাপকের নাম, মোবাইল ও ঠিকানা লিখুন।
                  </p>
                </div>

                {isDifferentRecipient ? (
                  /* Separate Recipient Inputs */
                  <div className="p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-200 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-indigo-900 block">
                      পার্সেল প্রাপকের বিবরণ (Receiver Info):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          প্রাপকের নাম *
                        </label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="যার কাছে পার্সেল যাবে তার নাম"
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          প্রাপকের মোবাইল নম্বর *
                        </label>
                        <input
                          type="text"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="০১৭xxxxxxxx"
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                        প্রাপকের ডেলিভারি ঠিকানা *
                      </label>
                      <textarea
                        rows={2}
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="প্রাপকের পূর্ণাঙ্গ ঠিকানা (রোড/গ্রাম, উপজেলা, জেলা)..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  /* Normal Delivery Address */
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">ডেলিভারি ঠিকানা (২ লাইন):</label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onFocus={() => setIsCustomerDropdownOpen(false)}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="হোম ডেলিভারির পূর্ণাঙ্গ ঠিকানা (গ্রাম/রোড, এলাকা/উপজেলা, জেলা)..."
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">কুরিয়ার নির্বাচন:</label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full text-[11px] font-semibold bg-white border border-slate-200 rounded py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Steadfast Courier">Steadfast Courier (স্টেডফাস্ট)</option>
                    <option value="Pathao Courier">Pathao Courier (পাঠাও)</option>
                    <option value="RedX">RedX (রেডএক্স)</option>
                    <option value="সুন্দরবন কুরিয়ার">সুন্দরবন কুরিয়ার সার্ভিস</option>
                    <option value="এসএ পরিবহন">এসএ পরিবহন</option>
                    <option value="পেপারফ্লাই">পেপারফ্লাই (Paperfly)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Customer Note Field */}
            <div className="pt-1.5 border-t border-slate-200/80">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>কাস্টমার নোট (ঐচ্ছিক):</span>
                </span>
                {selectedCustomerId && customCustomerNote && (
                  <span className="text-[9px] text-amber-700 bg-amber-50 px-1 rounded font-medium border border-amber-200">
                    সংরক্ষিত নোট
                  </span>
                )}
              </label>
              <input
                id="input-pos-customer-note"
                type="text"
                value={customCustomerNote}
                onChange={(e) => setCustomCustomerNote(e.target.value)}
                placeholder="কাস্টমার সম্পর্কে যেকোনো বিশেষ নোট..."
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="p-3 space-y-2 divide-y divide-slate-100 bg-white">
            {cart.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-1 opacity-50" />
                <p className="text-xs font-medium">কার্ট এখনও খালি আছে</p>
                <p className="text-[11px] text-slate-400 mt-0.5">বামপাশের তালিকা থেকে পণ্য ক্লিক করুন</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="pt-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{item.productName}</p>
                    <p className="text-slate-500 text-[11px]">
                      ৳{item.unitPrice} × {item.quantity} {item.unit}
                    </p>
                  </div>

                  {/* Quantity Controller */}
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1 rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-slate-800 text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1 rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right w-16">
                    <p className="font-bold text-slate-900">৳{item.total}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Billing Breakdown */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between text-slate-600">
              <span>মোট পণ্যের মূল্য:</span>
              <span className="font-semibold text-slate-900">৳{subtotal}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">ছাড় (Discount):</span>
              <div className="flex items-center gap-1 w-20">
                <span className="text-slate-400 text-xs">৳</span>
                <MoneyInput
                  id="input-pos-discount"
                  min={0}
                  value={discount}
                  onChange={setDiscount}
                  placeholder="0"
                  className="w-full text-right px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Courier / Delivery Charge Input Box - ONLY for Online orders */}
            {orderType === 'online' && (
              <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>কুরিয়ার চার্জ (৳):</span>
                  </span>
                  <div className="flex items-center gap-1 w-24">
                    <span className="text-slate-400 text-xs">৳</span>
                    <MoneyInput
                      id="input-courier-charge"
                      min={0}
                      value={deliveryCharge}
                      onChange={setDeliveryCharge}
                      placeholder="0"
                      className="w-full text-right font-bold text-blue-700 px-2 py-0.5 bg-white border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center justify-end gap-1">
                  {[
                    { label: '৳০ (ফ্রি)', val: 0 },
                    { label: '৳৬০ (ঢাকা)', val: 60 },
                    { label: '৳১০০', val: 100 },
                    { label: '৳১২০ (দেশজুড়ে)', val: 120 },
                    { label: '৳১৫০', val: 150 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setDeliveryCharge(preset.val)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        deliveryCharge === preset.val
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grand Total & Advance Adjustment */}
            <div className="space-y-1 pt-1 border-t border-slate-200">
              {appliedAdvanceAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>পণ্যের মোট বিল:</span>
                    <span className="font-semibold text-slate-800">৳{grandTotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>অগ্রিম জমা থেকে সমন্বয়:</span>
                    </span>
                    <span>-৳{appliedAdvanceAmount}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center font-bold text-sm text-slate-900 pt-0.5">
                <span>সর্বমোট প্রদেয়:</span>
                <span className="text-base text-emerald-700">৳{netPayable}</span>
              </div>
            </div>

            {/* Payment Method selector */}
            <div className="pt-1.5">
              <span className="block text-[11px] font-bold text-slate-600 mb-1">
                {orderType === 'online' ? 'অগ্রিম গ্রহণ মাধ্যম:' : 'পেমেন্ট মাধ্যম:'}
              </span>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'cash', label: 'ক্যাশ', icon: Coins },
                  { id: 'qr', label: 'কিউআর', icon: QrCode },
                  { id: 'bkash', label: 'বিকাশ', icon: Smartphone },
                  { id: 'bank', label: 'ব্যাংক', icon: Building2 },
                  ...(orderType === 'store' ? [{ id: 'due', label: 'বাকি', icon: Clock }] : []),
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isActive = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(pm.id as PaymentMethod);
                        if (pm.id === 'due') {
                          setPaidAmount(0);
                          setIsPaidManuallyTouched(true);
                        } else if (orderType === 'store' && !isPaidManuallyTouched) {
                          setPaidAmount(netPayable);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mb-0.5" />
                      <span className="truncate max-w-full">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paid & Due / COD Breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  {orderType === 'online' ? 'অগ্রিম গ্রহণ (বিকাশ/নগদ):' : 'জমা / পরিশোধ (৳):'}
                </label>
                <MoneyInput
                  id="input-pos-paid-amount"
                  min={0}
                  value={paidAmount}
                  onChange={(val) => {
                    setPaidAmount(val);
                    setIsPaidManuallyTouched(true);
                  }}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  {orderType === 'online' ? 'কুরিয়ার কালেকশন (COD):' : 'বকেয়া / বাকি (৳):'}
                </label>
                <div className={`w-full px-2 py-1 rounded text-xs font-bold flex items-center justify-between border ${
                  orderType === 'online'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : dueAmount > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <span>{orderType === 'online' ? 'কুরিয়ার COD:' : dueAmount > 0 ? 'বাকি:' : 'পরিশোধ:'}</span>
                  <span>৳{orderType === 'online' ? codAmount : dueAmount}</span>
                </div>
              </div>

              {/* Excess Payment notification */}
              {excessPayment > 0 && (
                <div className="col-span-2 bg-emerald-50 border border-emerald-300 rounded-lg p-2 text-xs text-emerald-950 flex items-start gap-1.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      অতিরিক্ত জমা: ৳{excessPayment}
                    </span>
                    <span className="text-[10px] text-emerald-800 block">
                      বিলের অতিরিক্ত এই টাকা গ্রাহকের অ্যাকাউন্টে "অগ্রিম জমা" হিসেবে যুক্ত থাকবে এবং পরবর্তীতে সমন্বয় করা যাবে।
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* COD Courier Deduction & Bank Receivable Preview */}
            {orderType === 'online' && codAmount > 0 && (
              <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-blue-950 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>কুরিয়ার সিওডি কর্তন ও ব্যাংকে প্রাপ্য:</span>
                  </span>
                  <span className="text-[10px] bg-blue-200/70 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                    ১% সিওডি ফি
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-slate-600 border-t border-blue-100/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">কুরিয়ার কালেকশন</span>
                    <span className="font-bold text-slate-800">৳{codAmount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">কুরিয়ার চার্জ</span>
                    <span className="font-semibold text-rose-600">-৳{activeDeliveryCharge}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">১% সিওডি ফি</span>
                    <span className="font-semibold text-rose-600">
                      -৳{Math.max(1, Math.round(Math.max(0, codAmount - activeDeliveryCharge) * 0.01))}
                    </span>
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between font-bold text-blue-950 border-t border-blue-200/70 text-xs">
                  <span>ব্যাংকে জমা পাবেন (সিওডি বাকি):</span>
                  <span className="text-sm font-black text-blue-700">
                    ৳{Math.max(0, codAmount - activeDeliveryCharge - Math.max(1, Math.round(Math.max(0, codAmount - activeDeliveryCharge) * 0.01)))}
                  </span>
                </div>
              </div>
            )}

            {/* Order Note / Remarks */}
            <div className="pt-2 border-t border-slate-200/80">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-slate-400" />
                <span>অর্ডার নোট (ঐচ্ছিক):</span>
              </label>
              <input
                id="input-pos-order-note"
                type="text"
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                placeholder="যেমন: ভঙ্গুর পার্সেল, বিকেলে ডেলিভারি, জরুরি..."
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          </div>

          {/* PERMANENTLY PINNED BOTTOM CHECKOUT FOOTER (Always Visible & Accessible) */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-20">
            {/* Quick Grand Total & COD/Due summary */}
            <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-500 block leading-tight">সর্বমোট বিল ({cart.length} পণ্য):</span>
                <span className="text-lg font-black text-emerald-700">৳{grandTotal}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block leading-tight">
                  {orderType === 'online' ? 'কুরিয়ার COD' : (dueAmount > 0 ? 'বাকি' : 'পরিশোধ')}
                </span>
                <span className={`text-xs font-bold ${
                  orderType === 'online'
                    ? 'text-blue-700'
                    : dueAmount > 0
                    ? 'text-rose-600'
                    : 'text-emerald-700'
                }`}>
                  ৳{orderType === 'online' ? codAmount : (dueAmount > 0 ? dueAmount : paidAmount)}
                </span>
              </div>
            </div>

            {/* Order Status Selector */}
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-bold text-slate-700">অর্ডার স্ট্যাটাস:</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  orderStatus === 'confirmed'
                    ? 'bg-blue-100 text-blue-800'
                    : orderStatus === 'draft'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {orderStatus === 'confirmed' ? '✅ কনফার্মড' : orderStatus === 'draft' ? '⏳ পেন্ডিং/ড্রাফট' : '📦 প্রসেসিং'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setOrderStatus('confirmed')}
                  className={`py-1 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    orderStatus === 'confirmed'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>কনফার্মড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatus('draft')}
                  className={`py-1 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    orderStatus === 'draft'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>পেন্ডিং</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatus('processing')}
                  className={`py-1 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    orderStatus === 'processing'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <PackageCheck className="w-3 h-3" />
                  <span>প্রসেসিং</span>
                </button>
              </div>
            </div>

            {/* Main Submit Button */}
            <div className="pt-1">
              <button
                id="btn-confirm-sale"
                type="button"
                disabled={cart.length === 0}
                onClick={() => handleCheckout(orderStatus)}
                className={`w-full py-2.5 px-3 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm ${
                  editingOrder
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : orderStatus === 'confirmed'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : orderStatus === 'draft'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {editingOrder ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <Printer className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">
                  {editingOrder
                    ? `চালান #${editingOrder.invoiceNumber} সংশোধন সংরক্ষণ করুন`
                    : orderStatus === 'draft'
                    ? 'পেন্ডিং / ড্রাফট হিসেবে সেভ ও মেমো'
                    : orderStatus === 'processing'
                    ? 'প্রসেসিং হিসেবে সেভ ও মেমো'
                    : (orderType === 'online' ? 'অর্ডার কনফার্ম ও মেমো' : 'বিক্রি সম্পন্ন ও মেমো')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Floating Bottom Bar for Mobile View */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-lg z-40 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{cart.length} টি পণ্য ({orderType === 'online' ? 'অনলাইন' : 'দোকান'})</p>
          <p className="text-base font-bold text-slate-900">মোট: ৳{grandTotal}</p>
        </div>
        <button
          id="btn-mobile-cart-toggle"
          onClick={() => setMobileCartOpen(true)}
          className={`py-2 px-5 text-white font-bold text-sm rounded-xl shadow-xs flex items-center gap-2 ${
            editingOrder ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{editingOrder ? 'সংশোধন বিল' : 'বিল দেখুন'} ({cart.length})</span>
        </button>
      </div>
    </div>
  );
};
