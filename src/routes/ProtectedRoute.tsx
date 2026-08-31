import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If faculty, redirect to faculty subject report portal
    if (user.role === 'faculty') {
      const defaultSubj = user.defaultSubject || (user.assignedSubjects && user.assignedSubjects[0]);
      const targetPath = defaultSubj ? `/faculty-report?subject=${encodeURIComponent(defaultSubj)}` : '/faculty-report';
      return <Navigate to={targetPath} replace />;
    }
    // If student, redirect to student portal
    if (user.role === 'student') {
      return <Navigate to="/student-portal" replace />;
    }
    // If CR tries to access admin, redirect to attendance
    if (user.role === 'cr') {
      return <Navigate to="/attendance" replace />;
    }
  }

  return <>{children}</>;
};
