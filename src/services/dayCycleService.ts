/**
 * Day-Cycle Log Service
 * Manages the rotating Day Order 1–Day Order 6 calendar assignments and holidays.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DayNumber, ClassId } from '../types';

export interface DayCycleEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  class_id: ClassId;
  day_number: DayNumber | null;
  is_holiday: boolean;
  holiday_reason?: string | null;
  notes?: string | null;
  created_at?: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'smart_cr_day_cycle_';

function getLocalStorageKey(classId: string): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${classId}`;
}

function getLocalLogs(classId: string): DayCycleEntry[] {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(classId));
    if (!raw) return [];
    return JSON.parse(raw) as DayCycleEntry[];
  } catch {
    return [];
  }
}

function saveLocalLogs(classId: string, logs: DayCycleEntry[]): void {
  try {
    localStorage.setItem(getLocalStorageKey(classId), JSON.stringify(logs));
  } catch {
    // ignore
  }
}

/**
 * Fetch the day cycle record for a specific date and class
 */
export async function getDayCycleForDate(
  classId: ClassId,
  date: string
): Promise<DayCycleEntry | null> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('day_cycle_log')
        .select('*')
        .eq('class_id', classId)
        .eq('date', date)
        .maybeSingle();

      if (!error) {
        if (data) {
          const entry = data as DayCycleEntry;
          const local = getLocalLogs(classId);
          saveLocalLogs(classId, [entry, ...local.filter((l) => l.date !== date)]);
          return entry;
        }
        return null;
      }
    } catch {
      // Fallback to local storage below if offline
    }
  }

  const localLogs = getLocalLogs(classId);
  return localLogs.find((l) => l.date === date) || null;
}

/**
 * Fetch all logs for a class, ordered by date descending
 */
export async function getAllDayCycleLogs(classId: ClassId): Promise<DayCycleEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('day_cycle_log')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false });

      if (!error && data) {
        // Also sync local cache
        saveLocalLogs(classId, data);
        return data as DayCycleEntry[];
      }
    } catch {
      // Fallback to local
    }
  }

  const local = getLocalLogs(classId);
  return local.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Calculate the suggested next Day Order (1–6) for a given target date.
 * Looks for the most recent working date strictly before the target date.
 * If previous was Day N -> suggests (N % 6) + 1.
 * If no prior working date exists -> suggests Day 1.
 * Holidays are skipped and do NOT consume a cycle slot!
 */
export async function getSuggestedNextDayOrder(
  classId: ClassId,
  targetDate: string
): Promise<{
  suggestedDay: DayNumber;
  previousWorkingDate?: string;
  previousDayNumber?: DayNumber;
}> {
  const allLogs = await getAllDayCycleLogs(classId);

  // Filter logs strictly prior to target date and only working days (is_holiday === false and day_number != null)
  const priorWorkingDays = allLogs
    .filter(
      (l) => l.date < targetDate && !l.is_holiday && l.day_number !== null && l.day_number !== undefined
    )
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  if (priorWorkingDays.length > 0) {
    const mostRecent = priorWorkingDays[0];
    const prevDay = mostRecent.day_number as DayNumber;
    const nextDay = ((prevDay % 6) + 1) as DayNumber;

    return {
      suggestedDay: nextDay,
      previousWorkingDate: mostRecent.date,
      previousDayNumber: prevDay,
    };
  }

  // If no prior dates exist, start at Day 1
  return {
    suggestedDay: 1,
  };
}

/**
 * Assign a working Day Order (1–6) to a calendar date
 */
export async function setWorkingDayOrder(
  classId: ClassId,
  date: string,
  dayNumber: DayNumber,
  notes?: string
): Promise<DayCycleEntry> {
  const payload: DayCycleEntry = {
    date,
    class_id: classId,
    day_number: dayNumber,
    is_holiday: false,
    holiday_reason: null,
    notes: notes || null,
  };

  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb
      .from('day_cycle_log')
      .upsert(payload, { onConflict: 'date,class_id' });

    if (error) throw new Error(error.message);
  }

  // Update local storage
  const local = getLocalLogs(classId);
  const updated = [payload, ...local.filter((l) => l.date !== date)];
  saveLocalLogs(classId, updated);

  return payload;
}

/**
 * Mark a calendar date as a Holiday (day_number = null, is_holiday = true)
 * Crucial rule: Holiday does not consume a cycle number!
 */
export async function markHolidayForDate(
  classId: ClassId,
  date: string,
  reason: string,
  notes?: string
): Promise<DayCycleEntry> {
  const payload: DayCycleEntry = {
    date,
    class_id: classId,
    day_number: null,
    is_holiday: true,
    holiday_reason: reason.trim() || 'Holiday',
    notes: notes || null,
  };

  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb
      .from('day_cycle_log')
      .upsert(payload, { onConflict: 'date,class_id' });

    if (error) throw new Error(error.message);
  }

  // Update local storage
  const local = getLocalLogs(classId);
  const updated = [payload, ...local.filter((l) => l.date !== date)];
  saveLocalLogs(classId, updated);

  return payload;
}

/**
 * Remove an assigned day/holiday log entry for a date
 */
export async function removeDayCycleEntry(classId: ClassId, date: string): Promise<void> {
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('day_cycle_log')
      .delete()
      .eq('class_id', classId)
      .eq('date', date);

    if (error) throw new Error(error.message);
  }

  const local = getLocalLogs(classId);
  saveLocalLogs(
    classId,
    local.filter((l) => l.date !== date)
  );
}
