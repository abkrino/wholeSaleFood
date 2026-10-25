import React, { useState } from 'react';
import { Customer, User, SalesInvoice, CashMovement } from '../../types';
import { storage } from '../../services/storageService';
import { 
  Users, 
  UserPlus, 
  Receipt, 
  Search, 
  Phone, 
  MapPin, 
  AlertCircle, 
  AlertTriangle,
  Printer, 
  Edit3, 
  Trash2, 
  FileText,
  X
} from 'lucide-react';

interface CustomerLedgerProps {
  currentUser: User;
  onRefreshData: () => void;
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [searchQuery, setSearchQuery] = useState('');

  // Collection modal state
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [collectAmount, setCollectAmount] = useState<number>(1000);
  const [collectNotes, setCollectNotes] = useState('');
  const [collectError, setCollectError] = useState<string | null>(null);

  // Add / Edit Customer modal state
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custArea, setCustArea] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState(10000);
  const [custTier, setCustTier] = useState<'WHOLESALE' | 'HALF_WHOLESALE' | 'RETAIL'>('WHOLESALE');
  const [custOpeningBalance, setCustOpeningBalance] = useState<number>(0);
  const [custNotes, setCustNotes] = useState('');

  // Delete confirmation modal state
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Statement of Account Modal (كشف حساب العميل)
  const [statementData, setStatementData] = useState<{
    customer: Customer;
    invoices: SalesInvoice[];
    payments: CashMovement[];
  } | null>(null);

  const reloadCustomers = () => {
    setCustomers(storage.getCustomers());
    onRefreshData();
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.area.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const totalDebt = customers.reduce((sum, c) => sum + c.currentBalance, 0);

  const handleCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCollectError(null);

    const res = storage.recordCustomerCollection({
      customerId: selectedCustomerId,
      amount: collectAmount,
      notes: collectNotes,
      collectedBy: currentUser.fullName,
    });

    if (!res.success) {
      setCollectError(res.error || 'فشل في حفظ سند القبض');
      return;
    }

    setIsCollectModalOpen(false);
    setCollectNotes('');
    reloadCustomers();
  };

  const openAddModal = () => {
    setEditingCustId(null);
    setCustName('');
    setCustPhone('');
    setCustArea('');
    setCustCreditLimit(10000);
    setCustTier('WHOLESALE');
    setCustOpeningBalance(0);
    setCustNotes('');
    setIsCustModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustId(c.id);
    setCustName(c.name);
    setCustPhone(c.phone);
    setCustArea(c.area);
    setCustCreditLimit(c.creditLimit);
    setCustTier(c.priceTier);
    setCustOpeningBalance(c.openingBalance || 0);
    setCustNotes(c.notes || '');
    setIsCustModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    let targetCustomer: Customer;

    if (editingCustId) {
      const existing = customers.find(c => c.id === editingCustId)!;
      targetCustomer = {
        ...existing,
        name: custName,
        phone: custPhone || '-',
        area: custArea || 'غير محدد',
        creditLimit: custCreditLimit,
        priceTier: custTier,
        openingBalance: custOpeningBalance,
        isCreditAllowed: custCreditLimit > 0,
        notes: custNotes,
      };
    } else {
      targetCustomer = {
        id: `c-${Date.now()}`,
        code: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        name: custName,
        phone: custPhone || '-',
        area: custArea || 'غير محدد',
        creditLimit: custCreditLimit,
        openingBalance: custOpeningBalance,
        currentBalance: custOpeningBalance, // يبدأ رصيد العميل بالرصيد الافتتاحي
        priceTier: custTier,
        isCreditAllowed: custCreditLimit > 0,
        notes: custNotes,
      };
    }

    storage.saveCustomer(targetCustomer);
    setIsCustModalOpen(false);
    reloadCustomers();
  };

  const handleDeleteCustomer = (c: Customer) => {
    setCustomerToDelete(c);
  };

  const confirmDeleteCustomer = (clearDebt: boolean = false) => {
    if (!customerToDelete) return;
    const res = storage.deleteCustomer(customerToDelete.id, clearDebt);
    if (res.success) {
      setCustomerToDelete(null);
      reloadCustomers();
    }
  };

  const openStatement = (c: Customer) => {
    const data = storage.getCustomerStatement(c.id);
    if (data) {
      setStatementData(data);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>حسابات العملاء وتجار التجزئة</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            تعديل البيانات، متابعة الحدود الائتمانية، طباعة كشف الحساب، وتسجيل سندات القبض.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">إجمالي ديون العملاء:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">
              {totalDebt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>

          <button
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عميل جديد +</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-xs transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المحل، التاجر، رقم الهاتف، أو المنطقة..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <th className="py-2.5 px-3">كود العميل</th>
                <th className="py-2.5 px-3">اسم المحل / العميل</th>
                <th className="py-2.5 px-3">المنطقة وخط السير</th>
                <th className="py-2.5 px-3">رقم الهاتف</th>
                <th className="py-2.5 px-3">مستوى السعر</th>
                <th className="py-2.5 px-3">الحد الائتماني</th>
                <th className="py-2.5 px-3">المديونية الحالية</th>
                <th className="py-2.5 px-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCustomers.map(c => {
                const isOverLimit = c.creditLimit > 0 && c.currentBalance >= c.creditLimit;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">{c.code}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                      {c.notes && <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{c.area}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-mono">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {c.priceTier === 'WHOLESALE' ? 'سعر جملة' : c.priceTier === 'HALF_WHOLESALE' ? 'نصف جملة' : 'قطاعي'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {c.creditLimit > 0 ? `${c.creditLimit.toLocaleString()} ج.م` : 'غير محدد'}
                    </td>
                    <td className={`py-3 px-3 font-mono font-bold text-sm ${isOverLimit ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {c.currentBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          title="تعديل بيانات العميل"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                          <span>تعديل</span>
                        </button>

                        {/* Print Statement Button */}
                        <button
                          type="button"
                          onClick={() => openStatement(c)}
                          className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/30 dark:hover:bg-emerald-600/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/50 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          title="طباعة كشف حساب العميل"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>كشف حساب</span>
                        </button>

                        {/* Collection Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCollectAmount(Math.min(c.currentBalance > 0 ? c.currentBalance : 1000, 2000));
                            setIsCollectModalOpen(true);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/30 dark:hover:bg-blue-600/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/50 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          title="تحصيل مديونية"
                        >
                          <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>قبض</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c)}
                          className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/30 dark:hover:bg-rose-600/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/50 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          title="حذف العميل"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Statement of Account Modal (كشف حساب العميل) */}
      {statementData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl p-6 text-right my-6 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>كشف حساب عميل — {statementData.customer.name}</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer font-bold shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الكشف</span>
                </button>
                <button onClick={() => setStatementData(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Statement Body */}
            <div className="bg-white text-black p-5 rounded-lg my-3 text-xs leading-relaxed font-sans shadow-inner select-text print:shadow-none">
              <div className="flex justify-between border-b-2 border-black pb-2 mb-3">
                <div>
                  <h2 className="font-black text-sm">مؤسسة البركة لتوزيع المواد الغذائية</h2>
                  <p className="text-[10px] text-gray-600">كشف حساب مديونية ومعاملات العميل</p>
                </div>
                <div className="text-left font-mono">
                  <p className="font-bold text-xs">{statementData.customer.name}</p>
                  <p className="text-[10px]">{statementData.customer.code} | {statementData.customer.phone}</p>
                </div>
              </div>

              {/* Transactions Table in Statement */}
              <table className="w-full text-right text-[11px] border border-gray-300 mb-3">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="p-1.5">التاريخ</th>
                    <th className="p-1.5">البيان والنوع</th>
                    <th className="p-1.5">الرقم المرجعي</th>
                    <th className="p-1.5">مدين (فواتير)</th>
                    <th className="p-1.5">دائن (سداد)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {statementData.invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="p-1.5 font-mono">{inv.date}</td>
                      <td className="p-1.5">فاتورة مبيعات ({inv.items.length} صنف)</td>
                      <td className="p-1.5 font-mono">{inv.invoiceNumber}</td>
                      <td className="p-1.5 font-mono font-bold text-gray-900">{inv.total.toFixed(2)}</td>
                      <td className="p-1.5 font-mono text-gray-600">{inv.paidAmount > 0 ? inv.paidAmount.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                  {statementData.payments.map(pay => (
                    <tr key={pay.id} className="bg-emerald-50/50">
                      <td className="p-1.5 font-mono">{pay.date}</td>
                      <td className="p-1.5">{pay.categoryLabelArabic} ({pay.description})</td>
                      <td className="p-1.5 font-mono">{pay.referenceId}</td>
                      <td className="p-1.5 font-mono">-</td>
                      <td className="p-1.5 font-mono font-bold text-emerald-800">{pay.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Balance Summary Box */}
              <div className="flex justify-between items-center bg-gray-100 p-2.5 rounded border border-gray-300">
                <span className="font-bold text-xs">إجمالي الرصيد القائم المستحق على العميل:</span>
                <span className="font-black text-sm font-mono text-gray-900">
                  {statementData.customer.currentBalance.toFixed(2)} جنيه مصري
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isCustModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{editingCustId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</span>
              </h3>
              <button onClick={() => setIsCustModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">اسم المحل / التاجر:</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="مثال: سوبر ماركت الأمانة..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="010..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">المنطقة / خط السير:</label>
                  <input
                    type="text"
                    value={custArea}
                    onChange={(e) => setCustArea(e.target.value)}
                    placeholder="الدقي / فيصل..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">الحد الائتماني (ج.م):</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">مستوى السعر:</label>
                  <select
                    value={custTier}
                    onChange={(e) => setCustTier(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="WHOLESALE">سعر جملة</option>
                    <option value="HALF_WHOLESALE">نصف جملة</option>
                    <option value="RETAIL">قطاعي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">الرصيد الافتتاحي للعميل (مديونية سابقة ج.م):</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={custOpeningBalance}
                  onChange={(e) => setCustOpeningBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-amber-600 dark:text-amber-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">يُسجل كمديونية سابقة في أول التعامل مع المحل.</span>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">ملاحظات إضافية:</label>
                <input
                  type="text"
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  placeholder="ملاحظات مواعيد السداد أو المحل..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Collection Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>إصدار سند قبض نقدية</span>
              </h3>
              <button onClick={() => setIsCollectModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectionSubmit} className="mt-4 space-y-3.5 text-xs">
              {collectError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
                  {collectError}
                </div>
              )}

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">العميل:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-bold"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — (المديونية: {c.currentBalance.toLocaleString()} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">المبلغ المحصل نقداً (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">ملاحظات / بيان السند:</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="مثال: دفعة حساب نقدية..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  تأكيد سند القبض والترحيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 text-right transition-colors">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">حذف حساب العميل</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">تأكيد عملية حذف بيانات العميل من النظام</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-sm">
                <p className="font-bold text-slate-900 dark:text-white text-base mb-1">{customerToDelete.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">الكود: {customerToDelete.code} • المنطقة: {customerToDelete.area}</p>
                <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">المديونية الحالية:</span>
                  <span className={`font-mono font-bold text-base ${customerToDelete.currentBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {customerToDelete.currentBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
              </div>

              {customerToDelete.currentBalance > 0 ? (
                <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">تنبيه مديونية قائمة:</p>
                    <p>
                      هذا العميل لديه رصيد مديونية مستحق قدره <strong>{customerToDelete.currentBalance.toLocaleString()} ج.م</strong>. يمكنك إما إلغاء العملية وتحصيل المبلغ أولاً، أو الحذف مع إسقاط وتصفية هذه المديونية.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  هل أنت متأكد من حذف هذا العميل؟ لن يؤثر هذا على الفواتير السابقة في التقارير التاريخية.
                </p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold cursor-pointer transition-colors"
              >
                إلغاء التراجع
              </button>

              {customerToDelete.currentBalance > 0 ? (
                <button
                  type="button"
                  onClick={() => confirmDeleteCustomer(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-rose-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف مع تصفية المديونية</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => confirmDeleteCustomer(false)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-rose-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
