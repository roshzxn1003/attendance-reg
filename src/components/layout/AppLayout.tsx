import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { APP_CONFIG } from '../../lib/constants';
import { ShieldCheck } from 'lucide-react';

import { PageTransition } from './PageTransition';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-16 md:pb-8 flex flex-col">
        <PageTransition>
          {children || <Outlet />}
        </PageTransition>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mb-12 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>{APP_CONFIG.appName}</strong> — {APP_CONFIG.institution}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 flex-wrap justify-center">
            <span>{APP_CONFIG.semester}</span>
            <span>•</span>
            <span>Rotating Day 1 → Day 6 Cycle</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
