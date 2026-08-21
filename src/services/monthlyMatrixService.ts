/**
 * Monthly & Multi-Month Period Matrix Grid Service
 * Generates the official university attendance register template across:
 *   - Single Month (e.g. August 2026)
 *   - Multi-Month Range (e.g. 2 months, 3 months, 5 months / full semester)
 *   - Custom Date Range (e.g. 2026-08-01 to 2026-11-30)
 *
 * ┌────┬────────────┬──────────────┬───────────────┬───────┬──────┬─────┬────────┐
 * │ No │ Reg No     │ Student Name │ 01/08         │ ...   │ PRES │ WRK │ ATT %  │
 * │    │            │              │ 1 2 3 4 5 6 7 │       │      │     │        │
 * └────┴────────────┴──────────────┴───────────────┴───────┴──────┴─────┴────────┘
 */

import * as XLSX from 'xlsx';
import { ClassId, AttendanceStatus } from '../types';
import { fetchStudents } from './studentService';
import { fetchDateRangeClassAttendance } from './monthlyAttendanceService';
import { getAllDayCycleLogs, DayCycleEntry } from './dayCycleService';
import { CLASSES } from '../data/classes';

export interface MatrixDateColumn {
  dateStr: string;      // "2026-08-01"
  dayMonthLabel: string;// "01/08"
  dayOfWeek: string;    // "Sat"
  dayNumber?: number;   // 1..6
  isHoliday: boolean;
  holidayReason?: string;
  hasAttendance: boolean;
}

export interface StudentMatrixRow {
  sNo: number;
  regNo: string;
  studentName: string;
  classId: ClassId;
  marks: Record<string, AttendanceStatus | null>; // key: `${dateStr}_${period}`
  totalWorking: number;
  totalPresent: number;
  totalOD: number;
  totalAbsent: number;
  percentage: number;
}

export interface MonthlyMatrixData {
  classId: ClassId;
  headerBanner: string; // e.g. "B.TECH (CSE) 2025-2029 | II YEAR | III SEM"
  monthLabel: string;   // e.g. "AUGUST 2026 – DECEMBER 2026 (5 MONTHS)"
  startDate: string;
  endDate: string;
  dateColumns: MatrixDateColumn[];
  students: StudentMatrixRow[];
  totalClassWorkingHours: number;
  totalClassPresentHours: number;
  totalClassODHours: number;
  totalClassAbsentHours: number;
  classAveragePercentage: number;
}

/**
 * Generate all calendar dates between startDate and endDate (inclusive).
 */
export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDate}T12:00:00`);
  const stop = new Date(`${endDate}T12:00:00`);

  while (curr <= stop) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }

  return dates;
}

/**
 * Generate all calendar dates for a given month (YYYY-MM).
 */
export function getDatesInMonth(yearMonth: string): string[] {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayPadded = String(d).padStart(2, '0');
    dates.push(`${yearMonth}-${dayPadded}`);
  }
  return dates;
}

/**
 * Compute the complete period grid matrix dataset across any Custom Date Range (1 to N months).
 */
export async function generateDateRangeMatrix(
  classId: ClassId,
  startDate: string,
  endDate: string,
  onlyMarkedDates = false,
  customRangeLabel?: string
): Promise<MonthlyMatrixData> {
  // 1. Fetch Students
  const allStudents = await fetchStudents(classId);
  const activeStudents = allStudents.filter((s) => s.active);
  const studentIds = activeStudents.map((s) => s.student_id);

  // 2. Fetch Day Cycle Logs
  const dayLogs = await getAllDayCycleLogs(classId);
  const dayLogMap = new Map<string, DayCycleEntry>();
  for (const l of dayLogs) {
    dayLogMap.set(l.date, l);
  }

  // 3. Fetch Attendance within date range
  const rawRecords = await fetchDateRangeClassAttendance(classId, startDate, endDate, studentIds);

  // Map attendance by `${student_id}_${date}_${period}`
  const marksMap = new Map<string, AttendanceStatus>();
  const datesWithAttendance = new Set<string>();

  for (const r of rawRecords) {
    marksMap.set(`${r.student_id}_${r.date}_${r.period_number}`, r.status);
    datesWithAttendance.add(r.date);
  }

  // 4. Build Date Columns
  const allRangeDates = getDatesInRange(startDate, endDate);
  const filteredDates = onlyMarkedDates
    ? allRangeDates.filter((d) => datesWithAttendance.has(d) || dayLogMap.has(d))
    : allRangeDates;

  const dateColumns: MatrixDateColumn[] = filteredDates.map((dateStr) => {
    const [, month, day] = dateStr.split('-');
    const dt = new Date(`${dateStr}T12:00:00`);
    const dayOfWeek = dt.toLocaleDateString('en-US', { weekday: 'short' });
    const log = dayLogMap.get(dateStr);

    return {
      dateStr,
      dayMonthLabel: `${day}/${month}`,
      dayOfWeek,
      dayNumber: log?.day_number || undefined,
      isHoliday: log?.is_holiday || false,
      holidayReason: log?.holiday_reason || undefined,
      hasAttendance: datesWithAttendance.has(dateStr),
    };
  });

  // 5. Build Student Rows
  let totalClassWorking = 0;
  let totalClassPresent = 0;
  let totalClassOD = 0;
  let totalClassAbsent = 0;

  const studentRows: StudentMatrixRow[] = activeStudents.map((s, idx) => {
    const marks: Record<string, AttendanceStatus | null> = {};
    let present = 0;
    let absent = 0;
    let od = 0;

    for (const col of dateColumns) {
      for (let p = 1; p <= 7; p++) {
        const key = `${col.dateStr}_${p}`;
        const mark = marksMap.get(`${s.student_id}_${key}`) || null;
        marks[key] = mark;

        if (mark === 'P') present++;
        else if (mark === 'A') absent++;
        else if (mark === 'OD') od++;
      }
    }

    const working = present + absent + od;
    const percentage =
      working > 0 ? Number((((present + od) / working) * 100).toFixed(1)) : 100.0;

    totalClassWorking += working;
    totalClassPresent += present;
    totalClassOD += od;
    totalClassAbsent += absent;

    return {
      sNo: idx + 1,
      regNo: s.student_id,
      studentName: s.name,
      classId,
      marks,
      totalWorking: working,
      totalPresent: present,
      totalOD: od,
      totalAbsent: absent,
      percentage,
    };
  });

  const classAvg =
    totalClassWorking > 0
      ? Number((((totalClassPresent + totalClassOD) / totalClassWorking) * 100).toFixed(1))
      : 0.0;

  // Header Banner
  const classMeta = CLASSES[classId];
  const degreeStr = classId === 'CSE-25' ? 'B.TECH (CSE)' : 'B.TECH (AIDS)';
  const headerBanner = `${degreeStr} 2025-2029 | II YEAR | ${classMeta?.semester?.toUpperCase() || 'III SEM'}`;

  // Formulate Month / Date Range Label
  let monthLabel = customRangeLabel;
  if (!monthLabel) {
    const startDt = new Date(`${startDate}T12:00:00`);
    const endDt = new Date(`${endDate}T12:00:00`);
    const startStr = startDt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endStr = endDt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (startStr === endStr) {
      monthLabel = startDt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    } else {
      monthLabel = `${startStr.toUpperCase()} – ${endStr.toUpperCase()}`;
    }
  }

  return {
    classId,
    headerBanner,
    monthLabel,
    startDate,
    endDate,
    dateColumns,
    students: studentRows,
    totalClassWorkingHours: totalClassWorking,
    totalClassPresentHours: totalClassPresent,
    totalClassODHours: totalClassOD,
    totalClassAbsentHours: totalClassAbsent,
    classAveragePercentage: classAvg,
  };
}

/**
 * Compute monthly matrix (Single month backward compatibility).
 */
export async function generateMonthlyMatrix(
  classId: ClassId,
  yearMonth: string, // "2026-08"
  onlyMarkedDates = false
): Promise<MonthlyMatrixData> {
  const [y, m] = yearMonth.split('-');
  const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;

  const monthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return generateDateRangeMatrix(classId, startDate, endDate, onlyMarkedDates, label);
}

/**
 * Export Monthly / Multi-Month Matrix to formatted Excel (.xlsx) file.
 */
export function exportMonthlyMatrixExcel(
  data: MonthlyMatrixData,
  useTickMark = true
): void {
  const rows: (string | number)[][] = [];

  // Row 1: University Banner
  rows.push(["ST. PETER'S INSTITUTE OF HIGHER EDUCATION AND RESEARCH"]);
  // Row 2: Department & Academic Year
  rows.push([data.headerBanner]);
  // Row 3: Month / Date Range
  rows.push([`ATTENDANCE REGISTER: ${data.monthLabel}`]);
  // Row 4: Empty separator
  rows.push([]);

  // Row 5: Header Level 1 (Date Spans)
  const headerL1: (string | number)[] = ['S.No', 'Register No', 'Student Name'];
  for (const col of data.dateColumns) {
    const dayLabel = `${col.dayMonthLabel} (${col.dayOfWeek})`;
    headerL1.push(dayLabel);
    for (let p = 2; p <= 7; p++) {
      headerL1.push(''); // placeholder for merge
    }
  }
  headerL1.push('Working Hours', 'Total Present', 'On Duty (OD)', 'Absent', 'Attendance %');
  rows.push(headerL1);

  // Row 6: Header Level 2 (Periods 1..7)
  const headerL2: (string | number)[] = ['', '', ''];
  for (let i = 0; i < data.dateColumns.length; i++) {
    for (let p = 1; p <= 7; p++) {
      headerL2.push(p);
    }
  }
  headerL2.push('', '', '', '', '');
  rows.push(headerL2);

  // Student Rows
  for (const s of data.students) {
    const rowData: (string | number)[] = [s.sNo, s.regNo, s.studentName];

    for (const col of data.dateColumns) {
      for (let p = 1; p <= 7; p++) {
        const mark = s.marks[`${col.dateStr}_${p}`];
        if (mark === 'P') {
          rowData.push(useTickMark ? '✓' : 'P');
        } else if (mark === 'A') {
          rowData.push('A');
        } else if (mark === 'OD') {
          rowData.push('OD');
        } else {
          rowData.push(col.isHoliday ? 'H' : '-');
        }
      }
    }

    rowData.push(s.totalWorking, s.totalPresent, s.totalOD, s.totalAbsent, `${s.percentage}%`);
    rows.push(rowData);
  }

  // Row: Class Averages
  const summaryRow: (string | number)[] = ['TOTAL', '', 'CLASS TOTALS / AVERAGE'];
  for (let i = 0; i < data.dateColumns.length * 7; i++) {
    summaryRow.push('');
  }
  summaryRow.push(
    data.totalClassWorkingHours,
    data.totalClassPresentHours,
    data.totalClassODHours,
    data.totalClassAbsentHours,
    `${data.classAveragePercentage}%`
  );
  rows.push(summaryRow);

  // Create Worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Configure column widths
  const colWidths: { wch: number }[] = [
    { wch: 6 },  // S.No
    { wch: 15 }, // Reg No
    { wch: 26 }, // Student Name
  ];

  for (let i = 0; i < data.dateColumns.length * 7; i++) {
    colWidths.push({ wch: 4 });
  }

  colWidths.push({ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 });
  ws['!cols'] = colWidths;

  // Create Workbook & Save
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Register');

  const cleanLabel = data.monthLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `SPIHER_${data.classId}_Attendance_Register_${cleanLabel}.xlsx`;
  XLSX.writeFile(wb, filename);
}
