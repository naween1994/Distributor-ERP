import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  Building2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  UserCheck, 
  Key, 
  LogIn,
  KeyRound,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  activeUser: UserProfile;
  adminDeletePassword: string;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  activeUser,
  adminDeletePassword,
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedIdent = identifier.trim().toLowerCase();
    const matchedUser = users.find(
      (u) =>
        u.email.toLowerCase() === trimmedIdent ||
        u.name.toLowerCase() === trimmedIdent ||
        u.id.toLowerCase() === trimmedIdent
    );

    if (!matchedUser) {
      setErrorMessage('No user account found with that email or name.');
      return;
    }

    const expectedPass = matchedUser.password || 'Vista@2026';
    if (password !== expectedPass) {
      setErrorMessage(`Incorrect password for ${matchedUser.name}.`);
      return;
    }

    onLoginSuccess(matchedUser);
    setIdentifier('');
    setPassword('');
    onClose();
  };

  const handleQuickLogin = (user: UserProfile) => {
    onLoginSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-slate-900 text-white p-6 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                NA
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">NA Distributors</h2>
                <p className="text-xs text-amber-200/90 font-medium">
                  Authorized Distributor for Vista Essentials Food Pvt Ltd, Bandaragama
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-sm"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Current Signed-in User: <strong className="text-white">{activeUser.name}</strong> ({activeUser.role.replace('_', ' ')})</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Sign In Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <LogIn className="w-4 h-4 text-amber-800" />
                <span>Account Login Panel</span>
              </h3>
              <span className="text-xs text-slate-500">Sign in with registered credentials</span>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email or User Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="e.g. naweensamaranayake@gmail.com"
                    className="w-full text-xs px-3.5 py-2.5 pl-9 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter user password"
                    className="w-full text-xs px-3.5 py-2.5 pl-9 pr-9 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Account</span>
              </button>
            </div>
          </form>

          {/* Existing User Accounts Directory (Without Passwords) */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-600" />
                <span>Registered Team Accounts ({users.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500">Select to autofill email</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.map((u) => {
                const isCurrent = activeUser.id === u.id;
                return (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-xl border text-xs transition-all ${
                      isCurrent
                        ? 'bg-amber-50/70 border-amber-300 shadow-xs ring-1 ring-amber-300/50'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{u.name}</span>
                          {isCurrent && (
                            <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] truncate mt-0.5">{u.title}</div>
                        <div className="text-slate-600 text-[11px] font-mono truncate mt-0.5">{u.email}</div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'inventory_manager'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'sales_rep'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Account verified</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIdentifier(u.email);
                          setErrorMessage('');
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-amber-900 bg-white hover:bg-amber-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Select User</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>NA Distributors • Vista Essentials Food Pvt Ltd</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
