import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, LoginResult } from '../types/auth';
import {
  getStoredUser,
  loginStudent,
  loginCR,
  loginAdmin,
  loginFaculty,
  logoutUser,
} from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCR: boolean;
  isFaculty: boolean;
  isStudent: boolean;
  loginAsStudent: (identifier: string, pass: string) => Promise<LoginResult>;
  loginAsCR: (identifier: string, pass: string) => Promise<LoginResult>;
  loginAsFaculty: (identifier: string, pass: string) => Promise<LoginResult>;
  loginAsAdmin: (identifier: string, pass: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    const saved = getStoredUser();
    if (saved) {
      setUser(saved);
    }
  }, []);

  const handleLoginStudent = async (id: string, pass: string): Promise<LoginResult> => {
    const result = await loginStudent(id, pass);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const handleLoginCR = async (id: string, pass: string): Promise<LoginResult> => {
    const result = await loginCR(id, pass);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const handleLoginFaculty = async (id: string, pass: string): Promise<LoginResult> => {
    const result = await loginFaculty(id, pass);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const handleLoginAdmin = async (id: string, pass: string): Promise<LoginResult> => {
    const result = await loginAdmin(id, pass);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const handleLogout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    isCR: user?.role === 'cr' || user?.role === 'admin',
    isFaculty: user?.role === 'faculty',
    isStudent: user?.role === 'student',
    loginAsStudent: handleLoginStudent,
    loginAsCR: handleLoginCR,
    loginAsFaculty: handleLoginFaculty,
    loginAsAdmin: handleLoginAdmin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
