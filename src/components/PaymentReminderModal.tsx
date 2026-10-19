import React, { useState } from 'react';
import { Order } from '../types';
import { Send, Mail, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';

interface PaymentReminderModalProps {
  order: Order | null;
  onClose: () => void;
  onSendReminder: (orderId: string, channel: 'email' | 'sms', customMessage: string) => void;
}

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  order,
  onClose,
  onSendReminder,
}) => {
  if (!order) return null;

  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [templateType, setTemplateType] = useState<'friendly' | 'urgent' | 'final'>('friendly');
  const balanceDue = Math.max(0, order.totalAmount - order.paidAmount);

  const getTemplateText = () => {
    if (channel === 'sms') {
      if (templateType === 'urgent') {
        return `URGENT: Saffron & Bark reminder. Invoice ${order.invoiceNumber} for $${balanceDue.toFixed(2)} is overdue. Please settle balance to prevent shipment suspension. Reply for wire details.`;
      }
      return `Hello ${order.customerName}, payment of $${balanceDue.toFixed(2)} for invoice ${order.invoiceNumber} is due on ${order.dueDate}. Wire ref: ${order.invoiceNumber}. Thank you, Saffron & Bark.`;
    }

    if (templateType === 'urgent') {
      return `Dear ${order.customerName},\n\nThis is an urgent notice that commercial invoice ${order.invoiceNumber} in the amount of $${balanceDue.toFixed(2)} was due on ${order.dueDate} and is now overdue.\n\nPlease arrange remittance immediately to avoid holds on your active spice allocations.\n\nInternational Wire Reference: ${order.invoiceNumber}\nBank: International Spice & Maritime Trust\n\nSincerely,\nElena Rostova\nManaging Director, Saffron & Bark Global Trading`;
    }

    return `Dear ${order.customerName},\n\nWe hope your recent harvest delivery is exceeding your culinary expectations.\n\nThis is a friendly courtesy reminder that invoice ${order.invoiceNumber} for $${balanceDue.toFixed(2)} is due on ${order.dueDate}. If remittance has already been initiated, please reply with the bank wire advice.\n\nThank you for partnering with Saffron & Bark.\n\nWarm regards,\nFinance & Accounts Team\nSaffron & Bark Spice Merchants`;
  };

  const [message, setMessage] = useState(getTemplateText());
  const [isSent, setIsSent] = useState(false);

  const handleTemplateChange = (type: 'friendly' | 'urgent' | 'final') => {
    setTemplateType(type);
    // update text
    if (channel === 'sms') {
      if (type === 'urgent') {
        setMessage(`URGENT: Saffron & Bark reminder. Invoice ${order.invoiceNumber} for $${balanceDue.toFixed(2)} is overdue. Please settle balance to prevent shipment suspension.`);
      } else {
        setMessage(`Hello ${order.customerName}, payment of $${balanceDue.toFixed(2)} for invoice ${order.invoiceNumber} is due on ${order.dueDate}. Wire ref: ${order.invoiceNumber}. Thank you.`);
      }
    } else {
      if (type === 'urgent') {
        setMessage(`Dear ${order.customerName},\n\nThis is an urgent notice that commercial invoice ${order.invoiceNumber} in the amount of $${balanceDue.toFixed(2)} was due on ${order.dueDate} and is now overdue.\n\nPlease arrange remittance immediately to avoid holds on your active spice allocations.\n\nInternational Wire Reference: ${order.invoiceNumber}\nBank: International Spice & Maritime Trust\n\nSincerely,\nElena Rostova\nManaging Director, Saffron & Bark Global Trading`);
      } else {
        setMessage(`Dear ${order.customerName},\n\nWe hope your recent harvest delivery is exceeding your culinary expectations.\n\nThis is a friendly courtesy reminder that invoice ${order.invoiceNumber} for $${balanceDue.toFixed(2)} is due on ${order.dueDate}. If remittance has already been initiated, please reply with the bank wire advice.\n\nThank you for partnering with Saffron & Bark.\n\nWarm regards,\nFinance & Accounts Team\nSaffron & Bark Spice Merchants`);
      }
    }
  };

  const handleSend = () => {
    onSendReminder(order.id, channel, message);
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Custom Payment Reminder System</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Invoice: {order.invoiceNumber} · Balance: ${balanceDue.toFixed(2)}
            </p>
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
            <h4 className="text-sm font-bold text-slate-900">Payment Reminder Dispatched!</h4>
            <p className="text-xs text-slate-500">
              Notification recorded to audit log and sent via {channel.toUpperCase()} to {order.customerEmail}.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4 text-xs">
            {/* Channel Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Delivery Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChannel('email');
                    handleTemplateChange(templateType);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors ${
                    channel === 'email'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Notice ({order.customerEmail})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChannel('sms');
                    handleTemplateChange(templateType);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors ${
                    channel === 'sms'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>SMS Mobile Alert</span>
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tone & Urgency</label>
              <div className="flex items-center gap-1.5">
                {(['friendly', 'urgent'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTemplateChange(type)}
                    className={`px-3 py-1 rounded capitalize text-xs border transition-colors ${
                      templateType === type
                        ? 'bg-slate-900 text-white border-slate-900 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Customizable Message Body
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px] leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 space-y-0.5">
              <div className="font-semibold">Automated Notification Cadence:</div>
              <div>System automatically schedules follow-up 3 days prior to due date & 7 days overdue.</div>
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
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reminder Now</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
