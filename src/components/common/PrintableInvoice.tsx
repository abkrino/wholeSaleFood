import React, { useState } from 'react';
import { SalesInvoice } from '../../types';
import { storage } from '../../services/storageService';
import { Printer, X, FileText } from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: SalesInvoice;
  onClose: () => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  invoice,
  onClose,
}) => {
  const [format, setFormat] = useState<'THERMAL' | 'A4'>('THERMAL');

  const customers = storage.getCustomers();
  const customer = customers.find(c => c.id === invoice.customerId);

  const COMPANY_PHONE = '01023456789 - 01156789012';
  const customerPhone = customer?.phone || '01000000000';

  const handlePrint = () => {
    window.print();
  };

  const prevBalance = invoice.previousCustomerBalance || 0;
  const newBalance = invoice.newCustomerBalance || (prevBalance + invoice.remainingAmount);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden text-right flex flex-col my-6 max-h-[95vh]">
        {/* Modal Top Bar (Screen only - hidden in print) */}
        <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">معاينة وطباعة الفاتورة</span>
            <div className="bg-slate-900 rounded-lg p-0.5 border border-slate-700 flex text-xs">
              <button
                type="button"
                onClick={() => setFormat('THERMAL')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  format === 'THERMAL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                بون كاشير 80 مم
              </button>
              <button
                type="button"
                onClick={() => setFormat('A4')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  format === 'A4' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                فاتورة A4 جملة
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/60"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة فورية</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (ZERO profit printed anywhere on the paper!) */}
        <div className="p-4 overflow-y-auto bg-slate-950 flex justify-center">
          {format === 'THERMAL' ? (
            /* 80mm ESC/POS Thermal Receipt - With identical comprehensive data as A4 */
            <div className="bg-white text-black p-4 w-[330px] font-mono text-xs shadow-xl rounded border border-slate-300 leading-relaxed select-text print:shadow-none print:border-none print:w-full">
              <div className="text-center pb-2 border-b-2 border-dashed border-black">
                <h2 className="font-black text-sm">مؤسسة البركة لتوزيع المواد الغذائية</h2>
                <p className="text-[10px]">بسكويت • شيبسي • شوكولاتة • مقرمشات بالجملة</p>
                <p className="text-[10px] font-bold">هاتف الشركة والتوزيع: {COMPANY_PHONE}</p>
                <p className="text-[9px] text-gray-700">القاهرة والجيزة — إدارة المبيعات والتوزيع</p>
              </div>

              <div className="py-2 border-b border-dashed border-black text-[10px] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>رقم الفاتورة:</span>
                  <span className="font-mono text-xs">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span>{invoice.date} — {invoice.time}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-dotted border-gray-400 pt-1">
                  <span>اسم العميل / المحل:</span>
                  <span className="font-sans font-black">{invoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>رقم هاتف العميل:</span>
                  <span className="font-mono font-bold">{customerPhone}</span>
                </div>
                {customer?.area && (
                  <div className="flex justify-between text-[9px] text-gray-700">
                    <span>المنطقة / خط السير:</span>
                    <span>{customer.area}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>طريقة السداد:</span>
                  <span className="font-bold">
                    {invoice.paymentType === 'CASH' ? 'نقدي فوري' : invoice.paymentType === 'CREDIT' ? 'آجل على الحساب' : 'مختلط (دفعة + آجل)'}
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span>مسؤول البيع / الكاشير:</span>
                  <span className="font-sans">{invoice.salespersonName}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-black">
                <table className="w-full text-right text-[10px]">
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th className="py-1">الصنف</th>
                      <th className="py-1 text-center">الوحدة</th>
                      <th className="py-1 text-center">الكمية</th>
                      <th className="py-1 text-center">السعر</th>
                      <th className="py-1 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-dotted border-gray-300">
                        <td className="py-1 font-sans">
                          <span className="font-bold">{it.productName}</span>
                          <span className="block text-[8px] text-gray-500 font-mono">{it.productCode}</span>
                        </td>
                        <td className="py-1 text-center font-sans text-[9px]">
                          {it.unit === 'CARTON' ? 'كرتونة' : 'قطعة'}
                        </td>
                        <td className="py-1 text-center font-bold font-mono">{it.quantity}</td>
                        <td className="py-1 text-center font-mono">{it.unitPrice.toFixed(2)}</td>
                        <td className="py-1 text-left font-bold font-mono">{it.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Complete Customer Debt Statement */}
              <div className="py-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>المجموع قبل الخصم:</span>
                  <span>{invoice.subtotal.toFixed(2)} ج.م</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-black font-bold">
                    <span>قيمة الخصم الممنوح:</span>
                    <span>- {invoice.discountAmount.toFixed(2)} ج.م</span>
                  </div>
                )}
                
                {/* 1. إجمالي الفاتورة الصافي */}
                <div className="flex justify-between text-sm border-t border-b-2 border-black py-1 font-black bg-gray-50 px-1">
                  <span>إجمالي الفاتورة الصافي:</span>
                  <span>{invoice.total.toFixed(2)} ج.م</span>
                </div>
                
                <div className="flex justify-between text-[10px]">
                  <span>المدفوع نقداً:</span>
                  <span className="font-bold">{invoice.paidAmount.toFixed(2)} ج.م</span>
                </div>
                
                <div className="flex justify-between text-[10px]">
                  <span>المتبقي من هذه الفاتورة:</span>
                  <span className="font-bold">{invoice.remainingAmount.toFixed(2)} ج.م</span>
                </div>

                {/* كشف حساب المديونية الشامل */}
                <div className="bg-gray-100 p-2 rounded border border-gray-400 mt-2 space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="font-bold">المديونية القديمة للعميل:</span>
                    <span className="font-mono font-bold">{prevBalance.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المتبقي من هذه الفاتورة:</span>
                    <span className="font-mono">+{invoice.remainingAmount.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-black text-xs border-t border-dashed border-gray-500 pt-1 text-black">
                    <span>إجمالي المديونية بعد الفاتورة:</span>
                    <span className="font-mono text-sm">{newBalance.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2 border-t-2 border-dashed border-black text-[9px] leading-tight space-y-0.5">
                <p className="font-bold">شكراً لتعاملكم مع مؤسسة البركة</p>
                <p>البضاعة المباعة ترد وتستبدل خلال 3 أيام بحالتها الأصلية</p>
                <p className="font-mono text-[8px] text-gray-600">خدمة العملاء: {COMPANY_PHONE}</p>
              </div>
            </div>
          ) : (
            /* A4 Wholesale Invoice Layout */
            <div className="bg-white text-black p-6 w-[520px] text-xs shadow-xl rounded border border-slate-300 leading-normal select-text print:shadow-none print:border-none print:w-full">
              <div className="flex justify-between items-start pb-3 border-b-2 border-slate-900">
                <div>
                  <h2 className="font-black text-base text-slate-900">مؤسسة البركة لتوزيع المواد الغذائية</h2>
                  <p className="text-[11px] text-slate-700">تجارة وتوزيع المواد الغذائية والحلويات بالجملة</p>
                  <p className="text-[10px] font-bold text-slate-800">هاتف الشركة والإدارة: {COMPANY_PHONE}</p>
                  <p className="text-[10px] text-slate-500">القاهرة والجيزة — س.ت: 104929</p>
                </div>
                <div className="text-left font-mono">
                  <span className="bg-slate-200 border border-slate-400 px-2.5 py-1 text-xs font-black block mb-1">
                    فاتورة مبيعات جملة
                  </span>
                  <span className="text-[11px] font-bold">رقم: {invoice.invoiceNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 my-3 bg-slate-100 p-2.5 rounded border border-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-600 block">اسم المحل / العميل المستلم:</span>
                  <span className="font-bold text-slate-900 text-sm">{invoice.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-600 block">رقم تليفون العميل:</span>
                  <span className="font-mono font-bold text-slate-900">{customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-600 block">التاريخ والوقت:</span>
                  <span className="font-mono">{invoice.date} — {invoice.time}</span>
                </div>
                <div>
                  <span className="text-slate-600 block">طريقة السداد:</span>
                  <span className="font-bold">
                    {invoice.paymentType === 'CASH' ? 'نقدي فوري' : invoice.paymentType === 'CREDIT' ? 'آجل على الحساب' : 'دفعة نقدية + آجل'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block">مسؤول التحرير:</span>
                  <span>{invoice.salespersonName}</span>
                </div>
                <div>
                  <span className="text-slate-600 block">المنطقة / خط السير:</span>
                  <span>{customer?.area || 'المركز الرئيسي'}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-[11px] my-3 border border-slate-400">
                <thead className="bg-slate-200 border-b border-slate-400 font-bold">
                  <tr>
                    <th className="p-1.5">م</th>
                    <th className="p-1.5">الصنف</th>
                    <th className="p-1.5 text-center">الوحدة</th>
                    <th className="p-1.5 text-center">الكمية</th>
                    <th className="p-1.5 text-center">سعر الوحدة</th>
                    <th className="p-1.5 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {invoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-1.5 font-mono text-slate-600">{idx + 1}</td>
                      <td className="p-1.5 font-bold">{it.productName}</td>
                      <td className="p-1.5 text-center">{it.unit === 'CARTON' ? 'كرتونة' : 'قطعة'}</td>
                      <td className="p-1.5 text-center font-mono font-bold">{it.quantity}</td>
                      <td className="p-1.5 text-center font-mono">{it.unitPrice.toFixed(2)}</td>
                      <td className="p-1.5 text-left font-mono font-bold">{it.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary and Debt Box */}
              <div className="flex justify-between items-start my-3 gap-3">
                {/* USER SPECIFIED: كشف مديونية حساب العميل مع المديونية القديمة والمديونية بعد الفاتورة */}
                <div className="w-1/2 bg-slate-100 p-2.5 rounded border border-slate-300 text-[11px] space-y-1.5">
                  <span className="font-bold text-slate-900 block border-b border-slate-300 pb-1">كشف حساب مديونية العميل:</span>
                  <div className="flex justify-between">
                    <span className="text-slate-700">المديونية القديمة للعميل:</span>
                    <span className="font-bold font-mono text-slate-900">{prevBalance.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">المتبقي من هذه الفاتورة:</span>
                    <span className="font-bold font-mono text-slate-900">+{invoice.remainingAmount.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-black text-xs border-t border-slate-400 pt-1 text-slate-950 bg-slate-200/60 px-1 py-0.5 rounded">
                    <span>إجمالي المديونية بعد الفاتورة:</span>
                    <span className="font-mono">{newBalance.toFixed(2)} ج.م</span>
                  </div>
                </div>

                {/* Invoice Math Box */}
                <div className="w-1/2 space-y-1 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-300 font-mono">
                  <div className="flex justify-between">
                    <span className="font-sans">المجموع قبل الخصم:</span>
                    <span>{invoice.subtotal.toFixed(2)} ج.م</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-slate-900">
                      <span className="font-sans">خصم خاص:</span>
                      <span>- {invoice.discountAmount.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black border-t border-slate-400 pt-1 text-xs text-slate-950">
                    <span className="font-sans">إجمالي الفاتورة:</span>
                    <span>{invoice.total.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans">المدفوع نقداً:</span>
                    <span>{invoice.paidAmount.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-400 flex justify-between text-[10px] text-slate-600 mt-4">
                <div>توقيع المستلم: ...............................</div>
                <div>توقيع إدارة المبيعات: ...............................</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
