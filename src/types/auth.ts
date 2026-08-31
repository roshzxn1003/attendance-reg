import { ClassId } from './index';

export type UserRole = 'admin' | 'cr' | 'faculty' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  student_id?: string;
  class_id?: ClassId;
  assignedSubjects?: string[]; // e.g. ['OS', 'OS LAB']
  defaultSubject?: string;     // e.g. 'OS'
  facultyName?: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}
