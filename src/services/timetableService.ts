/**
 * Timetable Service — Supabase CRUD and master timetable management
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DayNumber, PeriodNumber } from '../types';
import { getDefaultTimetableEntries } from '../data/timetable';

export interface TimetableEntry {
  timetable_id: string;
  class_id: string;
  day_number: DayNumber;
  period_number: PeriodNumber;
  subject: string;
  start_time: string;
  end_time: string;
}

/**
 * Fetch timetable from Supabase.
 * If Supabase is configured and has entries, returns them.
 * Otherwise returns the official master timetable entries as fallback.
 */
export async function fetchTimetable(
  classId: string,
  dayNumber?: DayNumber
): Promise<{ data: TimetableEntry[]; isLocalFallback: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('timetable')
        .select('*')
        .eq('class_id', classId)
        .order('day_number', { ascending: true })
        .order('period_number', { ascending: true });

      if (dayNumber) {
        query = query.eq('day_number', dayNumber);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return { data: data as TimetableEntry[], isLocalFallback: false };
      }
    } catch {
      // Fallback to local default below
    }
  }

  // Local fallback from verified timetable image
  const defaults = getDefaultTimetableEntries(classId);
  const filtered = dayNumber ? defaults.filter((d) => d.day_number === dayNumber) : defaults;

  const entries: TimetableEntry[] = filtered.map((item, idx) => ({
    timetable_id: `local-${item.class_id}-${item.day_number}-${item.period_number}-${idx}`,
    class_id: item.class_id,
    day_number: item.day_number,
    period_number: item.period_number,
    subject: item.subject,
    start_time: item.start_time,
    end_time: item.end_time,
  }));

  return { data: entries, isLocalFallback: true };
}

/**
 * Upsert or insert a single timetable period entry in Supabase
 */
export async function saveTimetableEntry(entry: {
  timetable_id?: string;
  class_id: string;
  day_number: DayNumber;
  period_number: PeriodNumber;
  subject: string;
  start_time: string;
  end_time: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Format time properly if user entered HH:MM
  const formatTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

  const payload = {
    class_id: entry.class_id,
    day_number: entry.day_number,
    period_number: entry.period_number,
    subject: entry.subject.trim().toUpperCase(),
    start_time: formatTime(entry.start_time),
    end_time: formatTime(entry.end_time),
  };

  if (entry.timetable_id && !entry.timetable_id.startsWith('local-')) {
    const { error } = await sb
      .from('timetable')
      .update(payload)
      .eq('timetable_id', entry.timetable_id);
    if (error) throw new Error(error.message);
  } else {
    // Check if slot already exists
    const { data: existing } = await sb
      .from('timetable')
      .select('timetable_id')
      .eq('class_id', entry.class_id)
      .eq('day_number', entry.day_number)
      .eq('period_number', entry.period_number)
      .maybeSingle();

    if (existing?.timetable_id) {
      const { error } = await sb
        .from('timetable')
        .update(payload)
        .eq('timetable_id', existing.timetable_id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from('timetable').insert(payload);
      if (error) throw new Error(error.message);
    }
  }
}

/**
 * Delete a timetable entry from Supabase
 */
export async function deleteTimetableEntry(timetableId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  if (timetableId.startsWith('local-')) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('timetable')
    .delete()
    .eq('timetable_id', timetableId);

  if (error) throw new Error(error.message);
}

/**
 * Seed or reset the official timetable for the class in Supabase
 */
export async function seedOfficialTimetable(classId: string): Promise<{ count: number }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Clear existing entries for this class
  await sb.from('timetable').delete().eq('class_id', classId);

  const defaultEntries = getDefaultTimetableEntries(classId);

  const { error } = await sb.from('timetable').insert(defaultEntries);
  if (error) throw new Error(error.message);

  return { count: defaultEntries.length };
}
