import React, { useState } from 'react';
import { Product, Supplier, PurchaseInvoice, PurchaseItem, User } from '../../types';
import { storage } from '../../services/storageService';
import { 
  Truck, 
  Plus, 
  Search, 
  Calendar, 
  Building2, 
  Trash2, 
  Edit3, 
  Printer, 
  PackagePlus, 
  AlertCircle, 
  CheckCircle, 
  X, 
  DollarSign, 
  Gift, 
  Percent, 
  Receipt, 
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react';

interface PurchasingManagerProps {
  currentUser: User;
  onRefreshData: () => void;
}

export const PurchasingManager: React.FC<PurchasingManagerProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [products] = useState<Product[]>(storage.getProducts());
  const [suppliers, setSuppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(storage.getPurchases());

  // Search & Filter State in History
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'TODAY' | 'ALL' | 'CUSTOM'>('TODAY');
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Form State for new/edit purchase invoice
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [generatedInvNumber, setGeneratedInvNumber] = useState('');
  const [supplierInvNum, setSupplierInvNum] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [freightCost, setFreightCost] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  // Bonus: Cash or Goods
  const [bonusType, setBonusType] = useState<'NONE' | 'CASH' | 'GOODS'>('NONE');
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [bonusGoodsQuantity, setBonusGoodsQuantity] = useState<number>(0);
  const [bonusNotes, setBonusNotes] = useState('');

  const [paidNow, setPaidNow] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CREDIT');
  const [autoInsertStock, setAutoInsertStock] = useState<boolean>(true);

  // Product Selection & Search inside Invoice Form
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemUnit, setItemUnit] = useState<'CARTON' | 'PALLET' | 'PIECE'>('CARTON');
  const [itemQuantity, setItemQuantity] = useState<number>(10);
  const [itemCostPrice, setItemCostPrice] = useState<number>(100);
  const [itemBatch, setItemBatch] = useState<string>('');
  const [itemExpiry, setItemExpiry] = useState<string>('2027-08-31');

  // Items in active invoice
  const [invoiceItems, setInvoiceItems] = useState<PurchaseItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals
  const [isAddSuppModalOpen, setIsAddSuppModalOpen] = useState(false);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppType, setNewSuppType] = useState<'COMPANY' | 'WHOLESALER'>('COMPANY');
  const [newSuppPhone, setNewSuppPhone] = useState('');
  const [newSuppContact, setNewSuppContact] = useState('');
  const [newSuppOpeningBalance, setNewSuppOpeningBalance] = useState<number>(0);

  // Delete & Print Modals
  const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<PurchaseInvoice | null>(null);

  const reloadData = () => {
    setPurchases(storage.getPurchases());
    setSuppliers(storage.getSuppliers());
    onRefreshData();
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];

  // Auto-generate invoice number
  const generateNewInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PUR-${year}-${rand}`;
  };

  // Open modal for NEW purchase invoice
  const handleOpenNewInvoice = () => {
    setEditingInvoiceId(null);
    setGeneratedInvNumber(generateNewInvoiceNumber());
    setSupplierInvNum('');
    setInvoiceDate(todayStr);
    setSelectedSupplierId(suppliers[0]?.id || '');
    setFreightCost(0);
    setDiscountAmount(0);
    setBonusType('NONE');
    setBonusAmount(0);
    setBonusGoodsQuantity(0);
    setBonusNotes('');
    setPaidNow(0);
    setPaymentType('CREDIT');
    setAutoInsertStock(true);
    setInvoiceItems([]);
    setFormError(null);
    setProductSearchTerm('');
    setIsInvoiceModalOpen(true);
  };

  // Open modal for EDITING purchase invoice
  const handleOpenEditInvoice = (inv: PurchaseInvoice) => {
    setEditingInvoiceId(inv.id);
    setGeneratedInvNumber(inv.invoiceNumber);
    setSupplierInvNum(inv.supplierInvoiceNumber || '');
    setInvoiceDate(inv.date);
    setSelectedSupplierId(inv.supplierId);
    setFreightCost(inv.freightCost || 0);
    setDiscountAmount(inv.discountAmount || 0);
    setBonusType(inv.bonusType || 'NONE');
    setBonusAmount(inv.bonusAmount || 0);
    setBonusGoodsQuantity(inv.bonusGoodsQuantity || 0);
    setBonusNotes(inv.bonusNotes || '');
    setPaidNow(inv.paidAmount);
    setPaymentType(inv.paymentType);
    setAutoInsertStock(inv.isStockInserted);
    setInvoiceItems(inv.items);
    setFormError(null);
    setIsInvoiceModalOpen(true);
  };

  // Filtered Products for selected Supplier & Search term
  // Display products from selected supplier company/brand first
  const supplierProducts = products.filter(p => {
    if (!selectedSupplier) return true;
    const sName = selectedSupplier.name.toLowerCase();
    const pBrand = (p.brand || '').toLowerCase();
    return pBrand.includes(sName) || sName.includes(pBrand);
  });

  const availableProductsList = (supplierProducts.length > 0 ? supplierProducts : products).filter(p => {
    if (!productSearchTerm.trim()) return true;
    const q = productSearchTerm.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q));
  });

  // Calculate Subtotal and Net Total
  const itemsSubtotal = invoiceItems.reduce((sum, it) => sum + it.totalCost, 0);
  const invoiceNetCost = Math.max(0, itemsSubtotal - discountAmount + freightCost - (bonusType === 'CASH' ? bonusAmount : 0));

  // Add Item to Purchase Lines
  const handleAddLine = () => {
    setFormError(null);
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) {
      setFormError('يرجى اختيار الصنف أولاً');
      return;
    }

    if (itemQuantity <= 0) {
      setFormError('الكمية يجب أن تكون 1 على الأقل');
      return;
    }

    if (itemCostPrice <= 0) {
      setFormError('سعر الشراء يجب أن يكون أكبر من صفر');
      return;
    }

    const newLine: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      unit: itemUnit,
      quantity: itemQuantity,
      unitCost: itemCostPrice,
      totalCost: itemQuantity * itemCostPrice,
      batchNumber: itemBatch || undefined,
      expiryDate: itemExpiry || undefined,
    };

    setInvoiceItems([...invoiceItems, newLine]);
    setProductSearchTerm('');
  };

  const handleRemoveLine = (index: number) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLineCost = (index: number, newCost: number) => {
    setInvoiceItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          unitCost: newCost,
          totalCost: item.quantity * newCost,
        };
      }
      return item;
    }));
  };

  // Submit & Save Purchase Invoice
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (invoiceItems.length === 0) {
      setFormError('يرجى إضافة صنف واحد على الأقل للفاتورة قبل الحفظ والترحيل');
      return;
    }

    const supp = suppliers.find(s => s.id === selectedSupplierId);
    if (!supp) {
      setFormError('يرجى تحديد المورد أو تاجر الجملة');
      return;
    }

    const actualPaid = paymentType === 'CASH' ? invoiceNetCost : paidNow;
    const remaining = Math.max(0, invoiceNetCost - actualPaid);

    // If editing, delete previous record first to recalculate cleanly
    if (editingInvoiceId) {
      storage.deletePurchaseInvoice(editingInvoiceId);
    }

    const newPurchase: PurchaseInvoice = {
      id: editingInvoiceId || `purch-${Date.now()}`,
      invoiceNumber: generatedInvNumber || generateNewInvoiceNumber(),
      supplierInvoiceNumber: supplierInvNum || undefined,
      date: invoiceDate,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      supplierId: supp.id,
      supplierName: supp.name,
      supplierType: supp.type,
      items: invoiceItems,
      subtotal: itemsSubtotal,
      discountAmount,
      freightCost,
      bonusType,
      bonusAmount: bonusType === 'CASH' ? bonusAmount : undefined,
      bonusGoodsQuantity: bonusType === 'GOODS' ? bonusGoodsQuantity : undefined,
      bonusNotes: bonusNotes || undefined,
      totalCost: invoiceNetCost,
      paidAmount: actualPaid,
      remainingAmount: remaining,
      paymentType,
      previousSupplierBalance: supp.currentBalance,
      newSupplierBalance: supp.currentBalance + remaining,
      isStockInserted: autoInsertStock,
    };

    const res = storage.postPurchaseInvoice(newPurchase);
    if (!res.success) {
      setFormError(res.error || 'فشل في حفظ فاتورة الشراء');
      return;
    }

    setIsInvoiceModalOpen(false);
    reloadData();
  };

  // Handle Delete Purchase
  const handleDeletePurchase = (inv: PurchaseInvoice) => {
    setInvoiceToDelete(inv);
  };

  const confirmDeletePurchase = () => {
    if (!invoiceToDelete) return;
    const res = storage.deletePurchaseInvoice(invoiceToDelete.id);
    if (res.success) {
      setInvoiceToDelete(null);
      reloadData();
    }
  };

  // Handle Insert to Stock (1-click for draft purchases)
  const handleInsertIntoStock = (inv: PurchaseInvoice) => {
    const res = storage.insertPurchaseIntoStock(inv.id);
    if (res.success) {
      reloadData();
    }
  };

  // Handle Add New Supplier
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const newSupplier: Supplier = {
      id: `s-${Date.now()}`,
      code: `SUP-${Math.floor(10 + Math.random() * 90)}`,
      name: newSuppName,
      type: newSuppType,
      phone: newSuppPhone || '-',
      contactPerson: newSuppContact || '-',
      openingBalance: newSuppOpeningBalance,
      currentBalance: newSuppOpeningBalance,
      paymentTermsDays: newSuppType === 'WHOLESALER' ? 3 : 15,
    };

    storage.saveSupplier(newSupplier);
    setSuppliers(storage.getSuppliers());
    setSelectedSupplierId(newSupplier.id);
    setIsAddSuppModalOpen(false);
    setNewSuppName('');
    setNewSuppPhone('');
    setNewSuppContact('');
    setNewSuppOpeningBalance(0);
    reloadData();
  };

  // Filter Purchase Records in History
  const filteredPurchases = purchases.filter(p => {
    // 1. Date filter (Default: TODAY)
    if (dateFilterMode === 'TODAY' && p.date !== todayStr) return false;
    if (dateFilterMode === 'CUSTOM') {
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;
    }

    // 2. Company / Supplier search
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase().trim();
      return (
        p.supplierName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        (p.supplierInvoiceNumber && p.supplierInvoiceNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header with Quick Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>توريدات ومشتريات البضاعة والشركات</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            تسجيل فواتير الشراء بوحدات الجملة والكرتونة، الخصومات والبونص، والبحث بالفترة واسم الشركة مع إمكانية التعديل والحذف والطباعة.
          </p>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddSuppModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>+ إضافة شركة / تاجر جملة</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewInvoice}
            className="btn-primary-accessible min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black px-5 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>+ فاتورة شراء وتوريد بضاعة جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar: Default Today, Period from/to, and Company Name */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Company Name Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="بحث في سجل المشتريات باسم الشركة أو رقم الفاتورة..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Date Filter Modes: TODAY (Default) | ALL | CUSTOM */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setDateFilterMode('TODAY')}
              className={`text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                dateFilterMode === 'TODAY' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              📅 فواتير اليوم (افتراضي)
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('ALL')}
              className={`text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                dateFilterMode === 'ALL' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              كل الفواتير
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('CUSTOM')}
              className={`text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                dateFilterMode === 'CUSTOM' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              بحث بالفترة 🔍
            </button>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {dateFilterMode === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>تحديد الفترة:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => { setStartDate(todayStr); setEndDate(todayStr); }}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer mr-2"
            >
              اليوم
            </button>
          </div>
        )}
      </div>

      {/* Purchases History Table with Print, Edit, Delete, Stock Insert */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
          <span>سجل فواتير الشراء المستلمة ({filteredPurchases.length} فاتورة)</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            إجمالي تكلفة المشتريات المعروضة: {filteredPurchases.reduce((s, p) => s + p.totalCost, 0).toLocaleString()} ج.م
          </span>
        </div>

        <div className="overflow-x-auto min-h-[220px]">
          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium space-y-2">
              <Truck className="w-10 h-10 mx-auto text-slate-400" />
              <p className="font-bold text-sm">لا توجد فواتير شراء تطابق معايير البحث الحالية.</p>
              <p className="text-[11px]">يمكنك الضغط على زر &quot;كل الفواتير&quot; أو إضافة فاتورة شراء جديدة.</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <th className="py-3 px-3">رقم الفاتورة</th>
                  <th className="py-3 px-3">التاريخ</th>
                  <th className="py-3 px-3">المورد / الشركة</th>
                  <th className="py-3 px-3">الأصناف</th>
                  <th className="py-3 px-3">إجمالي الفاتورة</th>
                  <th className="py-3 px-3">المديونية السابقة</th>
                  <th className="py-3 px-3">المدفوع نقداً</th>
                  <th className="py-3 px-3">المديونية بعد الفاتورة</th>
                  <th className="py-3 px-3 text-center">المخزن</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">{p.invoiceNumber}</span>
                      {p.supplierInvoiceNumber && (
                        <span className="text-[10px] text-slate-500 block">ورقي: {p.supplierInvoiceNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">{p.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <span>{p.supplierName}</span>
                      <span className={`text-[10px] mr-1 px-1.5 py-0.5 rounded font-medium ${
                        p.supplierType === 'WHOLESALER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {p.supplierType === 'WHOLESALER' ? 'جملة' : 'شركة'}
                      </span>
                    </td>
                    <td className="py-3 px-3">{p.items.length} صنف</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {p.totalCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {(p.previousSupplierBalance || 0).toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {p.paidAmount.toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {(p.newSupplierBalance || ((p.previousSupplierBalance || 0) + p.remainingAmount)).toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.isStockInserted ? (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-300 dark:border-emerald-800">
                          ✓ مدرجة بالمخزن
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInsertIntoStock(p)}
                          className="text-[10px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-lg font-bold border border-amber-300 dark:border-amber-700 cursor-pointer flex items-center gap-1 mx-auto"
                          title="انقر لإدراج بضاعة الفاتورة بالمخزن الآن"
                        >
                          <PackagePlus className="w-3 h-3" />
                          <span>إدراج بالمخزن</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInvoiceToPrint(p)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                          title="عرض وطباعة فاتورة الشراء"
                        >
                          <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditInvoice(p)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                          title="تعديل فاتورة الشراء"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(p)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                          title="حذف الفاتورة مع خصم بضاعتها من المخزن وإلغاء مديونية المورد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* NEW / EDIT PURCHASE INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-3xl w-full shadow-2xl text-right my-6 transition-colors max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{editingInvoiceId ? 'تعديل فاتورة شراء بضاعة' : 'تسجيل فاتورة شراء بضاعة جديدة للمخزن'}</span>
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="mt-4 space-y-4 text-xs">
              {/* Row 1: Supplier, Auto Invoice Number, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">المورد / الشركة المنتجة أو تاجر الجملة:</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type === 'WHOLESALER' ? 'تاجر جملة' : 'شركة منتجة'}) — مديونية: {s.currentBalance.toLocaleString()} ج.م
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">رقم الفاتورة التلقائي:</label>
                  <input
                    type="text"
                    readOnly
                    value={generatedInvNumber}
                    className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-emerald-600 dark:text-emerald-400 font-mono font-black"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">رقم الفاتورة الورقية المطبوعة (اختياري):</label>
                  <input
                    type="text"
                    value={supplierInvNum}
                    onChange={(e) => setSupplierInvNum(e.target.value)}
                    placeholder="مثال: EDT-8912 أو RJB-44"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* PRODUCT ADDITION ROW: Auto products for selected supplier, Search by name, Unit selection (Pallet, Carton, Piece) */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-white block">
                    إضافة أصناف للشحنة (تعرض أصناف المورد أولاً مع البحث السريع بالاسم):
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    أصناف محفوظة للمورد: {supplierProducts.length} صنف
                  </span>
                </div>

                {/* Search Product by Name */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="ابحث باسم الصنف أو الكود بعد اختيار المورد..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-slate-600 dark:text-slate-400 block text-[11px] mb-1 font-semibold">الصنف المختار:</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) {
                          if (itemUnit === 'CARTON') setItemCostPrice(p.costPricePerCarton);
                          else if (itemUnit === 'PALLET') setItemCostPrice(p.costPricePerCarton * 20);
                          else setItemCostPrice(p.costPricePerBase);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold"
                    >
                      {availableProductsList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand || 'عام'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Selector: Wholesale (Pallet) / Carton / Small Unit (Piece) */}
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block text-[11px] mb-1 font-semibold">وحدة الشراء:</label>
                    <select
                      value={itemUnit}
                      onChange={(e) => {
                        const u = e.target.value as 'CARTON' | 'PALLET' | 'PIECE';
                        setItemUnit(u);
                        const p = products.find(prod => prod.id === selectedProductId);
                        if (p) {
                          if (u === 'CARTON') setItemCostPrice(p.costPricePerCarton);
                          else if (u === 'PALLET') setItemCostPrice(p.costPricePerCarton * 20);
                          else setItemCostPrice(p.costPricePerBase);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold"
                    >
                      <option value="CARTON">📦 كرتونة</option>
                      <option value="PALLET">🏗️ بالتة جملة</option>
                      <option value="PIECE">🍬 قطعة / علبة</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block text-[11px] mb-1 font-semibold">الكمية:</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block text-[11px] mb-1 font-semibold">سعر شراء الوحدة:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={itemCostPrice}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => setItemCostPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-center"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      + إضافة للفاتورة
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {invoiceItems.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="p-2.5">الصنف</th>
                        <th className="p-2.5 text-center">الوحدة</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5 text-center">سعر الشراء الفعلي</th>
                        <th className="p-2.5 text-left">الإجمالي</th>
                        <th className="p-2.5 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {invoiceItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{it.productName}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                              {it.unit === 'CARTON' ? 'كرتونة' : it.unit === 'PALLET' ? 'بالتة' : 'قطعة'}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={it.unitCost}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onFocus={(e) => (e.target as HTMLInputElement).select()}
                              onChange={(e) => handleUpdateLineCost(idx, parseFloat(e.target.value) || 0)}
                              className="w-20 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-center text-xs"
                            />
                            <span className="text-[10px] text-slate-500 mr-1">ج</span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-left">
                            {it.totalCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="حذف هذا الصنف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Discounts & Bonus & Freight Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">خصم الفاتورة (ج.م):</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-rose-600 dark:text-rose-400 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">نوع البونص المقدم:</label>
                  <select
                    value={bonusType}
                    onChange={(e) => setBonusType(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="NONE">بدون بونص</option>
                    <option value="CASH">💰 بونص نقدي (يضاف للأرباح ويخفض المستحق)</option>
                    <option value="GOODS">📦 بونص بضاعة (كمية مجانية تضاف للمخزن)</option>
                  </select>
                </div>

                {bonusType === 'CASH' && (
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">قيمة البونص النقدي (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      value={bonusAmount}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-emerald-600 dark:text-emerald-400 font-bold font-mono"
                    />
                  </div>
                )}

                {bonusType === 'GOODS' && (
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">كمية بونص البضاعة المجانية (كرتونة):</label>
                    <input
                      type="number"
                      min="1"
                      value={bonusGoodsQuantity}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => setBonusGoodsQuantity(parseInt(e.target.value) || 1)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-emerald-600 dark:text-emerald-400 font-bold font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Payment Details & Debt Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-100 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">طريقة السداد للمورد:</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="CREDIT">آجل على حساب مديونية المورد</option>
                    <option value="CASH">نقدي فوري بالكامل من الدرج</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">المدفوع نقداً الآن من الدرج:</label>
                  <input
                    type="number"
                    min="0"
                    max={invoiceNetCost}
                    disabled={paymentType === 'CASH'}
                    value={paymentType === 'CASH' ? invoiceNetCost : paidNow}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => setPaidNow(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-emerald-600 dark:text-emerald-400 font-bold font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={autoInsertStock}
                      onChange={(e) => setAutoInsertStock(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>إدراج البضاعة فوراً في رصيد المخزن</span>
                  </label>
                </div>
              </div>

              {/* Debt overview box */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-slate-500 block">إجمالي الفاتورة قبل المديونية:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{invoiceNetCost.toLocaleString()} ج.م</span>
                </div>
                <div>
                  <span className="text-slate-500 block">المديونية السابقة للمورد:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">{(selectedSupplier?.currentBalance || 0).toLocaleString()} ج.م</span>
                </div>
                <div>
                  <span className="text-slate-500 block">المسدد نقداً:</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{(paymentType === 'CASH' ? invoiceNetCost : paidNow).toLocaleString()} ج.م</span>
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-400 font-bold block">المديونية بعد طلب الفاتورة:</span>
                  <span className="font-mono font-black text-amber-600 text-sm">
                    {((selectedSupplier?.currentBalance || 0) + (paymentType === 'CASH' ? 0 : Math.max(0, invoiceNetCost - paidNow))).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary-accessible min-h-[48px] px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow-lg shadow-emerald-950/20"
                >
                  {autoInsertStock ? 'حفظ وتوريد البضاعة للمخزن' : 'حفظ كمسودة شراء دون إدراج بالمخزن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE PURCHASE VOUCHER MODAL */}
      {invoiceToPrint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs font-bold text-white print:hidden">
              <span>معاينة وطباعة سند فاتورة الشراء</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة</span>
                </button>
                <button onClick={() => setInvoiceToPrint(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-white text-black font-mono text-xs select-text">
              <div className="text-center pb-3 border-b-2 border-black">
                <h3 className="text-base font-black font-sans">مؤسسة البركة لتوزيع المواد الغذائية</h3>
                <p className="text-[10px]">سند استلام وتوريد مشتريات بضاعة</p>
                <p className="text-xs font-bold mt-1">فاتورة شراء رقم: {invoiceToPrint.invoiceNumber}</p>
                {invoiceToPrint.supplierInvoiceNumber && (
                  <p className="text-[10px]">رقم الفاتورة الورقية للمورد: {invoiceToPrint.supplierInvoiceNumber}</p>
                )}
              </div>

              <div className="py-2.5 border-b border-dashed border-black text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>اسم الشركة / المورد:</span>
                  <span className="font-bold font-sans">{invoiceToPrint.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span>{invoiceToPrint.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة السداد:</span>
                  <span>{invoiceToPrint.paymentType === 'CASH' ? 'نقدي فوري من الخزينة' : 'آجل على الحساب'}</span>
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-right text-[10px] my-2 border-b border-black">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">الصنف</th>
                    <th className="py-1 text-center">الوحدة</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-center">السعر</th>
                    <th className="py-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceToPrint.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-dotted border-gray-300">
                      <td className="py-1 font-sans font-bold">{it.productName}</td>
                      <td className="py-1 text-center">{it.unit === 'CARTON' ? 'كرتونة' : it.unit === 'PALLET' ? 'بالتة' : 'قطعة'}</td>
                      <td className="py-1 text-center">{it.quantity}</td>
                      <td className="py-1 text-center">{it.unitCost.toFixed(2)}</td>
                      <td className="py-1 text-left">{it.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Debt & Financials Summary as explicitly requested */}
              <div className="bg-gray-100 p-2.5 rounded border border-gray-400 space-y-1 text-[11px] my-2">
                <div className="flex justify-between">
                  <span>إجمالي الفاتورة قبل المديونية:</span>
                  <span className="font-bold">{invoiceToPrint.totalCost.toFixed(2)} ج.م</span>
                </div>
                {invoiceToPrint.discountAmount > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>الخصم الممنوح:</span>
                    <span>- {invoiceToPrint.discountAmount.toFixed(2)} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>المديونية السابقة للمورد:</span>
                  <span className="font-bold">{(invoiceToPrint.previousSupplierBalance || 0).toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>المبلغ المسدد نقداً:</span>
                  <span className="font-bold">{invoiceToPrint.paidAmount.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-black pt-1 font-black text-xs">
                  <span>المديونية بعد طلب الفاتورة:</span>
                  <span>{(invoiceToPrint.newSupplierBalance || 0).toFixed(2)} ج.م</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between text-[10px] text-gray-600">
                <div>توقيع أمين المخزن: .................</div>
                <div>توقيع مندوب التوريد: .................</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {invoiceToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <h3 className="font-black text-base text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5" />
              <span>تأكيد حذف فاتورة الشراء</span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              هل أنت متأكد من حذف فاتورة الشراء رقم <strong>({invoiceToDelete.invoiceNumber})</strong> من المورد <strong>({invoiceToDelete.supplierName})</strong>؟
              <br />
              {invoiceToDelete.isStockInserted && (
                <span className="text-rose-600 dark:text-rose-400 font-bold block mt-2">
                  ⚠️ تنبيه: الفاتورة مدرجة في المخزن، وسيتم تلقائياً خصم كميات جميع الأصناف من رصيد المخزن الموحد وإلغاء مديونية المورد!
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeletePurchase}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                تأكيد الحذف والخصم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER / WHOLESALER MODAL WITH OPENING BALANCE */}
      {isAddSuppModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>إضافة شركة منتجة أو تاجر جملة جديد</span>
              </h3>
              <button onClick={() => setIsAddSuppModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">اسم الشركة أو تاجر الجملة:</label>
                <input
                  type="text"
                  required
                  value={newSuppName}
                  onChange={(e) => setNewSuppName(e.target.value)}
                  placeholder="مثال: شركة مونجيني، تاجر جملة الأصدقاء..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">نوع جهة التوريد:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSuppType('COMPANY')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition-colors ${
                      newSuppType === 'COMPANY' ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🏢 شركة / مصنع
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSuppType('WHOLESALER')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition-colors ${
                      newSuppType === 'WHOLESALER' ? 'bg-amber-600 text-white border-amber-500 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🏪 تاجر جملة
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">المندوب المسؤول:</label>
                  <input
                    type="text"
                    value={newSuppContact}
                    onChange={(e) => setNewSuppContact(e.target.value)}
                    placeholder="اسم المندوب"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={newSuppPhone}
                    onChange={(e) => setNewSuppPhone(e.target.value)}
                    placeholder="010..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">الرصيد الافتتاحي للمورد (مستحقات سابقة ج.م):</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newSuppOpeningBalance}
                  onChange={(e) => setNewSuppOpeningBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-rose-600 dark:text-rose-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">يُسجل كرصيد افتتاحي مستحق للمورد في بداية النظام.</span>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddSuppModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md"
                >
                  حفظ الجهة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
