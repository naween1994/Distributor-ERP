import React, { useState } from 'react';
import { UserProfile, UserRole, RolePermissions } from '../types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Briefcase, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

interface UserManagementViewProps {
  users: UserProfile[];
  activeUser: UserProfile;
  permissions: RolePermissions;
  adminDeletePassword: string;
  onAddUser: (newUser: UserProfile) => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onChangeAdminDeletePasswordClick?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  activeUser,
  permissions,
  adminDeletePassword,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onChangeAdminDeletePasswordClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<UserProfile | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Delete modal state
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserProfile | null>(null);

  // Add Form state
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    title: string;
    password: string;
    phone: string;
  }>({
    name: '',
    email: '',
    role: 'sales_rep',
    title: '',
    password: '',
    phone: '',
  });

  const [showFormPassword, setShowFormPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = activeUser.role === 'admin';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      role: 'sales_rep',
      title: 'Wholesale Field Sales Rep',
      password: 'User@2026',
      phone: '+94 77 ',
    });
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMsg('Name and email are required.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === formData.email.trim().toLowerCase())) {
      setErrorMsg('A user with this email address already exists.');
      return;
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      title: formData.title.trim() || `${formData.role.replace('_', ' ')} specialist`,
      password: formData.password.trim() || 'User@2026',
      phone: formData.phone.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onAddUser(newUser);
    setIsAddModalOpen(false);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    onUpdateUser(editingUser);
    setEditingUser(null);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingPasswordUser || !newResetPassword.trim()) return;
    onUpdateUser({
      ...resettingPasswordUser,
      password: newResetPassword.trim(),
    });
    setResettingPasswordUser(null);
    setNewResetPassword('');
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">User Accounts & Access Control</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {users.length} Users
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage system operators for NA Distributors. Team members can log in and change their passwords.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Admin rights required to add users
            </span>
          )}
        </div>
      </div>

      {/* Admin Security Password Status Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Admin Record Deletion Master Password:</span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-300 font-mono text-slate-700 font-medium text-xs">
                •••••••• (Configured & Secured)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Protects deletion of products, customers, invoices, pricing tiers, payment terms, and user accounts.
            </p>
          </div>
        </div>

        {onChangeAdminDeletePasswordClick && (
          <button
            onClick={onChangeAdminDeletePasswordClick}
            className="px-3.5 py-1.5 text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Deletion Password</span>
          </button>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredUsers.map((u) => {
          const isCurrentUser = activeUser.id === u.id;
          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                isCurrentUser ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{u.name}</h3>
                      {isCurrentUser && (
                        <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{u.title}</div>
                    <div className="text-xs text-slate-600 font-mono mt-0.5">{u.email}</div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    u.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : u.role === 'inventory_manager'
                      ? 'bg-blue-100 text-blue-800'
                      : u.role === 'sales_rep'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {u.role.replace('_', ' ')}
                </span>
              </div>

              {/* Password Status Box (Masked) */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-500 font-medium">Account Credentials:</span>
                  <span className="text-slate-700 font-mono font-medium">•••••••• (Protected)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {u.createdAt ? `Joined ${u.createdAt}` : 'Active'}
                </span>
              </div>

              {/* Action Buttons */}
              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setResettingPasswordUser(u);
                        setNewResetPassword('');
                      }}
                      className="px-2.5 py-1 text-amber-900 hover:bg-amber-100/70 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset Password</span>
                    </button>
                  </div>

                  {!isCurrentUser && (
                    <button
                      onClick={() => setDeleteTargetUser(u)}
                      className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      title="Delete User with Master Password"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Add System User</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kasun Fernando"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. kasun@nadistributors.lk"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    System Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="admin">Admin (Full Control)</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="sales_rep">Sales Representative</option>
                    <option value="accountant">Accountant / Controller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+94 77 ..."
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Regional Dealer Coordinator"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password *
                </label>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full text-xs px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Edit User Details</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="sales_rep">Sales Representative</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={editingUser.title}
                  onChange={(e) => setEditingUser({ ...editingUser, title: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Admin Password Reset</h3>
              </div>
              <button onClick={() => setResettingPasswordUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Set a new password for <strong className="text-slate-900">{resettingPasswordUser.name}</strong> ({resettingPasswordUser.email}).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setResettingPasswordUser(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Protected by Master Deletion Password */}
      {deleteTargetUser && (
        <AdminDeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteTargetUser(null)}
          onConfirm={() => {
            onDeleteUser(deleteTargetUser.id);
            setDeleteTargetUser(null);
          }}
          recordType="User Account"
          recordName={deleteTargetUser.name}
          recordDetails={`Email: ${deleteTargetUser.email} | Role: ${deleteTargetUser.role.replace('_', ' ')}`}
          expectedPassword={adminDeletePassword}
          onChangePasswordRequested={onChangeAdminDeletePasswordClick}
        />
      )}
    </div>
  );
};
