import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { MASTER_STUDENTS } from '../data/students';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Percent,
  Search,
  Check,
  X,
  AlertTriangle,
  Mail,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { ACADEMIC_MONTHS } from '../services/monthlyAttendanceService';
import { formatDate } from '../lib/utils';
import { Student } from '../services/studentService';

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();

  // Find active student object
  const currentStudent = useMemo<Student>(() => {
    if (user?.student_id) {
      const match = MASTER_STUDENTS.find((s) => s.student_id === user.student_id);
      if (match) {
        return {
          ...match,
          email: match.email ?? null,
        };
      }
      return {
        student_id: user.student_id,
        name: user.name,
        class_id: user.class_id || 'CSE-25',
        email: user.email ?? null,
        active: true,
      };
    }
    const defaultStudent = MASTER_STUDENTS[0];
    return {
      ...defaultStudent,
      email: defaultStudent.email ?? null,
    };
  }, [user]);

  const {
    filteredHistory,
    overallStats,
    availableSubjects,
    loading,
    monthFilter,
    setMonthFilter,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
  } = useStudentProfile(currentStudent.student_id, currentStudent.class_id);

  const [search, setSearch] = React.useState('');

  const displayedHistory = useMemo(() => {
    if (!search.trim()) return filteredHistory;
    const q = search.toLowerCase();
    return filteredHistory.filter(
      (r) =>
        r.subject.toLowerCase().includes(q) ||
        r.date.includes(q)
    );
  }, [filteredHistory, search]);

  const percentage = overallStats.percentage;
  const isSafe = percentage >= 75;
  const isCritical = percentage < 65;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Student Header Card ── */}
      <Card className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-0 shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                <GraduationCap className="w-8 h-8 text-blue-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-bold font-mono">
                    {currentStudent.student_id}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-bold">
                    {currentStudent.class_id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase">
                    Student Portal
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{currentStudent.name}</h1>
                <p className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentStudent.email || 'student@spiher.ac.in'}</span>
                  <span>• Room 245 • Year II / Sem III</span>
                </p>
              </div>
            </div>

            {/* Attendance Status Alert Badge */}
            <div className="self-start sm:self-auto">
              <div className={`p-3 px-4 rounded-2xl border flex items-center gap-2.5 ${
                isSafe
                  ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200'
                  : isCritical
                  ? 'bg-rose-500/20 border-rose-400/30 text-rose-200'
                  : 'bg-amber-500/20 border-amber-400/30 text-amber-200'
              }`}>
                {isSafe ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">
                    {isSafe ? 'Eligible (Safe)' : isCritical ? 'Critical Shortage' : 'Shortage Warning'}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {isSafe ? 'Attendance above 75% cutoff' : 'Minimum 75% required for exams'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Working Hours */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Working Hours</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {overallStats.workingHours}
            <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
          </p>
        </div>

        {/* Present Hours */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wider">
            <span>Present (P)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1.5">
            {overallStats.presentHours}
            <span className="text-xs font-normal text-emerald-600 ml-1">hrs</span>
          </p>
        </div>

        {/* OD Hours */}
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wider">
            <span>On Duty (OD)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-800 mt-1.5">
            {overallStats.odHours}
            <span className="text-xs font-normal text-amber-600 ml-1">hrs</span>
          </p>
        </div>

        {/* Absent Hours */}
        <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wider">
            <span>Absent (A)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-800 mt-1.5">
            {overallStats.absentHours}
            <span className="text-xs font-normal text-rose-600 ml-1">hrs</span>
          </p>
        </div>

        {/* Attendance Percentage */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs text-white col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Attendance %</span>
            <Percent className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1.5">
            {overallStats.workingHours > 0 ? (
              <>
                {percentage.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-0.5">%</span>
              </>
            ) : (
              '100%'
            )}
          </p>
        </div>
      </div>

      {/* ── Attendance Log & Filters ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>My Period-by-Period Attendance History</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Official attendance records recorded by your Class Representative & Faculty.
              </p>
            </div>

            <Badge variant="info" size="md">
              {displayedHistory.length} Records Found
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subject or date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Month:</span>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none w-full cursor-pointer"
              >
                <option value="all">All Academic Months</option>
                {ACADEMIC_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Subject:</span>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none w-full cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none w-full cursor-pointer"
              >
                <option value="all">All (P, A, OD)</option>
                <option value="P">Present (P)</option>
                <option value="A">Absent (A)</option>
                <option value="OD">On Duty (OD)</option>
              </select>
            </div>
          </div>

          {/* Records Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading attendance history…</span>
            </div>
          ) : displayedHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No attendance records found</p>
              <p className="mt-0.5">Try clearing your filters or select a different academic month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Day Order</th>
                    <th className="px-4 py-3">Period & Timing</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedHistory.map((rec) => {
                    const isP = rec.status === 'P';
                    const isA = rec.status === 'A';
                    const isOD = rec.status === 'OD';

                    return (
                      <tr
                        key={`${rec.date}_${rec.period_number}_${rec.subject}`}
                        className={`transition-colors ${
                          isA ? 'bg-rose-50/40 hover:bg-rose-50/70' : isOD ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatDate(rec.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                            Day Order {rec.day_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          Period {rec.period_number} <span className="text-slate-400">({rec.time_range})</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {rec.subject}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isP && (
                            <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Present
                            </span>
                          )}
                          {isA && (
                            <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                              <X className="w-3 h-3 stroke-[3]" />
                              Absent
                            </span>
                          )}
                          {isOD && (
                            <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              On Duty
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
