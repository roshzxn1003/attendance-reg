/**
 * Monthly Attendance Service
 * Handles month-filtered dynamic calculations and aggregate class stats.
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

const LOCAL_STORAGE_ATTENDANCE_KEY = 'smart_cr_attendance_records';

/**
 * Fetch all attendance records for a specific class within a month (YYYY-MM).
 */
export async function fetchMonthClassAttendance(
  _classId: ClassId,
  yearMonth: string,
  studentIds: string[]
): Promise<AttendanceItem[]> {
  if (studentIds.length === 0) return [];

  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;

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
 * Compute monthly summary for all students in the class + aggregate class statistics
 */
export function computeMonthlyClassData(
  students: Student[],
  monthlyRecords: AttendanceItem[]
): {
  summaries: StudentAttendanceSummary[];
  overview: MonthlyClassOverview;
} {
  const activeStudents = students.filter((s) => s.active);
  const summaries = calculateStudentSummaries(activeStudents, monthlyRecords);

  let totalWorkingHours = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalOD = 0;
  let markedStudentsCount = 0;

  for (const s of summaries) {
    totalWorkingHours += s.totalWorkingHours;
    totalPresent += s.presentHours;
    totalAbsent += s.absentHours;
    totalOD += s.odHours;
    if (s.totalWorkingHours > 0) {
      markedStudentsCount++;
    }
  }

  // Formula: (Total Present + Total OD) / Total Working Hours * 100
  const averageAttendance =
    totalWorkingHours > 0
      ? Number((((totalPresent + totalOD) / totalWorkingHours) * 100).toFixed(1))
      : 0.0;

  return {
    summaries,
    overview: {
      totalStudents: activeStudents.length,
      averageAttendance,
      totalWorkingHours,
      totalPresent,
      totalAbsent,
      totalOD,
      markedStudentsCount,
    },
  };
}
