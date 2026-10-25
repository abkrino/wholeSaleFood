import React, { useState } from 'react';
import { Product, User, StockAdjustment } from '../../types';
import { storage } from '../../services/storageService';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  Building2, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Package, 
  RefreshCw, 
  Scale, 
  DollarSign, 
  Calendar, 
  X, 
  Barcode, 
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface InventoryManagerProps {
  currentUser: User;
  onRefreshData: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [products, setProducts] = useState<Product[]>(storage.getProducts());
  const [activeSubTab, setActiveSubTab] = useState<'PRODUCTS' | 'COMPANIES' | 'ADJUSTMENTS'>('PRODUCTS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal States
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Stock Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);
  const [adjustmentProductId, setAdjustmentProductId] = useState<string>('');
  const [adjustmentCartons, setAdjustmentCartons] = useState<number>(0);
  const [adjustmentPieces, setAdjustmentPieces] = useState<number>(0);
  const [adjustmentMode, setAdjustmentMode] = useState<'NEW_COUNT' | 'DIFFERENCE'>('NEW_COUNT');
  const [adjustmentReason, setAdjustmentReason] = useState<'AUDIT' | 'DAMAGE' | 'EXPIRY' | 'BONUS' | 'CORRECTION' | 'OTHER'>('AUDIT');
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');

  // Product Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cartonBarcode, setCartonBarcode] = useState('');
  const [category, setCategory] = useState('بسكويت وويفر');
  const [brand, setBrand] = useState('شركة إيديتا للصناعات الغذائية');
  const [isNewBrandInput, setIsNewBrandInput] = useState(false);
  const [customBrandName, setCustomBrandName] = useState('');
  
  // Units: Wholesale (كرتونة - بالتة) & Retail (علبة - شريط - كيس - قطعة - زجاجة - برطمان)
  const [wholesaleUnit, setWholesaleUnit] = useState('كرتونة');
  const [baseUnit, setBaseUnit] = useState('قطعة');
  const [piecesPerWholesaleUnit, setPiecesPerWholesaleUnit] = useState<number>(24);
  
  // Costs & Prices
  const [costPricePerCarton, setCostPricePerCarton] = useState<number>(100);
  const [costPricePerBase, setCostPricePerBase] = useState<number>(4.17);
  const [wholesalePricePerCarton, setWholesalePricePerCarton] = useState<number>(120);
  const [halfWholesalePricePerCarton, setHalfWholesalePricePerCarton] = useState<number>(125);
  const [retailPricePerBase, setRetailPricePerBase] = useState<number>(5.5);
  
  // Stock inputs in cartons + remaining pieces
  const [initialCartons, setInitialCartons] = useState<number>(10);
  const [initialPieces, setInitialPieces] = useState<number>(0);
  const [reorderLevelCartons, setReorderLevelCartons] = useState<number>(2);
  const [expiryDate, setExpiryDate] = useState<string>('2027-06-30');
  const [batchNumber, setBatchNumber] = useState<string>('');

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.permissions?.canManageProducts;

  // Food distribution categories
  const STANDARD_CATEGORIES = [
    'مواد غذائية وسلع تموينية',
    'بسكويت وويفر',
    'شيبسي وسناكس ومقرمشات',
    'شوكولاتة وحلويات',
    'زيوت وسمن ومسلي',
    'معلبات وتونة وصلصة',
    'ألبان وأجبان',
    'عصائر ومشروبات',
    'منظفات ومستلزمات',
    'أخرى'
  ];

  const WHOLESALE_UNIT_OPTIONS = ['كرتونة', 'بالتة', 'طرد', 'باكتة كبيرة'];
  const BASE_UNIT_OPTIONS = ['علبة', 'شريط', 'كيس', 'قطعة', 'زجاجة', 'برطمان', 'باكت'];

  // Distinct Brands & Categories from Database
  const distinctBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
  const brandsFilterList = ['ALL', ...distinctBrands];
  const categoriesFilterList = ['ALL', ...Array.from(new Set([...STANDARD_CATEGORIES, ...products.map(p => p.category).filter(Boolean)]))];

  // Helper to auto-calculate base prices/costs
  const handleCostCartonChange = (cartonCost: number, pieces: number) => {
    setCostPricePerCarton(cartonCost);
    const safePieces = Math.max(1, pieces);
    const calculatedBase = Math.round((cartonCost / safePieces) * 100) / 100;
    setCostPricePerBase(calculatedBase);
  };

  const handleWholesaleCartonChange = (wholesaleCost: number, pieces: number) => {
    setWholesalePricePerCarton(wholesaleCost);
    const safePieces = Math.max(1, pieces);
    // Automatically set default piece selling price (with standard margin)
    const calculatedPiecePrice = Math.round((wholesaleCost / safePieces) * 1.15 * 100) / 100;
    setRetailPricePerBase(calculatedPiecePrice);
    setHalfWholesalePricePerCarton(Math.round(wholesaleCost * 1.05 * 10) / 10);
  };

  const handlePiecesPerCartonChange = (pieces: number) => {
    const safePieces = Math.max(1, pieces);
    setPiecesPerWholesaleUnit(safePieces);
    setCostPricePerBase(Math.round((costPricePerCarton / safePieces) * 100) / 100);
    setRetailPricePerBase(Math.round((wholesalePricePerCarton / safePieces) * 1.15 * 100) / 100);
  };

  // Generate Unique Auto Item Code
  const generateNewProductCode = () => {
    const num = Math.floor(100 + Math.random() * 900);
    return `PRD-${num}`;
  };

  const filteredProducts = products.filter(p => {
    if (selectedBrand !== 'ALL' && p.brand !== selectedBrand) return false;
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) || 
      p.code.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) || 
      p.barcode.includes(q)
    );
  });

  // Calculate Overall Inventory Valuation
  const totalInventoryPurchaseCost = products.reduce((sum, p) => sum + (p.stockPieces * p.costPricePerBase), 0);
  const totalInventoryWholesaleValue = products.reduce((sum, p) => {
    const cartonVal = (p.stockPieces / p.piecesPerWholesaleUnit) * p.wholesalePricePerCarton;
    return sum + cartonVal;
  }, 0);
  const lowStockCount = products.filter(p => p.stockPieces <= p.reorderLevelPieces).length;

  const openAddModalForBrand = (targetBrand?: string) => {
    setEditingProductId(null);
    setName('');
    setCode(generateNewProductCode());
    setBarcode(''); // Optional barcode
    setCartonBarcode('');
    setCategory('بسكويت وويفر');
    setBrand(targetBrand || (selectedBrand !== 'ALL' ? selectedBrand : distinctBrands[0] || 'شركة جديدة'));
    setIsNewBrandInput(false);
    setCustomBrandName('');
    setWholesaleUnit('كرتونة');
    setBaseUnit('قطعة');
    setPiecesPerWholesaleUnit(24);
    setCostPricePerCarton(100);
    setCostPricePerBase(4.17);
    setWholesalePricePerCarton(120);
    setHalfWholesalePricePerCarton(125);
    setRetailPricePerBase(5.5);
    setInitialCartons(10);
    setInitialPieces(0);
    setReorderLevelCartons(2);
    setExpiryDate('2027-06-30');
    setBatchNumber('');
    setIsAddProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProductId(p.id);
    setName(p.name);
    setCode(p.code);
    setBarcode(p.barcode || '');
    setCartonBarcode(p.cartonBarcode || '');
    setCategory(p.category);
    setBrand(p.brand);
    setIsNewBrandInput(false);
    setCustomBrandName('');
    setWholesaleUnit(p.wholesaleUnit || 'كرتونة');
    setBaseUnit(p.baseUnit || 'قطعة');
    setPiecesPerWholesaleUnit(p.piecesPerWholesaleUnit);
    setCostPricePerCarton(p.costPricePerCarton);
    setCostPricePerBase(p.costPricePerBase);
    setWholesalePricePerCarton(p.wholesalePricePerCarton);
    setHalfWholesalePricePerCarton(p.halfWholesalePricePerCarton || p.wholesalePricePerCarton);
    setRetailPricePerBase(p.retailPricePerBase);
    
    // Separate into cartons and remaining pieces
    const currentCartons = Math.floor(p.stockPieces / p.piecesPerWholesaleUnit);
    const currentRemPieces = p.stockPieces % p.piecesPerWholesaleUnit;
    setInitialCartons(currentCartons);
    setInitialPieces(currentRemPieces);

    setReorderLevelCartons(Math.floor(p.reorderLevelPieces / p.piecesPerWholesaleUnit));
    setExpiryDate(p.expiryDate || '2027-06-30');
    setBatchNumber(p.batchNumber || '');
    setIsAddProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBrand = isNewBrandInput && customBrandName.trim() ? customBrandName.trim() : brand;
    const totalPiecesPerCarton = Math.max(1, piecesPerWholesaleUnit);
    const finalCostPerBase = costPricePerBase || Math.round((costPricePerCarton / totalPiecesPerCarton) * 100) / 100;
    
    // Total stock in pieces = (cartons * piecesPerCarton) + additional pieces
    const totalStockPieces = (initialCartons * totalPiecesPerCarton) + initialPieces;

    let targetProduct: Product;
    if (editingProductId) {
      const existing = products.find(p => p.id === editingProductId)!;
      targetProduct = {
        ...existing,
        name,
        code: code || existing.code,
        barcode: barcode.trim(),
        cartonBarcode: cartonBarcode.trim() || undefined,
        category,
        brand: finalBrand,
        baseUnit,
        wholesaleUnit,
        piecesPerWholesaleUnit: totalPiecesPerCarton,
        costPricePerBase: finalCostPerBase,
        costPricePerCarton,
        wholesalePricePerCarton,
        halfWholesalePricePerCarton,
        retailPricePerBase,
        stockPieces: totalStockPieces,
        reorderLevelPieces: reorderLevelCartons * totalPiecesPerCarton,
        expiryDate,
        batchNumber,
      };
    } else {
      targetProduct = {
        id: `p-${Date.now()}`,
        code: code || generateNewProductCode(),
        barcode: barcode.trim(),
        cartonBarcode: cartonBarcode.trim() || undefined,
        name,
        category,
        brand: finalBrand,
        baseUnit: baseUnit || 'قطعة',
        wholesaleUnit: wholesaleUnit || 'كرتونة',
        piecesPerWholesaleUnit: totalPiecesPerCarton,
        costPricePerBase: finalCostPerBase,
        costPricePerCarton,
        wholesalePricePerCarton,
        halfWholesalePricePerCarton,
        retailPricePerBase,
        stockPieces: totalStockPieces,
        reorderLevelPieces: reorderLevelCartons * totalPiecesPerCarton,
        expiryDate,
        batchNumber,
        isActive: true,
      };
    }

    storage.saveProduct(targetProduct);
    setProducts(storage.getProducts());
    setIsAddProductModalOpen(false);
    onRefreshData();
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    const res = storage.deleteProduct(productToDelete.id);
    if (res.success) {
      setProducts(storage.getProducts());
      setProductToDelete(null);
      onRefreshData();
    }
  };

  // Stock Adjustment Handler
  const openAdjustmentModal = (prod?: Product) => {
    const target = prod || products[0];
    if (!target) return;
    setAdjustmentProductId(target.id);
    const currentCartons = Math.floor(target.stockPieces / target.piecesPerWholesaleUnit);
    const currentPieces = target.stockPieces % target.piecesPerWholesaleUnit;
    setAdjustmentCartons(currentCartons);
    setAdjustmentPieces(currentPieces);
    setAdjustmentMode('NEW_COUNT');
    setAdjustmentReason('AUDIT');
    setAdjustmentNotes('');
    setIsAdjustmentModalOpen(true);
  };

  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === adjustmentProductId);
    if (!prod) return;

    let differencePieces = 0;
    if (adjustmentMode === 'NEW_COUNT') {
      const targetPieces = (adjustmentCartons * prod.piecesPerWholesaleUnit) + adjustmentPieces;
      differencePieces = targetPieces - prod.stockPieces;
    } else {
      differencePieces = (adjustmentCartons * prod.piecesPerWholesaleUnit) + adjustmentPieces;
    }

    const reasonMap = {
      AUDIT: 'جرد فعلي دوري',
      DAMAGE: 'تلف بضاعة',
      EXPIRY: 'انتهاء صلاحية',
      BONUS: 'بونص وزيادة بضاعة مجانية',
      CORRECTION: 'تصحيح خطأ إدخال سابق',
      OTHER: 'تسوية مخزنية أخرى'
    };

    storage.recordStockAdjustment({
      productId: prod.id,
      differencePieces,
      reason: adjustmentReason,
      reasonArabic: reasonMap[adjustmentReason],
      notes: adjustmentNotes,
      performedBy: currentUser.fullName,
    });

    setProducts(storage.getProducts());
    setIsAdjustmentModalOpen(false);
    onRefreshData();
  };

  const stockAdjustmentsList = storage.getStockAdjustments();

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Header & Valuation Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Boxes className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>إدارة المخزن الموحد وبطاقة الأصناف والشركات</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              مخزن واحد فقط — متابعة الأرصدة بالكرتونة والقطعة، تكلفة الشراء، أسعار بيع الجملة، ونظام تسوية الجرد.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sub-tab Navigation */}
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-1 flex text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveSubTab('PRODUCTS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'PRODUCTS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                جدول الأصناف
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('COMPANIES')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'COMPANIES' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                دليل الشركات والمصانع 🏢
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('ADJUSTMENTS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'ADJUSTMENTS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                سجل تسويات الجرد ({stockAdjustmentsList.length})
              </button>
            </div>

            {/* Quick Adjustment Button */}
            <button
              type="button"
              onClick={() => openAdjustmentModal()}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Scale className="w-4 h-4" />
              <span>تسوية مخزون (جرد / عجز)</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => openAddModalForBrand()}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة صنف جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* INVENTORY VALUATION KPI CARDS (User specified: تكلفة الشراء للمنتجات ككل ولكل منتج) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Total Purchase Valuation */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-bold mb-1">إجمالي قيمة بضاعة المخزن بالتكلفة (شراء):</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono block">
              {totalInventoryPurchaseCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-xs mr-1">ج.م</span>
            </span>
          </div>

          {/* Total Wholesale Selling Valuation */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-bold mb-1">إجمالي قيمة البضاعة بسعر بيع الجملة:</span>
            <span className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono block">
              {totalInventoryWholesaleValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-xs mr-1">ج.م</span>
            </span>
          </div>

          {/* Total Item Count */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-bold mb-1">عدد الأصناف المسجلة بالمخزن:</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono block">
              {products.length}
              <span className="text-xs mr-1 font-sans">صنف</span>
            </span>
          </div>

          {/* Low Stock Warning Count */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-bold mb-1">أصناف قاربت على النفاذ:</span>
            <span className={`text-2xl font-black font-mono block ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {lowStockCount}
              <span className="text-xs mr-1 font-sans">صنف</span>
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: PRODUCTS TABLE */}
      {activeSubTab === 'PRODUCTS' && (
        <div className="space-y-4">
          {/* Brand & Category Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 transition-colors">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بكود الصنف، اسم المنتج، الشركة، الباركود..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors font-medium"
                />
              </div>

              {/* Brand Filter */}
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-bold w-full sm:w-auto"
              >
                <option value="ALL">🏢 جميع الشركات والمصانع</option>
                {distinctBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 font-bold w-full sm:w-auto"
              >
                <option value="ALL">📦 جميع التصنيفات</option>
                {categoriesFilterList.filter(c => c !== 'ALL').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unified Warehouse Products Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto min-h-[340px]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-3 px-3">كود الصنف</th>
                    <th className="py-3 px-3">اسم الصنف والتصنيف</th>
                    <th className="py-3 px-3">الشركة المنتجة</th>
                    <th className="py-3 px-3">الوحدات والمحتوى</th>
                    <th className="py-3 px-3">سعر بيع الجملة والقطاعي</th>
                    {isAdmin && <th className="py-3 px-3">تكلفة الشراء (لكل صنف وإجمالي رصيده)</th>}
                    <th className="py-3 px-3">رصيد المخزن الموحد</th>
                    <th className="py-3 px-3 text-center">الإجراءات والتسوية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredProducts.map(prod => {
                    const cartons = Math.floor(prod.stockPieces / prod.piecesPerWholesaleUnit);
                    const pieces = prod.stockPieces % prod.piecesPerWholesaleUnit;
                    const isBelowZero = prod.stockPieces < 0;
                    const isLow = prod.stockPieces <= prod.reorderLevelPieces;
                    const itemStockCost = prod.stockPieces * prod.costPricePerBase;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs">
                          <span className="font-black text-emerald-700 dark:text-emerald-400 block">{prod.code}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {prod.barcode ? `باركود: ${prod.barcode}` : 'بدون باركود'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-black text-slate-900 dark:text-white text-sm block">{prod.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{prod.category}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                            {prod.brand}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          1 {prod.wholesaleUnit} = {prod.piecesPerWholesaleUnit} {prod.baseUnit}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          <div>{prod.wholesalePricePerCarton.toFixed(2)} ج/{prod.wholesaleUnit}</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-normal">
                            ({prod.retailPricePerBase.toFixed(2)} ج/{prod.baseUnit})
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                            <div className="font-bold">{prod.costPricePerCarton.toFixed(2)} ج/{prod.wholesaleUnit} ({prod.costPricePerBase.toFixed(2)} ج/{prod.baseUnit})</div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-black">
                              إجمالي تكلفة الرصيد: {itemStockCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-3">
                          <span className={`font-mono font-black text-sm block ${
                            isBelowZero ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {cartons} {prod.wholesaleUnit} {pieces !== 0 ? `و ${pieces} ${prod.baseUnit}` : ''}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            (إجمالي: {prod.stockPieces} {prod.baseUnit})
                          </span>
                          {isBelowZero && (
                            <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-1.5 py-0.2 rounded font-bold">
                              رصيد سالب
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Stock Adjustment Button */}
                            <button
                              type="button"
                              onClick={() => openAdjustmentModal(prod)}
                              className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                              title="تسوية رصيد الصنف"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>تسوية</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(prod)}
                              className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 p-1.5 rounded-lg cursor-pointer transition-colors"
                              title="تعديل الصنف"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setProductToDelete(prod)}
                                className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 p-1.5 rounded-lg cursor-pointer transition-colors"
                                title="حذف الصنف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: COMPANIES & BRANDS DIRECTORY */}
      {activeSubTab === 'COMPANIES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {distinctBrands.map(bName => {
              const companyProducts = products.filter(p => p.brand === bName);
              const totalPieces = companyProducts.reduce((sum, p) => sum + p.stockPieces, 0);
              const totalValuation = companyProducts.reduce((sum, p) => sum + (p.stockPieces * p.costPricePerBase), 0);

              return (
                <div key={bName} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{bName}</span>
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                        عدد الأصناف: <strong className="text-emerald-600 dark:text-emerald-400">{companyProducts.length}</strong> صنف
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAddModalForBrand(bName)}
                      className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      + صنف جديد
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between font-mono">
                    <span>قيمة المخزون بالتكلفة:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{totalValuation.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-slate-500 font-bold block">نماذج من منتجات الشركة:</span>
                    {companyProducts.slice(0, 4).map(p => (
                      <div key={p.id} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-slate-500">{p.wholesalePricePerCarton} ج</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STOCK ADJUSTMENTS AUDIT TRAIL */}
      {activeSubTab === 'ADJUSTMENTS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" />
              <span>سجل تسويات وجرد المخزون (عجز وزيادة وتلف)</span>
            </h3>
            <button
              type="button"
              onClick={() => openAdjustmentModal()}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              + تسجيل تسوية جديدة
            </button>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {stockAdjustmentsList.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">لا توجد حركات تسوية جرد مسجلة حتى الآن</div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">كود واسم الصنف</th>
                    <th className="py-2.5 px-3">الرصيد السابق</th>
                    <th className="py-2.5 px-3">الفرق (تسوية)</th>
                    <th className="py-2.5 px-3">الرصيد الجديد</th>
                    <th className="py-2.5 px-3">سبب التسوية</th>
                    <th className="py-2.5 px-3">المسؤول والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {stockAdjustmentsList.map(adj => (
                    <tr key={adj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono">{adj.date} — {adj.time}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {adj.productName} <span className="text-[10px] text-slate-400 font-mono">({adj.productCode})</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{adj.previousPieces} قطعة</td>
                      <td className="py-2.5 px-3 font-mono font-black">
                        <span className={adj.differencePieces >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {adj.differencePieces >= 0 ? `+${adj.differencePieces}` : adj.differencePieces} قطعة
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">{adj.newPieces} قطعة</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">
                          {adj.reasonArabic}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {adj.performedBy} {adj.notes ? `• ${adj.notes}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl p-6 text-right relative flex flex-col my-8 max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  {editingProductId ? 'تعديل بيانات الصنف وبطاقة الأسعار' : 'تعريف صنف جديد بالمخزن الموحد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
              {/* Product Name & Auto-Generated Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">اسم الصنف بالكامل:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: بسكويت لوكس سادة 50 جم..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                {/* Auto Generated Code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-bold">كود الصنف (تلقائي):</label>
                    <button
                      type="button"
                      onClick={() => setCode(generateNewProductCode())}
                      className="text-emerald-600 hover:underline flex items-center gap-1 font-bold text-[10px]"
                      title="توليد كود جديد"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>توليد</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Category & Company/Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Choices */}
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">تصنيف الصنف:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                  >
                    {STANDARD_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Brand / Producer */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-bold">الشركة المنتجة أو المصنع:</label>
                    <button
                      type="button"
                      onClick={() => setIsNewBrandInput(!isNewBrandInput)}
                      className="text-emerald-600 hover:underline font-bold text-[10px]"
                    >
                      {isNewBrandInput ? 'اختر من المحفوظين' : '+ كتابة اسم شركة جديدة'}
                    </button>
                  </div>

                  {isNewBrandInput ? (
                    <input
                      type="text"
                      value={customBrandName}
                      onChange={(e) => setCustomBrandName(e.target.value)}
                      placeholder="اكتب اسم الشركة الجديدة..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-emerald-500 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                    />
                  ) : (
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                    >
                      {distinctBrands.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Barcode (User specified: الباركود اختياري) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">
                    باركود القطعة / العبوة <span className="text-slate-400 font-normal">(اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="يمكن تركه فارغاً أو مسحه بالقارئ"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">
                    باركود الكرتونة <span className="text-slate-400 font-normal">(اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={cartonBarcode}
                    onChange={(e) => setCartonBarcode(e.target.value)}
                    placeholder="باركود الكرتونة الكاملة"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Packaging Units: Wholesale (كرتونة / بالتة) & Retail (علبة / شريط / كيس...) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                <div>
                  <label className="text-slate-800 dark:text-slate-200 block mb-1 font-bold">وحدة الجملة:</label>
                  <select
                    value={wholesaleUnit}
                    onChange={(e) => setWholesaleUnit(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-bold"
                  >
                    {WHOLESALE_UNIT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-800 dark:text-slate-200 block mb-1 font-bold">الوحدة الصغرى (الأساسية):</label>
                  <select
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-bold"
                  >
                    {BASE_UNIT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-800 dark:text-slate-200 block mb-1 font-bold">عدد الوحدات الصغرى بالكرتونة:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={piecesPerWholesaleUnit}
                    onChange={(e) => handlePiecesPerCartonChange(parseInt(e.target.value) || 1)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-bold font-mono"
                  />
                </div>
              </div>

              {/* Pricing Grid: Cost & Automatic Selling Price Determination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Cost */}
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">سعر تكلفة الكرتونة (شراء):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={costPricePerCarton}
                    onChange={(e) => handleCostCartonChange(parseFloat(e.target.value) || 0, piecesPerWholesaleUnit)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    تكلفة {baseUnit} تلقائياً: <strong>{costPricePerBase.toFixed(2)} ج</strong>
                  </span>
                </div>

                {/* Wholesale Price */}
                <div>
                  <label className="text-emerald-700 dark:text-emerald-400 block mb-1 font-bold">سعر بيع الجملة (للكرتونة):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={wholesalePricePerCarton}
                    onChange={(e) => handleWholesaleCartonChange(parseFloat(e.target.value) || 0, piecesPerWholesaleUnit)}
                    className="w-full bg-white dark:bg-slate-900 border border-emerald-500 rounded-xl p-2 text-emerald-700 dark:text-emerald-400 font-mono font-black"
                  />
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    نصف الجملة: {halfWholesalePricePerCarton.toFixed(2)} ج
                  </span>
                </div>

                {/* Retail Piece Price (Auto determined) */}
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">
                    سعر بيع {baseUnit} قطاعي (تلقائي):
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    required
                    value={retailPricePerBase}
                    onChange={(e) => setRetailPricePerBase(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-emerald-600 block mt-1 font-bold">
                    تم حسابه تلقائياً بهامش ربح
                  </span>
                </div>
              </div>

              {/* Stock in Single Warehouse: Both Cartons and Pieces Input */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/40">
                <div>
                  <label className="text-slate-800 dark:text-slate-200 block mb-1 font-bold">
                    الرصيد الابتدائي (عدد الكراتين):
                  </label>
                  <input
                    type="number"
                    value={initialCartons}
                    onChange={(e) => setInitialCartons(parseInt(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-800 dark:text-slate-200 block mb-1 font-bold">
                    قطع إضافية (فرط):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={piecesPerWholesaleUnit - 1}
                    value={initialPieces}
                    onChange={(e) => setInitialPieces(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    الإجمالي: {(initialCartons * piecesPerWholesaleUnit) + initialPieces} {baseUnit}
                  </span>
                </div>

                <div>
                  <label className="text-slate-800 dark:text-slate-200 block mb-1 font-bold">حد الطلب (بالكرتونة):</label>
                  <input
                    type="number"
                    value={reorderLevelCartons}
                    onChange={(e) => setReorderLevelCartons(parseInt(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">تاريخ الصلاحية:</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">رقم التشغيلة (Batch):</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="رقم الباتش أو التشغيلة"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  {editingProductId ? 'حفظ التعديلات' : 'إضافة الصنف للمخزن الموحد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK ADJUSTMENT (تسوية المخزون: جرد / عجز / زيادة / تلف) */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600/50 rounded-2xl max-w-xl w-full shadow-2xl p-6 text-right relative flex flex-col my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-amber-600" />
                <h3 className="font-black text-lg text-slate-900 dark:text-white">تسوية وجرد رصيد المخزن الموحد</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-4 py-4 text-xs">
              {/* Product Selector */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">اختر الصنف المراد تسويته:</label>
                <select
                  value={adjustmentProductId}
                  onChange={(e) => {
                    setAdjustmentProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod) {
                      setAdjustmentCartons(Math.floor(prod.stockPieces / prod.piecesPerWholesaleUnit));
                      setAdjustmentPieces(prod.stockPieces % prod.piecesPerWholesaleUnit);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand}) — الرصيد الحالي: {Math.floor(p.stockPieces / p.piecesPerWholesaleUnit)} كرتونة و {p.stockPieces % p.piecesPerWholesaleUnit} قطعة
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Balance Display */}
              {(() => {
                const curProd = products.find(p => p.id === adjustmentProductId);
                if (!curProd) return null;
                const curCartons = Math.floor(curProd.stockPieces / curProd.piecesPerWholesaleUnit);
                const curRemPieces = curProd.stockPieces % curProd.piecesPerWholesaleUnit;

                return (
                  <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-300 dark:border-amber-700/50 flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200">الرصيد الدفتري المسجل حالياً:</span>
                    <span className="font-mono font-black text-amber-800 dark:text-amber-300 text-sm">
                      {curCartons} {curProd.wholesaleUnit} و {curRemPieces} {curProd.baseUnit} (إجمالي: {curProd.stockPieces} قطعة)
                    </span>
                  </div>
                );
              })()}

              {/* Adjustment Mode Toggle */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">طريقة التسوية:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentMode('NEW_COUNT')}
                    className={`p-2.5 rounded-xl border font-bold cursor-pointer transition-all ${
                      adjustmentMode === 'NEW_COUNT'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    تحديد الرصيد الفعلي بعد الجرد
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentMode('DIFFERENCE')}
                    className={`p-2.5 rounded-xl border font-bold cursor-pointer transition-all ${
                      adjustmentMode === 'DIFFERENCE'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    إضافة / خصم فرق مباشر (+ / -)
                  </button>
                </div>
              </div>

              {/* Count / Difference Inputs */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">
                    {adjustmentMode === 'NEW_COUNT' ? 'الرصيد الفعلي (كرتونة):' : 'فرق الكراتين (+/-):'}
                  </label>
                  <input
                    type="number"
                    value={adjustmentCartons}
                    onChange={(e) => setAdjustmentCartons(parseInt(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">
                    {adjustmentMode === 'NEW_COUNT' ? 'الرصيد الفعلي (قطع فرط):' : 'فرق القطع (+/-):'}
                  </label>
                  <input
                    type="number"
                    value={adjustmentPieces}
                    onChange={(e) => setAdjustmentPieces(parseInt(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">سبب التسوية:</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                >
                  <option value="AUDIT">جرد فعلي دوري</option>
                  <option value="DAMAGE">تلف بضاعة أو كسر</option>
                  <option value="EXPIRY">انتهاء صلاحية بضاعة</option>
                  <option value="BONUS">بونص بضاعة وزيادة مجانية من المورد</option>
                  <option value="CORRECTION">تصحيح خطأ إدخال سابق</option>
                  <option value="OTHER">سبب آخر</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-bold">ملاحظات وبيان التسوية:</label>
                <input
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="اكتب تفاصيل إضافية عن سبب العجز أو الزيادة..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer shadow-md"
                >
                  حفظ وتطبيق تسوية المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE PRODUCT CONFIRMATION */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">تأكيد حذف الصنف</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">سيتم مسح الصنف من بطاقة الأصناف بالمخزن</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed my-3">
              هل أنت متأكد من حذف الصنف <strong>({productToDelete.name})</strong> التابع لـ <strong>({productToDelete.brand})</strong>؟
            </p>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-rose-950/20"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
