/**
 * Student Service — Supabase CRUD operations for the students table
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ClassId } from '../types';
import { ParsedStudentRow } from '../lib/parseXlsx';
import { MASTER_STUDENTS } from '../data/students';

export interface Student {
  student_id: string;
  class_id: ClassId;
  name: string;
  email: string | null;
  active: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const LOCAL_STORAGE_STUDENTS_KEY = 'smart_cr_students_cache';

function getLocalStudents(): Student[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return MASTER_STUDENTS.map((s) => ({
    student_id: s.student_id,
    class_id: s.class_id as ClassId,
    name: s.name,
    email: s.email || null,
    active: s.active ?? true,
  }));
}

function saveLocalStudents(list: Student[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** Fetch all students, optionally filtered by class */
export async function fetchStudents(classId?: ClassId): Promise<Student[]> {
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('students')
        .select('student_id, class_id, name, email, active')
        .order('student_id', { ascending: true });

      if (classId) query = query.eq('class_id', classId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as Student[];
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to verified local roster
  const localList = getLocalStudents();
  if (classId) {
    return localList.filter((s) => s.class_id === classId);
  }
  return localList;
}

/**
 * Add a single new student
 */
export async function createStudent(newStudent: {
  student_id: string;
  class_id: ClassId;
  name: string;
  email?: string | null;
}): Promise<void> {
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('students').insert({
      student_id: newStudent.student_id,
      class_id: newStudent.class_id,
      name: newStudent.name,
      email: newStudent.email || null,
      active: true,
    });
    if (error) throw new Error((error as { message: string }).message);
  }

  const current = getLocalStudents();
  if (current.some((s) => s.student_id === newStudent.student_id)) {
    throw new Error(`Student with roll number ${newStudent.student_id} already exists.`);
  }

  current.push({
    student_id: newStudent.student_id,
    class_id: newStudent.class_id,
    name: newStudent.name,
    email: newStudent.email || null,
    active: true,
  });

  saveLocalStudents(current);
}

/** Upsert a batch of parsed rows from the XLSX / CSV.
 *  Inserts new students only — existing student_ids are skipped.
 */
export async function importStudents(rows: ParsedStudentRow[]): Promise<ImportResult> {
  if (rows.length === 0) return { imported: 0, skipped: 0, errors: [] };

  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Detect duplicates client-side for the report
    const { data: existing } = await sb
      .from('students')
      .select('student_id')
      .in('student_id', rows.map((r) => r.student_id));

    const existingIds = new Set(
      ((existing ?? []) as Array<{ student_id: string }>).map((r) => r.student_id)
    );

    const newRows = rows.filter((r) => !existingIds.has(r.student_id));
    const skipped = rows.length - newRows.length;

    if (newRows.length === 0) return { imported: 0, skipped, errors: [] };

    const payload = newRows.map((r) => ({
      student_id: r.student_id,
      class_id: r.class_id,
      name: r.name,
      email: r.email,
      active: true,
    }));

    const { error } = await sb.from('students').insert(payload);

    if (!error) {
      return { imported: newRows.length, skipped, errors: [] };
    }

    // Bulk failed — try row-by-row
    const errors: string[] = [];
    let imported = 0;
    for (const row of newRows) {
      const { error: rowErr } = await sb.from('students').insert({
        student_id: row.student_id,
        class_id: row.class_id,
        name: row.name,
        email: row.email,
        active: true,
      });
      if (rowErr) {
        const e = rowErr as { code: string; message: string };
        if (e.code !== '23505') {
          errors.push(`${row.student_id} (${row.name}): ${e.message}`);
        }
      } else {
        imported++;
      }
    }
    return { imported, skipped: skipped + (newRows.length - imported - errors.length), errors };
  }

  // Local fallback import
  const current = getLocalStudents();
  const currentMap = new Map(current.map((s) => [s.student_id, s]));
  let imported = 0;
  let skipped = 0;

  for (const r of rows) {
    if (currentMap.has(r.student_id)) {
      skipped++;
    } else {
      currentMap.set(r.student_id, {
        student_id: r.student_id,
        class_id: r.class_id,
        name: r.name,
        email: r.email,
        active: true,
      });
      imported++;
    }
  }

  saveLocalStudents(Array.from(currentMap.values()));
  return { imported, skipped, errors: [] };
}

/** Update a student's name and/or email */
export async function updateStudent(
  studentId: string,
  updates: { name?: string; email?: string | null }
): Promise<void> {
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('students')
      .update(updates)
      .eq('student_id', studentId);
    if (error) throw new Error((error as { message: string }).message);
  }

  const current = getLocalStudents();
  const updated = current.map((s) => (s.student_id === studentId ? { ...s, ...updates } : s));
  saveLocalStudents(updated);
}

/** Toggle active status (deactivate / reactivate) */
export async function setStudentActive(studentId: string, active: boolean): Promise<void> {
  if (isSupabaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('students')
      .update({ active })
      .eq('student_id', studentId);
    if (error) throw new Error((error as { message: string }).message);
  }

  const current = getLocalStudents();
  const updated = current.map((s) => (s.student_id === studentId ? { ...s, active } : s));
  saveLocalStudents(updated);
}
