import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppProvider>
  );
};

export default App;
