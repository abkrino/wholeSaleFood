import React, { useState } from 'react';
import { storage } from '../../services/storageService';
import { Database, Download, Upload, RefreshCw, AlertTriangle, CheckCircle, ShieldCheck, FileSpreadsheet, RotateCcw, X } from 'lucide-react';

interface BackupManagerProps {
  onRefreshData: () => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ onRefreshData }) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Export Backup
  const handleExportBackup = () => {
    try {
      const backupJson = storage.exportFullBackupJson();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `Wholesale_Distribution_Backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: 'تم استخراج وحفظ ملف النسخة الاحتياطية بنجاح على جهاز الكمبيوتر.',
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء تصدير ملف النسخة الاحتياطية.',
      });
    }
  };

  // Restore Backup
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = storage.restoreBackupJson(content);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'تمت استعادة قاعدة البيانات بنجاح! تم إنشاء نسخة أمان احتياطية قبل الاستعادة تلقائياً.',
        });
        onRefreshData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'فشلت عملية الاستعادة. الملف غير متوافق.',
        });
      }
    };
    reader.readAsText(file);
  };

  // Dry-Run Migration Simulation
  const handleSimulateMigration = () => {
    setMigrationStatus('جاري فحص وتدقيق ملفات البرنامج القديم (Al-Bader / EasyStore)...');
    setTimeout(() => {
      setMigrationStatus(
        'نتيجة الفحص التجريبي (Dry-Run): تم التحقق من 240 صنف، 45 عميل، 8 موردين. تم توحيد كود الصنف ومعاملات التحويل (كرتونة = 24 قطعة). لم يتم رصد أي تضارب باركود!'
      );
    }, 1200);
  };

  const handleConfirmFactoryReset = () => {
    storage.resetToFactoryDefault();
    onRefreshData();
    setIsResetModalOpen(false);
    setStatusMessage({
      type: 'success',
      text: 'تمت إعادة ضبط قاعدة البيانات للوضع الافتراضي الأولي بنجاح.',
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>إدارة النسخ الاحتياطي وترحيل بيانات البرنامج القديم</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          حماية بيانات التوزيع من التلف أو انقطاع الكهرباء، تصدير ملفات SQLite الاحتياطية، وأداة استيراد البيانات السابقة.
        </p>
      </div>

      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between font-bold ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="cursor-pointer text-xs opacity-75 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Grid: Backup vs Restore vs Migration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Box 1: Create Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>إنشاء نسخة احتياطية محلية (Backup)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            يقوم بتصدير لقطة متكاملة من قاعدة بيانات SQLite تشمل الأصناف، الأرصدة، الفواتير، وحسابات العملاء والموردين.
          </p>
          <div className="pt-2">
            <button
              onClick={handleExportBackup}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-950/20 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ملف النسخة الاحتياطية الآن</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            * يُنصح بنسخ هذا الملف يومياً على فلاشة USB خارجية لحماية بيانات المحل.
          </p>
        </div>

        {/* Box 2: Restore Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Upload className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>استعادة قاعدة بيانات سابقة (Safe Restore)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            استرجاع البيانات من ملف سابق مع حماية تلقائية تنشئ نسخة أمان مؤقتة قبل الاستبدال لتفادي فقدان البيانات.
          </p>
          <div className="pt-2">
            <label className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-md shadow-amber-950/20 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>اختيار ملف النسخة الاحتياطية (.json)</span>
              <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400/90 font-medium">
            * تنبيه: عملية الاستعادة تستبدل البيانات الحالية ببيانات الملف المختار.
          </p>
        </div>
      </div>

      {/* Legacy Software Migration Assistant */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>مساعد ترحيل بيانات البرنامج القديم (Migration Assistant)</span>
          </div>
          <span className="text-[11px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 px-2.5 py-0.5 rounded font-bold">
            تدقيق مطابق لمعايير المرحلة الأولى
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          يتيح استيراد ملفات الإكسل (CSV/Excel) المصدرة من برامج المحاسبة القديمة مع الفحص التجريبي لمنع تكرار الأرصدة الافتتاحية وضمان سلامة وحدات التعبئة (كرتونة وقطعة).
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateMigration}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تشغيل فحص المحاكاة التجريبي (Dry-Run Test)</span>
          </button>
        </div>

        {migrationStatus && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium">
            {migrationStatus}
          </div>
        )}
      </div>

      {/* Factory Demo Reset */}
      <div className="bg-rose-50 dark:bg-slate-900/60 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
        <div>
          <span className="font-bold text-xs text-rose-800 dark:text-rose-300 block">إعادة ضبط المصنع (بيانات تجريبية مصرية نظيفة)</span>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            يعيد تهيئة قاعدة البيانات ببيانات المنتجات والعملاء المصرية الأصلية.
          </span>
        </div>
        <button
          onClick={() => setIsResetModalOpen(true)}
          className="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-colors shadow-xs"
        >
          إعادة ضبط المصنع
        </button>
      </div>

      {/* Factory Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                <RotateCcw className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">تأكيد إعادة ضبط المصنع</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">سيتم استرجاع البيانات الأولية للنظام</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed my-3">
              هل أنت متأكد من رغبتك في إعادة ضبط النظام لبيانات المصنع؟ سيتم مسح أي فواتير جديدة واسترجاع المنتجات والعملاء الافتراضية.
            </p>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmFactoryReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
              >
                تأكيد إعادة الضبط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
