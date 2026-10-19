import React from 'react';
import { UserProfile, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../data/initialData';
import { 
  Bell, 
  Plus, 
  ShieldCheck, 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  Layers, 
  Landmark,
  KeyRound,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeUser: UserProfile;
  users?: UserProfile[];
  onChangeUser: (userRole: UserRole) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenNewOrder: () => void;
  onOpenLoginModal?: () => void;
  onOpenChangePasswordModal?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeUser,
  users = [],
  onChangeUser,
  unreadCount,
  onOpenNotifications,
  onOpenNewOrder,
  onOpenLoginModal,
  onOpenChangePasswordModal,
  onSignOut,
}) => {
  const permissions = ROLE_PERMISSIONS[activeUser.role];

  const navLinks = [
    { id: 'dashboard', label: 'Overview', icon: Layers },
    { id: 'inventory', label: 'Spice Inventory', icon: Package },
    { id: 'orders', label: 'Orders & Invoices', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'users', label: 'Users & Access', icon: UserCheck },
    { id: 'reports', label: 'Performance', icon: BarChart3 },
    { id: 'accounting', label: 'Accounting Sync', icon: Landmark },
    { id: 'owner', label: 'Owner Panel', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Role & Auth Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Active User:</span>
          <strong className="text-white font-semibold">{activeUser.name}</strong>
          <span className="text-amber-300 capitalize">({activeUser.role.replace('_', ' ')})</span>
          <span className="text-slate-400 hidden sm:inline">· {activeUser.title}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {onOpenChangePasswordModal && (
            <button
              onClick={onOpenChangePasswordModal}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs transition-colors"
              title="Change your own account password"
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Change Password</span>
            </button>
          )}

          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-800 text-xs transition-colors font-medium"
              title="Switch to another user account"
            >
              <LogIn className="w-3 h-3 text-amber-300" />
              <span>Switch User</span>
            </button>
          )}

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs transition-colors font-semibold"
              title="Sign out of ERP system"
            >
              <LogOut className="w-3 h-3 text-rose-400" />
              <span>Sign Out</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-slate-400 hidden lg:inline">Role:</span>
            <select
              value={activeUser.role}
              onChange={(e) => onChangeUser(e.target.value as UserRole)}
              className="bg-slate-800 text-amber-300 border border-slate-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              {users.length > 0 ? (
                users.map((u) => (
                  <option key={u.id} value={u.role}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))
              ) : (
                <>
                  <option value="admin">Naween Samaranayaka (Admin / Owner)</option>
                  <option value="inventory_manager">Anura (Inventory Manager)</option>
                  <option value="sales_rep">Mangala Senarathna (Sales Rep)</option>
                  <option value="accountant">Anura Gunasekara (Accountant)</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-6 h-16">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="text-left group flex items-center gap-2.5 focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-800 flex items-center justify-center text-amber-200 font-bold text-base shadow-sm ring-1 ring-amber-700">
              NA
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block group-hover:text-amber-800 transition-colors">
                NA Distributors
              </span>
              <span className="text-[10px] text-amber-900 tracking-wider font-semibold block -mt-1 truncate max-w-[210px] sm:max-w-none">
                Distributor for Vista Essentials Food Pvt Ltd
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'text-amber-950 bg-amber-100/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-800' : 'text-slate-500'}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Buttons & Notification */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notification Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
            title="Notifications & Payment Reminders"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Primary Action Button */}
          {permissions.canCreateOrders ? (
            <button
              onClick={onOpenNewOrder}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-800 rounded-lg hover:bg-amber-900 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Order</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 whitespace-nowrap">
              View-Only Role
            </span>
          )}
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-200 gap-1">
        {navLinks.map((link) => {
          const isActive = currentTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setCurrentTab(link.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                isActive ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
