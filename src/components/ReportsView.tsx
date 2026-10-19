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
  AlertCircle 
} from 'lucide-react';
import { ExportService } from '../services/exportService';

interface ReportsViewProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  permissions: RolePermissions;
}

type ReportTab = 'bestsellers' | 'customers' | 'margins' | 'weekly';

export const ReportsView: React.FC<ReportsViewProps> = ({
  products,
  customers,
  orders,
  permissions,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('bestsellers');
  const [bestSellerSort, setBestSellerSort] = useState<'revenue' | 'quantity'>('revenue');
  const [marginSubTab, setMarginSubTab] = useState<'products' | 'orders'>('products');

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
          productStats[item.productId].revenue += item.totalPrice;
          const cost = item.costPrice * item.quantity;
          productStats[item.productId].cogs += cost;
          productStats[item.productId].profit += item.totalPrice - cost;
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
      const totalSpend = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalPaid = custOrders.reduce((sum, o) => sum + o.paidAmount, 0);
      const balance = Math.max(0, totalSpend - totalPaid);
      const aov = custOrders.length > 0 ? totalSpend / custOrders.length : 0;

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
      const retailProfit = p.retailPrice - p.costPrice;
      const retailMargin = p.retailPrice > 0 ? (retailProfit / p.retailPrice) * 100 : 0;

      const wholesaleProfit = p.wholesalePrice - p.costPrice;
      const wholesaleMargin = p.wholesalePrice > 0 ? (wholesaleProfit / p.wholesalePrice) * 100 : 0;

      const distributorProfit = p.distributorPrice - p.costPrice;
      const distributorMargin = p.distributorPrice > 0 ? (distributorProfit / p.distributorPrice) * 100 : 0;

      return {
        product: p,
        retailProfit,
        retailMargin,
        wholesaleProfit,
        wholesaleMargin,
        distributorProfit,
        distributorMargin,
      };
    });
  }, [products]);

  // Order level margins
  const orderMargins = useMemo(() => {
    return filteredOrders.map((o) => {
      let orderCost = 0;
      o.items.forEach((item) => {
        orderCost += item.costPrice * item.quantity;
      });
      const grossProfit = o.totalAmount - orderCost;
      const marginPercent = o.totalAmount > 0 ? (grossProfit / o.totalAmount) * 100 : 0;

      return {
        order: o,
        orderCost,
        grossProfit,
        marginPercent,
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

      weeks[bucket].revenue += o.totalAmount;
      weeks[bucket].ordersCount += 1;
      let cost = 0;
      o.items.forEach((i) => {
        weeks[bucket].unitsSold += i.quantity;
        cost += i.costPrice * i.quantity;
      });
      weeks[bucket].profit += o.totalAmount - cost;
    });

    return Object.values(weeks);
  }, [filteredOrders]);

  // Summary Metrics for the active date range
  const periodRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const periodOrdersCount = filteredOrders.length;
  let periodCost = 0;
  filteredOrders.forEach((o) => {
    o.items.forEach((i) => {
      periodCost += i.costPrice * i.quantity;
    });
  });
  const periodGrossProfit = periodRevenue - periodCost;
  const periodMargin = periodRevenue > 0 ? (periodGrossProfit / periodRevenue) * 100 : 0;

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
    </div>
  );
};
