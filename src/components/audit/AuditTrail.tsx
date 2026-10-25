import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { storage } from '../../services/storageService';
import { FileText, Search, Shield, Clock } from 'lucide-react';

export const AuditTrail: React.FC = () => {
  const [logs] = useState<AuditLog[]>(storage.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.actionArabic.toLowerCase().includes(q) || l.username.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.entityId.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>سجل العمليات والرقابة الداخلية (Audit Trail)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            سجل غير قابل للحذف يوثق كل عملية تعديل مخزون، إصدار فاتورة، سداد نقدي، أو تحصيل مع اسم المستخدم والتوقيت.
          </p>
        </div>

        <div className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-mono font-bold">
          إجمالي السجلات: {logs.length}
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المستخدم أو العملية أو رقم الفاتورة/السند..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
              <tr>
                <th className="py-2.5 px-3">التوقيت والتاريخ</th>
                <th className="py-2.5 px-3">المستخدم والمنفذ</th>
                <th className="py-2.5 px-3">نوع الإجراء</th>
                <th className="py-2.5 px-3">الكيان / الوحدة</th>
                <th className="py-2.5 px-3">رقم المرجع</th>
                <th className="py-2.5 px-3">تفاصيل الحركة المسجلة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{l.timestamp}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{l.username}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-bold">
                      {l.actionArabic}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{l.entity}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">{l.entityId}</td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 leading-relaxed">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
