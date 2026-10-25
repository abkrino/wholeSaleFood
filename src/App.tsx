import React, { useState, useEffect } from 'react';
import { storage } from './services/storageService';
import { themeService } from './services/themeService';
import { User, SalesInvoice } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PosSales } from './components/pos/PosSales';
import { InvoicesManager } from './components/invoices/InvoicesManager';
import { InventoryManager } from './components/inventory/InventoryManager';
import { PurchasingManager } from './components/purchasing/PurchasingManager';
import { CustomerLedger } from './components/customers/CustomerLedger';
import { SupplierLedger } from './components/suppliers/SupplierLedger';
import { CashManager } from './components/cash/CashManager';
import { UsersManager } from './components/users/UsersManager';
import { ProfitReports } from './components/reports/ProfitReports';
import { ThemeAccessibilitySettings } from './components/settings/ThemeAccessibilitySettings';
import { BackupManager } from './components/backup/BackupManager';
import { AuditTrail } from './components/audit/AuditTrail';
import { PrintableInvoice } from './components/common/PrintableInvoice';
import { LoginModal } from './components/auth/LoginModal';
import { LayoutDashboard, ShoppingCart, Receipt, Boxes, Menu } from 'lucide-react';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [currentCash, setCurrentCash] = useState<number>(3500);
  const [activePrintInvoice, setActivePrintInvoice] = useState<SalesInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Sync Data
  const refreshAll = () => {
    const active = storage.getActiveUser();
    const allUsers = storage.getUsers();
    setCurrentUser(active);
    setUsers(allUsers);
    setCurrentCash(storage.calculateCurrentCashInDrawer());
  };

  useEffect(() => {
    // Initialize Theme & Accessibility System on load
    themeService.init();

    // Initialize Local SQLite simulation layer
    storage.initDatabase();
    refreshAll();
    setIsInitialized(true);

    // Global keyboard shortcuts (F1 -> POS, F2 -> Invoices, F3 -> Customers, F4 -> Cash)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setEditingInvoice(null);
        setCurrentTab('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentTab('invoices');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentTab('customers');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentTab('cash');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSwitchUser = (userId: string) => {
    storage.setActiveUser(userId);
    refreshAll();
  };

  if (!isInitialized || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-bold text-slate-200">جاري تشغيل نظام التوزيع وقاعدة بيانات SQLite المحلية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none transition-colors" dir="rtl">
      {/* Top Application Navbar */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        users={users}
        currentCash={currentCash}
        onOpenBackupModal={() => setCurrentTab('backup')}
        onOpenSettingsModal={() => setCurrentTab('settings')}
        onLockScreen={() => setIsLocked(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      {/* Main Workspace (Sidebar + Dynamic Screen Area) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Right-To-Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'pos') setEditingInvoice(null);
            setCurrentTab(tab);
          }}
          currentUser={currentUser}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Content Viewport with extra bottom padding on mobile/tablet */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-6 pb-24 lg:pb-6 bg-slate-100/90 dark:bg-slate-950/90 transition-colors">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <Dashboard
                products={storage.getProducts()}
                customers={storage.getCustomers()}
                suppliers={storage.getSuppliers()}
                invoices={storage.getSalesInvoices()}
                cashMovements={storage.getCashMovements()}
                currentCash={currentCash}
                onNavigate={setCurrentTab}
                onOpenTransferModal={() => setCurrentTab('inventory')}
              />
            )}

            {currentTab === 'pos' && (
              <PosSales
                currentUser={currentUser}
                editingInvoice={editingInvoice}
                onCancelEdit={() => setEditingInvoice(null)}
                onInvoiceCreated={(invoice, shouldPrint = true) => {
                  setEditingInvoice(null);
                  refreshAll();
                  if (shouldPrint) {
                    setActivePrintInvoice(invoice);
                  }
                }}
                onOpenCustomerModal={() => setCurrentTab('customers')}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoicesManager
                currentUser={currentUser}
                onNewInvoice={() => {
                  setEditingInvoice(null);
                  setCurrentTab('pos');
                }}
                onEditInvoice={(inv) => {
                  setEditingInvoice(inv);
                  setCurrentTab('pos');
                }}
                onPrintInvoice={(inv) => {
                  setActivePrintInvoice(inv);
                }}
                onRefreshData={refreshAll}
              />
            )}

            {currentTab === 'inventory' && (
              <InventoryManager
                currentUser={currentUser}
                onRefreshData={refreshAll}
              />
            )}

            {currentTab === 'purchasing' && (
              <PurchasingManager
                currentUser={currentUser}
                onRefreshData={refreshAll}
              />
            )}

            {currentTab === 'customers' && (
              <CustomerLedger
                currentUser={currentUser}
                onRefreshData={refreshAll}
              />
            )}

            {currentTab === 'suppliers' && (
              <SupplierLedger
                currentUser={currentUser}
                onRefreshData={refreshAll}
              />
            )}

            {currentTab === 'cash' && (
              <CashManager
                currentUser={currentUser}
                onRefreshData={refreshAll}
              />
            )}

            {currentTab === 'users' && (
              <UsersManager
                currentUser={currentUser}
                onRefreshData={refreshAll}
              />
            )}

            {currentTab === 'reports' && (
              <ProfitReports currentUser={currentUser} />
            )}

            {currentTab === 'settings' && (
              <ThemeAccessibilitySettings />
            )}

            {currentTab === 'backup' && (
              <BackupManager onRefreshData={refreshAll} />
            )}

            {currentTab === 'audit' && (
              <AuditTrail />
            )}
          </div>
        </main>
      </div>

      {/* STICKY MOBILE & TABLET BOTTOM NAVIGATION BAR (< 1024px) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-300 dark:border-slate-800 py-1.5 px-2 flex justify-around items-center shadow-2xl transition-colors select-none"
        aria-label="شريط التنقل السريع للهاتف والتابلت"
      >
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => {
            setCurrentTab('dashboard');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${currentTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">الرئيسية</span>
        </button>

        {/* 2. POS (F1 - Hero Button) */}
        <button
          type="button"
          onClick={() => {
            setEditingInvoice(null);
            setCurrentTab('pos');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[62px] py-1 px-1.5 rounded-xl text-xs transition-all cursor-pointer ${
            currentTab === 'pos'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-black -translate-y-1'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">كاشير F1</span>
        </button>

        {/* 3. Invoices */}
        <button
          type="button"
          onClick={() => {
            setCurrentTab('invoices');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentTab === 'invoices'
              ? 'text-emerald-600 dark:text-emerald-400 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className={`w-5 h-5 ${currentTab === 'invoices' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">الفواتير</span>
        </button>

        {/* 4. Inventory */}
        <button
          type="button"
          onClick={() => {
            setCurrentTab('inventory');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentTab === 'inventory'
              ? 'text-emerald-600 dark:text-emerald-400 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className={`w-5 h-5 ${currentTab === 'inventory' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">المخزن</span>
        </button>

        {/* 5. More / Full Menu Drawer */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isMobileMenuOpen
              ? 'text-emerald-600 dark:text-emerald-400 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">كل الأقسام</span>
        </button>
      </nav>

      {/* Printable Invoice Modal (Triggered on save or reprint) */}
      {activePrintInvoice && (
        <PrintableInvoice
          invoice={activePrintInvoice}
          onClose={() => setActivePrintInvoice(null)}
        />
      )}

      {/* User Login & Lock Screen Modal */}
      {(isLocked || isLoginOpen) && (
        <LoginModal
          users={users}
          currentUser={currentUser}
          isLockScreen={isLocked}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsLocked(false);
            setIsLoginOpen(false);
            refreshAll();
          }}
          onClose={() => {
            if (!isLocked) setIsLoginOpen(false);
          }}
        />
      )}
    </div>
  );
}
