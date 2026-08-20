/**
 * Export Utility
 * Generates formatted multi-sheet Excel workbooks and CSV files for currently filtered attendance data.
 */

import * as XLSX from 'xlsx';
import { ClassId, StudentAttendanceSummary } from '../types';
import { FullReportRecord, ReportFilterOptions } from '../services/fullReportService';
import { ACADEMIC_MONTHS } from '../services/monthlyAttendanceService';

/**
 * Generate a meaningful, context-aware filename for the export.
 * e.g. CSE-25_Attendance_August-2026.xlsx
 */
export function generateExportFileName(
  classId: ClassId,
  filters: ReportFilterOptions,
  extension: 'xlsx' | 'csv'
): string {
  const parts: string[] = [classId, 'Attendance'];

  if (filters.month && filters.month !== 'all') {
    const monthObj = ACADEMIC_MONTHS.find((m) => m.value === filters.month);
    const monthLabel = monthObj ? monthObj.label.replace(' ', '-') : filters.month;
    parts.push(monthLabel);
  } else if (filters.startDate && filters.endDate) {
    parts.push(`${filters.startDate}_to_${filters.endDate}`);
  } else if (filters.startDate) {
    parts.push(`from_${filters.startDate}`);
  } else if (filters.endDate) {
    parts.push(`until_${filters.endDate}`);
  }

  if (filters.subject && filters.subject !== 'all') {
    parts.push(filters.subject.replace(/\s+/g, '-'));
  }

  if (filters.status && filters.status !== 'all') {
    parts.push(`Status-${filters.status}`);
  }

  const baseName = parts.join('_').replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `${baseName}.${extension}`;
}

/**
 * Export currently filtered records to a multi-sheet Excel (.xlsx) file.
 * Sheet 1: Attendance Details
 * Sheet 2: Student Summary
 */
export function exportAttendanceToExcel(
  detailedRecords: FullReportRecord[],
  summaryRecords: StudentAttendanceSummary[],
  classId: ClassId,
  filters: ReportFilterOptions
): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Attendance Details ──
  const detailsData = detailedRecords.map((r) => ({
    'Roll No': r.student_id,
    'Name': r.student_name,
    'Class': r.class_id,
    'Date': r.date,
    'Day Number': `Day Order ${r.day_number}`,
    'Period': `Period ${r.period_number} (${r.time_range})`,
    'Subject': r.subject,
    'Status': r.status,
  }));

  const wsDetails = XLSX.utils.json_to_sheet(
    detailsData.length > 0
      ? detailsData
      : [
          {
            'Roll No': '',
            'Name': '',
            'Class': classId,
            'Date': '',
            'Day Number': '',
            'Period': '',
            'Subject': '',
            'Status': '',
          },
        ]
  );

  // Column widths for Sheet 1
  wsDetails['!cols'] = [
    { wch: 16 }, // Roll No
    { wch: 26 }, // Name
    { wch: 10 }, // Class
    { wch: 14 }, // Date
    { wch: 14 }, // Day Number
    { wch: 28 }, // Period
    { wch: 22 }, // Subject
    { wch: 10 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsDetails, 'Attendance Details');

  // ── Sheet 2: Student Summary ──
  const summaryData = summaryRecords.map((s) => ({
    'Roll No': s.student_id,
    'Name': s.student_name,
    'Class': s.class_id,
    'Working Hours': s.totalWorkingHours,
    'Present Hours': s.presentHours,
    'OD Hours': s.odHours,
    'Absent Hours': s.absentHours,
    'Attendance %': s.totalWorkingHours > 0 ? `${s.percentage.toFixed(1)}%` : '—',
  }));

  const wsSummary = XLSX.utils.json_to_sheet(
    summaryData.length > 0
      ? summaryData
      : [
          {
            'Roll No': '',
            'Name': '',
            'Class': classId,
            'Working Hours': 0,
            'Present Hours': 0,
            'OD Hours': 0,
            'Absent Hours': 0,
            'Attendance %': '—',
          },
        ]
  );

  // Column widths for Sheet 2
  wsSummary['!cols'] = [
    { wch: 16 }, // Roll No
    { wch: 26 }, // Name
    { wch: 10 }, // Class
    { wch: 14 }, // Working Hours
    { wch: 14 }, // Present Hours
    { wch: 12 }, // OD Hours
    { wch: 14 }, // Absent Hours
    { wch: 14 }, // Attendance %
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Student Summary');

  const fileName = generateExportFileName(classId, filters, 'xlsx');
  XLSX.writeFile(wb, fileName);
}

/**
 * Export currently filtered detailed records to a CSV (.csv) file.
 */
export function exportAttendanceToCSV(
  detailedRecords: FullReportRecord[],
  classId: ClassId,
  filters: ReportFilterOptions
): void {
  const headers = ['Roll No', 'Name', 'Class', 'Date', 'Day Number', 'Period', 'Subject', 'Status'];

  const rows = detailedRecords.map((r) => [
    r.student_id,
    `"${r.student_name.replace(/"/g, '""')}"`,
    r.class_id,
    r.date,
    `"Day Order ${r.day_number}"`,
    `"Period ${r.period_number} (${r.time_range})"`,
    `"${r.subject.replace(/"/g, '""')}"`,
    r.status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', generateExportFileName(classId, filters, 'csv'));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
