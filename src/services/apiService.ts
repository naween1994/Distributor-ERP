import { Product, Customer, Order, PaymentStatus, UserProfile, PricingTier, PaymentTerm } from '../types';

export interface ServerHealth {
  status: string;
  server: string;
  database: string;
  isMongoConnected: boolean;
  isMongoUriConfigured: boolean;
  dbName: string;
  mongoStats?: {
    collections: string[];
    counts?: { products: number; customers: number; orders: number };
  } | null;
  timestamp: string;
}

/**
 * ApiService
 * Handles seamless real-time synchronization between the React client and the Express backend / MongoDB Atlas.
 * When MongoDB is connected, all creates, updates, stock adjustments, and deletes persist immediately to MongoDB.
 */
export const ApiService = {
  async getHealth(): Promise<ServerHealth | null> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async createProduct(product: Product): Promise<void> {
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
    } catch (err) {
      console.warn('Backend sync error (createProduct):', err);
    }
  },

  async updateProduct(product: Product): Promise<void> {
    try {
      await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
    } catch (err) {
      console.warn('Backend sync error (updateProduct):', err);
    }
  },

  async adjustStock(productId: string, delta: number, note: string): Promise<void> {
    try {
      await fetch(`/api/products/${encodeURIComponent(productId)}/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, note }),
      });
    } catch (err) {
      console.warn('Backend sync error (adjustStock):', err);
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    try {
      await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Backend sync error (deleteProduct):', err);
    }
  },

  async createCustomer(customer: Customer): Promise<void> {
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
    } catch (err) {
      console.warn('Backend sync error (createCustomer):', err);
    }
  },

  async updateCustomer(customer: Customer): Promise<void> {
    try {
      await fetch(`/api/customers/${encodeURIComponent(customer.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
    } catch (err) {
      console.warn('Backend sync error (updateCustomer):', err);
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Backend sync error (deleteCustomer):', err);
    }
  },

  async createOrder(order: Order): Promise<void> {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch (err) {
      console.warn('Backend sync error (createOrder):', err);
    }
  },

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, paidAmount: number): Promise<void> {
    try {
      await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus, paidAmount }),
      });
    } catch (err) {
      console.warn('Backend sync error (updatePaymentStatus):', err);
    }
  },

  async deleteOrder(orderId: string): Promise<void> {
    try {
      await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Backend sync error (deleteOrder):', err);
    }
  },

  async createUser(user: UserProfile): Promise<void> {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
    } catch (err) {
      console.warn('Backend sync error (createUser):', err);
    }
  },

  async updateUser(user: UserProfile): Promise<void> {
    try {
      await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
    } catch (err) {
      console.warn('Backend sync error (updateUser):', err);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Backend sync error (deleteUser):', err);
    }
  },

  async updatePricingTiers(tiers: PricingTier[]): Promise<void> {
    try {
      await fetch('/api/settings/pricing-tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tiers),
      });
    } catch (err) {
      console.warn('Backend sync error (updatePricingTiers):', err);
    }
  },

  async updatePaymentTerms(terms: PaymentTerm[]): Promise<void> {
    try {
      await fetch('/api/settings/payment-terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terms),
      });
    } catch (err) {
      console.warn('Backend sync error (updatePaymentTerms):', err);
    }
  },

  async updateAdminDeletePassword(password: string): Promise<void> {
    try {
      await fetch('/api/settings/delete-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
    } catch (err) {
      console.warn('Backend sync error (updateAdminDeletePassword):', err);
    }
  },

  async wipeCustomersAndOrders(password: string): Promise<boolean> {
    try {
      const res = await fetch('/api/settings/wipe-customers-and-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend sync error (wipeCustomersAndOrders):', err);
      return false;
    }
  },

  async syncAllToMongoDB(
    action: 'push' | 'wipe_and_push',
    data: { products?: Product[]; customers?: Customer[]; orders?: Order[] }
  ): Promise<any> {
    const res = await fetch('/api/mongodb/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    return await res.json();
  },
};
