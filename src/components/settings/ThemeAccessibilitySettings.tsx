import React, { useState, useEffect } from 'react';
import { themeService, AccessibilitySettings, ThemeMode, FontSize } from '../../services/themeService';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Type, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw,
  Sliders,
  Maximize2,
  Check,
  Receipt,
  ShoppingCart,
  Boxes
} from 'lucide-react';

export const ThemeAccessibilitySettings: React.FC = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(themeService.getSettings());

  useEffect(() => {
    return themeService.subscribe((updated) => {
      setSettings(updated);
    });
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    themeService.updateSetting('theme', mode);
  };

  const handleFontSizeChange = (size: FontSize) => {
    themeService.updateSetting('fontSize', size);
  };

  const handleToggleHighContrast = () => {
    themeService.updateSetting('highContrast', !settings.highContrast);
  };

  const handleResetDefaults = () => {
    themeService.saveSettings({
      theme: 'dark',
      fontSize: 'normal',
      highContrast: false,
      reduceMotion: false,
    });
  };

  const isCurrentDark = themeService.isDarkMode();

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Sliders className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <span>المظهر وإمكانية الوصول (Accessibility & Themes)</span>
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 mt-2 font-medium">
              تخصيص الواجهة لتكون مريحة وسهلة القراءة لكبار السن وضعاف النظر، مع التبديل الفوري بين الوضع الفاتح والداكن.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn-secondary-accessible bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 cursor-pointer text-sm font-bold"
            title="استعادة الإعدادات الافتراضية للواجهة"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الإعدادات الافتراضية</span>
          </button>
        </div>
      </div>

      {/* Section 1: Themes Mode Selection (Light / Dark / System Default) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="w-6 h-6 text-amber-500" />
              <span>وضع السمة (الوضع الفاتح والداكن)</span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              يعمل التبديل فورياً ويتم حفظ اختيارك بشكل دائم ومستقل على هذا الجهاز.
            </p>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            الوضع الفعّال حالياً: {isCurrentDark ? 'داكن 🌙' : 'فاتح ☀️'}
          </span>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 1. Light Mode Card */}
          <div
            onClick={() => handleThemeChange('light')}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
              settings.theme === 'light'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-950/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Sun className="w-7 h-7" />
                </div>
                {settings.theme === 'light' && (
                  <span className="bg-emerald-600 text-white rounded-full p-1">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">الوضع الفاتح (Light Mode)</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                خلفية بيضاء نقية وتباين عالٍ بنصوص داكنة، مريح ومثالي للعمل نهاراً وفي المحلات والمخازن ذات الإضاءة العالية.
              </p>
            </div>

            {/* Live Micro-Preview */}
            <div className="mt-4 p-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs shadow-xs">
              <div className="flex justify-between items-center font-bold">
                <span>معاينة الفاتورة:</span>
                <span className="text-emerald-700 font-mono">1,450.00 ج.م</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">خلفية ناصعة ونصوص سوداء واضحة تماماً</div>
            </div>
          </div>

          {/* 2. Dark Mode Card */}
          <div
            onClick={() => handleThemeChange('dark')}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
              settings.theme === 'dark'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-950/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-900 text-indigo-300 flex items-center justify-center font-bold">
                  <Moon className="w-7 h-7" />
                </div>
                {settings.theme === 'dark' && (
                  <span className="bg-emerald-600 text-white rounded-full p-1">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">الوضع الداكن (Dark Mode)</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                خلفية كحلية داكنة متدرجة مريحة للعين، تقلل الإجهاد البصري في أوقات العمل المسائية والورديات الطويلة.
              </p>
            </div>

            {/* Live Micro-Preview */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs shadow-xs">
              <div className="flex justify-between items-center font-bold">
                <span>معاينة الفاتورة:</span>
                <span className="text-emerald-400 font-mono">1,450.00 ج.م</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">خلفية معتمة ونصوص ساطعة ومريحة</div>
            </div>
          </div>

          {/* 3. System Default Card */}
          <div
            onClick={() => handleThemeChange('system')}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
              settings.theme === 'system'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-950/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                  <Monitor className="w-7 h-7" />
                </div>
                {settings.theme === 'system' && (
                  <span className="bg-emerald-600 text-white rounded-full p-1">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">تلقائي حسب نظام الجهاز (System)</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                يتبع إعدادات ويندوز أو الأندرويد تلقائياً؛ يتحول للفاتح نهاراً وللداكن ليلاً حسب جهازك.
              </p>
            </div>

            {/* Status indicator */}
            <div className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
              <span className="font-semibold block">متزامن مع متصفحك ونظام التشغيل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Font Size Scaling & Accessibility for Senior Users */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Type className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>حجم الخط والنصوص (مخصص لكبار السن وضعاف النظر)</span>
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            اختر حجم النص المناسب لك. يتم تكبير النصوص والأرقام المالية والعناوين في جميع الشاشات دون تداخل أو إخفاء أي بيانات.
          </p>
        </div>

        {/* Font Size Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => handleFontSizeChange('normal')}
            className={`btn-primary-accessible border-2 cursor-pointer transition-all ${
              settings.fontSize === 'normal'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <span className="text-base font-bold">خط قياسي واضح (18px)</span>
          </button>

          <button
            type="button"
            onClick={() => handleFontSizeChange('large')}
            className={`btn-primary-accessible border-2 cursor-pointer transition-all ${
              settings.fontSize === 'large'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <span className="text-lg font-black">خط كبير ومريح (20px) ★</span>
          </button>

          <button
            type="button"
            onClick={() => handleFontSizeChange('huge')}
            className={`btn-primary-accessible border-2 cursor-pointer transition-all ${
              settings.fontSize === 'huge'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <span className="text-xl font-black">خط ضخم جداً (22px) 🔍</span>
          </button>
        </div>

        {/* Interactive Text & Numbers Readability Preview */}
        <div className="bg-slate-100 dark:bg-slate-950 p-5 rounded-2xl border border-slate-300 dark:border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
            معاينة مباشرة لوضوح الأرقام والأسماء بالحجم المختار:
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">اسم الصنف بالكرتونة</span>
              <p className="font-black text-slate-900 dark:text-white mt-0.5">بسكويت لوكس سادة (بسكومصر)</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">رصيد المخزن المتاح</span>
              <p className="font-mono font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                45 كرتونة (1,080 قطعة)
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">المبلغ المالي الصافي</span>
              <p className="font-mono font-black text-amber-700 dark:text-amber-400 mt-0.5">
                12,850.50 ج.م
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: High Contrast & Visual Comfort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>نمط التباين العالي (High Contrast Borders)</span>
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            يحدد إطارات الجداول والأزرار بلون داكن وواضح جداً لتمييز الفواصل والحقول بسهولة فائقة دون تشتت.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleHighContrast}
          className={`btn-primary-accessible cursor-pointer transition-all ${
            settings.highContrast
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600'
          }`}
        >
          {settings.highContrast ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>التباين العالي مفعّل ✓</span>
            </>
          ) : (
            <span>تفعيل التباين العالي</span>
          )}
        </button>
      </div>

      {/* Section 4: Operational Guarantee Note */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-5 text-emerald-900 dark:text-emerald-200 text-sm flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">ضمان الأمان وسلامة البيانات 100%:</p>
          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
            تغيير إعدادات المظهر وإمكانية الوصول لا يؤثر نهائياً على أي فواتير أو مخزون أو أرباح أو حسابات ديون أو موازين الخزينة. يتم الحفظ محلياً في ذاكرة التكوين فقط ويتم استرجاعه تلقائياً عند فتح البرنامج مجدداً.
          </p>
        </div>
      </div>
    </div>
  );
};
