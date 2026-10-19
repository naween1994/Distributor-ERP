import { 
  Product, 
  Customer, 
  Order, 
  NotificationItem, 
  AccountingSyncRecord, 
  UserProfile, 
  UserRole,
  PricingTier,
  PaymentTerm
} from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_ORDERS, 
  INITIAL_USERS, 
  INITIAL_SYNC_RECORDS,
  INITIAL_PRICING_TIERS,
  INITIAL_PAYMENT_TERMS,
  DEFAULT_ADMIN_DELETE_PASSWORD
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'na_distributors_products_v5',
  CUSTOMERS: 'na_distributors_customers_v5',
  ORDERS: 'na_distributors_orders_v5',
  USERS: 'na_distributors_users_v5',
  ACTIVE_USER: 'na_distributors_active_user_v5',
  NOTIFICATIONS: 'na_distributors_notifications_v5',
  SYNC_RECORDS: 'na_distributors_sync_records_v5',
  INVOICE_COUNTER: 'na_distributors_inv_seq_v5',
  PRICING_TIERS: 'na_distributors_pricing_tiers_v5',
  PAYMENT_TERMS: 'na_distributors_payment_terms_v5',
  ADMIN_DELETE_PASSWORD: 'na_distributors_admin_del_pwd_v5',
};

export const getInitialNotifications = (): NotificationItem[] => [
  {
    id: 'notif-welcome',
    type: 'order_status',
    title: 'NA Distributors ERP Ready',
    message: 'Loaded with 15 standard packet spices manufactured by Vista Essentials Food Pvt Ltd, Bandaragama. Customer and order catalog ready for fresh entries.',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    read: false,
    actionRequired: false,
  },
];

export const StorageService = {
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) return INITIAL_PRODUCTS;
      const parsed: Product[] = JSON.parse(data);
      // Synchronize exact batchCost and costPrice with initial definitions to guarantee cent precision
      return parsed.map((p) => {
        const init = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
        if (init) {
          return {
            ...p,
            batchCost: init.batchCost,
            costPrice: init.costPrice,
          };
        }
        return p;
      });
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts(products: Product[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  },

  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  },

  saveOrders(orders: Order[]): void {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  getNotifications(): NotificationItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : getInitialNotifications();
    } catch {
      return getInitialNotifications();
    }
  },

  saveNotifications(notifications: NotificationItem[]): void {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  getSyncRecords(): AccountingSyncRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_RECORDS);
      return data ? JSON.parse(data) : INITIAL_SYNC_RECORDS;
    } catch {
      return INITIAL_SYNC_RECORDS;
    }
  },

  saveSyncRecords(records: AccountingSyncRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.SYNC_RECORDS, JSON.stringify(records));
  },

  getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: UserProfile[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getActiveUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      return data ? JSON.parse(data) : INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  },

  saveActiveUser(user: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
  },

  getAdminDeletePassword(): string {
    try {
      const pwd = localStorage.getItem(STORAGE_KEYS.ADMIN_DELETE_PASSWORD);
      return pwd ? pwd : DEFAULT_ADMIN_DELETE_PASSWORD;
    } catch {
      return DEFAULT_ADMIN_DELETE_PASSWORD;
    }
  },

  saveAdminDeletePassword(password: string): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_DELETE_PASSWORD, password);
  },

  getNextInvoiceNumber(orders: Order[]): string {
    const currentYear = new Date().getFullYear();
    const highestNum = orders.reduce((max, o) => {
      const match = o.invoiceNumber.match(/INV-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextSeq = String(highestNum + 1).padStart(4, '0');
    return `INV-${currentYear}-${nextSeq}`;
  },

  getPricingTiers(): PricingTier[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRICING_TIERS);
      return data ? JSON.parse(data) : INITIAL_PRICING_TIERS;
    } catch {
      return INITIAL_PRICING_TIERS;
    }
  },

  savePricingTiers(tiers: PricingTier[]): void {
    localStorage.setItem(STORAGE_KEYS.PRICING_TIERS, JSON.stringify(tiers));
  },

  getPaymentTerms(): PaymentTerm[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENT_TERMS);
      return data ? JSON.parse(data) : INITIAL_PAYMENT_TERMS;
    } catch {
      return INITIAL_PAYMENT_TERMS;
    }
  },

  savePaymentTerms(terms: PaymentTerm[]): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_TERMS, JSON.stringify(terms));
  },

  wipeCustomersAndOrders(): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SYNC_RECORDS, JSON.stringify([]));
  },

  resetDemo(): void {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.SYNC_RECORDS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    localStorage.removeItem(STORAGE_KEYS.PRICING_TIERS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_TERMS);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_DELETE_PASSWORD);
  },

  resetToDefaults() {
    this.resetDemo();
    this.saveProducts(INITIAL_PRODUCTS);
    this.saveCustomers(INITIAL_CUSTOMERS);
    this.saveOrders(INITIAL_ORDERS);
    this.saveNotifications(getInitialNotifications());
    this.saveSyncRecords(INITIAL_SYNC_RECORDS);
    this.saveUsers(INITIAL_USERS);
    this.savePricingTiers(INITIAL_PRICING_TIERS);
    this.savePaymentTerms(INITIAL_PAYMENT_TERMS);
    this.saveAdminDeletePassword(DEFAULT_ADMIN_DELETE_PASSWORD);
    return {
      products: INITIAL_PRODUCTS,
      customers: INITIAL_CUSTOMERS,
      orders: INITIAL_ORDERS,
      notifications: getInitialNotifications(),
      syncRecords: INITIAL_SYNC_RECORDS,
      users: INITIAL_USERS,
      pricingTiers: INITIAL_PRICING_TIERS,
      paymentTerms: INITIAL_PAYMENT_TERMS,
      adminDeletePassword: DEFAULT_ADMIN_DELETE_PASSWORD,
    };
  },
};
