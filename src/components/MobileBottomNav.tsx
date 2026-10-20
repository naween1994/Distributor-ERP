import React from 'react';
import { 
  Layers, 
  Package, 
  ShoppingCart, 
  Users, 
  Scan, 
  Smartphone,
  BarChart3
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenMobileModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  onOpenScanner,
  onOpenMobileModal,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg safe-area-bottom">
      <button
        onClick={() => setCurrentTab('dashboard')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
          currentTab === 'dashboard' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Layers className="w-5 h-5 mb-0.5" />
        <span>Home</span>
      </button>

      <button
        onClick={() => setCurrentTab('inventory')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
          currentTab === 'inventory' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Package className="w-5 h-5 mb-0.5" />
        <span>Spices</span>
      </button>

      {/* Floating Center Scanner Button */}
      <button
        onClick={onOpenScanner}
        className="flex flex-col items-center justify-center -mt-5 p-2 bg-amber-800 text-amber-100 rounded-full shadow-lg border-2 border-white hover:bg-amber-900 active:scale-95 transition-transform"
        title="Scan Barcode / QR Code"
      >
        <Scan className="w-6 h-6" />
        <span className="text-[9px] font-bold mt-0.5">Scan</span>
      </button>

      <button
        onClick={() => setCurrentTab('orders')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
          currentTab === 'orders' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <ShoppingCart className="w-5 h-5 mb-0.5" />
        <span>Orders</span>
      </button>

      <button
        onClick={() => setCurrentTab('customers')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
          currentTab === 'customers' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span>Clients</span>
      </button>

      <button
        onClick={onOpenMobileModal}
        className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
        title="Mobile App & Android APK"
      >
        <Smartphone className="w-5 h-5 mb-0.5 text-emerald-700" />
        <span>APK / App</span>
      </button>
    </div>
  );
};
