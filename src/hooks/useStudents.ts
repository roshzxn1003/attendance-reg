import { useState, useEffect, useCallback } from 'react';
import { ClassId } from '../types';
import {
  Student,
  fetchStudents,
  setStudentActive,
  updateStudent,
  createStudent,
} from '../services/studentService';

interface UseStudentsReturn {
  students: Student[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  toggleActive: (studentId: string, active: boolean) => Promise<void>;
  editStudent: (studentId: string, updates: { name?: string; email?: string | null }) => Promise<void>;
  addStudent: (newStudent: {
    student_id: string;
    class_id: ClassId;
    name: string;
    email?: string | null;
  }) => Promise<void>;
}

export function useStudents(classId?: ClassId): UseStudentsReturn {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudents(classId);
      setStudents(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (studentId: string, active: boolean) => {
    await setStudentActive(studentId, active);
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, active } : s))
    );
  };

  const editStudent = async (
    studentId: string,
    updates: { name?: string; email?: string | null }
  ) => {
    await updateStudent(studentId, updates);
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, ...updates } : s))
    );
  };

  const addStudent = async (newStudent: {
    student_id: string;
    class_id: ClassId;
    name: string;
    email?: string | null;
  }) => {
    await createStudent(newStudent);
    await load();
  };

  return { students, loading, error, reload: load, toggleActive, editStudent, addStudent };
}
