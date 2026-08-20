/**
 * Admin Settings & System Control Service
 * Handles password-protected admin operations:
 *   1. Full System Diagnostics & Health Monitor
 *   2. Attendance, Day-Cycle, and Roster Resets
 *   3. 1-Click Database JSON Backup & Restore
 *   4. Bulk Student Operations (Reactivate all, Reset passwords)
 *   5. Full Factory Reset
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ClassId } from '../types';
import { MASTER_STUDENTS } from '../data/students';
import { DEFAULT_ADMIN_PASSWORDS } from './authService';

export interface SystemDiagnostics {
  isDatabaseConnected: boolean;
  totalStudents: number;
  activeStudents: number;
  deactivatedStudents: number;
  totalAttendanceRecords: number;
  totalDayCycleEntries: number;
  totalHolidays: number;
  customPasswordsCount: number;
  lastBackupDate?: string;
  storageSizeBytes: number;
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  institution: string;
  classes: string[];
  students: any[];
  attendance: any[];
  dayCycleLogs: Record<string, any[]>;
  customPasswords: Record<string, string>;
}

/**
 * Verify Admin Password against Supabase Auth or configured Admin passwords
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const cleanPass = password.trim();
  if (!cleanPass) return false;

  // 1. Check Supabase Auth if connected
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@spiher.ac.in',
        password: cleanPass,
      });
      if (!error && data.user) {
        return true;
      }
    } catch {
      // fallback below
    }
  }

  // 2. Check Custom stored passwords
  try {
    const raw = localStorage.getItem('smart_cr_custom_passwords');
    if (raw) {
      const map = JSON.parse(raw);
      const customAdmin = map['admin@spiher.ac.in'] || map['admin'];
      if (customAdmin && customAdmin === cleanPass) return true;
    }
  } catch {
    // ignore
  }

  // 3. Check Default Admin Passwords
  return DEFAULT_ADMIN_PASSWORDS.includes(cleanPass);
}

/**
 * Get comprehensive system health and storage diagnostics
 */
export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  let totalStudents = 0;
  let activeStudents = 0;
  let totalAttendanceRecords = 0;
  let totalDayCycleEntries = 0;
  let totalHolidays = 0;
  let customPasswordsCount = 0;

  // Students
  try {
    const raw = localStorage.getItem('smart_cr_students_cache');
    const studentsList = raw ? JSON.parse(raw) : MASTER_STUDENTS;
    totalStudents = studentsList.length;
    activeStudents = studentsList.filter((s: any) => s.active !== false).length;
  } catch {
    totalStudents = MASTER_STUDENTS.length;
    activeStudents = MASTER_STUDENTS.length;
  }

  // Attendance
  try {
    const raw = localStorage.getItem('smart_cr_attendance_records');
    if (raw) {
      const list = JSON.parse(raw);
      totalAttendanceRecords = Array.isArray(list) ? list.length : 0;
    }
  } catch {
    totalAttendanceRecords = 0;
  }

  // Day Cycles
  for (const c of ['CSE-25', 'AIDS-25']) {
    try {
      const raw = localStorage.getItem(`smart_cr_day_cycle_${c}`);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          totalDayCycleEntries += list.length;
          totalHolidays += list.filter((e: any) => e.is_holiday).length;
        }
      }
    } catch {
      // ignore
    }
  }

  // Custom Passwords
  try {
    const raw = localStorage.getItem('smart_cr_custom_passwords');
    if (raw) {
      const map = JSON.parse(raw);
      customPasswordsCount = Object.keys(map).length;
    }
  } catch {
    customPasswordsCount = 0;
  }

  // Estimate local storage usage
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('smart_cr_')) {
      const val = localStorage.getItem(key);
      totalBytes += (key.length + (val ? val.length : 0)) * 2;
    }
  }

  return {
    isDatabaseConnected: isSupabaseConfigured(),
    totalStudents,
    activeStudents,
    deactivatedStudents: totalStudents - activeStudents,
    totalAttendanceRecords,
    totalDayCycleEntries,
    totalHolidays,
    customPasswordsCount,
    storageSizeBytes: totalBytes,
  };
}

/**
 * Reset Attendance Records for a specific class or both classes
 */
export async function resetAttendance(classId?: ClassId): Promise<number> {
  let deletedCount = 0;

  try {
    const raw = localStorage.getItem('smart_cr_attendance_records');
    if (raw) {
      const list: any[] = JSON.parse(raw);
      if (classId) {
        const remaining = list.filter((r) => r.class_id && r.class_id !== classId);
        deletedCount = list.length - remaining.length;
        localStorage.setItem('smart_cr_attendance_records', JSON.stringify(remaining));
      } else {
        deletedCount = list.length;
        localStorage.removeItem('smart_cr_attendance_records');
      }
    }
  } catch {
    // ignore
  }

  // If Supabase configured, delete from database
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any).from('attendance').delete();
      if (classId) {
        q = q.eq('class_id', classId);
      } else {
        q = q.neq('attendance_id', '00000000-0000-0000-0000-000000000000');
      }
      await q;
    } catch {
      // ignore
    }
  }

  return deletedCount;
}

/**
 * Reset Day-Cycle Logs and Holidays
 */
export async function resetDayCycle(classId?: ClassId): Promise<number> {
  let count = 0;
  const classesToReset = classId ? [classId] : ['CSE-25', 'AIDS-25'];

  for (const c of classesToReset) {
    try {
      const key = `smart_cr_day_cycle_${c}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        count += list.length;
      }
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any).from('day_cycle_log').delete();
      if (classId) {
        q = q.eq('class_id', classId);
      } else {
        q = q.neq('id', '00000000-0000-0000-0000-000000000000');
      }
      await q;
    } catch {
      // ignore
    }
  }

  return count;
}

/**
 * Restore Official Master Student Roster (44 CSE-25 + 16 AIDS-25 = 60 students)
 */
export async function restoreMasterRoster(classId?: ClassId): Promise<number> {
  const masterList = MASTER_STUDENTS.map((s) => ({
    student_id: s.student_id,
    class_id: s.class_id as ClassId,
    name: s.name,
    email: s.email || null,
    active: true,
  }));

  let targetList = masterList;
  if (classId) {
    try {
      const raw = localStorage.getItem('smart_cr_students_cache');
      const existing: any[] = raw ? JSON.parse(raw) : masterList;
      const otherClass = existing.filter((s) => s.class_id !== classId);
      const restoredThisClass = masterList.filter((s) => s.class_id === classId);
      targetList = [...otherClass, ...restoredThisClass];
    } catch {
      targetList = masterList;
    }
  }

  localStorage.setItem('smart_cr_students_cache', JSON.stringify(targetList));

  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('students').upsert(
        targetList.map((s) => ({
          student_id: s.student_id,
          class_id: s.class_id,
          name: s.name,
          email: s.email,
          active: true,
        }))
      );
    } catch {
      // ignore
    }
  }

  return targetList.length;
}

/**
 * Reactivate all deactivated students in 1-Click
 */
export async function reactivateAllStudents(classId?: ClassId): Promise<number> {
  let updatedCount = 0;
  try {
    const raw = localStorage.getItem('smart_cr_students_cache');
    const students: any[] = raw ? JSON.parse(raw) : MASTER_STUDENTS;
    const updated = students.map((s) => {
      if (!classId || s.class_id === classId) {
        if (!s.active) updatedCount++;
        return { ...s, active: true };
      }
      return s;
    });
    localStorage.setItem('smart_cr_students_cache', JSON.stringify(updated));
  } catch {
    // ignore
  }

  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any).from('students').update({ active: true });
      if (classId) q = q.eq('class_id', classId);
      else q = q.eq('active', false);
      await q;
    } catch {
      // ignore
    }
  }

  return updatedCount;
}

/**
 * Reset All Student Passwords back to default (spiher@123)
 */
export async function resetAllStudentPasswords(): Promise<number> {
  let resetCount = 0;
  try {
    const raw = localStorage.getItem('smart_cr_custom_passwords');
    if (raw) {
      const map = JSON.parse(raw);
      const newMap: Record<string, string> = {};
      for (const [key, val] of Object.entries(map)) {
        if (key.includes('admin') || key.includes('cr')) {
          newMap[key] = val as string;
        } else {
          resetCount++;
        }
      }
      localStorage.setItem('smart_cr_custom_passwords', JSON.stringify(newMap));
    }
  } catch {
    // ignore
  }
  return resetCount;
}

/**
 * Export Complete Full Database JSON Backup
 */
export async function exportFullDatabaseBackup(): Promise<string> {
  const studentsRaw = localStorage.getItem('smart_cr_students_cache');
  const attendanceRaw = localStorage.getItem('smart_cr_attendance_records');
  const cseCycleRaw = localStorage.getItem('smart_cr_day_cycle_CSE-25');
  const aidsCycleRaw = localStorage.getItem('smart_cr_day_cycle_AIDS-25');
  const passwordsRaw = localStorage.getItem('smart_cr_custom_passwords');

  const payload: BackupPayload = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    institution: "St. Peter's Institute of Higher Education and Research (SPIHER)",
    classes: ['CSE-25', 'AIDS-25'],
    students: studentsRaw ? JSON.parse(studentsRaw) : MASTER_STUDENTS,
    attendance: attendanceRaw ? JSON.parse(attendanceRaw) : [],
    dayCycleLogs: {
      'CSE-25': cseCycleRaw ? JSON.parse(cseCycleRaw) : [],
      'AIDS-25': aidsCycleRaw ? JSON.parse(aidsCycleRaw) : [],
    },
    customPasswords: passwordsRaw ? JSON.parse(passwordsRaw) : {},
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Import and Restore Database from JSON Backup
 */
export async function importFullDatabaseBackup(jsonString: string): Promise<{ success: boolean; stats: any }> {
  const data: BackupPayload = JSON.parse(jsonString);

  if (!data.classes || !Array.isArray(data.students)) {
    throw new Error('Invalid backup file format. Missing students or classes array.');
  }

  // Restore students
  localStorage.setItem('smart_cr_students_cache', JSON.stringify(data.students));

  // Restore attendance
  if (Array.isArray(data.attendance)) {
    localStorage.setItem('smart_cr_attendance_records', JSON.stringify(data.attendance));
  }

  // Restore day cycles
  if (data.dayCycleLogs) {
    for (const [classId, logs] of Object.entries(data.dayCycleLogs)) {
      localStorage.setItem(`smart_cr_day_cycle_${classId}`, JSON.stringify(logs));
    }
  }

  // Restore passwords
  if (data.customPasswords) {
    localStorage.setItem('smart_cr_custom_passwords', JSON.stringify(data.customPasswords));
  }

  return {
    success: true,
    stats: {
      studentsCount: data.students.length,
      attendanceCount: data.attendance ? data.attendance.length : 0,
      classes: data.classes,
      exportedAt: data.exportedAt,
    },
  };
}

/**
 * Full Factory Reset — Completely resets attendance, calendar, passwords & restores master roster
 */
export async function executeFullFactoryReset(): Promise<{ success: boolean; message: string }> {
  // Clear attendance
  localStorage.removeItem('smart_cr_attendance_records');

  // Clear day cycles
  localStorage.removeItem('smart_cr_day_cycle_CSE-25');
  localStorage.removeItem('smart_cr_day_cycle_AIDS-25');

  // Clear custom passwords
  localStorage.removeItem('smart_cr_custom_passwords');

  // Restore master roster
  await restoreMasterRoster();

  // If Supabase connected, clear database tables
  if (isSupabaseConfigured()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('attendance').delete().neq('attendance_id', '00000000-0000-0000-0000-000000000000');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('day_cycle_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    message: 'System has been restored to factory default state. All 60 master students restored, attendance wiped, and calendar reset.',
  };
}
