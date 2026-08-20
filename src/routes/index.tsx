import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AttendancePage } from '../pages/AttendancePage';
import { StudentsPage } from '../pages/StudentsPage';
import { AdminPage } from '../pages/AdminPage';
import { LoginPage } from '../pages/LoginPage';
import { StudentPortalPage } from '../pages/StudentPortalPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AppLayout>
        <LoginPage />
      </AppLayout>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          <AttendancePage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          <AttendancePage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/students',
    element: (
      <ProtectedRoute allowedRoles={['cr', 'admin']}>
        <AppLayout>
          <StudentsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student-portal',
    element: (
      <ProtectedRoute allowedRoles={['student', 'cr', 'admin']}>
        <AppLayout>
          <StudentPortalPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AppLayout>
          <AdminPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <AppLayout>
        <NotFoundPage />
      </AppLayout>
    ),
  },
]);
