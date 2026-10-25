import React, { useState } from 'react';
import { SalesInvoice, User } from '../../types';
import { storage } from '../../services/storageService';
import { 
  FileText, 
  Search, 
  Printer, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Receipt,
  UserCheck,
  Calendar,
  Filter,
  Plus
} from 'lucide-react';

interface InvoicesManagerProps {
  currentUser: User;
  onNewInvoice: () => void;
  onEditInvoice: (invoice: SalesInvoice) => void;
  onPrintInvoice: (invoice: SalesInvoice) => void;
  onRefreshData: () => void;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  currentUser,
  onNewInvoice,
  onEditInvoice,
  onPrintInvoice,
  onRefreshData,
}) => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>(storage.getSalesInvoices());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'CREDIT' | 'SPLIT'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deleteConfirmInvoice, setDeleteConfirmInvoice] = useState<SalesInvoice | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = currentUser.role === 'ADMIN';

  const reloadInvoices = () => {
    setInvoices(storage.getSalesInvoices());
    onRefreshData();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.slice(0, 7);

  // USER SPECIFIED: البحث عن أي فاتورة باسم المحل أو رقم الفاتورة والبحث بالفترة
  const filteredInvoices = invoices.filter(inv => {
    if (paymentFilter !== 'ALL' && inv.paymentType !== paymentFilter) return false;
    if (startDate && inv.date < startDate) return false;
    if (endDate && inv.date > endDate) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.notes && inv.notes.toLowerCase().includes(q))
    );
  });

  // USER SPECIFIED: حذف الفاتورة مع حذف مديونية العميل واسترجاع المخزون
  const handleDeleteInvoice = (invoice: SalesInvoice) => {
    const res = storage.deleteSalesInvoice(invoice.id);
    if (res.success) {
      setMessage({
        type: 'success',
        text: `تم حذف الفاتورة (${invoice.invoiceNumber}) بنجاح: تم إرجاع جميع الأصناف للمخزن، وتم حذف مبلغ المديونية (${invoice.remainingAmount} ج.م) من حساب العميل (${invoice.customerName}).`
      });
      setDeleteConfirmInvoice(null);
      reloadInvoices();
    } else {
      setMessage({
        type: 'error',
        text: res.error || 'فشل في حذف الفاتورة'
      });
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>سجل وأرشيف فواتير المبيعات</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            البحث عن أي فاتورة باسم المحل أو رقم الفاتورة، مع أزرار التعديل، الطباعة، والحذف مع حذف مديونية العميل.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* USER SPECIFIED: زر إضافة الفواتير */}
          <button
            type="button"
            onClick={onNewInvoice}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ إنشاء فاتورة بيع جديدة</span>
          </button>

          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300">
            إجمالي الفواتير: <strong className="text-emerald-600 dark:text-emerald-400">{invoices.length}</strong>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs cursor-pointer opacity-70 hover:opacity-100 font-bold px-1">✕</button>
        </div>
      )}

      {/* Filter and Search Bar: Search by shop/customer name or invoice number */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم المحل أو العميل أو رقم الفاتورة (INV-...)..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-medium"
            />
          </div>

          {/* Payment Filter */}
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setPaymentFilter('ALL')}
              className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                paymentFilter === 'ALL' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setPaymentFilter('CASH')}
              className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                paymentFilter === 'CASH' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              نقدي
            </button>
            <button
              onClick={() => setPaymentFilter('CREDIT')}
              className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                paymentFilter === 'CREDIT' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              آجل
            </button>
            <button
              onClick={() => setPaymentFilter('SPLIT')}
              className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                paymentFilter === 'SPLIT' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              مختلط
            </button>
          </div>
        </div>

        {/* Date Period Filter Bar (من تاريخ ... إلى تاريخ ...) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>البحث بالفترة:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[11px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
              >
                مسح الفترة ✕
              </button>
            )}
          </div>

          {/* Quick Period Buttons */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded font-bold cursor-pointer"
            >
              فواتير اليوم
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(`${currentMonthPrefix}-01`);
                setEndDate(todayStr);
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded font-bold cursor-pointer"
            >
              فواتير هذا الشهر
            </button>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto min-h-[300px]">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600" />
              <p className="text-xs font-medium">لم يتم العثور على فواتير مطابقة لبحثك</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                  <th className="py-2.5 px-3">اسم المحل / العميل</th>
                  <th className="py-2.5 px-3">الأصناف</th>
                  <th className="py-2.5 px-3">إجمالي الفاتورة</th>
                  <th className="py-2.5 px-3">المدفوع نقداً</th>
                  <th className="py-2.5 px-3">المتبقي آجل</th>
                  <th className="py-2.5 px-3">طريقة السداد</th>
                  <th className="py-2.5 px-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <div>{inv.invoiceNumber}</div>
                      {inv.status === 'MODIFIED' && (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded border border-amber-300 dark:border-amber-800 font-sans">
                          معدلة
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <div>{inv.date}</div>
                      <div>{inv.time}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {inv.customerName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-600 dark:text-slate-300">{inv.items.length} صنف</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {inv.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {inv.paidAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {inv.remainingAmount > 0 ? `${inv.remainingAmount.toLocaleString()} ج.م` : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        inv.paymentType === 'CASH'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : inv.paymentType === 'CREDIT'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      }`}>
                        {inv.paymentType === 'CASH' ? 'نقدي فوري' : inv.paymentType === 'CREDIT' ? 'آجل' : 'مختلط'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* USER SPECIFIED: زر الطباعة لكل الفواتير */}
                        <button
                          type="button"
                          onClick={() => onPrintInvoice(inv)}
                          className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-colors font-bold shadow-xs"
                          title="طباعة الفاتورة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="text-[11px]">طباعة</span>
                        </button>

                        {/* USER SPECIFIED: زر لتعديل لكل الفواتير */}
                        <button
                          type="button"
                          onClick={() => onEditInvoice(inv)}
                          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-colors font-bold shadow-xs"
                          title="تعديل الفاتورة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">تعديل</span>
                        </button>

                        {/* USER SPECIFIED: زر الحذف مع حذف مديونية العميل في حالة الحذف */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmInvoice(inv)}
                          className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-colors font-bold shadow-xs"
                          title="حذف الفاتورة واسترجاع البضاعة والمديونية"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">حذف</span>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base mb-3">
              <AlertTriangle className="w-6 h-6" />
              <span>تأكيد حذف الفاتورة رقم ({deleteConfirmInvoice.invoiceNumber})؟</span>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              عند تأكيد الحذف، سيقوم النظام تلقائياً بـ:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-2 my-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <li><strong className="text-emerald-600 dark:text-emerald-400">إرجاع جميع الأصناف ({deleteConfirmInvoice.items.length} صنف)</strong> إلى المخزن وزيادة رصيدها.</li>
              <li><strong className="text-amber-600 dark:text-amber-400">حذف مديونية العميل ({deleteConfirmInvoice.remainingAmount} ج.م)</strong> فوراً من حساب ({deleteConfirmInvoice.customerName}).</li>
              {deleteConfirmInvoice.paidAmount > 0 && (
                <li><strong className="text-blue-600 dark:text-blue-400">رد مبلغ النقدية ({deleteConfirmInvoice.paidAmount} ج.م)</strong> من الخزينة.</li>
              )}
            </ul>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => handleDeleteInvoice(deleteConfirmInvoice)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
              >
                تأكيد الحذف وحذف المديونية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
