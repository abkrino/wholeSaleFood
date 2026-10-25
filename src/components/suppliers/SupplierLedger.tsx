import React, { useState } from 'react';
import { Supplier, User, CashMovement, PurchaseInvoice } from '../../types';
import { storage } from '../../services/storageService';
import { 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  UserCheck, 
  ArrowDownCircle, 
  AlertCircle, 
  AlertTriangle,
  X, 
  Calendar, 
  Printer, 
  Trash2, 
  Edit3, 
  FileText, 
  CreditCard, 
  HelpCircle,
  Clock,
  CheckCircle
} from 'lucide-react';

interface SupplierLedgerProps {
  currentUser: User;
  onRefreshData: () => void;
}

export const SupplierLedger: React.FC<SupplierLedgerProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'PAYMENTS'>('ACCOUNTS');
  const [suppliers, setSuppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Payment Logs Filters
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  // Payment Modal (سند صرف) State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(1000);
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Negative Cash / Funding Source Inquiry Modal State
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingSource, setFundingSource] = useState('سلفة شخصية من المدير لتسوية الوردية');
  const [customFundingNote, setCustomFundingNote] = useState('');

  // Add / Edit Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [suppName, setSuppName] = useState('');
  const [suppType, setSuppType] = useState<'COMPANY' | 'WHOLESALER'>('COMPANY');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppTermsDays, setSuppTermsDays] = useState<number>(15);
  const [suppOpeningBalance, setSuppOpeningBalance] = useState<number>(0);

  // Edit Payment Modal State
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<CashMovement | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editPaymentNotes, setEditPaymentNotes] = useState('');

  // Delete Modals
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<CashMovement | null>(null);

  // Statement Modal State (كشف حساب المورد)
  const [statementData, setStatementData] = useState<{
    supplier: Supplier;
    purchases: PurchaseInvoice[];
    payments: CashMovement[];
  } | null>(null);

  // Print Payment Voucher Modal
  const [paymentToPrint, setPaymentToPrint] = useState<CashMovement | null>(null);

  const reloadData = () => {
    setSuppliers(storage.getSuppliers());
    onRefreshData();
  };

  const currentCashInDrawer = storage.calculateCurrentCashInDrawer();

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.contactPerson.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  // All supplier payments
  const allSupplierPayments = storage.getSupplierPayments();

  // Filtered payments by company name and date range
  const filteredPayments = allSupplierPayments.filter(m => {
    if (paymentStartDate && m.date < paymentStartDate) return false;
    if (paymentEndDate && m.date > paymentEndDate) return false;
    if (paymentSearchQuery.trim()) {
      const q = paymentSearchQuery.toLowerCase().trim();
      return (
        (m.supplierName && m.supplierName.toLowerCase().includes(q)) ||
        m.description.toLowerCase().includes(q) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Open Payment Modal
  const openPayModal = (s: Supplier) => {
    setSelectedSupplierId(s.id);
    setPayAmount(s.currentBalance > 0 ? s.currentBalance : 1000);
    setPayNotes('');
    setPayError(null);
    setShowFundingModal(false);
    setIsPayModalOpen(true);
  };

  // Check drawer cash before payment
  const handlePaymentInitialCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);

    if (payAmount <= 0) {
      setPayError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    // Check if drawer has enough cash
    if (currentCashInDrawer < payAmount) {
      // Show negative cash funding source inquiry modal!
      setShowFundingModal(true);
    } else {
      executeSupplierPayment(false, '');
    }
  };

  // Execute Supplier Payment with or without negative cash
  const executeSupplierPayment = (allowNegative: boolean, sourceDescription: string) => {
    const finalNotes = sourceDescription 
      ? `${payNotes ? payNotes + ' • ' : ''}مصدر السحب بالسالب: [${sourceDescription}]`
      : payNotes;

    let fundingEnum: 'DRAWER' | 'PERSONAL_LOAN' | 'DRAWER_NEGATIVE' | 'OTHER' = 'DRAWER';
    if (allowNegative) {
      if (sourceDescription.includes('سلفة') || sourceDescription.includes('شخصية')) {
        fundingEnum = 'PERSONAL_LOAN';
      } else if (sourceDescription.includes('سحب مباشر بالسالب')) {
        fundingEnum = 'DRAWER_NEGATIVE';
      } else {
        fundingEnum = 'OTHER';
      }
    }

    const res = storage.recordSupplierPayment({
      supplierId: selectedSupplierId,
      amount: payAmount,
      notes: finalNotes,
      paidBy: currentUser.fullName,
      allowNegativeCash: allowNegative,
      fundingSource: fundingEnum,
    });

    if (!res.success) {
      setPayError(res.error || 'فشل في تسجيل سند الصرف');
      return;
    }

    setShowFundingModal(false);
    setIsPayModalOpen(false);
    setPayNotes('');
    reloadData();
  };

  // Open Add Supplier Modal
  const openAddSupplierModal = () => {
    setEditingSupplierId(null);
    setSuppName('');
    setSuppType('COMPANY');
    setSuppPhone('');
    setSuppContact('');
    setSuppTermsDays(15);
    setSuppOpeningBalance(0);
    setIsSupplierModalOpen(true);
  };

  // Open Edit Supplier Modal
  const openEditSupplierModal = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setSuppName(s.name);
    setSuppType(s.type);
    setSuppPhone(s.phone);
    setSuppContact(s.contactPerson);
    setSuppTermsDays(s.paymentTermsDays);
    setSuppOpeningBalance(s.openingBalance || 0);
    setIsSupplierModalOpen(true);
  };

  // Save Supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim()) return;

    if (editingSupplierId) {
      const existing = suppliers.find(s => s.id === editingSupplierId)!;
      const updated: Supplier = {
        ...existing,
        name: suppName.trim(),
        type: suppType,
        phone: suppPhone.trim() || '-',
        contactPerson: suppContact.trim() || '-',
        paymentTermsDays: suppTermsDays,
        openingBalance: suppOpeningBalance,
      };
      storage.saveSupplier(updated);
    } else {
      const newSupplier: Supplier = {
        id: `s-${Date.now()}`,
        code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
        name: suppName.trim(),
        type: suppType,
        phone: suppPhone.trim() || '-',
        contactPerson: suppContact.trim() || '-',
        paymentTermsDays: suppTermsDays,
        openingBalance: suppOpeningBalance,
        currentBalance: suppOpeningBalance, // يبدأ الرصيد بالرصيد الافتتاحي
      };
      storage.saveSupplier(newSupplier);
    }

    setIsSupplierModalOpen(false);
    reloadData();
  };

  // Delete Supplier
  const confirmDeleteSupplier = () => {
    if (!supplierToDelete) return;
    const res = storage.deleteSupplier(supplierToDelete.id);
    if (res.success) {
      setSupplierToDelete(null);
      reloadData();
    }
  };

  // View Supplier Statement
  const openStatement = (supplierId: string) => {
    const data = storage.getSupplierStatement(supplierId);
    if (data) {
      setStatementData(data);
    }
  };

  // Open Edit Payment Modal
  const openEditPayment = (payment: CashMovement) => {
    setPaymentToEdit(payment);
    setEditPaymentAmount(payment.amount);
    setEditPaymentNotes(payment.description || '');
    setIsEditPaymentModalOpen(true);
  };

  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentToEdit || editPaymentAmount <= 0) return;

    const res = storage.updateSupplierPayment(paymentToEdit.id, editPaymentAmount, editPaymentNotes);
    if (res.success) {
      setIsEditPaymentModalOpen(false);
      setPaymentToEdit(null);
      reloadData();
    }
  };

  // Delete Payment
  const confirmDeletePayment = () => {
    if (!paymentToDelete) return;
    const res = storage.deleteSupplierPayment(paymentToDelete.id);
    if (res.success) {
      setPaymentToDelete(null);
      reloadData();
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <span>حسابات الشركات والموردين وسندات الصرف</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            متابعة مستحقات شركات التوزيع وتجار الجملة، وسندات الصرف مع السحب بالسالب، وسجل الدفعات مع التعديل والحذف والطباعة.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-4 py-2 rounded-xl text-xs text-right">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">إجمالي المستحقات للموردين:</span>
            <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-base">
              {totalSupplierPayables.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>

          <button
            type="button"
            onClick={openAddSupplierModal}
            className="btn-primary-accessible min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة مورد / شركة</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation: Accounts vs Payments History */}
      <div className="flex gap-2 border-b border-slate-300 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'ACCOUNTS'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/20 font-black'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>كشف حسابات ومستحقات الموردين ({suppliers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'PAYMENTS'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/20 font-black'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>سجل دفعات وسندات الصرف ({allSupplierPayments.length})</span>
        </button>
      </div>

      {/* TAB 1: SUPPLIERS ACCOUNTS */}
      {activeTab === 'ACCOUNTS' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الشركة أو المندوب أو الكود..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                    <th className="py-3 px-3">كود المورد</th>
                    <th className="py-3 px-3">اسم الشركة / المصنع</th>
                    <th className="py-3 px-3">النوع</th>
                    <th className="py-3 px-3">المندوب المسؤول</th>
                    <th className="py-3 px-3">رقم الهاتف</th>
                    <th className="py-3 px-3">الرصيد الافتتاحي</th>
                    <th className="py-3 px-3">المستحق له (ج.م)</th>
                    <th className="py-3 px-3 text-center">إجراءات الحساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">{s.code}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          s.type === 'WHOLESALER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {s.type === 'WHOLESALER' ? 'تاجر جملة' : 'شركة منتجة'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.contactPerson}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-mono">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {(s.openingBalance || 0).toLocaleString()} ج.م
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                        {s.currentBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Payment Voucher Button */}
                          <button
                            type="button"
                            onClick={() => openPayModal(s)}
                            className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                            title="إصدار سند صرف نقدية للمورد"
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" />
                            <span>سند صرف</span>
                          </button>

                          {/* Print & View Statement Button */}
                          <button
                            type="button"
                            onClick={() => openStatement(s.id)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            title="عرض وطباعة كشف حساب المورد"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>كشف حساب</span>
                          </button>

                          {/* Edit Supplier */}
                          <button
                            type="button"
                            onClick={() => openEditSupplierModal(s)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="تعديل بيانات المورد"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Supplier */}
                          <button
                            type="button"
                            onClick={() => setSupplierToDelete(s)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 cursor-pointer"
                            title="حذف المورد"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS LOGS (سجل الدفعات) with Search by Company, Date Range, Edit, Delete */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-4">
          {/* Filters Bar: Search by Company & Date Range */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={paymentSearchQuery}
                  onChange={(e) => setPaymentSearchQuery(e.target.value)}
                  placeholder="بحث في سجل الدفعات باسم الشركة أو الملاحظات..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentStartDate(todayStr); setPaymentEndDate(todayStr); }}
                  className="text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                >
                  دفعات اليوم
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentStartDate(''); setPaymentEndDate(''); }}
                  className="text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                >
                  عرض الكل
                </button>
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>البحث بالفترة من - إلى:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">من:</span>
                <input
                  type="date"
                  value={paymentStartDate}
                  onChange={(e) => setPaymentStartDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">إلى:</span>
                <input
                  type="date"
                  value={paymentEndDate}
                  onChange={(e) => setPaymentEndDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Payments Table with Edit, Delete, Print */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>سجل الدفعات النقدية للموردين ({filteredPayments.length} حركة دفع)</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                إجمالي المدفوع: {filteredPayments.reduce((s, m) => s + m.amount, 0).toLocaleString()} ج.م
              </span>
            </div>

            <div className="overflow-x-auto min-h-[220px]">
              {filteredPayments.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs">
                  لا توجد حركات دفع مسجلة مطابقة لمعايير البحث.
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                      <th className="py-2.5 px-3">التاريخ والوقت</th>
                      <th className="py-2.5 px-3">الشركة / المورد</th>
                      <th className="py-2.5 px-3">المبلغ المسدد (ج.م)</th>
                      <th className="py-2.5 px-3">مصدر السداد والبيان</th>
                      <th className="py-2.5 px-3">المسؤول</th>
                      <th className="py-2.5 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredPayments.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                        <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                          {m.date} — {m.time}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {m.supplierName || 'مورد عام'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                          {m.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {m.description}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {m.performedBy}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Print voucher */}
                            <button
                              type="button"
                              onClick={() => setPaymentToPrint(m)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                              title="طباعة سند الصرف"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </button>
                            {/* Edit payment */}
                            <button
                              type="button"
                              onClick={() => openEditPayment(m)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 cursor-pointer"
                              title="تعديل مبلغ الدفعة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete payment */}
                            <button
                              type="button"
                              onClick={() => setPaymentToDelete(m)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="حذف سند الصرف وإعادة المبلغ لمستحقات المورد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* PAYMENT VOUCHER MODAL */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>إصدار سند صرف نقدية للمورد</span>
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentInitialCheck} className="mt-4 space-y-3.5 text-xs">
              {payError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">الجهة المستفيدة (المورد / الشركة):</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — (المستحق له: {s.currentBalance.toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              {/* Cash in drawer indicator */}
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">الرصيد المتاح بالدرج حالياً:</span>
                <span className={`font-mono font-bold ${currentCashInDrawer < payAmount ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {currentCashInDrawer.toLocaleString()} ج.م
                </span>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">المبلغ المسدد (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-rose-600 dark:text-rose-400 font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">البيان / ملاحظات الصرف:</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="دفعة من حساب فاتورة / شيك / تسوية..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-md"
                >
                  صرف المبلغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEGATIVE CASH / FUNDING SOURCE INQUIRY MODAL as requested */}
      {showFundingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-black mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span className="text-sm">تنبيه: عجز رصيد بالدرج — استعلام مصدر السداد</span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              المبلغ المطلوب صرفه (<strong>{payAmount.toLocaleString()} ج.م</strong>) أكبر من النقدية المتاحة بالدرج (<strong>{currentCashInDrawer.toLocaleString()} ج.م</strong>).
              <br />
              النظام يسمح بسحب المبلغ بالسالب حتى تتم تسوية الوردية في آخر اليوم.
              <br />
              <strong>من أين تم دفع سند الصرف؟</strong>
            </p>

            <div className="space-y-2 text-xs mb-4">
              {[
                'سلفة شخصية من صاحب العمل / المدير لتسوية الوردية',
                'عهدة نقدية خارجية مستلمة',
                'تمويل خارجي خاص خارج الدرج',
                'سحب مباشر بالسالب من الدرج مع تسوية الوردية لاحقاً'
              ].map(opt => (
                <label key={opt} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium">
                  <input
                    type="radio"
                    name="fundingSource"
                    checked={fundingSource === opt}
                    onChange={() => setFundingSource(opt)}
                    className="w-4 h-4 text-rose-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowFundingModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => executeSupplierPayment(true, fundingSource)}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                تأكيد الصرف بالسالب وتدوين المصدر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL */}
      {isEditPaymentModalOpen && paymentToEdit && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <span>تعديل سند الصرف للمورد ({paymentToEdit.supplierName})</span>
            </h3>

            <form onSubmit={handleUpdatePayment} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">المبلغ المعدل (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPaymentAmount}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                  onChange={(e) => setEditPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-rose-600 dark:text-rose-400 font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">ملاحظات التعديل والبيان:</label>
                <input
                  type="text"
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  حفظ التعديل وتحديث الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PAYMENT MODAL */}
      {paymentToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <h3 className="font-black text-base text-rose-600 flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5" />
              <span>تأكيد حذف سند الصرف</span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              هل أنت متأكد من حذف سند الصرف بمبلغ <strong>({paymentToDelete.amount.toLocaleString()} ج.م)</strong> المسدد للمورد <strong>({paymentToDelete.supplierName})</strong>؟
              <br />
              <span className="text-rose-600 font-bold block mt-2">
                سيتم تلقائياً رد هذا المبلغ إلى مستحقات المورد، وتوثيق العملية في سجل الرقابة.
              </span>
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeletePayment}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                تأكيد الحذف ورد المستحق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATEMENT OF ACCOUNT MODAL (كشف حساب المورد) */}
      {statementData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-bold text-slate-900 dark:text-white print:hidden">
              <span>كشف حساب المورد — {statementData.supplier.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة كشف الحساب</span>
                </button>
                <button onClick={() => setStatementData(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 text-xs text-slate-900 dark:text-white space-y-4 max-h-[80vh] overflow-y-auto select-text print:max-h-none print:p-0">
              <div className="border-b border-slate-300 pb-3 text-center">
                <h3 className="text-base font-black">مؤسسة البركة لتوزيع المواد الغذائية</h3>
                <p className="text-[11px] text-slate-500">كشف حساب جهة توريد بضاعة</p>
                <div className="mt-2 text-sm font-bold">المورد: {statementData.supplier.name} ({statementData.supplier.code})</div>
                <div className="text-slate-500 text-[11px]">المندوب: {statementData.supplier.contactPerson} • هاتف: {statementData.supplier.phone}</div>
              </div>

              {/* Balances Box */}
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">الرصيد الافتتاحي:</span>
                  <span className="font-mono font-bold">{(statementData.supplier.openingBalance || 0).toLocaleString()} ج.م</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">إجمالي فواتير التوريد:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {statementData.purchases.reduce((s, p) => s + p.totalCost, 0).toLocaleString()} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-rose-600 block text-[10px] font-bold">الرصيد الحالي المستحق:</span>
                  <span className="font-mono font-black text-rose-600 text-sm">
                    {statementData.supplier.currentBalance.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Purchases history */}
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-2">فواتير التوريد والشراء:</span>
                {statementData.purchases.length === 0 ? (
                  <p className="text-slate-400 text-[11px]">لا توجد فواتير شراء مسجلة.</p>
                ) : (
                  <table className="w-full text-right text-[11px] border border-slate-200 dark:border-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                      <tr>
                        <th className="p-2">رقم الفاتورة</th>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">الأصناف</th>
                        <th className="p-2">إجمالي الفاتورة</th>
                        <th className="p-2">المسدد نقداً</th>
                        <th className="p-2">المتبقي آجل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {statementData.purchases.map(p => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono font-bold">{p.invoiceNumber}</td>
                          <td className="p-2 font-mono">{p.date}</td>
                          <td className="p-2">{p.items.length} صنف</td>
                          <td className="p-2 font-mono font-bold">{p.totalCost.toLocaleString()} ج.م</td>
                          <td className="p-2 font-mono text-emerald-600">{p.paidAmount.toLocaleString()} ج.م</td>
                          <td className="p-2 font-mono font-bold text-rose-600">{p.remainingAmount.toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Payments history */}
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-2">سندات الصرف النقدية المسددة:</span>
                {statementData.payments.length === 0 ? (
                  <p className="text-slate-400 text-[11px]">لا توجد دفعات نقدية مسددة.</p>
                ) : (
                  <table className="w-full text-right text-[11px] border border-slate-200 dark:border-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                      <tr>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">المبلغ المسدد</th>
                        <th className="p-2">البيان ومصدر السداد</th>
                        <th className="p-2">المسؤول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {statementData.payments.map(m => (
                        <tr key={m.id}>
                          <td className="p-2 font-mono">{m.date}</td>
                          <td className="p-2 font-mono font-bold text-rose-600">{m.amount.toLocaleString()} ج.م</td>
                          <td className="p-2">{m.description}</td>
                          <td className="p-2 text-slate-500 font-mono">{m.performedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PAYMENT VOUCHER MODAL */}
      {paymentToPrint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs font-bold text-white print:hidden">
              <span>طباعة سند صرف نقدية</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button onClick={() => setPaymentToPrint(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-white text-black font-mono text-xs select-text">
              <div className="text-center pb-3 border-b-2 border-black">
                <h3 className="text-base font-black font-sans">مؤسسة البركة لتوزيع المواد الغذائية</h3>
                <p className="text-[10px]">سند صرف نقدية من الخزينة</p>
                <p className="text-xs font-bold mt-1">رقم السند: {paymentToPrint.id}</p>
              </div>

              <div className="py-3 border-b border-dashed border-black text-xs space-y-2">
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span>{paymentToPrint.date} — {paymentToPrint.time}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>يُصرف إلى السيد / شركة:</span>
                  <span className="font-sans text-sm">{paymentToPrint.supplierName}</span>
                </div>
                <div className="flex justify-between border-t border-dotted border-gray-400 pt-1 font-black text-sm">
                  <span>مبلغ وقدره:</span>
                  <span>{paymentToPrint.amount.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-700">
                  <span>البيان:</span>
                  <span className="font-sans">{paymentToPrint.description}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>المسؤول:</span>
                  <span>{paymentToPrint.performedBy}</span>
                </div>
              </div>

              <div className="pt-6 flex justify-between text-[10px] text-gray-700">
                <div>توقيع المستلم: .................</div>
                <div>توقيع أمين الخزينة: .................</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SUPPLIER MODAL */}
      {supplierToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <h3 className="font-black text-base text-rose-600 flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5" />
              <span>تأكيد حذف المورد</span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              هل أنت متأكد من حذف المورد <strong>({supplierToDelete.name})</strong>؟
              <br />
              المستحقات الحالية للمورد: <strong>{supplierToDelete.currentBalance.toLocaleString()} ج.م</strong>.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteSupplier}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
              >
                تأكيد حذف المورد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SUPPLIER MODAL WITH OPENING BALANCE */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>{editingSupplierId ? 'تعديل بيانات المورد / الشركة' : 'إضافة شركة أو تاجر جملة جديد'}</span>
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">اسم الشركة أو تاجر الجملة:</label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  placeholder="مثال: شركة إيديتا، تاجر جملة الأصدقاء..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">نوع جهة التوريد:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSuppType('COMPANY')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition-colors ${
                      suppType === 'COMPANY' ? 'bg-rose-600 text-white border-rose-500 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🏢 شركة / مصنع
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuppType('WHOLESALER')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition-colors ${
                      suppType === 'WHOLESALER' ? 'bg-amber-600 text-white border-amber-500 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
                    value={suppContact}
                    onChange={(e) => setSuppContact(e.target.value)}
                    placeholder="اسم المندوب"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={suppPhone}
                    onChange={(e) => setSuppPhone(e.target.value)}
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
                  value={suppOpeningBalance}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                  onChange={(e) => setSuppOpeningBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-rose-600 dark:text-rose-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">يُسجل كرصيد افتتاحي مستحق للمورد في بداية التعامل مع النظام.</span>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-md"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
