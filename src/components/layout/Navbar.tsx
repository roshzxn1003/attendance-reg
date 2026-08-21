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
import { StaggeredMenu } from './StaggeredMenu';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isStudent, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  // ── Mobile StaggeredMenu navigation items ──────────────────────────────────
  // CR only gets Attendance & Students (Student Portal is removed for CR).
  // Admin gets Attendance, Students, and Admin Centre.
  // Student gets My Dashboard.
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
          label: 'Students',
          ariaLabel: 'Students roster and reports',
          link: '/students',
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
    <div className="flex items-center gap-3 pb-4 mb-2 border-b border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
        <CalendarCheck2 className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm text-slate-900 tracking-tight">
            SPIHER
          </span>
          <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-md">
            {isStudent ? 'Student Portal' : isAdmin ? 'Admin Portal' : 'CR Portal'}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium leading-none">
          Room 245 • Year II / Sem III
        </span>
      </div>
    </div>
  );

  // ── Panel footer (User badge, Change Password, Logout) ─────────────────────
  const mobilePanelFooter = (
    <div className="flex flex-col gap-3">
      {/* User identity card */}
      {user && (
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200/70">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate">{user.name}</div>
            <div className="text-[10px] text-slate-400 font-mono capitalize">
              {user.role === 'admin'
                ? 'Administrator'
                : user.role === 'cr'
                ? 'Class Representative'
                : user.student_id}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons inside drawer */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsPasswordModalOpen(true)}
          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-pointer"
        >
          <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Change Password</span>
        </button>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          TOP HEADER
          Desktop nav lives here; Mobile shows logo + user badge + toggle slot
         ════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">

            {/* Logo & Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <NavLink
                to={isStudent ? '/student-portal' : '/attendance'}
                className="flex items-center gap-2.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                      SPIHER
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-md">
                      {isStudent ? 'Student' : isAdmin ? 'Admin' : 'CR Portal'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline leading-none">
                    Room 245 • Year II / Sem III
                  </span>
                </div>
              </NavLink>
            </div>

            {/* ── Desktop Navigation Links ── */}
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

                  {/* Admin link strictly restricted to Admin role */}
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
                      <span>Admin Centre</span>
                    </NavLink>
                  )}
                </>
              )}
            </nav>

            {/* ── Right section (desktop) ── */}
            <div className="hidden md:flex items-center gap-2 sm:gap-3">
              {!isStudent && <ClassSelector />}

              {isAuthenticated && user ? (
                <div className="flex items-center gap-1.5">
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
                        {user.role === 'admin'
                          ? 'Administrator'
                          : user.role === 'cr'
                          ? 'CR'
                          : user.student_id}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                    title="Change Account Password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    <span>Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                    title="Logout from portal"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span>Logout</span>
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

            {/* ── Mobile Right Header Area ──
                Shows Login button or user avatar, with clean right spacing for the StaggeredMenu toggle button */}
            <div className="flex md:hidden items-center gap-2 pr-24">
              {!isAuthenticated && (
                <NavLink
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login
                </NavLink>
              )}
              {isAuthenticated && user && (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black border border-blue-200 select-none shrink-0">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE STAGGERED MENU OVERLAY (OUTSIDE <header>)
          Full navigation drawer with solid white background, z-50 overlay
         ════════════════════════════════════════════════════════════════════ */}
      {isAuthenticated && (
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
          MOBILE BOTTOM CLASS SELECTOR (CSE-25 / AIDS-25)
          Clean floating bottom dock — ONLY for CR / Admin (not students).
          All tabs (attendance, students, portal) are removed from the bottom bar.
         ════════════════════════════════════════════════════════════════════ */}
      {!isStudent && isAuthenticated && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 flex items-center justify-center gap-2 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
          style={{ zIndex: 30 }}
        >
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Class:
          </span>
          <ClassSelector compact />
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
