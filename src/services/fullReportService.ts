/**
 * Full Attendance Report Service
 * Dynamically resolves attendance records with students, timetable, and day_cycle_log.
 * No duplicate tables are created. Day numbers are strictly mapped from day_cycle_log.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AttendanceStatus, ClassId, PeriodNumber, StudentAttendanceSummary } from '../types';
import { getSubjectForSlot, PERIOD_TIMINGS } from '../data/timetable';
import { getAllDayCycleLogs, DayCycleEntry } from './dayCycleService';
import { fetchStudents, Student } from './studentService';
import { AttendanceItem } from './attendanceService';

export interface FullReportRecord {
  attendance_id: string;
  student_id: string;
  student_name: string;
  class_id: ClassId;
  date: string; // YYYY-MM-DD
  day_number: number;
  period_number: PeriodNumber;
  subject: string;
  time_range: string;
  status: AttendanceStatus;
  marked_at: string;
}

export interface ReportFilterOptions {
  month?: string; // 'all' or 'YYYY-MM'
  startDate?: string;
  endDate?: string;
  studentId?: string; // 'all' or specific student_id
  subject?: string; // 'all' or specific subject
  status?: string; // 'all' | 'P' | 'A' | 'OD'
  searchQuery?: string;
}

export interface ReportOverviewStats {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  odCount: number;
  attendancePercentage: number;
  uniqueStudentsCount: number;
  uniqueDatesCount: number;
}

const LOCAL_STORAGE_ATTENDANCE_KEY = 'smart_cr_attendance_records';

/**
 * Fetch and construct the complete attendance report dataset for a class
 */
export async function generateFullAttendanceReport(
  classId: ClassId,
  filters: ReportFilterOptions
): Promise<{
  detailedRecords: FullReportRecord[];
  summaryRecords: StudentAttendanceSummary[];
  stats: ReportOverviewStats;
}> {
  // 1. Fetch active students for this class
  const classStudents = await fetchStudents(classId);
  const activeStudents = classStudents.filter((s) => s.active !== false);
  const studentMap = new Map<string, Student>();
  for (const s of activeStudents) {
    studentMap.set(s.student_id, s);
  }
  const studentIds = Array.from(studentMap.keys());

  // 2. Fetch day cycle logs for this class (for accurate Day Order mapping from day_cycle_log)
  const dayLogs = await getAllDayCycleLogs(classId);
  const dayLogMap = new Map<string, DayCycleEntry>();
  for (const l of dayLogs) {
    dayLogMap.set(l.date, l);
  }

  // 3. Fetch raw attendance records
  let rawAttendance: AttendanceItem[] = [];

  if (isSupabaseConfigured() && studentIds.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      let query = sb
        .from('attendance')
        .select('*')
        .in('student_id', studentIds);

      if (filters.month && filters.month !== 'all') {
        query = query
          .gte('date', `${filters.month}-01`)
          .lte('date', `${filters.month}-31`);
      }
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('period_number', { ascending: true });

      if (!error && data) {
        rawAttendance = data as AttendanceItem[];
      }
    } catch {
      // fallback below
    }
  }

  if (rawAttendance.length === 0) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AttendanceItem[];
        const idSet = new Set(studentIds);
        rawAttendance = parsed.filter((r) => idSet.has(r.student_id));
      }
    } catch {
      // ignore
    }
  }

  // 4. Resolve full joined details
  const detailedRecords: FullReportRecord[] = [];
  const uniqueDates = new Set<string>();
  const uniqueStudents = new Set<string>();

  let presentCount = 0;
  let absentCount = 0;
  let odCount = 0;

  for (const r of rawAttendance) {
    const student = studentMap.get(r.student_id);
    const student_name = student?.name || r.student_id;

    // Resolve Day Number strictly from day_cycle_log
    const dayCycle = dayLogMap.get(r.date);
    const dayNum = dayCycle?.day_number || 1;

    // Resolve Subject
    const resolvedSubject = getSubjectForSlot(dayNum as any, r.period_number, classId);

    // Resolve Timing
    const timingSlot = PERIOD_TIMINGS.find((p) => p.period === r.period_number);
    const time_range = timingSlot ? timingSlot.label : `Period ${r.period_number}`;

    // Apply client-side filters (Month, Date Range, Student, Subject, Status, Search)
    if (filters.month && filters.month !== 'all' && !r.date.startsWith(filters.month)) {
      continue;
    }
    if (filters.startDate && r.date < filters.startDate) {
      continue;
    }
    if (filters.endDate && r.date > filters.endDate) {
      continue;
    }
    if (filters.studentId && filters.studentId !== 'all' && r.student_id !== filters.studentId) {
      continue;
    }
    if (filters.subject && filters.subject !== 'all' && resolvedSubject !== filters.subject) {
      continue;
    }
    if (filters.status && filters.status !== 'all' && r.status !== filters.status) {
      continue;
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      const match =
        r.student_id.toLowerCase().includes(q) ||
        student_name.toLowerCase().includes(q) ||
        resolvedSubject.toLowerCase().includes(q) ||
        r.date.includes(q);
      if (!match) continue;
    }

    if (r.status === 'P') presentCount++;
    else if (r.status === 'A') absentCount++;
    else if (r.status === 'OD') odCount++;

    uniqueDates.add(r.date);
    uniqueStudents.add(r.student_id);

    detailedRecords.push({
      attendance_id: r.attendance_id || `rep-${r.student_id}-${r.date}-${r.period_number}`,
      student_id: r.student_id,
      student_name,
      class_id: classId,
      date: r.date,
      day_number: dayNum,
      period_number: r.period_number,
      subject: resolvedSubject,
      time_range,
      status: r.status,
      marked_at: r.marked_at || new Date().toISOString(),
    });
  }

  // Sort records descending by date, ascending by period, then by student_id
  detailedRecords.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.period_number !== b.period_number) return a.period_number - b.period_number;
    return a.student_id.localeCompare(b.student_id);
  });

  // 5. Calculate Summary Mode (Per Student aggregation from filtered records)
  const studentRecordGroups: Record<string, FullReportRecord[]> = {};
  for (const rec of detailedRecords) {
    if (!studentRecordGroups[rec.student_id]) {
      studentRecordGroups[rec.student_id] = [];
    }
    studentRecordGroups[rec.student_id].push(rec);
  }

  const summaryRecords: StudentAttendanceSummary[] = classStudents
    .filter((s) => (filters.studentId && filters.studentId !== 'all' ? s.student_id === filters.studentId : true))
    .map((s) => {
      const list = studentRecordGroups[s.student_id] || [];
      let p = 0;
      let a = 0;
      let od = 0;

      for (const item of list) {
        if (item.status === 'P') p++;
        else if (item.status === 'A') a++;
        else if (item.status === 'OD') od++;
      }

      const totalWorkingHours = p + a + od;
      const percentage =
        totalWorkingHours > 0
          ? Number((((p + od) / totalWorkingHours) * 100).toFixed(1))
          : 100.0;

      return {
        student_id: s.student_id,
        student_name: s.name,
        class_id: classId,
        totalWorkingHours,
        presentHours: p,
        odHours: od,
        absentHours: a,
        percentage,
      };
    });

  const totalRecords = presentCount + absentCount + odCount;
  const attendancePercentage =
    totalRecords > 0
      ? Number((((presentCount + odCount) / totalRecords) * 100).toFixed(1))
      : 0.0;

  return {
    detailedRecords,
    summaryRecords,
    stats: {
      totalRecords,
      presentCount,
      absentCount,
      odCount,
      attendancePercentage,
      uniqueStudentsCount: uniqueStudents.size,
      uniqueDatesCount: uniqueDates.size,
    },
  };
}
