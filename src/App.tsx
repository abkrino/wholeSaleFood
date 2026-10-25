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
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/90 dark:bg-slate-950/90 transition-colors">
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
