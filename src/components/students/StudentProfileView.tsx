import React from 'react';
import {
  ArrowLeft,

  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Filter,
  RotateCcw,
  BookOpen,

  Loader2,

} from 'lucide-react';
import { Student } from '../../services/studentService';
import { ClassId, AttendanceStatus } from '../../types';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { cn, formatDate } from '../../lib/utils';

interface StudentProfileViewProps {
  student: Student;
  classId: ClassId;
  onBack: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  classId,
  onBack,
}) => {
  const {
    history,
    filteredHistory,
    overallStats,
    filteredStats,
    availableMonths,
    availableSubjects,
    loading,
    monthFilter,
    setMonthFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
  } = useStudentProfile(student.student_id, classId);

  const hasActiveFilter =
    monthFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    subjectFilter !== 'all' ||
    statusFilter !== 'all';

  const statsToDisplay = hasActiveFilter ? filteredStats : overallStats;

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'P':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Present (P)
          </span>
        );
      case 'A':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Absent (A)
          </span>
        );
      case 'OD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            On Duty (OD)
          </span>
        );
    }
  };


  return (
    <div className="space-y-6">
      {/* ── Top Navigation & Student Header Card ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-1.5 bg-white border-slate-300 shadow-2xs hover:bg-slate-50 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </Button>
        <span className="text-xs text-slate-400 font-medium">/ Individual Profile</span>
      </div>

      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Student Info */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                {student.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-slate-900">{student.name}</h1>
                  <Badge variant={classId === 'CSE-25' ? 'info' : 'purple'} size="md">
                    {classId}
                  </Badge>
                  <Badge variant={student.active ? 'success' : 'danger'} size="sm">
                    {student.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap font-medium">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">
                    {student.student_id}
                  </span>
                  {student.email && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {student.email}
                    </span>
                  )}
                  <span className="text-slate-400">Room 245 • Semester III</span>
                </div>
              </div>
            </div>

            {/* Attendance Standing Pill */}
            <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Overall Status
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {overallStats.percentage >= 75
                    ? 'Eligible (Safe)'
                    : overallStats.percentage >= 65
                    ? 'Warning Zone'
                    : 'Critical Shortage'}
                </p>
              </div>
              <div className={cn(
                'px-3.5 py-2 rounded-xl font-mono font-black text-xl flex items-center gap-1',
                overallStats.percentage >= 75
                  ? 'bg-emerald-100 text-emerald-800'
                  : overallStats.percentage >= 65
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              )}>
                {overallStats.workingHours > 0 ? `${overallStats.percentage.toFixed(1)}%` : '—'}
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
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">
            {statsToDisplay.workingHours}
            <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total recorded periods</p>
        </div>

        {/* Present Hours */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wide">
            <span>Present (P)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-800 mt-2">
            {statsToDisplay.presentHours}
            <span className="text-xs font-normal text-emerald-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">Attended classes</p>
        </div>

        {/* OD Hours */}
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wide">
            <span>On Duty (OD)</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-800 mt-2">
            {statsToDisplay.odHours}
            <span className="text-xs font-normal text-amber-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-amber-700 mt-1">Counts towards %</p>
        </div>

        {/* Absent Hours */}
        <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wide">
            <span>Absent (A)</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-800 mt-2">
            {statsToDisplay.absentHours}
            <span className="text-xs font-normal text-rose-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-rose-700 mt-1">Missed sessions</p>
        </div>

        {/* Percentage Card */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs text-white col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Attendance %</span>
            <Percent className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">
            {statsToDisplay.workingHours > 0 ? (
              <>
                {statsToDisplay.percentage.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-0.5">%</span>
              </>
            ) : (
              <span className="text-sm font-normal text-slate-400 italic">—</span>
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {hasActiveFilter ? 'Filtered range' : 'Semester cumulative'}
          </p>
        </div>
      </div>

      {/* ── Detailed Attendance History Section ── */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Detailed Attendance History Log
              </CardTitle>
              <CardDescription>
                Chronological record of every period attendance mark for {student.name}.
              </CardDescription>
            </div>

            <Badge variant="default" size="sm">
              {filteredHistory.length} of {history.length} Records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── Filters Toolbar ── */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Filter History
              </span>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Month Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Month
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Months</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Subject
                </label>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Subjects</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Start */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Date Range End */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Status:</span>
              {(['all', 'P', 'A', 'OD'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-colors',
                    statusFilter === s
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {s === 'all'
                    ? 'All'
                    : s === 'P'
                    ? 'Present (P)'
                    : s === 'A'
                    ? 'Absent (A)'
                    : 'On Duty (OD)'}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Loading attendance history…</span>
            </div>
          )}

          {/* ── Table of History Records ── */}
          {!loading && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Calendar Date</th>
                    <th className="py-3 px-4">Day Order</th>
                    <th className="py-3 px-4">Period & Timing</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No attendance records found</p>
                        <p className="mt-0.5">No records matching the selected filters for this student.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr
                        key={item.attendance_id}
                        className={cn(
                          'hover:bg-slate-50/70 transition-colors',
                          item.status === 'A' && 'bg-rose-50/20'
                        )}
                      >
                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {item.date}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDate(item.date)}
                          </span>
                        </td>

                        {/* Day Order */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="info" size="sm">
                            Day Order {item.day_number}
                          </Badge>
                        </td>

                        {/* Period & Timing */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-xs text-slate-800">
                            Period {item.period_number}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.time_range}
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 text-xs">
                            {item.subject}
                          </span>
                          {item.subject.includes('LAB') && (
                            <Badge variant="purple" size="sm" className="ml-2 text-[10px]">
                              Lab
                            </Badge>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
