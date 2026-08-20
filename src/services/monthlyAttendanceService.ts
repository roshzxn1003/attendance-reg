/**
 * Monthly Attendance Service
 * Handles month-filtered and custom date range dynamic calculations.
 * Percentages are calculated on-the-fly and never stored permanently in the database.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ClassId, StudentAttendanceSummary } from '../types';
import { Student } from './studentService';
import { AttendanceItem, calculateStudentSummaries } from './attendanceService';

export interface MonthlyClassOverview {
  totalStudents: number;
  averageAttendance: number;
  totalWorkingHours: number;
  totalPresent: number;
  totalAbsent: number;
  totalOD: number;
  markedStudentsCount: number;
}

export const ACADEMIC_MONTHS = [
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'October 2026' },
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-12', label: 'December 2026' },
];

export const MULTI_MONTH_PRESETS = [
  { id: '2m-aug-sep', label: '2 Months (Aug – Sep 2026)', start: '2026-08-01', end: '2026-09-30' },
  { id: '3m-aug-oct', label: '3 Months (Aug – Oct 2026)', start: '2026-08-01', end: '2026-10-31' },
  { id: '5m-semester', label: '5 Months / Full Semester (Aug – Dec 2026)', start: '2026-08-01', end: '2026-12-31' },
  { id: '2m-oct-nov', label: '2 Months (Oct – Nov 2026)', start: '2026-10-01', end: '2026-11-30' },
];

const LOCAL_STORAGE_ATTENDANCE_KEY = 'smart_cr_attendance_records';

/**
 * Fetch all attendance records for a specific class within a custom date range (YYYY-MM-DD to YYYY-MM-DD).
 */
export async function fetchDateRangeClassAttendance(
  _classId: ClassId,
  startDate: string,
  endDate: string,
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
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (!error && data) {
        return data as AttendanceItem[];
      }
    } catch {
      // fallback below
    }
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
    if (raw) {
      const allRecords = JSON.parse(raw) as AttendanceItem[];
      const idSet = new Set(studentIds);
      return allRecords.filter(
        (r) => idSet.has(r.student_id) && r.date >= startDate && r.date <= endDate
      );
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Fetch all attendance records for a specific class within a month (YYYY-MM).
 */
export async function fetchMonthClassAttendance(
  classId: ClassId,
  yearMonth: string,
  studentIds: string[]
): Promise<AttendanceItem[]> {
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;
  return fetchDateRangeClassAttendance(classId, startDate, endDate, studentIds);
}

/**
 * Calculate the aggregate overview stats for the class within a specific month.
 */
export function calculateMonthlyClassOverview(
  summaries: StudentAttendanceSummary[]
): MonthlyClassOverview {
  const totalStudents = summaries.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      averageAttendance: 0,
      totalWorkingHours: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalOD: 0,
      markedStudentsCount: 0,
    };
  }

  let totalWorking = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalOD = 0;
  let markedCount = 0;

  for (const s of summaries) {
    totalWorking += s.totalWorkingHours;
    totalPresent += s.presentHours;
    totalAbsent += s.absentHours;
    totalOD += s.odHours;
    if (s.totalWorkingHours > 0) markedCount++;
  }

  const effectivePresent = totalPresent + totalOD;
  const avgPct = totalWorking > 0 ? (effectivePresent / totalWorking) * 100 : 0;

  return {
    totalStudents,
    averageAttendance: Math.round(avgPct * 10) / 10,
    totalWorkingHours: totalWorking,
    totalPresent,
    totalAbsent,
    totalOD,
    markedStudentsCount: markedCount,
  };
}

/**
 * High-level helper: Compute summaries and overview for active students.
 */
export function computeMonthlyClassData(
  students: Student[],
  rawRecords: AttendanceItem[]
): { summaries: StudentAttendanceSummary[]; overview: MonthlyClassOverview } {
  const summaries = calculateStudentSummaries(students, rawRecords);
  const overview = calculateMonthlyClassOverview(summaries);
  return { summaries, overview };
}

/**
 * High-level helper: Fetches monthly records and calculates individual student summaries.
 */
export async function getMonthlySummariesForClass(
  classId: ClassId,
  yearMonth: string,
  students: Student[]
): Promise<{ summaries: StudentAttendanceSummary[]; overview: MonthlyClassOverview }> {
  const studentIds = students.map((s) => s.student_id);
  const rawRecords = await fetchMonthClassAttendance(classId, yearMonth, studentIds);
  return computeMonthlyClassData(students, rawRecords);
}
