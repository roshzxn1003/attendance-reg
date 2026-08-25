/**
 * Offline Synchronization Service
 * Handles offline detection, pending sync queues, and automatic reconciliation with Supabase.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AttendanceItem } from './attendanceService';

const OFFLINE_QUEUE_KEY = 'spiher_offline_sync_queue';

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
}

const statusListeners = new Set<(status: OfflineSyncStatus) => void>();

let currentStatus: OfflineSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
};

function getOfflineQueue(): AttendanceItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AttendanceItem[]) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: AttendanceItem[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    currentStatus.pendingCount = queue.length;
    notifyListeners();
  } catch {
    // ignore
  }
}

function notifyListeners() {
  statusListeners.forEach((listener) => listener({ ...currentStatus }));
}

/**
 * Queue records to be synchronized when online
 */
export function queueForSync(records: AttendanceItem[]): void {
  const queue = getOfflineQueue();
  const map = new Map<string, AttendanceItem>();

  for (const r of queue) {
    map.set(`${r.student_id}_${r.date}_${r.period_number}`, r);
  }
  for (const r of records) {
    map.set(`${r.student_id}_${r.date}_${r.period_number}`, r);
  }

  const updatedQueue = Array.from(map.values());
  saveOfflineQueue(updatedQueue);
}

/**
 * Trigger immediate sync of all pending offline records to Supabase Cloud
 */
export async function syncOfflineQueueNow(): Promise<{
  syncedCount: number;
  success: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured() || !navigator.onLine) {
    return { syncedCount: 0, success: false, error: 'Offline or Supabase not connected' };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, success: true };
  }

  currentStatus.isSyncing = true;
  notifyListeners();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const CHUNK_SIZE = 500;
    let syncedCount = 0;

    for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
      const chunk = queue.slice(i, i + CHUNK_SIZE);
      const { error } = await sb
        .from('attendance')
        .upsert(chunk, { onConflict: 'student_id,date,period_number' });

      if (error) {
        throw new Error(error.message);
      }
      syncedCount += chunk.length;
    }

    // Clear queue on complete success
    saveOfflineQueue([]);
    currentStatus.lastSyncedAt = new Date().toLocaleTimeString();
    currentStatus.isSyncing = false;
    notifyListeners();

    return { syncedCount, success: true };
  } catch (err) {
    currentStatus.isSyncing = false;
    notifyListeners();
    return { syncedCount: 0, success: false, error: String(err) };
  }
}

/**
 * Initialize offline network listeners and auto-sync on reconnect
 */
export function initOfflineSyncEngine(): void {
  if (typeof window === 'undefined') return;

  const queue = getOfflineQueue();
  currentStatus.pendingCount = queue.length;

  window.addEventListener('online', () => {
    currentStatus.isOnline = true;
    notifyListeners();
    // Auto-sync after reconnect
    setTimeout(() => {
      syncOfflineQueueNow();
    }, 1500);
  });

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false;
    notifyListeners();
  });
}

/**
 * Subscribe to real-time online/offline & sync status changes
 */
export function subscribeToSyncStatus(callback: (status: OfflineSyncStatus) => void): () => void {
  statusListeners.add(callback);
  callback({ ...currentStatus });
  return () => {
    statusListeners.delete(callback);
  };
}
