import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassId, StudentAttendanceSummary } from '../types';
import { Student } from '../services/studentService';
import {
  AttendanceItem,
  fetchDateAttendance,
  fetchAllClassAttendance,
  calculateDailyOverview,
  calculateStudentSummaries,
  DailyAttendanceOverview,
} from '../services/attendanceService';

// In-memory cache for full class history to avoid redundant multi-megabyte queries across date changes
const classRecordsCache = new Map<ClassId, { records: AttendanceItem[]; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function useAttendanceDashboard(
  classId: ClassId,
  selectedDate: string,
  students: Student[]
) {
  const [dateRecords, setDateRecords] = useState<AttendanceItem[]>([]);
  const [allClassRecords, setAllClassRecords] = useState<AttendanceItem[]>(() => {
    const cached = classRecordsCache.get(classId);
    return cached ? cached.records : [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  // Fast load: Fetch only selected date attendance immediately (~50ms)
  const loadDateData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const studentIds = activeStudents.map((s) => s.student_id);
      const dateData = await fetchDateAttendance(classId, selectedDate, studentIds);
      setDateRecords(dateData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId, selectedDate, activeStudents]);

  // Background load: Fetch cumulative class history asynchronously with cache
  const loadCumulativeData = useCallback(async (forceRefresh = false) => {
    try {
      const studentIds = activeStudents.map((s) => s.student_id);
      if (studentIds.length === 0) return;

      const cached = classRecordsCache.get(classId);
      const now = Date.now();
      if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
        setAllClassRecords(cached.records);
        return;
      }

      const allData = await fetchAllClassAttendance(classId, studentIds);
      classRecordsCache.set(classId, { records: allData, timestamp: Date.now() });
      setAllClassRecords(allData);
    } catch {
      // Non-fatal: dateRecords still active and usable
    }
  }, [classId, activeStudents]);

  useEffect(() => {
    loadDateData();
  }, [loadDateData]);

  useEffect(() => {
    loadCumulativeData();
  }, [loadCumulativeData]);

  const reload = useCallback(async () => {
    await Promise.all([loadDateData(), loadCumulativeData(true)]);
  }, [loadDateData, loadCumulativeData]);

  // Today's overview stats across all periods
  const dailyOverview: DailyAttendanceOverview = useMemo(() => {
    return calculateDailyOverview(dateRecords, activeStudents.length, 7);
  }, [dateRecords, activeStudents.length]);

  // Student summary for selected date
  const todaySummaries: StudentAttendanceSummary[] = useMemo(() => {
    return calculateStudentSummaries(activeStudents, dateRecords);
  }, [activeStudents, dateRecords]);

  // Cumulative student summary across all dates
  const cumulativeSummaries: StudentAttendanceSummary[] = useMemo(() => {
    return calculateStudentSummaries(activeStudents, allClassRecords);
  }, [activeStudents, allClassRecords]);

  return {
    dateRecords,
    dailyOverview,
    todaySummaries,
    cumulativeSummaries,
    loading,
    error,
    reload,
  };
}
