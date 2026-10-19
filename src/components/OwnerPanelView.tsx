import React, { useState } from 'react';
import { 
  PricingTier, 
  PaymentTerm, 
  UserProfile, 
  RolePermissions, 
  Product 
} from '../types';
import { 
  ShieldCheck, 
  Tag, 
  CalendarClock, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  DollarSign, 
  HelpCircle, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Clock, 
  Lock, 
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Building2,
  Check,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

interface OwnerPanelViewProps {
  pricingTiers: PricingTier[];
  paymentTerms: PaymentTerm[];
  products: Product[];
  activeUser: UserProfile;
  permissions: RolePermissions;
  adminDeletePassword: string;
  onUpdatePricingTiers: (tiers: PricingTier[]) => void;
  onUpdatePaymentTerms: (terms: PaymentTerm[]) => void;
  onResetDefaults: () => void;
  onUpdateAdminDeletePassword: (newPass: string) => void;
  onWipeCustomersAndOrders?: () => void;
  onNavigateUsersTab?: () => void;
}

export const OwnerPanelView: React.FC<OwnerPanelViewProps> = ({
  pricingTiers,
  paymentTerms,
  products,
  activeUser,
  permissions,
  adminDeletePassword,
  onUpdatePricingTiers,
  onUpdatePaymentTerms,
  onResetDefaults,
  onUpdateAdminDeletePassword,
  onWipeCustomersAndOrders,
  onNavigateUsersTab,
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'terms' | 'simulator' | 'security'>('tiers');

  // Deletion target states
  const [deleteTargetTier, setDeleteTargetTier] = useState<PricingTier | null>(null);
  const [deleteTargetTerm, setDeleteTargetTerm] = useState<PaymentTerm | null>(null);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

  // Security password change form
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [pwdMessage, setPwdMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tier Modal State
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [tierFormData, setTierFormData] = useState<Partial<PricingTier>>({
    name: '',
    code: '',
    discountPercentage: 15,
    pricingBasis: 'discount_from_mrp',
    targetMarginPct: 18,
    dealerCommissionPct: 10,
    minimumOrderValue: 5000,
    minimumOrderPackets: 24,
    description: '',
    isDefault: false,
    isActive: true,
  });

  // Payment Term Modal State
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const [termFormData, setTermFormData] = useState<Partial<PaymentTerm>>({
    name: '',
    code: '',
    days: 30,
    gracePeriodDays: 5,
    earlyPaymentDiscountPct: 0,
    earlyPaymentDays: 0,
    requiresCreditApproval: false,
    description: '',
    isDefault: false,
    isActive: true,
  });

  // Simulator State
  const [simSelectedProductId, setSimSelectedProductId] = useState<string>(products[0]?.id || '');
  const simProduct = products.find((p) => p.id === simSelectedProductId) || products[0];

  const isAdmin = activeUser.role === 'admin';

  // -------------------------------------------------------------
  // TIER HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddTier = () => {
    setEditingTier(null);
    setTierFormData({
      id: `tier-${Date.now()}`,
      name: '',
      code: '',
      discountPercentage: 15,
      pricingBasis: 'discount_from_mrp',
      targetMarginPct: 18,
      dealerCommissionPct: 10,
      minimumOrderValue: 5000,
      minimumOrderPackets: 24,
      description: '',
      isDefault: false,
      isActive: true,
      colorBadge: 'blue',
    });
    setIsTierModalOpen(true);
  };

  const handleOpenEditTier = (tier: PricingTier) => {
    setEditingTier(tier);
    setTierFormData({ ...tier });
    setIsTierModalOpen(true);
  };

  const handleSaveTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!tierFormData.name || !tierFormData.code) return;

    let updatedTiers: PricingTier[];

    if (editingTier) {
      updatedTiers = pricingTiers.map((t) => {
        if (t.id === editingTier.id) {
          return {
            ...t,
            ...(tierFormData as PricingTier),
            discountPercentage: Number(tierFormData.discountPercentage) || 0,
            targetMarginPct: Number(tierFormData.targetMarginPct) || 0,
            dealerCommissionPct: Number(tierFormData.dealerCommissionPct) || 0,
            minimumOrderValue: Number(tierFormData.minimumOrderValue) || 0,
            minimumOrderPackets: Number(tierFormData.minimumOrderPackets) || 0,
          };
        }
        // If this tier is marked as default, unset other defaults
        if (tierFormData.isDefault) {
          return { ...t, isDefault: false };
        }
        return t;
      });
    } else {
      const newTier: PricingTier = {
        id: `tier-${Date.now()}`,
        name: tierFormData.name || 'New Tier',
        code: tierFormData.code?.toLowerCase().replace(/\s+/g, '_') || 'tier_code',
        discountPercentage: Number(tierFormData.discountPercentage) || 0,
        pricingBasis: tierFormData.pricingBasis || 'discount_from_mrp',
        targetMarginPct: Number(tierFormData.targetMarginPct) || 0,
        dealerCommissionPct: Number(tierFormData.dealerCommissionPct) || 0,
        minimumOrderValue: Number(tierFormData.minimumOrderValue) || 0,
        minimumOrderPackets: Number(tierFormData.minimumOrderPackets) || 0,
        description: tierFormData.description || '',
        isDefault: Boolean(tierFormData.isDefault),
        isActive: tierFormData.isActive ?? true,
        colorBadge: 'blue',
      };

      if (newTier.isDefault) {
        updatedTiers = pricingTiers.map((t) => ({ ...t, isDefault: false }));
        updatedTiers.push(newTier);
      } else {
        updatedTiers = [...pricingTiers, newTier];
      }
    }

    onUpdatePricingTiers(updatedTiers);
    setIsTierModalOpen(false);
  };

  const handleDeleteTier = (tierId: string) => {
    if (!isAdmin) return;
    const tier = pricingTiers.find((t) => t.id === tierId);
    if (tier?.isDefault) {
      return;
    }
    const filtered = pricingTiers.filter((t) => t.id !== tierId);
    onUpdatePricingTiers(filtered);
  };

  const handleToggleTierStatus = (tierId: string) => {
    if (!isAdmin) return;
    const updated = pricingTiers.map((t) => {
      if (t.id === tierId) {
        return { ...t, isActive: !t.isActive };
      }
      return t;
    });
    onUpdatePricingTiers(updated);
  };

  const handleSetDefaultTier = (tierId: string) => {
    if (!isAdmin) return;
    const updated = pricingTiers.map((t) => ({
      ...t,
      isDefault: t.id === tierId,
      isActive: t.id === tierId ? true : t.isActive,
    }));
    onUpdatePricingTiers(updated);
  };

  // -------------------------------------------------------------
  // PAYMENT TERM HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddTerm = () => {
    setEditingTerm(null);
    setTermFormData({
      id: `term-${Date.now()}`,
      name: '',
      code: '',
      days: 30,
      gracePeriodDays: 5,
      earlyPaymentDiscountPct: 0,
      earlyPaymentDays: 0,
      requiresCreditApproval: false,
      description: '',
      isDefault: false,
      isActive: true,
    });
    setIsTermModalOpen(true);
  };

  const handleOpenEditTerm = (term: PaymentTerm) => {
    setEditingTerm(term);
    setTermFormData({ ...term });
    setIsTermModalOpen(true);
  };

  const handleSaveTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!termFormData.name || !termFormData.code) return;

    let updatedTerms: PaymentTerm[];

    if (editingTerm) {
      updatedTerms = paymentTerms.map((t) => {
        if (t.id === editingTerm.id) {
          return {
            ...t,
            ...(termFormData as PaymentTerm),
            days: Number(termFormData.days) || 0,
            gracePeriodDays: Number(termFormData.gracePeriodDays) || 0,
            earlyPaymentDiscountPct: Number(termFormData.earlyPaymentDiscountPct) || 0,
            earlyPaymentDays: Number(termFormData.earlyPaymentDays) || 0,
          };
        }
        if (termFormData.isDefault) {
          return { ...t, isDefault: false };
        }
        return t;
      });
    } else {
      const newTerm: PaymentTerm = {
        id: `term-${Date.now()}`,
        name: termFormData.name || 'New Payment Term',
        code: termFormData.code || 'Net XX',
        days: Number(termFormData.days) || 0,
        gracePeriodDays: Number(termFormData.gracePeriodDays) || 0,
        earlyPaymentDiscountPct: Number(termFormData.earlyPaymentDiscountPct) || 0,
        earlyPaymentDays: Number(termFormData.earlyPaymentDays) || 0,
        requiresCreditApproval: Boolean(termFormData.requiresCreditApproval),
        description: termFormData.description || '',
        isDefault: Boolean(termFormData.isDefault),
        isActive: termFormData.isActive ?? true,
      };

      if (newTerm.isDefault) {
        updatedTerms = paymentTerms.map((t) => ({ ...t, isDefault: false }));
        updatedTerms.push(newTerm);
      } else {
        updatedTerms = [...paymentTerms, newTerm];
      }
    }

    onUpdatePaymentTerms(updatedTerms);
    setIsTermModalOpen(false);
  };

  const handleDeleteTerm = (termId: string) => {
    if (!isAdmin) return;
    const term = paymentTerms.find((t) => t.id === termId);
    if (term?.isDefault) return;
    const filtered = paymentTerms.filter((t) => t.id !== termId);
    onUpdatePaymentTerms(filtered);
  };

  const handleToggleTermStatus = (termId: string) => {
    if (!isAdmin) return;
    const updated = paymentTerms.map((t) => {
      if (t.id === termId) {
        return { ...t, isActive: !t.isActive };
      }
      return t;
    });
    onUpdatePaymentTerms(updated);
  };

  const handleSetDefaultTerm = (termId: string) => {
    if (!isAdmin) return;
    const updated = paymentTerms.map((t) => ({
      ...t,
      isDefault: t.id === termId,
      isActive: t.id === termId ? true : t.isActive,
    }));
    onUpdatePaymentTerms(updated);
  };

  const handleChangeMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (currentMasterPass !== adminDeletePassword) {
      setPwdMessage({ text: 'Current master deletion password is incorrect.', type: 'error' });
      return;
    }

    if (newMasterPass.length < 3) {
      setPwdMessage({ text: 'New password must be at least 3 characters long.', type: 'error' });
      return;
    }

    if (newMasterPass !== confirmMasterPass) {
      setPwdMessage({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }

    onUpdateAdminDeletePassword(newMasterPass);
    setCurrentMasterPass('');
    setNewMasterPass('');
    setConfirmMasterPass('');
    setPwdMessage({ text: 'Master deletion password successfully updated!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Role Notice */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-800 text-amber-100 rounded-xl shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin & Owner Control Panel</h1>
              <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                isAdmin 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {isAdmin ? 'Owner Authorized' : 'View-Only Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Manually calibrate wholesale discount rates, buyer margin policies, dealer commissions, and credit payment terms. All changes propagate in real-time across order generation and invoice calculations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={onResetDefaults}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
              title="Reset Pricing Tiers & Payment Terms to Sri Lankan Spice Trade Standards"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          )}

          {activeTab === 'tiers' && isAdmin && (
            <button
              onClick={handleOpenAddTier}
              className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pricing Tier</span>
            </button>
          )}

          {activeTab === 'terms' && isAdmin && (
            <button
              onClick={handleOpenAddTerm}
              className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Payment Term</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-admin read-only alert */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Restricted Access Mode:</strong> You are currently viewing as <code className="font-bold">{activeUser.name}</code> ({activeUser.title}). Modifying commercial pricing tiers and financial credit terms is restricted to the <strong>Managing Director / Owner (Admin)</strong>. To edit, switch the team persona in the top navigation bar.
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-medium pb-px">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold transition-colors ${
            activeTab === 'tiers'
              ? 'border-amber-800 text-amber-900 bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Pricing Tiers & Margins ({pricingTiers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold transition-colors ${
            activeTab === 'terms'
              ? 'border-amber-800 text-amber-900 bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Payment Terms & Credit Policies ({paymentTerms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold transition-colors ${
            activeTab === 'simulator'
              ? 'border-amber-800 text-amber-900 bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Live Commercial Price Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold transition-colors ${
            activeTab === 'security'
              ? 'border-amber-800 text-amber-900 bg-white rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Admin Security & Passwords</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PRICING TIERS */}
      {/* ========================================================= */}
      {activeTab === 'tiers' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Active Tiers</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {pricingTiers.filter((t) => t.isActive).length} / {pricingTiers.length}
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Default Customer Tier</div>
              <div className="text-sm font-bold text-amber-900 truncate mt-1">
                {pricingTiers.find((t) => t.isDefault)?.name || 'None'}
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Highest Trade Discount</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                {Math.max(...pricingTiers.map((t) => t.discountPercentage)).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Avg Retailer Margin</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {(
                  pricingTiers.reduce((acc, t) => acc + (t.targetMarginPct || 0), 0) /
                  (pricingTiers.length || 1)
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>

          {/* Pricing Tiers Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Configured Customer Pricing Tiers</h3>
                <p className="text-[11px] text-slate-500">
                  Defines default discounts off MRP, minimum order values, and dealer commissions.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {pricingTiers.length} Defined Tiers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tier Identity & Code</th>
                    <th className="py-3 px-4 text-right">Discount from MRP</th>
                    <th className="py-3 px-4 text-right">Retailer Target Margin</th>
                    <th className="py-3 px-4 text-right">Dealer Comm.</th>
                    <th className="py-3 px-4 text-right">Min Order (LKR)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pricingTiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{tier.name}</span>
                          {tier.isDefault && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                            code: {tier.code}
                          </code>
                          <span className="text-[11px] text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500 line-clamp-1 max-w-sm">
                            {tier.description}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-slate-900 text-sm">
                          {tier.discountPercentage.toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-slate-400">off packet MRP</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="text-emerald-700 font-semibold">
                          {tier.targetMarginPct ? `${tier.targetMarginPct.toFixed(1)}%` : '—'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {tier.dealerCommissionPct ? `${tier.dealerCommissionPct.toFixed(1)}%` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-semibold text-slate-900">
                          {tier.minimumOrderValue ? `Rs. ${tier.minimumOrderValue.toLocaleString()}` : 'None'}
                        </div>
                        {tier.minimumOrderPackets ? (
                          <div className="text-[10px] text-slate-400">
                            min {tier.minimumOrderPackets} packets
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          disabled={!isAdmin}
                          onClick={() => handleToggleTierStatus(tier.id)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                            tier.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {tier.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!tier.isDefault && isAdmin && (
                            <button
                              onClick={() => handleSetDefaultTier(tier.id)}
                              className="px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-amber-800 bg-slate-100 hover:bg-amber-50 rounded transition-colors"
                              title="Set as Default Tier for New Customers"
                            >
                              Make Default
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditTier(tier)}
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                            title="Edit Tier Pricing & Margins"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && !tier.isDefault && (
                            <button
                              onClick={() => setDeleteTargetTier(tier)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Tier (Admin Password Protected)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PAYMENT TERMS */}
      {/* ========================================================= */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Active Credit Terms</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {paymentTerms.filter((t) => t.isActive).length} / {paymentTerms.length}
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Default Invoice Term</div>
              <div className="text-sm font-bold text-amber-900 truncate mt-1">
                {paymentTerms.find((t) => t.isDefault)?.name || 'None'}
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Longest Credit Window</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {Math.max(...paymentTerms.map((t) => t.days))} Days
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 text-[11px]">Early Cash Settlement</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                Up to {Math.max(...paymentTerms.map((t) => t.earlyPaymentDiscountPct || 0)).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Payment Terms Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Credit Payment Terms & Aging Policies</h3>
                <p className="text-[11px] text-slate-500">
                  Determines invoice due dates, grace intervals before automated alerts, and cash discount rewards.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {paymentTerms.length} Payment Terms
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Term Identity</th>
                    <th className="py-3 px-4 text-center">Credit Period</th>
                    <th className="py-3 px-4 text-center">Grace Period</th>
                    <th className="py-3 px-4 text-right">Early Discount</th>
                    <th className="py-3 px-4 text-center">Credit Approval</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paymentTerms.map((term) => (
                    <tr key={term.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{term.name}</span>
                          {term.isDefault && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono font-semibold">
                            {term.code}
                          </code>
                          <span className="text-[11px] text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500 line-clamp-1 max-w-sm">
                            {term.description}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-900 font-bold rounded-md">
                          {term.days === 0 ? 'Spot / 0 Days' : `${term.days} Days`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                        +{term.gracePeriodDays} Days
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {term.earlyPaymentDiscountPct ? (
                          <div>
                            <span className="font-bold text-emerald-700">
                              {term.earlyPaymentDiscountPct}%
                            </span>
                            <div className="text-[10px] text-slate-400">
                              within {term.earlyPaymentDays || 10} days
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {term.requiresCreditApproval ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Required
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Standard</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          disabled={!isAdmin}
                          onClick={() => handleToggleTermStatus(term.id)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                            term.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {term.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!term.isDefault && isAdmin && (
                            <button
                              onClick={() => handleSetDefaultTerm(term.id)}
                              className="px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-amber-800 bg-slate-100 hover:bg-amber-50 rounded transition-colors"
                              title="Set as Default Payment Term for Invoices"
                            >
                              Make Default
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditTerm(term)}
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                            title="Edit Payment Term"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && !term.isDefault && (
                            <button
                              onClick={() => setDeleteTargetTerm(term)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Payment Term (Admin Password Protected)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LIVE PRICE SIMULATOR */}
      {/* ========================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Interactive Spice Tier Rate Simulator</h3>
                <p className="text-[11px] text-slate-500">
                  Select a spice packet to see how each configured pricing tier calculates unit price, dealer commission, and profit margin.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Select Product:</span>
                <select
                  value={simSelectedProductId}
                  onChange={(e) => setSimSelectedProductId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.skuSize}) — MRP Rs. {p.retailPrice.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {simProduct && (
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-800 text-amber-100 flex items-center justify-center font-bold text-sm">
                    {simProduct.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{simProduct.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      SKU: {simProduct.sku} · Pack: {simProduct.skuSize} · Stock: {simProduct.currentStock} pkts
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Cost Per Packet</span>
                    <strong className="text-slate-900 text-sm">Rs. {simProduct.costPrice.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Retail MRP</span>
                    <strong className="text-amber-900 text-sm">Rs. {simProduct.retailPrice.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Max Unit Spread</span>
                    <strong className="text-emerald-700 text-sm">
                      Rs. {(simProduct.retailPrice - simProduct.costPrice).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Simulated Tiers Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {pricingTiers.map((tier) => {
                // Compute simulated price
                let computedPrice = simProduct.retailPrice;
                if (tier.code === 'wholesale' && simProduct.wholesalePrice) {
                  computedPrice = simProduct.wholesalePrice;
                } else if (tier.code === 'distributor' && simProduct.distributorPrice) {
                  computedPrice = simProduct.distributorPrice;
                } else {
                  computedPrice = simProduct.retailPrice * (1 - tier.discountPercentage / 100);
                }

                const grossProfit = computedPrice - simProduct.costPrice;
                const profitMarginPct = (grossProfit / computedPrice) * 100;
                const dealerCommAmount = (computedPrice * (tier.dealerCommissionPct || 0)) / 100;
                const netCompanyProfit = grossProfit - dealerCommAmount;

                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border transition-all ${
                      tier.isDefault
                        ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">{tier.name}</span>
                        {tier.isDefault && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-200 text-amber-900">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        -{tier.discountPercentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-mono">
                        <span className="text-slate-500">Tier Selling Rate:</span>
                        <strong className="text-base text-slate-900 font-bold">
                          Rs. {computedPrice.toFixed(2)}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Gross Margin:</span>
                        <span className={`font-semibold ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          Rs. {grossProfit.toFixed(2)} ({profitMarginPct.toFixed(1)}%)
                        </span>
                      </div>

                      {tier.dealerCommissionPct ? (
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-500">Dealer Comm ({tier.dealerCommissionPct}%):</span>
                          <span className="text-slate-700">Rs. {dealerCommAmount.toFixed(2)}</span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-100">
                        <span className="text-slate-700 font-semibold">Net Company Margin:</span>
                        <strong className="text-slate-900 font-bold">
                          Rs. {netCompanyProfit.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ADMIN SECURITY & PASSWORDS */}
      {/* ========================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Section 1: Master Record Deletion Password */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Admin Record Deletion Master Password
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls authorization whenever an admin removes any product, customer, order invoice, pricing tier, payment term, or user account.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-mono">
                <span className="text-slate-500 text-[11px] block">Security Password Status:</span>
                <span className="font-bold text-slate-700 text-sm">•••••••• (Protected)</span>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangeMasterPassword} className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-4 max-w-xl">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-800" />
                <span>Change Master Deletion Password</span>
              </h4>

              {pwdMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  pwdMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {pwdMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{pwdMessage.text}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentMasterPass}
                    onChange={(e) => setCurrentMasterPass(e.target.value)}
                    placeholder="Enter current deletion password"
                    className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Security Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newMasterPass}
                      onChange={(e) => setNewMasterPass(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmMasterPass}
                      onChange={(e) => setConfirmMasterPass(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isAdmin}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                Update Deletion Password
              </button>
            </form>
          </div>

          {/* Section 2: Wipe All Customers & Orders */}
          <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-100 text-rose-800">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Reset & Wipe Customer & Order Records
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clean out all customer accounts and sales orders to start entering your actual trade network from scratch.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl text-xs space-y-2">
              <div className="font-semibold text-rose-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Start from Scratch Mode:</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Clicking the button below will permanently wipe all existing customer records and sales invoices. 
                Your <strong>15 spice packet products</strong> manufactured by Vista Essentials Food Pvt Ltd and your configured pricing tiers will remain intact.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsWipeModalOpen(true)}
                  disabled={!isAdmin}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe All Orders & Customers (Requires Password)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: User Management Shortcut */}
          {onNavigateUsersTab && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">System Users & Team Access</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage logins, add new operators, and view passwords for Naween, Anura, Mangala, and Anura Gunasekara.
                </p>
              </div>
              <button
                onClick={onNavigateUsersTab}
                className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors shrink-0"
              >
                Open Users & Access Panel →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PRICING TIER */}
      {/* ========================================================= */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full my-6 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {editingTier ? 'Edit Pricing Tier' : 'Create New Pricing Tier'}
                </h3>
              </div>
              <button
                onClick={() => setIsTierModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Export Agent / Super Stockist"
                    value={tierFormData.name || ''}
                    onChange={(e) => setTierFormData({ ...tierFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tier Code (Slug) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. export_agent"
                    value={tierFormData.code || ''}
                    onChange={(e) => setTierFormData({ ...tierFormData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Discount from MRP (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="90"
                    required
                    value={tierFormData.discountPercentage ?? 15}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, discountPercentage: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Retailer Margin (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="90"
                    value={tierFormData.targetMarginPct ?? 20}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, targetMarginPct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Dealer Comm. (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="50"
                    value={tierFormData.dealerCommissionPct ?? 10}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, dealerCommissionPct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Minimum Order Value (LKR)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={tierFormData.minimumOrderValue ?? 5000}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, minimumOrderValue: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Minimum Packets Count
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={tierFormData.minimumOrderPackets ?? 24}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, minimumOrderPackets: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Description & Trade Eligibility
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Applicable for regional grocery stores purchasing by carton lots"
                  value={tierFormData.description || ''}
                  onChange={(e) => setTierFormData({ ...tierFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tierFormData.isDefault ?? false}
                      onChange={(e) => setTierFormData({ ...tierFormData, isDefault: e.target.checked })}
                      className="rounded border-slate-300 text-amber-800 focus:ring-amber-500"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold">Make Default Tier</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tierFormData.isActive ?? true}
                      onChange={(e) => setTierFormData({ ...tierFormData, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-amber-800 focus:ring-amber-500"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold">Active</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTierModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {editingTier ? 'Update Tier' : 'Save Tier'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PAYMENT TERM */}
      {/* ========================================================= */}
      {isTermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full my-6 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {editingTerm ? 'Edit Payment Term' : 'Create New Payment Term'}
                </h3>
              </div>
              <button
                onClick={() => setIsTermModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTerm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Term Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Net 45 Days (Extended Trade)"
                    value={termFormData.name || ''}
                    onChange={(e) => setTermFormData({ ...termFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Term Short Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Net 45"
                    value={termFormData.code || ''}
                    onChange={(e) => setTermFormData({ ...termFormData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Credit Period (Days) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    required
                    value={termFormData.days ?? 30}
                    onChange={(e) => setTermFormData({ ...termFormData, days: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">0 = Immediate settlement / COD</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Overdue Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={termFormData.gracePeriodDays ?? 5}
                    onChange={(e) =>
                      setTermFormData({ ...termFormData, gracePeriodDays: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Alerts trigger after due + grace</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Early Payment Discount (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={termFormData.earlyPaymentDiscountPct ?? 0}
                    onChange={(e) =>
                      setTermFormData({ ...termFormData, earlyPaymentDiscountPct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Within Days (Cash Discount Window)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={termFormData.earlyPaymentDays ?? 0}
                    onChange={(e) =>
                      setTermFormData({ ...termFormData, earlyPaymentDays: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Description & Commercial Policy
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard 45-day cycle with 2% discount if paid within 10 days"
                  value={termFormData.description || ''}
                  onChange={(e) => setTermFormData({ ...termFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termFormData.isDefault ?? false}
                      onChange={(e) => setTermFormData({ ...termFormData, isDefault: e.target.checked })}
                      className="rounded border-slate-300 text-amber-800 focus:ring-amber-500"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold">Default</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termFormData.requiresCreditApproval ?? false}
                      onChange={(e) => setTermFormData({ ...termFormData, requiresCreditApproval: e.target.checked })}
                      className="rounded border-slate-300 text-amber-800 focus:ring-amber-500"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold">Credit Approval</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termFormData.isActive ?? true}
                      onChange={(e) => setTermFormData({ ...termFormData, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-amber-800 focus:ring-amber-500"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold">Active</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTermModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-semibold shadow-sm"
                  >
                    {editingTerm ? 'Update Term' : 'Save Term'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Protected Tier Deletion Modal */}
      {deleteTargetTier && (
        <AdminDeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteTargetTier(null)}
          onConfirm={() => {
            handleDeleteTier(deleteTargetTier.id);
            setDeleteTargetTier(null);
          }}
          recordType="Pricing Tier"
          recordName={deleteTargetTier.name}
          recordDetails={`Tier Code: ${deleteTargetTier.code} · Discount: ${deleteTargetTier.discountPercentage}% · Margin: ${deleteTargetTier.targetMarginPct}%`}
          expectedPassword={adminDeletePassword}
          onChangePasswordRequested={() => setActiveTab('security')}
        />
      )}

      {/* Admin Protected Term Deletion Modal */}
      {deleteTargetTerm && (
        <AdminDeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteTargetTerm(null)}
          onConfirm={() => {
            handleDeleteTerm(deleteTargetTerm.id);
            setDeleteTargetTerm(null);
          }}
          recordType="Payment Term"
          recordName={deleteTargetTerm.name}
          recordDetails={`Credit Days: ${deleteTargetTerm.days} days · Grace Period: ${deleteTargetTerm.gracePeriodDays} days`}
          expectedPassword={adminDeletePassword}
          onChangePasswordRequested={() => setActiveTab('security')}
        />
      )}

      {/* Admin Protected Wipe Customers & Orders Modal */}
      {isWipeModalOpen && onWipeCustomersAndOrders && (
        <AdminDeleteConfirmModal
          isOpen={true}
          onClose={() => setIsWipeModalOpen(false)}
          onConfirm={() => {
            onWipeCustomersAndOrders();
            setIsWipeModalOpen(false);
          }}
          recordType="All Customer & Order Records"
          recordName="Entire Customer Base & Trade Invoices Catalog"
          recordDetails="This will reset customers and invoices to 0 so you can register your actual distributors and clients from scratch. The 15 spice products remain safe."
          expectedPassword={adminDeletePassword}
          onChangePasswordRequested={() => setActiveTab('security')}
        />
      )}
    </div>
  );
};
