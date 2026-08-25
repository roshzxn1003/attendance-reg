import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  OfflineSyncStatus,
  subscribeToSyncStatus,
  syncOfflineQueueNow,
} from '../../services/offlineSyncService';

export const NetworkStatusBar: React.FC = () => {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncedAt: null,
  });

  const [showSyncedToast, setShowSyncedToast] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((newStatus) => {
      setStatus(newStatus);
      if (newStatus.lastSyncedAt) {
        setShowSyncedToast(true);
        const timer = setTimeout(() => setShowSyncedToast(false), 4000);
        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribe();
  }, []);

  // If online with 0 pending records and not recently synced, hide to keep UI clean
  if (status.isOnline && status.pendingCount === 0 && !status.isSyncing && !showSyncedToast) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. Offline Mode Pill */}
      {!status.isOnline && (
        <div className="bg-amber-900/90 backdrop-blur-md text-amber-100 border border-amber-600/50 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
          <span>Offline Mode</span>
          {status.pendingCount > 0 && (
            <span className="bg-amber-800 text-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-black border border-amber-600/40">
              {status.pendingCount} Saved Locally
            </span>
          )}
        </div>
      )}

      {/* 2. Syncing in Progress Pill */}
      {status.isOnline && status.isSyncing && (
        <div className="bg-blue-900/90 backdrop-blur-md text-blue-100 border border-blue-600/50 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold">
          <RefreshCw className="w-4 h-4 text-blue-300 animate-spin shrink-0" />
          <span>Syncing with Cloud...</span>
        </div>
      )}

      {/* 3. Pending Queue Ready to Sync */}
      {status.isOnline && !status.isSyncing && status.pendingCount > 0 && (
        <div className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-700 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{status.pendingCount} records ready</span>
          <button
            type="button"
            onClick={() => syncOfflineQueueNow()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer shadow-xs transition-colors"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* 4. Just Synced Notification */}
      {status.isOnline && showSyncedToast && status.pendingCount === 0 && !status.isSyncing && (
        <div className="bg-emerald-950/90 backdrop-blur-md text-emerald-100 border border-emerald-600/50 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Synced with Cloud ({status.lastSyncedAt})</span>
        </div>
      )}
    </div>
  );
};
