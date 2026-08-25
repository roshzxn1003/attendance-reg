/**
 * Backlog Attendance Service
 * Handles rapid date-by-date attendance entry for handwritten registers,
 * short-digit roll number resolution, custom period selection,
 * automated Day Order 1–6 cycle calculation, and bulk persistence.
 */

import { ClassId, PeriodNumber, AttendanceStatus, DayNumber } from '../types';
import { Student } from './studentService';
import { saveMultiplePeriodsAttendance, fetchDateAttendance, AttendanceItem } from './attendanceService';
import { setWorkingDayOrder, markHolidayForDate, getAllDayCycleLogs, DayCycleEntry } from './dayCycleService';
import { fetchDateRangeClassAttendance } from './monthlyAttendanceService';

export interface AbsenteeEntry {
  student: Student;
  shortNo: number;
  periodScope: 'fullday' | 'morning' | 'afternoon' | 'custom';
  customPeriods: PeriodNumber[];
  status: 'A' | 'OD';
}

export interface DayBacklogState {
  date: string;
  isHoliday: boolean;
  holidayReason?: string;
  dayOrderNumber: DayNumber;
  absentees: AbsenteeEntry[];
  odStudents: AbsenteeEntry[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  odCount: number;
}

export interface DateBacklogStatus {
  date: string;
  isMarked: boolean;
  isHoliday: boolean;
  dayOrder?: number;
  periodsCount: number;
  absentCount: number;
  odCount: number;
}

export interface MonthBacklogProgress {
  totalCalendarDays: number;
  totalWorkingDays: number;
  markedDays: number;
  holidaysCount: number;
  remainingWorkingDays: number;
  percentComplete: number;
  dateStatuses: DateBacklogStatus[];
}

/**
 * Parse string of periods like "2,4" or "1-4" or "p2,p5" into array of PeriodNumber
 */
export function parseCustomPeriodsString(periodStr: string): PeriodNumber[] {
  const clean = periodStr.toLowerCase().replace(/p/g, '').trim();
  const periods = new Set<PeriodNumber>();

  const parts = clean.split(/[,+\s]+/);
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let p = Math.max(1, start); p <= Math.min(7, end); p++) {
          periods.add(p as PeriodNumber);
        }
      }
    } else {
      const p = parseInt(part.trim(), 10);
      if (!isNaN(p) && p >= 1 && p <= 7) {
        periods.add(p as PeriodNumber);
      }
    }
  }

  const sorted = Array.from(periods).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : [1, 2, 3, 4, 5, 6, 7];
}

/**
 * Parse a raw user input token which might have period suffix attached
 * e.g. "4(2,4)", "18(p1-p4)", "25:p2,p5", "4"
 */
export function parseInputTokenWithPeriods(token: string): {
  identifier: string;
  customPeriods?: PeriodNumber[];
} {
  const clean = token.trim();
  const match = clean.match(/^([a-zA-Z0-9_-]+)(?:[\(:]([0-9pP,\-\s+]+)\)?)?$/);

  if (match) {
    const identifier = match[1];
    const periodStr = match[2];
    if (periodStr && periodStr.trim()) {
      return {
        identifier,
        customPeriods: parseCustomPeriodsString(periodStr),
      };
    }
    return { identifier };
  }

  return { identifier: clean };
}

/**
 * Resolve short roll numbers, full roll numbers, or student names
 * Examples: '4' -> SPC25CSU004, '018' -> SPC25CSU018, '25' -> SPC25CSU025, 'Arun' -> SPC25CSU004
 */
export function resolveStudentInput(input: string, students: Student[]): Student | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  // 1. Check if numeric (short roll number, e.g. "4", "04", "004")
  const numericVal = parseInt(clean, 10);
  if (!isNaN(numericVal) && numericVal > 0) {
    const match = students.find((s) => {
      // Extract numeric suffix from student_id (e.g. SPC25CSU004 -> 4)
      const numMatch = s.student_id.match(/(\d+)$/);
      if (numMatch) {
        const studentNum = parseInt(numMatch[1], 10);
        return studentNum === numericVal;
      }
      return false;
    });
    if (match) return match;
  }

  // 2. Exact or partial roll number match
  const rollMatch = students.find((s) => s.student_id.toLowerCase().includes(clean));
  if (rollMatch) return rollMatch;

  // 3. Name match
  const nameMatch = students.find((s) => s.name.toLowerCase().includes(clean));
  if (nameMatch) return nameMatch;

  return null;
}

/**
 * Get short sequential number (1..60) for a student in class roster
 */
export function getStudentShortNumber(student: Student, allStudents: Student[]): number {
  const idx = allStudents.findIndex((s) => s.student_id === student.student_id);
  if (idx !== -1) return idx + 1;
  const numMatch = student.student_id.match(/(\d+)$/);
  return numMatch ? parseInt(numMatch[1], 10) : 1;
}

/**
 * Timezone-safe date arithmetic (avoids UTC / IST day shift bugs)
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days, 12, 0, 0);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate all calendar dates (YYYY-MM-DD) between start and end dates (timezone-safe)
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let curr = startDate;
  while (curr <= endDate) {
    dates.push(curr);
    curr = addDaysToDateString(curr, 1);
  }
  return dates;
}

/**
 * Check if a date string is Sunday (timezone-safe at noon)
 */
export function isDateSunday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0;
}

/**
 * Automatically compute suggested Day Order (1–6) for a date based on previous entries
 */
export function computeSuggestedDayOrder(
  date: string,
  allDayLogs: DayCycleEntry[],
  defaultStartDay: DayNumber = 1
): DayNumber {
  const sortedLogs = [...allDayLogs]
    .filter((l) => l.date < date && !l.is_holiday && l.day_number !== null && l.day_number !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sortedLogs.length === 0) {
    return defaultStartDay;
  }

  const lastDay = sortedLogs[0].day_number || 1;
  return (((lastDay % 6) + 1) as DayNumber);
}

/**
 * Fetch progress overview for a date range (e.g. 2026-08-01 to 2026-09-30)
 */
export async function getBacklogProgress(
  classId: ClassId,
  startDate: string,
  endDate: string,
  students: Student[]
): Promise<MonthBacklogProgress> {
  const dates = generateDateRange(startDate, endDate);
  const dayLogs = await getAllDayCycleLogs(classId);
  const dayLogMap = new Map<string, DayCycleEntry>();
  for (const l of dayLogs) {
    dayLogMap.set(l.date, l);
  }

  // Fetch all attendance for this class using unified helper
  const studentIds = students.map((s) => s.student_id);
  const allRecords: AttendanceItem[] = await fetchDateRangeClassAttendance(
    classId,
    startDate,
    endDate,
    studentIds
  );

  const recordsByDate = new Map<string, AttendanceItem[]>();
  for (const r of allRecords) {
    if (!recordsByDate.has(r.date)) {
      recordsByDate.set(r.date, []);
    }
    recordsByDate.get(r.date)!.push(r);
  }

  let totalWorkingDays = 0;
  let markedDays = 0;
  let holidaysCount = 0;

  const dateStatuses: DateBacklogStatus[] = dates.map((date) => {
    const dayLog = dayLogMap.get(date);
    const dateRecs = recordsByDate.get(date) || [];
    const isHoliday = dayLog?.is_holiday || isDateSunday(date);
    const periodsCount = new Set(dateRecs.map((r) => r.period_number)).size;
    const isMarked = periodsCount >= 7 || (isHoliday && dayLog?.is_holiday === true);

    let absentCount = 0;
    let odCount = 0;
    for (const r of dateRecs) {
      if (r.status === 'A') absentCount++;
      if (r.status === 'OD') odCount++;
    }

    if (isHoliday) {
      holidaysCount++;
    } else {
      totalWorkingDays++;
      if (periodsCount >= 7) {
        markedDays++;
      }
    }

    return {
      date,
      isMarked,
      isHoliday,
      dayOrder: dayLog?.day_number ? dayLog.day_number : undefined,
      periodsCount,
      absentCount,
      odCount,
    };
  });

  const remainingWorkingDays = Math.max(0, totalWorkingDays - markedDays);
  const percentComplete =
    totalWorkingDays > 0 ? Math.round((markedDays / totalWorkingDays) * 100) : 0;

  return {
    totalCalendarDays: dates.length,
    totalWorkingDays,
    markedDays,
    holidaysCount,
    remainingWorkingDays,
    percentComplete,
    dateStatuses,
  };
}

/**
 * Reconstruct accurate absentee entries from stored database records across ALL 7 periods.
 * This guarantees that when navigating between dates, no custom period records or absentees are lost.
 */
export async function reconstructDayAbsentees(
  classId: ClassId,
  date: string,
  activeStudents: Student[]
): Promise<AbsenteeEntry[]> {
  const studentIds = activeStudents.map((s) => s.student_id);
  const records = await fetchDateAttendance(classId, date, studentIds);

  if (records.length === 0) return [];

  // Group records by student_id
  const studentRecordsMap = new Map<string, AttendanceItem[]>();
  for (const r of records) {
    if (!studentRecordsMap.has(r.student_id)) {
      studentRecordsMap.set(r.student_id, []);
    }
    studentRecordsMap.get(r.student_id)!.push(r);
  }

  const result: AbsenteeEntry[] = [];

  for (const student of activeStudents) {
    const recs = studentRecordsMap.get(student.student_id) || [];
    const nonPresentRecs = recs.filter((r) => r.status === 'A' || r.status === 'OD');

    if (nonPresentRecs.length > 0) {
      // Determine dominant status (if any are A, it's A; if all are OD, it's OD)
      const hasA = nonPresentRecs.some((r) => r.status === 'A');
      const status: 'A' | 'OD' = hasA ? 'A' : 'OD';

      const customPeriods = Array.from(
        new Set(nonPresentRecs.map((r) => r.period_number))
      ).sort((a, b) => a - b) as PeriodNumber[];

      let periodScope: 'fullday' | 'morning' | 'afternoon' | 'custom' = 'custom';
      if (customPeriods.length === 7) {
        periodScope = 'fullday';
      } else if (
        customPeriods.length === 4 &&
        customPeriods[0] === 1 &&
        customPeriods[1] === 2 &&
        customPeriods[2] === 3 &&
        customPeriods[3] === 4
      ) {
        periodScope = 'morning';
      } else if (
        customPeriods.length === 3 &&
        customPeriods[0] === 5 &&
        customPeriods[1] === 6 &&
        customPeriods[2] === 7
      ) {
        periodScope = 'afternoon';
      }

      result.push({
        student,
        shortNo: getStudentShortNumber(student, activeStudents),
        periodScope,
        customPeriods,
        status,
      });
    }
  }

  return result;
}

/**
 * Save an entire day's attendance and day cycle entry atomically
 */
export async function saveDayBacklogAttendance(
  classId: ClassId,
  date: string,
  dayOrderNumber: DayNumber,
  isHoliday: boolean,
  holidayReason: string | undefined,
  activeStudents: Student[],
  absenteeEntries: AbsenteeEntry[]
): Promise<{ success: boolean; savedSessionsCount: number; message: string }> {
  // Case 1: Holiday
  if (isHoliday) {
    await markHolidayForDate(classId, date, holidayReason || 'Holiday', 'Marked via Rapid Backlog Wizard');
    return {
      success: true,
      savedSessionsCount: 0,
      message: `Marked ${date} as Holiday (${holidayReason || 'Holiday'}). Day Order cycle paused.`,
    };
  }

  // Case 2: Working Day — Save Day Order first
  await setWorkingDayOrder(classId, date, dayOrderNumber, `Rapid Backlog Entry - Day Order ${dayOrderNumber}`);

  // Build attendance records for all 7 periods
  // Default: Every student is 'P' across all 7 periods
  // Override: Any student in absenteeEntries gets 'A' or 'OD' based on their period scope
  const all7Periods: PeriodNumber[] = [1, 2, 3, 4, 5, 6, 7];

  for (const period of all7Periods) {
    const studentMarks: Array<{ student_id: string; status: AttendanceStatus }> = activeStudents.map(
      (student) => {
        // Check if student is listed in absentees for this period
        const match = absenteeEntries.find((a) => a.student.student_id === student.student_id);

        if (match) {
          let appliesToPeriod = false;
          if (match.periodScope === 'fullday') {
            appliesToPeriod = true;
          } else if (match.periodScope === 'morning' && period <= 4) {
            appliesToPeriod = true;
          } else if (match.periodScope === 'afternoon' && period >= 5) {
            appliesToPeriod = true;
          } else if (match.periodScope === 'custom' && match.customPeriods.includes(period)) {
            appliesToPeriod = true;
          }

          if (appliesToPeriod) {
            return {
              student_id: student.student_id,
              status: match.status,
            };
          }
        }

        // Otherwise Present
        return {
          student_id: student.student_id,
          status: 'P',
        };
      }
    );

    // Save period attendance
    await saveMultiplePeriodsAttendance(classId, date, [period], studentMarks);
  }

  return {
    success: true,
    savedSessionsCount: 7,
    message: `Successfully saved all 7 periods for ${date} (Day Order ${dayOrderNumber}) with ${absenteeEntries.length} absentees.`,
  };
}
