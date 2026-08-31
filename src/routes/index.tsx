import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PageLoadingSkeleton } from '../components/common/Skeleton';

// Lazy-loaded route components for fast initial load & minimal bundle size
const AttendancePage = lazy(() => import('../pages/AttendancePage'));
const StudentsPage = lazy(() => import('../pages/StudentsPage').then((m) => ({ default: m.StudentsPage })));
const FacultySubjectReportPage = lazy(() =>
  import('../pages/FacultySubjectReportPage').then((m) => ({ default: m.FacultySubjectReportPage }))
);
const BacklogEntryPage = lazy(() =>
  import('../pages/BacklogEntryPage').then((m) => ({ default: m.BacklogEntryPage }))
);
const AdminPage = lazy(() => import('../pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const StudentPortalPage = lazy(() =>
  import('../pages/StudentPortalPage').then((m) => ({ default: m.StudentPortalPage }))
);
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const withSuspense = (Component: React.ReactNode) => (
  <Suspense fallback={<PageLoadingSkeleton />}>{Component}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AppLayout>
        {withSuspense(<LoginPage />)}
      </AppLayout>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          {withSuspense(<AttendancePage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          {withSuspense(<AttendancePage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance-report',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          {withSuspense(<AttendancePage initialView="report" />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/report',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          {withSuspense(<AttendancePage initialView="report" />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/backlog-entry',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          {withSuspense(<BacklogEntryPage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/rapid-entry',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          {withSuspense(<BacklogEntryPage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/students',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          {withSuspense(<StudentsPage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty-report',
    element: (
      <ProtectedRoute allowedRoles={['faculty', 'admin']}>
        <AppLayout>
          {withSuspense(<FacultySubjectReportPage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/subject-report',
    element: (
      <ProtectedRoute allowedRoles={['faculty', 'admin']}>
        <AppLayout>
          {withSuspense(<FacultySubjectReportPage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student-portal',
    element: (
      <ProtectedRoute allowedRoles={['student', 'admin']}>
        <AppLayout>
          {withSuspense(<StudentPortalPage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AppLayout>
          {withSuspense(<AdminPage />)}
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <AppLayout>
        {withSuspense(<NotFoundPage />)}
      </AppLayout>
    ),
  },
]);

