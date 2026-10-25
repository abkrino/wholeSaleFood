import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { themeService, ThemeMode, FontSize } from '../services/themeService';
import { 
  ShieldCheck, 
  UserCheck, 
  HardDrive, 
  Coins, 
  Lock, 
  Sun, 
  Moon, 
  Type, 
  Sliders,
  Menu
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
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  users,
  currentCash,
  onOpenSettingsModal,
  onLockScreen,
  onToggleMobileMenu,
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
    normal: 'عادي',
    large: 'كبير',
    huge: 'ضخم',
  };

  return (
    <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 shadow-sm sticky top-0 z-40 select-none transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Left/Right RTL Brand & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile & Tablet Hamburger Button */}
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              aria-label="فتح القائمة الرئيسية"
              title="فتح القائمة الرئيسية"
            >
              <Menu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </button>
          )}

          {/* Logo Brand */}
          <div className="bg-emerald-600 text-white p-2 sm:p-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 shrink-0">
            <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base font-black tracking-wider hidden xs:inline">نظام الجملة</span>
          </div>

          <div>
            <h1 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-1.5 sm:gap-2 leading-tight">
              <span className="truncate max-w-[130px] sm:max-w-none">توزيع المواد الغذائية</span>
              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 hidden sm:flex items-center gap-1 font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                أوفلاين SQLite
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block font-medium">
              بسكويت • شيبسي • شوكولاتة • مقرمشات (المخزن الموحد)
            </p>
          </div>
        </div>

        {/* Quick Accessibility & Operational Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Cash Drawer Widget (Compact on mobile, full on tablet/desktop) */}
          <div className="bg-amber-50 dark:bg-slate-800/90 border border-amber-300 dark:border-slate-700 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-2 shadow-xs">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[11px] text-slate-600 dark:text-slate-400 block font-bold leading-none hidden sm:block">
                نقدية الدرج:
              </span>
              <span className="text-xs sm:text-base font-black text-amber-700 dark:text-amber-300 font-mono leading-none">
                {currentCash.toLocaleString('ar-EG', { minimumFractionDigits: 0 })} <span className="text-[10px] font-sans font-bold">ج</span>
              </span>
            </div>
          </div>

          {/* Quick Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="min-w-[40px] sm:min-w-[44px] h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs text-xs font-bold"
            title={isDark ? 'التحويل إلى الوضع الفاتح (Light Mode)' : 'التحويل إلى الوضع الداكن (Dark Mode)'}
            aria-label="تبديل مظهر الواجهة"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                <span className="hidden lg:inline">فاتح</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <span className="hidden lg:inline">داكن</span>
              </>
            )}
          </button>

          {/* Quick Font Size Zoom Button */}
          <button
            type="button"
            onClick={handleCycleFontSize}
            className="min-w-[40px] sm:min-w-[44px] h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs text-xs font-bold font-mono"
            title="تكبير حجم الخط لكبار السن وضعاف النظر"
            aria-label="تغيير حجم الخط"
          >
            <Type className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline font-bold">{fontSizeLabels[themeSettings.fontSize]}</span>
          </button>

          {/* Settings Shortcut Button */}
          {onOpenSettingsModal && (
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="hidden md:flex h-10 sm:h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 items-center gap-1.5 cursor-pointer transition-all shadow-xs text-xs font-bold"
              title="إعدادات المظهر والخطوط وإمكانية الوصول"
            >
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden lg:inline">المظهر</span>
            </button>
          )}

          {/* User Profile & Lock Screen */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
            <div className="flex items-center gap-1.5 px-1.5 text-xs">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${currentUser.role === 'ADMIN' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </div>
              <div className="hidden sm:block">
                <span className="font-bold block text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[90px]">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block leading-none">
                  {currentUser.role === 'ADMIN' ? 'المدير' : 'كاشير'}
                </span>
              </div>
            </div>

            <button
              onClick={onLockScreen}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
              title="قفل الشاشة والأمان"
              aria-label="قفل الشاشة"
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
