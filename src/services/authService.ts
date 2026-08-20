/**
 * Authentication Service
 * Seamlessly integrates Supabase Auth for CR, Admin, and Students with local fallback.
 *   1. Supabase Auth: Attempts supabase.auth.signInWithPassword()
 *   2. Fallback: Verifies local credentials when offline or before Supabase Auth seeding
 *   3. Custom Passwords: Supports updating passwords in Supabase Auth & Local cache
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthUser, LoginResult } from '../types/auth';
import { fetchStudents } from './studentService';
import { MASTER_STUDENTS } from '../data/students';

const AUTH_STORAGE_KEY = 'smart_cr_auth_user';
const CUSTOM_PASSWORDS_KEY = 'smart_cr_custom_passwords';

// ----------------------------------------------------------------
// DEFAULT PASSWORDS (Change these directly in code if needed)
// ----------------------------------------------------------------
export const DEFAULT_STUDENT_PASSWORD = 'spiher@123';
export const DEFAULT_CR_PASSWORDS = ['cr@123', 'spiher@123', 'faculty@123'];
export const DEFAULT_ADMIN_PASSWORDS = ['admin@123', 'spiher@123', 'spiher@admin'];

/**
 * Get all custom passwords saved by users
 */
function getCustomPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_PASSWORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

/**
 * Save a custom password for a specific email or student ID
 */
export function setCustomPassword(identifier: string, newPass: string): void {
  try {
    const map = getCustomPasswords();
    map[identifier.trim().toLowerCase()] = newPass.trim();
    localStorage.setItem(CUSTOM_PASSWORDS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

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
 * Password: spiher@123 (or custom updated password)
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

  // 1. Try Supabase Auth first if email provided
  if (isSupabaseConfigured() && cleanId.includes('@')) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: cleanPass,
      });

      if (!error && data.user) {
        const metadata = data.user.user_metadata || {};
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || cleanId,
          name: metadata.name || 'Student',
          role: 'student',
          student_id: metadata.student_id || cleanId.split('@')[0].toUpperCase(),
          class_id: metadata.class_id || 'CSE-25',
        };
        setStoredUser(authUser);
        return { success: true, user: authUser };
      }
    } catch {
      // fallback below
    }
  }

  // 2. Local student lookup fallback
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

  // Check custom password override or default password
  const customMap = getCustomPasswords();
  const customPass = customMap[cleanId] || (student.email ? customMap[student.email.toLowerCase()] : undefined);

  const isValid = customPass ? cleanPass === customPass : cleanPass === DEFAULT_STUDENT_PASSWORD;

  if (!isValid) {
    return {
      success: false,
      error: customPass
        ? 'Invalid password. Please enter your new password.'
        : `Invalid password. Please enter the default college password (${DEFAULT_STUDENT_PASSWORD}) or your updated password.`,
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

  // Normalize email
  const fullEmail = cleanId.includes('@')
    ? cleanId
    : cleanId.includes('aids')
    ? 'cr.aids25@spiher.ac.in'
    : 'cr.cse25@spiher.ac.in';

  // 1. Try Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password: cleanPass,
      });

      if (!error && data.user) {
        const metadata = data.user.user_metadata || {};
        const classId = metadata.class_id || (fullEmail.includes('aids') ? 'AIDS-25' : 'CSE-25');
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || fullEmail,
          name: metadata.name || 'Class Representative (CR)',
          role: 'cr',
          class_id: classId,
        };
        setStoredUser(authUser);
        return { success: true, user: authUser };
      }
    } catch {
      // fallback below
    }
  }

  // 2. Local validation fallback
  const validIds = [
    'cr@spiher.ac.in',
    'cr.cse25@spiher.ac.in',
    'cr.aids25@spiher.ac.in',
    'cr',
    'faculty@spiher.ac.in',
  ];

  if (!cleanId) {
    return { success: false, error: 'Please enter your CR email or username.' };
  }

  if (!validIds.includes(cleanId) && !cleanId.includes('cr')) {
    return {
      success: false,
      error: 'Unrecognized CR credentials. Use cr@spiher.ac.in or cr.cse25@spiher.ac.in.',
    };
  }

  const customMap = getCustomPasswords();
  const customPass = customMap[cleanId] || customMap['cr'] || customMap['cr@spiher.ac.in'];

  const isValid = customPass ? cleanPass === customPass : DEFAULT_CR_PASSWORDS.includes(cleanPass);

  if (!isValid) {
    return {
      success: false,
      error: 'Invalid CR password. (Default is cr@123 or your updated password)',
    };
  }

  const classId = cleanId.includes('aids') ? 'AIDS-25' : 'CSE-25';

  const authUser: AuthUser = {
    id: 'cr_user',
    email: fullEmail,
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

  // Normalize email
  const fullEmail = cleanId.includes('@') ? cleanId : 'admin@spiher.ac.in';

  // 1. Try Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password: cleanPass,
      });

      if (!error && data.user) {
        const metadata = data.user.user_metadata || {};
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || fullEmail,
          name: metadata.name || 'System Administrator (HOD / Faculty)',
          role: 'admin',
          class_id: 'CSE-25',
        };
        setStoredUser(authUser);
        return { success: true, user: authUser };
      }
    } catch {
      // fallback below
    }
  }

  // 2. Local validation fallback
  const validIds = ['admin@spiher.ac.in', 'admin', 'principal@spiher.ac.in', 'hod@spiher.ac.in'];

  if (!cleanId) {
    return { success: false, error: 'Please enter your administrator email or username.' };
  }

  if (!validIds.includes(cleanId) && !cleanId.includes('admin')) {
    return {
      success: false,
      error: 'Unrecognized administrator account. Use admin@spiher.ac.in or username admin.',
    };
  }

  const customMap = getCustomPasswords();
  const customPass = customMap[cleanId] || customMap['admin'] || customMap['admin@spiher.ac.in'];

  const isValid = customPass ? cleanPass === customPass : DEFAULT_ADMIN_PASSWORDS.includes(cleanPass);

  if (!isValid) {
    return {
      success: false,
      error: 'Invalid administrator password. (Default is admin@123 or your updated password)',
    };
  }

  const authUser: AuthUser = {
    id: 'admin_user',
    email: fullEmail,
    name: 'System Administrator (HOD / Faculty)',
    role: 'admin',
    class_id: 'CSE-25',
  };

  setStoredUser(authUser);
  return { success: true, user: authUser };
}

/**
 * Change Password for any user (Student, CR, Admin)
 */
export async function changeUserPassword(
  identifier: string,
  currentPass: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanOld = currentPass.trim();
  const cleanNew = newPass.trim();

  if (!cleanNew || cleanNew.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  // 1. Try Supabase Auth password update if connected
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: cleanNew,
      });
      if (!error) {
        setCustomPassword(cleanId, cleanNew);
        return { success: true };
      }
    } catch {
      // fallback below
    }
  }

  // 2. Verify current local password
  const customMap = getCustomPasswords();
  const customPass = customMap[cleanId];

  let currentValid = false;
  if (customPass) {
    currentValid = cleanOld === customPass;
  } else if (cleanId.includes('admin')) {
    currentValid = DEFAULT_ADMIN_PASSWORDS.includes(cleanOld);
  } else if (cleanId.includes('cr')) {
    currentValid = DEFAULT_CR_PASSWORDS.includes(cleanOld);
  } else {
    currentValid = cleanOld === DEFAULT_STUDENT_PASSWORD;
  }

  if (!currentValid) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  setCustomPassword(cleanId, cleanNew);
  return { success: true };
}

/**
 * Logout
 */
export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  setStoredUser(null);
}
