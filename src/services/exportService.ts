import { Product, Order, Customer } from '../types';

function downloadCSVFile(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ExportService = {
  exportProductsCSV(products: Product[]): void {
    const headers = [
      'SKU',
      'Spice Category / Name',
      'SKU Size',
      'Barcode',
      'Current Stock (Packets)',
      'Initial Stock (Packets)',
      'Reorder Threshold',
      'Cost per Packet (LKR)',
      'MRP / Retail Price (LKR)',
      'Retailer Price (LKR)',
      'Retailer Margin (%)',
      'Distributor Selling Price (LKR)',
      'Distributor Margin (%)',
      'Dealer Comm (10%) (LKR)',
      'Inventory Value at Cost (LKR)',
      'Batch Number',
      'Harvest / Packing Date',
      'Origin',
    ];

    const rows = products.map((p) => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.skuSize || p.unit}"`,
      `"${p.barcode}"`,
      p.currentStock,
      p.initialStock,
      p.reorderThreshold,
      p.costPrice.toFixed(2),
      p.retailPrice.toFixed(2),
      p.wholesalePrice.toFixed(2),
      p.retailerMarginPct ? p.retailerMarginPct.toFixed(2) + '%' : '',
      p.distributorPrice.toFixed(2),
      p.distributorMarginPct ? p.distributorMarginPct.toFixed(2) + '%' : '',
      p.dealerCommission ? p.dealerCommission.toFixed(2) : '',
      (p.currentStock * (p.batchCost && p.initialStock ? (p.batchCost / p.initialStock) : p.costPrice)).toFixed(2),
      `"${p.batchNumber}"`,
      `"${p.harvestDate}"`,
      `"${p.origin || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCSVFile(csvContent, `Spice_Packets_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  exportOrdersCSV(orders: Order[]): void {
    const headers = [
      'Invoice Number',
      'Order Date',
      'Due Date',
      'Customer Name',
      'Customer Tier',
      'Email',
      'Items Count',
      'Subtotal (LKR)',
      'Discount (LKR)',
      'Tax (LKR)',
      'Total Amount (LKR)',
      'Paid Amount (LKR)',
      'Balance Due (LKR)',
      'Payment Status',
      'Payment Method',
      'Order Status',
      'QuickBooks Sync',
      'Xero Sync',
    ];

    const rows = orders.map((o) => [
      `"${o.invoiceNumber}"`,
      `"${o.orderDate}"`,
      `"${o.dueDate}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerTier}"`,
      `"${o.customerEmail}"`,
      o.items.length,
      o.subtotal.toFixed(2),
      o.discountAmount.toFixed(2),
      o.taxAmount.toFixed(2),
      o.totalAmount.toFixed(2),
      o.paidAmount.toFixed(2),
      Math.max(0, o.totalAmount - o.paidAmount).toFixed(2),
      `"${o.paymentStatus}"`,
      `"${o.paymentMethod}"`,
      `"${o.orderStatus}"`,
      `"${o.quickbooksSyncStatus || 'pending'}"`,
      `"${o.xeroSyncStatus || 'pending'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCSVFile(csvContent, `Spice_Sales_Invoices_LKR_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  exportCustomersCSV(customers: Customer[], orders: Order[]): void {
    const headers = [
      'Customer Name',
      'Company Name',
      'Contact Person',
      'Email',
      'Phone',
      'Address',
      'City',
      'Region',
      'Tax ID',
      'Tier',
      'Credit Limit (LKR)',
      'Payment Terms',
      'Total Orders',
      'Total Spend (LKR)',
      'Outstanding Balance (LKR)',
    ];

    const rows = customers.map((c) => {
      const custOrders = orders.filter((o) => o.customerId === c.id);
      const totalSpend = custOrders.reduce((acc, o) => acc + o.totalAmount, 0);
      const totalPaid = custOrders.reduce((acc, o) => acc + o.paidAmount, 0);
      const balance = Math.max(0, totalSpend - totalPaid);

      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.companyName.replace(/"/g, '""')}"`,
        `"${c.contactPerson}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.address.replace(/"/g, '""')}"`,
        `"${c.city}"`,
        `"${c.region}"`,
        `"${c.taxId}"`,
        `"${c.tier}"`,
        c.creditLimit.toFixed(2),
        `"${c.paymentTerms}"`,
        custOrders.length,
        totalSpend.toFixed(2),
        balance.toFixed(2),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCSVFile(csvContent, `Spice_Customer_Ledger_LKR_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  exportWeeklyPerformanceCSV(weeklyData: Array<{ weekLabel: string; revenue: number; ordersCount: number; unitsSold: number; profit: number }>): void {
    const headers = [
      'Week',
      'Revenue (LKR)',
      'Gross Profit (LKR)',
      'Profit Margin (%)',
      'Orders Count',
      'Total Packets Sold',
    ];

    const rows = weeklyData.map((w) => [
      `"${w.weekLabel}"`,
      w.revenue.toFixed(2),
      w.profit.toFixed(2),
      w.revenue > 0 ? ((w.profit / w.revenue) * 100).toFixed(1) + '%' : '0.0%',
      w.ordersCount,
      w.unitsSold,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCSVFile(csvContent, `Spice_Weekly_Performance_LKR_${new Date().toISOString().slice(0, 10)}.csv`);
  },
};
