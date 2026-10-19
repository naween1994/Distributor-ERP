import React, { useState, useEffect } from 'react';
import { 
  Product, 
  Customer, 
  Order, 
  NotificationItem, 
  AccountingSyncRecord, 
  UserProfile, 
  UserRole, 
  PaymentStatus,
  PricingTier,
  PaymentTerm
} from './types';
import { StorageService } from './services/storage';
import { ROLE_PERMISSIONS, INITIAL_USERS } from './data/initialData';
import { AccountingService } from './services/accountingService';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { OrdersView } from './components/OrdersView';
import { ReportsView } from './components/ReportsView';
import { AccountingView } from './components/AccountingView';
import { OwnerPanelView } from './components/OwnerPanelView';
import { UserManagementView } from './components/UserManagementView';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { NotificationsModal } from './components/NotificationsModal';
import { PaymentReminderModal } from './components/PaymentReminderModal';
import { BarcodeScannerModal, ScannerMode } from './components/BarcodeScannerModal';
import { EmailAlertModal } from './components/EmailAlertModal';
import { MongoDBSyncModal } from './components/MongoDBSyncModal';
import { 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  Bell, 
  Mail, 
  RotateCcw, 
  ExternalLink,
  Database,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // Primary datasets initialized with persistence
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [orders, setOrders] = useState<Order[]>(() => StorageService.getOrders());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => StorageService.getNotifications());
  const [syncRecords, setSyncRecords] = useState<AccountingSyncRecord[]>(() => StorageService.getSyncRecords());
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(() => StorageService.getPricingTiers());
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(() => StorageService.getPaymentTerms());
  const [users, setUsers] = useState<UserProfile[]>(() => StorageService.getUsers());
  const [activeUser, setActiveUser] = useState<UserProfile>(() => StorageService.getActiveUser());
  const [adminDeletePassword, setAdminDeletePassword] = useState<string>(() => StorageService.getAdminDeletePassword());

  // Authentication gate: On load, website shows Login Panel until authorized
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('na_dist_auth_session') === 'true';
    } catch {
      return false;
    }
  });

  // Active View Tab
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modal Controls
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [selectedReminderOrder, setSelectedReminderOrder] = useState<Order | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('scan_stock');
  const [isEmailAlertOpen, setIsEmailAlertOpen] = useState(false);
  const [selectedNotificationForEmail, setSelectedNotificationForEmail] = useState<NotificationItem | null>(null);
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Real-time Toast Banner
  const [toastMessage, setToastMessage] = useState<{ title: string; text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const permissions = ROLE_PERMISSIONS[activeUser.role] || ROLE_PERMISSIONS.admin;

  // Auto-sync state to localStorage
  useEffect(() => {
    StorageService.saveProducts(products);
  }, [products]);

  useEffect(() => {
    StorageService.saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    StorageService.saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    StorageService.saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    StorageService.saveSyncRecords(syncRecords);
  }, [syncRecords]);

  useEffect(() => {
    StorageService.saveActiveUser(activeUser);
  }, [activeUser]);

  useEffect(() => {
    StorageService.saveUsers(users);
  }, [users]);

  useEffect(() => {
    StorageService.saveAdminDeletePassword(adminDeletePassword);
  }, [adminDeletePassword]);

  // Trigger Toast Notification helper
  const showToast = (title: string, text: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToastMessage({ title, text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Switch Active User / RBAC Persona
  const handleUserChange = (role: UserRole) => {
    const found = users.find((u) => u.role === role) || users[0] || INITIAL_USERS[0];
    setActiveUser(found);
    showToast('Role Switched', `Active Persona: ${found.name} (${found.title})`, 'info');
  };

  // 1. Order Creation with Real-time Stock Reduction & Notification Triggers
  const handleCreateOrder = (newOrder: Order) => {
    // 1. Reduce current stock for each product in order
    const updatedProducts = products.map((prod) => {
      const line = newOrder.items.find((item) => item.productId === prod.id);
      if (line) {
        const nextStock = Math.max(0, prod.currentStock - line.quantity);
        return {
          ...prod,
          currentStock: nextStock,
        };
      }
      return prod;
    });

    setProducts(updatedProducts);

    // 2. Add new order
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);

    // 3. Real-Time Notification: New Order Created
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newOrderNotif: NotificationItem = {
      id: `notif-${Date.now()}-ord`,
      type: 'new_order',
      title: `New Order Created: ${newOrder.invoiceNumber}`,
      message: `${newOrder.customerName} placed order for $${newOrder.totalAmount.toFixed(2)} (${newOrder.items.length} spice lots). Status: ${newOrder.paymentStatus}.`,
      orderId: newOrder.id,
      invoiceNumber: newOrder.invoiceNumber,
      customerId: newOrder.customerId,
      customerName: newOrder.customerName,
      amountDue: Math.max(0, newOrder.totalAmount - newOrder.paidAmount),
      timestamp,
      read: false,
      actionRequired: newOrder.paymentStatus !== 'Paid',
    };

    // 4. Check for low stock threshold breaches triggered by this order
    const newLowStockNotifs: NotificationItem[] = [];
    newOrder.items.forEach((item) => {
      const prod = updatedProducts.find((p) => p.id === item.productId);
      if (prod && prod.currentStock <= prod.reorderThreshold) {
        newLowStockNotifs.push({
          id: `notif-${Date.now()}-stock-${prod.id}`,
          type: 'low_stock',
          title: `Low Stock Alert: ${prod.name}`,
          message: `Stock level dropped to ${prod.currentStock} ${prod.unit} (below threshold of ${prod.reorderThreshold} ${prod.unit}). Immediate restock advised.`,
          productId: prod.id,
          timestamp,
          read: false,
          actionRequired: true,
        });
      }
    });

    const newNotifications = [newOrderNotif, ...newLowStockNotifs, ...notifications];
    setNotifications(newNotifications);

    showToast(
      'Order Confirmed & Stock Deducted',
      `Invoice ${newOrder.invoiceNumber} registered. ${newLowStockNotifs.length > 0 ? `${newLowStockNotifs.length} items reached low stock.` : ''}`,
      'success'
    );
  };

  // 2. Product Management
  const handleAddProduct = (newProd: Product) => {
    setProducts([newProd, ...products]);
    showToast('Product Added', `Spice lot ${newProd.name} (${newProd.sku}) catalogued.`, 'success');
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
    showToast('Product Updated', `${updated.name} details saved.`, 'info');
  };

  const handleAdjustStock = (productId: string, delta: number, note: string) => {
    const updatedProducts = products.map((p) => {
      if (p.id === productId) {
        const nextStock = Math.max(0, p.currentStock + delta);
        return {
          ...p,
          currentStock: nextStock,
        };
      }
      return p;
    });

    setProducts(updatedProducts);

    const targetProduct = products.find((p) => p.id === productId);
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (targetProduct) {
      const nextStock = Math.max(0, targetProduct.currentStock + delta);
      // If low stock resolved or triggered
      if (nextStock <= targetProduct.reorderThreshold) {
        const notif: NotificationItem = {
          id: `notif-${Date.now()}-adj`,
          type: 'low_stock',
          title: `Low Stock Alert: ${targetProduct.name}`,
          message: `Physical count adjusted to ${nextStock} ${targetProduct.unit}. Note: ${note}`,
          productId: targetProduct.id,
          timestamp,
          read: false,
          actionRequired: true,
        };
        setNotifications([notif, ...notifications]);
      }
    }

    showToast(
      'Stock Adjusted',
      `Inventory adjusted by ${delta > 0 ? '+' : ''}${delta}. Reason: ${note}`,
      'info'
    );
  };

  // 3. Customer Management
  const handleAddCustomer = (newCust: Customer) => {
    setCustomers([newCust, ...customers]);
    showToast('Customer Created', `${newCust.name} added to trade accounts.`, 'success');
  };

  const handleUpdateCustomer = (updated: Customer) => {
    setCustomers(customers.map((c) => (c.id === updated.id ? updated : c)));
    showToast('Customer Saved', `Account details for ${updated.name} updated.`, 'info');
  };

  // 4. Payment Status Update
  const handleUpdatePaymentStatus = (orderId: string, status: PaymentStatus, paidAmount: number) => {
    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus: status,
          paidAmount,
        };
      }
      return o;
    });
    setOrders(updatedOrders);

    if (selectedInvoiceOrder && selectedInvoiceOrder.id === orderId) {
      setSelectedInvoiceOrder({
        ...selectedInvoiceOrder,
        paymentStatus: status,
        paidAmount,
      });
    }

    showToast('Payment Recorded', `Order status updated to "${status}".`, 'success');
  };

  // 5. Payment Reminder Dispatch
  const handleSendPaymentReminder = (orderId: string, channel: 'email' | 'sms', customMessage: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const reminderNotif: NotificationItem = {
      id: `notif-${Date.now()}-rem`,
      type: 'payment_reminder',
      title: `Payment Reminder Sent: ${targetOrder.invoiceNumber}`,
      message: `Dispatched via ${channel.toUpperCase()} to ${targetOrder.customerName}. Note: ${customMessage.slice(0, 80)}...`,
      orderId: targetOrder.id,
      invoiceNumber: targetOrder.invoiceNumber,
      customerId: targetOrder.customerId,
      customerName: targetOrder.customerName,
      amountDue: Math.max(0, targetOrder.totalAmount - targetOrder.paidAmount),
      timestamp,
      read: false,
      emailDispatched: channel === 'email',
      emailRecipient: targetOrder.customerEmail,
    };

    setNotifications([reminderNotif, ...notifications]);
    showToast('Payment Reminder Sent', `Reminder sent via ${channel.toUpperCase()} to ${targetOrder.customerEmail}`, 'success');
  };

  // 6. Accounting Sync (QuickBooks & Xero)
  const handleSyncAccounting = (platform: 'QuickBooks' | 'Xero') => {
    const pendingOrders = orders.filter((o) =>
      platform === 'QuickBooks' ? o.quickbooksSyncStatus !== 'synced' : o.xeroSyncStatus !== 'synced'
    );

    const { updatedOrders, newRecords } = AccountingService.simulateSync(platform, orders);
    setOrders(updatedOrders);
    setSyncRecords([...newRecords, ...syncRecords]);

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const syncNotif: NotificationItem = {
      id: `notif-${Date.now()}-sync`,
      type: 'accounting_sync',
      title: `${platform} Ledger Sync Complete`,
      message: `Successfully synchronized ${pendingOrders.length} commercial invoice journals to ${platform}.`,
      timestamp,
      read: false,
    };
    setNotifications([syncNotif, ...notifications]);

    showToast(
      `${platform} Synced`,
      `Posted ${pendingOrders.length} invoices to chart of accounts.`,
      'success'
    );
  };

  // 7. Notification actions
  const handleSelectNotificationAction = (item: NotificationItem) => {
    if (item.type === 'payment_reminder' && item.orderId) {
      const ord = orders.find((o) => o.id === item.orderId);
      if (ord) {
        setSelectedReminderOrder(ord);
      }
    } else if (item.type === 'low_stock') {
      setCurrentTab('inventory');
    } else if (item.type === 'new_order' && item.orderId) {
      const ord = orders.find((o) => o.id === item.orderId);
      if (ord) {
        setSelectedInvoiceOrder(ord);
      }
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    showToast('Notifications Marked Read', 'All alerts updated.', 'info');
  };

  // 8. Email Alert Dispatch Confirmation
  const handleConfirmSendEmailAlert = (
    notificationId: string,
    recipient: string,
    subject: string,
    body: string
  ) => {
    setNotifications(
      notifications.map((n) =>
        n.id === notificationId
          ? { ...n, emailDispatched: true, emailRecipient: recipient, read: true }
          : n
      )
    );
    showToast('Email Alert Sent', `Dispatched notification to ${recipient}`, 'success');
  };

  // Pricing Tiers & Payment Terms Handlers
  const handleUpdatePricingTiers = async (updatedTiers: PricingTier[]) => {
    setPricingTiers(updatedTiers);
    StorageService.savePricingTiers(updatedTiers);
    try {
      await fetch('/api/settings/pricing-tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTiers),
      });
    } catch (err) {
      console.warn('Backend sync error:', err);
    }
    showToast('Pricing Tiers Updated', `Saved ${updatedTiers.length} customer pricing tiers.`, 'success');
  };

  const handleUpdatePaymentTerms = async (updatedTerms: PaymentTerm[]) => {
    setPaymentTerms(updatedTerms);
    StorageService.savePaymentTerms(updatedTerms);
    try {
      await fetch('/api/settings/payment-terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTerms),
      });
    } catch (err) {
      console.warn('Backend sync error:', err);
    }
    showToast('Payment Terms Updated', `Saved ${updatedTerms.length} commercial payment terms.`, 'success');
  };

  const handleResetOwnerDefaults = () => {
    const data = StorageService.resetToDefaults();
    setPricingTiers([...data.pricingTiers]);
    setPaymentTerms([...data.paymentTerms]);
    showToast('Trade Matrix Restored', 'Reverted pricing tiers and payment terms to Sri Lankan spice industry defaults.', 'info');
  };

  // Record Deletion Handlers (Admin Protected)
  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    showToast('Product Removed', 'Spice record deleted with admin password authorization.', 'warning');
  };

  const handleDeleteCustomer = (customerId: string) => {
    const updated = customers.filter((c) => c.id !== customerId);
    setCustomers(updated);
    showToast('Customer Removed', 'Customer record deleted with admin password authorization.', 'warning');
  };

  const handleDeleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    setOrders(updated);
    showToast('Invoice Removed', 'Commercial invoice record deleted with admin password authorization.', 'warning');
  };

  const handleWipeCustomersAndOrders = () => {
    setCustomers([]);
    setOrders([]);
    StorageService.wipeCustomersAndOrders();
    showToast('Records Cleared', 'All orders and customers have been removed. Ready to add from scratch.', 'success');
  };

  const handleUpdateAdminDeletePassword = (newPass: string) => {
    setAdminDeletePassword(newPass);
    StorageService.saveAdminDeletePassword(newPass);
    showToast('Deletion Password Updated', 'Admin Master Record Deletion Password updated successfully.', 'success');
  };

  // User Management Handlers
  const handleAddUser = (newUser: UserProfile) => {
    const updated = [...users, newUser];
    setUsers(updated);
    showToast('User Created', `Account created for ${newUser.name} (${newUser.role}).`, 'success');
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    const updated = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updated);
    if (activeUser.id === updatedUser.id) {
      setActiveUser(updatedUser);
    }
    showToast('User Updated', `Profile updated for ${updatedUser.name}.`, 'info');
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === activeUser.id) {
      showToast('Action Denied', 'You cannot delete the active currently signed-in user account.', 'warning');
      return;
    }
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    showToast('User Deleted', 'User account permanently removed.', 'warning');
  };

  const handlePasswordChanged = (updatedUser: UserProfile) => {
    handleUpdateUser(updatedUser);
    showToast('Password Changed', 'Your account password has been updated successfully.', 'success');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setActiveUser(user);
    StorageService.saveActiveUser(user);
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem('na_dist_auth_session', 'true');
    } catch (e) {
      console.warn(e);
    }
    showToast('Authorized Access', `Welcome, ${user.name}! Accessing system dashboard.`, 'success');
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('na_dist_auth_session');
    } catch (e) {
      console.warn(e);
    }
    showToast('Signed Out', 'You have been signed out from NA Distributors ERP.', 'info');
  };

  // Reset Demo Data
  const handleResetDemoData = () => {
    const data = StorageService.resetToDefaults();
    setProducts([...data.products]);
    setCustomers([...data.customers]);
    setOrders([...data.orders]);
    setNotifications([...data.notifications]);
    setSyncRecords([...data.syncRecords]);
    if (data.pricingTiers) setPricingTiers([...data.pricingTiers]);
    if (data.paymentTerms) setPaymentTerms([...data.paymentTerms]);
    if (data.users) setUsers([...data.users]);
    if (data.adminDeletePassword) setAdminDeletePassword(data.adminDeletePassword);
    showToast('Catalog Restored', 'Reset to initial 15 standard packet spices and default settings.', 'success');
  };

  // Unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Website Loading Gate: If not authorized, display the full-page Login Panel
  if (!isAuthenticated) {
    return (
      <div className="relative">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 transition-all animate-in fade-in duration-200">
            <div className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              {toastMessage.type === 'info' && <Bell className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-white">{toastMessage.title}</div>
              <div className="text-slate-300 mt-0.5 leading-relaxed">{toastMessage.text}</div>
            </div>
          </div>
        )}
        <LoginScreen
          users={users}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Real-time Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            {toastMessage.type === 'info' && <Bell className="w-4 h-4 text-amber-400" />}
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-white">{toastMessage.title}</div>
            <div className="text-slate-300 mt-0.5 leading-relaxed">{toastMessage.text}</div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeUser={activeUser}
        users={users}
        onChangeUser={handleUserChange}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenNewOrder={() => setIsCreateOrderOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Secondary Quick Action Bar (Barcode Scanner shortcut & Demo Reset) */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setScannerMode('scan_stock');
                setIsScannerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-semibold rounded-lg border border-amber-200 transition-colors"
              title="Scan Barcode or QR Code to update stock or add to order"
            >
              <Scan className="w-3.5 h-3.5 text-amber-800" />
              <span>Scan Barcode / QR Code</span>
            </button>

            <button
              onClick={() => setIsMongoModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 font-semibold rounded-lg border border-emerald-200 transition-colors"
              title="MERN Stack: MongoDB Atlas Sync & BSON Schema Hub"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>MongoDB Sync</span>
            </button>

            <button
              onClick={() => setCurrentTab('owner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                currentTab === 'owner'
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Configure Pricing Tiers, Dealer Margins, and Payment Terms"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
              <span>Owner Panel</span>
            </button>

            <button
              onClick={() => setCurrentTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                currentTab === 'users'
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Manage System Users & Credentials"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Users & Access</span>
            </button>

            <span className="text-slate-400 hidden md:inline">·</span>
            <span className="text-slate-500 hidden md:inline">
              Distributor for Vista Essentials Food Pvt Ltd
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDemoData}
              className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
              title="Reset all demo records"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            products={products}
            customers={customers}
            orders={orders}
            permissions={permissions}
            onNavigateTab={setCurrentTab}
            onOpenNewOrder={() => setIsCreateOrderOpen(true)}
            onOpenAddProduct={() => {
              setCurrentTab('inventory');
            }}
            onViewInvoice={(ord) => setSelectedInvoiceOrder(ord)}
            onOpenPaymentReminder={(ord) => setSelectedReminderOrder(ord)}
            onQuickRestock={(prod) => {
              handleAdjustStock(prod.id, 50, 'Quick Restock from Dashboard PO');
            }}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            products={products}
            permissions={permissions}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onAdjustStock={handleAdjustStock}
            onResetCatalog={handleResetDemoData}
            onDeleteProduct={handleDeleteProduct}
            adminDeletePassword={adminDeletePassword}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersView
            orders={orders}
            products={products}
            customers={customers}
            permissions={permissions}
            pricingTiers={pricingTiers}
            paymentTerms={paymentTerms}
            isCreateModalOpen={isCreateOrderOpen}
            setIsCreateModalOpen={setIsCreateOrderOpen}
            onCreateOrder={handleCreateOrder}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onViewInvoice={(ord) => setSelectedInvoiceOrder(ord)}
            onOpenPaymentReminder={(ord) => setSelectedReminderOrder(ord)}
            onDeleteOrder={handleDeleteOrder}
            adminDeletePassword={adminDeletePassword}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            orders={orders}
            permissions={permissions}
            pricingTiers={pricingTiers}
            paymentTerms={paymentTerms}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onViewOrderInvoice={(ord) => setSelectedInvoiceOrder(ord)}
            onDeleteCustomer={handleDeleteCustomer}
            adminDeletePassword={adminDeletePassword}
          />
        )}

        {currentTab === 'users' && (
          <UserManagementView
            users={users}
            activeUser={activeUser}
            permissions={permissions}
            adminDeletePassword={adminDeletePassword}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onChangeAdminDeletePasswordClick={() => setCurrentTab('owner')}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            products={products}
            customers={customers}
            orders={orders}
            permissions={permissions}
          />
        )}

        {currentTab === 'accounting' && (
          <AccountingView
            orders={orders}
            syncRecords={syncRecords}
            permissions={permissions}
            onSyncPlatform={handleSyncAccounting}
          />
        )}

        {currentTab === 'owner' && (
          <OwnerPanelView
            pricingTiers={pricingTiers}
            paymentTerms={paymentTerms}
            products={products}
            activeUser={activeUser}
            permissions={permissions}
            adminDeletePassword={adminDeletePassword}
            onUpdatePricingTiers={handleUpdatePricingTiers}
            onUpdatePaymentTerms={handleUpdatePaymentTerms}
            onResetDefaults={handleResetOwnerDefaults}
            onUpdateAdminDeletePassword={handleUpdateAdminDeletePassword}
            onWipeCustomersAndOrders={handleWipeCustomersAndOrders}
            onNavigateUsersTab={() => setCurrentTab('users')}
          />
        )}
      </main>

      {/* Commercial Invoice Modal */}
      {selectedInvoiceOrder && (
        <InvoiceDetailModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
          permissions={permissions}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
          onOpenPaymentReminder={(ord) => {
            setSelectedInvoiceOrder(null);
            setSelectedReminderOrder(ord);
          }}
          onSyncQuickBooks={() => handleSyncAccounting('QuickBooks')}
          onSyncXero={() => handleSyncAccounting('Xero')}
        />
      )}

      {/* Payment Reminder Modal */}
      {selectedReminderOrder && (
        <PaymentReminderModal
          order={selectedReminderOrder}
          onClose={() => setSelectedReminderOrder(null)}
          onSendReminder={handleSendPaymentReminder}
        />
      )}

      {/* Notifications Drawer Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onSelectNotificationAction={handleSelectNotificationAction}
      />

      {/* Barcode / QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        permissions={permissions}
        mode={scannerMode}
        onSelectProductForOrder={(product, quantity) => {
          setIsCreateOrderOpen(true);
          showToast('Product Scanned', `Selected ${quantity} ${product.unit} of ${product.name}`, 'info');
        }}
        onAdjustStockFromScan={(product, delta, note) => {
          handleAdjustStock(product.id, delta, note);
        }}
        onViewProductDetails={() => {
          setCurrentTab('inventory');
        }}
      />

      {/* Optional Email Alert Dispatch Modal */}
      {selectedNotificationForEmail && (
        <EmailAlertModal
          isOpen={isEmailAlertOpen}
          onClose={() => setIsEmailAlertOpen(false)}
          notification={selectedNotificationForEmail}
          onConfirmSendEmail={handleConfirmSendEmailAlert}
        />
      )}

      {/* MongoDB Atlas Sync & MERN Architecture Modal */}
      <MongoDBSyncModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
        products={products}
        customers={customers}
        orders={orders}
        onDataLoadedFromMongo={(data) => {
          if (data.products && data.products.length > 0) setProducts(data.products);
          if (data.customers && data.customers.length > 0) setCustomers(data.customers);
          if (data.orders && data.orders.length > 0) setOrders(data.orders);
          showToast('Database Hydrated', 'Synchronized live records from MongoDB.', 'success');
        }}
        onWipeAndReseedComplete={() => {
          handleResetDemoData();
          showToast('Database Reseeded', 'Deleted obsolete records and reseeded 15 spices and invoices.', 'success');
        }}
      />

      {/* Account Login / User Switch Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={users}
        activeUser={activeUser}
        adminDeletePassword={adminDeletePassword}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Change Password Modal for Authenticated Users */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        activeUser={activeUser}
        onPasswordChanged={handlePasswordChanged}
      />

      {/* Minimalistic, Anti-Slop Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">NA Distributors</span>
            <span aria-hidden="true">·</span>
            <span>Official Wholesale Distributor for Vista Essentials Food Pvt Ltd, Bandaragama</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Active Persona: <strong className="text-slate-800">{activeUser.name}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Role: <strong className="text-amber-800 capitalize">{activeUser.role.replace('_', ' ')}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
