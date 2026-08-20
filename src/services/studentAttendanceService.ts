/**
 * Student Attendance Service
 * Fetches and resolves complete attendance history for individual students.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AttendanceStatus, ClassId, PeriodNumber } from '../types';
import { getSubjectForSlot, PERIOD_TIMINGS } from '../data/timetable';
import { getDayCycleForDate } from './dayCycleService';

export interface StudentHistoryRecord {
  attendance_id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  day_number: number;
  period_number: PeriodNumber;
  subject: string;
  time_range: string;
  status: AttendanceStatus;
  marked_at: string;
}

export interface StudentProfileStats {
  workingHours: number;
  presentHours: number;
  odHours: number;
  absentHours: number;
  percentage: number;
}

const LOCAL_STORAGE_ATTENDANCE_KEY = 'smart_cr_attendance_records';

/**
 * Fetch all attendance history for a single student, resolved with Day Order, Subject, and Timings.
 */
export async function fetchStudentHistory(
  studentId: string,
  classId: ClassId
): Promise<{ history: StudentHistoryRecord[]; stats: StudentProfileStats }> {
  let rawRecords: Array<{
    attendance_id?: string;
    student_id: string;
    date: string;
    period_number: PeriodNumber;
    status: AttendanceStatus;
    marked_at?: string;
  }> = [];

  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .order('period_number', { ascending: true });

      if (!error && data) {
        rawRecords = data;
      }
    } catch {
      // fallback below
    }
  }

  // Fallback to local storage if empty
  if (rawRecords.length === 0) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as typeof rawRecords;
        rawRecords = parsed.filter((r) => r.student_id === studentId);
      }
    } catch {
      // ignore
    }
  }

  // Sort descending by date, ascending by period
  rawRecords.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.period_number - b.period_number;
  });

  // Resolve day numbers, subjects, and timings for each record
  const history: StudentHistoryRecord[] = [];
  let presentHours = 0;
  let absentHours = 0;
  let odHours = 0;

  for (const r of rawRecords) {
    if (r.status === 'P') presentHours++;
    else if (r.status === 'A') absentHours++;
    else if (r.status === 'OD') odHours++;

    // Resolve Day Cycle Log for that date
    const dayCycle = await getDayCycleForDate(classId, r.date);
    const dayNum = dayCycle?.day_number || 1;

    // Resolve Subject
    const subject = getSubjectForSlot(dayNum as any, r.period_number, classId);

    // Resolve Timing
    const timingSlot = PERIOD_TIMINGS.find((p) => p.period === r.period_number);
    const time_range = timingSlot ? timingSlot.label : `Period ${r.period_number}`;

    history.push({
      attendance_id: r.attendance_id || `hist-${r.student_id}-${r.date}-${r.period_number}`,
      student_id: r.student_id,
      date: r.date,
      day_number: dayNum,
      period_number: r.period_number,
      subject,
      time_range,
      status: r.status,
      marked_at: r.marked_at || new Date().toISOString(),
    });
  }

  const workingHours = presentHours + absentHours + odHours;
  const percentage =
    workingHours > 0
      ? Number((((presentHours + odHours) / workingHours) * 100).toFixed(1))
      : 100.0;

  return {
    history,
    stats: {
      workingHours,
      presentHours,
      odHours,
      absentHours,
      percentage,
    },
  };
}
