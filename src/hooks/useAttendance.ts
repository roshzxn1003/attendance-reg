import { useState, useEffect, useCallback, useMemo } from 'react';
import { AttendanceStatus, ClassId, PeriodNumber } from '../types';
import { Student } from '../services/studentService';
import {
  fetchPeriodAttendance,
  savePeriodAttendance,
  calculateAttendanceStats,
  PeriodAttendanceStats,
} from '../services/attendanceService';

export function useAttendance(
  classId: ClassId,
  date: string,
  periodNumber: PeriodNumber,
  students: Student[]
) {
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  const [lastMarkedAt, setLastMarkedAt] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<{
    savedCount: number;
    markedAt: string;
    stats: PeriodAttendanceStats;
  } | null>(null);

  // Active students only
  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(null);
    try {
      const { records, exists, lastMarkedAt: savedTime } = await fetchPeriodAttendance(
        classId,
        date,
        periodNumber
      );

      setIsAlreadySaved(exists);
      setLastMarkedAt(savedTime);

      if (exists && records.length > 0) {
        const markMap: Record<string, AttendanceStatus> = {};
        for (const r of records) {
          markMap[r.student_id] = r.status;
        }
        setMarks(markMap);
      } else {
        // Unmarked by default
        setMarks({});
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId, date, periodNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const markStudent = (studentId: string, status: AttendanceStatus) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: status,
    }));
    setSaveSuccess(null);
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    for (const s of activeStudents) {
      next[s.student_id] = 'P';
    }
    setMarks(next);
    setSaveSuccess(null);
  };

  const clearAll = () => {
    setMarks({});
    setSaveSuccess(null);
  };

  const stats = useMemo(() => {
    return calculateAttendanceStats(marks, activeStudents.length);
  }, [marks, activeStudents.length]);

  const isAllMarked = useMemo(() => {
    if (activeStudents.length === 0) return false;
    return activeStudents.every((s) => Boolean(marks[s.student_id]));
  }, [marks, activeStudents]);

  const save = async (): Promise<{ savedCount: number; markedAt: string }> => {
    if (!isAllMarked) {
      throw new Error(`Please mark attendance for all ${activeStudents.length} students (${stats.notMarked} remaining unmarked).`);
    }

    setSaving(true);
    setError(null);
    try {
      const studentMarks = activeStudents.map((s) => ({
        student_id: s.student_id,
        status: marks[s.student_id] || 'A',
      }));

      const res = await savePeriodAttendance(classId, date, periodNumber, studentMarks);

      setIsAlreadySaved(true);
      setLastMarkedAt(res.markedAt);
      setSaveSuccess({
        savedCount: res.savedCount,
        markedAt: res.markedAt,
        stats,
      });

      return res;
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    marks,
    stats,
    isAlreadySaved,
    lastMarkedAt,
    isAllMarked,
    activeStudents,
    loading,
    saving,
    error,
    saveSuccess,
    markStudent,
    markAllPresent,
    clearAll,
    save,
    reload: load,
  };
}
