import React from 'react';
import { User } from '../types';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Boxes,
  Truck,
  Users,
  Building2,
  Wallet,
  TrendingUp,
  Database,
  FileText,
  UserCog,
  Sliders,
  X,
  Store,
  ChevronLeft
} from 'lucide-react';

export type TabType = 
  | 'dashboard'
  | 'pos'
  | 'invoices'
  | 'inventory'
  | 'purchasing'
  | 'customers'
  | 'suppliers'
  | 'cash'
  | 'users'
  | 'reports'
  | 'settings'
  | 'backup'
  | 'audit';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentUser: User;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'لوحة التحكم والمؤشرات',
      icon: LayoutDashboard,
      badge: 'عام',
      requiresAdmin: false,
    },
    {
      id: 'pos' as TabType,
      label: 'نقطة البيع وفاتورة جديدة',
      icon: ShoppingCart,
      badge: 'سريع F1',
      requiresAdmin: false,
      highlight: true,
    },
    {
      id: 'invoices' as TabType,
      label: 'سجل وفواتير المبيعات',
      icon: Receipt,
      badge: 'F2',
      requiresAdmin: false,
    },
    {
      id: 'inventory' as TabType,
      label: 'المخزن وتعريف الأصناف',
      icon: Boxes,
      badge: 'مخزن موحد',
      requiresAdmin: false,
    },
    {
      id: 'purchasing' as TabType,
      label: 'المشتريات وتوريد البضاعة',
      icon: Truck,
      requiresAdmin: true,
    },
    {
      id: 'customers' as TabType,
      label: 'حسابات العملاء والديون',
      icon: Users,
      badge: 'F3',
      requiresAdmin: false,
    },
    {
      id: 'suppliers' as TabType,
      label: 'الشركات وتجار الجملة',
      icon: Building2,
      requiresAdmin: true,
    },
    {
      id: 'cash' as TabType,
      label: 'الخزينة والدرج والمصروفات',
      icon: Wallet,
      badge: 'F4',
      requiresAdmin: false,
    },
    {
      id: 'users' as TabType,
      label: 'المستخدمين والصلاحيات',
      icon: UserCog,
      badge: 'الأمان',
      requiresAdmin: true,
    },
    {
      id: 'reports' as TabType,
      label: 'تقارير الأرباح التشغيلية',
      icon: TrendingUp,
      requiresAdmin: true,
    },
    {
      id: 'settings' as TabType,
      label: 'المظهر وإمكانية الوصول',
      icon: Sliders,
      badge: 'سمات وخطوط',
      requiresAdmin: false,
      highlight: false,
    },
    {
      id: 'backup' as TabType,
      label: 'النسخ الاحتياطي والترحيل',
      icon: Database,
      requiresAdmin: true,
    },
    {
      id: 'audit' as TabType,
      label: 'سجل العمليات والرقابة',
      icon: FileText,
      requiresAdmin: true,
    },
  ];

  const handleItemClick = (tabId: TabType) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full">
      <div className="p-3.5 space-y-3">
        {/* Mobile Header with Close button (visible only in mobile drawer) */}
        <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-black text-slate-900 dark:text-white text-base">قائمة النظام الرئيسية</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warehouse Status Banner */}
        <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">نظام التشغيل المحلي</p>
          <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">
            <span>المخزن الرئيسي الموحد</span>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
              أوفلاين 100%
            </span>
          </div>
        </div>

        {/* Navigation Items (Accessible min-height 50px, large text, high contrast) */}
        <nav className="space-y-1.5" aria-label="القائمة الجانبية الرئيسية">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isRestricted = item.requiresAdmin && !isAdmin;

            if (isRestricted) {
              return null;
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full min-h-[50px] px-3.5 py-2.5 rounded-xl text-right font-bold transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : item.highlight
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="text-sm md:text-base leading-tight">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold ${
                      isActive 
                        ? 'bg-emerald-700/80 text-white border border-emerald-500' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronLeft className={`w-4 h-4 lg:hidden ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Quick Theme Link */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div className="flex justify-between items-center font-bold">
          <span>نظام التوزيع (مصر v1.0)</span>
          <span className="text-emerald-600 dark:text-emerald-400">مفعل محلياً ✓</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          إصدار مهيأ بالكامل للهواتف الذكية، التابلت، وشاشات نقاط البيع.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP PERMANENT SIDEBAR (Hidden on mobile and tablet < 1024px) */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 flex-col justify-between select-none shadow-sm transition-colors overflow-y-auto">
        {navContent}
      </aside>

      {/* 2. MOBILE & TABLET SLIDING OFF-CANVAS DRAWER (< 1024px) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex" dir="rtl" role="dialog" aria-modal="true">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Sliding Drawer Panel */}
          <aside className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-right duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
