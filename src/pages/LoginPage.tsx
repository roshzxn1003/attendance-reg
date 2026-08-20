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
} from 'lucide-react';
import { cn } from '../lib/utils';

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
          toast.success(`Welcome, ${res.user.name}!`, 'Login Successful');
          navigate(fromPath || '/student-portal');
        } else {
          setErrorMsg(res.error || 'Student login failed.');
        }
      } else if (activePortal === 'cr') {
        const res = await loginAsCR(identifier, password);
        if (res.success && res.user) {
          toast.success(`Welcome, Class Representative!`, 'Login Successful');
          navigate(fromPath || '/attendance');
        } else {
          setErrorMsg(res.error || 'CR login failed.');
        }
      } else {
        const res = await loginAsAdmin(identifier, password);
        if (res.success && res.user) {
          toast.success(`Welcome, Administrator!`, 'Login Successful');
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
              'py-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer',
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
              'py-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer',
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
              'py-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer',
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
                {activePortal === 'cr' && 'CR & Faculty Login'}
                {activePortal === 'admin' && 'Administrator Portal'}
              </CardTitle>
              <Badge
                variant={activePortal === 'student' ? 'info' : activePortal === 'cr' ? 'purple' : 'default'}
                size="sm"
              >
                {activePortal === 'student' ? 'Student Roster' : activePortal === 'cr' ? 'Marking Privileges' : 'Full Control'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {activePortal === 'student' && 'Enter your registered college Email ID or Roll Number to access your attendance records.'}
              {activePortal === 'cr' && 'Enter your Class Representative email or username to mark daily period attendance.'}
              {activePortal === 'admin' && 'Enter administrator credentials to manage rosters, timetables, and holidays.'}
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
                        ? 'e.g. arunroshangj25.cse@spiher.ac.in or SPC25CSU003'
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Password
                </label>
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
                  'w-full font-black text-xs sm:text-sm py-2.5 rounded-xl gap-2 text-white shadow-md cursor-pointer',
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
      </div>
    </div>
  );
};
