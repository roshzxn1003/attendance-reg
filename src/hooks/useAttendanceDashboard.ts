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

export function useAttendanceDashboard(
  classId: ClassId,
  selectedDate: string,
  students: Student[]
) {
  const [dateRecords, setDateRecords] = useState<AttendanceItem[]>([]);
  const [allClassRecords, setAllClassRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const studentIds = activeStudents.map((s) => s.student_id);

      // Concurrent fetch for selected date and cumulative records
      const [dateData, allData] = await Promise.all([
        fetchDateAttendance(classId, selectedDate, studentIds),
        fetchAllClassAttendance(classId, studentIds),
      ]);

      setDateRecords(dateData);
      setAllClassRecords(allData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId, selectedDate, activeStudents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    reload: loadData,
  };
}
