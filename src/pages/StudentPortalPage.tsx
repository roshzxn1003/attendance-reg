import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { MASTER_STUDENTS } from '../data/students';
import { Badge } from '../components/common/Badge';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Check,
  X,
  Mail,
  Loader2,
  BookOpen,
  TrendingUp,
  Filter,
  RotateCcw,
  Info,
  ShieldCheck,
  Zap,
  LayoutList,
  Table2,
} from 'lucide-react';
import { ACADEMIC_MONTHS } from '../services/monthlyAttendanceService';
import { formatDate } from '../lib/utils';
import { Student } from '../services/studentService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctColor(pct: number) {
  if (pct >= 85) return 'text-emerald-600';
  if (pct >= 75) return 'text-blue-600';
  if (pct >= 65) return 'text-amber-600';
  return 'text-rose-600';
}

function pctBg(pct: number) {
  if (pct >= 85) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-blue-500';
  if (pct >= 65) return 'bg-amber-500';
  return 'bg-rose-500';
}

function pctRing(pct: number) {
  if (pct >= 85) return '#10b981';
  if (pct >= 75) return '#3b82f6';
  if (pct >= 65) return '#f59e0b';
  return '#ef4444';
}

function pctLabel(pct: number) {
  if (pct >= 85) return { label: 'Excellent', sub: 'Well above 75% cutoff' };
  if (pct >= 75) return { label: 'Eligible ✓', sub: 'Above 75% — safe for exams' };
  if (pct >= 65) return { label: 'Warning ⚠', sub: 'Below 75% — attend more classes' };
  return { label: 'Critical ✗', sub: 'Risk of being detained' };
}

// Circular SVG progress ring — smaller on mobile (110px), larger on desktop (130px)
function AttendanceRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * circ;
  const color = pctRing(pct);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={cx} y={cx - 6} textAnchor="middle" fill="white" fontSize={size * 0.175} fontWeight="900" fontFamily="ui-monospace,monospace">
        {pct.toFixed(1)}
      </text>
      <text x={cx} y={cx + 10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={size * 0.09} fontWeight="600">
        % ATTENDANCE
      </text>
    </svg>
  );
}

// Mini horizontal progress bar
function MiniBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Status pill
function StatusPill({ status }: { status: 'P' | 'A' | 'OD' }) {
  if (status === 'P') return (
    <span className="inline-flex items-center gap-1 font-mono font-black text-[11px] px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
      <Check className="w-3 h-3 stroke-[3]" /> Present
    </span>
  );
  if (status === 'A') return (
    <span className="inline-flex items-center gap-1 font-mono font-black text-[11px] px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
      <X className="w-3 h-3 stroke-[3]" /> Absent
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 font-mono font-black text-[11px] px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
      <Clock className="w-3 h-3" /> On Duty
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();

  // Resolve student object
  const currentStudent = useMemo<Student>(() => {
    if (user?.student_id) {
      const match = MASTER_STUDENTS.find((s) => s.student_id === user.student_id);
      if (match) return { ...match, email: match.email ?? null };
      return {
        student_id: user.student_id,
        name: user.name,
        class_id: user.class_id || 'CSE-25',
        email: user.email ?? null,
        active: true,
      };
    }
    const d = MASTER_STUDENTS[0];
    return { ...d, email: d.email ?? null };
  }, [user]);

  const {
    filteredHistory,
    overallStats,
    filteredStats,
    availableSubjects,
    loading,
    monthFilter,
    setMonthFilter,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
  } = useStudentProfile(currentStudent.student_id, currentStudent.class_id);

  const [search, setSearch] = React.useState('');
  // Default to cards on mobile (< sm), table otherwise — start with cards since it's better on phone
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('cards');

  // Final displayed records after search
  const displayedHistory = useMemo(() => {
    if (!search.trim()) return filteredHistory;
    const q = search.toLowerCase();
    return filteredHistory.filter(
      (r) => r.subject.toLowerCase().includes(q) || r.date.includes(q)
    );
  }, [filteredHistory, search]);

  // Per-subject breakdown
  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; od: number; total: number }>();
    for (const r of filteredHistory) {
      const cur = map.get(r.subject) || { present: 0, absent: 0, od: 0, total: 0 };
      if (r.status === 'P') cur.present++;
      else if (r.status === 'A') cur.absent++;
      else if (r.status === 'OD') cur.od++;
      cur.total++;
      map.set(r.subject, cur);
    }
    return Array.from(map.entries())
      .map(([subject, s]) => ({
        subject,
        ...s,
        pct: s.total > 0 ? +(((s.present + s.od) / s.total) * 100).toFixed(1) : 100,
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [filteredHistory]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; od: number; total: number }>();
    for (const r of filteredHistory) {
      const ym = r.date.slice(0, 7);
      const cur = map.get(ym) || { present: 0, absent: 0, od: 0, total: 0 };
      if (r.status === 'P') cur.present++;
      else if (r.status === 'A') cur.absent++;
      else if (r.status === 'OD') cur.od++;
      cur.total++;
      map.set(ym, cur);
    }
    return Array.from(map.entries())
      .map(([ym, s]) => ({
        ym,
        label: ACADEMIC_MONTHS.find((m) => m.value === ym)?.label || ym,
        ...s,
        pct: s.total > 0 ? +(((s.present + s.od) / s.total) * 100).toFixed(1) : 100,
      }))
      .sort((a, b) => a.ym.localeCompare(b.ym));
  }, [filteredHistory]);

  // Stats (use overall unless a filter is active)
  const stats =
    monthFilter !== 'all' || subjectFilter !== 'all' || statusFilter !== 'all'
      ? filteredStats
      : overallStats;
  const { workingHours: total, presentHours, odHours, absentHours, percentage } = stats;
  const effectivePresent = presentHours + odHours;
  const isSafe = percentage >= 75;
  const isCritical = percentage < 65;
  const statusInfo = pctLabel(percentage);

  // Smart calculator
  const canMiss = isSafe ? Math.max(0, Math.floor(effectivePresent / 0.75 - total)) : 0;
  const mustAttend =
    !isSafe && total > 0 ? Math.ceil((0.75 * total - effectivePresent) / 0.25) : 0;

  // Active filter count
  const activeFiltersCount = [
    monthFilter !== 'all',
    subjectFilter !== 'all',
    statusFilter !== 'all',
    search.trim() !== '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 pb-16 w-full">

      {/* ════════════════════════════════════════
          HERO HEADER
         ════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl overflow-hidden shadow-xl border border-white/5 relative">
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative p-5 sm:p-7">
          {/* ── Top row: avatar + info + ring ── */}
          <div className="flex items-start justify-between gap-3">
            {/* Left: avatar + student info */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6 text-blue-300" />
              </div>
              <div className="min-w-0">
                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/20 text-[9px] font-black font-mono tracking-wide">
                    {currentStudent.student_id}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 text-[9px] font-black">
                    {currentStudent.class_id}
                  </span>
                </div>
                {/* Name */}
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight line-clamp-2">
                  {currentStudent.name}
                </h1>
                {/* Email */}
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 flex-wrap">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[180px]">
                    {currentStudent.email || 'student@spiher.ac.in'}
                  </span>
                </p>
              </div>
            </div>

            {/* Right: Ring */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              {loading ? (
                <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                </div>
              ) : (
                <>
                  <AttendanceRing pct={percentage} size={100} />
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                    isSafe
                      ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                      : isCritical
                      ? 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                      : 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                  }`}>
                    {statusInfo.label}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Stats strip ── */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/10">
            {[
              { label: 'Total', value: total, icon: Calendar, color: 'text-slate-300' },
              { label: 'Present', value: presentHours, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'On Duty', value: odHours, icon: Clock, color: 'text-amber-400' },
              { label: 'Absent', value: absentHours, icon: XCircle, color: 'text-rose-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center">
                <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
                <div className="text-lg sm:text-2xl font-black text-white leading-none">
                  {loading ? '—' : value}
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-0.5 leading-tight">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          SMART CALCULATOR
         ════════════════════════════════════════ */}
      {!loading && total > 0 && (
        <div className={`rounded-2xl border p-4 ${
          isSafe
            ? 'bg-emerald-50 border-emerald-200'
            : isCritical
            ? 'bg-rose-50 border-rose-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isSafe ? 'bg-emerald-100' : isCritical ? 'bg-rose-100' : 'bg-amber-100'
            }`}>
              {isSafe
                ? <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                : <Zap className="w-4.5 h-4.5 text-rose-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {isSafe ? (
                <>
                  <p className="text-sm font-black text-emerald-900 leading-snug">
                    You can miss{' '}
                    <span className="underline decoration-dotted">{canMiss} more period{canMiss !== 1 ? 's' : ''}</span>
                    {' '}and still stay above 75%.
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    {effectivePresent}/{total} attended · {percentage.toFixed(1)}% · Keep it up!
                  </p>
                </>
              ) : mustAttend > 0 ? (
                <>
                  <p className="text-sm font-black text-rose-900 leading-snug">
                    Attend the next{' '}
                    <span className="underline decoration-dotted">{mustAttend} consecutive period{mustAttend !== 1 ? 's' : ''}</span>
                    {' '}to reach 75%.
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1">
                    {effectivePresent}/{total} · {percentage.toFixed(1)}% → need {(((effectivePresent + mustAttend) / (total + mustAttend)) * 100).toFixed(1)}%
                  </p>
                </>
              ) : (
                <p className="text-sm font-black text-amber-900">Warning zone — attend all upcoming classes.</p>
              )}
            </div>
            <div className={`text-xl font-black shrink-0 ${
              isSafe ? 'text-emerald-600' : isCritical ? 'text-rose-600' : 'text-amber-600'
            }`}>
              {percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          SUBJECT-WISE BREAKDOWN
         ════════════════════════════════════════ */}
      {!loading && subjectBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-slate-900">Subject-wise Attendance</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium shrink-0">{subjectBreakdown.length} subjects</span>
          </div>

          <div className="divide-y divide-slate-50">
            {subjectBreakdown.map((sub) => (
              <div key={sub.subject} className="px-4 py-3">
                {/* Row 1: subject name + pct */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-800 leading-tight line-clamp-1 flex-1 min-w-0">
                    {sub.subject}
                  </span>
                  <span className={`text-xs font-black shrink-0 ${pctColor(sub.pct)}`}>
                    {sub.pct}%
                  </span>
                </div>
                {/* Bar */}
                <MiniBar value={sub.present + sub.od} max={sub.total} color={pctBg(sub.pct)} />
                {/* Row 3: mini chips */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    P: {sub.present}
                  </span>
                  {sub.od > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                      OD: {sub.od}
                    </span>
                  )}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                    A: {sub.absent}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100 ml-auto">
                    {sub.total} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MONTHLY TREND
         ════════════════════════════════════════ */}
      {!loading && monthlyTrend.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
            <h2 className="text-sm font-black text-slate-900">Month-by-Month Trend</h2>
          </div>
          {/* Horizontal scroll on mobile */}
          <div className="flex gap-2.5 p-4 overflow-x-auto pb-4 scrollbar-thin">
            {monthlyTrend.map((m) => (
              <div
                key={m.ym}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex-shrink-0 w-32"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-black ${pctColor(m.pct)}`}>{m.pct}%</span>
                </div>
                <MiniBar value={m.present + m.od} max={m.total} color={pctBg(m.pct)} />
                <div className="mt-2 text-[9px] font-bold text-slate-500 leading-tight">{m.label}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">{m.present + m.od}/{m.total} periods</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ATTENDANCE LOG
         ════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-900 leading-tight">Attendance Log</h2>
                <p className="text-[10px] text-slate-400 leading-tight">Official records by CR &amp; Faculty</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="info" size="md">{displayedHistory.length}</Badge>
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  title="Card view"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Table view"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          {/* ── Filter Toolbar ── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
            {/* Filter header row */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filters</span>
              {activeFiltersCount > 0 && (
                <>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black">
                    {activeFiltersCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => { resetFilters(); setSearch(''); }}
                    className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                  </button>
                </>
              )}
            </div>

            {/* Search bar — full width */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search subject or date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition"
              />
            </div>

            {/* 3 selects in a row — 2-col on mobile, 3-col on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Month */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Month</label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
                >
                  <option value="all">All Months</option>
                  {ACADEMIC_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Subject</label>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
                >
                  <option value="all">All Subjects</option>
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Status — col-span-2 on mobile to fill row, col-span-1 on sm */}
              <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer w-full"
                >
                  <option value="all">All (P, A, OD)</option>
                  <option value="P">Present (P)</option>
                  <option value="A">Absent (A)</option>
                  <option value="OD">On Duty (OD)</option>
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {monthFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setMonthFilter('all')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200 hover:bg-blue-200 transition-colors"
                  >
                    📅 {ACADEMIC_MONTHS.find((m) => m.value === monthFilter)?.label || monthFilter}
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
                {subjectFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('all')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold border border-indigo-200 hover:bg-indigo-200 transition-colors max-w-[160px]"
                  >
                    <span className="truncate">📚 {subjectFilter}</span>
                    <X className="w-2.5 h-2.5 shrink-0" />
                  </button>
                )}
                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    🎯 {statusFilter === 'P' ? 'Present' : statusFilter === 'A' ? 'Absent' : 'On Duty'}
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200 hover:bg-slate-200 transition-colors max-w-[140px]"
                  >
                    <span className="truncate">🔍 "{search}"</span>
                    <X className="w-2.5 h-2.5 shrink-0" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Records ── */}
          {loading ? (
            <div className="py-14 text-center flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
              <span className="text-xs font-medium text-slate-500">Loading attendance history…</span>
            </div>
          ) : displayedHistory.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center gap-3">
              <Calendar className="w-10 h-10 text-slate-200" />
              <p className="font-black text-slate-700 text-sm">No records found</p>
              <p className="text-xs text-slate-400">Try clearing your filters.</p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { resetFilters(); setSearch(''); }}
                  className="mt-1 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear all filters
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* ── Card View — default, great on mobile ── */
            <div className="space-y-2">
              {displayedHistory.map((rec) => (
                <div
                  key={`${rec.date}_${rec.period_number}_${rec.subject}`}
                  className={`rounded-xl border p-3 flex items-center gap-3 ${
                    rec.status === 'A'
                      ? 'bg-rose-50/60 border-rose-200'
                      : rec.status === 'OD'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Status dot */}
                  <div className={`w-1.5 h-10 rounded-full shrink-0 ${
                    rec.status === 'P' ? 'bg-emerald-400'
                    : rec.status === 'A' ? 'bg-rose-400'
                    : 'bg-amber-400'
                  }`} />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 leading-tight truncate">{rec.subject}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {formatDate(rec.date)}
                    </p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Day {rec.day_number}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Period {rec.period_number}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {rec.time_range}
                      </span>
                    </div>
                  </div>
                  {/* Status pill */}
                  <StatusPill status={rec.status} />
                </div>
              ))}
            </div>
          ) : (
            /* ── Table View — scrollable horizontally on mobile ── */
            <div className="overflow-x-auto rounded-xl border border-slate-200 -mx-0">
              <table className="w-full text-xs text-left min-w-[480px]">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Date</th>
                    <th className="px-3 py-2.5 font-bold">Day</th>
                    <th className="px-3 py-2.5 font-bold">Period</th>
                    <th className="px-3 py-2.5 font-bold">Subject</th>
                    <th className="px-3 py-2.5 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {displayedHistory.map((rec) => (
                    <tr
                      key={`${rec.date}_${rec.period_number}_${rec.subject}`}
                      className={`transition-colors ${
                        rec.status === 'A' ? 'bg-rose-50/30 hover:bg-rose-50/60'
                        : rec.status === 'OD' ? 'bg-amber-50/30 hover:bg-amber-50/60'
                        : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(rec.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                          D{rec.day_number}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                        P{rec.period_number}
                        <span className="text-slate-400 text-[10px] ml-1">({rec.time_range})</span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-800 max-w-[140px] truncate">
                        {rec.subject}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <StatusPill status={rec.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer note */}
          {!loading && displayedHistory.length > 0 && (
            <div className="flex items-start gap-1.5 text-[9px] text-slate-400 pt-0.5">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>OD (On Duty) counts as present. Records synced from Supabase cloud.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
