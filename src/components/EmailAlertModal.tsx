import React, { useState } from 'react';
import { NotificationItem } from '../types';
import { Mail, CheckCircle2, Send, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface EmailAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: NotificationItem | null;
  onConfirmSendEmail: (notificationId: string, recipient: string, subject: string, body: string) => void;
}

export const EmailAlertModal: React.FC<EmailAlertModalProps> = ({
  isOpen,
  onClose,
  notification,
  onConfirmSendEmail,
}) => {
  if (!isOpen || !notification) return null;

  const defaultRecipient =
    notification.type === 'payment_reminder'
      ? notification.customerName
        ? `${notification.customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`
        : 'customer-billing@example.com'
      : notification.type === 'low_stock'
      ? 'warehouse.lead@saffronbark.com'
      : 'sales.ops@saffronbark.com';

  const defaultSubject = `[Saffron & Bark Alert] ${notification.title}`;
  const defaultBody = `Hello Team,\n\nThis is an automated system notification regarding:\n\n${notification.title}\n${notification.message}\n\nTimestamp: ${notification.timestamp}\nReference ID: ${notification.orderId || notification.productId || 'N/A'}\n\nPlease take appropriate action in the Saffron & Bark ERP dashboard.\n\nBest regards,\nAutomated ERP Dispatcher\nSaffron & Bark Spice Merchants`;

  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      onConfirmSendEmail(notification.id, recipient, subject, body);
      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        onClose();
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Alert Notification</h3>
              <p className="text-xs text-slate-500">Send instant SMTP dispatch for critical event</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            ✕
          </button>
        </div>

        {isSent ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Email Alert Successfully Dispatched</h4>
            <p className="text-xs text-slate-500 font-mono">
              Sent to: {recipient}
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Email Address</label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Body</label>
              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px] leading-relaxed"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending Alert...' : 'Dispatch Email Alert'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
