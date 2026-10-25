import React, { useState, useEffect, useRef } from 'react';
import { Product, Customer, InvoiceLineItem, SalesInvoice, User } from '../../types';
import { storage } from '../../services/storageService';
import { 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  Printer,
  AlertCircle, 
  UserPlus, 
  Package, 
  TrendingUp, 
  Coins, 
  AlertTriangle, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Store, 
  RefreshCw,
  Building2,
  Tag
} from 'lucide-react';

interface PosSalesProps {
  currentUser: User;
  onInvoiceCreated: (invoice: SalesInvoice, shouldPrint?: boolean) => void;
  onOpenCustomerModal: () => void;
  editingInvoice?: SalesInvoice | null;
  onCancelEdit?: () => void;
}

export const PosSales: React.FC<PosSalesProps> = ({
  currentUser,
  onInvoiceCreated,
  onOpenCustomerModal,
  editingInvoice,
  onCancelEdit,
}) => {
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.permissions?.canViewProfits;

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Invoice Customer & Customer Search State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);

  // Invoice Items
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  
  // Discount: Amount or Percent
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT' | 'SPLIT'>('CASH');
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  
  // Catalog Search & Category Filter
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');
  const [catalogBrand, setCatalogBrand] = useState<string>('ALL');

  // Barcode & Alerts
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [negativeStockWarning, setNegativeStockWarning] = useState<string | null>(null);

  // Profit Masking State (Password-like masked by default for managers)
  const [showProfitNumber, setShowProfitNumber] = useState<boolean>(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    const prods = storage.getProducts();
    const custs = storage.getCustomers();
    setProducts(prods);
    setCustomers(custs);
    if (!selectedCustomerId && custs.length > 0) {
      const cashCust = custs.find(c => c.priceTier === 'RETAIL') || custs[0];
      setSelectedCustomerId(cashCust.id);
    }
  };

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();

    // If editing existing invoice
    if (editingInvoice) {
      setSelectedCustomerId(editingInvoice.customerId);
      setItems(editingInvoice.items);
      setDiscountType(editingInvoice.discountType || 'AMOUNT');
      setDiscountValue(editingInvoice.discountValue || 0);
      setPaymentType(editingInvoice.paymentType);
      setCustomPaidAmount(editingInvoice.paidAmount);
      setNotes(editingInvoice.notes || '');
    }
  }, [editingInvoice]);

  // Global Keyboard Shortcuts for F9 (Save) and F10 (Save & Print)
  useEffect(() => {
    const handlePosKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleSaveInvoice(false);
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleSaveInvoice(true);
      }
    };
    window.addEventListener('keydown', handlePosKeyDown);
    return () => window.removeEventListener('keydown', handlePosKeyDown);
  }, [items, selectedCustomerId, discountType, discountValue, paymentType, customPaidAmount, notes, products, customers]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // Direct Walk-in / Store Customer Check (عميل المحل المباشر يكون كاش فقط)
  const isDirectStoreCustomer = Boolean(
    selectedCustomer && 
    (selectedCustomer.priceTier === 'RETAIL' || 
     selectedCustomer.name.includes('نقدي') || 
     selectedCustomer.name.includes('المحل') ||
     !selectedCustomer.isCreditAllowed)
  );

  // Auto enforce Cash for direct store customer
  useEffect(() => {
    if (isDirectStoreCustomer && paymentType !== 'CASH') {
      setPaymentType('CASH');
    }
  }, [isDirectStoreCustomer, paymentType]);

  // Filtered Customers based on Search
  const filteredCustomers = customers.filter(c => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.area.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  // Distinct Brands and Categories for Catalog Filters
  const distinctBrands = ['ALL', ...Array.from(new Set(products.map(p => p.brand).filter(Boolean)))];
  const distinctCategories = ['ALL', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Helper to calculate default price per customer tier
  const getDefaultPrice = (product: Product, unit: 'CARTON' | 'PIECE', customer?: Customer) => {
    const tier = customer?.priceTier || 'WHOLESALE';
    if (unit === 'CARTON') {
      if (tier === 'HALF_WHOLESALE') return product.halfWholesalePricePerCarton;
      if (tier === 'RETAIL') return product.retailPricePerBase * product.piecesPerWholesaleUnit;
      return product.wholesalePricePerCarton;
    } else {
      if (tier === 'RETAIL') return product.retailPricePerBase;
      if (tier === 'HALF_WHOLESALE') return Math.round((product.halfWholesalePricePerCarton / product.piecesPerWholesaleUnit) * 100) / 100;
      return Math.round((product.wholesalePricePerCarton / product.piecesPerWholesaleUnit) * 100) / 100;
    }
  };

  // Add Item to Invoice from Unified Warehouse Catalog
  const addItemToInvoice = (
    product: Product, 
    unit: 'CARTON' | 'PIECE' = 'CARTON', 
    qty: number = 1,
    customPrice?: number
  ) => {
    setErrorMessage(null);

    const defaultPrice = getDefaultPrice(product, unit, selectedCustomer);
    const finalUnitPrice = customPrice !== undefined && customPrice !== null ? customPrice : defaultPrice;
    const piecesPerUnit = unit === 'CARTON' ? product.piecesPerWholesaleUnit : 1;
    const requiredPieces = qty * piecesPerUnit;

    const currentInCartPieces = items
      .filter(it => it.productId === product.id)
      .reduce((sum, it) => sum + it.piecesCount, 0);

    const resultingStock = product.stockPieces - (currentInCartPieces + requiredPieces);
    if (resultingStock < 0) {
      setNegativeStockWarning(
        `تنبيه صرف بالسالب: رصيد الصنف (${product.name}) بالمخزن حالياً ${product.stockPieces} قطعة، وسيصبح رصيد المخزن بالسالب (${resultingStock} قطعة).`
      );
    }

    const unitCost = unit === 'CARTON' ? product.costPricePerCarton : product.costPricePerBase;
    const existingIndex = items.findIndex(it => it.productId === product.id && it.unit === unit);

    if (existingIndex >= 0) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + qty;
      const newPieces = newQty * piecesPerUnit;
      const lineTotal = newQty * updated[existingIndex].unitPrice;
      const lineCost = newPieces * product.costPricePerBase;

      updated[existingIndex].quantity = newQty;
      updated[existingIndex].piecesCount = newPieces;
      updated[existingIndex].totalPrice = lineTotal;
      updated[existingIndex].lineProfit = lineTotal - lineCost;
      setItems(updated);
    } else {
      const lineTotal = qty * finalUnitPrice;
      const lineCost = requiredPieces * product.costPricePerBase;

      const newItem: InvoiceLineItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        unit,
        unitLabel: unit === 'CARTON' ? `${product.wholesaleUnit} (${product.piecesPerWholesaleUnit} قطعة)` : product.baseUnit,
        quantity: qty,
        piecesCount: requiredPieces,
        unitPrice: finalUnitPrice,
        defaultUnitPrice: defaultPrice,
        costPrice: unitCost,
        totalPrice: lineTotal,
        discount: 0,
        lineProfit: lineTotal - lineCost,
      };
      setItems([...items, newItem]);
    }
  };

  // Barcode Fast Input Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const foundProduct = products.find(
      p => p.barcode === barcodeInput.trim() || p.cartonBarcode === barcodeInput.trim() || p.code === barcodeInput.trim()
    );

    if (foundProduct) {
      const isCarton = foundProduct.cartonBarcode === barcodeInput.trim();
      addItemToInvoice(foundProduct, isCarton ? 'CARTON' : 'PIECE', 1);
      setBarcodeInput('');
    } else {
      setErrorMessage(`الباركود / الكود (${barcodeInput}) غير مسجل في بطاقة الأصناف.`);
    }
  };

  // Modify Item Price
  const updateItemPrice = (index: number, newPrice: number) => {
    const updated = [...items];
    const item = updated[index];
    const product = products.find(p => p.id === item.productId);
    const costPerBase = product ? product.costPricePerBase : 0;
    const totalLineCost = item.piecesCount * costPerBase;

    item.unitPrice = Math.max(0, newPrice);
    item.totalPrice = item.quantity * item.unitPrice;
    item.lineProfit = item.totalPrice - totalLineCost;
    setItems(updated);
  };

  const restoreDefaultPrice = (index: number) => {
    const updated = [...items];
    const item = updated[index];
    updateItemPrice(index, item.defaultUnitPrice);
  };

  // Modify Item Quantity (Minimum is 1; never deletes on quantity decrement)
  const updateItemQuantity = (index: number, newQty: number) => {
    const safeQty = Math.max(1, newQty);
    const updated = [...items];
    const item = updated[index];
    const product = products.find(p => p.id === item.productId);
    const piecesPerUnit = item.unit === 'CARTON' ? (product?.piecesPerWholesaleUnit || 1) : 1;
    const newPieces = safeQty * piecesPerUnit;
    const costPerBase = product ? product.costPricePerBase : 0;
    const totalLineCost = newPieces * costPerBase;

    item.quantity = safeQty;
    item.piecesCount = newPieces;
    item.totalPrice = safeQty * item.unitPrice;
    item.lineProfit = item.totalPrice - totalLineCost;

    if (product && product.stockPieces - newPieces < 0) {
      setNegativeStockWarning(`تنبيه: سيتم الخصم بالسالب للصنف (${product.name}). المتاح بالمخزن: ${product.stockPieces} قطعة.`);
    }

    setItems(updated);
  };

  // Toggle Item Unit (Carton <-> Piece)
  const toggleItemUnit = (index: number) => {
    const item = items[index];
    const product = products.find(p => p.id === item.productId);
    if (!product) return;

    const nextUnit: 'CARTON' | 'PIECE' = item.unit === 'CARTON' ? 'PIECE' : 'CARTON';
    const defaultPrice = getDefaultPrice(product, nextUnit, selectedCustomer);
    const piecesPerUnit = nextUnit === 'CARTON' ? product.piecesPerWholesaleUnit : 1;
    const newPieces = item.quantity * piecesPerUnit;
    const lineTotal = item.quantity * defaultPrice;
    const lineCost = newPieces * product.costPricePerBase;

    const updated = [...items];
    updated[index].unit = nextUnit;
    updated[index].unitLabel = nextUnit === 'CARTON' ? `${product.wholesaleUnit} (${product.piecesPerWholesaleUnit} قطعة)` : product.baseUnit;
    updated[index].unitPrice = defaultPrice;
    updated[index].defaultUnitPrice = defaultPrice;
    updated[index].piecesCount = newPieces;
    updated[index].totalPrice = lineTotal;
    updated[index].lineProfit = lineTotal - lineCost;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);

  let discountAmount = 0;
  if (discountType === 'PERCENT') {
    discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }

  const total = Math.max(0, subtotal - discountAmount);

  // Total Cost & Total Invoice Profit (for operator screen only, NEVER printed!)
  const totalCost = items.reduce((sum, it) => {
    const prod = products.find(p => p.id === it.productId);
    return sum + (it.piecesCount * (prod?.costPricePerBase || 0));
  }, 0);

  const totalProfit = Math.round((total - totalCost) * 100) / 100;
  const profitMarginPercent = total > 0 ? Math.round((totalProfit / total) * 1000) / 10 : 0;

  let paidAmount = total;
  let remainingAmount = 0;

  if (paymentType === 'CREDIT') {
    paidAmount = 0;
    remainingAmount = total;
  } else if (paymentType === 'SPLIT') {
    paidAmount = Math.min(customPaidAmount, total);
    remainingAmount = Math.max(0, total - paidAmount);
  }

  const previousCustomerBalance = selectedCustomer?.currentBalance || 0;
  const newCustomerBalance = previousCustomerBalance + remainingAmount;

  // Filter Catalog Products
  const filteredCatalogProducts = products.filter(p => {
    if (!p.isActive) return false;
    if (catalogBrand !== 'ALL' && p.brand !== catalogBrand) return false;
    if (catalogCategory !== 'ALL' && p.category !== catalogCategory) return false;
    if (!catalogSearchQuery.trim()) return true;
    const q = catalogSearchQuery.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.barcode.includes(q);
  });

  // Post / Update Invoice
  const handleSaveInvoice = (shouldPrint: boolean) => {
    if (items.length === 0) {
      setErrorMessage('لا يمكن حفظ فاتورة فارغة. يرجى إضافة أصناف أولاً.');
      return;
    }

    if (!selectedCustomer) {
      setErrorMessage('يرجى تحديد العميل المستلم للفاتورة.');
      return;
    }

    const now = new Date();
    const invoiceNum = editingInvoice ? editingInvoice.invoiceNumber : `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoiceData: SalesInvoice = {
      id: editingInvoice ? editingInvoice.id : `inv-${Date.now()}`,
      invoiceNumber: invoiceNum,
      date: editingInvoice ? editingInvoice.date : now.toISOString().split('T')[0],
      time: editingInvoice ? editingInvoice.time : now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      salespersonId: currentUser.id,
      salespersonName: currentUser.fullName,
      items,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      total,
      paidAmount,
      remainingAmount,
      paymentType,
      previousCustomerBalance,
      newCustomerBalance,
      totalCost,
      totalProfit,
      notes,
      hasNegativeStockItem: items.some(it => {
        const prod = products.find(p => p.id === it.productId);
        return prod && prod.stockPieces < it.piecesCount;
      }),
      status: editingInvoice ? 'MODIFIED' : 'POSTED',
    };

    if (editingInvoice) {
      const res = storage.updateSalesInvoice(invoiceData);
      if (!res.success) {
        setErrorMessage(res.error || 'حدث خطأ أثناء تعديل الفاتورة');
        return;
      }
    } else {
      const res = storage.postSalesInvoice(invoiceData);
      if (!res.success) {
        setErrorMessage(res.error || 'حدث خطأ أثناء حفظ الفاتورة');
        return;
      }
    }

    onInvoiceCreated(invoiceData, shouldPrint);

    // Reset Form
    setItems([]);
    setDiscountValue(0);
    setPaymentType('CASH');
    setCustomPaidAmount(0);
    setNotes('');
    setNegativeStockWarning(null);
    loadData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" dir="rtl">
      {/* Editing Banner */}
      {editingInvoice && (
        <div className="lg:col-span-12 bg-amber-50 dark:bg-amber-950/80 border-2 border-amber-500 p-4 rounded-2xl flex items-center justify-between text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3 text-sm md:text-base font-black">
            <RotateCcw className="w-5 h-5 animate-spin" />
            <span>أنت الآن في وضع تعديل الفاتورة رقم ({editingInvoice.invoiceNumber}) — العميل: {editingInvoice.customerName}</span>
          </div>
          {onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      )}

      {/* LEFT / CENTER: Active Invoice Basket (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Customer Header Card with Live Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="w-full sm:w-2/3 relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>العميل / المحل المستلم:</span>
                  {isDirectStoreCustomer && (
                    <span className="text-[11px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-300 dark:border-amber-700">
                      عميل المحل المباشر (نقدي فقط)
                    </span>
                  )}
                </label>
              </div>

              {/* Customer Search & Select Box */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="ابحث باسم العميل أو المحل أو التليفون..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl pr-9 pl-3 py-2.5 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                  {/* Dropdown suggestions */}
                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto z-40 divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center font-medium">لا يوجد عميل مطابق للبحث</div>
                      ) : (
                        filteredCustomers.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearchQuery(c.name);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className={`p-2.5 text-xs text-right cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex justify-between items-center transition-colors ${
                              selectedCustomerId === c.id ? 'bg-emerald-50/80 dark:bg-emerald-950/60 font-black' : ''
                            }`}
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block text-sm">{c.name}</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                {c.phone} {c.area ? `• ${c.area}` : ''}
                              </span>
                            </div>
                            <div className="text-left font-mono">
                              {c.currentBalance > 0 ? (
                                <span className="text-amber-700 dark:text-amber-400 font-bold block">{c.currentBalance.toLocaleString()} ج مديونية</span>
                              ) : (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold block">رصيد 0 ✓</span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {c.priceTier === 'RETAIL' ? 'قطاعي (كاش)' : c.priceTier === 'HALF_WHOLESALE' ? 'نصف جملة' : 'جملة'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenCustomerModal}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 rounded-xl cursor-pointer"
                  title="إضافة عميل جديد"
                >
                  <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </button>
              </div>
            </div>

            {/* Customer Balances Status */}
            {selectedCustomer && (
              <div className="w-full sm:w-1/3 bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">المديونية السابقة:</span>
                  <span className="font-black text-amber-700 dark:text-amber-400 font-mono text-sm">{previousCustomerBalance.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">الحد الائتماني:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {selectedCustomer.creditLimit ? `${selectedCustomer.creditLimit.toLocaleString()} ج.م` : 'بدون سقف'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barcode Fast Scan Input */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm transition-colors">
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute right-3.5 top-3" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                onFocus={(e) => e.target.select()}
                placeholder="امسح الباركود أو اكتب الكود السريع واضغط Enter لإضافته فوراً..."
                className="w-full min-h-[46px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-11 pl-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="min-h-[46px] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 py-2 rounded-xl cursor-pointer shadow-sm transition-colors"
            >
              إضافة
            </button>
          </form>
        </div>

        {/* Negative Stock Warning Alert */}
        {negativeStockWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/90 border-2 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 text-sm p-3.5 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-pulse">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold">{negativeStockWarning}</span>
            </div>
            <button onClick={() => setNegativeStockWarning(null)} className="text-amber-700 dark:text-amber-400 hover:underline p-1 cursor-pointer font-bold">✕</button>
          </div>
        )}

        {/* General Error Message */}
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-sm p-3.5 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-bold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-700 dark:text-rose-400 hover:underline p-1 cursor-pointer font-bold">✕</button>
          </div>
        )}

        {/* Invoice Items Table (WITH INTERNAL SCROLL SYSTEM) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100">أصناف الفاتورة ({items.length} صنف)</h3>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setItems([])}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>تفريغ الفاتورة</span>
              </button>
            )}
          </div>

          {/* Internal Scroll System for Invoice Items */}
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-10 text-center text-slate-500 dark:text-slate-400 space-y-2">
                <Store className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">الفاتورة فارغة حالياً</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  اختر أي صنف من كتالوج المخزن الموحد على اليسار لإضافته مباشرة للفاتورة
                </p>
              </div>
            ) : (
              <table className="w-full text-right text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold z-10 shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-2 text-center">الوحدة</th>
                    <th className="py-2.5 px-2 text-center">الكمية</th>
                    <th className="py-2.5 px-3">سعر الوحدة</th>
                    <th className="py-2.5 px-3">الإجمالي</th>
                    <th className="py-2.5 px-2 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((item, index) => {
                    const prod = products.find(p => p.id === item.productId);
                    const isBelowZero = prod && prod.stockPieces < item.piecesCount;
                    const isCustomPrice = item.unitPrice !== item.defaultUnitPrice;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-100 transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-black text-slate-900 dark:text-white text-sm">{item.productName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.productCode}</span>
                            {/* Purchase Cost for Operator only (never printed!) */}
                            {isAdmin && (
                              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-medium">
                                تكلفة الشراء: {item.costPrice} ج
                              </span>
                            )}
                            {isBelowZero && (
                              <span className="text-xs bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800 font-bold">
                                صرف بالسالب (المتاح: {prod?.stockPieces} ق)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleItemUnit(index)}
                            className="text-xs font-bold px-2 py-1 rounded-lg border bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-emerald-500 cursor-pointer"
                            title="انقر للتبديل بين الكرتونة والقطعة"
                          >
                            {item.unit === 'CARTON' ? 'كرتونة' : 'قطعة'} 🔄
                          </button>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(index, Math.max(1, item.quantity - 1))}
                              className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 font-black cursor-pointer"
                              title="إنقاص الكمية (الحد الأدنى 1)"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-sm font-black text-slate-900 dark:text-white py-1"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(index, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 font-black cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={item.unitPrice}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                              className={`w-24 bg-slate-50 dark:bg-slate-950 border rounded-lg px-2 py-1 text-sm font-mono font-black ${
                                isCustomPrice ? 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30' : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                              }`}
                            />
                            <span className="text-xs text-slate-500 font-bold">ج</span>
                            {isCustomPrice && (
                              <button
                                type="button"
                                onClick={() => restoreDefaultPrice(index)}
                                className="text-slate-500 hover:text-emerald-600 p-0.5 cursor-pointer"
                                title="استعادة السعر الافتراضي"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          {item.totalPrice.toFixed(2)} ج.م
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="حذف الصنف من الفاتورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Checkout & Summary Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-4">
            {/* Payment & Discount Config Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Payment Type */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-bold">طريقة السداد:</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentType('CASH')}
                    className={`py-2 text-xs rounded-lg font-bold border transition-all cursor-pointer ${
                      paymentType === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    نقدي
                  </button>
                  <button
                    type="button"
                    disabled={isDirectStoreCustomer}
                    onClick={() => !isDirectStoreCustomer && setPaymentType('CREDIT')}
                    className={`py-2 text-xs rounded-lg font-bold border transition-all ${
                      isDirectStoreCustomer
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                        : paymentType === 'CREDIT'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm cursor-pointer'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer'
                    }`}
                    title={isDirectStoreCustomer ? 'عميل المحل المباشر نقدي فقط' : ''}
                  >
                    آجل
                  </button>
                  <button
                    type="button"
                    disabled={isDirectStoreCustomer}
                    onClick={() => {
                      if (!isDirectStoreCustomer) {
                        setPaymentType('SPLIT');
                        setCustomPaidAmount(Math.round(total / 2));
                      }
                    }}
                    className={`py-2 text-xs rounded-lg font-bold border transition-all ${
                      isDirectStoreCustomer
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                        : paymentType === 'SPLIT'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm cursor-pointer'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer'
                    }`}
                  >
                    مختلط
                  </button>
                </div>
              </div>

              {/* Discount selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-600 dark:text-slate-400 font-bold">الخصم:</label>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType('AMOUNT')}
                      className={`px-2 py-0.5 rounded cursor-pointer font-bold ${discountType === 'AMOUNT' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                      ج.م
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('PERCENT')}
                      className={`px-2 py-0.5 rounded cursor-pointer font-bold ${discountType === 'PERCENT' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono font-black"
                  />
                  <span className="absolute left-3 top-2 text-slate-500 text-xs font-bold">
                    {discountType === 'PERCENT' ? '%' : 'ج.م'}
                  </span>
                </div>
              </div>

              {/* Split payment or subtotal */}
              {paymentType === 'SPLIT' ? (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-bold">المدفوع نقداً الآن:</label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    value={customPaidAmount}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCustomPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 font-black focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs block font-bold">المجموع قبل الخصم:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 text-base font-black">{subtotal.toFixed(2)} ج.م</span>
                </div>
              )}
            </div>

            {/* MANAGER ONLY PROFIT BOX (Password-like masked by default with Eye toggle!) */}
            {isAdmin && (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/40 rounded-xl p-3 flex items-center justify-between text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-black text-slate-900 dark:text-slate-200">
                    ربحية الفاتورة (للمدير فقط — لا تظهر للعميل أو في الطباعة):
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                    {showProfitNumber ? (
                      <span>+{totalProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م ({profitMarginPercent}%)</span>
                    ) : (
                      <span className="tracking-widest text-lg font-mono">••••••••</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfitNumber(!showProfitNumber)}
                    className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 cursor-pointer"
                    title={showProfitNumber ? 'إخفاء الربحية' : 'إظهار الرقم السري للربحية'}
                  >
                    {showProfitNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Net Total, Debt Info & Dual Save Buttons (Save & Save+Print) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">إجمالي الفاتورة الصافي:</span>
                <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                  <span className="text-sm text-slate-500 dark:text-slate-400 mr-1.5">ج.م</span>
                </span>
              </div>

              {/* Debt overview */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex gap-4 justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">المديونية السابقة:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{previousCustomerBalance.toLocaleString()} ج.م</span>
                </div>
                <div className="flex gap-4 justify-between text-amber-700 dark:text-amber-400 font-black">
                  <span>المديونية بعد الفاتورة:</span>
                  <span className="font-mono text-sm">{newCustomerBalance.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* DUAL ACTION BUTTONS: F9 (Save Only) & F10 (Save & Print) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSaveInvoice(false)}
                  disabled={items.length === 0}
                  className={`btn-primary-accessible min-h-[52px] px-5 cursor-pointer text-sm font-black rounded-xl flex items-center gap-2 ${
                    items.length === 0
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-slate-700 hover:bg-slate-600 text-white shadow-md'
                  }`}
                  title="حفظ الفاتورة دون طباعة (اختصار F9)"
                >
                  <Save className="w-5 h-5" />
                  <span>حفظ فقط (F9)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveInvoice(true)}
                  disabled={items.length === 0}
                  className={`btn-primary-accessible min-h-[52px] px-6 cursor-pointer text-sm md:text-base font-black rounded-xl flex items-center gap-2 shadow-lg ${
                    items.length === 0
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-900/40'
                  }`}
                  title="حفظ وطباعة الفاتورة (اختصار F10)"
                >
                  <Printer className="w-5 h-5" />
                  <span>حفظ وطباعة (F10)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Direct Interactive Unified Warehouse Catalog (5 cols) */}
      <div className="lg:col-span-5 space-y-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>كتالوج أصناف المخزن الموحد</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {filteredCatalogProducts.length} صنف متاح
            </span>
          </div>

          {/* Search Input for Products */}
          <div className="relative mt-2.5">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={catalogSearchQuery}
              onChange={(e) => setCatalogSearchQuery(e.target.value)}
              placeholder="ابحث باسم الصنف (شيبسي، لوكس...) أو الكود أو الباركود..."
              className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Brand & Category Filter Selectors */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <select
              value={catalogBrand}
              onChange={(e) => setCatalogBrand(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1.5 font-bold"
            >
              <option value="ALL">كل الشركات والمصانع</option>
              {distinctBrands.filter(b => b !== 'ALL').map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={catalogCategory}
              onChange={(e) => setCatalogCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1.5 font-bold"
            >
              <option value="ALL">كل التصنيفات</option>
              {distinctCategories.filter(c => c !== 'ALL').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Product Items List (Click to add carton or piece) */}
          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredCatalogProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                لا توجد أصناف مطابقة للبحث في المخزن
              </div>
            ) : (
              filteredCatalogProducts.map(prod => {
                const cartons = Math.floor(prod.stockPieces / prod.piecesPerWholesaleUnit);
                const remPieces = prod.stockPieces % prod.piecesPerWholesaleUnit;
                const cartonPrice = getDefaultPrice(prod, 'CARTON', selectedCustomer);
                const piecePrice = getDefaultPrice(prod, 'PIECE', selectedCustomer);
                const isNegative = prod.stockPieces < 0;
                const isLow = prod.stockPieces <= prod.reorderLevelPieces;

                return (
                  <div
                    key={prod.id}
                    className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-3 rounded-xl text-xs flex flex-col justify-between transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{prod.name}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {prod.brand} • {prod.wholesaleUnit} = {prod.piecesPerWholesaleUnit} قطعة
                        </span>
                        {/* Operator purchase cost hint */}
                        {isAdmin && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-mono">
                            (تكلفة شراء: {prod.costPricePerCarton} ج/كرتونة)
                          </span>
                        )}
                      </div>

                      {/* Available Stock in Single Warehouse */}
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans font-bold">رصيد المخزن:</span>
                        <span className={`font-black text-xs ${
                          isNegative ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {cartons} كرتونة {remPieces !== 0 ? `(${remPieces} ق)` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Quick Add Buttons: Carton & Piece */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => addItemToInvoice(prod, 'CARTON', 1)}
                        className="bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs py-2 rounded-lg font-black cursor-pointer transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ كرتونة ({cartonPrice} ج)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addItemToInvoice(prod, 'PIECE', 1)}
                        className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-xs py-2 rounded-lg font-black cursor-pointer transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ قطعة ({piecePrice} ج)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
