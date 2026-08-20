import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarCheck2,
  Users,
  Settings,
  GraduationCap,
  LogOut,
  LogIn,
  KeyRound,
} from 'lucide-react';
import { ClassSelector } from '../common/ClassSelector';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isStudent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <NavLink to={isStudent ? '/student-portal' : '/attendance'} className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                      SPIHER
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.2 rounded-md">
                      CR Portal
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline leading-none">
                    Room 245 • Year II / Sem III
                  </span>
                </div>
              </NavLink>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {isStudent ? (
                <NavLink
                  to="/student-portal"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>My Attendance Dashboard</span>
                </NavLink>
              ) : (
                <>
                  <NavLink
                    to="/attendance"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <CalendarCheck2 className="w-4 h-4" />
                    <span>Daily Attendance</span>
                  </NavLink>

                  <NavLink
                    to="/students"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Users className="w-4 h-4" />
                    <span>Students & Reports</span>
                  </NavLink>

                  {isAdmin && (
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <Settings className="w-4 h-4" />
                      <span>Admin Center</span>
                    </NavLink>
                  )}
                </>
              )}
            </nav>

            {/* Right Section: Class Switcher & Auth Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {!isStudent && <ClassSelector />}

              {isAuthenticated && user ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* User badge */}
                  <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize font-mono">
                        {user.role === 'admin' ? 'Administrator' : user.role === 'cr' ? 'CR' : user.student_id}
                      </div>
                    </div>
                  </div>

                  {/* Change Password Button */}
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                    title="Change Account Password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Password</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                    title="Logout from portal"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <NavLink
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </NavLink>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile Bottom Navigation Bar (Thumb Zone) ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
          {isStudent ? (
            <NavLink
              to="/student-portal"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-blue-600' : 'text-slate-500'
                }`
              }
            >
              <GraduationCap className="w-5 h-5" />
              <span>My Attendance</span>
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/attendance"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`
                }
              >
                <CalendarCheck2 className="w-5 h-5" />
                <span>Mark</span>
              </NavLink>

              <NavLink
                to="/students"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`
                }
              >
                <Users className="w-5 h-5" />
                <span>Students</span>
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                      isActive ? 'text-blue-600' : 'text-slate-500'
                    }`
                  }
                >
                  <Settings className="w-5 h-5" />
                  <span>Admin</span>
                </NavLink>
              )}
            </>
          )}
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
