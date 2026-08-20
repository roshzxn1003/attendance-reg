import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassId } from '../types';
import { Student } from '../services/studentService';
import {

  fetchMonthClassAttendance,
  computeMonthlyClassData,
  ACADEMIC_MONTHS,
} from '../services/monthlyAttendanceService';

export function useMonthlyAttendance(
  classId: ClassId,
  students: Student[],
  defaultMonth = '2026-08'
) {
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [rawMonthRecords, setRawMonthRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

  const loadMonthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const studentIds = activeStudents.map((s) => s.student_id);
      const records = await fetchMonthClassAttendance(classId, selectedMonth, studentIds);
      setRawMonthRecords(records);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId, selectedMonth, activeStudents]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const { summaries, overview } = useMemo(() => {
    return computeMonthlyClassData(activeStudents, rawMonthRecords);
  }, [activeStudents, rawMonthRecords]);

  const currentMonthLabel = useMemo(() => {
    return (
      ACADEMIC_MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth
    );
  }, [selectedMonth]);

  return {
    selectedMonth,
    setSelectedMonth,
    currentMonthLabel,
    monthlySummaries: summaries,
    monthlyOverview: overview,
    academicMonths: ACADEMIC_MONTHS,
    loading,
    error,
    reload: loadMonthData,
  };
}
