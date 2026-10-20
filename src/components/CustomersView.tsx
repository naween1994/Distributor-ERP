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
  Trash2,
  Navigation,
  Compass,
  Globe,
  LocateFixed,
  Map,
  Crosshair,
  Loader2,
  Check
} from 'lucide-react';
import { ExportService } from '../services/exportService';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

export interface MapPreset {
  name: string;
  lat: number;
  lng: number;
  region: string;
}

export const SRI_LANKA_MAP_PRESETS: MapPreset[] = [
  // { name: 'Pettah Wholesale Market (Colombo 11)', lat: 6.9372, lng: 79.8562, region: 'Western' },
  // { name: 'Kandy Central (Dalada Veediya)', lat: 7.2906, lng: 80.6337, region: 'Central' },
  // { name: 'Galle Fort Heritage Grocers', lat: 6.0329, lng: 80.2170, region: 'Southern' },
  // { name: 'Kurunegala Commercial Junction', lat: 7.4863, lng: 80.3623, region: 'North Western' },
  // { name: 'Negombo Coastal Main Street', lat: 7.2083, lng: 79.8358, region: 'Western' },
  // { name: 'Gampaha Station Trade Area', lat: 7.0917, lng: 79.9997, region: 'Western' },
  // { name: 'Dambulla Dedicated Economic Centre', lat: 7.8731, lng: 80.6517, region: 'Central' },
  // { name: 'Bandaragama Spice Production Hub', lat: 6.7167, lng: 79.9833, region: 'Western' },
  // { name: 'Matara Fort & Bazaar', lat: 5.9496, lng: 80.5469, region: 'Southern' },
  // { name: 'Anuradhapura Trade Centre', lat: 8.3114, lng: 80.4037, region: 'North Central' },
  // { name: 'Ratnapura Gem & Spice Market', lat: 6.6828, lng: 80.4034, region: 'Sabaragamuwa' },
  // { name: 'Jaffna City Market', lat: 9.6615, lng: 80.0255, region: 'Northern' },
];

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

  // Geo-Location & Google Maps State
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number; name: string }>({
    lat: 6.9372,
    lng: 79.8562,
    name: 'Pettah Wholesale Market (Colombo 11)',
  });
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
    latitude: undefined,
    longitude: undefined,
    mapLocationName: '',
    googleMapsUrl: '',
  });

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.mapLocationName && c.mapLocationName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setLocationStatus(null);
    setFormData({
      name: '',
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      region: 'Sri Lanka',
      taxId: `TAX-${Math.floor(100000 + Math.random() * 900000)}`,
      reference: '',
      tier: 'wholesale',
      creditLimit: 10000,
      paymentTerms: 'Net 30',
      notes: '',
      latitude: undefined,
      longitude: undefined,
      mapLocationName: '',
      googleMapsUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setLocationStatus(null);
    setFormData({ ...customer });
    setIsModalOpen(true);
  };

  // Device GPS Location Acquisition (Current device location)
  const handleGetDeviceLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus({
        message: 'GPS Geolocation is not supported by this browser.',
        type: 'error',
      });
      return;
    }

    setIsLocatingDevice(true);
    setLocationStatus({ message: 'Requesting precise device GPS coordinates...', type: 'info' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingDevice(false);
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        const locName = `Device GPS Location (${lat}, ${lng})`;

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          mapLocationName: prev.mapLocationName || locName,
          googleMapsUrl: mapsUrl,
        }));

        setLocationStatus({
          message: `Location successfully detected: Lat ${lat}, Lng ${lng} (±${Math.round(position.coords.accuracy)}m accuracy)`,
          type: 'success',
        });
      },
      (error) => {
        setIsLocatingDevice(false);
        let errorMsg = 'Could not retrieve device location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied by user or browser security policy. You can choose from map presets or enter coordinates.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS position unavailable. Please ensure location services are enabled.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        setLocationStatus({ message: errorMsg, type: 'error' });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Open Interactive Map Picker
  const handleOpenMapPicker = () => {
    const lat = formData.latitude || 6.9372;
    const lng = formData.longitude || 79.8562;
    const name = formData.mapLocationName || (formData.city ? `${formData.city} Area` : 'Pettah Wholesale Market (Colombo 11)');
    setMapCoords({ lat, lng, name });
    setIsMapPickerOpen(true);
  };

  // Confirm and Apply Map Coordinates
  const handleApplyMapCoords = () => {
    const mapsUrl = `https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}`;
    setFormData((prev) => ({
      ...prev,
      latitude: mapCoords.lat,
      longitude: mapCoords.lng,
      mapLocationName: mapCoords.name,
      googleMapsUrl: mapsUrl,
    }));
    setIsMapPickerOpen(false);
    setLocationStatus({
      message: `Set location to ${mapCoords.name} (${mapCoords.lat}, ${mapCoords.lng})`,
      type: 'success',
    });
  };

  // Clear Location
  const handleClearLocation = () => {
    setFormData((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
      mapLocationName: '',
      googleMapsUrl: '',
    }));
    setLocationStatus(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (selectedCustomer) {
      const updatedCustomer: Customer = {
        ...selectedCustomer,
        ...(formData as Customer),
        latitude: formData.latitude,
        longitude: formData.longitude,
        mapLocationName: formData.mapLocationName,
        googleMapsUrl: formData.googleMapsUrl || (formData.latitude && formData.longitude ? `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}` : undefined),
      };
      onUpdateCustomer(updatedCustomer);
      if (activeCustomerDetail?.id === selectedCustomer.id) {
        setActiveCustomerDetail(updatedCustomer);
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
        latitude: formData.latitude,
        longitude: formData.longitude,
        mapLocationName: formData.mapLocationName,
        googleMapsUrl: formData.googleMapsUrl || (formData.latitude && formData.longitude ? `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}` : undefined),
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
                        <div className="text-slate-900 font-medium">{c.contactPerson}</div>
                        <div className="text-[11px] text-slate-500">{c.city}, {c.region}</div>
                        {c.latitude && c.longitude ? (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <a
                              href={c.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors"
                              title={`Open Google Maps Location: ${c.latitude}, ${c.longitude}`}
                            >
                              <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>Google Map ({c.latitude.toFixed(3)}, {c.longitude.toFixed(3)})</span>
                              <ExternalLink className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                            </a>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded mt-1 transition-colors"
                            title="Add Google Maps coordinates"
                          >
                            <MapPin className="w-2.5 h-2.5 text-amber-600" />
                            <span>+ Set Map Pin</span>
                          </button>
                        )}
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
                        Rs. {metrics.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {metrics.balance > 0 ? (
                          <span className="font-semibold text-amber-700">
                            Rs. {metrics.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-600">Rs. 0.00</span>
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
                        Rs. {metrics.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500">Outstanding Due</div>
                      <div className={`text-base font-bold font-mono tabular-nums mt-0.5 ${metrics.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        Rs. {metrics.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <div className="text-[11px] text-slate-500">Credit Limit</div>
                      <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                        Rs. {activeCustomerDetail.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

              {/* Google Maps Location & Delivery Navigation Card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-100 text-emerald-800">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Google Map Location & Delivery Route
                      </h3>
                      <p className="text-[11px] text-emerald-700">
                        {activeCustomerDetail.mapLocationName || `${activeCustomerDetail.city}, ${activeCustomerDetail.region}`}
                      </p>
                    </div>
                  </div>

                  {activeCustomerDetail.latitude && activeCustomerDetail.longitude ? (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 rounded border border-emerald-300">
                      GPS: {activeCustomerDetail.latitude.toFixed(4)}, {activeCustomerDetail.longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-900 rounded border border-amber-300">
                      GPS Not Set
                    </span>
                  )}
                </div>

                {activeCustomerDetail.latitude && activeCustomerDetail.longitude ? (
                  <div className="space-y-2">
                    <div className="w-full h-48 rounded-lg overflow-hidden border border-emerald-300/80 bg-slate-100 relative shadow-inner">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeCustomerDetail.longitude - 0.012}%2C${activeCustomerDetail.latitude - 0.012}%2C${activeCustomerDetail.longitude + 0.012}%2C${activeCustomerDetail.latitude + 0.012}&layer=mapnik&marker=${activeCustomerDetail.latitude}%2C${activeCustomerDetail.longitude}`}
                        className="w-full h-full border-0"
                        title="Customer GPS Location Map"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        <a
                          href={activeCustomerDetail.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${activeCustomerDetail.latitude},${activeCustomerDetail.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Open in Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${activeCustomerDetail.latitude},${activeCustomerDetail.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
                        >
                          <Compass className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Get Driving Directions</span>
                        </a>
                      </div>

                      {permissions.canManageCustomers && (
                        <button
                          type="button"
                          onClick={() => {
                            const cust = activeCustomerDetail;
                            setActiveCustomerDetail(null);
                            handleOpenEdit(cust);
                          }}
                          className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold underline"
                        >
                          Update Location
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/80 rounded-lg border border-dashed border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-slate-600">
                      No Google Maps coordinates are saved for this account. Add coordinates to enable real-time routing for delivery drivers.
                    </div>
                    {permissions.canManageCustomers && (
                      <button
                        type="button"
                        onClick={() => {
                          const cust = activeCustomerDetail;
                          setActiveCustomerDetail(null);
                          handleOpenEdit(cust);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg whitespace-nowrap transition-colors"
                      >
                        + Set Map Pin Now
                      </button>
                    )}
                  </div>
                )}
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
                    placeholder="e.g. 88 5th Cross Street, Pettah"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Colombo 11"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Region / Province</label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g. Western Province, Sri Lanka"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Google Maps Location & GPS Coordinates Picker */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Google Map Location & GPS Coordinates
                      </h3>
                      <p className="text-[11px] text-emerald-700">
                        Capture device GPS or open interactive map to place a pin for delivery routing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleGetDeviceLocation}
                      disabled={isLocatingDevice}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                      title="Detect current device GPS location"
                    >
                      {isLocatingDevice ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      ) : (
                        <LocateFixed className="w-3.5 h-3.5 text-emerald-700" />
                      )}
                      <span>{isLocatingDevice ? 'Detecting GPS...' : 'Use Current Device Location'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenMapPicker}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-2xs"
                      title="Open interactive map to set location or choose preset"
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>Open Map & Set Location</span>
                    </button>
                  </div>
                </div>

                {locationStatus && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
                    locationStatus.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : locationStatus.type === 'error'
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {locationStatus.type === 'success' && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                      {locationStatus.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />}
                      {locationStatus.type === 'info' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />}
                      <span>{locationStatus.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocationStatus(null)}
                      className="text-slate-500 hover:text-slate-800 text-[11px]"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Latitude (e.g. 6.937200)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        setFormData((prev) => ({
                          ...prev,
                          latitude: val,
                          googleMapsUrl: val && prev.longitude ? `https://www.google.com/maps?q=${val},${prev.longitude}` : prev.googleMapsUrl,
                        }));
                      }}
                      placeholder="e.g. 6.937200"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Longitude (e.g. 79.856200)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        setFormData((prev) => ({
                          ...prev,
                          longitude: val,
                          googleMapsUrl: prev.latitude && val ? `https://www.google.com/maps?q=${prev.latitude},${val}` : prev.googleMapsUrl,
                        }));
                      }}
                      placeholder="e.g. 79.856200"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Location Label / Landmark
                    </label>
                    <input
                      type="text"
                      value={formData.mapLocationName || ''}
                      onChange={(e) => setFormData({ ...formData, mapLocationName: e.target.value })}
                      placeholder="e.g. Main Market Entrance"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                {formData.latitude && formData.longitude && (
                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Pinned: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}</span>
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        <span>Preview in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-medium"
                    >
                      Clear Pin
                    </button>
                  </div>
                )}
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

      {/* Interactive Google Map Location Picker Modal */}
      {isMapPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-emerald-950 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-800/80 text-emerald-300 border border-emerald-700">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Set Customer Location on Google Maps</h2>
                  <p className="text-xs text-emerald-300/90 mt-0.5">
                    Select a Sri Lankan commercial hub, click device GPS, or fine-tune coordinates for delivery routing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(false)}
                className="text-emerald-400 hover:text-white text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Quick Sri Lankan Distribution Hub Presets */}
              {SRI_LANKA_MAP_PRESETS.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Select Sri Lanka Commercial Hub Preset:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SRI_LANKA_MAP_PRESETS.map((preset) => {
                      const isSelected = Math.abs(mapCoords.lat - preset.lat) < 0.001 && Math.abs(mapCoords.lng - preset.lng) < 0.001;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setMapCoords({
                              lat: preset.lat,
                              lng: preset.lng,
                              name: preset.name,
                            });
                          }}
                          className={`text-left p-2 rounded-lg border text-xs transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="font-semibold truncate">{preset.name.split(' (')[0]}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {preset.lat.toFixed(4)}, {preset.lng.toFixed(4)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Map Preview Embed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Live Pin Position:</span>
                    <span className="font-mono text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Lat {mapCoords.lat.toFixed(5)}, Lng {mapCoords.lng.toFixed(5)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (!('geolocation' in navigator)) return;
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = parseFloat(pos.coords.latitude.toFixed(6));
                          const lng = parseFloat(pos.coords.longitude.toFixed(6));
                          setMapCoords({
                            lat,
                            lng,
                            name: `Device GPS Location (${lat}, ${lng})`,
                          });
                        },
                        (err) => console.warn(err),
                        { enableHighAccuracy: true, timeout: 8000 }
                      );
                    }}
                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold text-xs"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Use My Device GPS</span>
                  </button>
                </div>

                <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-300 relative shadow-inner bg-slate-100">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.015}%2C${mapCoords.lat - 0.015}%2C${mapCoords.lng + 0.015}%2C${mapCoords.lat + 0.015}&layer=mapnik&marker=${mapCoords.lat}%2C${mapCoords.lng}`}
                    className="w-full h-full border-0"
                    title="Interactive Pin Location Map"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Fine-Tuning Coordinates Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Coordinate Fine-Tuning & Custom Location
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Latitude
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={mapCoords.lat}
                        onChange={(e) => setMapCoords({ ...mapCoords, lat: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setMapCoords({ ...mapCoords, lat: parseFloat((mapCoords.lat + 0.005).toFixed(6)) })}
                        className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-bold"
                        title="Nudge North"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapCoords({ ...mapCoords, lat: parseFloat((mapCoords.lat - 0.005).toFixed(6)) })}
                        className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-bold"
                        title="Nudge South"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Longitude
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={mapCoords.lng}
                        onChange={(e) => setMapCoords({ ...mapCoords, lng: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setMapCoords({ ...mapCoords, lng: parseFloat((mapCoords.lng - 0.005).toFixed(6)) })}
                        className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-bold"
                        title="Nudge West"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapCoords({ ...mapCoords, lng: parseFloat((mapCoords.lng + 0.005).toFixed(6)) })}
                        className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-bold"
                        title="Nudge East"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Location Label
                    </label>
                    <input
                      type="text"
                      value={mapCoords.name}
                      onChange={(e) => setMapCoords({ ...mapCoords, name: e.target.value })}
                      placeholder="e.g. Kandy Central Market"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <a
                  href={`https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-950 font-bold"
                >
                  <span>Preview in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyMapCoords}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Set Location</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
