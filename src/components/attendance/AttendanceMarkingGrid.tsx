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
  Layers,
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
  selectedPeriods: PeriodNumber[];
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
  selectedPeriods,
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
  } = useAttendance(classId, date, selectedPeriods, students);

  const isMultiPeriod = selectedPeriods.length > 1;
  const periodLabel = selectedPeriods.length === 1
    ? `Period ${selectedPeriods[0]}`
    : `Periods ${selectedPeriods.join(', ')}`;

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
      const res = await save();
      const recordsText = isMultiPeriod
        ? `${res.savedCount} records across ${selectedPeriods.length} periods`
        : `${res.savedCount} records`;

      toast.success(
        `Saved ${periodLabel} (${recordsText}) — ${stats.present} P, ${stats.absent} A, ${stats.od} OD (${stats.percentage}%)`,
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
      <Card className={cn('bg-white shadow-xs border', isMultiPeriod ? 'border-indigo-300' : 'border-blue-200')}>
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-sm sm:text-lg font-black text-slate-900 leading-tight">
                  {periodLabel} — {subject}
                </span>

                {isMultiPeriod && (
                  <Badge variant="purple" size="sm" className="gap-1 font-bold">
                    <Layers className="w-3 h-3" />
                    {selectedPeriods.length} Periods
                  </Badge>
                )}

                <Badge variant={subject.includes('LAB') ? 'purple' : 'info'} size="sm">
                  {subject.includes('LAB') ? 'Lab' : 'Lecture'}
                </Badge>

                {isAlreadySaved && (
                  <Badge variant="success" size="sm" className="gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Saved
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
                {timeRange} • Day Order {dayOrderNumber} • {formatDate(date)} • {classNameTitle}
              </p>
            </div>

            {lastMarkedAt && (
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono self-start sm:self-auto">
                Last saved: {new Date(lastMarkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Live Counters Dashboard Bar (Responsive Mobile Grid 3x2) ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {/* Total */}
        <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total</span>
            <Users className="w-3 h-3 text-slate-400 hidden sm:block" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{stats.total}</p>
        </div>

        {/* Present (P) */}
        <div className="p-2.5 sm:p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Present (P)</span>
            <Check className="w-3 h-3 text-emerald-600 hidden sm:block" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-0.5 sm:mt-1">{stats.present}</p>
        </div>

        {/* Absent (A) */}
        <div className="p-2.5 sm:p-3 bg-rose-50/70 rounded-xl border border-rose-200 shadow-2xs">
          <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Absent (A)</span>
            <X className="w-3 h-3 text-rose-600 hidden sm:block" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-rose-700 mt-0.5 sm:mt-1">{stats.absent}</p>
        </div>

        {/* On Duty (OD) */}
        <div className="p-2.5 sm:p-3 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs">
          <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
            <span>On Duty</span>
            <Clock className="w-3 h-3 text-amber-600 hidden sm:block" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-amber-800 mt-0.5 sm:mt-1">{stats.od}</p>
        </div>

        {/* Not Marked */}
        <div className={cn(
          'p-2.5 sm:p-3 rounded-xl border shadow-2xs transition-colors',
          stats.notMarked > 0
            ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/20'
            : 'bg-white border-slate-200'
        )}>
          <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center justify-between">
            <span>Unmarked</span>
            <AlertCircle className="w-3 h-3 text-blue-600 hidden sm:block" />
          </div>
          <p className={cn('text-lg sm:text-2xl font-black mt-0.5 sm:mt-1', stats.notMarked > 0 ? 'text-blue-700 font-extrabold' : 'text-slate-400')}>
            {stats.notMarked}
          </p>
        </div>

        {/* Percentage */}
        <div className="p-2.5 sm:p-3 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-2xs">
          <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Att %</span>
            <Percent className="w-3 h-3 text-slate-400 hidden sm:block" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-white mt-0.5 sm:mt-1">
            {stats.percentage}<span className="text-[10px] font-normal text-slate-400">%</span>
          </p>
        </div>
      </div>

      {/* ── Fast Marking Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {/* Mark All Present */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              markAllPresent();
              toast.info(`Marked all active students Present for ${periodLabel}`, 'Quick Action');
            }}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex-1 sm:flex-none py-2 text-xs rounded-xl"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </Button>

          {/* Clear All */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="gap-1 text-slate-600 hover:text-slate-900 border-slate-300 flex-1 sm:flex-none py-2 text-xs rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear</span>
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {(['all', 'unmarked', 'absent', 'od'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={cn(
                  'px-2 py-1 rounded-lg capitalize font-bold transition-colors text-[10px] sm:text-[11px]',
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
        <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-emerald-900">
                Attendance saved for {periodLabel}!
              </p>
              <p className="text-emerald-800 text-[11px]">
                {saveSuccess.savedCount} records across {saveSuccess.periodsCount} periods • P: {saveSuccess.stats.present} • A: {saveSuccess.stats.absent} • OD: {saveSuccess.stats.od}
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
      <Card className="border-slate-200 bg-white rounded-2xl overflow-hidden">
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
                      'p-2.5 sm:p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors',
                      currentStatus === 'P' && 'bg-emerald-50/20',
                      currentStatus === 'A' && 'bg-rose-50/20',
                      currentStatus === 'OD' && 'bg-amber-50/20',
                      !currentStatus && 'hover:bg-slate-50/50'
                    )}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 text-[10px] text-slate-400 font-mono text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {student.student_id}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {student.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Touch-Friendly P / A / OD Button Group */}
                    <div className="flex items-center gap-1.5 self-stretch sm:self-auto shrink-0 mt-1 sm:mt-0">
                      {/* P - Present */}
                      <button
                        type="button"
                        onClick={() => markStudent(student.student_id, 'P')}
                        className={cn(
                          'flex-1 sm:flex-none h-11 min-w-[50px] sm:min-w-[62px] px-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-100 flex items-center justify-center gap-1 select-none active:scale-95 cursor-pointer',
                          currentStatus === 'P'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700'
                        )}
                      >
                        <Check className={cn('w-3.5 h-3.5', currentStatus === 'P' ? 'stroke-[3]' : '')} />
                        <span>P</span>
                      </button>

                      {/* A - Absent */}
                      <button
                        type="button"
                        onClick={() => markStudent(student.student_id, 'A')}
                        className={cn(
                          'flex-1 sm:flex-none h-11 min-w-[50px] sm:min-w-[62px] px-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-100 flex items-center justify-center gap-1 select-none active:scale-95 cursor-pointer',
                          currentStatus === 'A'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-700'
                        )}
                      >
                        <X className={cn('w-3.5 h-3.5', currentStatus === 'A' ? 'stroke-[3]' : '')} />
                        <span>A</span>
                      </button>

                      {/* OD - On Duty */}
                      <button
                        type="button"
                        onClick={() => markStudent(student.student_id, 'OD')}
                        className={cn(
                          'flex-1 sm:flex-none h-11 min-w-[50px] sm:min-w-[62px] px-3 rounded-xl font-black text-xs transition-all duration-100 flex items-center justify-center gap-1 select-none active:scale-95 cursor-pointer',
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

      {/* ── Sticky Save Action Bar (Positioned above mobile bottom bar) ── */}
      <div className="sticky bottom-16 md:bottom-3 z-30 bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border-2 border-slate-300 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          {!isAllMarked ? (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-bold w-full sm:w-auto text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Mark all students ({stats.notMarked} remaining)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold text-xs w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
              'gap-2 w-full sm:w-auto font-black px-6 py-2.5 text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer',
              isMultiPeriod
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                : isAlreadySaved
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            )}
          >
            <Save className="w-4 h-4" />
            <span>
              {isMultiPeriod
                ? `Save All ${selectedPeriods.length} Periods`
                : isAlreadySaved
                ? 'Update Attendance'
                : 'Save Attendance'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};
