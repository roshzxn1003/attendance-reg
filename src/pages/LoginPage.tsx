import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  GraduationCap,
  CheckSquare,
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DEFAULT_STUDENT_PASSWORD } from '../services/authService';

type LoginPortal = 'student' | 'cr' | 'admin';

export const LoginPage: React.FC = () => {
  const [activePortal, setActivePortal] = useState<LoginPortal>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { loginAsStudent, loginAsCR, loginAsAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (activePortal === 'student') {
        const res = await loginAsStudent(identifier, password);
        if (res.success && res.user) {
          toast.success(`Welcome, ${res.user.name}!`, 'Student Login Successful');
          navigate(fromPath || '/student-portal');
        } else {
          setErrorMsg(res.error || 'Student login failed.');
        }
      } else if (activePortal === 'cr') {
        const res = await loginAsCR(identifier, password);
        if (res.success && res.user) {
          toast.success(`Welcome, Class Representative!`, 'CR Login Successful');
          navigate(fromPath || '/attendance');
        } else {
          setErrorMsg(res.error || 'CR login failed.');
        }
      } else {
        const res = await loginAsAdmin(identifier, password);
        if (res.success && res.user) {
          toast.success(`Welcome, Administrator!`, 'Admin Login Successful');
          navigate(fromPath || '/admin');
        } else {
          setErrorMsg(res.error || 'Admin login failed.');
        }
      }
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (portal: LoginPortal, id: string, pass: string) => {
    setActivePortal(portal);
    setIdentifier(id);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* College Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            SPIHER Attendance Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            St. Peter's Institute of Higher Education and Research • Room 245
          </p>
        </div>

        {/* Portal Selection Tabs */}
        <div className="p-1 bg-slate-200/80 rounded-2xl grid grid-cols-3 gap-1 text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActivePortal('student');
              setIdentifier('');
              setPassword('');
              setErrorMsg(null);
            }}
            className={cn(
              'py-2.5 rounded-xl transition-all flex flex-col items-center gap-1',
              activePortal === 'student'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePortal('cr');
              setIdentifier('');
              setPassword('');
              setErrorMsg(null);
            }}
            className={cn(
              'py-2.5 rounded-xl transition-all flex flex-col items-center gap-1',
              activePortal === 'cr'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <CheckSquare className="w-4 h-4" />
            <span>CR / Faculty</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePortal('admin');
              setIdentifier('');
              setPassword('');
              setErrorMsg(null);
            }}
            className={cn(
              'py-2.5 rounded-xl transition-all flex flex-col items-center gap-1',
              activePortal === 'admin'
                ? 'bg-white text-purple-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </div>

        {/* Login Form Card */}
        <Card className="border-slate-200 bg-white shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {activePortal === 'student' && 'Student Login'}
                {activePortal === 'cr' && 'CR & Attendance Marking'}
                {activePortal === 'admin' && 'Administrator Portal'}
              </CardTitle>
              <Badge
                variant={activePortal === 'student' ? 'info' : activePortal === 'cr' ? 'purple' : 'default'}
                size="sm"
              >
                {activePortal === 'student' ? 'Individual Roster' : activePortal === 'cr' ? 'Marking Privileges' : 'Full Access'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {activePortal === 'student' && `Enter your registered college email (or roll number) and default password ${DEFAULT_STUDENT_PASSWORD}.`}
              {activePortal === 'cr' && 'Enter your class representative credentials to mark daily period attendance.'}
              {activePortal === 'admin' && 'Enter administrator credentials to manage classes, timetable, and holidays.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  {activePortal === 'student' ? 'College Email / Roll No' : 'Email / Username'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={
                      activePortal === 'student'
                        ? 'e.g. abubuharii25.cse@spiher.ac.in or SPC25CSU001'
                        : activePortal === 'cr'
                        ? 'e.g. cr.cse25@spiher.ac.in or cr'
                        : 'e.g. admin@spiher.ac.in or admin'
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Password
                  </label>
                  {activePortal === 'student' && (
                    <span className="text-[11px] font-mono text-blue-600 font-bold">
                      Default: {DEFAULT_STUDENT_PASSWORD}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password…"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={loading}
                className={cn(
                  'w-full font-black text-xs sm:text-sm py-2.5 rounded-xl gap-2 text-white shadow-md',
                  activePortal === 'student'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : activePortal === 'cr'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                )}
              >
                <span>
                  {activePortal === 'student' && 'Login to Student Portal'}
                  {activePortal === 'cr' && 'Login as Class Representative'}
                  {activePortal === 'admin' && 'Login as Administrator'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Quick Demo Login Preset Chips ── */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Quick 1-Click Demo Logins:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('student', 'abubuharii25.cse@spiher.ac.in', 'spiher@123')}
              className="p-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-colors text-xs space-y-0.5"
            >
              <div className="font-bold text-blue-700">🎓 Student Demo</div>
              <div className="text-[10px] text-slate-500 truncate">abubuharii25.cse@...</div>
              <div className="text-[10px] font-mono text-slate-400">pass: spiher@123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('cr', 'cr.cse25@spiher.ac.in', 'cr@123')}
              className="p-2 bg-white hover:bg-indigo-50 border border-slate-200 rounded-xl text-left transition-colors text-xs space-y-0.5"
            >
              <div className="font-bold text-indigo-700">📋 CR Demo</div>
              <div className="text-[10px] text-slate-500 truncate">cr.cse25@spiher.ac.in</div>
              <div className="text-[10px] font-mono text-slate-400">pass: cr@123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin@spiher.ac.in', 'admin@123')}
              className="p-2 bg-white hover:bg-purple-50 border border-slate-200 rounded-xl text-left transition-colors text-xs space-y-0.5"
            >
              <div className="font-bold text-purple-700">⚙️ Admin Demo</div>
              <div className="text-[10px] text-slate-500 truncate">admin@spiher.ac.in</div>
              <div className="text-[10px] font-mono text-slate-400">pass: admin@123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
