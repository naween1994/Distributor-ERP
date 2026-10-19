import React, { useState, useMemo } from 'react';
import { Product, Customer, Order, RolePermissions } from '../types';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Percent, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Printer,
  Building2,
  Receipt,
  ShieldCheck,
  Sparkles,
  FileDown,
  Loader2
} from 'lucide-react';
import { ExportService } from '../services/exportService';
import { DecimalUtils } from '../services/decimalUtils';
import { jsPDF } from 'jspdf';

interface ReportsViewProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  permissions: RolePermissions;
}

type ReportTab = 'bestsellers' | 'customers' | 'margins' | 'weekly' | 'monthly';

const MONTH_NAMES: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December'
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  products,
  customers,
  orders,
  permissions,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('bestsellers');
  const [bestSellerSort, setBestSellerSort] = useState<'revenue' | 'quantity'>('revenue');
  const [marginSubTab, setMarginSubTab] = useState<'products' | 'orders'>('products');

  // Monthly Report State
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Date Range Filtering
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Handle Preset Changes
  const handlePresetChange = (preset: '7d' | '30d' | '90d' | 'all') => {
    setDateRangePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    setEndDate(endStr);

    if (preset === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().slice(0, 10));
    } else if (preset === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().slice(0, 10));
    } else if (preset === '90d') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().slice(0, 10));
    } else {
      setStartDate('2026-01-01');
    }
  };

  // Filter orders by active date range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (dateRangePreset === 'all') return true;
      return o.orderDate >= startDate && o.orderDate <= endDate;
    });
  }, [orders, dateRangePreset, startDate, endDate]);

  // 1. Best Selling Products Data
  const bestSellersData = useMemo(() => {
    const productStats: Record<
      string,
      {
        product: Product;
        quantitySold: number;
        revenue: number;
        cogs: number;
        profit: number;
      }
    > = {};

    products.forEach((p) => {
      productStats[p.id] = {
        product: p,
        quantitySold: 0,
        revenue: 0,
        cogs: 0,
        profit: 0,
      };
    });

    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productStats[item.productId]) {
          const matched = products.find((p) => p.id === item.productId);
          if (matched) {
            productStats[item.productId] = {
              product: matched,
              quantitySold: 0,
              revenue: 0,
              cogs: 0,
              profit: 0,
            };
          }
        }

        if (productStats[item.productId]) {
          productStats[item.productId].quantitySold += item.quantity;
          productStats[item.productId].revenue = DecimalUtils.add(productStats[item.productId].revenue, item.totalPrice);
          const cost = DecimalUtils.multiply(item.costPrice, item.quantity);
          productStats[item.productId].cogs = DecimalUtils.add(productStats[item.productId].cogs, cost);
          productStats[item.productId].profit = DecimalUtils.subtract(productStats[item.productId].revenue, productStats[item.productId].cogs);
        }
      });
    });

    const list = Object.values(productStats);
    if (bestSellerSort === 'revenue') {
      return list.sort((a, b) => b.revenue - a.revenue);
    } else {
      return list.sort((a, b) => b.quantitySold - a.quantitySold);
    }
  }, [products, filteredOrders, bestSellerSort]);

  // 2. Customer Purchase History Analysis
  const customerAnalytics = useMemo(() => {
    return customers.map((c) => {
      const custOrders = filteredOrders.filter((o) => o.customerId === c.id);
      const totalSpend = DecimalUtils.sum(custOrders.map((o) => o.totalAmount));
      const totalPaid = DecimalUtils.sum(custOrders.map((o) => o.paidAmount));
      const balance = Math.max(0, DecimalUtils.subtract(totalSpend, totalPaid));
      const aov = custOrders.length > 0 ? DecimalUtils.divide(totalSpend, custOrders.length) : 0;

      // Find favorite spice
      const spiceCounts: Record<string, number> = {};
      custOrders.forEach((o) => {
        o.items.forEach((i) => {
          spiceCounts[i.productName] = (spiceCounts[i.productName] || 0) + i.quantity;
        });
      });
      let preferredSpice = 'None yet';
      let maxQty = 0;
      Object.entries(spiceCounts).forEach(([name, qty]) => {
        if (qty > maxQty) {
          maxQty = qty;
          preferredSpice = name;
        }
      });

      const lastOrder = [...custOrders].sort(
        (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      )[0];

      return {
        customer: c,
        orderCount: custOrders.length,
        totalSpend,
        totalPaid,
        balance,
        aov,
        preferredSpice,
        lastOrderDate: lastOrder ? lastOrder.orderDate : 'No orders',
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, filteredOrders]);

  // 3. Profit Margins by Product
  const productMargins = useMemo(() => {
    return products.map((p) => {
      const retail = DecimalUtils.calculateMargin(p.retailPrice, p.costPrice);
      const wholesale = DecimalUtils.calculateMargin(p.wholesalePrice, p.costPrice);
      const distributor = DecimalUtils.calculateMargin(p.distributorPrice, p.costPrice);

      return {
        product: p,
        retailProfit: retail.profit,
        retailMargin: retail.marginPct,
        wholesaleProfit: wholesale.profit,
        wholesaleMargin: wholesale.marginPct,
        distributorProfit: distributor.profit,
        distributorMargin: distributor.marginPct,
      };
    });
  }, [products]);

  // Order level margins
  const orderMargins = useMemo(() => {
    return filteredOrders.map((o) => {
      const lineCosts = o.items.map((item) => DecimalUtils.multiply(item.costPrice, item.quantity));
      const orderCost = DecimalUtils.sum(lineCosts);
      const grossProfit = DecimalUtils.subtract(o.totalAmount, orderCost);
      const margin = DecimalUtils.calculateMargin(o.totalAmount, orderCost);

      return {
        order: o,
        orderCost,
        grossProfit,
        marginPercent: margin.marginPct,
      };
    }).sort((a, b) => new Date(b.order.orderDate).getTime() - new Date(a.order.orderDate).getTime());
  }, [filteredOrders]);

  // 4. Weekly Sales Trends
  const weeklyTrends = useMemo(() => {
    // Generate buckets for weeks
    const weeks: Record<string, { weekLabel: string; revenue: number; ordersCount: number; unitsSold: number; profit: number }> = {};

    const weekBuckets = ['W38 (Sep 14-20)', 'W39 (Sep 21-27)', 'W40 (Sep 28-Oct 04)', 'W41 (Oct 05-11)', 'W42 (Oct 12-18)'];
    weekBuckets.forEach((label) => {
      weeks[label] = { weekLabel: label, revenue: 0, ordersCount: 0, unitsSold: 0, profit: 0 };
    });

    // Populate with order data
    filteredOrders.forEach((o) => {
      const d = new Date(o.orderDate);
      const day = d.getDate();
      let bucket = 'W42 (Oct 12-18)';
      if (d.getMonth() === 8) {
        // September
        bucket = day < 21 ? 'W38 (Sep 14-20)' : 'W39 (Sep 21-27)';
      } else if (d.getMonth() === 9) {
        // October
        if (day <= 4) bucket = 'W40 (Sep 28-Oct 04)';
        else if (day <= 11) bucket = 'W41 (Oct 05-11)';
        else bucket = 'W42 (Oct 12-18)';
      }

      if (!weeks[bucket]) {
        weeks[bucket] = { weekLabel: bucket, revenue: 0, ordersCount: 0, unitsSold: 0, profit: 0 };
      }

      weeks[bucket].revenue = DecimalUtils.add(weeks[bucket].revenue, o.totalAmount);
      weeks[bucket].ordersCount += 1;
      let cost = 0;
      o.items.forEach((i) => {
        weeks[bucket].unitsSold += i.quantity;
        cost = DecimalUtils.add(cost, DecimalUtils.multiply(i.costPrice, i.quantity));
      });
      weeks[bucket].profit = DecimalUtils.add(weeks[bucket].profit, DecimalUtils.subtract(o.totalAmount, cost));
    });

    return Object.values(weeks);
  }, [filteredOrders]);

  // Summary Metrics for the active date range
  const periodRevenue = DecimalUtils.sum(filteredOrders.map((o) => o.totalAmount));
  const periodOrdersCount = filteredOrders.length;
  const periodLineCosts = filteredOrders.flatMap((o) =>
    o.items.map((i) => DecimalUtils.multiply(i.costPrice, i.quantity))
  );
  const periodCost = DecimalUtils.sum(periodLineCosts);
  const periodGrossProfit = DecimalUtils.subtract(periodRevenue, periodCost);
  const periodMargin = DecimalUtils.calculateMargin(periodRevenue, periodCost).marginPct;

  // Monthly Report Calculations
  const monthlyReportData = useMemo(() => {
    const monthOrders = orders.filter((o) => o.orderDate.startsWith(selectedMonth));
    const [yearStr, monthStr] = selectedMonth.split('-');
    const monthName = MONTH_NAMES[monthStr] || monthStr;

    let revenue = 0;
    let cogs = 0;
    let paidAmount = 0;
    let unitsSold = 0;

    const productSalesMap: Record<string, { product: Product; quantity: number; revenue: number; cogs: number; profit: number }> = {};
    const customerSalesMap: Record<string, { customerName: string; customerTier: string; ordersCount: number; revenue: number; paid: number; balance: number }> = {};

    monthOrders.forEach((o) => {
      revenue = DecimalUtils.add(revenue, o.totalAmount);
      paidAmount = DecimalUtils.add(paidAmount, o.paidAmount);

      let orderCogs = 0;
      o.items.forEach((item) => {
        unitsSold += item.quantity;
        const lineCost = DecimalUtils.multiply(item.quantity, item.costPrice || 0);
        orderCogs = DecimalUtils.add(orderCogs, lineCost);

        if (!productSalesMap[item.productId]) {
          const prod = products.find((p) => p.id === item.productId) || {
            id: item.productId,
            name: item.productName,
            sku: item.sku,
            barcode: '89010020' + Math.floor(1000 + Math.random() * 9000),
            unit: item.unit,
            costPrice: item.costPrice,
            retailPrice: item.unitPrice,
            wholesalePrice: item.unitPrice,
            distributorPrice: item.unitPrice,
            initialStock: 0,
            currentStock: 0,
            reorderThreshold: 0,
            batchNumber: 'LOT',
            harvestDate: '',
            category: 'Powder',
            skuSize: item.unit,
            description: '',
          };
          productSalesMap[item.productId] = {
            product: prod,
            quantity: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue = DecimalUtils.add(productSalesMap[item.productId].revenue, item.totalPrice);
        productSalesMap[item.productId].cogs = DecimalUtils.add(productSalesMap[item.productId].cogs, lineCost);
        productSalesMap[item.productId].profit = DecimalUtils.subtract(productSalesMap[item.productId].revenue, productSalesMap[item.productId].cogs);
      });

      cogs = DecimalUtils.add(cogs, orderCogs);

      if (!customerSalesMap[o.customerId]) {
        customerSalesMap[o.customerId] = {
          customerName: o.customerName,
          customerTier: o.customerTier,
          ordersCount: 0,
          revenue: 0,
          paid: 0,
          balance: 0,
        };
      }
      customerSalesMap[o.customerId].ordersCount += 1;
      customerSalesMap[o.customerId].revenue = DecimalUtils.add(customerSalesMap[o.customerId].revenue, o.totalAmount);
      customerSalesMap[o.customerId].paid = DecimalUtils.add(customerSalesMap[o.customerId].paid, o.paidAmount);
      customerSalesMap[o.customerId].balance = Math.max(0, customerSalesMap[o.customerId].revenue - customerSalesMap[o.customerId].paid);
    });

    const grossProfit = DecimalUtils.subtract(revenue, cogs);
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const balanceDue = Math.max(0, DecimalUtils.subtract(revenue, paidAmount));
    const sortedProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
    const sortedCustomers = Object.values(customerSalesMap).sort((a, b) => b.revenue - a.revenue);

    return {
      monthName,
      yearStr,
      monthStr,
      orders: monthOrders,
      ordersCount: monthOrders.length,
      revenue,
      cogs,
      grossProfit,
      profitMargin,
      paidAmount,
      balanceDue,
      unitsSold,
      topProducts: sortedProducts,
      customerSummaries: sortedCustomers,
    };
  }, [orders, products, selectedMonth]);

  // Generate Official Monthly Report PDF using jsPDF
  const handleGenerateMonthlyPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 30;

      // Header Banner (Slate-900 with Amber Accent)
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 75, 'F');

      doc.setFillColor(217, 119, 6);
      doc.rect(0, 75, pageWidth, 4, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('NAWEEN & ANURA SPICE DISTRIBUTORS (PVT) LTD', 35, 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(226, 232, 240);
      doc.text('Wholesale & Retail Spice Distribution Network · Bandaragama & Colombo, Sri Lanka', 35, 46);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(251, 191, 36);
      doc.text(`MONTHLY COMMERCIAL STATEMENT · ${monthlyReportData.monthName.toUpperCase()} ${monthlyReportData.yearStr}`, 35, 63);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.text(`Generated: ${generatedDate} | Currency: LKR (Rs.)`, pageWidth - 35, 63, { align: 'right' });

      y = 100;

      // Executive Summary Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Executive Summary — ${monthlyReportData.monthName} ${monthlyReportData.yearStr}`, 35, y);
      y += 14;

      // 6 KPI Blocks
      const kpis = [
        { label: 'Gross Sales Revenue', value: `Rs. ${monthlyReportData.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Cost of Goods (COGS)', value: `Rs. ${monthlyReportData.cogs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Gross Trading Profit', value: `Rs. ${monthlyReportData.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Gross Profit Margin', value: `${monthlyReportData.profitMargin.toFixed(1)}%` },
        { label: 'Collected / Settled', value: `Rs. ${monthlyReportData.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Outstanding Receivables', value: `Rs. ${monthlyReportData.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      ];

      const cardW = (pageWidth - 70 - 16) / 3;
      const cardH = 36;

      kpis.forEach((kpi, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cx = 35 + col * (cardW + 8);
        const cy = y + row * (cardH + 8);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cx, cy, cardW, cardH, 4, 4, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, cx + 8, cy + 13);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(kpi.value, cx + 8, cy + 27);
      });

      y += 2 * (cardH + 8) + 14;

      // Section 1: Spice Packets Breakdown Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`1. Spice Product Sales & Volume Breakdown (${monthlyReportData.unitsSold.toLocaleString()} Total Packets)`, 35, y);
      y += 10;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(35, y, pageWidth - 70, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('SKU / BARCODE', 40, y + 11);
      doc.text('PRODUCT & PACKET SIZE', 130, y + 11);
      doc.text('PACKETS', 280, y + 11, { align: 'right' });
      doc.text('COGS (LKR)', 350, y + 11, { align: 'right' });
      doc.text('REVENUE (LKR)', 440, y + 11, { align: 'right' });
      doc.text('PROFIT (LKR)', pageWidth - 40, y + 11, { align: 'right' });
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      if (monthlyReportData.topProducts.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('No spice packets sold during this calendar month.', 40, y + 12);
        y += 16;
      } else {
        monthlyReportData.topProducts.slice(0, 8).forEach((p, index) => {
          if (index % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(35, y, pageWidth - 70, 14, 'F');
          }
          doc.setTextColor(15, 23, 42);
          doc.text(p.product.sku, 40, y + 10);
          doc.text(p.product.name.slice(0, 28), 130, y + 10);
          doc.text(p.quantity.toString(), 280, y + 10, { align: 'right' });
          doc.text(p.cogs.toFixed(2), 350, y + 10, { align: 'right' });
          doc.text(p.revenue.toFixed(2), 440, y + 10, { align: 'right' });
          doc.text(p.profit.toFixed(2), pageWidth - 40, y + 10, { align: 'right' });
          y += 14;
        });
      }

      y += 14;

      // Section 2: Wholesale & Distributor Account Performance
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`2. Wholesale & Distributor Account Performance (${monthlyReportData.ordersCount} Total Invoices)`, 35, y);
      y += 10;

      // Customer Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(35, y, pageWidth - 70, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('CUSTOMER / TRADE ACCOUNT', 40, y + 11);
      doc.text('TIER', 200, y + 11);
      doc.text('INVOICES', 270, y + 11, { align: 'right' });
      doc.text('INVOICED TOTAL (LKR)', 370, y + 11, { align: 'right' });
      doc.text('PAID (LKR)', 460, y + 11, { align: 'right' });
      doc.text('BALANCE DUE', pageWidth - 40, y + 11, { align: 'right' });
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      if (monthlyReportData.customerSummaries.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('No client trade transactions recorded for this month.', 40, y + 12);
        y += 16;
      } else {
        monthlyReportData.customerSummaries.slice(0, 6).forEach((c, index) => {
          if (index % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(35, y, pageWidth - 70, 14, 'F');
          }
          doc.setTextColor(15, 23, 42);
          doc.text(c.customerName.slice(0, 30), 40, y + 10);
          doc.text(c.customerTier.toUpperCase(), 200, y + 10);
          doc.text(c.ordersCount.toString(), 270, y + 10, { align: 'right' });
          doc.text(c.revenue.toFixed(2), 370, y + 10, { align: 'right' });
          doc.text(c.paid.toFixed(2), 460, y + 10, { align: 'right' });
          doc.text(c.balance.toFixed(2), pageWidth - 40, y + 10, { align: 'right' });
          y += 14;
        });
      }

      // Signature & Authorization Block
      const sigY = Math.max(y + 20, pageHeight - 90);
      doc.setDrawColor(203, 213, 225);
      doc.line(35, sigY, pageWidth - 35, sigY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Prepared By: Financial Accountant / Auditor', 45, sigY + 16);
      doc.text('Authorized By: Naween Samaranayaka (Managing Director)', pageWidth - 45, sigY + 16, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Signature: __________________________   Date: ___/___/______', 45, sigY + 32);
      doc.text('Signature & Official Seal: __________________________', pageWidth - 45, sigY + 32, { align: 'right' });

      doc.setFontSize(6.5);
      doc.text('NAWEEN & ANURA SPICE DISTRIBUTORS (PVT) LTD · Enterprise Monthly Performance Statement · Bandaragama, Sri Lanka', pageWidth / 2, pageHeight - 12, { align: 'center' });

      doc.save(`Naween_Spices_Monthly_Report_${monthlyReportData.monthName}_${monthlyReportData.yearStr}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export handlers
  const handleExportCurrentReport = () => {
    if (activeTab === 'bestsellers') {
      const headers = ['Rank', 'Product Name', 'SKU', 'Origin', 'Grade', 'Units Sold', 'Gross Revenue (USD)', 'COGS (USD)', 'Gross Profit (USD)', 'Profit Margin (%)'];
      const rows = bestSellersData.map((b, idx) => [
        idx + 1,
        `"${b.product.name.replace(/"/g, '""')}"`,
        `"${b.product.sku}"`,
        `"${b.product.origin}"`,
        `"${b.product.grade}"`,
        `${b.quantitySold} ${b.product.unit}`,
        b.revenue.toFixed(2),
        b.cogs.toFixed(2),
        b.profit.toFixed(2),
        b.revenue > 0 ? ((b.profit / b.revenue) * 100).toFixed(1) + '%' : '0.0%',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      downloadCSV(csv, `Best_Selling_Spices_${startDate}_to_${endDate}.csv`);
    } else if (activeTab === 'customers') {
      const headers = ['Customer Name', 'Trade Tier', 'Orders Count', 'Total Spent (USD)', 'Avg Order Value (USD)', 'Outstanding Due (USD)', 'Top Spice', 'Last Order Date'];
      const rows = customerAnalytics.map((c) => [
        `"${c.customer.name.replace(/"/g, '""')}"`,
        `"${c.customer.tier}"`,
        c.orderCount,
        c.totalSpend.toFixed(2),
        c.aov.toFixed(2),
        c.balance.toFixed(2),
        `"${c.preferredSpice}"`,
        `"${c.lastOrderDate}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      downloadCSV(csv, `Customer_Purchase_Analytics_${startDate}_to_${endDate}.csv`);
    } else if (activeTab === 'margins') {
      if (marginSubTab === 'products') {
        const headers = ['SKU', 'Spice Name', 'Unit', 'Cost Price (LKR)', 'Wholesale Price (LKR)', 'Wholesale Margin (%)', 'Retail Price (LKR)', 'Retail Margin (%)', 'Distributor Price (LKR)', 'Distributor Margin (%)'];
        const rows = productMargins.map((p) => [
          `"${p.product.sku}"`,
          `"${p.product.name.replace(/"/g, '""')}"`,
          `"${p.product.unit}"`,
          p.product.costPrice.toFixed(2),
          p.product.wholesalePrice.toFixed(2),
          p.wholesaleMargin.toFixed(1) + '%',
          p.product.retailPrice.toFixed(2),
          p.retailMargin.toFixed(1) + '%',
          p.product.distributorPrice.toFixed(2),
          p.distributorMargin.toFixed(1) + '%',
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
        downloadCSV(csv, `Product_Profit_Margins.csv`);
      } else {
        const headers = ['Invoice Number', 'Order Date', 'Customer', 'Revenue (LKR)', 'COGS (LKR)', 'Gross Profit (LKR)', 'Order Margin (%)'];
        const rows = orderMargins.map((m) => [
          `"${m.order.invoiceNumber}"`,
          `"${m.order.orderDate}"`,
          `"${m.order.customerName.replace(/"/g, '""')}"`,
          m.order.totalAmount.toFixed(2),
          m.orderCost.toFixed(2),
          m.grossProfit.toFixed(2),
          m.marginPercent.toFixed(1) + '%',
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
        downloadCSV(csv, `Order_Profit_Margins.csv`);
      }
    } else {
      ExportService.exportWeeklyPerformanceCSV(weeklyTrends);
    }
  };

  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Advanced Commercial Intelligence & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Best-selling spice rankings, customer purchase frequency, gross profit margins, and trend exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            {(['7d', '30d', '90d', 'all'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-2.5 py-1 font-medium rounded-md uppercase transition-colors ${
                  dateRangePreset === preset
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset === '7d' ? 'Last 7D' : preset === '30d' ? '30D' : preset === '90d' ? '90D' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Date Picker Inputs */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDateRangePreset('custom');
                setStartDate(e.target.value);
              }}
              className="font-mono text-slate-700 bg-transparent focus:outline-none"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDateRangePreset('custom');
                setEndDate(e.target.value);
              }}
              className="font-mono text-slate-700 bg-transparent focus:outline-none"
            />
          </div>

          {/* Export Action */}
          <button
            onClick={handleExportCurrentReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report CSV</span>
          </button>
        </div>
      </div>

      {/* High-Level Financial Performance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Selected Period Revenue</div>
          <div className="text-xl font-bold font-mono text-slate-900 tabular-nums mt-1">
            Rs. {periodRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">{periodOrdersCount} orders processed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Cost of Goods Sold (COGS)</div>
          <div className="text-xl font-bold font-mono text-slate-700 tabular-nums mt-1">
            Rs. {periodCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Direct origin procurement cost</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Gross Trading Profit</div>
          <div className="text-xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
            Rs. {periodGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Net commodity surplus</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Aggregate Profit Margin</div>
          <div className="text-xl font-bold font-mono text-amber-800 tabular-nums mt-1">
            {periodMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Healthy wholesale benchmark: &gt;35%</div>
        </div>
      </div>

      {/* Main Report Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-fit">
        <button
          onClick={() => setActiveTab('bestsellers')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'bestsellers'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Best-Selling Products</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'customers'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customer Purchase History</span>
        </button>

        <button
          onClick={() => setActiveTab('margins')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'margins'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Profit Margin Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'weekly'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Weekly Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'monthly'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-rose-600" />
          <span>Monthly Statement (PDF)</span>
        </button>
      </div>

      {/* TAB 1: BEST-SELLING PRODUCTS */}
      {activeTab === 'bestsellers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Best-Selling Spice Commodities</h2>
              <p className="text-xs text-slate-500">Ranked performance across wholesale, distributor, and retail channels</p>
            </div>

            {/* Sort Toggle: By Revenue vs By Quantity */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <span className="text-slate-400 px-2">Rank by:</span>
              <button
                onClick={() => setBestSellerSort('revenue')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  bestSellerSort === 'revenue'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Revenue (Rs.)
              </button>
              <button
                onClick={() => setBestSellerSort('quantity')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  bestSellerSort === 'quantity'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Quantity (Volume)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4 w-12">#</th>
                  <th className="py-2.5 px-4">SPICE ITEM</th>
                  <th className="py-2.5 px-4">ORIGIN & GRADE</th>
                  <th className="py-2.5 px-4 text-right">PACKETS SOLD</th>
                  <th className="py-2.5 px-4 text-right">GROSS REVENUE (LKR)</th>
                  <th className="py-2.5 px-4 text-right">COGS (LKR)</th>
                  <th className="py-2.5 px-4 text-right">GROSS PROFIT (LKR)</th>
                  <th className="py-2.5 px-4 text-right">MARGIN %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bestSellersData.map((item, idx) => {
                  const marginPct = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                  return (
                    <tr key={item.product.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.product.sku} · Barcode: {item.product.barcode}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{item.product.origin}</div>
                        <div className="text-[11px] text-slate-500">{item.product.grade}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {item.quantitySold} <span className="text-[11px] font-normal text-slate-500">{item.product.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        Rs. {item.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                        Rs. {item.cogs.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        Rs. {item.profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            marginPct >= 40
                              ? 'bg-emerald-50 text-emerald-700'
                              : marginPct >= 25
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER PURCHASE HISTORY ANALYSIS */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customer Purchase History & Lifetime Value</h2>
              <p className="text-xs text-slate-500">Total spending, order frequency, average order size, and preferred spice lots</p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {customerAnalytics.length} trade accounts analyzed
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">CUSTOMER & COMPANY</th>
                  <th className="py-2.5 px-4 text-center">TRADE TIER</th>
                  <th className="py-2.5 px-4 text-right">ORDERS COUNT</th>
                  <th className="py-2.5 px-4 text-right">TOTAL SPEND</th>
                  <th className="py-2.5 px-4 text-right">AVERAGE ORDER (AOV)</th>
                  <th className="py-2.5 px-4 text-right">OUTSTANDING DUE</th>
                  <th className="py-2.5 px-4">PREFERRED SPICE</th>
                  <th className="py-2.5 px-4 text-right">LAST ORDER DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerAnalytics.map((c) => (
                  <tr key={c.customer.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.customer.name}</div>
                      <div className="text-[11px] text-slate-500">{c.customer.city}, {c.customer.region}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {c.customer.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {c.orderCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      Rs. {c.totalSpend.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                      Rs. {c.aov.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {c.balance > 0 ? (
                        <span className="font-semibold text-amber-700">Rs. {c.balance.toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-700">Rs. 0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 truncate max-w-xs">
                      {c.preferredSpice}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {c.lastOrderDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROFIT MARGIN ANALYSIS */}
      {activeTab === 'margins' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Profit Margin & Markup Analysis</h2>
              <p className="text-xs text-slate-500">Commodity procurement costs versus tier selling prices and order-level margins</p>
            </div>

            {/* Sub-tabs: By Product vs By Order */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setMarginSubTab('products')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  marginSubTab === 'products'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Product Tier Margins
              </button>
              <button
                onClick={() => setMarginSubTab('orders')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  marginSubTab === 'orders'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Order-Level Margins
              </button>
            </div>
          </div>

          {marginSubTab === 'products' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">SPICE ITEM</th>
                    <th className="py-2.5 px-3">UNIT</th>
                    <th className="py-2.5 px-4 text-right">COST (COGS)</th>
                    <th className="py-2.5 px-4 text-right">WHOLESALE (RATE / MARGIN)</th>
                    <th className="py-2.5 px-4 text-right">DISTRIBUTOR (RATE / MARGIN)</th>
                    <th className="py-2.5 px-4 text-right">RETAIL (RATE / MARGIN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productMargins.map((item) => (
                    <tr key={item.product.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.product.sku}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 uppercase text-[11px]">
                        {item.product.unit.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        Rs. {item.product.costPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">Rs. {item.product.wholesalePrice.toFixed(2)}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">{item.wholesaleMargin.toFixed(1)}% margin</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">Rs. {item.product.distributorPrice.toFixed(2)}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">{item.distributorMargin.toFixed(1)}% margin</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">Rs. {item.product.retailPrice.toFixed(2)}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">{item.retailMargin.toFixed(1)}% margin</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">INVOICE NUMBER</th>
                    <th className="py-2.5 px-4">DATE</th>
                    <th className="py-2.5 px-4">CUSTOMER</th>
                    <th className="py-2.5 px-4 text-right">ORDER REVENUE (LKR)</th>
                    <th className="py-2.5 px-4 text-right">TOTAL COGS (LKR)</th>
                    <th className="py-2.5 px-4 text-right">GROSS PROFIT (LKR)</th>
                    <th className="py-2.5 px-4 text-right">ORDER MARGIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderMargins.map((item) => (
                    <tr key={item.order.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {item.order.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {item.order.orderDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.order.customerName}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{item.order.customerTier} Tier</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        Rs. {item.order.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                        Rs. {item.orderCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        Rs. {item.grossProfit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                          {item.marginPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WEEKLY SALES PERFORMANCE TRENDS */}
      {activeTab === 'weekly' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-6 p-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Weekly Sales Performance Trends</h2>
            <p className="text-xs text-slate-500">Weekly revenue, units volume, and profit trajectory</p>
          </div>

          {/* Visual Bar Representation */}
          <div className="space-y-4">
            {weeklyTrends.map((w) => {
              const maxRev = Math.max(...weeklyTrends.map((t) => t.revenue), 16000);
              const barWidthPercent = Math.min(100, Math.max(5, (w.revenue / maxRev) * 100));

              return (
                <div key={w.weekLabel} className="space-y-1.5 text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-slate-900">{w.weekLabel}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-500">{w.ordersCount} orders · {w.unitsSold} units</span>
                      <span className="font-bold text-slate-900">${w.revenue.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Dual bar for Revenue and Profit */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                    <div
                      style={{ width: `${barWidthPercent}%` }}
                      className="bg-amber-800 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Aggregated from commercial invoices and delivery logs.</span>
            <button
              onClick={() => ExportService.exportWeeklyPerformanceCSV(weeklyTrends)}
              className="text-amber-800 hover:text-amber-900 font-semibold inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Weekly CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: MONTHLY COMMERCIAL STATEMENT & OFFICIAL PDF EXPORT */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Controls Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                  <FileText className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Monthly Commercial Statement & Official PDF Generator
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Select any calendar month to compute aggregated commercial performance, wholesale trade balances, and download a print-ready PDF statement.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleGenerateMonthlyPDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-800 hover:bg-rose-900 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-60"
                title="Download formatted official PDF report"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Monthly PDF'}</span>
              </button>

              {/* Print Statement Button */}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
                title="Print this statement using browser printer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Printable Report Document Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Document Header */}
            <div className="bg-slate-900 text-white p-6 border-b-4 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-amber-400 uppercase">
                  Spice Distribution Enterprise Statement
                </div>
                <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                  NAWEEN & ANURA SPICE DISTRIBUTORS (PVT) LTD
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Bandaragama Processing Facility & Colombo Distribution Network · Sri Lanka
                </p>
              </div>

              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase">
                  {monthlyReportData.monthName} {monthlyReportData.yearStr} Statement
                </span>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Currency: Sri Lankan Rupee (LKR / Rs.)
                </div>
              </div>
            </div>

            {/* Monthly KPI Dashboard Cards */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Monthly Revenue</div>
                  <div className="text-base font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                    Rs. {monthlyReportData.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{monthlyReportData.ordersCount} invoices</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Cost of Goods (COGS)</div>
                  <div className="text-base font-bold font-mono text-slate-700 tabular-nums mt-0.5">
                    Rs. {monthlyReportData.cogs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Direct packet cost</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Gross Trading Profit</div>
                  <div className="text-base font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
                    Rs. {monthlyReportData.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5 font-semibold">
                    {monthlyReportData.profitMargin.toFixed(1)}% margin
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Packets Delivered</div>
                  <div className="text-base font-bold font-mono text-amber-900 tabular-nums mt-0.5">
                    {monthlyReportData.unitsSold.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">100g, 50g, 25g packs</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Collected / Settled</div>
                  <div className="text-base font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
                    Rs. {monthlyReportData.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Cash / Bank cleared</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Outstanding Credit</div>
                  <div className={`text-base font-bold font-mono tabular-nums mt-0.5 ${monthlyReportData.balanceDue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    Rs. {monthlyReportData.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Trade receivables</div>
                </div>
              </div>
            </div>

            {/* Section 1: Product Volume & Revenue Table */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Spice Packet Commercial Sales Performance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Volume, cost basis, wholesale invoiced turnover, and net trading margins for {monthlyReportData.monthName} {monthlyReportData.yearStr}.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {monthlyReportData.topProducts.length} spice types sold
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4">SKU / BARCODE</th>
                      <th className="py-2.5 px-4">PRODUCT & PACKET SPEC</th>
                      <th className="py-2.5 px-4 text-center">CATEGORY</th>
                      <th className="py-2.5 px-4 text-right">PACKETS SOLD</th>
                      <th className="py-2.5 px-4 text-right">UNIT COST (LKR)</th>
                      <th className="py-2.5 px-4 text-right">TOTAL REVENUE (LKR)</th>
                      <th className="py-2.5 px-4 text-right">GROSS PROFIT (LKR)</th>
                      <th className="py-2.5 px-4 text-right">MARGIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyReportData.topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No spice packet sales recorded for {monthlyReportData.monthName} {monthlyReportData.yearStr}.
                        </td>
                      </tr>
                    ) : (
                      monthlyReportData.topProducts.map((p, idx) => {
                        const marginPct = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                        return (
                          <tr key={p.product.id || idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                              {p.product.sku}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900">{p.product.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Lot size: {p.product.skuSize || p.product.unit}</div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                                {p.product.category || 'Powder'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                              {p.quantity.toLocaleString()} packs
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                              Rs. {p.product.costPrice?.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                              Rs. {p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                              Rs. {p.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {marginPct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Customer Trade Account Performance */}
            <div className="p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Wholesale & Distributor Account Performance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trading customer turnover, payment settlements, and end-of-month receivables ledger.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {monthlyReportData.customerSummaries.length} active client accounts
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4">CUSTOMER / TRADE ENTITY</th>
                      <th className="py-2.5 px-4 text-center">TRADE TIER</th>
                      <th className="py-2.5 px-4 text-right">INVOICES ISSUED</th>
                      <th className="py-2.5 px-4 text-right">TOTAL INVOICED (LKR)</th>
                      <th className="py-2.5 px-4 text-right">SETTLED AMOUNT (LKR)</th>
                      <th className="py-2.5 px-4 text-right">BALANCE OUTSTANDING (LKR)</th>
                      <th className="py-2.5 px-4 text-center">SETTLEMENT STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyReportData.customerSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No commercial invoices recorded for {monthlyReportData.monthName} {monthlyReportData.yearStr}.
                        </td>
                      </tr>
                    ) : (
                      monthlyReportData.customerSummaries.map((c, idx) => {
                        const isSettled = c.balance <= 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {c.customerName}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded capitalize text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {c.customerTier}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                              {c.ordersCount}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                              Rs. {c.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                              Rs. {c.paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                              {c.balance > 0 ? (
                                <span className="text-rose-700">
                                  Rs. {c.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-emerald-600">Rs. 0.00</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                isSettled
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.paid > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isSettled ? 'Fully Settled' : c.paid > 0 ? 'Partially Paid' : 'Credit Due'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Certification & Signatures Box */}
            <div className="p-6 border-t border-slate-200 bg-slate-50/70">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Prepared & Audited By:</span>
                  </div>
                  <div className="text-xs text-slate-700 font-semibold">
                    Financial Controller / Accountant (Anura Gunasekara)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Accounts Department · Naween & Anura Spice Distributors (Pvt) Ltd
                  </div>
                  <div className="pt-3 border-t border-dashed border-slate-200 text-[11px] text-slate-400 font-mono">
                    Audit Signature: _______________________ Date: ___/___/______
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-700" />
                    <span>Authorized & Certified By:</span>
                  </div>
                  <div className="text-xs text-slate-700 font-semibold">
                    Naween Samaranayaka (Managing Director / Operations Head)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Executive Board · Vista Foods Commercial Distribution Facility
                  </div>
                  <div className="pt-3 border-t border-dashed border-slate-200 text-[11px] text-slate-400 font-mono">
                    Director Seal: _______________________ Date: ___/___/______
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
