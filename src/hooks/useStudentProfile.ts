import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassId, AttendanceStatus } from '../types';
import {
  StudentHistoryRecord,
  StudentProfileStats,
  fetchStudentHistory,
} from '../services/studentAttendanceService';

export function useStudentProfile(studentId: string | null, classId: ClassId) {
  const [history, setHistory] = useState<StudentHistoryRecord[]>([]);
  const [overallStats, setOverallStats] = useState<StudentProfileStats>({
    workingHours: 0,
    presentHours: 0,
    odHours: 0,
    absentHours: 0,
    percentage: 100.0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadProfile = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStudentHistory(studentId, classId);
      setHistory(res.history);
      setOverallStats(res.stats);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [studentId, classId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Distinct Months list
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const r of history) {
      months.add(r.date.slice(0, 7)); // YYYY-MM
    }
    return Array.from(months).sort().reverse();
  }, [history]);

  // Distinct Subjects list
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    for (const r of history) {
      subs.add(r.subject);
    }
    return Array.from(subs).sort();
  }, [history]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((r) => {
      // Month
      if (monthFilter !== 'all' && !r.date.startsWith(monthFilter)) return false;

      // Date Range
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Subject
      if (subjectFilter !== 'all' && r.subject !== subjectFilter) return false;

      // Status
      if (statusFilter !== 'all' && r.status !== (statusFilter as AttendanceStatus)) return false;

      return true;
    });
  }, [history, monthFilter, startDate, endDate, subjectFilter, statusFilter]);

  // Filtered Stats
  const filteredStats = useMemo(() => {
    let presentHours = 0;
    let absentHours = 0;
    let odHours = 0;

    for (const r of filteredHistory) {
      if (r.status === 'P') presentHours++;
      else if (r.status === 'A') absentHours++;
      else if (r.status === 'OD') odHours++;
    }

    const workingHours = presentHours + absentHours + odHours;
    const percentage =
      workingHours > 0
        ? Number((((presentHours + odHours) / workingHours) * 100).toFixed(1))
        : 100.0;

    return {
      workingHours,
      presentHours,
      odHours,
      absentHours,
      percentage,
    };
  }, [filteredHistory]);

  const resetFilters = () => {
    setMonthFilter('all');
    setStartDate('');
    setEndDate('');
    setSubjectFilter('all');
    setStatusFilter('all');
  };

  return {
    history,
    filteredHistory,
    overallStats,
    filteredStats,
    availableMonths,
    availableSubjects,
    loading,
    error,
    monthFilter,
    setMonthFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
    reload: loadProfile,
  };
}
