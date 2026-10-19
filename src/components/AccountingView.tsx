import React, { useState } from 'react';
import { Order, AccountingSyncRecord, RolePermissions } from '../types';
import { 
  Landmark, 
  Building2, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  ArrowUpRight, 
  Sliders, 
  FileCode, 
  Lock 
} from 'lucide-react';
import { AccountingService, AccountingConfig } from '../services/accountingService';

interface AccountingViewProps {
  orders: Order[];
  syncRecords: AccountingSyncRecord[];
  permissions: RolePermissions;
  onSyncPlatform: (platform: 'QuickBooks' | 'Xero') => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  orders,
  syncRecords,
  permissions,
  onSyncPlatform,
}) => {
  const [config, setConfig] = useState<AccountingConfig>(AccountingService.getConfig());
  const [isSyncingQB, setIsSyncingQB] = useState(false);
  const [isSyncingXero, setIsSyncingXero] = useState(false);
  const [activePlatformFilter, setActivePlatformFilter] = useState<'All' | 'QuickBooks' | 'Xero'>('All');

  const pendingQB = orders.filter((o) => o.quickbooksSyncStatus !== 'synced').length;
  const pendingXero = orders.filter((o) => o.xeroSyncStatus !== 'synced').length;

  const handleSyncQB = () => {
    setIsSyncingQB(true);
    setTimeout(() => {
      onSyncPlatform('QuickBooks');
      setIsSyncingQB(false);
    }, 1200);
  };

  const handleSyncXero = () => {
    setIsSyncingXero(true);
    setTimeout(() => {
      onSyncPlatform('Xero');
      setIsSyncingXero(false);
    }, 1200);
  };

  const handleExportXeroCSV = () => {
    const csv = AccountingService.generateXeroCSV(orders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Xero_Invoices_Import_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportQBJSON = () => {
    const payload = orders.map((o) => AccountingService.generateQuickBooksPayload(o));
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QuickBooks_Invoices_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = syncRecords.filter(
    (r) => activePlatformFilter === 'All' || r.platform === activePlatformFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accounting Software Integrations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronize sales invoices, COGS journals, and customer trade ledgers with QuickBooks Online & Xero.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportQBJSON}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Download QBO Invoice Payload (JSON)"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>QBO Payload</span>
          </button>
          <button
            onClick={handleExportXeroCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Download Xero ACCREC Import CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xero CSV Import</span>
          </button>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QuickBooks Online */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs space-y-4">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Intuit QuickBooks Online</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-500 font-medium">Connected · Realm: {config.quickbooks.realmId}</span>
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                Active Sync
              </span>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Company:</span>
                <span className="font-semibold text-slate-900">{config.quickbooks.companyName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Revenue Account:</span>
                <span className="font-mono">{config.quickbooks.incomeAccount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>A/R Ledger:</span>
                <span className="font-mono">{config.quickbooks.arAccount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>COGS Asset:</span>
                <span className="font-mono">{config.quickbooks.cogsAccount}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Unsynced Invoices:</span>
                <span className="font-bold text-amber-800 font-mono">{pendingQB} pending</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Last sync: {config.quickbooks.lastSync}
            </span>
            {permissions.canManageAccounting ? (
              <button
                onClick={handleSyncQB}
                disabled={isSyncingQB}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQB ? 'animate-spin' : ''}`} />
                <span>{isSyncingQB ? 'Synchronizing QBO...' : `Sync Invoices to QBO (${pendingQB})`}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Requires Accountant Role
              </span>
            )}
          </div>
        </div>

        {/* Xero */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs space-y-4">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-800 rounded-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Xero Cloud Accounting</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-slate-500 font-medium">Connected · Org: {config.xero.tenantId}</span>
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                Active Sync
              </span>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Organization:</span>
                <span className="font-semibold text-slate-900">{config.xero.tenantName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sales Account Code:</span>
                <span className="font-mono">{config.xero.salesAccountCode}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Settlement Bank:</span>
                <span className="font-mono">{config.xero.bankAccountCode}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax Exemption Type:</span>
                <span className="font-mono">{config.xero.taxType}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Unsynced Invoices:</span>
                <span className="font-bold text-amber-800 font-mono">{pendingXero} pending</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Last sync: {config.xero.lastSync}
            </span>
            {permissions.canManageAccounting ? (
              <button
                onClick={handleSyncXero}
                disabled={isSyncingXero}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingXero ? 'animate-spin' : ''}`} />
                <span>{isSyncingXero ? 'Synchronizing Xero...' : `Sync Invoices to Xero (${pendingXero})`}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Requires Accountant Role
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Synchronization Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Ledger Synchronization Audit Log</h2>
            <p className="text-xs text-slate-500">Live journal entries and API communication history</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            {(['All', 'QuickBooks', 'Xero'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActivePlatformFilter(p)}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  activePlatformFilter === p
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">TIMESTAMP</th>
                <th className="py-2.5 px-4">PLATFORM</th>
                <th className="py-2.5 px-4">ENTRY TYPE</th>
                <th className="py-2.5 px-4">REFERENCE / INVOICES</th>
                <th className="py-2.5 px-4">AUDIT DETAILS</th>
                <th className="py-2.5 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        log.platform === 'QuickBooks'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {log.platform}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {log.type}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">
                    {log.referenceId}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-sm truncate">
                    {log.details}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{log.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
