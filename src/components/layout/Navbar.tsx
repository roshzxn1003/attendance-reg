import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { CheckSquare, Users, Settings, BookOpen } from 'lucide-react';
import { ClassSelector } from '../common/ClassSelector';
import { cn } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const navItems = [
    {
      to: '/attendance',
      label: 'Dashboard / Attendance',
      shortLabel: 'Attendance',
      icon: CheckSquare,
    },
    {
      to: '/students',
      label: 'Students',
      shortLabel: 'Students',
      icon: Users,
    },
    {
      to: '/admin',
      label: 'Admin',
      shortLabel: 'Admin',
      icon: Settings,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand Logo & College Info */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/attendance" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 tracking-tight text-base group-hover:text-blue-600 transition-colors">
                    Smart College CR
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    SPIHER
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate">
                  Room 245 • Year II • Sem III
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action: Class Selector (CSE-25 / AIDS-25) */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <ClassSelector />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar for rapid thumb access */}
      <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center py-1.5 px-4 text-[11px] font-bold rounded-xl transition-all',
                  isActive
                    ? 'text-blue-600 bg-blue-50/80 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                )
              }
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.shortLabel}</span>
            </NavLink>
          );
        })}
      </div>
    </header>
  );
};
