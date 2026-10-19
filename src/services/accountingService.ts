import { Order, AccountingSyncRecord } from '../types';

export interface AccountingConfig {
  quickbooks: {
    connected: boolean;
    companyName: string;
    realmId: string;
    arAccount: string;
    incomeAccount: string;
    cogsAccount: string;
    inventoryAssetAccount: string;
    lastSync: string;
  };
  xero: {
    connected: boolean;
    tenantName: string;
    tenantId: string;
    salesAccountCode: string;
    bankAccountCode: string;
    taxType: string;
    lastSync: string;
  };
}

export const DEFAULT_ACCOUNTING_CONFIG: AccountingConfig = {
  quickbooks: {
    connected: true,
    companyName: 'Saffron & Bark Spice Merchants LLC',
    realmId: 'QBO-9130485901',
    arAccount: '1200 - Accounts Receivable (A/R)',
    incomeAccount: '4100 - Bulk & Wholesale Spice Sales',
    cogsAccount: '5010 - Cost of Goods Sold - Agricultural Spices',
    inventoryAssetAccount: '1400 - Raw & Processed Spice Inventory',
    lastSync: '2026-10-16 09:10:00',
  },
  xero: {
    connected: true,
    tenantName: 'Saffron & Bark International EU/UK',
    tenantId: 'XERO-EUR-782103',
    salesAccountCode: '200 - Sales (Zero-rated Spice Produce)',
    bankAccountCode: '090 - Commercial Wire Clearing Account',
    taxType: 'NONE (Exempt Agricultural Goods)',
    lastSync: '2026-10-15 16:30:14',
  },
};

export const AccountingService = {
  getConfig(): AccountingConfig {
    try {
      const data = localStorage.getItem('saffron_accounting_config_v1');
      return data ? JSON.parse(data) : DEFAULT_ACCOUNTING_CONFIG;
    } catch {
      return DEFAULT_ACCOUNTING_CONFIG;
    }
  },

  saveConfig(config: AccountingConfig): void {
    localStorage.setItem('saffron_accounting_config_v1', JSON.stringify(config));
  },

  generateQuickBooksPayload(order: Order) {
    return {
      Invoice: {
        DocNumber: order.invoiceNumber,
        TxnDate: order.orderDate,
        DueDate: order.dueDate,
        CustomerRef: {
          name: order.customerName,
          value: order.customerId,
        },
        Line: order.items.map((item, idx) => ({
          LineNum: idx + 1,
          Amount: item.totalPrice,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: {
              name: item.productName,
              value: item.sku,
            },
            UnitPrice: item.unitPrice,
            Qty: item.quantity,
            TaxCodeRef: {
              value: order.taxRate > 0 ? 'TAX' : 'NON',
            },
          },
        })),
        TotalAmt: order.totalAmount,
        Balance: Math.max(0, order.totalAmount - order.paidAmount),
        PrivateNote: `Spice ERP Sync - Customer Tier: ${order.customerTier.toUpperCase()}`,
      },
    };
  },

  generateXeroCSV(orders: Order[]): string {
    const headers = [
      '*ContactName',
      'EmailAddress',
      'POAddressLine1',
      'POCity',
      'PORegion',
      '*InvoiceNumber',
      '*InvoiceDate',
      '*DueDate',
      'Total',
      'InventoryItemCode',
      '*Description',
      '*Quantity',
      '*UnitAmount',
      '*AccountCode',
      '*TaxType',
    ];

    const lines: string[] = [headers.join(',')];

    orders.forEach((o) => {
      o.items.forEach((item) => {
        lines.push(
          [
            `"${o.customerName}"`,
            `"${o.customerEmail}"`,
            `"${o.customerAddress}"`,
            `""`,
            `""`,
            `"${o.invoiceNumber}"`,
            `"${o.orderDate}"`,
            `"${o.dueDate}"`,
            item.totalPrice.toFixed(2),
            `"${item.sku}"`,
            `"${item.productName.replace(/"/g, '""')}"`,
            item.quantity,
            item.unitPrice.toFixed(2),
            '"200"',
            '"NONE"',
          ].join(',')
        );
      });
    });

    return lines.join('\r\n');
  },

  simulateSync(
    platform: 'QuickBooks' | 'Xero',
    orders: Order[]
  ): {
    updatedOrders: Order[];
    newRecords: AccountingSyncRecord[];
  } {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedOrders = orders.map((o) => {
      if (platform === 'QuickBooks') {
        return { ...o, quickbooksSyncStatus: 'synced' as const };
      } else {
        return { ...o, xeroSyncStatus: 'synced' as const };
      }
    });

    const newRecords: AccountingSyncRecord[] = [
      {
        id: `sync-${Date.now()}`,
        timestamp,
        platform,
        type: 'Invoice',
        referenceId: orders.map((o) => o.invoiceNumber).slice(0, 3).join(', ') + (orders.length > 3 ? ` (+${orders.length - 3} more)` : ''),
        status: 'Success',
        details:
          platform === 'QuickBooks'
            ? `Synced ${orders.length} orders to QBO Ledger. Mapped to Income Account 4100 & A/R 1200.`
            : `Synced ${orders.length} orders to Xero API endpoint /Invoices. Status: AUTHORISED.`,
        recordsCount: orders.length,
      },
    ];

    return { updatedOrders, newRecords };
  },
};
