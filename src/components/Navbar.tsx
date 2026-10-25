import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { themeService, ThemeMode, FontSize } from '../services/themeService';
import { 
  ShieldCheck, 
  UserCheck, 
  HardDrive, 
  Coins, 
  Clock, 
  Database,
  Lock,
  Sun,
  Moon,
  Type,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (userId: string) => void;
  users: User[];
  currentCash: number;
  onOpenBackupModal: () => void;
  onOpenSettingsModal?: () => void;
  onLockScreen: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  users,
  currentCash,
  onOpenBackupModal,
  onOpenSettingsModal,
  onLockScreen,
  onOpenLogin,
}) => {
  const [themeSettings, setThemeSettings] = useState(themeService.getSettings());

  useEffect(() => {
    return themeService.subscribe((updated) => {
      setThemeSettings(updated);
    });
  }, []);

  const isDark = themeService.isDarkMode();

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = isDark ? 'light' : 'dark';
    themeService.updateSetting('theme', nextTheme);
  };

  const handleCycleFontSize = () => {
    const sizes: FontSize[] = ['normal', 'large', 'huge'];
    const nextIndex = (sizes.indexOf(themeSettings.fontSize) + 1) % sizes.length;
    themeService.updateSetting('fontSize', sizes[nextIndex]);
  };

  const fontSizeLabels: Record<FontSize, string> = {
    normal: '18px عادي',
    large: '20px كبير',
    huge: '22px ضخم',
  };

  return (
    <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 shadow-sm sticky top-0 z-40 select-none transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        {/* Brand & Offline Local SQLite Status */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2">
            <HardDrive className="w-6 h-6" />
            <span className="text-base font-black tracking-wider">نظام الجملة 1.0</span>
          </div>
          <div>
            <h1 className="font-black text-lg md:text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>توزيع المواد الغذائية — مصر</span>
              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 font-mono font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                قاعدة بيانات SQLite محلية
              </span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 hidden sm:block font-medium">
              بسكويت • شيبسي • شوكولاتة • مقرمشات • سلع جافة (المخزن الموحد)
            </p>
          </div>
        </div>

        {/* Quick Accessibility & Operational Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cash Drawer Widget (Accessible Large Financial Display) */}
          <div className="bg-amber-50 dark:bg-slate-800/90 border border-amber-300 dark:border-slate-700 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-bold leading-tight">نقدية الدرج الحالية:</span>
              <span className="text-base md:text-lg font-black text-amber-700 dark:text-amber-300 font-mono">
                {currentCash.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
              </span>
            </div>
          </div>

          {/* Quick Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-all shadow-xs text-xs font-bold"
            title={isDark ? 'التحويل إلى الوضع الفاتح (Light Mode)' : 'التحويل إلى الوضع الداكن (Dark Mode)'}
            aria-label="تبديل مظهر الواجهة"
          >
            {isDark ? (
              <>
                <Sun className="w-5 h-5 text-amber-400" />
                <span className="hidden sm:inline">فاتح ☀️</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-indigo-600" />
                <span className="hidden sm:inline">داكن 🌙</span>
              </>
            )}
          </button>

          {/* Quick Font Size Zoom Button */}
          <button
            type="button"
            onClick={handleCycleFontSize}
            className="h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs text-xs font-bold font-mono"
            title="تكبير حجم الخط لكبار السن وضعاف النظر"
            aria-label="تغيير حجم الخط"
          >
            <Type className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">{fontSizeLabels[themeSettings.fontSize]}</span>
          </button>

          {/* Settings Shortcut Button */}
          {onOpenSettingsModal && (
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs text-xs font-bold"
              title="إعدادات المظهر والخطوط وإمكانية الوصول"
            >
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">المظهر</span>
            </button>
          )}

          {/* User Profile & Lock Screen */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <div className="flex items-center gap-2 px-2 text-xs">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${currentUser.role === 'ADMIN' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-bold block text-slate-900 dark:text-slate-100 leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  {currentUser.role === 'ADMIN' ? 'المدير العام' : 'كاشير مبيعات'}
                </span>
              </div>
            </div>

            <button
              onClick={onLockScreen}
              className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
              title="قفل الشاشة والأمان"
              aria-label="قفل الشاشة"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
