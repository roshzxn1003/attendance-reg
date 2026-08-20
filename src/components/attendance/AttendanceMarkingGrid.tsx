import React, { useState, useMemo } from 'react';
import {
  Check,
  X,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Users,
  Percent,
  ShieldCheck,
} from 'lucide-react';
import { ClassId, PeriodNumber } from '../../types';
import { Student } from '../../services/studentService';
import { useAttendance } from '../../hooks/useAttendance';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardContent } from '../common/Card';
import { cn, formatDate } from '../../lib/utils';

interface AttendanceMarkingGridProps {
  classId: ClassId;
  classNameTitle: string;
  date: string;
  periodNumber: PeriodNumber;
  dayOrderNumber: number;
  subject: string;
  timeRange: string;
  students: Student[];
  onSaveSuccess?: () => void;
}

export const AttendanceMarkingGrid: React.FC<AttendanceMarkingGridProps> = ({
  classId,
  classNameTitle,
  date,
  periodNumber,
  dayOrderNumber,
  subject,
  timeRange,
  students,
  onSaveSuccess,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unmarked' | 'absent' | 'od'>('all');
  const toast = useToast();

  const {
    marks,
    stats,
    isAlreadySaved,
    lastMarkedAt,
    isAllMarked,
    activeStudents,
    saving,
    error,
    saveSuccess,
    markStudent,
    markAllPresent,
    clearAll,
    save,
  } = useAttendance(classId, date, periodNumber, students);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    return activeStudents.filter((s) => {
      const matchQuery =
        !q ||
        s.student_id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q);

      const status = marks[s.student_id];
      const matchFilter =
        filterMode === 'all' ||
        (filterMode === 'unmarked' && !status) ||
        (filterMode === 'absent' && status === 'A') ||
        (filterMode === 'od' && status === 'OD');

      return matchQuery && matchFilter;
    });
  }, [activeStudents, search, filterMode, marks]);

  const handleSaveClick = async () => {
    try {
      await save();
      toast.success(
        `Saved Period ${periodNumber} (${subject}) — ${stats.present} P, ${stats.absent} A, ${stats.od} OD (${stats.percentage}%)`,
        'Attendance Saved'
      );
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      toast.error(String(err), 'Save Failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Period Header Bar ── */}
      <Card className="border-blue-200 bg-white shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  Period {periodNumber} — {subject}
                </span>
                <Badge variant={subject.includes('LAB') ? 'purple' : 'info'} size="md">
                  {subject.includes('LAB') ? 'Laboratory' : 'Lecture'}
                </Badge>
                {isAlreadySaved && (
                  <Badge variant="success" size="md" className="gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Recorded
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {timeRange} • Day Order {dayOrderNumber} • {formatDate(date)} • {classNameTitle}
              </p>
            </div>

            {lastMarkedAt && (
              <div className="text-[11px] text-slate-400 font-mono self-start sm:self-auto">
                Last saved: {new Date(lastMarkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Live Counters Dashboard Bar (Responsive Grid) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Total */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </div>

        {/* Present (P) */}
        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Present (P)</span>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{stats.present}</p>
        </div>

        {/* Absent (A) */}
        <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Absent (A)</span>
            <X className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1">{stats.absent}</p>
        </div>

        {/* On Duty (OD) */}
        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
            <span>On Duty (OD)</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-800 mt-1">{stats.od}</p>
        </div>

        {/* Not Marked */}
        <div className={cn(
          'p-3 rounded-xl border shadow-2xs transition-colors',
          stats.notMarked > 0
            ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/20'
            : 'bg-white border-slate-200'
        )}>
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center justify-between">
            <span>Unmarked</span>
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className={cn('text-xl sm:text-2xl font-black mt-1', stats.notMarked > 0 ? 'text-blue-700 font-extrabold' : 'text-slate-400')}>
            {stats.notMarked}
          </p>
        </div>

        {/* Percentage */}
        <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Attendance</span>
            <Percent className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1">
            {stats.percentage}<span className="text-xs font-normal text-slate-400">%</span>
          </p>
        </div>
      </div>

      {/* ── Fast Marking Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Mark All Present */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              markAllPresent();
              toast.info('Marked all active students Present', 'Quick Action');
            }}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex-1 sm:flex-none py-2 text-xs rounded-xl"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </Button>

          {/* Clear All */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="gap-1.5 text-slate-600 hover:text-slate-900 border-slate-300 flex-1 sm:flex-none py-2 text-xs rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear All</span>
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter roll/name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {(['all', 'unmarked', 'absent', 'od'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={cn(
                  'px-2 py-1 rounded-md capitalize font-bold transition-colors text-[10px] sm:text-[11px]',
                  filterMode === mode
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Success Toast Banner ── */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-emerald-900">Attendance saved successfully!</p>
              <p className="text-emerald-800 text-[11px]">
                {saveSuccess.savedCount} records • P: {saveSuccess.stats.present} • A: {saveSuccess.stats.absent} • OD: {saveSuccess.stats.od} • {saveSuccess.stats.percentage}%
              </p>
            </div>
          </div>
          <Badge variant="success" size="sm">
            {saveSuccess.stats.percentage}% Attendance
          </Badge>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Student List (Mobile-Optimized Touch Rows) ── */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No students match filter</p>
              <p className="mt-0.5">Try clearing your search or filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((student, idx) => {
                const currentStatus = marks[student.student_id];

                return (
                  <div
                    key={student.student_id}
                    className={cn(
                      'p-2.5 sm:p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors',
                      currentStatus === 'P' && 'bg-emerald-50/25',
                      currentStatus === 'A' && 'bg-rose-50/25',
                      currentStatus === 'OD' && 'bg-amber-50/25',
                      !currentStatus && 'hover:bg-slate-50/50'
                    )}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-[11px] text-slate-400 font-mono text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {student.student_id}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {student.name}
                          </span>
                        </div>
                        {student.email && (
                          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5 hidden sm:block">
                            {student.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Touch-Friendly P / A / OD Button Group */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                      {/* P - Present */}
                      <button
                        type="button"
                        onClick={() => markStudent(student.student_id, 'P')}
                        className={cn(
                          'flex-1 sm:flex-none h-11 min-w-[54px] sm:min-w-[60px] px-3.5 rounded-xl font-black text-sm transition-all duration-100 flex items-center justify-center gap-1 select-none active:scale-95 cursor-pointer',
                          currentStatus === 'P'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700'
                        )}
                      >
                        <Check className={cn('w-4 h-4', currentStatus === 'P' ? 'stroke-[3]' : '')} />
                        <span>P</span>
                      </button>

                      {/* A - Absent */}
                      <button
                        type="button"
                        onClick={() => markStudent(student.student_id, 'A')}
                        className={cn(
                          'flex-1 sm:flex-none h-11 min-w-[54px] sm:min-w-[60px] px-3.5 rounded-xl font-black text-sm transition-all duration-100 flex items-center justify-center gap-1 select-none active:scale-95 cursor-pointer',
                          currentStatus === 'A'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-700'
                        )}
                      >
                        <X className={cn('w-4 h-4', currentStatus === 'A' ? 'stroke-[3]' : '')} />
                        <span>A</span>
                      </button>

                      {/* OD - On Duty */}
                      <button
                        type="button"
                        onClick={() => markStudent(student.student_id, 'OD')}
                        className={cn(
                          'flex-1 sm:flex-none h-11 min-w-[54px] sm:min-w-[60px] px-3 rounded-xl font-black text-xs transition-all duration-100 flex items-center justify-center gap-1 select-none active:scale-95 cursor-pointer',
                          currentStatus === 'OD'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700'
                        )}
                      >
                        <span>OD</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sticky Save Action Bar ── */}
      <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border-2 border-slate-300 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          {!isAllMarked ? (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-bold w-full sm:w-auto text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Mark all students ({stats.notMarked} remaining)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All {stats.total} marked • Ready to save</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="primary"
            size="lg"
            disabled={!isAllMarked || saving}
            isLoading={saving}
            onClick={handleSaveClick}
            className={cn(
              'gap-2 w-full sm:w-auto font-black px-6 py-2.5 text-xs sm:text-sm rounded-xl shadow-md transition-all',
              isAlreadySaved
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            )}
          >
            <Save className="w-4 h-4" />
            <span>{isAlreadySaved ? 'Update Attendance' : 'Save Attendance'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
