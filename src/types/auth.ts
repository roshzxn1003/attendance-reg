import { ClassId } from './index';

export type UserRole = 'admin' | 'cr' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  student_id?: string;
  class_id?: ClassId;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}
