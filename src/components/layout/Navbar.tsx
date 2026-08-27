import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarCheck2,
  Users,
  Settings,
  GraduationCap,
  LogOut,
  LogIn,
  KeyRound,
  BookOpen,
  Shield,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { ClassSelector } from '../common/ClassSelector';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { StaggeredMenu } from './StaggeredMenu';
import { cn } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isStudent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const isLoginPage = location.pathname === '/login';

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  // ── Nav items for the StaggeredMenu sliding panel ─────────────────────────
  const mobileMenuItems = isStudent
    ? [
        {
          label: 'My Dashboard',
          ariaLabel: 'My personal attendance dashboard',
          link: '/student-portal',
        },
      ]
    : [
        {
          label: 'Attendance',
          ariaLabel: 'Mark daily attendance',
          link: '/attendance',
        },
        {
          label: 'WhatsApp Report',
          ariaLabel: 'Daily WhatsApp and absentees reports',
          link: '/attendance-report',
        },
        {
          label: 'Backlog Wizard',
          ariaLabel: 'Rapid handwritten register backlog entry wizard',
          link: '/backlog-entry',
        },
        {
          label: 'Students',
          ariaLabel: 'Students roster and reports',
          link: '/students',
        },
        {
          label: 'Faculty Reports',
          ariaLabel: 'Faculty subject-wise attendance register and exports',
          link: '/faculty-report',
        },
        // Admin link strictly restricted to Admin role
        ...(isAdmin
          ? [
              {
                label: 'Admin Centre',
                ariaLabel: 'Admin centre — system management',
                link: '/admin',
              },
            ]
          : []),
      ];

  // ── Branding Header inside the sliding panel ──────────────────────────────
  const mobilePanelHeader = (
    <div className="flex flex-col gap-2.5 pb-4 mb-2 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
          <CalendarCheck2 className="w-5 h-5" />
        </div>
        <div>
          <div className="font-black text-base text-slate-900 tracking-tight">SPIHER CR Portal</div>
          <div className="text-xs text-slate-400 font-medium">Room 245 • Year II / Sem III</div>
        </div>
      </div>
    </div>
  );

  // ── User Identity Footer inside the sliding panel ────────────────────────
  const mobilePanelFooter = (
    <div className="pt-4 mt-2 border-t border-slate-100 space-y-3">
      {/* User info card */}
      {user && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-xs">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-slate-800 truncate">{user.name}</div>
            <div className="text-[11px] font-mono text-slate-500 capitalize">
              {user.role === 'admin'
                ? 'Administrator'
                : user.role === 'cr'
                ? 'Class Representative'
                : user.student_id}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons (Change password + Logout) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsPasswordModalOpen(true)}
          className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-pointer shadow-2xs"
        >
          <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Password</span>
        </button>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-700 bg-rose-50/70 border border-rose-200 rounded-xl hover:bg-rose-100 hover:text-rose-800 transition-colors cursor-pointer shadow-2xs"
        >
          <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          TOP HEADER
         ════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 lg:gap-4">

            {/* Logo & Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <NavLink
                to={isLoginPage ? '/login' : isStudent ? '/student-portal' : '/attendance'}
                className="flex items-center gap-2.5 group"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                      SPIHER
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-md border border-blue-200/60">
                      {isLoginPage ? 'Portal' : isStudent ? 'Student' : isAdmin ? 'Admin' : 'CR Portal'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline leading-none">
                    Room 245 • CSE
                  </span>
                </div>
              </NavLink>
            </div>

            {/* ── Desktop Navigation Links ── */}
            {isAuthenticated && !isLoginPage && (
              <nav className="hidden lg:flex items-center gap-1">
                {isStudent ? (
                  <NavLink
                    to="/student-portal"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )
                    }
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>My Dashboard</span>
                  </NavLink>
                ) : (
                  <>
                    <NavLink
                      to="/attendance"
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          isActive && location.pathname === '/attendance' && !location.search.includes('tab=report')
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )
                      }
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5" />
                      <span>Attendance</span>
                    </NavLink>

                    <NavLink
                      to="/attendance-report"
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          isActive || location.pathname === '/attendance-report' || location.search.includes('tab=report')
                            ? 'bg-emerald-600 text-white shadow-xs font-black'
                            : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-300 font-bold'
                        )
                      }
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp Report</span>
                    </NavLink>

                    <NavLink
                      to="/backlog-entry"
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )
                      }
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Backlog</span>
                    </NavLink>

                    <NavLink
                      to="/students"
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )
                      }
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Students</span>
                    </NavLink>

                    <NavLink
                      to="/faculty-report"
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )
                      }
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Faculty</span>
                    </NavLink>

                    {/* Admin link strictly restricted to Admin role */}
                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs font-black'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          )
                        }
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Admin</span>
                      </NavLink>
                    )}
                  </>
                )}
              </nav>
            )}

            {/* ── Right Section (Desktop) ── */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              {isLoginPage ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Secure Authentication Portal</span>
                </div>
              ) : (
                <>
                  {!isStudent && <ClassSelector compact />}

                  {isAuthenticated && user ? (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 p-1 pl-2.5 rounded-2xl shadow-2xs">
                      {/* Cloud Sync indicator dot */}
                      <div
                        className="flex items-center gap-1 pr-1.5 text-[10px] font-bold text-emerald-700"
                        title="Supabase Cloud Live Connected"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="hidden xl:inline">Sync</span>
                      </div>

                      <div className="h-4 w-px bg-slate-200" />

                      {/* User info */}
                      <div className="flex items-center gap-1.5 px-1 max-w-[130px]">
                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="text-left truncate">
                          <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                            {user.name}
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase font-mono leading-none">
                            {user.role === 'admin' ? 'Admin' : user.role === 'cr' ? 'CR' : user.student_id}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <button
                        type="button"
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Change Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleLogoutClick}
                        className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Logout"
                      >
                        <LogOut className="w-3.5 h-3.5" />
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
                </>
              )}
            </div>

            {/* ── Mobile Right Header Area ── */}
            <div className="flex md:hidden items-center gap-2 pr-14">
              {isLoginPage && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Secure Login</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE STAGGERED MENU OVERLAY
          Hidden when on login page or unauthenticated
         ════════════════════════════════════════════════════════════════════ */}
      {isAuthenticated && !isLoginPage && (
        <div className="md:hidden">
          <StaggeredMenu
            position="right"
            items={mobileMenuItems}
            displaySocials={false}
            displayItemNumbering={true}
            colors={['#c7d2fe', '#6366f1', '#4338ca']}
            accentColor="#4f46e5"
            menuButtonColor="#0f172a"
            openMenuButtonColor="#0f172a"
            changeMenuColorOnOpen={false}
            closeOnClickAway={true}
            panelHeader={mobilePanelHeader}
            panelFooter={mobilePanelFooter}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE STICKY BOTTOM CLASS SELECTOR BAR
          Shown only on mobile (md:hidden) for authenticated non-student users
         ════════════════════════════════════════════════════════════════════ */}
      {isAuthenticated && !isLoginPage && !isStudent && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 py-2">
          <div className="flex items-center justify-between gap-3 max-w-sm mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Active Class:</span>
            </span>
            <ClassSelector compact />
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
