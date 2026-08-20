import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AttendancePage } from '../pages/AttendancePage';
import { StudentsPage } from '../pages/StudentsPage';
import { AdminPage } from '../pages/AdminPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/attendance" replace />,
      },
      {
        path: 'attendance',
        element: <AttendancePage />,
      },
      {
        path: 'students',
        element: <StudentsPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
