/**
 * Attendance Service
 * Handles period attendance persistence, duplicate prevention, and dynamic calculations.
 * Percentages are calculated on-the-fly and never stored permanently in the database.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AttendanceStatus, ClassId, PeriodNumber, StudentAttendanceSummary } from '../types';
import { Student } from './studentService';
import { getDayCycleForDate } from './dayCycleService';

export interface AttendanceItem {
  attendance_id?: string;
  student_id: string;
  class_id?: ClassId;
  date: string;
  period_number: PeriodNumber;
  status: AttendanceStatus;
  marked_at?: string;
}

export interface PeriodAttendanceStats {
  total: number;
  present: number;
  absent: number;
  od: number;
  notMarked: number;
  percentage: number;
}

export interface DailyAttendanceOverview {
  totalStudentPeriods: number;
  presentCount: number;
  absentCount: number;
  odCount: number;
  attendancePercentage: number;
  periodsCompleted: number;
  totalPeriods: number;
  completedPeriodNumbers: PeriodNumber[];
}

const LOCAL_STORAGE_ATTENDANCE_KEY = 'smart_cr_attendance_records';

function getLocalAttendance(): AttendanceItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveLocalAttendance(records: AttendanceItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ATTENDANCE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Fetch existing attendance records for a specific class, date, and period.
 */
export async function fetchPeriodAttendance(
  _classId: ClassId,
  date: string,
  periodNumber: PeriodNumber
): Promise<{ records: AttendanceItem[]; exists: boolean; lastMarkedAt?: string }> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from('attendance')
        .select('*')
        .eq('date', date)
        .eq('period_number', periodNumber);

      if (!error && data) {
        const records = data as AttendanceItem[];
        if (records.length > 0) {
          const lastMarkedAt = records[0]?.marked_at;
          return { records, exists: true, lastMarkedAt };
        }
        return { records: [], exists: false };
      }
    } catch {
      // fallback to local below if network error
    }
  }

  // Local storage fallback
  const local = getLocalAttendance();
  const matched = local.filter((r) => r.date === date && r.period_number === periodNumber);

  return {
    records: matched,
    exists: matched.length > 0,
    lastMarkedAt: matched[0]?.marked_at,
  };
}

/**
 * Fetch all attendance records for a specific date across all periods.
 */
export async function fetchDateAttendance(
  _classId: ClassId,
  date: string
): Promise<AttendanceItem[]> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from('attendance')
        .select('*')
        .eq('date', date);

      if (!error && data) {
        return data as AttendanceItem[];
      }
    } catch {
      // fallback below
    }
  }

  const local = getLocalAttendance();
  return local.filter((r) => r.date === date);
}

/**
 * Fetch all attendance records for a class across all dates.
 */
export async function fetchAllClassAttendance(
  _classId: ClassId,
  studentIds: string[]
): Promise<AttendanceItem[]> {
  if (studentIds.length === 0) return [];

  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from('attendance')
        .select('*')
        .in('student_id', studentIds)
        .order('date', { ascending: false });

      if (!error && data) {
        return data as AttendanceItem[];
      }
    } catch {
      // fallback below
    }
  }

  const local = getLocalAttendance();
  const idSet = new Set(studentIds);
  return local.filter((r) => idSet.has(r.student_id));
}

/**
 * Save / Update attendance for all students in a single period.
 */
export async function savePeriodAttendance(
  classId: ClassId,
  date: string,
  periodNumber: PeriodNumber,
  studentMarks: Array<{ student_id: string; status: AttendanceStatus }>
): Promise<{ savedCount: number; markedAt: string }> {
  const result = await saveMultiplePeriodsAttendance(classId, date, [periodNumber], studentMarks);
  return { savedCount: result.savedCount, markedAt: result.markedAt };
}

/**
 * Save / Update attendance for multiple selected periods simultaneously.
 * Creates separate atomic records for each period to preserve database architecture.
 */
export async function saveMultiplePeriodsAttendance(
  classId: ClassId,
  date: string,
  periodNumbers: PeriodNumber[],
  studentMarks: Array<{ student_id: string; status: AttendanceStatus }>
): Promise<{ savedCount: number; markedAt: string; periodsCount: number }> {
  if (periodNumbers.length === 0) {
    throw new Error('Please select at least one period to mark.');
  }

  // 1. Validate all period numbers
  for (const p of periodNumbers) {
    if (p < 1 || p > 7) {
      throw new Error(`Invalid period number: ${p}. Must be between 1 and 7.`);
    }
  }

  // 2. Date Format Validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Must be YYYY-MM-DD.`);
  }

  // 3. Holiday Prevention Check
  const dayLog = await getDayCycleForDate(classId, date);
  if (dayLog && dayLog.is_holiday) {
    throw new Error(
      `Cannot mark attendance on a holiday: ${dayLog.holiday_reason || 'Holiday'} (${date}).`
    );
  }

  // 4. Status Validation & Class Isolation Check
  for (const m of studentMarks) {
    if (!['P', 'A', 'OD'].includes(m.status)) {
      throw new Error(`Invalid attendance status '${m.status}' for student ${m.student_id}.`);
    }

    if (classId === 'CSE-25' && m.student_id.startsWith('SPC25CSU6')) {
      throw new Error(
        `Class isolation error: AIDS student (${m.student_id}) cannot be marked under CSE-25 attendance.`
      );
    }
    if (classId === 'AIDS-25' && m.student_id.startsWith('SPC25CSU0')) {
      throw new Error(
        `Class isolation error: CSE student (${m.student_id}) cannot be marked under AIDS-25 attendance.`
      );
    }
  }

  const now = new Date().toISOString();

  // Create separate atomic records for each selected period
  const payload: AttendanceItem[] = [];
  for (const p of periodNumbers) {
    for (const m of studentMarks) {
      payload.push({
        student_id: m.student_id,
        date,
        period_number: p,
        status: m.status,
        marked_at: now,
      });
    }
  }

  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { error } = await sb
      .from('attendance')
      .upsert(payload, { onConflict: 'student_id,date,period_number' });

    if (error) {
      throw new Error(`Failed to save attendance: ${error.message}`);
    }
  }

  // Update local storage
  const local = getLocalAttendance();
  const periodSet = new Set(periodNumbers);
  const studentSet = new Set(studentMarks.map((m) => m.student_id));

  const filtered = local.filter(
    (r) => !(r.date === date && periodSet.has(r.period_number) && studentSet.has(r.student_id))
  );

  saveLocalAttendance([...filtered, ...payload]);

  return { savedCount: payload.length, markedAt: now, periodsCount: periodNumbers.length };
}

/**
 * Delete attendance for a period
 */
export async function deletePeriodAttendance(
  _classId: ClassId,
  date: string,
  periodNumber: PeriodNumber
): Promise<void> {
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb
      .from('attendance')
      .delete()
      .eq('date', date)
      .eq('period_number', periodNumber);

    if (error) throw new Error(error.message);
  }

  const local = getLocalAttendance();
  saveLocalAttendance(
    local.filter((r) => !(r.date === date && r.period_number === periodNumber))
  );
}

/**
 * Calculate single-period live marking statistics
 */
export function calculateAttendanceStats(
  marks: Record<string, AttendanceStatus | undefined>,
  totalStudents: number
): PeriodAttendanceStats {
  let present = 0;
  let absent = 0;
  let od = 0;
  let notMarked = 0;

  for (const status of Object.values(marks)) {
    if (status === 'P') present++;
    else if (status === 'A') absent++;
    else if (status === 'OD') od++;
    else notMarked++;
  }

  const markedCount = present + absent + od;
  const unmarkedDiff = Math.max(0, totalStudents - markedCount);
  notMarked = Math.max(notMarked, unmarkedDiff);

  const effectiveTotal = totalStudents > 0 ? totalStudents : 1;
  const percentage = Number((((present + od) / effectiveTotal) * 100).toFixed(1));

  return {
    total: totalStudents,
    present,
    absent,
    od,
    notMarked,
    percentage: isNaN(percentage) ? 0 : percentage,
  };
}

/**
 * Calculate dynamic student-level attendance summaries from raw attendance items
 * Inactive students are strictly excluded.
 */
export function calculateStudentSummaries(
  students: Student[],
  attendanceRecords: AttendanceItem[]
): StudentAttendanceSummary[] {
  const activeStudents = students.filter((s) => s.active !== false);

  // Index records by student_id
  const recordsByStudent: Record<string, AttendanceItem[]> = {};
  for (const r of attendanceRecords) {
    if (!recordsByStudent[r.student_id]) {
      recordsByStudent[r.student_id] = [];
    }
    recordsByStudent[r.student_id].push(r);
  }

  return activeStudents.map((s) => {
    const studentRecords = recordsByStudent[s.student_id] || [];

    let presentHours = 0;
    let absentHours = 0;
    let odHours = 0;

    for (const rec of studentRecords) {
      if (rec.status === 'P') presentHours++;
      else if (rec.status === 'A') absentHours++;
      else if (rec.status === 'OD') odHours++;
    }

    const totalWorkingHours = presentHours + absentHours + odHours;
    const percentage =
      totalWorkingHours > 0
        ? Number((((presentHours + odHours) / totalWorkingHours) * 100).toFixed(1))
        : 100.0;

    return {
      student_id: s.student_id,
      student_name: s.name,
      class_id: s.class_id,
      totalWorkingHours,
      presentHours,
      absentHours,
      odHours,
      percentage,
    };
  });
}

/**
 * Compute the daily class overview metrics for the dashboard
 */
export function calculateDailyOverview(
  records: AttendanceItem[],
  _totalEnrolledStudents = 0,
  totalPeriods = 7
): DailyAttendanceOverview {
  let presentCount = 0;
  let absentCount = 0;
  let odCount = 0;

  const periodsCompletedSet = new Set<PeriodNumber>();

  for (const rec of records) {
    periodsCompletedSet.add(rec.period_number);
    if (rec.status === 'P') presentCount++;
    else if (rec.status === 'A') absentCount++;
    else if (rec.status === 'OD') odCount++;
  }

  const periodsCompleted = periodsCompletedSet.size;
  const totalStudentPeriods = presentCount + absentCount + odCount;
  const attendancePercentage =
    totalStudentPeriods > 0
      ? Number((((presentCount + odCount) / totalStudentPeriods) * 100).toFixed(1))
      : 0.0;

  const completedPeriodNumbers = Array.from(periodsCompletedSet).sort((a, b) => a - b);

  return {
    totalStudentPeriods,
    presentCount,
    absentCount,
    odCount,
    attendancePercentage,
    periodsCompleted,
    totalPeriods,
    completedPeriodNumbers,
  };
}

/**
 * Get count of attendance records stored in local storage
 */
export function getLocalAttendanceCount(): number {
  return getLocalAttendance().length;
}

/**
 * Upload all local storage attendance records to Supabase Cloud database
 */
export async function syncLocalAttendanceToCloud(): Promise<{ syncedCount: number; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { syncedCount: 0, error: 'Supabase credentials are not configured.' };
  }

  const local = getLocalAttendance();
  if (local.length === 0) {
    return { syncedCount: 0 };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb
      .from('attendance')
      .upsert(local, { onConflict: 'student_id,date,period_number' });

    if (error) {
      return { syncedCount: 0, error: error.message };
    }

    return { syncedCount: local.length };
  } catch (err) {
    return { syncedCount: 0, error: String(err) };
  }
}

