import React, { useState } from 'react';
import { SalesInvoice, Expense, Product, Customer, Supplier, User } from '../../types';
import { storage } from '../../services/storageService';
import { 
  TrendingUp, 
  PieChart, 
  DollarSign, 
  ShieldAlert, 
  Calendar, 
  Building2, 
  Users, 
  Boxes, 
  Layers, 
  Search, 
  Printer, 
  ArrowUpRight, 
  Percent,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface ProfitReportsProps {
  currentUser: User;
}

export const ProfitReports: React.FC<ProfitReportsProps> = ({ currentUser }) => {
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.permissions?.canViewProfits;

  // Period Filter: TODAY | MONTH | CUSTOM
  const [periodMode, setPeriodMode] = useState<'TODAY' | 'MONTH' | 'CUSTOM'>('MONTH');
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.slice(0, 7);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Breakdown View: 'SUPPLIER' | 'CUSTOMER' | 'PRODUCT' | 'CATEGORY'
  const [breakdownView, setBreakdownView] = useState<'SUPPLIER' | 'CUSTOMER' | 'PRODUCT' | 'CATEGORY'>('SUPPLIER');
  const [breakdownSearch, setBreakdownSearch] = useState('');

  const invoices = storage.getSalesInvoices();
  const expenses = storage.getExpenses();
  const products = storage.getProducts();
  const customers = storage.getCustomers();
  const suppliers = storage.getSuppliers();

  // If not authorized, access denied
  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-10 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm transition-colors" dir="rtl">
        <ShieldAlert className="w-14 h-14 text-amber-500 mx-auto" />
        <h3 className="text-xl font-black text-slate-900 dark:text-white">غير مصرح بالدخول (صلاحية خاصة بالمدير العام)</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
          تقارير الأرباح التشغيلية، تكاليف البضاعة المباعة (COGS)، وهامش مجمل الربح محجوبة عن حساب مسؤول المبيعات لحماية سرية بيانات أرباح الشركة.
        </p>
      </div>
    );
  }

  // Filter Invoices by Period
  const filteredInvoices = invoices.filter(inv => {
    if (periodMode === 'TODAY') {
      return inv.date === todayStr;
    } else if (periodMode === 'MONTH') {
      return inv.date.startsWith(currentMonthPrefix);
    } else {
      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;
      return true;
    }
  });

  // Filter Expenses by Period
  const filteredExpenses = expenses.filter(exp => {
    if (periodMode === 'TODAY') {
      return exp.date === todayStr;
    } else if (periodMode === 'MONTH') {
      return exp.date.startsWith(currentMonthPrefix);
    } else {
      if (startDate && exp.date < startDate) return false;
      if (endDate && exp.date > endDate) return false;
      return true;
    }
  });

  // Calculate High-level Financial Metrics for Period
  const grossSales = filteredInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalDiscounts = filteredInvoices.reduce((sum, inv) => sum + inv.discountAmount, 0);
  const netSalesRevenue = grossSales - totalDiscounts;

  let totalCOGS = 0;
  for (const inv of filteredInvoices) {
    for (const item of inv.items) {
      totalCOGS += (item.costPrice * item.quantity);
    }
  }

  const grossProfit = netSalesRevenue - totalCOGS;
  const grossMarginPct = netSalesRevenue > 0 ? (grossProfit / netSalesRevenue) * 100 : 0;

  const totalOperatingExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netProfitPct = netSalesRevenue > 0 ? (netOperatingProfit / netSalesRevenue) * 100 : 0;

  // 1. PROFIT BY SUPPLIER / COMPANY (الربحية حسب الشركة والمورد)
  const supplierProfitMap: Record<string, { name: string; revenue: number; cost: number; profit: number; count: number }> = {};
  for (const inv of filteredInvoices) {
    for (const item of inv.items) {
      const prod = products.find(p => p.id === item.productId);
      const companyName = prod?.brand || 'شركات أخرى عامة';
      if (!supplierProfitMap[companyName]) {
        supplierProfitMap[companyName] = { name: companyName, revenue: 0, cost: 0, profit: 0, count: 0 };
      }
      const rev = item.totalPrice;
      const cost = item.costPrice * item.quantity;
      supplierProfitMap[companyName].revenue += rev;
      supplierProfitMap[companyName].cost += cost;
      supplierProfitMap[companyName].profit += (rev - cost);
      supplierProfitMap[companyName].count += item.quantity;
    }
  }

  // 2. PROFIT BY CUSTOMER (الربحية حسب العملاء)
  const customerProfitMap: Record<string, { id: string; name: string; revenue: number; cost: number; profit: number; invoiceCount: number }> = {};
  for (const inv of filteredInvoices) {
    const custId = inv.customerId;
    const custName = inv.customerName;
    if (!customerProfitMap[custId]) {
      customerProfitMap[custId] = { id: custId, name: custName, revenue: 0, cost: 0, profit: 0, invoiceCount: 0 };
    }
    customerProfitMap[custId].invoiceCount += 1;
    for (const item of inv.items) {
      const rev = item.totalPrice;
      const cost = item.costPrice * item.quantity;
      customerProfitMap[custId].revenue += rev;
      customerProfitMap[custId].cost += cost;
      customerProfitMap[custId].profit += (rev - cost);
    }
  }

  // 3. PROFIT BY PRODUCT (الربحية حسب المنتج)
  const productProfitMap: Record<string, { id: string; name: string; code: string; brand: string; revenue: number; cost: number; profit: number; qtySold: number }> = {};
  for (const inv of filteredInvoices) {
    for (const item of inv.items) {
      const pId = item.productId;
      if (!productProfitMap[pId]) {
        const p = products.find(prod => prod.id === pId);
        productProfitMap[pId] = {
          id: pId,
          name: item.productName,
          code: item.productCode || p?.code || '-',
          brand: p?.brand || 'عام',
          revenue: 0,
          cost: 0,
          profit: 0,
          qtySold: 0
        };
      }
      const rev = item.totalPrice;
      const cost = item.costPrice * item.quantity;
      productProfitMap[pId].revenue += rev;
      productProfitMap[pId].cost += cost;
      productProfitMap[pId].profit += (rev - cost);
      productProfitMap[pId].qtySold += item.quantity;
    }
  }

  // 4. PROFIT BY CATEGORY (الربحية حسب التصنيف)
  const categoryProfitMap: Record<string, { name: string; revenue: number; cost: number; profit: number; itemsCount: number }> = {};
  for (const inv of filteredInvoices) {
    for (const item of inv.items) {
      const prod = products.find(p => p.id === item.productId);
      const cat = prod?.category || 'أخرى';
      if (!categoryProfitMap[cat]) {
        categoryProfitMap[cat] = { name: cat, revenue: 0, cost: 0, profit: 0, itemsCount: 0 };
      }
      const rev = item.totalPrice;
      const cost = item.costPrice * item.quantity;
      categoryProfitMap[cat].revenue += rev;
      categoryProfitMap[cat].cost += cost;
      categoryProfitMap[cat].profit += (rev - cost);
      categoryProfitMap[cat].itemsCount += item.quantity;
    }
  }

  // Convert to Arrays & Sort by Profit descending
  const supplierRows = Object.values(supplierProfitMap)
    .sort((a, b) => b.profit - a.profit)
    .filter(r => !breakdownSearch || r.name.toLowerCase().includes(breakdownSearch.toLowerCase()));

  const customerRows = Object.values(customerProfitMap)
    .sort((a, b) => b.profit - a.profit)
    .filter(r => !breakdownSearch || r.name.toLowerCase().includes(breakdownSearch.toLowerCase()));

  const productRows = Object.values(productProfitMap)
    .sort((a, b) => b.profit - a.profit)
    .filter(r => !breakdownSearch || r.name.toLowerCase().includes(breakdownSearch.toLowerCase()) || r.code.toLowerCase().includes(breakdownSearch.toLowerCase()));

  const categoryRows = Object.values(categoryProfitMap)
    .sort((a, b) => b.profit - a.profit)
    .filter(r => !breakdownSearch || r.name.toLowerCase().includes(breakdownSearch.toLowerCase()));

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header with Print & Quick Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>تقارير وتحليلات الأرباح التشغيلية</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            تحليل الربحية اليومية والشهرية والبحث بالفترة — مع تفصيل الأرباح حسب الشركة والمورد، حسب العملاء، وحسب المنتج.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 print:hidden"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة تقرير الأرباح</span>
        </button>
      </div>

      {/* Period Selection Controls: Daily, Monthly, Custom Range */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>الفترة المحاسبية للتقرير:</span>
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPeriodMode('TODAY')}
              className={`text-xs px-4 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                periodMode === 'TODAY'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              📅 ربح اليوم
            </button>

            <button
              type="button"
              onClick={() => setPeriodMode('MONTH')}
              className={`text-xs px-4 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                periodMode === 'MONTH'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              🗓️ ربح الشهر الحالي
            </button>

            <button
              type="button"
              onClick={() => setPeriodMode('CUSTOM')}
              className={`text-xs px-4 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                periodMode === 'CUSTOM'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              🔍 بحث بالفترة المخصصة
            </button>
          </div>
        </div>

        {/* Custom Range Picker */}
        {periodMode === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs flex-wrap">
            <span className="text-slate-500 font-bold">من تاريخ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
            />
            <span className="text-slate-500 font-bold">إلى تاريخ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>
        )}
      </div>

      {/* Primary Financial Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">صافي إيرادات المبيعات</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {netSalesRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5 font-bold">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
            من {filteredInvoices.length} فاتورة في الفترة
          </span>
        </div>

        {/* COGS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">تكلفة البضاعة المباعة (COGS)</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {totalCOGS.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5 font-bold">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-medium">
            تكلفة الشراء الفعلية للأصناف
          </span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-4 shadow-xs transition-colors">
          <span className="text-xs text-emerald-800 dark:text-emerald-300 block font-bold">إجمالي مجمل الربح</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              +{grossProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-emerald-600 mr-1.5 font-bold">ج.م</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-black block mt-1 font-mono">
            هامش مجمل الربح: {grossMarginPct.toFixed(1)}%
          </span>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
          <span className="text-xs text-slate-700 dark:text-slate-300 block font-bold">صافي الربح التشغيلي</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {netOperatingProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 mr-1.5 font-bold">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
            بعد خصم {totalOperatingExpenses.toLocaleString()} ج.م مصروفات الفترة
          </span>
        </div>
      </div>

      {/* Breakdown Views Navigation (حسب الشركة، حسب العملاء، حسب المنتج، حسب التصنيف) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">تفصيل وتحليل الربحية:</h3>
            <p className="text-xs text-slate-500">اختر المنظور لعرض الأرباح والمبيعات والتكلفة بدقة</p>
          </div>

          {/* Sub-view selection tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => { setBreakdownView('SUPPLIER'); setBreakdownSearch(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                breakdownView === 'SUPPLIER'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏢 حسب الشركة / المورد</span>
            </button>

            <button
              type="button"
              onClick={() => { setBreakdownView('CUSTOMER'); setBreakdownSearch(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                breakdownView === 'CUSTOMER'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>👥 حسب العملاء</span>
            </button>

            <button
              type="button"
              onClick={() => { setBreakdownView('PRODUCT'); setBreakdownSearch(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                breakdownView === 'PRODUCT'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>📦 حسب المنتج</span>
            </button>

            <button
              type="button"
              onClick={() => { setBreakdownView('CATEGORY'); setBreakdownSearch(''); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                breakdownView === 'CATEGORY'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🏷️ حسب التصنيف</span>
            </button>
          </div>
        </div>

        {/* Search within current breakdown */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={breakdownSearch}
            onChange={(e) => setBreakdownSearch(e.target.value)}
            placeholder={`بحث في نتائج الأرباح ${breakdownView === 'SUPPLIER' ? 'باسم الشركة...' : breakdownView === 'CUSTOMER' ? 'باسم العميل...' : breakdownView === 'PRODUCT' ? 'باسم أو كود المنتج...' : 'باسم التصنيف...'}`}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white"
          />
        </div>

        {/* 1. VIEW: PROFIT BY COMPANY / SUPPLIER */}
        {breakdownView === 'SUPPLIER' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                  <th className="p-3">اسم الشركة / المصنع</th>
                  <th className="p-3 text-center">الكمية المباعة</th>
                  <th className="p-3 text-center">إجمالي المبيعات</th>
                  <th className="p-3 text-center">تكلفة الشراء (COGS)</th>
                  <th className="p-3 text-center">مجمل الربح</th>
                  <th className="p-3 text-left">هامش الربح %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {supplierRows.map((r, idx) => {
                  const margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                      <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>{r.name}</span>
                      </td>
                      <td className="p-3 text-center font-mono">{r.count} قطعة/كرتونة</td>
                      <td className="p-3 text-center font-mono font-bold">{r.revenue.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono text-slate-500">{r.cost.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{r.profit.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-600">
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. VIEW: PROFIT BY CUSTOMER */}
        {breakdownView === 'CUSTOMER' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                  <th className="p-3">اسم العميل / المحل</th>
                  <th className="p-3 text-center">عدد الفواتير</th>
                  <th className="p-3 text-center">قيمة المشتريات</th>
                  <th className="p-3 text-center">تكلفة البضاعة</th>
                  <th className="p-3 text-center">صافي الربح من العميل</th>
                  <th className="p-3 text-left">هامش الربح %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {customerRows.map((r, idx) => {
                  const margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                      <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{r.name}</span>
                      </td>
                      <td className="p-3 text-center font-mono">{r.invoiceCount} فواتير</td>
                      <td className="p-3 text-center font-mono font-bold">{r.revenue.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono text-slate-500">{r.cost.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{r.profit.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-600">
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. VIEW: PROFIT BY PRODUCT */}
        {breakdownView === 'PRODUCT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                  <th className="p-3">اسم الصنف</th>
                  <th className="p-3 text-center">الشركة / الماركة</th>
                  <th className="p-3 text-center">الكمية المباعة</th>
                  <th className="p-3 text-center">إجمالي المبيعات</th>
                  <th className="p-3 text-center">تكلفة الشراء</th>
                  <th className="p-3 text-center">الربح المحقق</th>
                  <th className="p-3 text-left">هامش الربح %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {productRows.map((r, idx) => {
                  const margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{r.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{r.code}</span>
                      </td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-400">{r.brand}</td>
                      <td className="p-3 text-center font-mono font-bold">{r.qtySold}</td>
                      <td className="p-3 text-center font-mono font-bold">{r.revenue.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono text-slate-500">{r.cost.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{r.profit.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-600">
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. VIEW: PROFIT BY CATEGORY */}
        {breakdownView === 'CATEGORY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-center">الكمية المباعة</th>
                  <th className="p-3 text-center">إجمالي المبيعات</th>
                  <th className="p-3 text-center">تكلفة الشراء</th>
                  <th className="p-3 text-center">إجمالي الربح</th>
                  <th className="p-3 text-left">هامش الربح %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {categoryRows.map((r, idx) => {
                  const margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                      <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span>{r.name}</span>
                      </td>
                      <td className="p-3 text-center font-mono">{r.itemsCount}</td>
                      <td className="p-3 text-center font-mono font-bold">{r.revenue.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono text-slate-500">{r.cost.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{r.profit.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-600">
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
