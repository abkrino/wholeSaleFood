import {
  Product, Customer, Supplier, SalesInvoice, PurchaseInvoice,
  CashMovement, Expense, AuditLog, SystemShift, User, StockAdjustment
} from '../types';
import {
  INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SUPPLIERS, INITIAL_SHIFT,
  INITIAL_EXPENSES, INITIAL_CASH_MOVEMENTS, INITIAL_INVOICES, INITIAL_USERS
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'wf_products_v2',
  CUSTOMERS: 'wf_customers_v2',
  SUPPLIERS: 'wf_suppliers_v2',
  INVOICES: 'wf_invoices_v2',
  PURCHASES: 'wf_purchases_v2',
  CASH_MOVEMENTS: 'wf_cash_movements_v2',
  EXPENSES: 'wf_expenses_v2',
  AUDIT_LOGS: 'wf_audit_logs_v2',
  STOCK_ADJUSTMENTS: 'wf_stock_adjustments_v2',
  SHIFT: 'wf_current_shift_v2',
  USERS: 'wf_users_v2',
  ACTIVE_USER_ID: 'wf_active_user_id_v2',
};

class StorageService {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- INITIALIZATION ---
  public initDatabase(): void {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.setItem(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
      this.setItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
      this.setItem(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
      this.setItem(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
      this.setItem(STORAGE_KEYS.PURCHASES, []);
      this.setItem(STORAGE_KEYS.CASH_MOVEMENTS, INITIAL_CASH_MOVEMENTS);
      this.setItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
      this.setItem(STORAGE_KEYS.SHIFT, INITIAL_SHIFT);
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
      this.setItem(STORAGE_KEYS.ACTIVE_USER_ID, INITIAL_USERS[0].id);
      this.addAuditLog('SYSTEM', 'إعداد النظام', 'النظام', 'sys-0', 'تمت تهيئة قاعدة بيانات نظام توزيع المواد الغذائية بالجملة');
    }
  }

  // --- USERS & ROLES MANAGEMENT ---
  public getUsers(): User[] {
    const users = this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let migrated = false;
    for (const u of users) {
      if (!u.pinCode) {
        u.pinCode = u.role === 'ADMIN' ? '1234' : '1111';
        migrated = true;
      }
      if (!u.permissions) {
        u.permissions = {
          canEditPrice: true,
          canGiveDiscount: true,
          canSellNegativeStock: true,
          canDeleteInvoice: u.role === 'ADMIN',
          canEditInvoice: true,
          canViewProfits: u.role === 'ADMIN',
          canManageProducts: u.role === 'ADMIN',
          canManagePurchases: u.role === 'ADMIN',
          canManageCash: u.role === 'ADMIN',
        };
        migrated = true;
      }
    }
    if (migrated) {
      this.setItem(STORAGE_KEYS.USERS, users);
    }
    return users;
  }

  public getActiveUser(): User {
    const users = this.getUsers();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) || users[0].id;
    return users.find(u => u.id === activeId) || users[0];
  }

  public setActiveUser(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, userId);
  }

  public saveUser(user: User): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      // Check duplicate username
      if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
        return { success: false, error: 'اسم المستخدم مسجل مسبقاً' };
      }
      users.push(user);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
    this.addAuditLog('USER', 'حفظ مستخدم', 'المستخدمين', user.id, `تم حفظ بيانات المستخدم: ${user.fullName} (${user.role})`);
    return { success: true };
  }

  public deleteUser(userId: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود' };
    
    // Prevent deleting last admin
    const admins = users.filter(u => u.role === 'ADMIN');
    if (user.role === 'ADMIN' && admins.length <= 1) {
      return { success: false, error: 'لا يمكن حذف آخر مدير نظام متبقي في البرنامج' };
    }

    const filtered = users.filter(u => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, filtered);
    this.addAuditLog('USER', 'حذف مستخدم', 'المستخدمين', userId, `تم حذف المستخدم: ${user.fullName}`);
    return { success: true };
  }

  public authenticate(userId: string, pin: string): { success: boolean; error?: string; user?: User } {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود' };
    
    const validPin = (user.pinCode || (user.role === 'ADMIN' ? '1234' : '1111')).trim();
    if (validPin !== pin.trim()) {
      return { success: false, error: 'الرقم السري غير صحيح، حاول مرة أخرى' };
    }
    this.setActiveUser(user.id);
    this.addAuditLog('AUTH', 'تسجيل دخول', 'الأمان', user.id, `تسجيل دخول: ${user.fullName} (${user.role === 'ADMIN' ? 'مدير عام' : 'كاشير'})`);
    return { success: true, user };
  }

  public changeUserPin(userId: string, oldPin: string, newPin: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود' };
    if (user.pinCode !== oldPin) return { success: false, error: 'الرقم السري الحالي غير صحيح' };
    if (newPin.trim().length < 4) return { success: false, error: 'الرقم السري يجب ألا يقل عن 4 خانات' };

    user.pinCode = newPin.trim();
    this.setItem(STORAGE_KEYS.USERS, users);
    this.addAuditLog('AUTH', 'تعديل الباسورد', 'الأمان', user.id, `تم تغيير الرقم السري للمستخدم: ${user.fullName}`);
    return { success: true };
  }

  // --- PRODUCTS (SINGLE WAREHOUSE) ---
  public getProducts(): Product[] {
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    // Backward compatibility migration for single warehouse
    let migrated = false;
    for (const p of products) {
      if (p.stockPieces === undefined) {
        p.stockPieces = ((p as any).stockShopPieces || 0) + ((p as any).stockWarehousePieces || 0);
        migrated = true;
      }
    }
    if (migrated) {
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
    }
    return products;
  }

  public saveProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('PRODUCT', 'حفظ صنف', 'الأصناف', product.id, `حفظ الصنف: ${product.name} (المخزن: ${product.stockPieces} قطعة)`);
  }

  public deleteProduct(productId: string): { success: boolean; error?: string } {
    const products = this.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return { success: false, error: 'الصنف غير موجود' };

    const filtered = products.filter(p => p.id !== productId);
    this.setItem(STORAGE_KEYS.PRODUCTS, filtered);
    this.addAuditLog('PRODUCT', 'حذف صنف', 'الأصناف', productId, `تم حذف الصنف: ${prod.name}`);
    return { success: true };
  }

  // --- CUSTOMERS & STATEMENTS ---
  public getCustomers(): Customer[] {
    return this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  public saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
    } else {
      customers.unshift(customer);
    }
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    this.addAuditLog('CUSTOMER', 'حفظ عميل', 'العملاء', customer.id, `حفظ بيانات العميل: ${customer.name}`);
  }

  public deleteCustomer(customerId: string, clearDebtAndForce: boolean = false): { success: boolean; error?: string } {
    const customers = this.getCustomers();
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return { success: false, error: 'العميل غير موجود' };
    
    if (cust.currentBalance > 0 && !clearDebtAndForce) {
      return { success: false, error: `لا يمكن حذف العميل لأن عليه مديونية قائمة قدرها ${cust.currentBalance} ج.م` };
    }

    const filtered = customers.filter(c => c.id !== customerId);
    this.setItem(STORAGE_KEYS.CUSTOMERS, filtered);
    this.addAuditLog('CUSTOMER', 'حذف عميل', 'العملاء', customerId, `تم حذف العميل: ${cust.name} ${cust.currentBalance > 0 ? `(تم إسقاط مديونية قدرها ${cust.currentBalance} ج.م)` : ''}`);
    return { success: true };
  }

  public getCustomerStatement(customerId: string): {
    customer: Customer;
    invoices: SalesInvoice[];
    payments: CashMovement[];
  } | null {
    const cust = this.getCustomers().find(c => c.id === customerId);
    if (!cust) return null;

    const invoices = this.getSalesInvoices().filter(inv => inv.customerId === customerId);
    const payments = this.getCashMovements().filter(
      m => m.category === 'CUSTOMER_COLLECTION' && m.description.includes(cust.name)
    );

    return { customer: cust, invoices, payments };
  }

  // --- SUPPLIERS ---
  public getSuppliers(): Supplier[] {
    return this.getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  public saveSupplier(supplier: Supplier): void {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex(s => s.id === supplier.id);
    if (index >= 0) {
      suppliers[index] = supplier;
    } else {
      suppliers.unshift(supplier);
    }
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  public deleteSupplier(supplierId: string): { success: boolean; error?: string } {
    const suppliers = this.getSuppliers();
    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp) return { success: false, error: 'المورد غير موجود' };
    if (supp.currentBalance > 0) {
      return { success: false, error: `لا يمكن حذف المورد لأن له مستحقات قائمة قدرها ${supp.currentBalance} ج.م` };
    }
    const filtered = suppliers.filter(s => s.id !== supplierId);
    this.setItem(STORAGE_KEYS.SUPPLIERS, filtered);
    return { success: true };
  }

  // --- SHIFTS & DRAWER CASH ---
  public getCurrentShift(): SystemShift {
    return this.getItem<SystemShift>(STORAGE_KEYS.SHIFT, INITIAL_SHIFT);
  }

  public saveCurrentShift(shift: SystemShift): void {
    this.setItem(STORAGE_KEYS.SHIFT, shift);
  }

  public calculateCurrentCashInDrawer(): number {
    const movements = this.getCashMovements();
    return movements.reduce((acc, m) => {
      return m.type === 'IN' ? acc + m.amount : acc - m.amount;
    }, 0);
  }

  // --- CASH MOVEMENTS ---
  public getCashMovements(): CashMovement[] {
    return this.getItem<CashMovement[]>(STORAGE_KEYS.CASH_MOVEMENTS, INITIAL_CASH_MOVEMENTS);
  }

  public addCashMovement(movement: CashMovement): void {
    const movements = this.getCashMovements();
    movements.unshift(movement);
    this.setItem(STORAGE_KEYS.CASH_MOVEMENTS, movements);
  }

  // --- EXPENSES ---
  public getExpenses(): Expense[] {
    return this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  }

  public recordExpense(expense: Expense): void {
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);

    this.addCashMovement({
      id: `cm-${Date.now()}`,
      date: expense.date,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      type: 'OUT',
      category: 'EXPENSE',
      categoryLabelArabic: expense.categoryLabelArabic,
      amount: expense.amount,
      referenceId: expense.id,
      description: `مصروف: ${expense.categoryLabelArabic} - ${expense.notes}`,
      performedBy: expense.recordedBy,
    });

    this.addAuditLog('EXPENSE', 'تسجيل مصروف', 'المصروفات', expense.id, `تسجيل مصروف بقيمة ${expense.amount} ج.م - ${expense.categoryLabelArabic}`);
  }

  // --- SALES INVOICES: POST, UPDATE, DELETE & NEGATIVE STOCK ---
  public getSalesInvoices(): SalesInvoice[] {
    return this.getItem<SalesInvoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
  }

  public postSalesInvoice(invoice: SalesInvoice): { success: boolean; error?: string; hasNegativeStock?: boolean } {
    const products = this.getProducts();
    const customers = this.getCustomers();

    // Check negative stock flag
    let hasNegativeStock = false;
    for (const item of invoice.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        if (prod.stockPieces < item.piecesCount) {
          hasNegativeStock = true;
        }
      }
    }
    invoice.hasNegativeStockItem = hasNegativeStock;

    // Apply Deductions to Single Warehouse (permits negative stock as requested)
    for (const item of invoice.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stockPieces -= item.piecesCount;
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Update Customer Balance
    const cust = customers.find(c => c.id === invoice.customerId);
    const previousDebt = cust ? cust.currentBalance : 0;
    invoice.previousCustomerBalance = previousDebt;

    if (invoice.remainingAmount > 0 && cust) {
      cust.currentBalance += invoice.remainingAmount;
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
    invoice.newCustomerBalance = cust ? cust.currentBalance : 0;

    // Record Cash Movement if cash was paid
    if (invoice.paidAmount > 0) {
      this.addCashMovement({
        id: `cm-${Date.now()}`,
        date: invoice.date,
        time: invoice.time,
        type: 'IN',
        category: 'SALES_CASH',
        categoryLabelArabic: 'مبيعات نقدية',
        amount: invoice.paidAmount,
        referenceId: invoice.invoiceNumber,
        description: `تحصيل فاتورة مبيعات ${invoice.invoiceNumber} - العميل: ${invoice.customerName}`,
        performedBy: invoice.salespersonName,
      });
    }

    // Save Invoice
    const invoices = this.getSalesInvoices();
    invoices.unshift(invoice);
    this.setItem(STORAGE_KEYS.INVOICES, invoices);

    this.addAuditLog(
      'SALES',
      'إصدار فاتورة مبيعات',
      'فواتير المبيعات',
      invoice.invoiceNumber,
      `فاتورة ${invoice.invoiceNumber} بقيمة ${invoice.total} ج.م للعميل: ${invoice.customerName} (ربح الفاتورة: ${invoice.totalProfit} ج.م)`
    );

    return { success: true, hasNegativeStock };
  }

  // DELETE SALES INVOICE (With full stock restoration and customer debt deletion)
  public deleteSalesInvoice(invoiceId: string): { success: boolean; error?: string } {
    const invoices = this.getSalesInvoices();
    const invoice = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
    if (!invoice) return { success: false, error: 'الفاتورة غير موجودة' };

    const products = this.getProducts();
    const customers = this.getCustomers();

    // 1. Restore Stock (إعادة الأصناف للمخزن)
    for (const item of invoice.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stockPieces += item.piecesCount;
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // 2. Remove Customer Debt (حذف مديونية الفاتورة من العميل)
    const cust = customers.find(c => c.id === invoice.customerId);
    if (cust && invoice.remainingAmount > 0) {
      cust.currentBalance = Math.max(0, cust.currentBalance - invoice.remainingAmount);
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    }

    // 3. Reverse Cash if paid (إلغاء النقدية المحصلة)
    if (invoice.paidAmount > 0) {
      this.addCashMovement({
        id: `cm-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: 'OUT',
        category: 'INVOICE_REVERSAL',
        categoryLabelArabic: 'إلغاء فاتورة مبيعات',
        amount: invoice.paidAmount,
        referenceId: invoice.invoiceNumber,
        description: `رد نقدية لحذف فاتورة المبيعات رقم ${invoice.invoiceNumber}`,
        performedBy: this.getActiveUser().fullName,
      });
    }

    // 4. Remove invoice from list
    const filteredInvoices = invoices.filter(inv => inv.id !== invoice.id);
    this.setItem(STORAGE_KEYS.INVOICES, filteredInvoices);

    this.addAuditLog(
      'SALES',
      'حذف فاتورة مبيعات',
      'فواتير المبيعات',
      invoice.invoiceNumber,
      `تم حذف الفاتورة ${invoice.invoiceNumber} وإرجاع بضاعة الأصناف للمخزن وحذف مديونية العميل (${invoice.remainingAmount} ج.م)`
    );

    return { success: true };
  }

  // UPDATE SALES INVOICE (Edit existing invoice)
  public updateSalesInvoice(updatedInvoice: SalesInvoice): { success: boolean; error?: string } {
    const invoices = this.getSalesInvoices();
    const oldIndex = invoices.findIndex(inv => inv.id === updatedInvoice.id);
    if (oldIndex === -1) return { success: false, error: 'الفاتورة غير موجودة' };

    const oldInvoice = invoices[oldIndex];
    const products = this.getProducts();
    const customers = this.getCustomers();

    // Revert old stock
    for (const item of oldInvoice.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) prod.stockPieces += item.piecesCount;
    }

    // Apply new stock deductions
    for (const item of updatedInvoice.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) prod.stockPieces -= item.piecesCount;
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Revert old debt and apply new debt
    const cust = customers.find(c => c.id === updatedInvoice.customerId);
    if (cust) {
      cust.currentBalance -= oldInvoice.remainingAmount;
      cust.currentBalance += updatedInvoice.remainingAmount;
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      updatedInvoice.newCustomerBalance = cust.currentBalance;
    }

    updatedInvoice.status = 'MODIFIED';
    invoices[oldIndex] = updatedInvoice;
    this.setItem(STORAGE_KEYS.INVOICES, invoices);

    this.addAuditLog(
      'SALES',
      'تعديل فاتورة مبيعات',
      'فواتير المبيعات',
      updatedInvoice.invoiceNumber,
      `تم تعديل الفاتورة ${updatedInvoice.invoiceNumber} بقيمة جديدة ${updatedInvoice.total} ج.م`
    );

    return { success: true };
  }

  // --- CUSTOMER DEBT COLLECTION (سند قبض) ---
  public recordCustomerCollection(params: {
    customerId: string;
    amount: number;
    notes?: string;
    collectedBy: string;
  }): { success: boolean; error?: string } {
    const customers = this.getCustomers();
    const cust = customers.find(c => c.id === params.customerId);
    if (!cust) return { success: false, error: 'العميل غير موجود' };
    if (params.amount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

    cust.currentBalance -= params.amount;
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    const voucherNum = `RCV-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    this.addCashMovement({
      id: `cm-${Date.now()}`,
      date: dateStr,
      time: timeStr,
      type: 'IN',
      category: 'CUSTOMER_COLLECTION',
      categoryLabelArabic: 'سند تحصيل مديونية عميل',
      amount: params.amount,
      referenceId: voucherNum,
      description: `سند قبض رقم ${voucherNum} من العميل: ${cust.name} ${params.notes ? `(${params.notes})` : ''}`,
      performedBy: params.collectedBy,
    });

    this.addAuditLog(
      'COLLECTION',
      'سند قبض عميل',
      'العملاء',
      cust.id,
      `تحصيل مبلغ ${params.amount} ج.م من العميل: ${cust.name}، الرصيد المتبقي: ${cust.currentBalance} ج.م`
    );

    return { success: true };
  }

  // --- SUPPLIER PAYMENT (سند صرف مورد مع إمكانية السحب بالسالب ومصدر التمويل) ---
  public recordSupplierPayment(params: {
    supplierId: string;
    amount: number;
    notes?: string;
    paidBy: string;
    allowNegativeCash?: boolean;
    fundingSource?: 'DRAWER' | 'PERSONAL_LOAN' | 'DRAWER_NEGATIVE' | 'OTHER';
  }): { success: boolean; error?: string } {
    const suppliers = this.getSuppliers();
    const supp = suppliers.find(s => s.id === params.supplierId);
    if (!supp) return { success: false, error: 'المورد غير موجود' };
    if (params.amount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

    const currentCash = this.calculateCurrentCashInDrawer();
    const isNegativeCash = currentCash < params.amount;

    if (isNegativeCash && !params.allowNegativeCash) {
      return { 
        success: false, 
        error: `الرصيد النقدي بالدرج (${currentCash} ج.م) لا يكفي لصرف ${params.amount} ج.م. يمكنك تفعيل خيار السحب بالسالب لتسوية الوردية لاحقاً.` 
      };
    }

    supp.currentBalance -= params.amount;
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);

    const voucherNum = `PAY-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const funding = params.fundingSource || (isNegativeCash ? 'DRAWER_NEGATIVE' : 'DRAWER');
    const fundingLabel = funding === 'PERSONAL_LOAN' 
      ? 'سلفة / تمويل شخصي' 
      : funding === 'DRAWER_NEGATIVE' 
      ? 'سحب بالسالب من الدرج' 
      : 'نقدية الدرج';

    this.addCashMovement({
      id: `cm-${Date.now()}`,
      date: dateStr,
      time: timeStr,
      type: 'OUT',
      category: 'SUPPLIER_PAYMENT',
      categoryLabelArabic: 'سند صرف مورد',
      amount: params.amount,
      referenceId: voucherNum,
      supplierId: supp.id,
      supplierName: supp.name,
      fundingSource: funding,
      description: `سند صرف للمورد: ${supp.name} (${fundingLabel}) ${params.notes ? `• ${params.notes}` : ''}`,
      performedBy: params.paidBy,
    });

    this.addAuditLog(
      'PAYMENT',
      'سند صرف مورد',
      'الموردين',
      supp.id,
      `صرف مبلغ ${params.amount} ج.م للمورد: ${supp.name} (${fundingLabel})، المتبقي له: ${supp.currentBalance} ج.م`
    );

    return { success: true };
  }

  // احضار سجل دفعات الموردين
  public getSupplierPayments(supplierId?: string): CashMovement[] {
    const movements = this.getCashMovements();
    return movements.filter(m => {
      if (m.category !== 'SUPPLIER_PAYMENT') return false;
      if (supplierId && m.supplierId !== supplierId) return false;
      return true;
    });
  }

  // تعديل دفعة مورد
  public updateSupplierPayment(movementId: string, newAmount: number, newNotes?: string): { success: boolean; error?: string } {
    if (newAmount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    const movements = this.getCashMovements();
    const idx = movements.findIndex(m => m.id === movementId);
    if (idx === -1) return { success: false, error: 'حركة الدفع غير موجودة' };

    const oldMovement = movements[idx];
    const suppliers = this.getSuppliers();
    const supp = suppliers.find(s => s.id === oldMovement.supplierId);

    if (supp) {
      // الفرق في المبلغ: إذا زاد المبلغ المصروف يقل رصيد المورد، والعكس
      const diff = newAmount - oldMovement.amount;
      supp.currentBalance -= diff;
      this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    }

    oldMovement.amount = newAmount;
    if (newNotes) {
      oldMovement.description = `سند صرف للمورد: ${oldMovement.supplierName || ''} • ${newNotes}`;
    }
    movements[idx] = oldMovement;
    this.setItem(STORAGE_KEYS.CASH_MOVEMENTS, movements);

    this.addAuditLog(
      'PAYMENT_UPDATE',
      'تعديل سند صرف مورد',
      'سندات الصرف',
      movementId,
      `تم تعديل سند صرف بقيمة ${newAmount} ج.م للمورد: ${oldMovement.supplierName || ''}`
    );

    return { success: true };
  }

  // حذف دفعة مورد (إلغاء سند الصرف ورد المديونية)
  public deleteSupplierPayment(movementId: string): { success: boolean; error?: string } {
    const movements = this.getCashMovements();
    const target = movements.find(m => m.id === movementId);
    if (!target) return { success: false, error: 'حركة الدفع غير موجودة' };

    const suppliers = this.getSuppliers();
    const supp = suppliers.find(s => s.id === target.supplierId);
    if (supp) {
      supp.currentBalance += target.amount; // إعادة المبلغ لمستحقات المورد
      this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    }

    const filtered = movements.filter(m => m.id !== movementId);
    this.setItem(STORAGE_KEYS.CASH_MOVEMENTS, filtered);

    this.addAuditLog(
      'PAYMENT_DELETE',
      'حذف سند صرف مورد',
      'سندات الصرف',
      movementId,
      `تم حذف سند صرف بقيمة ${target.amount} ج.م وإعادة المبلغ لمستحقات المورد: ${target.supplierName || ''}`
    );

    return { success: true };
  }

  // كشف حساب المورد مع الفواتير والدفعات
  public getSupplierStatement(supplierId: string): {
    supplier: Supplier;
    purchases: PurchaseInvoice[];
    payments: CashMovement[];
  } | null {
    const suppliers = this.getSuppliers();
    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp) return null;

    const purchases = this.getPurchases().filter(p => p.supplierId === supplierId);
    const payments = this.getSupplierPayments(supplierId);

    return { supplier: supp, purchases, payments };
  }

  // --- PURCHASING (RECEIVING STOCK & INVOICE MANAGEMENT) ---
  public getPurchases(): PurchaseInvoice[] {
    return this.getItem<PurchaseInvoice[]>(STORAGE_KEYS.PURCHASES, []);
  }

  public postPurchaseInvoice(purchase: PurchaseInvoice): { success: boolean; error?: string } {
    const products = this.getProducts();
    const suppliers = this.getSuppliers();
    const supp = suppliers.find(s => s.id === purchase.supplierId);
    if (!supp) return { success: false, error: 'المورد غير محدد' };

    // حساب المديونيات
    purchase.previousSupplierBalance = supp.currentBalance;

    // إذا كانت البضاعة مدرجة في المخزن
    if (purchase.isStockInserted) {
      for (const item of purchase.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const piecesPerUnit = item.unit === 'CARTON' 
            ? prod.piecesPerWholesaleUnit 
            : item.unit === 'PALLET' 
            ? (prod.piecesPerWholesaleUnit * 20) 
            : 1;

          const addedPieces = item.quantity * piecesPerUnit;
          const totalPiecesBefore = prod.stockPieces;
          
          prod.stockPieces += addedPieces;

          // Moving Weighted Average Cost update
          const totalOldValue = Math.max(0, totalPiecesBefore) * prod.costPricePerBase;
          const unitPieceCostReceived = item.unitCost / piecesPerUnit;
          const totalNewAddedValue = addedPieces * unitPieceCostReceived;
          
          const newTotalPieces = Math.max(0, totalPiecesBefore) + addedPieces;
          if (newTotalPieces > 0) {
            const newAvgBaseCost = (totalOldValue + totalNewAddedValue) / newTotalPieces;
            prod.costPricePerBase = Math.round(newAvgBaseCost * 100) / 100;
            prod.costPricePerCarton = Math.round(prod.costPricePerBase * prod.piecesPerWholesaleUnit * 100) / 100;
          }
          if (item.batchNumber) prod.batchNumber = item.batchNumber;
          if (item.expiryDate) prod.expiryDate = item.expiryDate;
        }
      }

      // إذا كان هناك بونص بضاعة مجانية: يتم إضافتها للمخزن بتكلفة صفر
      if (purchase.bonusType === 'GOODS' && purchase.bonusGoodsQuantity && purchase.items.length > 0) {
        const firstProd = products.find(p => p.id === purchase.items[0].productId);
        if (firstProd) {
          firstProd.stockPieces += (purchase.bonusGoodsQuantity * firstProd.piecesPerWholesaleUnit);
        }
      }

      this.setItem(STORAGE_KEYS.PRODUCTS, products);
    }

    // تحديث رصيد المورد
    if (purchase.remainingAmount > 0) {
      supp.currentBalance += purchase.remainingAmount;
    }
    purchase.newSupplierBalance = supp.currentBalance;
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);

    // سداد نقدي من الدرج إن وجد
    if (purchase.paidAmount > 0) {
      this.addCashMovement({
        id: `cm-${Date.now()}`,
        date: purchase.date,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: 'OUT',
        category: 'SUPPLIER_PAYMENT',
        categoryLabelArabic: 'دفعة مشتريات نقدية',
        amount: purchase.paidAmount,
        referenceId: purchase.invoiceNumber,
        supplierId: supp.id,
        supplierName: supp.name,
        description: `سداد نقدي لفاتورة شراء ${purchase.invoiceNumber} من ${supp.name}`,
        performedBy: this.getActiveUser().fullName,
      });
    }

    const purchases = this.getPurchases();
    purchases.unshift(purchase);
    this.setItem(STORAGE_KEYS.PURCHASES, purchases);

    this.addAuditLog(
      'PURCHASE',
      'تسجيل فاتورة شراء',
      'فواتير الشراء',
      purchase.invoiceNumber,
      `فاتورة شراء رقم ${purchase.invoiceNumber} بقيمة إجمالية ${purchase.totalCost} ج.م من ${supp.name} ${purchase.isStockInserted ? '(أُدرجت بالمخزن)' : '(مسودة غير مدرجة بالمخزن)'}`
    );

    return { success: true };
  }

  // حذف فاتورة مشتريات وإلغاء إدراجها من المخزن إن تم إدراجها
  public deletePurchaseInvoice(invoiceId: string): { success: boolean; error?: string } {
    const purchases = this.getPurchases();
    const purchase = purchases.find(p => p.id === invoiceId || p.invoiceNumber === invoiceId);
    if (!purchase) return { success: false, error: 'فاتورة الشراء غير موجودة' };

    const products = this.getProducts();
    const suppliers = this.getSuppliers();

    // 1. إذا كانت البضاعة قد أُدرجت بالمخزن: خصم كمياتها من المخزن
    if (purchase.isStockInserted) {
      for (const item of purchase.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const piecesPerUnit = item.unit === 'CARTON' 
            ? prod.piecesPerWholesaleUnit 
            : item.unit === 'PALLET' 
            ? (prod.piecesPerWholesaleUnit * 20) 
            : 1;
          prod.stockPieces -= (item.quantity * piecesPerUnit);
        }
      }

      // خصم بونص البضاعة المجانية إن وجد
      if (purchase.bonusType === 'GOODS' && purchase.bonusGoodsQuantity && purchase.items.length > 0) {
        const firstProd = products.find(p => p.id === purchase.items[0].productId);
        if (firstProd) {
          firstProd.stockPieces -= (purchase.bonusGoodsQuantity * firstProd.piecesPerWholesaleUnit);
        }
      }

      this.setItem(STORAGE_KEYS.PRODUCTS, products);
    }

    // 2. إلغاء مديونية المورد
    const supp = suppliers.find(s => s.id === purchase.supplierId);
    if (supp && purchase.remainingAmount > 0) {
      supp.currentBalance = Math.max(0, supp.currentBalance - purchase.remainingAmount);
      this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    }

    // 3. رد النقدية المسددة إن وجدت
    if (purchase.paidAmount > 0) {
      this.addCashMovement({
        id: `cm-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: 'IN',
        category: 'DRAWER_ADJUSTMENT',
        categoryLabelArabic: 'إلغاء فاتورة شراء',
        amount: purchase.paidAmount,
        referenceId: purchase.invoiceNumber,
        description: `رد نقدية لحذف فاتورة الشراء رقم ${purchase.invoiceNumber} من ${purchase.supplierName}`,
        performedBy: this.getActiveUser().fullName,
      });
    }

    const filtered = purchases.filter(p => p.id !== purchase.id);
    this.setItem(STORAGE_KEYS.PURCHASES, filtered);

    this.addAuditLog(
      'PURCHASE_DELETE',
      'حذف فاتورة شراء',
      'فواتير الشراء',
      purchase.invoiceNumber,
      `تم حذف فاتورة الشراء ${purchase.invoiceNumber} وخصم بضاعتها من المخزن وإلغاء مديونية المورد`
    );

    return { success: true };
  }

  // إدراج فاتورة شراء في المخزن إذا لم تكن مدرجة
  public insertPurchaseIntoStock(invoiceId: string): { success: boolean; error?: string } {
    const purchases = this.getPurchases();
    const purchase = purchases.find(p => p.id === invoiceId);
    if (!purchase) return { success: false, error: 'فاتورة الشراء غير موجودة' };
    if (purchase.isStockInserted) return { success: false, error: 'الفاتورة مدرجة بالمخزن بالفعل' };

    const products = this.getProducts();
    for (const item of purchase.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const piecesPerUnit = item.unit === 'CARTON' 
          ? prod.piecesPerWholesaleUnit 
          : item.unit === 'PALLET' 
          ? (prod.piecesPerWholesaleUnit * 20) 
          : 1;

        prod.stockPieces += (item.quantity * piecesPerUnit);
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    purchase.isStockInserted = true;
    this.setItem(STORAGE_KEYS.PURCHASES, purchases);

    this.addAuditLog(
      'PURCHASE_STOCK',
      'إدراج بضاعة شراء بالمخزن',
      'المخزن',
      purchase.invoiceNumber,
      `تم إدراج بضاعة فاتورة الشراء ${purchase.invoiceNumber} في المخزن الموحد بنجاح`
    );

    return { success: true };
  }

  // --- STOCK ADJUSTMENTS (نظام تسوية المخزون: جرد / عجز / زيادة / تلف) ---
  public getStockAdjustments(): StockAdjustment[] {
    return this.getItem<StockAdjustment[]>(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
  }

  public recordStockAdjustment(params: {
    productId: string;
    differencePieces: number; // + or -
    reason: 'AUDIT' | 'DAMAGE' | 'EXPIRY' | 'BONUS' | 'CORRECTION' | 'OTHER';
    reasonArabic: string;
    notes?: string;
    performedBy: string;
  }): { success: boolean; error?: string } {
    const products = this.getProducts();
    const prod = products.find(p => p.id === params.productId);
    if (!prod) return { success: false, error: 'الصنف غير موجود' };

    const prevPieces = prod.stockPieces;
    const newPieces = prevPieces + params.differencePieces;
    prod.stockPieces = newPieces;
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      date: dateStr,
      time: timeStr,
      productId: prod.id,
      productName: prod.name,
      productCode: prod.code,
      previousPieces: prevPieces,
      differencePieces: params.differencePieces,
      newPieces: newPieces,
      reason: params.reason,
      reasonArabic: params.reasonArabic,
      notes: params.notes,
      performedBy: params.performedBy,
    };

    const adjustments = this.getStockAdjustments();
    adjustments.unshift(adjustment);
    this.setItem(STORAGE_KEYS.STOCK_ADJUSTMENTS, adjustments);

    const diffType = params.differencePieces >= 0 ? 'زيادة' : 'عجز/خصم';
    this.addAuditLog(
      'STOCK_ADJUST',
      'تسوية مخزون',
      'المخزن الموحد',
      prod.code,
      `تسوية رصيد الصنف (${prod.name}): ${diffType} ${Math.abs(params.differencePieces)} قطعة [السبب: ${params.reasonArabic}] • الرصيد السابق: ${prevPieces} ق، الرصيد الجديد: ${newPieces} ق`
    );

    return { success: true };
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  public addAuditLog(entity: string, actionArabic: string, entityArabic: string, entityId: string, details: string): void {
    const activeUser = this.getActiveUser();
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleString('ar-EG'),
      userId: activeUser.id,
      username: activeUser.fullName,
      action: entity,
      actionArabic,
      entity: entityArabic,
      entityId,
      details,
    };
    logs.unshift(newLog);
    if (logs.length > 500) logs.pop();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- BACKUP & RESTORE ---
  public exportFullBackupJson(): string {
    const backupData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      app: 'WholesaleFoodSystem_Egypt',
      data: {
        products: this.getProducts(),
        customers: this.getCustomers(),
        suppliers: this.getSuppliers(),
        invoices: this.getSalesInvoices(),
        purchases: this.getPurchases(),
        cashMovements: this.getCashMovements(),
        expenses: this.getExpenses(),
        auditLogs: this.getAuditLogs(),
        stockAdjustments: this.getStockAdjustments(),
        currentShift: this.getCurrentShift(),
        users: this.getUsers(),
      }
    };
    return JSON.stringify(backupData, null, 2);
  }

  public restoreBackupJson(jsonString: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || !parsed.data.products || !parsed.data.customers) {
        return { success: false, error: 'الملف غير صالح أو لا يحتوي على بنية البيانات المطلوبة' };
      }

      this.setItem(STORAGE_KEYS.PRODUCTS, parsed.data.products);
      this.setItem(STORAGE_KEYS.CUSTOMERS, parsed.data.customers);
      this.setItem(STORAGE_KEYS.SUPPLIERS, parsed.data.suppliers || []);
      this.setItem(STORAGE_KEYS.INVOICES, parsed.data.invoices || []);
      this.setItem(STORAGE_KEYS.PURCHASES, parsed.data.purchases || []);
      this.setItem(STORAGE_KEYS.CASH_MOVEMENTS, parsed.data.cashMovements || []);
      this.setItem(STORAGE_KEYS.EXPENSES, parsed.data.expenses || []);
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, parsed.data.auditLogs || []);
      if (parsed.data.stockAdjustments) this.setItem(STORAGE_KEYS.STOCK_ADJUSTMENTS, parsed.data.stockAdjustments);
      if (parsed.data.users) this.setItem(STORAGE_KEYS.USERS, parsed.data.users);

      this.addAuditLog('RESTORE', 'استعادة نسخة احتياطية', 'النظام', 'restore', 'تمت استعادة قاعدة البيانات بنجاح من ملف خارجي');

      return { success: true };
    } catch {
      return { success: false, error: 'فشل في قراءة ملف النسخة الاحتياطية' };
    }
  }

  public resetToFactoryDefault(): void {
    localStorage.clear();
    this.initDatabase();
  }
}

export const storage = new StorageService();
