import React from 'react';
import { Order, RolePermissions } from '../types';
import { 
  Download, 
  Printer, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Landmark, 
  Building2 
} from 'lucide-react';
import { generateInvoicePDF } from '../services/pdfService';

interface InvoiceDetailModalProps {
  order: Order | null;
  onClose: () => void;
  permissions: RolePermissions;
  onUpdatePaymentStatus: (orderId: string, status: any, paidAmount: number) => void;
  onOpenPaymentReminder: (order: Order) => void;
  onSyncQuickBooks: (order: Order) => void;
  onSyncXero: (order: Order) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  order,
  onClose,
  permissions,
  onUpdatePaymentStatus,
  onOpenPaymentReminder,
  onSyncQuickBooks,
  onSyncXero,
}) => {
  if (!order) return null;

  const isPaid = order.paymentStatus === 'Paid';
  const isOverdue = order.paymentStatus === 'Overdue';
  const balanceRemaining = Math.max(0, order.totalAmount - order.paidAmount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full my-8 shadow-2xl overflow-hidden print:m-0 print:border-none print:shadow-none">
        {/* Action Toolbar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-bold text-sm">{order.invoiceNumber}</span>
            <span className="text-xs text-slate-400">· Commercial Spice Bill</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateInvoicePDF(order)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {!isPaid && (
              <button
                onClick={() => onOpenPaymentReminder(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/80 hover:bg-amber-800 text-amber-200 text-xs font-medium rounded-lg border border-amber-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reminder</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Invoice Paper Canvas */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-900">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">NA DISTRIBUTORS</div>
              <div className="text-xs text-amber-900 font-semibold uppercase tracking-wider mt-0.5">
                Authorized Distributor for Vista Essentials Food Pvt Ltd
              </div>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <div>Bandaragama & Colombo Distribution Network, Sri Lanka</div>
                <div>Tax ID: NA-DIST-LK-2026 · Phone: +94 11 289 9450 / +94 77 123 4567</div>
                <div>orders@nadistributors.lk · www.nadistributors.lk</div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs font-bold text-amber-700 tracking-wider uppercase">COMMERCIAL INVOICE</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{order.invoiceNumber}</div>
              <div className="text-xs text-slate-500 font-mono mt-1 space-y-0.5">
                <div>Invoice Date: <span className="text-slate-900">{order.orderDate}</span></div>
                <div>Payment Due: <span className="text-slate-900 font-semibold">{order.dueDate}</span></div>
                <div className="mt-1">
                  Status:{' '}
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isOverdue
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {order.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Remittance Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Billed To (Client Account)
              </div>
              <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
              <div className="text-slate-600 mt-1">{order.customerAddress}</div>
              <div className="text-slate-500 mt-1 font-mono">
                {order.customerEmail} · {order.customerPhone}
              </div>
              <div className="mt-2 text-slate-700">
                Applied Tier: <span className="font-semibold capitalize text-amber-900">{order.customerTier} Pricing</span>
              </div>
            </div>

            <div className="sm:border-l border-slate-200 sm:pl-6 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Remittance & Banking Instructions
              </div>
              <div className="text-slate-700">Bank: <strong className="text-slate-900">International Spice & Maritime Trust</strong></div>
              <div className="text-slate-700 font-mono">Account: 8849-2018-9941 · Routing: ISMTUS33</div>
              <div className="text-slate-500 text-[11px] mt-1">
                Method: {order.paymentMethod}
              </div>
              <div className="text-slate-500 text-[11px]">
                Please reference invoice number on wire advice.
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Spice Description</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.productName}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {item.sku}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {item.quantity} {item.unit.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      Rs. {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rs. {item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="text-xs text-slate-500 max-w-sm space-y-2">
              {order.notes && (
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/60">
                  <div className="font-bold text-amber-950 uppercase text-[10px] tracking-wider mb-0.5">
                    Logistics / Cargo Notes
                  </div>
                  <div className="text-amber-900">{order.notes}</div>
                </div>
              )}
              <div className="text-[11px] text-slate-400 leading-relaxed">
                All commodities verified unadulterated. 100% organoleptic lot certification supplied by source laboratory.
              </div>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">Rs. {order.subtotal.toFixed(2)}</span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Tier Discount ({order.discountPercentage}%):</span>
                  <span className="font-mono font-medium">-Rs. {order.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {order.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Produce Tax / VAT ({order.taxRate}%):</span>
                  <span className="font-mono font-medium">Rs. {order.taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Invoice Total:</span>
                <span className="font-bold font-mono text-slate-900 text-base">
                  Rs. {order.totalAmount.toFixed(2)}
                </span>
              </div>

              {order.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Paid to Date:</span>
                  <span className="font-mono font-medium">Rs. {order.paidAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Balance Due:</span>
                <span className={`font-bold font-mono text-base ${balanceRemaining > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                  Rs. {balanceRemaining.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Accounting Ledger Status & Quick Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3.5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Accounting Sync:</span>
              <button
                onClick={() => onSyncQuickBooks(order)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border ${
                  order.quickbooksSyncStatus === 'synced'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-3 h-3" />
                <span>QuickBooks ({order.quickbooksSyncStatus || 'pending'})</span>
              </button>

              <button
                onClick={() => onSyncXero(order)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border ${
                  order.xeroSyncStatus === 'synced'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>Xero ({order.xeroSyncStatus || 'pending'})</span>
              </button>
            </div>

            {permissions.canChangePaymentStatus && !isPaid && (
              <button
                onClick={() => onUpdatePaymentStatus(order.id, 'Paid', order.totalAmount)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded transition-colors"
              >
                Mark Paid in Full
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
