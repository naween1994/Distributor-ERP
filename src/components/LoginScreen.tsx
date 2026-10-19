import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  ShieldCheck, 
  LogIn,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';

interface LoginScreenProps {
  users: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedIdent = identifier.trim().toLowerCase();
    if (!trimmedIdent) {
      setErrorMessage('Please enter your email or username.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsAuthenticating(true);

    setTimeout(() => {
      const matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === trimmedIdent ||
          u.name.toLowerCase() === trimmedIdent ||
          u.id.toLowerCase() === trimmedIdent
      );

      if (!matchedUser) {
        setIsAuthenticating(false);
        setErrorMessage('Invalid credentials. No user account found with that email or name.');
        return;
      }

      const expectedPass = matchedUser.password || 'Vista@2026';
      if (password !== expectedPass) {
        setIsAuthenticating(false);
        setErrorMessage('Incorrect password. Authorization denied.');
        return;
      }

      setIsAuthenticating(false);
      onLoginSuccess(matchedUser);
    }, 300);
  };

  const handleSelectAccountToFill = (user: UserProfile) => {
    setIdentifier(user.email);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-stone-900 to-amber-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-white selection:bg-amber-500 selection:text-white">
      {/* Top Brand Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-1 ring-amber-400/30">
            NA
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">
              NA Distributors
            </span>
            <span className="text-[11px] text-amber-300 font-medium block -mt-0.5">
              Distributor for Vista Essentials Food Pvt Ltd
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-amber-200/80 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Authorized Access Only</span>
        </div>
      </div>

      {/* Main Centered Login Box */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-slate-950 p-6 sm:p-7 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-600 text-white font-bold text-2xl shadow-xl ring-2 ring-amber-400/40 mb-3">
              NA
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              NA Distributors
            </h1>
            <p className="text-xs text-amber-200/90 font-medium mt-1">
              Vista Essentials Food Pvt Ltd • Bandaragama
            </p>
            <p className="text-[11px] text-slate-300 mt-2">
              Commercial Spice Inventory & Sales Distribution ERP
            </p>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-7 space-y-5">
            <div className="text-center">
              <h2 className="text-base font-bold text-slate-900">
                Sign In to Your Account
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your registered credentials to access the system
              </p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Email or Username</span>
                  <span className="text-[11px] text-slate-400 font-normal">Required</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="e.g. naweensamaranayake@gmail.com"
                    className="w-full text-xs px-3.5 py-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Account Password</span>
                  <span className="text-[11px] text-slate-400 font-normal">Required</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your password"
                    className="w-full text-xs px-3.5 py-3 pl-10 pr-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 active:bg-amber-950 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isAuthenticating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Authorization...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to ERP System</span>
                  </span>
                )}
              </button>
            </form>

            {/* Registered Users Quick Select (Without Passwords) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Select Account to Autofill Email:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {users.map((u) => {
                  const isSelected = identifier.toLowerCase() === u.email.toLowerCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectAccountToFill(u)}
                      className={`text-left p-2 rounded-lg border text-[11px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize truncate">
                        {u.role.replace('_', ' ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer inside card */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-[11px] text-slate-500">
            <span className="flex items-center justify-center gap-1.5 font-medium">
              <PackageCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Vista Essentials Food Products • Certified Distribution Platform</span>
            </span>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="max-w-6xl w-full mx-auto text-center py-2 text-xs text-slate-400">
        <span>© {new Date().getFullYear()} NA Distributors • All rights reserved</span>
      </div>
    </div>
  );
};
