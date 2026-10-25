import React, { useState } from 'react';
import { CashMovement, Expense, SystemShift, User } from '../../types';
import { storage } from '../../services/storageService';
import { Wallet, Coins, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, CheckCircle2, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface CashManagerProps {
  currentUser: User;
  onRefreshData: () => void;
}

export const CashManager: React.FC<CashManagerProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [movements, setMovements] = useState<CashMovement[]>(storage.getCashMovements());
  const [expenses, setExpenses] = useState<Expense[]>(storage.getExpenses());
  const [currentCash, setCurrentCash] = useState<number>(storage.calculateCurrentCashInDrawer());
  const [currentShift, setCurrentShift] = useState<SystemShift>(storage.getCurrentShift());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<'RENT' | 'ELECTRICITY' | 'HOSPITALITY' | 'TRANSPORT' | 'LABOR' | 'MAINTENANCE' | 'OTHER'>('HOSPITALITY');
  const [expenseAmount, setExpenseAmount] = useState<number>(50);
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  // Close Shift Modal
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [physicalCashCounted, setPhysicalCashCounted] = useState<number>(currentCash);

  const expenseCategoryMap: Record<string, string> = {
    RENT: 'إيجار المحل أو المخزن',
    ELECTRICITY: 'كهرباء وإنارة',
    HOSPITALITY: 'ضيافة وبوفيه وشاي',
    TRANSPORT: 'مشال ونقل وتعتيق',
    LABOR: 'يوميات عمالة مساعدة',
    MAINTENANCE: 'صيانة ومستلزمات نظافة',
    OTHER: 'نثريات ومصروفات أخرى',
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      category: expenseCategory,
      categoryLabelArabic: expenseCategoryMap[expenseCategory],
      amount: expenseAmount,
      notes: expenseNotes,
      recordedBy: currentUser.fullName,
    };

    storage.recordExpense(newExpense);
    setExpenses(storage.getExpenses());
    setMovements(storage.getCashMovements());
    setCurrentCash(storage.calculateCurrentCashInDrawer());
    setIsExpenseModalOpen(false);
    setExpenseNotes('');
    onRefreshData();
  };

  // Drawer Reconciliation Submit
  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const diff = physicalCashCounted - currentCash;

    const updatedShift: SystemShift = {
      ...currentShift,
      closedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      expectedClosingCash: currentCash,
      actualClosingCash: physicalCashCounted,
      difference: diff,
      status: 'CLOSED',
    };

    storage.saveCurrentShift(updatedShift);
    setCurrentShift(updatedShift);
    setIsCloseShiftOpen(false);

    storage.addAuditLog(
      'SHIFT',
      'إغلاق ومطابقة الوردية',
      'الخزينة',
      currentShift.id,
      `إغلاق الوردية: النقدية المحسوبة: ${currentCash} ج.م، الفعلية المعدودة: ${physicalCashCounted} ج.م، الفارق: ${diff} ج.م`
    );

    setStatusMessage(`تم إغلاق الوردية وتسجيل المطابقة بنجاح. ${diff === 0 ? 'النقدية متطابقة تماماً بدون أي عجز أو زيادة!' : diff < 0 ? `يوجد عجز نقدي بقيمة ${Math.abs(diff)} ج.م` : `توجد زيادة نقدية بقيمة ${diff} ج.م`}`);
    onRefreshData();
  };

  const totalInflows = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.amount, 0);
  const totalOutflows = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header & Drawer Balance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <span>الخزينة النقدية ومصروفات التشغيل اليومية</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            حركة السيولة بالدرج، تحصيلات المبيعات، سندات الصرف، ومصروفات الضيافة والمشال.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-lg">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">رصيد الدرج الفعلي:</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-300 text-base">
              {currentCash.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-950/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مصروف تشغيل -</span>
          </button>

          <button
            onClick={() => {
              setPhysicalCashCounted(currentCash);
              setIsCloseShiftOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>مطابقة الدرج وإغلاق الوردية</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="cursor-pointer text-xs opacity-75 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">إجمالي المقبوضات (وارد الخزينة)</span>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {totalInflows.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">إجمالي المدفوعات (منصرف الخزينة)</span>
            <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1 block">
              {totalOutflows.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xs transition-colors">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">إجمالي المصروفات النثرية اليوم</span>
            <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1 block">
              {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <Coins className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
          دفتر حركة النقدية اليومي ({movements.length} حركة)
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
              <tr>
                <th className="py-2.5 px-3">التاريخ / الوقت</th>
                <th className="py-2.5 px-3">نوع الحركة</th>
                <th className="py-2.5 px-3">التصنيف</th>
                <th className="py-2.5 px-3">البيان والشرح</th>
                <th className="py-2.5 px-3">المبلغ</th>
                <th className="py-2.5 px-3">المسؤول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                    {m.date} {m.time}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      m.type === 'IN'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    }`}>
                      {m.type === 'IN' ? 'مقبوض وارد +' : 'منصرف صادر -'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{m.categoryLabelArabic}</td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{m.description}</td>
                  <td className={`py-2.5 px-3 font-mono font-bold text-sm ${
                    m.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {m.amount.toFixed(2)} ج.م
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{m.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>تسجيل مصروف تشغيلي من نقدية الدرج</span>
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">بند المصروف:</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-bold"
                >
                  {Object.entries(expenseCategoryMap).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">قيمة المصروف (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-rose-600 dark:text-rose-400 font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">تفاصيل / بيان المصروف:</label>
                <input
                  type="text"
                  required
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="مثال: فاتورة كهرباء شهرية، شاي وسكر للبوفيه..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  خصم المصروف من الدرج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Closing Reconciliation Modal */}
      {isCloseShiftOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>مطابقة الدرج وإغلاق الوردية اليومية</span>
              </h3>
              <button onClick={() => setIsCloseShiftOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShiftSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">النقدية المحسوبة دفترياً بالدرج:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-300">{currentCash.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>مسؤول الوردية:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser.fullName}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                  النقدية الفعلية المعدودة في الدرج الآن (جرد يدوي):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={physicalCashCounted}
                  onChange={(e) => setPhysicalCashCounted(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-lg"
                />
              </div>

              {/* Difference feedback */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs flex justify-between items-center">
                <span className="font-semibold text-slate-700 dark:text-slate-300">الفارق (العجز / الزيادة):</span>
                <span className={`font-mono font-bold text-xs ${
                  physicalCashCounted - currentCash === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : physicalCashCounted - currentCash < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {(physicalCashCounted - currentCash).toFixed(2)} ج.م
                  {physicalCashCounted - currentCash === 0 ? ' (مطابق تماماً)' : physicalCashCounted - currentCash < 0 ? ' (عجز)' : ' (زيادة)'}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  اعتماد المطابقة وإغلاق الوردية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
