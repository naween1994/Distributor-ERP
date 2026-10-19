import React, { useState } from 'react';
import { ShieldAlert, Lock, AlertTriangle, Eye, EyeOff, Trash2, KeyRound } from 'lucide-react';

interface AdminDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordType: string; // e.g. "Product", "Customer", "Invoice / Order", "Pricing Tier", "Payment Term", "User Account"
  recordName: string; // e.g. "Chilli Powder 100g", "INV-2026-0041"
  recordDetails?: string;
  expectedPassword?: string;
  onChangePasswordRequested?: () => void;
}

export const AdminDeleteConfirmModal: React.FC<AdminDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recordType,
  recordName,
  recordDetails,
  expectedPassword = 'Vista',
  onChangePasswordRequested,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMessage('Please enter the Admin Master Deletion Password.');
      return;
    }

    if (passwordInput !== expectedPassword) {
      setErrorMessage('Incorrect security password. Access denied.');
      return;
    }

    // Success
    setPasswordInput('');
    setErrorMessage('');
    onConfirm();
    onClose();
  };

  const handleClose = () => {
    setPasswordInput('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-rose-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 p-5 text-white flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-white/10 ring-1 ring-white/20 shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-200" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">Admin Deletion Protection</h3>
            <p className="text-xs text-rose-100/90 mt-0.5">Authorization password required to remove record</p>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Record Card */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5">
            <div className="text-[11px] uppercase tracking-wider font-bold text-rose-700">
              Target {recordType}
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 break-words">
              {recordName}
            </div>
            {recordDetails && (
              <div className="text-xs text-slate-600 mt-1">
                {recordDetails}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-rose-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Permanent action: This item will be removed immediately.</span>
            </div>
          </div>

          {/* Password Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Admin Security Password
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Security Authorization Required
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoFocus
                placeholder="Enter admin deletion password"
                className={`w-full text-sm px-3.5 py-2.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 transition-all font-mono ${
                  errorMessage
                    ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:border-rose-500 focus:ring-rose-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMessage && (
              <div className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Admin Note & Change Password Shortcut */}
          <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Admin only authorization</span>
            {onChangePasswordRequested && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onChangePasswordRequested();
                }}
                className="text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 transition-colors"
              >
                <KeyRound className="w-3 h-3" />
                Change Deletion Password
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm & Delete</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
