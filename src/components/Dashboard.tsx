import React, { useState } from 'react';
import { Product, Customer, Supplier, SalesInvoice, CashMovement, User } from '../types';
import { storage } from '../services/storageService';
import { TabType } from './Sidebar';
import { 
  TrendingUp, 
  Coins, 
  Users, 
  Building2, 
  AlertTriangle, 
  CalendarClock, 
  ArrowRight,
  ShoppingCart,
  Boxes,
  Receipt,
  PlusCircle,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  Eye,
  EyeOff,
  Filter,
  DollarSign
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: SalesInvoice[];
  cashMovements: CashMovement[];
  currentCash: number;
  onNavigate: (tab: TabType) => void;
  onOpenTransferModal: () => void;
  currentUser?: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  customers,
  suppliers,
  invoices,
  currentCash,
  onNavigate,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.permissions?.canViewProfits;

  // Filter Mode: 'TODAY' | 'MONTH' | 'CUSTOM'
  const [filterMode, setFilterMode] = useState<'TODAY' | 'MONTH' | 'CUSTOM'>('TODAY');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.slice(0, 7); // 'YYYY-MM'

  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [showProfitMasked, setShowProfitMasked] = useState<boolean>(false);

  // Filter invoices based on selected period
  const filteredInvoices = invoices.filter(inv => {
    if (filterMode === 'TODAY') {
      return inv.date === todayStr;
    } else if (filterMode === 'MONTH') {
      return inv.date.startsWith(currentMonthPrefix);
    } else {
      return inv.date >= customStartDate && inv.date <= customEndDate;
    }
  });

  const periodSalesTotal = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const periodTotalProfit = filteredInvoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);

  // Filter expenses based on period
  const allExpenses = storage.getExpenses();
  const periodExpenses = allExpenses.filter(exp => {
    if (filterMode === 'TODAY') {
      return exp.date === todayStr;
    } else if (filterMode === 'MONTH') {
      return exp.date.startsWith(currentMonthPrefix);
    } else {
      return exp.date >= customStartDate && exp.date <= customEndDate;
    }
  });
  const periodExpensesTotal = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const periodNetProfit = periodTotalProfit - periodExpensesTotal;

  // Inventory valuation at cost
  const totalInventoryCost = products.reduce((sum, p) => sum + (p.stockPieces * p.costPricePerBase), 0);

  const totalCustomerDebt = customers.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  // Low stock in Single Warehouse
  const lowStock = products.filter(p => p.stockPieces <= p.reorderLevelPieces);

  // Near expiry (within 90 days)
  const now = new Date();
  const ninetyDaysLater = new Date();
  ninetyDaysLater.setDate(now.getDate() + 90);

  const nearExpiryProducts = products.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp <= ninetyDaysLater && exp >= now;
  });

  // Over-limit or near-limit customers (> 85%)
  const nearLimitCustomers = customers.filter(
    c => c.isCreditAllowed && c.creditLimit > 0 && c.currentBalance >= c.creditLimit * 0.85
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner / Welcome with Accessible Large Quick Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span>لوحة الإدارة والتشغيل اليومي</span>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-3 py-1 rounded-full font-bold">
              الوردية الحالية مفتوحة ✓
            </span>
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-1 font-medium">
            متابعة فورية للمبيعات، نقدية الدرج، أرصدة المخزن الموحد، ومديونيات العملاء والموردين.
          </p>
        </div>

        {/* Quick Launch Accessible Actions (52-60px height) */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="btn-primary-accessible bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 cursor-pointer text-base font-black"
          >
            <ShoppingCart className="w-6 h-6" />
            <span>+ فاتورة مبيعات جديدة (F1)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="btn-primary-accessible bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-900/30 cursor-pointer text-base font-bold"
          >
            <Coins className="w-5 h-5" />
            <span>سند تحصيل عميل (F3)</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar (اليوم / الشهر الحالي / بحث بالفترة) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-black text-slate-900 dark:text-white">فترة الإحصائيات والتشغيل:</span>
          
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setFilterMode('TODAY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'TODAY' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              اليوم (يومي)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'MONTH' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              الشهر الحالي (شهري للمدير)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'CUSTOM' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              بحث بالفترة 🔍
            </button>
          </div>
        </div>

        {/* Custom Date Range Controls */}
        {filterMode === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs flex-wrap bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400 font-bold">من:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white font-mono"
            />
            <span className="text-slate-600 dark:text-slate-400 font-bold">إلى:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white font-mono"
            />
          </div>
        )}
      </div>

      {/* Primary KPI Cards (Accessible large 24-32px financial numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sales in Period */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
              {filterMode === 'TODAY' ? 'إجمالي مبيعات اليوم' : filterMode === 'MONTH' ? 'إجمالي مبيعات الشهر' : 'إجمالي مبيعات الفترة'}
            </span>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {periodSalesTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 mr-2">ج.م</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span>عدد الفواتير المنفذة:</span>
            <span className="font-bold text-slate-900 dark:text-slate-200">{filteredInvoices.length} فواتير</span>
          </div>
        </div>

        {/* KPI 2: Current Drawer Cash */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">النقدية الفعلية بالدرج</span>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-300 font-mono">
              {currentCash.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 mr-2">ج.م</span>
          </div>
          <div className="mt-2.5 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>مطابقة مع حركة الخزينة اليوم</span>
          </div>
        </div>

        {/* KPI 3: Customer Receivables */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">مديونيات العملاء (لنا)</span>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-blue-700 dark:text-blue-300 font-mono">
              {totalCustomerDebt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 mr-2">ج.م</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>موزعة على {customers.filter(c => c.currentBalance > 0).length} عملاء ومحلات</span>
          </div>
        </div>

        {/* KPI 4: Supplier Payables */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">مستحقات الموردين (علينا)</span>
            <div className="p-2.5 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-rose-700 dark:text-rose-300 font-mono">
              {totalSupplierDebt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 mr-2">ج.م</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>موزعة على {suppliers.filter(s => s.currentBalance > 0).length} شركات وموردين</span>
          </div>
        </div>
      </div>

      {/* MANAGER ONLY: Executive Profit & Valuation Dashboard */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                لوحة المدير التنفيذية — مؤشرات الأرباح وتكلفة المخزون ({filterMode === 'TODAY' ? 'اليوم' : filterMode === 'MONTH' ? 'الشهر الحالي' : 'الفترة المحددة'})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowProfitMasked(!showProfitMasked)}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {showProfitMasked ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
              <span>{showProfitMasked ? 'إخفاء الأرقام السرية' : 'إظهار أرباح المدير'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Period Gross Profit */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
              <span className="text-xs text-emerald-800 dark:text-emerald-400 font-bold block">مجمل أرباح الفواتير للفترة:</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {showProfitMasked 
                    ? `+${periodTotalProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}` 
                    : '••••••••'}
                </span>
                <span className="text-xs text-emerald-800 dark:text-emerald-400 mr-1.5 font-bold">ج.م</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl p-4">
              <span className="text-xs text-rose-800 dark:text-rose-400 font-bold block">المصروفات التشغيلية للفترة:</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
                  {periodExpensesTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-rose-800 dark:text-rose-400 mr-1.5 font-bold">ج.م</span>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
              <span className="text-xs text-blue-800 dark:text-blue-400 font-bold block">صافي الربح التشغيلي:</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
                  {showProfitMasked 
                    ? `${periodNetProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}` 
                    : '••••••••'}
                </span>
                <span className="text-xs text-blue-800 dark:text-blue-400 mr-1.5 font-bold">ج.م</span>
              </div>
            </div>

            {/* Inventory Cost Valuation */}
            <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl p-4">
              <span className="text-xs text-purple-800 dark:text-purple-400 font-bold block">قيمة بضاعة المخزن بسعر الشراء:</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
                  {totalInventoryCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-purple-800 dark:text-purple-400 mr-1.5 font-bold">ج.م</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Operational Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alert 1: Low Stock in Single Warehouse */}
        <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-600/40 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-base">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>أصناف قاربت على النفاذ بالمخزن ({lowStock.length})</span>
              </div>
              <button 
                onClick={() => onNavigate('inventory')}
                className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>المخزن</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {lowStock.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 font-medium">رصيد جميع الأصناف بالمخزن كافٍ وآمن</p>
              ) : (
                lowStock.slice(0, 3).map(p => {
                  const cartons = Math.floor(p.stockPieces / p.piecesPerWholesaleUnit);
                  const piecesRem = p.stockPieces % p.piecesPerWholesaleUnit;

                  return (
                    <div key={p.id} className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{p.brand}</p>
                      </div>
                      <div className="text-left font-mono">
                        <span className={`text-sm font-black ${p.stockPieces < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {cartons} كرتونة {piecesRem !== 0 ? `+ ${piecesRem} ق` : ''}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-sans">
                          حد الطلب: {Math.floor(p.reorderLevelPieces / p.piecesPerWholesaleUnit)} كرتونة
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Alert 2: Near Expiry Goods */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-black text-base">
                <CalendarClock className="w-5 h-5 shrink-0" />
                <span>تنبيه صلاحيات قريبة ({nearExpiryProducts.length})</span>
              </div>
              <button 
                onClick={() => onNavigate('inventory')}
                className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>المخزن</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {nearExpiryProducts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 font-medium">لا توجد أصناف أوشكت صلاحيتها على الانتهاء</p>
              ) : (
                nearExpiryProducts.map(p => (
                  <div key={p.id} className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">تشغيلة: {p.batchNumber || 'عامة'}</p>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-mono text-rose-700 dark:text-rose-300 font-black bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-md">
                        {p.expiryDate}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Alert 3: Customer Credit Limit Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-black text-base">
                <Users className="w-5 h-5 shrink-0" />
                <span>عملاء قاربوا سقف الائتمان ({nearLimitCustomers.length})</span>
              </div>
              <button 
                onClick={() => onNavigate('customers')}
                className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>التحصيل</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {nearLimitCustomers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 font-medium">جميع مديونيات العملاء ضمن الحدود الآمنة</p>
              ) : (
                nearLimitCustomers.map(c => {
                  const pct = Math.round((c.currentBalance / c.creditLimit) * 100);
                  return (
                    <div key={c.id} className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.name}</span>
                        <span className="font-black font-mono text-amber-700 dark:text-amber-400 text-sm">{c.currentBalance.toLocaleString()} ج.م</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>الحد الأقصى: {c.creditLimit.toLocaleString()} ج.م</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{pct}% من السقف</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table (Senior & Accessibility Friendly) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-black text-lg md:text-xl text-slate-900 dark:text-white">آخر فواتير المبيعات الصادرة</h3>
          </div>
          <button
            onClick={() => onNavigate('pos')}
            className="btn-secondary-accessible bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-black cursor-pointer text-sm"
          >
            <span>+ إصدار فاتورة جديدة (F1)</span>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 font-bold">
                <th className="py-3 px-3">رقم الفاتورة</th>
                <th className="py-3 px-3">الوقت</th>
                <th className="py-3 px-3">العميل / المحل</th>
                <th className="py-3 px-3">المخزن</th>
                <th className="py-3 px-3">عدد الأصناف</th>
                <th className="py-3 px-3">الإجمالي الصافي</th>
                <th className="py-3 px-3">طريقة السداد</th>
                <th className="py-3 px-3">مسؤول البيع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {filteredInvoices.slice(0, 8).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-100 transition-colors">
                  <td className="py-3 px-3 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm md:text-base">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                    {inv.time}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {inv.customerName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold">
                      المخزن الموحد
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold">{inv.items.length} صنف</td>
                  <td className="py-3 px-3 font-black font-mono text-base text-slate-900 dark:text-white">
                    {inv.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                      inv.paymentType === 'CASH'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    }`}>
                      {inv.paymentType === 'CASH' ? 'نقدي فوري' : inv.paymentType === 'CREDIT' ? 'آجل بالكامل' : 'دفعة + آجل'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                    {inv.salespersonName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
