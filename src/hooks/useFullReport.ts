import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassId, StudentAttendanceSummary } from '../types';
import { Student } from '../services/studentService';
import {
  FullReportRecord,
  ReportFilterOptions,
  ReportOverviewStats,
  generateFullAttendanceReport,
} from '../services/fullReportService';
import { ACADEMIC_MONTHS } from '../services/monthlyAttendanceService';

export function useFullReport(classId: ClassId, students: Student[]) {
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');

  // Filters
  const [month, setMonth] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('all');
  const [subject, setSubject] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting
  const [detailedSortKey, setDetailedSortKey] = useState<string>('date');
  const [detailedSortDir, setDetailedSortDir] = useState<'asc' | 'desc'>('desc');

  const [summarySortKey, setSummarySortKey] = useState<string>('student_id');
  const [summarySortDir, setSummarySortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Data
  const [detailedRecords, setDetailedRecords] = useState<FullReportRecord[]>([]);
  const [summaryRecords, setSummaryRecords] = useState<StudentAttendanceSummary[]>([]);
  const [stats, setStats] = useState<ReportOverviewStats>({
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    odCount: 0,
    attendancePercentage: 0,
    uniqueStudentsCount: 0,
    uniqueDatesCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const filterOptions: ReportFilterOptions = useMemo(
    () => ({
      month,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      studentId,
      subject,
      status,
      searchQuery: searchQuery || undefined,
    }),
    [month, startDate, endDate, studentId, subject, status, searchQuery]
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateFullAttendanceReport(classId, filterOptions);
      setDetailedRecords(res.detailedRecords);
      setSummaryRecords(res.summaryRecords);
      setStats(res.stats);
      setCurrentPage(1); // reset to page 1 on filter changes
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId, filterOptions]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Distinct subjects list from current dataset
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    for (const r of detailedRecords) {
      subs.add(r.subject);
    }
    return Array.from(subs).sort();
  }, [detailedRecords]);

  // Sorted Detailed Records (All matching records)
  const sortedDetailedRecords = useMemo(() => {
    return [...detailedRecords].sort((a, b) => {
      const valA = (a as any)[detailedSortKey] || '';
      const valB = (b as any)[detailedSortKey] || '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return detailedSortDir === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return detailedSortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [detailedRecords, detailedSortKey, detailedSortDir]);

  // Paginated Detailed Records (Current page slice)
  const paginatedDetailedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDetailedRecords.slice(start, start + pageSize);
  }, [sortedDetailedRecords, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedDetailedRecords.length / pageSize));

  // Sorted Summary Records
  const sortedSummaryRecords = useMemo(() => {
    return [...summaryRecords].sort((a, b) => {
      const valA = (a as any)[summarySortKey] || '';
      const valB = (b as any)[summarySortKey] || '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return summarySortDir === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return summarySortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [summaryRecords, summarySortKey, summarySortDir]);

  const resetFilters = () => {
    setMonth('all');
    setStartDate('');
    setEndDate('');
    setStudentId('all');
    setSubject('all');
    setStatus('all');
    setSearchQuery('');
  };

  const handleDetailedSort = (key: string) => {
    if (detailedSortKey === key) {
      setDetailedSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setDetailedSortKey(key);
      setDetailedSortDir('asc');
    }
  };

  const handleSummarySort = (key: string) => {
    if (summarySortKey === key) {
      setSummarySortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSummarySortKey(key);
      setSummarySortDir('asc');
    }
  };

  return {
    viewMode,
    setViewMode,
    month,
    setMonth,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    studentId,
    setStudentId,
    subject,
    setSubject,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    resetFilters,
    filterOptions,
    // Detailed
    detailedRecords: paginatedDetailedRecords,
    allFilteredDetailedRecords: sortedDetailedRecords,
    totalDetailedCount: sortedDetailedRecords.length,
    detailedSortKey,
    detailedSortDir,
    handleDetailedSort,
    // Summary
    summaryRecords: sortedSummaryRecords,
    summarySortKey,
    summarySortDir,
    handleSummarySort,
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    // Stats & Options
    stats,
    availableSubjects,
    academicMonths: ACADEMIC_MONTHS,
    students,
    loading,
    error,
    reload: loadReport,
  };
}
