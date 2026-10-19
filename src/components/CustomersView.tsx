import React, { useState } from 'react';
import { Customer, Order, CustomerTier, RolePermissions, PricingTier, PaymentTerm } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Phone, 
  Mail, 
  MapPin, 
  Edit3, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import { ExportService } from '../services/exportService';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

interface CustomersViewProps {
  customers: Customer[];
  orders: Order[];
  permissions: RolePermissions;
  pricingTiers?: PricingTier[];
  paymentTerms?: PaymentTerm[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onViewOrderInvoice: (order: Order) => void;
  onDeleteCustomer?: (customerId: string) => void;
  adminDeletePassword?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  orders,
  permissions,
  pricingTiers = [],
  paymentTerms = [],
  onAddCustomer,
  onUpdateCustomer,
  onViewOrderInvoice,
  onDeleteCustomer,
  adminDeletePassword = 'Vista',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | CustomerTier>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeCustomerDetail, setActiveCustomerDetail] = useState<Customer | null>(null);
  const [deleteTargetCustomer, setDeleteTargetCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    taxId: '',
    reference: '',
    tier: 'wholesale',
    creditLimit: 10000,
    paymentTerms: 'Net 30',
    notes: '',
  });

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setFormData({
      name: '',
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      region: '',
      taxId: `TAX-${Math.floor(100000 + Math.random() * 900000)}`,
      reference: '',
      tier: 'wholesale',
      creditLimit: 10000,
      paymentTerms: 'Net 30',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({ ...customer });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (selectedCustomer) {
      onUpdateCustomer({
        ...selectedCustomer,
        ...(formData as Customer),
      });
      if (activeCustomerDetail?.id === selectedCustomer.id) {
        setActiveCustomerDetail({ ...selectedCustomer, ...(formData as Customer) });
      }
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: formData.name || 'New Customer',
        companyName: formData.companyName || formData.name || '',
        contactPerson: formData.contactPerson || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        city: formData.city || '',
        region: formData.region || '',
        taxId: formData.taxId || '',
        reference: formData.reference || '',
        tier: (formData.tier as CustomerTier) || 'wholesale',
        creditLimit: Number(formData.creditLimit) || 5000,
        paymentTerms: (formData.paymentTerms as any) || 'Net 30',
        notes: formData.notes || '',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onAddCustomer(newCustomer);
    }
    setIsModalOpen(false);
  };

  // Helper for customer stats
  const getCustomerMetrics = (customerId: string) => {
    const custOrders = orders.filter((o) => o.customerId === customerId);
    const totalSpend = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = custOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const balance = Math.max(0, totalSpend - totalPaid);
    const overdueCount = custOrders.filter((o) => o.paymentStatus === 'Overdue').length;

    return {
      orderCount: custOrders.length,
      totalSpend,
      balance,
      overdueCount,
      orders: custOrders,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Accounts & Trade Tiers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage wholesale clients, credit terms, trade references, and customer purchase histories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => ExportService.exportCustomersCSV(customers, orders)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canManageCustomers && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-800 rounded-lg hover:bg-amber-900 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
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
            placeholder="Search by company, contact person, email, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['all', 'retail', 'wholesale', 'distributor'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize whitespace-nowrap transition-colors ${
                tierFilter === tier
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : tier}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider">
                <th className="py-3 px-4">CLIENT & TRADE NAME</th>
                <th className="py-3 px-4">CONTACT & LOCATION</th>
                <th className="py-3 px-4 text-center">PRICING TIER</th>
                <th className="py-3 px-4 text-center">PAYMENT TERMS</th>
                <th className="py-3 px-4 text-right">LIFETIME ORDERS</th>
                <th className="py-3 px-4 text-right">TOTAL SPENT</th>
                <th className="py-3 px-4 text-right">BALANCE DUE</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No customers found</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const metrics = getCustomerMetrics(c.id);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setActiveCustomerDetail(c)}
                          className="text-left group font-semibold text-slate-900 hover:text-amber-800 transition-colors"
                        >
                          {c.name}
                        </button>
                        <div className="text-[11px] text-slate-500">
                          {c.companyName !== c.name ? c.companyName : c.reference || 'Standard account'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-900">{c.contactPerson}</div>
                        <div className="text-[11px] text-slate-500">{c.city}, {c.region}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded capitalize ${
                            c.tier === 'distributor'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : c.tier === 'wholesale'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {c.tier}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600">
                        {c.paymentTerms}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                        {metrics.orderCount}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        ${metrics.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {metrics.balance > 0 ? (
                          <span className="font-semibold text-amber-700">
                            ${metrics.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-600">$0.00</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setActiveCustomerDetail(c)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="View Customer Ledger & History"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {permissions.canManageCustomers && (
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                              title="Edit Customer Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {permissions.canDeleteRecords && onDeleteCustomer && (
                            <button
                              onClick={() => setDeleteTargetCustomer(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete Customer (Admin Password Protected)"
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

      {/* Customer Detail Drawer / Modal */}
      {activeCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{activeCustomerDetail.name}</h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-900 uppercase">
                    {activeCustomerDetail.tier} TIER
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{activeCustomerDetail.companyName} · Tax ID: {activeCustomerDetail.taxId}</p>
              </div>
              <button
                onClick={() => setActiveCustomerDetail(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Financial Snapshot */}
              {(() => {
                const metrics = getCustomerMetrics(activeCustomerDetail.id);
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500">Lifetime Spend</div>
                      <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                        ${metrics.totalSpend.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500">Outstanding Due</div>
                      <div className={`text-base font-bold font-mono tabular-nums mt-0.5 ${metrics.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        ${metrics.balance.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500">Credit Limit</div>
                      <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                        ${activeCustomerDetail.creditLimit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-900">{activeCustomerDetail.email || 'No email registered'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{activeCustomerDetail.phone || 'No phone registered'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{activeCustomerDetail.address}, {activeCustomerDetail.city}, {activeCustomerDetail.region}</span>
                  </div>
                </div>
                <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                  <div className="text-slate-500">Payment Terms: <strong className="text-slate-900">{activeCustomerDetail.paymentTerms}</strong></div>
                  <div className="text-slate-500">Trade Reference: <span className="text-slate-700">{activeCustomerDetail.reference || 'None'}</span></div>
                  <div className="text-slate-500">Special Notes: <p className="text-slate-700 italic mt-0.5">{activeCustomerDetail.notes || 'None recorded.'}</p></div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Order & Invoice History</h3>
                {(() => {
                  const custOrders = orders.filter((o) => o.customerId === activeCustomerDetail.id);
                  if (custOrders.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-lg">
                        No orders have been placed by this customer yet.
                      </p>
                    );
                  }
                  return (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-semibold">
                          <tr>
                            <th className="py-2 px-3">INVOICE</th>
                            <th className="py-2 px-3">DATE</th>
                            <th className="py-2 px-3 text-right">TOTAL</th>
                            <th className="py-2 px-3 text-center">PAYMENT</th>
                            <th className="py-2 px-3 text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {custOrders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-medium text-slate-900">{o.invoiceNumber}</td>
                              <td className="py-2 px-3 text-slate-500 font-mono">{o.orderDate}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${o.totalAmount.toFixed(2)}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 font-medium">
                                  {o.paymentStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setActiveCustomerDetail(null);
                                    onViewOrderInvoice(o);
                                  }}
                                  className="text-amber-800 hover:text-amber-900 font-medium text-xs inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Invoice</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
                <button
                  onClick={() => setActiveCustomerDetail(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedCustomer ? 'Edit Customer Account' : 'New Customer Account'}
                </h2>
                <p className="text-xs text-slate-500">Configure trade tier for automatic order pricing and payment terms.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Account Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Silk Road Bistro Group"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Entity</label>
                  <input
                    type="text"
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Silk Road Hospitality Ltd"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Chef Marcus Sterling"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. marcus@silkroadbistro.com"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +1 (415) 882-9400"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 742 Montgomery St"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. San Francisco"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Region / Country</label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g. California, USA"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Pricing Tier & Terms */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Trade Tier & Credit Control</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Tier *</label>
                    <select
                      value={formData.tier || (pricingTiers.find((t) => t.isDefault)?.code || 'wholesale')}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value as CustomerTier })}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-900"
                    >
                      {pricingTiers.length > 0 ? (
                        pricingTiers.map((t) => (
                          <option key={t.id} value={t.code}>
                            {t.name} ({t.discountPercentage > 0 ? `-${t.discountPercentage.toFixed(1)}%` : 'MRP'})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="retail">Retail (Standard MRP)</option>
                          <option value="wholesale">Wholesale (~20% Discount)</option>
                          <option value="distributor">Distributor (~21% Bulk Discount)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
                    <select
                      value={formData.paymentTerms || (paymentTerms.find((t) => t.isDefault)?.code || 'Net 30')}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                    >
                      {paymentTerms.length > 0 ? (
                        paymentTerms.map((t) => (
                          <option key={t.id} value={t.code}>
                            {t.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Immediate">Immediate / Due upon receipt</option>
                          <option value="Net 15">Net 15 Days</option>
                          <option value="Net 30">Net 30 Days</option>
                          <option value="Net 60">Net 60 Days</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (LKR / Rs.)</label>
                    <input
                      type="number"
                      step="500"
                      value={formData.creditLimit ?? 25000}
                      onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax ID / VAT Registration</label>
                  <input
                    type="text"
                    value={formData.taxId || ''}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="e.g. US-CA-9411128"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Reference / Origin</label>
                  <input
                    type="text"
                    value={formData.reference || ''}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g. Golden Gate Culinary Institute"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special packaging requests, preferred shipping dock..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <div>
                  {selectedCustomer && permissions.canDeleteRecords && onDeleteCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedCustomer;
                        setIsModalOpen(false);
                        setDeleteTargetCustomer(target);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Customer</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition-colors"
                  >
                    {selectedCustomer ? 'Save Changes' : 'Register Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Master Password Protected Customer Deletion Modal */}
      {deleteTargetCustomer && onDeleteCustomer && (
        <AdminDeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteTargetCustomer(null)}
          onConfirm={() => {
            onDeleteCustomer(deleteTargetCustomer.id);
            setDeleteTargetCustomer(null);
          }}
          recordType="Customer Account"
          recordName={deleteTargetCustomer.name}
          recordDetails={`Company: ${deleteTargetCustomer.companyName} · City: ${deleteTargetCustomer.city} · Tier: ${deleteTargetCustomer.tier} · Payment: ${deleteTargetCustomer.paymentTerms}`}
          expectedPassword={adminDeletePassword}
        />
      )}
    </div>
  );
};
