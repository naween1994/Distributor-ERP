import React, { useState } from 'react';
import { Product, RolePermissions, SpiceUnit } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  Filter, 
  Download, 
  Edit3, 
  Layers, 
  Lock,
  Sparkles,
  RotateCcw,
  Barcode,
  CheckCircle2,
  DollarSign,
  Trash2
} from 'lucide-react';
import { ExportService } from '../services/exportService';
import { DecimalUtils } from '../services/decimalUtils';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

interface InventoryViewProps {
  products: Product[];
  permissions: RolePermissions;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onAdjustStock: (productId: string, adjustmentQty: number, note: string) => void;
  onResetCatalog?: () => void;
  onDeleteProduct?: (productId: string) => void;
  adminDeletePassword?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  permissions,
  onAddProduct,
  onUpdateProduct,
  onAdjustStock,
  onResetCatalog,
  onDeleteProduct,
  adminDeletePassword = 'Vista',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<Product | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<Product>>({
    sku: '',
    name: '',
    botanicalName: '',
    origin: 'Sri Lanka',
    grade: 'Export Grade Fine Powder',
    unit: '100g',
    skuSize: '100g',
    initialStock: 250,
    currentStock: 250,
    reorderThreshold: 50,
    costPrice: 120.0,
    retailPrice: 180.0,
    wholesalePrice: 144.0,
    distributorPrice: 141.6,
    retailerMarginPct: 20.0,
    dealerCommission: 12.0,
    distributorMarginPct: 11.11,
    batchNumber: `LOT-${Math.floor(100 + Math.random() * 900)}-26`,
    harvestDate: new Date().toISOString().slice(0, 10),
    description: '',
    category: 'Powder',
  });

  // Form state for stock adjustment
  const [adjustmentQty, setAdjustmentQty] = useState<number>(50);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentNote, setAdjustmentNote] = useState('');

  // Extract unique categories dynamically
  const uniqueCategories = [
    'All',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  // Filtering
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm)) ||
      (p.botanicalName && p.botanicalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.origin && p.origin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesLowStock = !showOnlyLowStock || p.currentStock <= p.reorderThreshold;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const lowStockCount = products.filter((p) => p.currentStock <= p.reorderThreshold).length;

  const handleOpenAdd = () => {
    setSelectedProduct(null);
    const randCode = '89010020' + Math.floor(1000 + Math.random() * 9000);
    const defaultCost = 130.0;
    const defaultStock = 200;
    setFormData({
      sku: `SPX-${Math.floor(100 + Math.random() * 900)}`,
      barcode: randCode,
      name: '',
      botanicalName: '',
      origin: 'Sri Lanka',
      grade: 'Export Grade',
      unit: '100g',
      skuSize: '100g',
      initialStock: defaultStock,
      currentStock: defaultStock,
      reorderThreshold: 40,
      costPrice: defaultCost,
      batchCost: DecimalUtils.multiply(defaultStock, defaultCost),
      retailPrice: 180.0,
      wholesalePrice: 144.0,
      distributorPrice: 141.5,
      retailerMarginPct: 20.0,
      dealerCommission: 13.0,
      distributorMarginPct: 11.11,
      batchNumber: `LOT-SPX-${Math.floor(100 + Math.random() * 900)}-26`,
      harvestDate: new Date().toISOString().slice(0, 10),
      description: '',
      category: 'Powder',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    const stock = Number(product.initialStock || product.currentStock) || 0;
    const computedLotVal = DecimalUtils.calculateLotValue(
      product.initialStock || product.currentStock,
      product.initialStock,
      product.batchCost,
      product.costPrice
    );

    setFormData({
      ...product,
      batchCost: computedLotVal > 0 ? computedLotVal : DecimalUtils.multiply(stock, product.costPrice || 0),
    });
    setIsEditModalOpen(true);
  };

  const handleOpenAdjust = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentQty(25);
    setAdjustmentType('add');
    setAdjustmentNote('New production packaging run received at warehouse dock');
    setIsAdjustModalOpen(true);
  };

  // Helper to auto-calculate margins & tier prices
  const handleAutoComputeMargins = () => {
    const cost = Number(formData.costPrice) || 0;
    const mrp = Number(formData.retailPrice) || 0;

    if (mrp > 0) {
      // Wholesale Price typically gives ~20% margin to retailer
      const wholesale = DecimalUtils.multiply(mrp, 0.8);
      // Distributor Selling Price (lower than wholesale for bulk volume)
      const dist = DecimalUtils.multiply(wholesale, 0.985);
      const retailerMargin = DecimalUtils.round(((mrp - wholesale) / mrp) * 100);
      const dealerComm = DecimalUtils.percent(cost, 10);

      setFormData((prev) => ({
        ...prev,
        wholesalePrice: wholesale,
        distributorPrice: dist,
        retailerMarginPct: retailerMargin,
        dealerCommission: dealerComm,
        distributorMarginPct: 11.11,
        batchCost: prev.currentStock ? DecimalUtils.multiply(prev.currentStock, cost) : undefined,
      }));
    }
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) return;

    const cost = DecimalUtils.round(Number(formData.costPrice) || 0);
    const retail = DecimalUtils.round(Number(formData.retailPrice) || 0);
    const wholesale = DecimalUtils.round(Number(formData.wholesalePrice) || 0);
    const distributor = DecimalUtils.round(Number(formData.distributorPrice) || 0);
    const initStock = Number(formData.initialStock) || 0;
    const currStock = Number(formData.currentStock) || 0;

    // Preserve exact batchCost cents if provided, without rounding drift
    let effectiveBatchCost = Number(formData.batchCost) || 0;
    if (effectiveBatchCost <= 0) {
      effectiveBatchCost = DecimalUtils.multiply(initStock || currStock, cost);
    } else if (initStock > 0 && cost > 0) {
      const derivedUnit = effectiveBatchCost / initStock;
      // Only recalculate batchCost if the cost was intentionally changed to a new price (> 2 cents difference)
      if (Math.abs(derivedUnit - cost) > 0.02) {
        effectiveBatchCost = DecimalUtils.multiply(initStock, cost);
      }
    }

    if (selectedProduct) {
      // Update
      onUpdateProduct({
        ...selectedProduct,
        ...(formData as Product),
        costPrice: cost,
        retailPrice: retail,
        wholesalePrice: wholesale,
        distributorPrice: distributor,
        batchCost: DecimalUtils.round(effectiveBatchCost),
      });
    } else {
      // Create
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        sku: formData.sku || 'SKU-000',
        barcode: formData.barcode || '89010020' + Math.floor(1000 + Math.random() * 9000),
        name: formData.name || 'Unnamed Spice',
        category: formData.category || 'Powder',
        skuSize: formData.skuSize || formData.unit || '100g',
        botanicalName: formData.botanicalName || '',
        origin: formData.origin || 'Sri Lanka',
        grade: formData.grade || 'Standard Grade',
        unit: (formData.unit as SpiceUnit) || '100g',
        initialStock: initStock,
        currentStock: currStock,
        reorderThreshold: Number(formData.reorderThreshold) || 20,
        costPrice: cost,
        retailPrice: retail,
        wholesalePrice: wholesale,
        distributorPrice: distributor,
        retailerMarginPct: formData.retailerMarginPct,
        dealerCommission: formData.dealerCommission,
        distributorMarginPct: formData.distributorMarginPct,
        batchCost: effectiveBatchCost,
        batchNumber: formData.batchNumber || `LOT-${Date.now()}`,
        harvestDate: formData.harvestDate || new Date().toISOString().slice(0, 10),
        description: formData.description || '',
      };
      onAddProduct(newProduct);
    }
    setIsEditModalOpen(false);
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const effectiveQty = adjustmentType === 'add' ? Number(adjustmentQty) : -Number(adjustmentQty);
    onAdjustStock(selectedProduct.id, effectiveQty, adjustmentNote);
    setIsAdjustModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Spice Inventory & Packet Catalog</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              {products.length} Products
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your spice varieties, 100g/50g/25g retail packets, wholesale & distributor price schedules, and stock levels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetCatalog && (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Reset catalog back to initial 15 standard spices"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset 15 Spices</span>
            </button>
          )}

          <button
            onClick={() => ExportService.exportProductsCSV(products)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Export Products as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {permissions.canEditInventory && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-800 rounded-lg hover:bg-amber-900 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Spice</span>
            </button>
          )}
        </div>
      </div>

      {/* Reset Confirmation Banner */}
      {resetConfirmOpen && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Restore the pristine 15-product spice catalog (Chilli 100g/50g, Curry 100g/50g, Turmeric 100g/50g/25g, Pepper 100g/50g/25g, Roasted Chilli/Curry, Flakes 100g/50g, Coriander 50g)?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setResetConfirmOpen(false)}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onResetCatalog?.();
                setResetConfirmOpen(false);
              }}
              className="px-3 py-1 bg-amber-800 text-white font-semibold rounded-lg hover:bg-amber-900"
            >
              Confirm Restore
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, barcode, category, or origin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Dynamic Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Low Stock Toggle */}
          <button
            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showOnlyLowStock
                ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${showOnlyLowStock ? 'text-rose-700' : 'text-slate-400'}`} />
            <span>Low Stock ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider">
                <th className="py-3 px-4">SPICE / COMMODITY</th>
                <th className="py-3 px-4">BARCODE / SKU</th>
                <th className="py-3 px-4 text-center">CATEGORY / SIZE</th>
                <th className="py-3 px-4 text-right">PACKET STOCK</th>
                {permissions.canViewCostPrices && (
                  <th className="py-3 px-4 text-right">COST PRICE (LKR)</th>
                )}
                <th className="py-3 px-4 text-right">TIER PRICING (LKR)</th>
                <th className="py-3 px-4 text-right">LOT VALUE (LKR)</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No spices found matching your filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or category filter.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.reorderThreshold;
                  // Safe lot valuation using DecimalUtils: handles exact manufacturer batch cost (e.g. Rs. 32,208.75) without rounding drift
                  const lotValuation = DecimalUtils.calculateLotValue(
                    p.currentStock,
                    p.initialStock,
                    p.batchCost,
                    permissions.canViewCostPrices ? p.costPrice : p.retailPrice
                  );

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product Name & Botanical */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span className="text-slate-600">{p.origin}</span>
                          {p.grade && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="italic">{p.grade}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Barcode & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-amber-900">{p.sku}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          <span>{p.barcode || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Category & Unit */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                          {p.category || 'Powder'}
                        </span>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {p.skuSize || p.unit}
                        </div>
                      </td>

                      {/* Stock Level with Progress Bar */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`font-mono font-bold tabular-nums text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {p.currentStock}
                          </span>
                          <span className="text-slate-500 text-[11px]">/ {p.initialStock} {p.unit}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Reorder min: {p.reorderThreshold} {p.unit}
                        </div>
                        {isLow && (
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded mt-1">
                            LOW STOCK
                          </span>
                        )}
                      </td>

                      {/* Cost Price (Restricted by RBAC) */}
                      {permissions.canViewCostPrices && (
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-700 tabular-nums">
                          <div className="font-semibold text-slate-900">{DecimalUtils.formatLKR(p.costPrice)}</div>
                          {(() => {
                            const lotVal = DecimalUtils.calculateLotValue(
                              p.currentStock,
                              p.initialStock,
                              p.batchCost,
                              p.costPrice
                            );
                            return lotVal > 0 ? (
                              <div
                                className="text-[10px] text-slate-500 font-mono"
                                title={`Lot valuation (${p.currentStock}/${p.initialStock} ${p.unit}): ${DecimalUtils.formatLKR(lotVal)}`}
                              >
                                Lot: {DecimalUtils.formatLKR(lotVal)}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-normal">
                                per {p.unit}
                              </div>
                            );
                          })()}
                        </td>
                      )}

                      {/* Tier Pricing */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="text-slate-900 font-semibold">
                          {DecimalUtils.formatLKR(p.retailPrice)} <span className="text-[10px] text-slate-400 font-normal">MRP</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {DecimalUtils.formatLKR(p.wholesalePrice)} <span className="text-[10px] text-slate-400">Whl</span> ·{' '}
                          <span className="text-emerald-700 font-semibold">{DecimalUtils.formatLKR(p.distributorPrice)}</span> <span className="text-[10px] text-slate-400">Dist</span>
                        </div>
                      </td>

                      {/* Valuation */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        <div className="text-slate-900">{DecimalUtils.formatLKR(lotValuation)}</div>
                        <div className="text-[10px] font-mono">
                          {p.currentStock === p.initialStock ? (
                            <span className="text-emerald-700 font-medium">Exact Batch Value</span>
                          ) : (
                            <span className="text-slate-400 font-normal">{p.currentStock} {p.unit} in stock</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {permissions.canEditInventory ? (
                            <>
                              <button
                                onClick={() => handleOpenAdjust(p)}
                                className="px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                                title="Adjust Stock Quantity"
                              >
                                Stock ±
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                                title="Edit Product Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {permissions.canDeleteRecords && onDeleteProduct && (
                                <button
                                  onClick={() => setDeleteTargetProduct(p)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Delete Product (Master Password Protected)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Lock className="w-3 h-3" /> View Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedProduct ? 'Edit Spice Product' : 'Add New Spice Variety'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure packet sizes, pricing tiers for retailers & distributors, and initial stock.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Spice Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Cardamom Powder 100g or Cinnamon Quills 100g"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. CAR-POW-100G"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode (EAN-13 / Code 128) *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 890100201116"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category || 'Powder'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="Powder">Powder</option>
                    <option value="Flakes">Flakes</option>
                    <option value="Whole">Whole</option>
                    <option value="Seeds">Seeds</option>
                    <option value="Ground">Ground</option>
                    <option value="Blend">Curry Blend</option>
                    <option value="Exotic">Exotic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pack Size / Unit</label>
                  <select
                    value={formData.unit || '100g'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as SpiceUnit, skuSize: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  >
                    <option value="100g">100g packet</option>
                    <option value="50g">50g packet</option>
                    <option value="25g">25g sachet</option>
                    <option value="250g">250g pouch</option>
                    <option value="500g">500g pouch</option>
                    <option value="1kg">1kg bag</option>
                    <option value="packet">packet (generic)</option>
                    <option value="kg">kg (bulk)</option>
                    <option value="sack_25kg">25kg sack</option>
                    <option value="jar_500g">500g glass jar</option>
                    <option value="box_10kg">10kg carton</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Origin</label>
                  <input
                    type="text"
                    value={formData.origin || ''}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="e.g. Matale, Sri Lanka"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quality Grade</label>
                  <input
                    type="text"
                    value={formData.grade || ''}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g. Grade 1 Pure Fine Ground"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={formData.batchNumber || ''}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="e.g. LOT-CP100-26"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Stock Levels */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Inventory Stock Quantities ({formData.unit || 'packets'})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Initial Stock</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.initialStock ?? ''}
                      onChange={(e) => {
                        const newInit = parseFloat(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          initialStock: newInit,
                          batchCost: prev.costPrice ? DecimalUtils.multiply(newInit, prev.costPrice) : prev.batchCost,
                        }));
                      }}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Current Stock (Packets)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.currentStock ?? ''}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Reorder Alert Threshold</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.reorderThreshold ?? ''}
                      onChange={(e) => setFormData({ ...formData, reorderThreshold: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Tier Pricing in LKR */}
              <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Cost & Tier Selling Prices (LKR)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAutoComputeMargins}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100/80 hover:bg-amber-200 rounded transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Auto-Compute Wholesale & Dist Prices</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-semibold">Cost Price (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPrice ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const stock = Number(formData.initialStock || formData.currentStock) || 0;
                        setFormData((prev) => {
                          const currentDerived = (stock > 0 && prev.batchCost) ? (prev.batchCost / stock) : 0;
                          // If entered value is within 0.02 of current derived unit cost, retain exact manufacturer batchCost
                          const keepExactBatch = Boolean(prev.batchCost && Math.abs(currentDerived - val) <= 0.02);
                          return {
                            ...prev,
                            costPrice: val,
                            batchCost: keepExactBatch ? prev.batchCost : (stock > 0 ? DecimalUtils.multiply(stock, val) : prev.batchCost),
                          };
                        });
                      }}
                      placeholder="e.g. 128.84"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-semibold">Retail Price MRP (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.retailPrice ?? ''}
                      onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 180.00"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-semibold">Wholesale / Retailer (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wholesalePrice ?? ''}
                      onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 143.00"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-semibold">Distributor Price (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.distributorPrice ?? ''}
                      onChange={(e) => setFormData({ ...formData, distributorPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 141.57"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900 text-emerald-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-semibold">
                      Total LOT / Batch Valuation (LKR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.batchCost ?? ''}
                      onChange={(e) => {
                        const newBatch = parseFloat(e.target.value) || 0;
                        const stock = Number(formData.initialStock || formData.currentStock) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          batchCost: newBatch,
                          costPrice: stock > 0 ? DecimalUtils.round(newBatch / stock) : prev.costPrice,
                        }));
                      }}
                      placeholder="e.g. 32208.75"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Exact manufacturer invoice value for {formData.initialStock || formData.currentStock || 0} packets @ {DecimalUtils.formatLKR(formData.costPrice || 0)}
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                    <div>
                      <div className="font-semibold text-slate-800">Precision Verification</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Unit Cost: <span className="font-mono font-bold text-slate-900">{DecimalUtils.formatLKR(formData.costPrice || 0)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Full Lot Value: <span className="font-mono font-bold text-amber-900">{DecimalUtils.formatLKR(formData.batchCost || DecimalUtils.multiply(formData.currentStock || 0, formData.costPrice || 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-600">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-slate-400">Retailer Margin:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {formData.retailPrice && formData.wholesalePrice
                        ? DecimalUtils.round(((formData.retailPrice - formData.wholesalePrice) / formData.retailPrice) * 100).toFixed(1) + '%'
                        : '20.0%'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-slate-400">Dealer Commission:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {DecimalUtils.formatLKR(formData.costPrice ? DecimalUtils.percent(formData.costPrice, 10) : 12.87)}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-slate-400">Distributor Margin:</span>{' '}
                    <span className="font-mono font-bold text-emerald-700">11.11%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product & Quality Notes</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Packaging pouch details, moisture barrier, aromatic notes..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <div>
                  {selectedProduct && permissions.canDeleteRecords && onDeleteProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedProduct;
                        setIsEditModalOpen(false);
                        setDeleteTargetProduct(target);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Product</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition-colors"
                  >
                    {selectedProduct ? 'Save Changes' : 'Register Spice Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full shadow-xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Adjust Physical Stock</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedProduct.sku} · {selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Balance:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedProduct.currentStock} {selectedProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                      adjustmentType === 'add'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    + Production / Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('subtract')}
                    className={`py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                      adjustmentType === 'subtract'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    - Spoilage / Shrinkage
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity ({selectedProduct.unit})</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Reference Note</label>
                <input
                  type="text"
                  required
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="e.g. New packaging batch PO-2026-90, QC passed"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Master Password Protected Product Deletion Modal */}
      {deleteTargetProduct && onDeleteProduct && (
        <AdminDeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteTargetProduct(null)}
          onConfirm={() => {
            onDeleteProduct(deleteTargetProduct.id);
            setDeleteTargetProduct(null);
          }}
          recordType="Spice Product"
          recordName={`${deleteTargetProduct.name} (${deleteTargetProduct.skuSize})`}
          recordDetails={`SKU: ${deleteTargetProduct.sku} · Barcode: ${deleteTargetProduct.barcode} · Batch: ${deleteTargetProduct.batchNumber} · Current Stock: ${deleteTargetProduct.currentStock} ${deleteTargetProduct.unit}`}
          expectedPassword={adminDeletePassword}
        />
      )}
    </div>
  );
};
