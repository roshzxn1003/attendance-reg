import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  GraduationCap,
  CheckSquare,
  Shield,
  BookOpen,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  School,
  Sparkles,
} from 'lucide-react';
import { MASTER_FACULTY_ACCOUNTS } from '../data/faculty';
import { cn } from '../lib/utils';

type LoginPortal = 'student' | 'cr' | 'faculty' | 'admin';

export const LoginPage: React.FC = () => {
  const [activePortal, setActivePortal] = useState<LoginPortal>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFacultySubject, setSelectedFacultySubject] = useState<string | null>(null);

  const { loginAsStudent, loginAsCR, loginAsFaculty, loginAsAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setErrorMsg('Please enter your identifier or subject code.');
      setLoading(false);
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Please enter your account password.');
      setLoading(false);
      return;
    }

    try {
      if (activePortal === 'student') {
        const res = await loginAsStudent(cleanId, cleanPass);
        if (res.success && res.user) {
          toast.success(`Welcome back, ${res.user.name}!`, 'Student Login Successful');
          navigate(fromPath || '/student-portal');
        } else {
          setErrorMsg(res.error || 'Student login failed. Please verify your Roll Number or Email.');
        }
      } else if (activePortal === 'cr') {
        const res = await loginAsCR(cleanId, cleanPass);
        if (res.success && res.user) {
          toast.success('Welcome, Class Representative!', 'CR Login Successful');
          navigate(fromPath || '/attendance');
        } else {
          setErrorMsg(res.error || 'CR login failed. Please check your credentials.');
        }
      } else if (activePortal === 'faculty') {
        const res = await loginAsFaculty(cleanId, cleanPass);
        if (res.success && res.user) {
          const targetSubj = res.user.defaultSubject || (res.user.assignedSubjects && res.user.assignedSubjects[0]) || 'OS';
          toast.success(`Welcome, ${res.user.name}! Routing to ${targetSubj} register…`, 'Faculty Login Verified');
          navigate(`/faculty-report?subject=${encodeURIComponent(targetSubj)}`);
        } else {
          setErrorMsg(res.error || 'Faculty login failed. Please check your subject code or password.');
        }
      } else {
        const res = await loginAsAdmin(cleanId, cleanPass);
        if (res.success && res.user) {
          toast.success('Welcome, Administrator!', 'Admin Login Successful');
          navigate(fromPath || '/admin');
        } else {
          setErrorMsg(res.error || 'Administrator login failed. Please check your credentials.');
        }
      }
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickSubject = (fac: typeof MASTER_FACULTY_ACCOUNTS[0]) => {
    setSelectedFacultySubject(fac.defaultSubject);
    setIdentifier(fac.username);
    setPassword('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-3 sm:px-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* College Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mx-auto">
            <School className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            SPIHER Attendance Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            St. Peter's Institute of Higher Education and Research • Room 245
          </p>
        </div>

        {/* Role Switcher Pill Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Select User Role:
            </label>
            <Badge
              variant={
                activePortal === 'student'
                  ? 'info'
                  : activePortal === 'cr'
                  ? 'success'
                  : activePortal === 'faculty'
                  ? 'warning'
                  : 'purple'
              }
              size="sm"
              className="font-bold"
            >
              {activePortal === 'student'
                ? 'Student Portal'
                : activePortal === 'cr'
                ? 'Class Representative'
                : activePortal === 'faculty'
                ? 'Subject Faculty'
                : 'Administrator'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
            {/* 1. Student */}
            <button
              type="button"
              onClick={() => {
                setActivePortal('student');
                setErrorMsg(null);
              }}
              className={cn(
                'py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer',
                activePortal === 'student'
                  ? 'bg-white text-blue-700 shadow-xs font-black ring-1 ring-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>

            {/* 2. CR */}
            <button
              type="button"
              onClick={() => {
                setActivePortal('cr');
                setErrorMsg(null);
              }}
              className={cn(
                'py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer',
                activePortal === 'cr'
                  ? 'bg-white text-emerald-700 shadow-xs font-black ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <CheckSquare className="w-4 h-4" />
              <span>CR Daily</span>
            </button>

            {/* 3. Faculty (NEW) */}
            <button
              type="button"
              onClick={() => {
                setActivePortal('faculty');
                setErrorMsg(null);
                if (!identifier) {
                  setIdentifier('os');
                }
              }}
              className={cn(
                'py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer',
                activePortal === 'faculty'
                  ? 'bg-white text-amber-700 shadow-xs font-black ring-1 ring-amber-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>Faculty</span>
            </button>

            {/* 4. Admin */}
            <button
              type="button"
              onClick={() => {
                setActivePortal('admin');
                setErrorMsg(null);
              }}
              className={cn(
                'py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer',
                activePortal === 'admin'
                  ? 'bg-white text-purple-700 shadow-xs font-black ring-1 ring-purple-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Portal Context Description Banner */}
        <div
          className={cn(
            'p-3.5 rounded-2xl border transition-colors space-y-2',
            activePortal === 'student' && 'bg-blue-50/60 border-blue-200 text-blue-950',
            activePortal === 'cr' && 'bg-emerald-50/60 border-emerald-200 text-emerald-950',
            activePortal === 'faculty' && 'bg-amber-50/70 border-amber-200 text-amber-950',
            activePortal === 'admin' && 'bg-purple-50/60 border-purple-200 text-purple-950'
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xs sm:text-sm">
              {activePortal === 'student' && 'Student Sign In'}
              {activePortal === 'cr' && 'Class Representative (CR) Sign In'}
              {activePortal === 'faculty' && 'Subject Faculty In-Charge Sign In'}
              {activePortal === 'admin' && 'Administrator Sign In'}
            </h3>
            {activePortal === 'faculty' && (
              <span className="text-[10px] bg-amber-200/80 text-amber-900 font-extrabold px-2 py-0.5 rounded-md">
                Subject-Direct Access
              </span>
            )}
          </div>
          
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {activePortal === 'student' &&
              'Enter your registered Roll Number (e.g. SPC25CSU001) or college Email ID to view your attendance records.'}
            {activePortal === 'cr' &&
              'Enter your CR email or username to take period attendance and share WhatsApp reports.'}
            {activePortal === 'faculty' &&
              'Select your subject below or enter your subject code / faculty email. You will land directly on your subject register.'}
            {activePortal === 'admin' &&
              'Enter administrator credentials to manage rosters, timetables, and system settings.'}
          </p>

          {/* Quick Subject Select Chips for Faculty */}
          {activePortal === 'faculty' && (
            <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Tap Your Subject:</span>
                </span>
                <span className="text-[10px] text-amber-700 font-medium">Auto-fills login ID</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MASTER_FACULTY_ACCOUNTS.filter((f) => f.id !== 'faculty_general').map((fac) => {
                  const isSelected =
                    selectedFacultySubject === fac.defaultSubject ||
                    identifier.toLowerCase() === fac.username.toLowerCase();
                  return (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => handleSelectQuickSubject(fac)}
                      className={cn(
                        'px-2 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border text-center truncate cursor-pointer',
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs scale-102'
                          : 'bg-white text-slate-700 border-amber-200/90 hover:bg-amber-100/60'
                      )}
                      title={`${fac.name} — ${fac.assignedSubjects.join(', ')}`}
                    >
                      {fac.defaultSubject}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert Message */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 shadow-2xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identifier Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              {activePortal === 'student'
                ? 'Roll Number or College Email'
                : activePortal === 'faculty'
                ? 'Subject Code or Faculty Email'
                : 'Email Address or Username'}
            </label>
            <div className="relative">
              {activePortal === 'faculty' ? (
                <BookOpen className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              ) : (
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              )}
              <input
                type="text"
                required
                autoFocus
                placeholder={
                  activePortal === 'student'
                    ? 'e.g. SPC25CSU001 or email'
                    : activePortal === 'cr'
                    ? 'e.g. cr.cse25@spiher.ac.in'
                    : activePortal === 'faculty'
                    ? 'e.g. os, dbms, dm, daa, iot, ca, uhv'
                    : 'e.g. admin@spiher.ac.in'
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Password Input with Show/Hide Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                256-bit Secure
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            type="submit"
            isLoading={loading}
            className={cn(
              'w-full font-black text-xs sm:text-sm py-3.5 rounded-2xl gap-2 text-white shadow-md transition-all active:scale-98 cursor-pointer mt-2',
              activePortal === 'student' && 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
              activePortal === 'cr' && 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
              activePortal === 'faculty' && 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20',
              activePortal === 'admin' && 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
            )}
          >
            <span>
              {activePortal === 'student' && 'Sign In to Student Portal'}
              {activePortal === 'cr' && 'Sign In as Class Representative'}
              {activePortal === 'faculty' && 'Sign In to Faculty Subject Portal'}
              {activePortal === 'admin' && 'Sign In as Administrator'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Security & Class Info Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Secure Role-Based Auth</span>
          </div>

          <span className="font-mono text-slate-400">
            Room 245 • Sem III
          </span>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
