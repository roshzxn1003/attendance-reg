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

export const BATCH_CLASSES: ClassId[] = ['CSE-25', 'AIDS-25'];

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
 * Fetch the day cycle record for a specific date and class.
 * Automatically checks and mirrors sibling class if entry already exists in batch.
 */
export async function getDayCycleForDate(
  classId: ClassId,
  date: string
): Promise<DayCycleEntry | null> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
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

        // Check if any other batch class already has an entry for this date
        const { data: siblingData } = await sb
          .from('day_cycle_log')
          .select('*')
          .eq('date', date)
          .limit(1)
          .maybeSingle();

        if (siblingData) {
          const replicated: DayCycleEntry = {
            date,
            class_id: classId,
            day_number: siblingData.day_number,
            is_holiday: siblingData.is_holiday,
            holiday_reason: siblingData.holiday_reason,
            notes: siblingData.notes,
          };

          // Auto-sync in cloud so both classes stay in sync
          await sb
            .from('day_cycle_log')
            .upsert(replicated, { onConflict: 'date,class_id' });

          const local = getLocalLogs(classId);
          saveLocalLogs(classId, [replicated, ...local.filter((l) => l.date !== date)]);
          return replicated;
        }

        return null;
      }
    } catch {
      // Fallback to local storage below if offline
    }
  }

  const localLogs = getLocalLogs(classId);
  const matched = localLogs.find((l) => l.date === date);
  if (matched) return matched;

  // Sibling local fallback
  for (const sibling of BATCH_CLASSES) {
    if (sibling !== classId) {
      const siblingLogs = getLocalLogs(sibling);
      const siblingMatched = siblingLogs.find((l) => l.date === date);
      if (siblingMatched) {
        const mirrored: DayCycleEntry = { ...siblingMatched, class_id: classId };
        saveLocalLogs(classId, [mirrored, ...localLogs]);
        return mirrored;
      }
    }
  }

  return null;
}

/**
 * Fetch all logs for a class, ordered by date descending
 */
export async function getAllDayCycleLogs(classId: ClassId): Promise<DayCycleEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from('day_cycle_log')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false });

      if (!error && data) {
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
 * Assign a working Day Order (1–6) to a calendar date.
 * Automatically synchronizes across all batch classes (CSE-25 and AIDS-25).
 */
export async function setWorkingDayOrder(
  classId: ClassId,
  date: string,
  dayNumber: DayNumber,
  notes?: string
): Promise<DayCycleEntry> {
  const payloads: DayCycleEntry[] = BATCH_CLASSES.map((c) => ({
    date,
    class_id: c,
    day_number: dayNumber,
    is_holiday: false,
    holiday_reason: null,
    notes: notes || null,
  }));

  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb
      .from('day_cycle_log')
      .upsert(payloads, { onConflict: 'date,class_id' });

    if (error) throw new Error(error.message);
  }

  // Update local storage for all batch classes
  for (const c of BATCH_CLASSES) {
    const entry = payloads.find((p) => p.class_id === c)!;
    const local = getLocalLogs(c);
    const updated = [entry, ...local.filter((l) => l.date !== date)];
    saveLocalLogs(c, updated);
  }

  return payloads.find((p) => p.class_id === classId) || payloads[0];
}

/**
 * Mark a calendar date as a Holiday (day_number = null, is_holiday = true).
 * Automatically synchronizes across all batch classes (CSE-25 and AIDS-25).
 * Crucial rule: Holiday does not consume a cycle number!
 */
export async function markHolidayForDate(
  classId: ClassId,
  date: string,
  reason: string,
  notes?: string
): Promise<DayCycleEntry> {
  const payloads: DayCycleEntry[] = BATCH_CLASSES.map((c) => ({
    date,
    class_id: c,
    day_number: null,
    is_holiday: true,
    holiday_reason: reason.trim() || 'Holiday',
    notes: notes || null,
  }));

  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb
      .from('day_cycle_log')
      .upsert(payloads, { onConflict: 'date,class_id' });

    if (error) throw new Error(error.message);
  }

  // Update local storage for all batch classes
  for (const c of BATCH_CLASSES) {
    const entry = payloads.find((p) => p.class_id === c)!;
    const local = getLocalLogs(c);
    const updated = [entry, ...local.filter((l) => l.date !== date)];
    saveLocalLogs(c, updated);
  }

  return payloads.find((p) => p.class_id === classId) || payloads[0];
}

/**
 * Remove an assigned day/holiday log entry for a date across all batch classes.
 */
export async function removeDayCycleEntry(_classId: ClassId, date: string): Promise<void> {
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('day_cycle_log')
      .delete()
      .in('class_id', BATCH_CLASSES)
      .eq('date', date);

    if (error) throw new Error(error.message);
  }

  for (const c of BATCH_CLASSES) {
    const local = getLocalLogs(c);
    saveLocalLogs(
      c,
      local.filter((l) => l.date !== date)
    );
  }
}
