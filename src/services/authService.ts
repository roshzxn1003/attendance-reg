/**
 * Authentication Service
 * Manages separate password-based logins for:
 *   1. Students (Email / Roll No + default password: spiher@123)
 *   2. CR / Attendance Marking
 *   3. Administrator
 */

import { AuthUser, LoginResult } from '../types/auth';
import { fetchStudents } from './studentService';
import { MASTER_STUDENTS } from '../data/students';

const AUTH_STORAGE_KEY = 'smart_cr_auth_user';
export const DEFAULT_STUDENT_PASSWORD = 'spiher@123';

/**
 * Get current cached user session from localStorage
 */
export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthUser;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Save user session to localStorage
 */
export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Student Login
 * Username: Student's registered college email (e.g. abubuharii25.cse@spiher.ac.in) or Roll No (e.g. SPC25CSU001)
 * Password: spiher@123
 */
export async function loginStudent(
  identifier: string,
  password: string
): Promise<LoginResult> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanId) {
    return { success: false, error: 'Please enter your registered college Email ID or Roll Number.' };
  }

  if (cleanPass !== DEFAULT_STUDENT_PASSWORD) {
    return {
      success: false,
      error: `Invalid password. Please enter the default college password (${DEFAULT_STUDENT_PASSWORD}).`,
    };
  }

  // Find student in current roster
  let allStudents = await fetchStudents();
  if (!allStudents || allStudents.length === 0) {
    allStudents = MASTER_STUDENTS.map((s) => ({
      ...s,
      email: s.email ?? null,
    }));
  }

  const student = allStudents.find(
    (s) =>
      (s.email && s.email.toLowerCase() === cleanId) ||
      s.student_id.toLowerCase() === cleanId
  );

  if (!student) {
    return {
      success: false,
      error: `No student found matching "${identifier}". Please enter your registered college email or roll number.`,
    };
  }

  if (!student.active) {
    return {
      success: false,
      error: 'Your student account is currently deactivated. Please contact your Class Representative or Faculty.',
    };
  }

  const authUser: AuthUser = {
    id: student.student_id,
    email: student.email || `${student.student_id.toLowerCase()}@spiher.ac.in`,
    name: student.name,
    role: 'student',
    student_id: student.student_id,
    class_id: student.class_id,
  };

  setStoredUser(authUser);
  return { success: true, user: authUser };
}

/**
 * CR / Attendance Marking Login
 */
export async function loginCR(
  identifier: string,
  password: string
): Promise<LoginResult> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  const validIds = [
    'cr@spiher.ac.in',
    'cr.cse25@spiher.ac.in',
    'cr.aids25@spiher.ac.in',
    'cr',
    'faculty@spiher.ac.in',
  ];

  const validPasswords = ['cr@123', 'spiher@123', 'faculty@123'];

  if (!cleanId) {
    return { success: false, error: 'Please enter your CR email or username.' };
  }

  if (!validIds.includes(cleanId) && !cleanId.includes('cr')) {
    return {
      success: false,
      error: 'Unrecognized CR credentials. Use cr@spiher.ac.in or cr.cse25@spiher.ac.in.',
    };
  }

  if (!validPasswords.includes(cleanPass)) {
    return {
      success: false,
      error: 'Invalid CR password. (Default password is cr@123 or spiher@123)',
    };
  }

  const classId = cleanId.includes('aids') ? 'AIDS-25' : 'CSE-25';

  const authUser: AuthUser = {
    id: 'cr_user',
    email: cleanId,
    name: 'Class Representative (CR)',
    role: 'cr',
    class_id: classId,
  };

  setStoredUser(authUser);
  return { success: true, user: authUser };
}

/**
 * Admin Portal Login
 */
export async function loginAdmin(
  identifier: string,
  password: string
): Promise<LoginResult> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  const validIds = ['admin@spiher.ac.in', 'admin', 'principal@spiher.ac.in', 'hod@spiher.ac.in'];
  const validPasswords = ['admin@123', 'spiher@123', 'spiher@admin'];

  if (!cleanId) {
    return { success: false, error: 'Please enter your administrator email or username.' };
  }

  if (!validIds.includes(cleanId) && !cleanId.includes('admin')) {
    return {
      success: false,
      error: 'Unrecognized administrator account. Use admin@spiher.ac.in or username admin.',
    };
  }

  if (!validPasswords.includes(cleanPass)) {
    return {
      success: false,
      error: 'Invalid administrator password. (Default password is admin@123 or spiher@123)',
    };
  }

  const authUser: AuthUser = {
    id: 'admin_user',
    email: cleanId,
    name: 'System Administrator (HOD / Faculty)',
    role: 'admin',
    class_id: 'CSE-25',
  };

  setStoredUser(authUser);
  return { success: true, user: authUser };
}

/**
 * Logout
 */
export function logoutUser(): void {
  setStoredUser(null);
}
