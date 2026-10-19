import React, { useState } from 'react';
import { Product, Customer, Order, OrderItem, PaymentStatus, PaymentMethod, RolePermissions, PricingTier, PaymentTerm } from '../types';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  FileText, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  X,
  CreditCard,
  Landmark,
  ShieldAlert
} from 'lucide-react';
import { ExportService } from '../services/exportService';
import { generateInvoicePDF } from '../services/pdfService';
import { DecimalUtils } from '../services/decimalUtils';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

interface OrdersViewProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  permissions: RolePermissions;
  pricingTiers?: PricingTier[];
  paymentTerms?: PaymentTerm[];
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  onCreateOrder: (newOrder: Order) => void;
  onUpdatePaymentStatus: (orderId: string, status: PaymentStatus, paidAmount: number) => void;
  onViewInvoice: (order: Order) => void;
  onOpenPaymentReminder: (order: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  adminDeletePassword?: string;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  customers,
  permissions,
  pricingTiers = [],
  paymentTerms = [],
  isCreateModalOpen,
  setIsCreateModalOpen,
  onCreateOrder,
  onUpdatePaymentStatus,
  onViewInvoice,
  onOpenPaymentReminder,
  onDeleteOrder,
  adminDeletePassword = 'Vista',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<Order | null>(null);

  // New Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [initialPaymentStatus, setInitialPaymentStatus] = useState<PaymentStatus>('Pending');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0); // 0% or 5%
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Customer selected object
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Recalculate due date when customer or orderDate changes based on payment terms
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      const term = paymentTerms.find((t) => t.code === cust.paymentTerms);
      const days = term ? term.days : cust.paymentTerms === 'Immediate' ? 0 : cust.paymentTerms === 'Net 15' ? 15 : cust.paymentTerms === 'Net 60' ? 60 : 30;
      const baseDate = new Date(orderDate);
      baseDate.setDate(baseDate.getDate() + days);
      setDueDate(baseDate.toISOString().slice(0, 10));
    }
  };

  // Line items state
  const [lineItems, setLineItems] = useState<
    Array<{
      productId: string;
      quantity: number;
      customUnitPrice?: number;
    }>
  >([
    { productId: products[0]?.id || '', quantity: 10 },
  ]);

  // Helper to get price by dynamic tier
  const getTierPrice = (product: Product, customer: Customer) => {
    if (!product || !customer) return 0;
    const tier = pricingTiers.find((t) => t.code === customer.tier);
    if (tier) {
      if (tier.code === 'wholesale' && product.wholesalePrice) return DecimalUtils.round(product.wholesalePrice);
      if (tier.code === 'distributor' && product.distributorPrice) return DecimalUtils.round(product.distributorPrice);
      if (tier.code === 'retail') return DecimalUtils.round(product.retailPrice);
      if (tier.discountPercentage > 0) {
        const disc = DecimalUtils.percent(product.retailPrice, tier.discountPercentage);
        return DecimalUtils.subtract(product.retailPrice, disc);
      }
      return DecimalUtils.round(product.retailPrice);
    }
    if (customer.tier === 'distributor') return DecimalUtils.round(product.distributorPrice);
    if (customer.tier === 'wholesale') return DecimalUtils.round(product.wholesalePrice);
    return DecimalUtils.round(product.retailPrice);
  };

  // Add line item
  const handleAddLineItem = () => {
    // Pick first product not already in lineItems if possible
    const usedIds = lineItems.map((li) => li.productId);
    const available = products.find((p) => !usedIds.includes(p.id)) || products[0];
    if (available) {
      setLineItems([...lineItems, { productId: available.id, quantity: 5 }]);
    }
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateLineItem = (index: number, field: 'productId' | 'quantity', value: any) => {
    const updated = [...lineItems];
    if (field === 'productId') {
      updated[index].productId = value;
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(0.1, parseFloat(value) || 1);
    }
    setLineItems(updated);
  };

  // Calculate totals and stock validations using DecimalUtils safe rounding
  let hasStockError = false;

  const resolvedItems: OrderItem[] = lineItems.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return {
        productId: item.productId,
        productName: 'Unknown Item',
        sku: 'N/A',
        unit: '100g',
        quantity: item.quantity,
        unitPrice: 0,
        costPrice: 0,
        totalPrice: 0,
      };
    }

    if (item.quantity > product.currentStock) {
      hasStockError = true;
    }

    const unitPrice = getTierPrice(product, currentCustomer);
    const itemTotal = DecimalUtils.multiply(unitPrice, item.quantity);

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity: item.quantity,
      unitPrice,
      costPrice: product.costPrice,
      totalPrice: itemTotal,
    };
  });

  const orderCalculations = DecimalUtils.calculateOrder(
    resolvedItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, costPrice: i.costPrice })),
    discountPercent,
    taxRate
  );

  const subtotal = orderCalculations.subtotal;
  const discountAmount = orderCalculations.discountAmount;
  const taxableAmount = orderCalculations.taxableAmount;
  const taxAmount = orderCalculations.taxAmount;
  const totalAmount = orderCalculations.totalAmount;

  const [orderError, setOrderError] = useState<string | null>(null);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    if (!currentCustomer || resolvedItems.length === 0) {
      setOrderError('Please select a customer and add at least one line item.');
      return;
    }
    if (hasStockError) {
      setOrderError('Cannot place order: One or more requested spice quantities exceed available stock.');
      return;
    }

    // Generate unique invoice number
    const currentYear = new Date().getFullYear();
    const invoiceNum = `INV-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      invoiceNumber: invoiceNum,
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      customerTier: currentCustomer.tier,
      customerEmail: currentCustomer.email,
      customerPhone: currentCustomer.phone,
      customerAddress: `${currentCustomer.address}, ${currentCustomer.city}, ${currentCustomer.region}`,
      orderDate,
      dueDate,
      items: resolvedItems,
      subtotal,
      discountPercentage: discountPercent,
      discountAmount,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount: initialPaymentStatus === 'Paid' ? totalAmount : 0,
      paymentStatus: initialPaymentStatus,
      paymentMethod,
      orderStatus: 'Processing',
      notes: orderNotes,
      quickbooksSyncStatus: 'pending',
      xeroSyncStatus: 'pending',
    };

    onCreateOrder(newOrder);
    setIsCreateModalOpen(false);

    // Reset lines
    setLineItems([{ productId: products[0]?.id || '', quantity: 10 }]);
    setOrderNotes('');
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Orders & Commercial Invoicing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create multi-item wholesale orders with automated tier pricing, stock verification, and PDF invoice generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => ExportService.exportOrdersCSV(orders)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canCreateOrders && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-800 rounded-lg hover:bg-amber-900 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Sales Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer name, or spice item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(['all', 'Paid', 'Pending', 'Partially Paid', 'Overdue'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'all' ? 'All Orders' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider">
                <th className="py-3 px-4">INVOICE & DATE</th>
                <th className="py-3 px-4">CUSTOMER & TIER</th>
                <th className="py-3 px-4">LINE ITEMS</th>
                <th className="py-3 px-4 text-right">TOTAL INVOICE</th>
                <th className="py-3 px-4 text-center">PAYMENT</th>
                <th className="py-3 px-4 text-center">ACCOUNTING SYNC</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No orders found matching criteria</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isPaid = ord.paymentStatus === 'Paid';
                  const isOverdue = ord.paymentStatus === 'Overdue';
                  const isPending = ord.paymentStatus === 'Pending' || ord.paymentStatus === 'Partially Paid';
                  const balance = Math.max(0, DecimalUtils.subtract(ord.totalAmount, ord.paidAmount));

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onViewInvoice(ord)}
                          className="font-mono font-semibold text-slate-900 hover:text-amber-800 transition-colors text-left"
                        >
                          {ord.invoiceNumber}
                        </button>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Issued {ord.orderDate} · Due {ord.dueDate}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{ord.customerName}</div>
                        <div className="text-[11px] text-slate-500 capitalize">
                          {ord.customerTier} pricing · {ord.paymentMethod}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-900 max-w-xs truncate">
                          {ord.items.map((i) => `${i.quantity} ${i.unit} ${i.productName}`).join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-bold text-slate-900 text-sm">
                          {DecimalUtils.formatLKR(ord.totalAmount)}
                        </div>
                        {balance > 0 ? (
                          <div className="text-[11px] text-amber-700 font-medium">
                            Bal: {DecimalUtils.formatLKR(balance)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 font-medium">Paid in Full</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                        {permissions.canChangePaymentStatus && !isPaid && (
                          <button
                            onClick={() => onUpdatePaymentStatus(ord.id, 'Paid', ord.totalAmount)}
                            className="block mx-auto text-[10px] text-amber-800 hover:text-amber-900 font-medium underline mt-1"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap text-[11px] font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              ord.quickbooksSyncStatus === 'synced'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                            title="QuickBooks Online sync status"
                          >
                            QB
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              ord.xeroSyncStatus === 'synced'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                            title="Xero European Ledger sync status"
                          >
                            Xero
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewInvoice(ord)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="View Invoice Details"
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
                          {(isPending || isOverdue) && (
                            <button
                              onClick={() => onOpenPaymentReminder(ord)}
                              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded"
                              title="Send Payment Reminder Notice"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {permissions.canDeleteOrders && onDeleteOrder && (
                            <button
                              onClick={() => setDeleteTargetOrder(ord)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete Invoice (Admin Password Protected)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/60">
              <div>
                <h2 className="text-base font-bold text-slate-900">Create Commercial Sales Order</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time stock reservation, automatic tier discount lookup, and invoice generation.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6 space-y-5">
              {/* Customer Selector & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer Account *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.tier.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date</label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => {
                      setOrderDate(e.target.value);
                      if (currentCustomer) {
                        const term = paymentTerms.find((t) => t.code === currentCustomer.paymentTerms);
                        const days = term ? term.days : currentCustomer.paymentTerms === 'Immediate' ? 0 : currentCustomer.paymentTerms === 'Net 15' ? 15 : currentCustomer.paymentTerms === 'Net 60' ? 60 : 30;
                        const baseDate = new Date(e.target.value);
                        baseDate.setDate(baseDate.getDate() + days);
                        setDueDate(baseDate.toISOString().slice(0, 10));
                      }
                    }}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Customer Tier Confirmation Card */}
              {currentCustomer && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-amber-900 font-semibold">Active Price Schedule: </span>
                    <span className="capitalize font-bold text-amber-950">{currentCustomer.tier} Tier</span>
                    <span className="text-amber-800 ml-2">
                      (Payment Terms: {currentCustomer.paymentTerms} · Credit Limit: Rs. {currentCustomer.creditLimit.toLocaleString()})
                    </span>
                  </div>
                  <div className="text-amber-900 text-[11px]">
                    Shipping: {currentCustomer.address}, {currentCustomer.city}
                  </div>
                </div>
              )}

              {/* Line Items Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Spice Commodities & Quantities
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Spice Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {lineItems.map((item, index) => {
                    const product = products.find((p) => p.id === item.productId);
                    const unitPrice = product ? getTierPrice(product, currentCustomer) : 0;
                    const isOversold = product ? item.quantity > product.currentStock : false;
                    const willTriggerLow = product ? product.currentStock - item.quantity <= product.reorderThreshold : false;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border text-xs transition-colors ${
                          isOversold
                            ? 'bg-rose-50/70 border-rose-300'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-3 items-center">
                          {/* Product select */}
                          <div className="col-span-12 sm:col-span-5">
                            <label className="block text-[11px] text-slate-500 mb-1">Spice Lot</label>
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateLineItem(index, 'productId', e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-900 font-medium"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.currentStock} {p.unit} in stock)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div className="col-span-5 sm:col-span-3">
                            <label className="block text-[11px] text-slate-500 mb-1">
                              Quantity ({product?.unit})
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(index, 'quantity', e.target.value)}
                              className={`w-full text-xs px-2.5 py-1.5 bg-white border rounded font-mono font-bold ${
                                isOversold ? 'border-rose-400 text-rose-700' : 'border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          {/* Unit Rate & Subtotal */}
                          <div className="col-span-5 sm:col-span-3 text-right">
                            <div className="text-[11px] text-slate-500">
                              Rate: <span className="font-mono">{DecimalUtils.formatLKR(unitPrice)}</span>
                            </div>
                            <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                              {DecimalUtils.formatLKR(DecimalUtils.multiply(unitPrice, item.quantity))}
                            </div>
                          </div>

                          {/* Remove button */}
                          <div className="col-span-2 sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(index)}
                              disabled={lineItems.length === 1}
                              className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Stock warning notices */}
                        {product && (
                          <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/50">
                            <span className="text-slate-500 font-mono">
                              Lot available: {product.currentStock} {product.unit} (SKU: {product.sku})
                            </span>
                            {isOversold ? (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Requested exceeds available stock!
                              </span>
                            ) : willTriggerLow ? (
                              <span className="text-amber-700 font-medium">
                                Lot will fall below reorder threshold
                              </span>
                            ) : (
                              <span className="text-emerald-700">Stock sufficient</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Error Alert (if any) */}
              {orderError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Financial Calculation Summary & Payment Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Payment Configuration */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <h4 className="font-semibold text-slate-900">Payment & Invoicing Terms</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-900"
                      >
                        <option value="Bank Transfer">Bank Transfer (Wire)</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Letter of Credit">Letter of Credit (Export)</option>
                        <option value="Cheque">Commercial Cheque</option>
                        <option value="Cash">Cash on Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Initial Status</label>
                      <select
                        value={initialPaymentStatus}
                        onChange={(e) => setInitialPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-900 font-medium"
                      >
                        <option value="Pending">Pending (Invoice Issued)</option>
                        <option value="Paid">Paid in Full (Immediate)</option>
                        <option value="Partially Paid">Partially Paid</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Special Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Sales Tax / VAT (%)</label>
                      <select
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900"
                      >
                        <option value={0}>0% (Raw Agricultural Exemption)</option>
                        <option value={5}>5% (Standard Produce Tax)</option>
                        <option value={10}>10% (Regional Food Tax)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Logistics / Port Instructions</label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Air cargo, wooden crates, fumigation certificate attached..."
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded text-slate-900"
                    />
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Items Subtotal:</span>
                      <span className="font-mono font-medium">Rs. {subtotal.toFixed(2)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount ({discountPercent}%):</span>
                        <span className="font-mono font-medium">-Rs. {discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {taxAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax / VAT ({taxRate}%):</span>
                        <span className="font-mono font-medium">Rs. {taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-slate-900">Total Invoice Amount:</span>
                      <span className="text-xl font-bold font-mono text-amber-900 tabular-nums">
                        Rs. {totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Auto invoice number will be generated & packet stock will be decremented upon submit.
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hasStockError}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                >
                  Confirm Order & Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Master Password Protected Invoice Deletion Modal */}
      {deleteTargetOrder && onDeleteOrder && (
        <AdminDeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteTargetOrder(null)}
          onConfirm={() => {
            onDeleteOrder(deleteTargetOrder.id);
            setDeleteTargetOrder(null);
          }}
          recordType="Order / Commercial Invoice"
          recordName={deleteTargetOrder.invoiceNumber}
          recordDetails={`Customer: ${deleteTargetOrder.customerName} · Total: Rs. ${deleteTargetOrder.totalAmount.toFixed(2)} · Status: ${deleteTargetOrder.paymentStatus}`}
          expectedPassword={adminDeletePassword}
        />
      )}
    </div>
  );
};
