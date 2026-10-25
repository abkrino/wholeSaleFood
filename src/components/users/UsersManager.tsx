import React, { useState } from 'react';
import { User, Role, UserPermissions } from '../../types';
import { storage } from '../../services/storageService';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Edit3, 
  Trash2, 
  KeyRound, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  Phone,
  Eye,
  EyeOff,
  RotateCcw,
  CheckSquare,
  Square,
  Sparkles,
  X
} from 'lucide-react';

interface UsersManagerProps {
  currentUser: User;
  onRefreshData: () => void;
}

const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canEditPrice: true,
  canGiveDiscount: true,
  canSellNegativeStock: true,
  canDeleteInvoice: true,
  canEditInvoice: true,
  canViewProfits: true,
  canManageProducts: true,
  canManagePurchases: true,
  canManageCash: true,
};

const DEFAULT_SALES_PERMISSIONS: UserPermissions = {
  canEditPrice: true,
  canGiveDiscount: true,
  canSellNegativeStock: true,
  canDeleteInvoice: false,
  canEditInvoice: true,
  canViewProfits: false,
  canManageProducts: false,
  canManagePurchases: false,
  canManageCash: false,
};

export const UsersManager: React.FC<UsersManagerProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('SALES');
  const [pinCode, setPinCode] = useState('1111');
  const [showPin, setShowPin] = useState(true);
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_SALES_PERMISSIONS);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = currentUser.role === 'ADMIN';

  const reloadUsers = () => {
    setUsers(storage.getUsers());
    onRefreshData();
  };

  const openAddModal = () => {
    setEditingUserId(null);
    setFullName('');
    setUsername('');
    setRole('SALES');
    setPinCode('1111');
    setShowPin(true);
    setPhone('');
    setIsActive(true);
    setPermissions(DEFAULT_SALES_PERMISSIONS);
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUserId(u.id);
    setFullName(u.fullName);
    setUsername(u.username);
    setRole(u.role);
    setPinCode(u.pinCode);
    setShowPin(true);
    setPhone(u.phone || '');
    setIsActive(u.isActive);
    setPermissions(u.permissions || (u.role === 'ADMIN' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_SALES_PERMISSIONS));
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (!editingUserId) {
      setPinCode(newRole === 'ADMIN' ? '1234' : '1111');
      setPermissions(newRole === 'ADMIN' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_SALES_PERMISSIONS);
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanPin = pinCode.trim();
    if (cleanPin.length < 4) {
      setMessage({ type: 'error', text: 'الرقم السري (PIN) يجب ألا يقل عن 4 أرقام' });
      return;
    }

    let userToSave: User;
    if (editingUserId) {
      const existing = users.find(u => u.id === editingUserId)!;
      userToSave = {
        ...existing,
        fullName,
        username: username.toLowerCase().trim(),
        role,
        pinCode: cleanPin,
        phone,
        isActive,
        permissions,
      };
    } else {
      userToSave = {
        id: `u-${Date.now()}`,
        fullName,
        username: username.toLowerCase().trim(),
        role,
        pinCode: cleanPin,
        phone,
        isActive,
        avatarColor: role === 'ADMIN' ? 'bg-emerald-600' : 'bg-blue-600',
        permissions,
      };
    }

    const res = storage.saveUser(userToSave);
    if (res.success) {
      setMessage({
        type: 'success',
        text: `تم ${editingUserId ? 'تعديل' : 'إضافة'} المستخدم (${fullName}) بنجاح!`
      });
      setIsModalOpen(false);
      reloadUsers();
    } else {
      setMessage({ type: 'error', text: res.error || 'حدث خطأ أثناء حفظ المستخدم' });
    }
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    const res = storage.deleteUser(userToDelete.id);
    if (res.success) {
      setMessage({ type: 'success', text: `تم حذف المستخدم (${userToDelete.fullName}) بنجاح.` });
      setUserToDelete(null);
      reloadUsers();
    } else {
      setMessage({ type: 'error', text: res.error || 'فشل حذف المستخدم' });
    }
  };

  const handleResetUserPin = (u: User) => {
    const defaultPin = u.role === 'ADMIN' ? '1234' : '1111';
    u.pinCode = defaultPin;
    storage.saveUser(u);
    setMessage({
      type: 'success',
      text: `تمت استعادة الرقم السري الافتراضي للمستخدم (${u.fullName}) ليصبح: ${defaultPin}`
    });
    reloadUsers();
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>إدارة المستخدمين والصلاحيات والأمان</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            تحديد كلمة المرور (PIN) لكل مستخدم، وتخصيص صلاحيات تعديل الأسعار، الخصومات، البيع بالسالب، وحذف الفواتير.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد +</span>
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between font-bold ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs cursor-pointer opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Users Cards / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200">المستخدمون المسجلون ({users.length})</span>
          <span className="text-slate-500 dark:text-slate-400 font-mono font-medium">الافتراضي: المدير (1234) • الكاشير (1111)</span>
        </div>

        <div className="overflow-x-auto min-h-[250px]">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <th className="py-2.5 px-3">الاسم بالكامل</th>
                <th className="py-2.5 px-3">اسم المستخدم</th>
                <th className="py-2.5 px-3">الدور</th>
                <th className="py-2.5 px-3">الرقم السري (PIN)</th>
                <th className="py-2.5 px-3">رقم الهاتف</th>
                <th className="py-2.5 px-3">الصلاحيات الفعالة</th>
                <th className="py-2.5 px-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map(u => {
                const perms = u.permissions || (u.role === 'ADMIN' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_SALES_PERMISSIONS);

                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${u.role === 'ADMIN' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                          {u.fullName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{u.fullName}</div>
                          {u.id === currentUser.id && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● المستخدم الحالي</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 font-semibold">{u.username}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                        u.role === 'ADMIN'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                      }`}>
                        {u.role === 'ADMIN' ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        <span>{u.role === 'ADMIN' ? 'مدير عام كامل الصلاحيات' : 'كاشير مبيعات'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      <span className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded">
                        {u.pinCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono">{u.phone || '-'}</td>
                    <td className="py-3 px-3 text-[11px]">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {perms.canEditPrice && <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">تعديل السعر</span>}
                        {perms.canGiveDiscount && <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">الخصم</span>}
                        {perms.canSellNegativeStock && <span className="bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">بيع بالسالب</span>}
                        {perms.canDeleteInvoice && <span className="bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-1.5 py-0.5 rounded font-medium">حذف فواتير</span>}
                        {perms.canViewProfits && <span className="bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">رؤية الأرباح</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-colors font-bold shadow-xs"
                          title="تعديل المستخدم والصلاحيات"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل والصلاحيات</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetUserPin(u)}
                          className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-600/20 dark:hover:bg-amber-600/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 p-2 rounded-lg cursor-pointer transition-colors shadow-xs"
                          title="استعادة الباسورد الافتراضي (1234 أو 1111)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {isAdmin && u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 p-2 rounded-lg cursor-pointer transition-colors shadow-xs"
                            title="حذف المستخدم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">تأكيد حذف المستخدم</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">لن يتمكن هذا المستخدم من الدخول للنظام بعد الحذف</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed my-3">
              هل أنت متأكد من حذف المستخدم <strong>({userToDelete.fullName})</strong> ذو اسم الدخول <strong>({userToDelete.username})</strong>؟
            </p>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal with Permissions Checklist */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl p-6 text-right relative my-6 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{editingUserId ? 'تعديل بيانات وصلاحيات المستخدم' : 'إضافة مستخدم جديد'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">الاسم بالكامل:</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: محمد عبد الله"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">اسم المستخدم للدخول:</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="sales2"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">الدور الرئيسي:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('ADMIN')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                      role === 'ADMIN'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>مدير عام (Admin)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('SALES')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                      role === 'SALES'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>كاشير مبيعات (Sales)</span>
                  </button>
                </div>
              </div>

              {/* PIN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">الرقم السري (PIN):</label>
                    <button
                      type="button"
                      onClick={() => setPinCode(role === 'ADMIN' ? '1234' : '1111')}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                    >
                      استعادة الافتراضي ({role === 'ADMIN' ? '1234' : '1111'})
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="4 أرقام أو أكثر"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-emerald-600 dark:text-emerald-400 font-mono tracking-widest text-base font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute left-2.5 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-0.5 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">رقم الهاتف (اختياري):</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* USER SPECIFIED: قسم الصلاحيات التفصيلية (Detailed Permissions Checklist) */}
              <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="font-bold text-slate-900 dark:text-slate-200 block text-xs">
                  الصلاحيات التفصيلية الممنوحة لهذا المستخدم:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canEditPrice}
                      onChange={() => togglePermission('canEditPrice')}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>تعديل سعر بيع الوحدة في الفاتورة</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canGiveDiscount}
                      onChange={() => togglePermission('canGiveDiscount')}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>منح خصومات (مبلغ أو نسبة)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canSellNegativeStock}
                      onChange={() => togglePermission('canSellNegativeStock')}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>البيع والصرف بالسالب من المخزن</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canEditInvoice}
                      onChange={() => togglePermission('canEditInvoice')}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>تعديل فواتير المبيعات السابقة</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canDeleteInvoice}
                      onChange={() => togglePermission('canDeleteInvoice')}
                      className="rounded accent-rose-600 w-4 h-4 cursor-pointer"
                    />
                    <span>حذف الفواتير وإلغاء مديونية العميل</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canViewProfits}
                      onChange={() => togglePermission('canViewProfits')}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>مشاهدة أرباح الفواتير والتقارير المالية</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canManageProducts}
                      onChange={() => togglePermission('canManageProducts')}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>إضافة وتعديل الأصناف والشركات</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={permissions.canManagePurchases}
                      onChange={() => togglePermission('canManagePurchases')}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>تسجيل فواتير الشراء والتوريد</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md transition-colors"
                >
                  {editingUserId ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
