import React, { useState, useEffect, useRef } from 'react';
import { Product, RolePermissions } from '../types';
import { BarcodeService } from '../services/barcodeService';
import { 
  Scan, 
  Camera, 
  QrCode, 
  Barcode as BarcodeIcon, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Package, 
  Layers, 
  X,
  Keyboard
} from 'lucide-react';

export type ScannerMode = 'scan_order' | 'scan_stock' | 'scan_lookup';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  permissions: RolePermissions;
  mode: ScannerMode;
  onSelectProductForOrder?: (product: Product, quantity: number) => void;
  onAdjustStockFromScan?: (product: Product, quantityDelta: number, note: string) => void;
  onViewProductDetails?: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  permissions,
  mode,
  onSelectProductForOrder,
  onAdjustStockFromScan,
  onViewProductDetails,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [detectedProduct, setDetectedProduct] = useState<Product | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scanQty, setScanQty] = useState<number>(10);
  const [adjustmentAction, setAdjustmentAction] = useState<'add' | 'subtract'>('add');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [isViewingLabel, setIsViewingLabel] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera when enabled
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable in sandbox', err);
      setCameraError('Camera access unavailable or declined in this environment. You can use the Quick-Scan simulator or hardware barcode input below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setDetectedProduct(null);
      setScanSuccessMessage(null);
      setIsViewingLabel(false);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // When detected product changes, generate its QR code
  useEffect(() => {
    if (detectedProduct) {
      BarcodeService.generateProductQR(detectedProduct).then(setQrDataUrl);
    }
  }, [detectedProduct]);

  if (!isOpen) return null;

  // Process a scan event
  const handleProcessScan = (codeToScan: string) => {
    const matched = BarcodeService.matchProduct(codeToScan, products);
    if (matched) {
      setDetectedProduct(matched);
      setScanSuccessMessage(`Scanned: ${matched.name} (${matched.sku})`);

      // If in order mode and already configured, user can confirm
      if (mode === 'scan_order' && onSelectProductForOrder) {
        // Play subtle sound or feedback
      }
    } else {
      alert(`No spice lot found with barcode / SKU: "${codeToScan}". Please verify lot registry.`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleProcessScan(manualInput);
    setManualInput('');
  };

  const handleConfirmOrderAdd = () => {
    if (!detectedProduct || !onSelectProductForOrder) return;
    onSelectProductForOrder(detectedProduct, scanQty);
    setScanSuccessMessage(`Added ${scanQty} ${detectedProduct.unit} of ${detectedProduct.name} to order.`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleConfirmStockAdjust = () => {
    if (!detectedProduct || !onAdjustStockFromScan) return;
    const delta = adjustmentAction === 'add' ? scanQty : -scanQty;
    onAdjustStockFromScan(detectedProduct, delta, `Barcode Scan: ${adjustmentAction === 'add' ? 'Received Shipment' : 'Deducted Lot'}`);
    setScanSuccessMessage(`Updated ${detectedProduct.name} stock by ${delta > 0 ? '+' : ''}${delta} ${detectedProduct.unit}.`);
    // Update local detected reference
    setDetectedProduct({
      ...detectedProduct,
      currentStock: Math.max(0, detectedProduct.currentStock + delta),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full my-6 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-lg">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {mode === 'scan_order'
                  ? 'Barcode & QR Scanner · Add to Sales Order'
                  : mode === 'scan_stock'
                  ? 'Barcode & QR Scanner · Warehouse Stock Update'
                  : 'Spice Lot Barcode & QR Inspection'}
              </h2>
              <p className="text-xs text-slate-500">
                Scan product tags on burlap sacks, retail jars, or cartons with camera or laser reader.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success banner */}
          {scanSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{scanSuccessMessage}</span>
            </div>
          )}

          {/* Scanner Viewport Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera / Visual Scanner Box */}
            <div className="relative aspect-4/3 bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-slate-800 text-white">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Laser aiming reticle overlay */}
                  <div className="absolute inset-0 border-2 border-amber-500/50 m-8 rounded-lg pointer-events-none flex flex-col justify-center items-center">
                    <div className="w-full h-0.5 bg-rose-500 shadow-sm shadow-rose-500 animate-pulse" />
                    <span className="text-[10px] text-amber-300 font-mono mt-2 bg-slate-900/80 px-2 py-0.5 rounded">
                      Align Barcode or QR Code
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-xs text-slate-300 font-medium">Camera Optical Scanner</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Use your device camera to scan warehouse spice labels in real time.
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-2 px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Activate Camera</span>
                  </button>
                </div>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 text-slate-300 hover:text-white text-[10px] rounded"
                >
                  Turn off camera
                </button>
              )}
            </div>

            {/* Manual Hardware Input & Fast Test Simulation */}
            <div className="flex flex-col justify-between space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manual or USB Laser Scanner Input</span>
                </label>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter or scan SKU / Barcode..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Scan
                  </button>
                </form>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Compatible with handheld USB/Bluetooth barcode guns (presses Enter automatically).
                </span>
              </div>

              {/* Fast 1-Click Test Scanners */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  1-Click Test Scanner Simulator
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {products.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProcessScan(p.barcode)}
                      className="w-full text-left p-2 rounded bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 transition-colors flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <span className="text-slate-400 ml-1 font-mono text-[10px]">{p.sku}</span>
                      </div>
                      <span className="font-mono text-[10px] text-amber-800 font-bold shrink-0">
                        {p.barcode}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Detected Product Card & Actions */}
          {detectedProduct && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-800 text-white uppercase">
                      LOT RECOGNIZED
                    </span>
                    <span className="font-mono text-xs text-slate-600">{detectedProduct.sku}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono text-xs text-slate-600">Barcode: {detectedProduct.barcode}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{detectedProduct.name}</h3>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {detectedProduct.origin} · {detectedProduct.grade} · Lot: <span className="font-mono font-medium">{detectedProduct.batchNumber}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs text-slate-500">Available Lot Balance</div>
                  <div className="text-lg font-bold text-slate-900 tabular-nums">
                    {detectedProduct.currentStock} {detectedProduct.unit}
                  </div>
                </div>
              </div>

              {/* Action based on mode */}
              {mode === 'scan_order' && (
                <div className="pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-700">Add Quantity ({detectedProduct.unit}):</label>
                    <input
                      type="number"
                      min="0.5"
                      step="any"
                      max={detectedProduct.currentStock}
                      value={scanQty}
                      onChange={(e) => setScanQty(parseFloat(e.target.value) || 1)}
                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                    />
                    <span className="text-slate-500 text-[11px]">
                      @ ${detectedProduct.wholesalePrice.toFixed(2)}/unit
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmOrderAdd}
                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    + Add to Order
                  </button>
                </div>
              )}

              {mode === 'scan_stock' && permissions.canEditInventory && (
                <div className="pt-3 border-t border-amber-200/60 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustmentAction('add')}
                        className={`px-3 py-1.5 rounded-lg border font-medium ${
                          adjustmentAction === 'add'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        + Restock Inbound
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentAction('subtract')}
                        className={`px-3 py-1.5 rounded-lg border font-medium ${
                          adjustmentAction === 'subtract'
                            ? 'bg-rose-100 border-rose-300 text-rose-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        - Deduct / Outbound
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="font-semibold text-slate-700">Qty ({detectedProduct.unit}):</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={scanQty}
                        onChange={(e) => setScanQty(parseFloat(e.target.value) || 1)}
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmStockAdjust}
                        className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        Apply Stock Update
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View/Print Printable Barcode Tag */}
              <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsViewingLabel(!isViewingLabel)}
                  className="text-amber-900 hover:text-amber-950 font-medium inline-flex items-center gap-1.5"
                >
                  <BarcodeIcon className="w-4 h-4" />
                  <span>{isViewingLabel ? 'Hide Barcode & QR Sticker' : 'View Printable Barcode Tag'}</span>
                </button>

                {onViewProductDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewProductDetails(detectedProduct);
                      onClose();
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    View in Inventory Master
                  </button>
                )}
              </div>

              {/* Printable Barcode & QR Label Sheet */}
              {isViewingLabel && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm print:m-0 print:border-none space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Warehouse Spice Lot Label
                    </span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Sticker</span>
                    </button>
                  </div>

                  <div className="border-2 border-slate-900 p-4 rounded-lg bg-white text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        SAFFRON & BARK SPICE CO.
                      </div>
                      <div className="text-base font-bold text-slate-900">{detectedProduct.name}</div>
                      <div className="text-xs text-slate-600">
                        Lot: <strong className="font-mono">{detectedProduct.batchNumber}</strong> · Origin: {detectedProduct.origin}
                      </div>
                      <div className="text-xs text-slate-600">
                        Grade: {detectedProduct.grade} · Unit: {detectedProduct.unit}
                      </div>

                      {/* Code-128 SVG Barcode */}
                      <div className="pt-2">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: BarcodeService.generateBarcodeSVG(detectedProduct.barcode, 220, 55),
                          }}
                        />
                      </div>
                    </div>

                    {/* QR Code Container */}
                    {qrDataUrl && (
                      <div className="text-center shrink-0">
                        <img
                          src={qrDataUrl}
                          alt={`QR code for ${detectedProduct.name}`}
                          className="w-28 h-28 border border-slate-200 p-1 rounded"
                        />
                        <div className="text-[10px] font-mono text-slate-500 mt-1">Scan for Provenance</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Scanning accelerates warehouse check-in, batch tracking, and invoice line creation.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
