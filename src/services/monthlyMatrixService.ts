/**
 * Monthly Period Matrix Grid Service
 * Generates the official university monthly attendance register template.
 * Matches:
 *   B.TECH (CSE) 2025-2029 | II YEAR | III SEM
 *                 JULY 2026
 * ┌────┬────────────┬──────────────┬───────────────┬──────────────┐
 * │ No │ Reg No     │ Student Name │ 01/07         │ ...          │
 * │    │            │              │ 1 2 3 4 5 6 7 │              │
 * ├────┼────────────┼──────────────┼───────────────┼──────────────┤
 * │ 1  │ SPC25CSU001│ ABU BUHARI I │ ✓ ✓ ✓ ✓ ✓ ✓ ✓ │ ...          │
 * └────┴────────────┴──────────────┴───────────────┴──────────────┘
 */

import * as XLSX from 'xlsx';
import { ClassId, AttendanceStatus } from '../types';
import { fetchStudents } from './studentService';
import { fetchMonthClassAttendance } from './monthlyAttendanceService';
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
  monthLabel: string;   // e.g. "JULY 2026"
  dateColumns: MatrixDateColumn[];
  students: StudentMatrixRow[];
  totalClassWorkingHours: number;
  totalClassPresentHours: number;
  totalClassODHours: number;
  totalClassAbsentHours: number;
  classAveragePercentage: number;
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
 * Compute the complete monthly period grid matrix dataset.
 */
export async function generateMonthlyMatrix(
  classId: ClassId,
  yearMonth: string, // "2026-08"
  onlyMarkedDates = false
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

  // 3. Fetch Monthly Attendance
  const rawRecords = await fetchMonthClassAttendance(classId, yearMonth, studentIds);

  // Map attendance by `${student_id}_${date}_${period}`
  const marksMap = new Map<string, AttendanceStatus>();
  const datesWithAttendance = new Set<string>();

  for (const r of rawRecords) {
    marksMap.set(`${r.student_id}_${r.date}_${r.period_number}`, r.status);
    datesWithAttendance.add(r.date);
  }

  // 4. Build Date Columns
  const allMonthDates = getDatesInMonth(yearMonth);
  const filteredDates = onlyMarkedDates
    ? allMonthDates.filter((d) => datesWithAttendance.has(d) || dayLogMap.has(d))
    : allMonthDates;

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

  const [y, m] = yearMonth.split('-');
  const monthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const monthLabel = monthDate
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();

  return {
    classId,
    headerBanner,
    monthLabel,
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
 * Export the Period Matrix Grid as an authentic formatted College Attendance Register in Excel (.xlsx)
 */
export function exportMonthlyMatrixExcel(
  data: MonthlyMatrixData,
  displayTickMark = true
): void {
  const wb = XLSX.utils.book_new();

  // Construct AoA (Array of Arrays) for multi-level merged headers
  const aoa: any[][] = [];

  // Row 1: Title Banner
  aoa.push([`${data.headerBanner} - ${data.monthLabel}`]);

  // Row 2: Header Level 1 (Date Spans)
  const row2: any[] = ['No', 'Reg No', 'Student Name'];
  for (const col of data.dateColumns) {
    row2.push(col.dayMonthLabel);
    for (let p = 2; p <= 7; p++) {
      row2.push(''); // placeholder for horizontal merge
    }
  }
  row2.push('TOTAL HOURS PRESENT', 'WORKING HOURS', 'OD HOURS', 'ABSENT HOURS', 'ATTENDANCE %');
  aoa.push(row2);

  // Row 3: Header Level 2 (Periods 1..7)
  const row3: any[] = ['', '', ''];
  for (const _col of data.dateColumns) {
    for (let p = 1; p <= 7; p++) {
      row3.push(p);
    }
  }
  row3.push('', '', '', '', '');
  aoa.push(row3);

  // Rows 4+: Student Rows
  for (const s of data.students) {
    const row: any[] = [s.sNo, s.regNo, s.studentName];

    for (const col of data.dateColumns) {
      for (let p = 1; p <= 7; p++) {
        const mark = s.marks[`${col.dateStr}_${p}`];
        if (mark === 'P') {
          row.push(displayTickMark ? '✓' : 'P');
        } else if (mark === 'A') {
          row.push('A');
        } else if (mark === 'OD') {
          row.push('OD');
        } else {
          row.push('—');
        }
      }
    }

    const presentWithOD = s.totalPresent + s.totalOD;
    row.push(
      presentWithOD,
      s.totalWorking,
      s.totalOD,
      s.totalAbsent,
      s.totalWorking > 0 ? `${s.percentage.toFixed(1)}%` : '—'
    );
    aoa.push(row);
  }

  // Bottom Summary Row
  const bottomRow: any[] = ['', '', 'TOTAL PRESENT / PERIOD'];
  for (const col of data.dateColumns) {
    for (let p = 1; p <= 7; p++) {
      let periodPresentCount = 0;
      for (const s of data.students) {
        const mark = s.marks[`${col.dateStr}_${p}`];
        if (mark === 'P' || mark === 'OD') periodPresentCount++;
      }
      bottomRow.push(periodPresentCount);
    }
  }
  bottomRow.push(
    data.totalClassPresentHours + data.totalClassODHours,
    data.totalClassWorkingHours,
    data.totalClassODHours,
    data.totalClassAbsentHours,
    `${data.classAveragePercentage.toFixed(1)}%`
  );
  aoa.push(bottomRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Define Merges
  const merges: XLSX.Range[] = [];

  // Merge Title Banner across all columns (Row 0)
  const totalCols = 3 + data.dateColumns.length * 7 + 5;
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });

  // Merge Leading Columns vertically (Rows 1-2)
  merges.push({ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }); // No
  merges.push({ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }); // Reg No
  merges.push({ s: { r: 1, c: 2 }, e: { r: 2, c: 2 } }); // Student Name

  // Merge Date Columns horizontally across 7 periods (Row 1)
  let colIndex = 3;
  for (let i = 0; i < data.dateColumns.length; i++) {
    merges.push({ s: { r: 1, c: colIndex }, e: { r: 1, c: colIndex + 6 } });
    colIndex += 7;
  }

  // Merge Trailing Summary Columns vertically (Rows 1-2)
  merges.push({ s: { r: 1, c: colIndex }, e: { r: 2, c: colIndex } });     // Total Hours Present
  merges.push({ s: { r: 1, c: colIndex + 1 }, e: { r: 2, c: colIndex + 1 } }); // Working Hours
  merges.push({ s: { r: 1, c: colIndex + 2 }, e: { r: 2, c: colIndex + 2 } }); // OD Hours
  merges.push({ s: { r: 1, c: colIndex + 3 }, e: { r: 2, c: colIndex + 3 } }); // Absent Hours
  merges.push({ s: { r: 1, c: colIndex + 4 }, e: { r: 2, c: colIndex + 4 } }); // Attendance %

  ws['!merges'] = merges;

  // Set Column Widths
  const colWidths: XLSX.ColInfo[] = [
    { wch: 6 },  // No
    { wch: 15 }, // Reg No
    { wch: 24 }, // Student Name
  ];

  for (let i = 0; i < data.dateColumns.length * 7; i++) {
    colWidths.push({ wch: 4 }); // Period columns
  }

  colWidths.push(
    { wch: 22 }, // Total Hours Present
    { wch: 16 }, // Working Hours
    { wch: 12 }, // OD Hours
    { wch: 14 }, // Absent Hours
    { wch: 15 }  // Attendance %
  );

  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, `${data.monthLabel.slice(0, 15)} Register`);

  const fileName = `${data.classId}_Attendance_Register_${data.monthLabel.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
