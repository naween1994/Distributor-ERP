import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Smartphone, 
  Download, 
  QrCode, 
  Check, 
  Copy, 
  ExternalLink, 
  Database, 
  Sparkles, 
  Wifi, 
  Camera, 
  MapPin, 
  ShieldCheck, 
  Terminal, 
  FileCode, 
  FolderDown, 
  RefreshCw,
  X
} from 'lucide-react';
import { LIVE_BACKEND_URL, getBackendBaseUrl, ApiService, ServerHealth } from '../services/apiService';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverHealth: ServerHealth | null;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({
  isOpen,
  onClose,
  serverHealth,
}) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'backend'>('pwa');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [customBackendInput, setCustomBackendInput] = useState(() => {
    return localStorage.getItem('na_dist_backend_url') || '';
  });
  const [saveBackendMsg, setSaveBackendMsg] = useState('');

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : LIVE_BACKEND_URL;
  const effectiveBackend = getBackendBaseUrl() || LIVE_BACKEND_URL;

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Generate QR Code for easy phone scanning
  useEffect(() => {
    if (isOpen) {
      const targetUrl = currentAppUrl.startsWith('http') ? currentAppUrl : LIVE_BACKEND_URL;
      QRCode.toDataURL(targetUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#451a03',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, currentAppUrl]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCmd(id);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBackendInput.trim()) {
      localStorage.setItem('na_dist_backend_url', customBackendInput.trim());
      setSaveBackendMsg('Saved! Native app and APK will connect to this cloud endpoint.');
    } else {
      localStorage.removeItem('na_dist_backend_url');
      setSaveBackendMsg('Reset to default deployed cloud backend.');
    }
    setTimeout(() => setSaveBackendMsg(''), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header Banner */}
        <div className="p-6 bg-linear-to-r from-amber-950 via-amber-900 to-amber-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-800/80 border border-amber-600/40 rounded-xl shadow-inner text-amber-200">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">NA Distributors Mobile App & APK</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-700/60 text-amber-100 border border-amber-600/50">
                  Android & iOS
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Install as a native mobile app or compile an Android APK. Seamlessly shares the exact same backend and MongoDB database.
              </p>
            </div>
          </div>

          {/* Unified Database Status Pill */}
          <div className="mt-4 p-3 bg-black/30 rounded-xl border border-amber-700/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Backend Database:{' '}
                <strong className="text-emerald-300">
                  {serverHealth?.isMongoConnected ? 'MongoDB Atlas (Real-Time Synced)' : 'In-Memory / Atlas Ready'}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-amber-300 font-mono hidden sm:inline">
              DB: {serverHealth?.dbName || 'na_distributors_erp'}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-5 border-b border-amber-800/60 pb-0">
            <button
              onClick={() => setActiveTab('pwa')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
                activeTab === 'pwa'
                  ? 'bg-white text-slate-900 border-amber-500'
                  : 'text-amber-200 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Instant Install & QR Code</span>
            </button>

            <button
              onClick={() => setActiveTab('apk')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
                activeTab === 'apk'
                  ? 'bg-white text-slate-900 border-amber-500'
                  : 'text-amber-200 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Android APK Build</span>
            </button>

            <button
              onClick={() => setActiveTab('backend')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
                activeTab === 'backend'
                  ? 'bg-white text-slate-900 border-amber-500'
                  : 'text-amber-200 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Cloud API URL</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: INSTANT INSTALL & QR */}
          {activeTab === 'pwa' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                {/* QR Code Column */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Scan to open ERP mobile app" className="w-48 h-48 rounded-lg" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                        Generating QR Code...
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-3">Scan with Phone Camera</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Opens directly on Android or iPhone with camera scanner & GPS.
                  </p>
                </div>

                {/* Instant Actions & Guide */}
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                      <span>Progressive Web App (PWA)</span>
                    </h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Installs as an independent app on Android & iOS homescreens without going through Google Play or App Store.
                    </p>

                    {installPrompt && !isInstalled && (
                      <button
                        onClick={handleInstallClick}
                        className="w-full mt-2 py-2 px-3 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Install Mobile App Now</span>
                      </button>
                    )}

                    {isInstalled && (
                      <div className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 p-2 rounded-lg flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>App is already running in Standalone Mode!</span>
                      </div>
                    )}
                  </div>

                  {/* Manual install guide */}
                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="font-semibold text-slate-800">How to Install from Phone Browser:</div>
                    <ul className="space-y-1.5 text-[11px] list-disc list-inside">
                      <li>
                        <strong className="text-slate-700">Android Chrome:</strong> Tap top-right menu <code className="bg-slate-200 px-1 rounded">⋮</code> &gt; <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
                      </li>
                      <li>
                        <strong className="text-slate-700">iOS Safari:</strong> Tap the <strong>Share</strong> button (box with up arrow) &gt; <strong>"Add to Home Screen"</strong>.
                      </li>
                      <li>
                        <strong className="text-slate-700">Field Delivery:</strong> The mobile app works offline and uses phone camera to scan barcodes and device GPS to pin delivery locations.
                      </li>
                    </ul>
                  </div>

                  {/* Copy Link Button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentAppUrl}
                      className="w-full text-xs px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-mono"
                    />
                    <button
                      onClick={() => handleCopy(currentAppUrl, 'link')}
                      className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Features Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                  <Camera className="w-5 h-5 text-amber-800 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Camera Barcode</div>
                    <div className="text-[10px] text-slate-500">Scan spice packets</div>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">GPS Geolocation</div>
                    <div className="text-[10px] text-slate-500">Pin customer stores</div>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-sky-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Live Atlas Sync</div>
                    <div className="text-[10px] text-slate-500">Same MongoDB db</div>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                  <Wifi className="w-5 h-5 text-indigo-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Offline Caching</div>
                    <div className="text-[10px] text-slate-500">Service Worker active</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID APK BUILD */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Capacitor Native Android Project Ready
                  </h4>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  The complete native Android project has been generated in <code className="font-mono bg-emerald-100/80 px-1.5 py-0.5 rounded text-emerald-950 font-bold">/android</code> with package identifier <code className="font-mono font-bold">com.nadistributors.spicerp</code>.
                  It is configured to communicate with your live cloud backend so the APK and Web ERP stay 100% synchronized with MongoDB.
                </p>
              </div>

              {/* Build Instructions */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  How to Build the .APK File:
                </div>

                {/* Option A: Android Studio */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Option A: Build with Android Studio (Recommended)
                    </span>
                    <button
                      onClick={() => handleCopy('npx cap open android', 'cmd-open')}
                      className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1"
                    >
                      {copiedCmd === 'cmd-open' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy command</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 text-amber-300 font-mono text-[11px] rounded-lg overflow-x-auto">
                    npm run build &amp;&amp; npx cap sync android &amp;&amp; npx cap open android
                  </pre>
                  <p className="text-[11px] text-slate-500">
                    In Android Studio: Click <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. Your APK will be in <code className="text-slate-700 font-mono">android/app/build/outputs/apk/debug/app-debug.apk</code>.
                  </p>
                </div>

                {/* Option B: Terminal Gradle CLI */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Option B: Direct Command Line (Terminal / CI)
                    </span>
                    <button
                      onClick={() => handleCopy('cd android && ./gradlew assembleDebug', 'cmd-gradle')}
                      className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1"
                    >
                      {copiedCmd === 'cmd-gradle' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy command</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 text-amber-300 font-mono text-[11px] rounded-lg overflow-x-auto">
                    cd android &amp;&amp; ./gradlew assembleDebug
                  </pre>
                </div>
              </div>

              {/* Native Configuration Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Package Name:</span>
                  <span className="font-bold text-slate-900">com.nadistributors.spicerp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">App Name:</span>
                  <span className="font-bold text-slate-900">NA Distributors Spice ERP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Platform:</span>
                  <span className="font-bold text-slate-900">Android SDK 34+ (Android 14 ready)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cloud API Server:</span>
                  <span className="font-bold text-emerald-800 truncate max-w-[260px]">{effectiveBackend}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKEND API CONFIGURATION */}
          {activeTab === 'backend' && (
            <div className="space-y-4">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-sky-700" />
                  <span>Shared Cloud Backend Endpoint</span>
                </h4>
                <p className="text-xs text-sky-900 leading-relaxed">
                  Both your web browser and the mobile APK communicate with the same Express server. All invoice creations, product updates, stock adjustments, and customer payments go directly to your centralized MongoDB database in real-time.
                </p>
              </div>

              <form onSubmit={handleSaveBackendUrl} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Configured Cloud Backend URL
                  </label>
                  <input
                    type="url"
                    value={customBackendInput}
                    onChange={(e) => setCustomBackendInput(e.target.value)}
                    placeholder={LIVE_BACKEND_URL}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Default: <code className="font-mono text-slate-700">{LIVE_BACKEND_URL}</code>
                  </p>
                </div>

                {saveBackendMsg && (
                  <div className="p-2.5 bg-emerald-100 text-emerald-900 text-xs rounded-lg font-medium border border-emerald-300">
                    {saveBackendMsg}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    Save Backend Setting
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomBackendInput('');
                      localStorage.removeItem('na_dist_backend_url');
                      setSaveBackendMsg('Reset to default cloud server.');
                      setTimeout(() => setSaveBackendMsg(''), 3000);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              </form>

              {/* Health Ping test */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Live Health Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${serverHealth ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800'}`}>
                    {serverHealth?.status || 'Unknown'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                  <div>Server Engine: {serverHealth?.server || 'Express (Node.js)'}</div>
                  <div>Database Provider: {serverHealth?.database || 'MongoDB Atlas'}</div>
                  <div>Synced Products: {serverHealth?.mongoStats?.counts?.products ?? 15}</div>
                  <div>Timestamp: {serverHealth?.timestamp || new Date().toISOString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>NA Distributors ERP · Powered by MongoDB &amp; Capacitor</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
