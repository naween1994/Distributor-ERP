import React from 'react';
import { NotificationItem, Order, Product } from '../types';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Send, 
  Check, 
  CheckCheck, 
  Package, 
  Landmark, 
  X 
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onSelectNotificationAction: (item: NotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectNotificationAction,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white h-full max-w-md w-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold text-slate-900">Notification & Alert Center</h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-600 text-white rounded-full font-mono">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-amber-800 hover:text-amber-900 font-medium flex items-center gap-1"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>No notifications at this time.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isPayment = item.type === 'payment_reminder';
              const isLowStock = item.type === 'low_stock';
              const isAccounting = item.type === 'accounting_sync';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border text-xs transition-all ${
                    !item.read
                      ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isPayment
                          ? 'bg-rose-100 text-rose-700'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isPayment && <Clock className="w-3.5 h-3.5" />}
                      {isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                      {isAccounting && <Landmark className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-slate-900 truncate">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {item.timestamp.slice(11, 16)}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">{item.message}</p>

                      {item.actionRequired && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-amber-800 font-medium uppercase tracking-wider">
                            Action Required
                          </span>
                          <button
                            onClick={() => {
                              onSelectNotificationAction(item);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-amber-800 hover:bg-amber-900 text-white rounded transition-colors inline-flex items-center gap-1"
                          >
                            {isPayment ? (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Send Reminder</span>
                              </>
                            ) : (
                              <>
                                <Package className="w-3 h-3" />
                                <span>Restock Lot</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500">
          Automated rule checks run continuously on order due dates and stock inventory.
        </div>
      </div>
    </div>
  );
};
