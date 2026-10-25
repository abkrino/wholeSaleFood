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
  Sparkles
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
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
      badge: 'مخزن واحد',
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

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 flex flex-col justify-between select-none shadow-sm transition-colors overflow-y-auto">
      <div className="p-3.5 space-y-3">
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
              return null; // hide or show locked
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
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

                {item.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold ${
                    isActive 
                      ? 'bg-emerald-700/80 text-white border border-emerald-500' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
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
          إصدار مخصص لتجارة المواد الغذائية والمخازن بالجملة.
        </p>
      </div>
    </aside>
  );
};
