export type CustomerTier = 'retail' | 'wholesale' | 'distributor' | string;

export type PaymentTermsType = 'Immediate' | 'Net 7' | 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'Advance 50%' | string;

export interface PricingTier {
  id: string;
  name: string;
  code: string; // e.g. 'wholesale', 'distributor', 'retail', 'horeca', 'super_stockist'
  discountPercentage: number; // Discount from retail price (MRP) in %
  markupPercentage?: number; // Markup over cost in %
  pricingBasis: 'discount_from_mrp' | 'cost_plus_markup' | 'fixed_tier_rate';
  dealerCommissionPct?: number; // Dealer / Rep commission %
  targetMarginPct?: number; // Target buyer/retailer margin %
  minimumOrderValue?: number; // In LKR (Rs.)
  minimumOrderPackets?: number; // In packets
  description: string;
  isDefault?: boolean;
  isActive: boolean;
  colorBadge?: string;
}

export interface PaymentTerm {
  id: string;
  name: string;
  code: string; // e.g. 'Immediate', 'Net 7', 'Net 15', 'Net 30', 'Net 60'
  days: number; // Days until invoice due
  gracePeriodDays: number; // Days after due date before overdue notice
  earlyPaymentDiscountPct?: number; // e.g. 2% for early settlement
  earlyPaymentDays?: number; // e.g. within 10 days
  requiresCreditApproval?: boolean;
  description: string;
  isDefault?: boolean;
  isActive: boolean;
}

export type SpiceUnit = '100g' | '50g' | '25g' | 'packet' | 'kg' | 'sack_25kg' | 'jar_500g' | 'box_10kg' | string;

export interface Product {
  id: string;
  sku: string;
  barcode: string; // 12 or 13 digit EAN/UPC or alphanumeric Code 128
  name: string;
  category: 'Powder' | 'Flakes' | 'Whole' | 'Ground' | 'Seeds' | string;
  skuSize: string; // e.g. 100g, 50g, 25g
  unit: SpiceUnit;
  initialStock: number; // Number of packets
  currentStock: number; // Current packets in stock
  reorderThreshold: number;
  costPrice: number; // Cost per packet (LKR)
  retailPrice: number; // MRP (LKR)
  wholesalePrice: number; // Retailer Price (LKR)
  distributorPrice: number; // Distributor Selling Price (LKR)
  retailerMarginPct?: number; // Retailer Margin %
  dealerCommission?: number; // Dealer Comm (10%) (LKR)
  distributorMarginPct?: number; // Distributor Percentage %
  batchCost?: number; // Total distributor batch cost (LKR)
  batchNumber: string;
  harvestDate: string;
  botanicalName?: string;
  origin?: string;
  grade?: string;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  taxId: string;
  reference: string;
  tier: CustomerTier;
  creditLimit: number;
  paymentTerms: PaymentTermsType;
  notes: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  unit: SpiceUnit;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
}

export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue';
export type PaymentMethod = 'Bank Transfer' | 'Credit Card' | 'Cash' | 'Cheque' | 'Letter of Credit';
export type OrderStatus = 'Completed' | 'Processing' | 'Dispatched' | 'Cancelled';

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerTier: CustomerTier;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  orderDate: string;
  dueDate: string;
  items: OrderItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxRate: number; // 0% or 5% etc
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  notes?: string;
  quickbooksSyncStatus?: 'synced' | 'pending' | 'failed';
  xeroSyncStatus?: 'synced' | 'pending' | 'failed';
}

export interface NotificationItem {
  id: string;
  type: 'payment_reminder' | 'low_stock' | 'order_status' | 'accounting_sync' | 'new_order';
  title: string;
  message: string;
  orderId?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  productId?: string;
  amountDue?: number;
  timestamp: string;
  read: boolean;
  actionRequired?: boolean;
  emailDispatched?: boolean;
  emailRecipient?: string;
}

export interface EmailAlertLog {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  type: 'low_stock' | 'new_order' | 'payment_reminder';
  status: 'Sent' | 'Failed';
  preview: string;
}

export type UserRole = 'admin' | 'inventory_manager' | 'sales_rep' | 'accountant';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarUrl?: string;
  password?: string;
  phone?: string;
  createdAt?: string;
}

export interface RolePermissions {
  canEditInventory: boolean;
  canViewCostPrices: boolean;
  canCreateOrders: boolean;
  canDeleteOrders: boolean;
  canManageCustomers: boolean;
  canManageAccounting: boolean;
  canExportReports: boolean;
  canChangePaymentStatus: boolean;
  canManageOwnerSettings?: boolean;
  canManageUsers?: boolean;
  canDeleteRecords?: boolean;
}

export interface AccountingSyncRecord {
  id: string;
  timestamp: string;
  platform: 'QuickBooks' | 'Xero';
  type: 'Invoice' | 'Inventory Journal' | 'Customer Sync';
  referenceId: string;
  status: 'Success' | 'Failed';
  details: string;
  recordsCount: number;
}
