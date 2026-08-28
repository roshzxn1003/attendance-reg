/**
 * Faculty Subject Report Service
 * Calculates subject-level attendance matrices, individual student attendance percentages,
 * defaulter thresholds, and generates official university-compliant Excel and CSV exports.
 */

import * as XLSX from 'xlsx';
import { ClassId, PeriodNumber, AttendanceStatus } from '../types';
import { SUBJECTS } from '../data/subjects';
import { getSubjectForSlot, PERIOD_TIMINGS } from '../data/timetable';
import { fetchStudents, Student } from './studentService';
import { getAllDayCycleLogs, DayCycleEntry } from './dayCycleService';
import { AttendanceItem } from './attendanceService';
import { fetchDateRangeClassAttendance } from './monthlyAttendanceService';
import { CLASSES } from '../data/classes';

export interface SubjectOption {
  code: string;
  shortForm: string;
  name: string;
  facultyName: string;
  isLab: boolean;
  hoursPerWeek: string;
}

export interface SubjectSessionInfo {
  sessionKey: string; // `${date}_P${period_number}`
  date: string;
  day_number: number;
  period_number: PeriodNumber;
  time_range: string;
  presentCount: number;
  absentCount: number;
  odCount: number;
  absenteeStudentNames: string[];
}

export interface StudentSubjectAttendance {
  sNo: number;
  student_id: string;
  student_name: string;
  class_id: ClassId;
  totalHeld: number;
  presentHours: number;
  odHours: number;
  absentHours: number;
  percentage: number;
  status: 'eligible' | 'warning' | 'critical'; // >=75% eligible, 65-74% warning, <65% critical
  sessionMarks: Record<string, AttendanceStatus | null>;
}

export interface FacultySubjectReportData {
  classId: ClassId;
  classNameTitle: string;
  subject: SubjectOption;
  startDate: string;
  endDate: string;
  dateLabel: string;
  sessions: SubjectSessionInfo[];
  students: StudentSubjectAttendance[];
  totalSessionsHeld: number;
  classAveragePercentage: number;
  eligibleCount: number;
  warningCount: number;
  criticalCount: number;
}

export interface FacultyReportFilter {
  subjectKey: string; // e.g. 'OS', 'DM', 'DBMS', 'DAA', 'IOT', 'CA', 'AI', etc.
  startDate?: string;
  endDate?: string;
  month?: string; // 'all' or 'YYYY-MM'
  defaulterFilter?: 'all' | 'eligible' | 'warning' | 'critical';
  search?: string;
}

/**
 * Get available subject list for a specific class
 */
export function getAvailableSubjectsForClass(classId: ClassId): SubjectOption[] {
  return Object.values(SUBJECTS).filter((subj) => {
    if (classId === 'CSE-25' && subj.shortForm === 'AI') return false;
    if (classId === 'AIDS-25' && subj.shortForm === 'CA') return false;
    return true;
  });
}

/**
 * Generate Subject-level Attendance Report for Faculty
 */
export async function generateFacultySubjectReport(
  classId: ClassId,
  filters: FacultyReportFilter
): Promise<FacultySubjectReportData> {
  const targetSubjectKey = filters.subjectKey.toUpperCase().trim();
  const subjectMeta = SUBJECTS[targetSubjectKey] || {
    code: 'SPIHER-SUB',
    shortForm: targetSubjectKey,
    name: targetSubjectKey,
    facultyName: 'Faculty In-Charge',
    isLab: targetSubjectKey.includes('LAB'),
    hoursPerWeek: '4',
  };

  // 1. Fetch active students and day cycle logs concurrently
  const [allStudents, dayLogs] = await Promise.all([
    fetchStudents(classId),
    getAllDayCycleLogs(classId),
  ]);

  const activeStudents = allStudents.filter((s) => s.active !== false);
  const studentMap = new Map<string, Student>();
  for (const s of activeStudents) {
    studentMap.set(s.student_id, s);
  }
  const studentIds = Array.from(studentMap.keys());

  const dayLogMap = new Map<string, DayCycleEntry>();
  for (const log of dayLogs) {
    dayLogMap.set(log.date, log);
  }

  // 2. Determine Date Filter Boundaries
  let filterStart = filters.startDate || '2026-07-01';
  let filterEnd = filters.endDate || '2026-12-31';
  let dateLabel = `${filterStart} to ${filterEnd}`;

  if (filters.month && filters.month !== 'all') {
    const [y, m] = filters.month.split('-');
    const daysInM = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    filterStart = `${filters.month}-01`;
    filterEnd = `${filters.month}-${String(daysInM).padStart(2, '0')}`;
    dateLabel = filters.month;
  }

  // 3. Fetch only required date-range attendance records
  const allRecords = await fetchDateRangeClassAttendance(
    classId,
    filterStart,
    filterEnd,
    studentIds
  );

  // 5. Identify all sessions where this subject was scheduled & taught
  // Group records by session key: `${date}_P${period_number}`
  const sessionRecordsMap = new Map<string, AttendanceItem[]>();

  for (const rec of allRecords) {
    if (rec.date < filterStart || rec.date > filterEnd) continue;

    const dayLog = dayLogMap.get(rec.date);
    const dayNum = dayLog?.day_number || 1;
    const resolvedSubject = getSubjectForSlot(dayNum as any, rec.period_number, classId).toUpperCase();

    // Check if slot matches target subject
    const matches =
      resolvedSubject === targetSubjectKey ||
      (targetSubjectKey === 'CA' && resolvedSubject.includes('CA')) ||
      (targetSubjectKey === 'AI' && resolvedSubject.includes('AI'));

    if (!matches) continue;

    const key = `${rec.date}_P${rec.period_number}`;
    if (!sessionRecordsMap.has(key)) {
      sessionRecordsMap.set(key, []);
    }
    sessionRecordsMap.get(key)!.push(rec);
  }

  // Sort sessions chronologically by date and period
  const sortedSessionKeys = Array.from(sessionRecordsMap.keys()).sort((a, b) => {
    const [dateA, pA] = a.split('_P');
    const [dateB, pB] = b.split('_P');
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return parseInt(pA, 10) - parseInt(pB, 10);
  });

  const sessions: SubjectSessionInfo[] = [];
  for (const key of sortedSessionKeys) {
    const [date, periodStr] = key.split('_P');
    const periodNum = parseInt(periodStr, 10) as PeriodNumber;
    const dayLog = dayLogMap.get(date);
    const dayNum = dayLog?.day_number || 1;
    const records = sessionRecordsMap.get(key) || [];

    const timingSlot = PERIOD_TIMINGS.find((p) => p.period === periodNum);
    const time_range = timingSlot ? timingSlot.label : `Period ${periodNum}`;

    let pCount = 0;
    let aCount = 0;
    let odCount = 0;
    const absentNames: string[] = [];

    for (const r of records) {
      if (r.status === 'P') pCount++;
      else if (r.status === 'A') {
        aCount++;
        const s = studentMap.get(r.student_id);
        absentNames.push(s ? `${s.name} (${s.student_id})` : r.student_id);
      } else if (r.status === 'OD') odCount++;
    }

    sessions.push({
      sessionKey: key,
      date,
      day_number: dayNum,
      period_number: periodNum,
      time_range,
      presentCount: pCount,
      absentCount: aCount,
      odCount: odCount,
      absenteeStudentNames: absentNames,
    });
  }

  const totalSessionsHeld = sessions.length;

  // 6. Compute per-student subject attendance records
  let totalClassPresent = 0;
  let totalClassOD = 0;
  let totalClassWorking = 0;
  let eligibleCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  const rawStudents: StudentSubjectAttendance[] = activeStudents.map((student, idx) => {
    const sessionMarks: Record<string, AttendanceStatus | null> = {};
    let presentHours = 0;
    let absentHours = 0;
    let odHours = 0;

    for (const session of sessions) {
      const records = sessionRecordsMap.get(session.sessionKey) || [];
      const match = records.find((r) => r.student_id === student.student_id);
      const status = match ? match.status : null;
      sessionMarks[session.sessionKey] = status;

      if (status === 'P') presentHours++;
      else if (status === 'A') absentHours++;
      else if (status === 'OD') odHours++;
    }

    const totalHeld = presentHours + absentHours + odHours;
    const percentage =
      totalHeld > 0
        ? Number((((presentHours + odHours) / totalHeld) * 100).toFixed(1))
        : 100.0;

    let status: 'eligible' | 'warning' | 'critical' = 'eligible';
    if (percentage < 65.0) {
      status = 'critical';
      criticalCount++;
    } else if (percentage < 75.0) {
      status = 'warning';
      warningCount++;
    } else {
      status = 'eligible';
      eligibleCount++;
    }

    totalClassPresent += presentHours;
    totalClassOD += odHours;
    totalClassWorking += totalHeld;

    return {
      sNo: idx + 1,
      student_id: student.student_id,
      student_name: student.name,
      class_id: student.class_id,
      totalHeld,
      presentHours,
      odHours,
      absentHours,
      percentage,
      status,
      sessionMarks,
    };
  });

  // Apply Defaulter & Search Filters
  let filteredStudents = rawStudents;

  if (filters.defaulterFilter && filters.defaulterFilter !== 'all') {
    filteredStudents = filteredStudents.filter((s) => s.status === filters.defaulterFilter);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    filteredStudents = filteredStudents.filter(
      (s) =>
        s.student_id.toLowerCase().includes(q) ||
        s.student_name.toLowerCase().includes(q)
    );
  }

  const classAveragePercentage =
    totalClassWorking > 0
      ? Number((((totalClassPresent + totalClassOD) / totalClassWorking) * 100).toFixed(1))
      : 0.0;

  const classMeta = CLASSES[classId];
  const classNameTitle = classMeta ? classMeta.name : classId;

  return {
    classId,
    classNameTitle,
    subject: subjectMeta,
    startDate: filterStart,
    endDate: filterEnd,
    dateLabel,
    sessions,
    students: filteredStudents,
    totalSessionsHeld,
    classAveragePercentage,
    eligibleCount,
    warningCount,
    criticalCount,
  };
}

/**
 * Export Official University-Format Faculty Subject Attendance Register to Excel (.xlsx)
 */
export function exportFacultySubjectExcel(data: FacultySubjectReportData): void {
  const wb = XLSX.utils.book_new();

  // ════════════════════════════════════════════════════════════════════════════
  // SHEET 1: SUBJECT ATTENDANCE REGISTER MATRIX
  // ════════════════════════════════════════════════════════════════════════════
  const rows: (string | number | null)[][] = [];

  // University Header Rows
  rows.push(["ST. PETER'S INSTITUTE OF HIGHER EDUCATION AND RESEARCH"]);
  rows.push(['FACULTY SUBJECT PERIOD ATTENDANCE REGISTER (ROOM 245)']);
  rows.push([
    `Class: ${data.classNameTitle} (${data.classId}) | Semester: III | Academic Year: 2026–2027`,
  ]);
  rows.push([
    `Subject: ${data.subject.code} - ${data.subject.name} (${data.subject.shortForm}) | Faculty: ${data.subject.facultyName}`,
  ]);
  rows.push([`Period Range: ${data.dateLabel} | Total Sessions Held: ${data.totalSessionsHeld}`]);
  rows.push([]); // Blank row

  // Table Headers
  const headerRow1: (string | number | null)[] = ['S.No', 'Register No', 'Student Name'];
  const headerRow2: (string | number | null)[] = ['', '', ''];

  for (const session of data.sessions) {
    const [, m, d] = session.date.split('-');
    headerRow1.push(`${d}/${m}`);
    headerRow2.push(`P${session.period_number} (DO${session.day_number})`);
  }

  // Totals columns
  headerRow1.push('HELD', 'PRESENT', 'OD', 'ABSENT', 'ATT %', 'STATUS');
  headerRow2.push('HOURS', 'HOURS', 'HOURS', 'HOURS', '', 'ELIGIBILITY');

  rows.push(headerRow1);
  rows.push(headerRow2);

  // Student Data Rows
  for (const s of data.students) {
    const rowData: (string | number | null)[] = [s.sNo, s.student_id, s.student_name];

    for (const session of data.sessions) {
      const mark = s.sessionMarks[session.sessionKey];
      rowData.push(mark === 'P' ? 'P' : mark === 'A' ? 'A' : mark === 'OD' ? 'OD' : '—');
    }

    const eligibilityText =
      s.percentage >= 75.0 ? 'ELIGIBLE' : s.percentage >= 65.0 ? 'CONDONATION' : 'DEBARRED';

    rowData.push(
      s.totalHeld,
      s.presentHours,
      s.odHours,
      s.absentHours,
      `${s.percentage.toFixed(1)}%`,
      eligibilityText
    );

    rows.push(rowData);
  }

  // Signatures at bottom
  rows.push([]);
  rows.push([]);
  rows.push([
    'Class Average Attendance: ' + data.classAveragePercentage.toFixed(1) + '%',
    '',
    '',
    '',
    '',
    'Signature of Subject Faculty',
    '',
    '',
    'Signature of Class Advisor',
    '',
    'Signature of HOD',
  ]);

  const wsRegister = XLSX.utils.aoa_to_sheet(rows);

  // Set merged headers
  wsRegister['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Subtitle
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, // Class
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // Subject & Faculty
    { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }, // Date Range
  ];

  // Set Column Widths
  const colWidths: { wch: number }[] = [
    { wch: 6 },  // S.No
    { wch: 16 }, // Reg No
    { wch: 28 }, // Name
  ];

  for (let i = 0; i < data.sessions.length; i++) {
    colWidths.push({ wch: 10 }); // Session date columns
  }

  colWidths.push(
    { wch: 10 }, // Held
    { wch: 10 }, // Present
    { wch: 8 },  // OD
    { wch: 10 }, // Absent
    { wch: 12 }, // Att %
    { wch: 16 }  // Status
  );

  wsRegister['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, wsRegister, `${data.subject.shortForm} Register Matrix`);

  // ════════════════════════════════════════════════════════════════════════════
  // SHEET 2: STUDENT SUMMARY & DEFAULTER ROSTER
  // ════════════════════════════════════════════════════════════════════════════
  const summaryJson = data.students.map((s) => ({
    'S.No': s.sNo,
    'Register No': s.student_id,
    'Student Name': s.student_name,
    'Subject': `${data.subject.code} - ${data.subject.shortForm}`,
    'Faculty': data.subject.facultyName,
    'Classes Held': s.totalHeld,
    'Classes Attended': s.presentHours + s.odHours,
    'Classes Absent': s.absentHours,
    'OD Hours': s.odHours,
    'Attendance %': `${s.percentage.toFixed(1)}%`,
    'Status': s.percentage >= 75.0 ? 'Eligible' : s.percentage >= 65.0 ? 'Warning (<75%)' : 'Critical (<65%)',
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryJson);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 20 },
    { wch: 28 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Student Summary');

  // ════════════════════════════════════════════════════════════════════════════
  // SHEET 3: SESSION AUDIT LOG
  // ════════════════════════════════════════════════════════════════════════════
  const sessionLogJson = data.sessions.map((sess, idx) => ({
    'Session No': idx + 1,
    'Date': sess.date,
    'Day Order': `Day Order ${sess.day_number}`,
    'Period': `Period ${sess.period_number}`,
    'Timing': sess.time_range,
    'Subject': data.subject.name,
    'Present Count': sess.presentCount,
    'Absent Count': sess.absentCount,
    'OD Count': sess.odCount,
    'Attendance %':
      sess.presentCount + sess.absentCount + sess.odCount > 0
        ? `${(((sess.presentCount + sess.odCount) / (sess.presentCount + sess.absentCount + sess.odCount)) * 100).toFixed(1)}%`
        : '0.0%',
    'Absentees': sess.absenteeStudentNames.join(', ') || 'Nil',
  }));

  const wsSessions = XLSX.utils.json_to_sheet(sessionLogJson);
  wsSessions['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSessions, 'Session Audit Log');

  // Write and download workbook
  const sanitizedSubject = data.subject.shortForm.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${data.classId}_Faculty_Report_${sanitizedSubject}_${data.startDate}_to_${data.endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export Faculty Subject Report to CSV
 */
export function exportFacultySubjectCSV(data: FacultySubjectReportData): void {
  const headers = [
    'S.No',
    'Register No',
    'Student Name',
    'Subject Code',
    'Subject Name',
    'Faculty',
    'Classes Held',
    'Classes Attended',
    'Classes Absent',
    'OD Hours',
    'Attendance %',
    'Eligibility Status',
  ];

  const rows = data.students.map((s) => [
    s.sNo,
    s.student_id,
    `"${s.student_name.replace(/"/g, '""')}"`,
    `"${data.subject.code}"`,
    `"${data.subject.name.replace(/"/g, '""')}"`,
    `"${data.subject.facultyName.replace(/"/g, '""')}"`,
    s.totalHeld,
    s.presentHours + s.odHours,
    s.absentHours,
    s.odHours,
    `${s.percentage.toFixed(1)}%`,
    s.percentage >= 75.0 ? 'Eligible' : s.percentage >= 65.0 ? 'Warning (<75%)' : 'Critical (<65%)',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const sanitizedSubject = data.subject.shortForm.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `${data.classId}_Faculty_Subject_${sanitizedSubject}_Summary.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
