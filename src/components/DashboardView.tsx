import React from 'react';
import { Product, Customer, Order, RolePermissions } from '../types';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  Download, 
  FileText, 
  Send, 
  DollarSign,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { generateInvoicePDF } from '../services/pdfService';

interface DashboardViewProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  permissions: RolePermissions;
  onNavigateTab: (tab: string) => void;
  onOpenNewOrder: () => void;
  onOpenAddProduct: () => void;
  onViewInvoice: (order: Order) => void;
  onOpenPaymentReminder: (order: Order) => void;
  onQuickRestock: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  customers,
  orders,
  permissions,
  onNavigateTab,
  onOpenNewOrder,
  onOpenAddProduct,
  onViewInvoice,
  onOpenPaymentReminder,
  onQuickRestock,
}) => {
  // Calculations
  const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalPaid = orders.reduce((acc, o) => acc + o.paidAmount, 0);
  const outstandingBalance = Math.max(0, totalRevenue - totalPaid);

  const inventoryValueAtCost = products.reduce((acc, p) => {
    const unitCost = p.batchCost && p.initialStock ? (p.batchCost / p.initialStock) : p.costPrice;
    return acc + p.currentStock * unitCost;
  }, 0);
  const inventoryValueAtRetail = products.reduce((acc, p) => acc + p.currentStock * p.retailPrice, 0);

  const lowStockProducts = products.filter((p) => p.currentStock <= p.reorderThreshold);
  const recentOrders = [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5);

  // Top Spices sold
  const spiceSalesMap: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!spiceSalesMap[item.productId]) {
        spiceSalesMap[item.productId] = { name: item.productName, sku: item.sku, qty: 0, revenue: 0 };
      }
      spiceSalesMap[item.productId].qty += item.quantity;
      spiceSalesMap[item.productId].revenue += item.totalPrice;
    });
  });
  const topSpices = Object.values(spiceSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Editorial Welcome Strip with Spice Warehouse Asset */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/spice_warehouse_hero_1792209294761.jpg"
            alt="Spice Warehouse inventory and storage"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium tracking-wider uppercase mb-2">
            <span>Direct Commercial Trade</span>
            <span aria-hidden="true">·</span>
            <span>Batch Traceability 100%</span>
            <span aria-hidden="true">·</span>
            <span>Q4 Active Harvest</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 text-balance">
            Spice Logistics & Enterprise Sales
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            Monitor real-time lot balances, tier-based pricing for restaurants and distributors, automated commercial invoices, and ledger synchronizations.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {permissions.canCreateOrders && (
              <button
                onClick={onOpenNewOrder}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Create New Sales Order</span>
              </button>
            )}
            {permissions.canEditInventory && (
              <button
                onClick={onOpenAddProduct}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Receive / Add Spice Lot</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('reports')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <span>Weekly Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Gross Sales Revenue</span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            Rs. {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Collected: Rs. {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            <span className="text-amber-700 font-medium">Due: Rs. {outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Inventory Stock Value</span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-800">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            Rs. {permissions.canViewCostPrices 
              ? inventoryValueAtCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : inventoryValueAtRetail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {permissions.canViewCostPrices ? (
              <span>Valued at cost · Retail: Rs. {inventoryValueAtRetail.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            ) : (
              <span>Calculated at current list price</span>
            )}
          </div>
        </div>

        {/* Total Active SKUs & Low Stock Indicator */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Active Spice SKUs</span>
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {products.length}
            </span>
            <span className="text-xs text-slate-500">products catalogued</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {lowStockProducts.length > 0 ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockProducts.length} items below reorder threshold
              </span>
            ) : (
              <span className="text-emerald-600">All spice lots fully stocked</span>
            )}
          </div>
        </div>

        {/* Total Accounts & Orders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Orders & Customers</span>
            <span className="p-1.5 rounded-md bg-slate-100 text-slate-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {orders.length}
            </span>
            <span className="text-xs text-slate-500">orders from {customers.length} accounts</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Wholesale & Distributors</span>
            <button
              onClick={() => onNavigateTab('customers')}
              className="text-amber-800 hover:text-amber-900 font-medium"
            >
              View accounts
            </button>
          </div>
        </div>
      </div>

      {/* Owner & Admin Commercial Settings Quick Card */}
      {permissions.canManageOwnerSettings && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white rounded-xl p-4 shadow-sm border border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Owner & Admin Commercial Hub</div>
              <p className="text-xs text-slate-300 mt-0.5">
                Manually alter trade pricing tiers (Retail, Wholesale, Distributor, HoReCa) and credit payment terms (COD, Net 7 to 60 Days).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('owner')}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap self-start sm:self-center"
          >
            Manage Trade Matrix &rarr;
          </button>
        </div>
      )}

      {/* Low Stock Urgent Notice (If any) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-950">
                  Low Stock Attention Required ({lowStockProducts.length} Lots)
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Items below minimum threshold could delay upcoming wholesale deliveries.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('inventory')}
                className="px-3 py-1.5 text-xs font-medium bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors"
              >
                Review Inventory
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-amber-200/60">
            {lowStockProducts.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-amber-200/60 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 truncate max-w-[180px]">{item.name}</div>
                  <div className="text-slate-500 text-[11px] font-mono tabular-nums">
                    Current: <strong className="text-rose-600">{item.currentStock} {item.unit}</strong> · Min: {item.reorderThreshold} {item.unit}
                  </div>
                </div>
                {permissions.canEditInventory && (
                  <button
                    onClick={() => onQuickRestock(item)}
                    className="px-2 py-1 text-[11px] font-medium bg-amber-100 text-amber-900 hover:bg-amber-200 rounded transition-colors whitespace-nowrap"
                  >
                    + Restock
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Orders & Top Spices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - 2 Columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Commercial Orders</h2>
              <p className="text-xs text-slate-500">Live order fulfillment and payment status</p>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-medium text-amber-800 hover:text-amber-900 transition-colors flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-medium text-slate-500 tracking-wider">
                  <th className="py-2.5 px-4">INVOICE</th>
                  <th className="py-2.5 px-4">CUSTOMER</th>
                  <th className="py-2.5 px-4">DATE</th>
                  <th className="py-2.5 px-4 text-right">TOTAL</th>
                  <th className="py-2.5 px-4 text-center">PAYMENT</th>
                  <th className="py-2.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentOrders.map((ord) => {
                  const isPaid = ord.paymentStatus === 'Paid';
                  const isOverdue = ord.paymentStatus === 'Overdue';
                  const isPending = ord.paymentStatus === 'Pending' || ord.paymentStatus === 'Partially Paid';

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {ord.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 truncate max-w-[160px]">{ord.customerName}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{ord.customerTier} pricing</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono tabular-nums">
                        {ord.orderDate}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        Rs. {ord.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewInvoice(ord)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="View Commercial Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => generateInvoicePDF(ord)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {(isOverdue || isPending) && (
                            <button
                              onClick={() => onOpenPaymentReminder(ord)}
                              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded"
                              title="Send Payment Reminder"
                            >
                              <Send className="w-3.5 h-3.5" />
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

        {/* Top Selling Spices & Quick Actions */}
        <div className="space-y-6">
          {/* Top Products */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Top Selling Spices</h3>
            <p className="text-xs text-slate-500 mb-4">Highest revenue generating commodities</p>

            <div className="space-y-3.5">
              {topSpices.map((spice, idx) => (
                <div key={spice.sku} className="flex items-center justify-between text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-slate-400 font-semibold text-xs mt-0.5">0{idx + 1}.</span>
                    <div>
                      <div className="font-medium text-slate-900 truncate max-w-[150px]">{spice.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{spice.sku} · {spice.qty} packets</div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                    Rs. {spice.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Need detailed breakdown?</span>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-amber-800 hover:text-amber-900 font-medium"
              >
                View performance trends
              </button>
            </div>
          </div>

          {/* Spice Visual Spotlight */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white relative">
            <img
              src="/src/assets/images/spice_cardamom_bowls_1792209294990.jpg"
              alt="Raw artisanal spices"
              className="w-full h-32 object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="p-4">
              <div className="text-xs font-semibold text-slate-900">Direct Origin Partnerships</div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Fresh arrivals from Sri Lanka Galle harvest & Kerala cardamom estates are in stock.
              </p>
              <button
                onClick={() => onNavigateTab('inventory')}
                className="mt-3 text-xs text-amber-800 hover:text-amber-900 font-medium inline-flex items-center gap-1"
              >
                <span>Browse inventory lots</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
