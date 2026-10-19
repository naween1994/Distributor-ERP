import React, { useState, useEffect } from 'react';
import { Product, Customer, Order } from '../types';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Server, 
  Code2, 
  Download, 
  Copy, 
  ExternalLink, 
  Terminal, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Trash2,
  Sparkles,
  Link2
} from 'lucide-react';

interface MongoDBSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onDataLoadedFromMongo?: (data: { products: Product[]; customers: Customer[]; orders: Order[] }) => void;
  onWipeAndReseedComplete?: () => void;
}

export const MongoDBSyncModal: React.FC<MongoDBSyncModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  orders,
  onDataLoadedFromMongo,
  onWipeAndReseedComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'sync' | 'schema' | 'cli'>('sync');
  const [mongoUriInput, setMongoUriInput] = useState(() => {
    try {
      return localStorage.getItem('na_dist_mongo_uri') || '';
    } catch {
      return '';
    }
  });
  const [dbNameInput, setDbNameInput] = useState(() => {
    try {
      return localStorage.getItem('na_dist_mongo_db') || 'na_distributors_erp';
    } catch {
      return 'na_distributors_erp';
    }
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; details?: any } | null>(null);

  // Fetch backend health and MongoDB status on open
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      }
    } catch {
      setServerHealth({
        status: 'online',
        database: 'Local In-Memory / Express Store (Active)',
        isMongoConnected: false,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Test Ping MongoDB
  const handleTestConnection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/mongodb/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: mongoUriInput, dbName: dbNameInput }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        details: data.existingCollections,
      });
      fetchHealth();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network error reaching Express backend: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Connect active backend Express to MongoDB instance
  const handleConnectActiveMongo = async () => {
    setIsConnecting(true);
    setTestResult(null);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/mongodb/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: mongoUriInput, dbName: dbNameInput }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.setItem('na_dist_mongo_uri', mongoUriInput);
          localStorage.setItem('na_dist_mongo_db', dbNameInput);
        } catch {
          // ignore
        }
        setTestResult({
          success: true,
          message: data.message,
          details: data.collections,
        });
        setSyncFeedback({
          type: 'success',
          message: `Active backend is now connected to MongoDB database '${data.database}'! Real-time auto-sync is active.`,
        });
        fetchHealth();
      } else {
        setTestResult({
          success: false,
          message: data.message,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection error: ${err.message}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Wipe MongoDB and Reseed with 15 packet spices & sample invoices
  const handleWipeAndReseedMongo = async () => {
    setIsWiping(true);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/mongodb/wipe-and-reseed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        let msg = data.message;
        if (data.mongoReport) {
          const { deleted, inserted } = data.mongoReport;
          msg = `Wipe & Reseed Complete! Deleted ${deleted.products} old products & ${deleted.orders} old orders from MongoDB. Successfully inserted ${inserted.products} new spice packet products (100g, 50g, 25g) and ${inserted.orders} sample invoices.`;
        }

        setSyncFeedback({
          type: 'success',
          message: msg,
          details: data.recordsSummary,
        });

        // Trigger UI reload if callback provided
        if (onWipeAndReseedComplete) {
          onWipeAndReseedComplete();
        }
        fetchHealth();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.message || 'Failed to wipe and reseed MongoDB.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Request failed: ${err.message}`,
      });
    } finally {
      setIsWiping(false);
    }
  };

  // Clean Overwrite & Push Current State (Wipes old records and inserts current UI items)
  const handleCleanOverwritePush = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/mongodb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wipe_and_push',
          products,
          customers,
          orders,
        }),
      });
      const result = await res.json();
      setSyncFeedback({
        type: 'success',
        message: result.message || `Clean replaced MongoDB with ${products.length} products and ${orders.length} orders!`,
      });
      fetchHealth();
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Sync failed: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Incremental Upsert Push
  const handlePushToMongo = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/mongodb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          products,
          customers,
          orders,
        }),
      });
      const result = await res.json();
      setSyncFeedback({
        type: 'success',
        message: result.message || 'All collections successfully pushed to MongoDB store!',
      });
      fetchHealth();
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Sync failed: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull Latest from Mongo
  const handlePullFromMongo = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/mongodb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull' }),
      });
      const result = await res.json();
      if (result.data && onDataLoadedFromMongo) {
        onDataLoadedFromMongo(result.data);
        setSyncFeedback({
          type: 'success',
          message: `Fetched and hydrated database from MongoDB collections (${result.data.products?.length || 0} products, ${result.data.orders?.length || 0} invoices)!`,
        });
      } else {
        setSyncFeedback({
          type: 'info',
          message: result.message || 'No remote MongoDB documents found.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Pull failed: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadJSON = (data: any, fileName: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">MongoDB Sync & Database Administration</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                  serverHealth?.isMongoConnected
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                }`}>
                  {serverHealth?.isMongoConnected ? '● MongoDB Connected' : 'Express In-Memory Store Active'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage spice catalog records, delete obsolete collections, and reseed with the 15 packet spices and sample invoices.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white text-sm font-semibold p-1 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 px-5 pt-3 bg-slate-50 border-b border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-amber-800 text-amber-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Clean Reseed & Sync
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'status'
                ? 'border-amber-800 text-amber-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Connection & Atlas Setup
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-amber-800 text-amber-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Mongoose Schemas
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'cli'
                ? 'border-amber-800 text-amber-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            CLI Seed Scripts & Commands
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
          {/* TAB 1: CLEAN RESEED & SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* PRIMARY ACTION CARD: Clean Reseed / Delete Old & Add New */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Clean Reseed: Delete Old Records & Add 15 Spices + Sample Invoices
                      </h3>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Deletes obsolete bulk documents from MongoDB collections and inserts the 15 spice packets (100g, 50g, 25g) with prices, margins, customer tiers, and sample invoices.
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-200 text-amber-900 shrink-0">
                    Recommended
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
                  <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60">
                    <div className="font-bold text-sm text-slate-900 font-mono">15</div>
                    <div className="text-[10px] text-slate-600">Packet Products (100g, 50g, 25g)</div>
                  </div>
                  <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60">
                    <div className="font-bold text-sm text-slate-900 font-mono">4</div>
                    <div className="text-[10px] text-slate-600">Customer Trade Tiers</div>
                  </div>
                  <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60">
                    <div className="font-bold text-sm text-slate-900 font-mono">5</div>
                    <div className="text-[10px] text-slate-600">Sample Invoices (INV-2026-0041..45)</div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleWipeAndReseedMongo}
                    disabled={isWiping}
                    className="flex-1 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg shadow-sm transition-all text-center disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isWiping ? 'animate-spin' : ''}`} />
                    <span>{isWiping ? 'Wiping & Reseeding MongoDB...' : 'Wipe Old Records & Reseed Database'}</span>
                  </button>
                  <button
                    onClick={handleCleanOverwritePush}
                    disabled={isSyncing}
                    className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg shadow-xs transition-colors text-center disabled:opacity-50 inline-flex items-center gap-1.5"
                    title="Wipes MongoDB collections and pushes current UI items"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Clean Overwrite with Current UI</span>
                  </button>
                </div>
              </div>

              {/* Status or Feedback banner */}
              {syncFeedback && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    syncFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : syncFeedback.type === 'info'
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : syncFeedback.type === 'info' ? (
                    <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold">{syncFeedback.message}</div>
                    {syncFeedback.details && (
                      <div className="text-[11px] text-slate-600">
                        Products: {syncFeedback.details.products} · Customers: {syncFeedback.details.customers} · Invoices: {syncFeedback.details.orders}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Incremental Push and Pull */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Bidirectional Sync Operations</h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Current UI: {products.length} Products | {orders.length} Invoices
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Perform incremental updates or pull the latest records saved in your remote MongoDB cluster.
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handlePushToMongo}
                    disabled={isSyncing}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg shadow-sm transition-colors text-center disabled:opacity-50"
                  >
                    {isSyncing ? 'Upserting...' : 'Upsert Current Items to MongoDB'}
                  </button>

                  <button
                    onClick={handlePullFromMongo}
                    disabled={isSyncing}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-semibold rounded-lg shadow-xs transition-colors text-center disabled:opacity-50"
                  >
                    {isSyncing ? 'Pulling...' : 'Pull Latest from MongoDB'}
                  </button>
                </div>
              </div>

              {/* JSON Backup Downloads */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Download BSON / JSON Collections</h4>
                  <p className="text-slate-500 text-[11px]">Direct import files for MongoDB Compass, mongosh, or Atlas UI</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadJSON(products, 'spice_products_15_packets.json')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium inline-flex items-center gap-1 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>15 Products JSON</span>
                  </button>
                  <button
                    onClick={() => handleDownloadJSON(orders, 'spice_sample_invoices.json')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium inline-flex items-center gap-1 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Invoices JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECTION & ATLAS SETUP */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Architecture Blueprint Card */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">M (Database)</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">MongoDB</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Atlas / BSON</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">E (Backend)</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">Express.js</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">Node REST API</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">R (Client)</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">React 19</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">Tailwind v4</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">N (Runtime)</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">Node.js</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">TypeScript / tsx</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Backend Storage Mode:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        serverHealth?.isMongoConnected
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {serverHealth?.isMongoConnected ? '● MongoDB Atlas Connected' : 'Express In-Memory Active'}
                    </span>
                  </div>
                  <button
                    onClick={fetchHealth}
                    className="text-amber-800 hover:text-amber-900 text-[11px] font-medium inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="text-slate-600 text-xs">
                  {serverHealth?.isMongoConnected ? (
                    <div>
                      Connected to database: <code className="font-bold text-slate-900">{serverHealth.dbName}</code>.
                      {serverHealth.mongoStats && (
                        <span className="block mt-1 font-mono text-[11px]">
                          Live collections: {serverHealth.mongoStats.collections.join(', ')} (
                          {serverHealth.mongoStats.counts?.products ?? 0} products,{' '}
                          {serverHealth.mongoStats.counts?.orders ?? 0} invoices)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      The Express backend is actively storing items and invoices in-memory. To sync directly with your MongoDB Atlas database, input your connection string below.
                    </div>
                  )}
                </div>
              </div>

              {/* Connection Form */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900">Connect Remote MongoDB Cluster</h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    MongoDB Connection String (MONGODB_URI)
                  </label>
                  <input
                    type="password"
                    placeholder="mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
                    value={mongoUriInput}
                    onChange={(e) => setMongoUriInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    You can set this in <code className="font-bold">.env</code> as <code className="font-bold">MONGODB_URI</code> or connect dynamically right here.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-600">Database Name: <code className="font-bold text-slate-900">{dbNameInput}</code></span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestConnection()}
                      disabled={isTesting || !mongoUriInput}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test Ping'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleConnectActiveMongo}
                      disabled={isConnecting || !mongoUriInput}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Link2 className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                      <span>{isConnecting ? 'Connecting...' : 'Connect Active DB'}</span>
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">{testResult.message}</div>
                      {testResult.details && (
                        <div className="text-[11px] mt-0.5 font-mono">
                          Existing collections: {testResult.details.join(', ') || 'None (New DB ready for seed)'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MONGOOSE SCHEMAS */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900">Product Mongoose Schema (`models/Product.js`)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true, index: true },
  barcode: { type: String, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['Powder', 'Flakes', 'Whole', 'Seeds', 'Blend', 'Ground'] },
  skuSize: { type: String, default: '100g' },
  unit: { type: String, enum: ['100g', '50g', '25g', 'packet', 'kg', 'sack_25kg', 'jar_500g'] },
  initialStock: Number,
  currentStock: Number,
  reorderThreshold: Number,
  costPrice: Number, // Cost per packet (LKR)
  retailPrice: Number, // MRP (LKR)
  wholesalePrice: Number, // Retailer Price (LKR)
  distributorPrice: Number, // Distributor Selling Price (LKR)
  retailerMarginPct: Number,
  dealerCommission: Number,
  distributorMarginPct: Number,
  batchCost: Number,
  batchNumber: String,
  harvestDate: String,
  origin: String,
  grade: String,
  description: String
}, { timestamps: true });
module.exports = mongoose.model('Product', ProductSchema);`,
                        'product_schema'
                      )
                    }
                    className="text-amber-800 hover:text-amber-900 font-medium inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'product_schema' ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true, index: true },
  barcode: { type: String, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['Powder', 'Flakes', 'Whole', 'Seeds', 'Blend', 'Ground'] },
  skuSize: { type: String, default: '100g' },
  unit: { type: String, enum: ['100g', '50g', '25g', 'packet', 'kg'] },
  initialStock: Number,
  currentStock: Number,
  reorderThreshold: Number,
  costPrice: Number, // Cost per packet (LKR)
  retailPrice: Number, // MRP (LKR)
  wholesalePrice: Number, // Retailer Rate (LKR)
  distributorPrice: Number, // Distributor Rate (LKR)
  retailerMarginPct: Number,
  dealerCommission: Number,
  distributorMarginPct: Number,
  batchCost: Number,
  batchNumber: String,
  harvestDate: String,
  origin: String,
  grade: String,
  description: String
}, { timestamps: true });`}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900">Order Mongoose Schema (`models/Order.js`)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `const mongoose = require('mongoose');
const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: String,
  customerTier: { type: String, enum: ['retail', 'wholesale', 'distributor'] },
  orderDate: String,
  dueDate: String,
  items: [{
    productId: String,
    productName: String,
    sku: String,
    unit: String,
    quantity: Number,
    unitPrice: Number,
    costPrice: Number,
    totalPrice: Number
  }],
  subtotal: Number,
  discountPercentage: Number,
  discountAmount: Number,
  taxRate: Number,
  taxAmount: Number,
  totalAmount: Number,
  paidAmount: Number,
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partially Paid', 'Overdue'] },
  paymentMethod: String,
  orderStatus: String,
  notes: String
}, { timestamps: true });
module.exports = mongoose.model('Order', OrderSchema);`,
                        'order_schema'
                      )
                    }
                    className="text-amber-800 hover:text-amber-900 font-medium inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'order_schema' ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: String,
  customerTier: { type: String, enum: ['retail', 'wholesale', 'distributor'] },
  orderDate: String,
  dueDate: String,
  items: [{
    productId: String,
    productName: String,
    sku: String,
    unit: String,
    quantity: Number,
    unitPrice: Number,
    costPrice: Number,
    totalPrice: Number
  }],
  subtotal: Number,
  taxAmount: Number,
  totalAmount: Number,
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partially Paid', 'Overdue'] }
}, { timestamps: true });`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: CLI & ATLAS SEED COMMANDS */}
          {activeTab === 'cli' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">1. Instant NPM Reseed Script (Terminal)</span>
                  <button
                    onClick={() => handleCopy(`npm run db:seed`, 'npm_seed_cmd')}
                    className="text-amber-800 hover:text-amber-900 font-medium inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'npm_seed_cmd' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
{`# Reseed using MONGODB_URI in .env
npm run db:seed

# Or pass the URI directly:
npm run db:seed -- --uri="mongodb+srv://<user>:<password>@cluster0.mongodb.net/saffron_bark_spice_erp"`}
                </pre>
                <p className="text-[11px] text-slate-500 mt-1">
                  This standalone script wipes old records and inserts all 15 spice products + 5 sample invoices into your MongoDB database.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">2. Wipe Old Documents via mongosh</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `use saffron_bark_spice_erp;\ndb.products.deleteMany({});\ndb.orders.deleteMany({});\ndb.customers.deleteMany({});`,
                        'mongosh_wipe_cmd'
                      )
                    }
                    className="text-amber-800 hover:text-amber-900 font-medium inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'mongosh_wipe_cmd' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
{`use saffron_bark_spice_erp;
db.products.deleteMany({});
db.orders.deleteMany({});
db.customers.deleteMany({});`}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">3. CLI Batch Import (mongoimport)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `mongoimport --uri="YOUR_MONGODB_URI" --collection=products --file=spice_products_15_packets.json --jsonArray --drop`,
                        'import_cmd'
                      )
                    }
                    className="text-amber-800 hover:text-amber-900 font-medium inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'import_cmd' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
{`mongoimport --uri="YOUR_MONGODB_URI" --collection=products --file=spice_products_15_packets.json --jsonArray --drop`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Express backend runs full CRUD routes at <code className="font-mono text-slate-800">/api/products</code>, <code className="font-mono text-slate-800">/api/orders</code>, <code className="font-mono text-slate-800">/api/mongodb/wipe-and-reseed</code>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
