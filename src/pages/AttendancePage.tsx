import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/common/Card';
import { useApp } from '../context/AppContext';
import { getTodayDateString, formatDate, formatTimeRange12h } from '../lib/utils';
import { PERIOD_TIMINGS, getSubjectForSlot, DAY_ORDERS } from '../data/timetable';
import { DayNumber, PeriodNumber } from '../types';
import {
  Calendar,
  Clock,
  Palmtree,
  Coffee,
  Utensils,
  BarChart3,
  CheckSquare,
  Layers,
  Check,
  MessageCircle,
  Zap,
  Pencil,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ClassSelector } from '../components/common/ClassSelector';
import { DayCycleSetupCard } from '../components/daycycle/DayCycleSetupCard';
import { AttendanceMarkingGrid } from '../components/attendance/AttendanceMarkingGrid';
import { DailyAttendanceOverviewCard } from '../components/attendance/DailyAttendanceOverviewCard';
import { StudentAttendanceSummaryTable } from '../components/attendance/StudentAttendanceSummaryTable';
import { DailyAttendanceReportTab } from '../components/attendance/DailyAttendanceReportTab';
import { useDayCycle } from '../hooks/useDayCycle';
import { useTimetable } from '../hooks/useTimetable';
import { useStudents } from '../hooks/useStudents';
import { useAttendanceDashboard } from '../hooks/useAttendanceDashboard';
import { cn } from '../lib/utils';

type ActiveViewMode = 'marking' | 'report' | 'summary';

interface AttendancePageProps {
  initialView?: ActiveViewMode;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ initialView }) => {
  const { selectedClass } = useApp();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ActiveViewMode | null;

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodNumber[]>([1]);
  const [activeView, setActiveView] = useState<ActiveViewMode>(() => {
    if (tabParam && ['marking', 'report', 'summary'].includes(tabParam)) return tabParam;
    return initialView || 'marking';
  });
  const [reportScope, setReportScope] = useState<'period' | 'fullday' | 'custom'>('period');
  const [isDayOrderModalOpen, setIsDayOrderModalOpen] = useState(false);

  useEffect(() => {
    if (tabParam && ['marking', 'report', 'summary'].includes(tabParam)) {
      setActiveView(tabParam);
      if (tabParam === 'report') {
        setReportScope('period');
      }
    }
  }, [tabParam]);

  // Day Cycle Hook for active date & class
  const {
    currentEntry,
    suggestedDay,
    prevWorkingDate,
    prevWorkingDay,
    loading: cycleLoading,
    assignDay,
    markHoliday,
  } = useDayCycle(selectedClass.id, selectedDate);

  // Timetable Hook for active class
  const { entries: timetableEntries } = useTimetable(selectedClass.id);

  // Students Hook for active class (strictly filter to active students)
  const { students } = useStudents(selectedClass.id);
  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  // Attendance Dashboard & Calculations Hook
  const {
    dateRecords,
    dailyOverview,
    todaySummaries,
    cumulativeSummaries,
    reload: reloadDashboard,
  } = useAttendanceDashboard(selectedClass.id, selectedDate, activeStudents);

  const isAssigned = currentEntry !== null;
  const isHoliday = currentEntry?.is_holiday === true;
  const activeDayNumber = currentEntry?.day_number as DayNumber | undefined;

  const activeDayOrderLabel = activeDayNumber
    ? DAY_ORDERS.find((d) => d.dayNumber === activeDayNumber)?.label ?? `Day Order ${activeDayNumber}`
    : null;

  // Multi-Period Selection Handlers
  const togglePeriod = (p: PeriodNumber) => {
    setSelectedPeriods((prev) => {
      if (prev.includes(p)) {
        if (prev.length === 1) return prev; // keep at least 1 period
        return prev.filter((x) => x !== p).sort((a, b) => a - b);
      }
      return [...prev, p].sort((a, b) => a - b);
    });
  };

  const selectAllPeriods = () => {
    setSelectedPeriods([1, 2, 3, 4, 5, 6, 7]);
  };

  const selectMorningPeriods = () => {
    setSelectedPeriods([1, 2, 3, 4]);
  };

  const selectAfternoonPeriods = () => {
    setSelectedPeriods([5, 6, 7]);
  };

  const selectSinglePeriod = (p: PeriodNumber) => {
    setSelectedPeriods([p]);
  };

  const selectLabPeriods = () => {
    const labPeriods = PERIOD_TIMINGS
      .map((slot) => slot.period)
      .filter((p) => {
        const dbSlot = activeDayNumber
          ? timetableEntries.find((t) => t.day_number === activeDayNumber && t.period_number === p)
          : undefined;
        const subj = dbSlot?.subject || (activeDayNumber ? getSubjectForSlot(activeDayNumber, p, selectedClass.id) : '');
        return subj.toUpperCase().includes('LAB');
      });
    if (labPeriods.length > 0) {
      setSelectedPeriods(labPeriods);
    } else {
      setSelectedPeriods([2, 3, 4]);
    }
  };

  // Compute composite active subject & timings for multi-period selection
  const selectedSlots = selectedPeriods.map((p) => {
    const dbSlot = activeDayNumber
      ? timetableEntries.find((t) => t.day_number === activeDayNumber && t.period_number === p)
      : undefined;
    const subj = dbSlot?.subject || (activeDayNumber ? getSubjectForSlot(activeDayNumber, p, selectedClass.id) : '');
    const timing = dbSlot
      ? formatTimeRange12h(dbSlot.start_time, dbSlot.end_time)
      : PERIOD_TIMINGS.find((slot) => slot.period === p)?.label || '';
    return { period: p, subject: subj, timing, dbSlot };
  });

  const uniqueSubjects = Array.from(new Set(selectedSlots.map((s) => s.subject).filter(Boolean)));
  const compositeSubject = uniqueSubjects.length === 1
    ? uniqueSubjects[0]
    : uniqueSubjects.join(', ') || 'Attendance Period';

  const compositeTiming = selectedSlots.length === 1
    ? selectedSlots[0].timing
    : `${selectedSlots[0]?.timing.split(/\s*[–—-]\s*/)[0] || ''} – ${selectedSlots[selectedSlots.length - 1]?.timing.split(/\s*[–—-]\s*/)[1] || ''}`;

  return (
    <div className="space-y-5 pb-24 sm:pb-12">
      <PageHeader
        title="Attendance Marking & Daily Reports"
        subtitle="Fast, CR-optimized period attendance marking, WhatsApp reports, and period registers for Room 245."
        badge="Daily Flow"
      />

      {/* ── Top Bar: Date Picker, Quick Actions & Pinned Active Class ── */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Date + Day Order */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                <Calendar className="w-4 h-4 text-blue-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer font-mono"
                />
              </div>
              <div className="text-xs text-slate-600 font-semibold hidden sm:block">
                {formatDate(selectedDate)}
              </div>
              {/* Day Order Interactive Trigger Badge */}
              {isAssigned && !isHoliday && activeDayOrderLabel ? (
                <button
                  type="button"
                  onClick={() => setIsDayOrderModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition-all shadow-2xs cursor-pointer select-none group"
                  title="Click to Change Day Order / Status"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-extrabold">{activeDayOrderLabel}</span>
                  <Pencil className="w-3 h-3 text-indigo-500 opacity-60 ml-0.5 group-hover:rotate-12 transition-transform" />
                </button>
              ) : isAssigned && isHoliday ? (
                <button
                  type="button"
                  onClick={() => setIsDayOrderModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all shadow-2xs cursor-pointer select-none group"
                  title="Marked as Holiday. Click to Change Day Order / Status"
                >
                  <Palmtree className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="font-extrabold">Holiday</span>
                  <Pencil className="w-3 h-3 text-rose-500 opacity-60 ml-0.5 group-hover:rotate-12 transition-transform" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDayOrderModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black transition-all shadow-2xs cursor-pointer select-none animate-pulse"
                  title="Click to Set Day Order / Status"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Set Day Order</span>
                </button>
              )}
            </div>

            {/* Right: Actions & Pinned Active Class Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              <NavLink
                to="/backlog-entry"
                className="gap-1.5 font-bold text-xs py-1.5 px-3 rounded-xl transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Backlog Wizard</span>
              </NavLink>
              <div className="flex items-center">
                <ClassSelector compact />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Day Order / Status Setup Card ── */}
      <DayCycleSetupCard
        date={selectedDate}
        classId={selectedClass.id}
        classNameTitle={selectedClass.name}
        entry={currentEntry}
        suggestedDay={suggestedDay}
        prevWorkingDate={prevWorkingDate}
        prevWorkingDay={prevWorkingDay}
        onAssignDay={(day, notes) => assignDay(day, notes)}
        onMarkHoliday={(reason, notes) => markHoliday(reason, notes)}
        loading={cycleLoading}
        isModalOpen={isDayOrderModalOpen}
        setIsModalOpen={setIsDayOrderModalOpen}
      />

      {/* ── Top Level View Switcher Tabs (All 3 Views Visible & Stable on Mobile & Desktop) ── */}
      <div className="bg-white p-1 sm:p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {/* Tab 1: Period Marking */}
          <button
            type="button"
            onClick={() => setActiveView('marking')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
              activeView === 'marking'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title="Mark period attendance (1–7) in quick grid or individual student cards"
          >
            <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden text-[11px]">Marking</span>
              <span className="hidden sm:inline">Period Marking</span>
            </span>
          </button>

          {/* Tab 2: WhatsApp & Day Report */}
          <button
            type="button"
            onClick={() => {
              setReportScope('period');
              setActiveView('report');
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
              activeView === 'report'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-emerald-800 bg-emerald-50/70 border border-emerald-300 hover:bg-emerald-100'
            )}
            title="Generate WhatsApp message formatted reports with absentees & OD lists"
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
            <span className="truncate">
              <span className="sm:hidden text-[11px]">WhatsApp</span>
              <span className="hidden sm:inline">WhatsApp Report</span>
            </span>
          </button>

          {/* Tab 3: Student Summary Table */}
          <button
            type="button"
            onClick={() => setActiveView('summary')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
              activeView === 'summary'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title="View student cumulative and daily percentage breakdown"
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden text-[11px]">Summary</span>
              <span className="hidden sm:inline">Summary Table</span>
            </span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1: PERIOD MARKING VIEW
         ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'marking' && (
        <div className="space-y-4 sm:space-y-5">
          {/* If Holiday: Show Holiday Notice */}
          {isAssigned && isHoliday && (
            <Card className="border-rose-200 bg-rose-50/50">
              <CardContent className="p-6 sm:p-8 text-center max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-2xs">
                  <Palmtree className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-rose-950">
                  Attendance marking is paused for {currentEntry.holiday_reason || 'Holiday'}.
                </h3>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Date: <strong>{formatDate(selectedDate)}</strong>. Regular timetable periods are not scheduled on holidays.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDayOrderModalOpen(true)}
                    className="gap-1.5 text-xs bg-white border-rose-300 text-rose-800 hover:bg-rose-100 font-bold shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Change to Working Day Order</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* If Unassigned: Prompt CR to assign day order */}
          {!isAssigned && (
            <Card className="border-dashed border-2 border-blue-300 bg-blue-50/30">
              <CardContent className="p-6 sm:p-8 text-center max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-2xs">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Assign Day Order to Mark Attendance
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click the recommendation above or choose a Day Order (1–6) for <strong>{formatDate(selectedDate)}</strong>.
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsDayOrderModalOpen(true)}
                    className="gap-1.5 text-xs font-bold shadow-xs bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Set Day Order for {formatDate(selectedDate)}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* If Assigned Working Day: Period Selector + Marking Grid */}
          {isAssigned && !isHoliday && activeDayNumber && (
            <div className="space-y-4 sm:space-y-5">
              {/* Multi-Period Selector Toolbar */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{activeDayOrderLabel} Periods</span>
                    </h2>
                    <Badge variant={selectedPeriods.length > 1 ? 'purple' : 'info'} size="sm" className="font-bold text-[11px]">
                      {selectedPeriods.length === 1
                        ? `Period ${selectedPeriods[0]} Selected`
                        : `${selectedPeriods.length} Periods Selected (P${selectedPeriods.join(', P')})`}
                    </Badge>
                  </div>

                  {/* Multi-Select Quick Action Shortcuts */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-0.5 hidden xs:inline">
                      Select:
                    </span>
                    <button
                      type="button"
                      onClick={selectAllPeriods}
                      className={cn(
                        'px-2 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer',
                        selectedPeriods.length === 7
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      All 7
                    </button>
                    <button
                      type="button"
                      onClick={selectMorningPeriods}
                      className="px-2 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      P1–P4
                    </button>
                    <button
                      type="button"
                      onClick={selectAfternoonPeriods}
                      className="px-2 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      P5–P7
                    </button>
                    <button
                      type="button"
                      onClick={selectLabPeriods}
                      className="px-2 py-1 rounded-lg text-xs font-bold transition-all bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
                      title="Select Lab session block (P2, P3, P4)"
                    >
                      Lab (P2–P4)
                    </button>
                    {selectedPeriods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => selectSinglePeriod(selectedPeriods[0])}
                        className="px-2 py-1 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        Single (P{selectedPeriods[0]})
                      </button>
                    )}
                  </div>
                </div>

                {/* 7 Period Cards: Responsive Swipe on Mobile & Grid on Desktop */}
                <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 snap-x scrollbar-none">
                  {PERIOD_TIMINGS.map((slot) => {
                    const dbSlot = timetableEntries.find(
                      (t) => t.day_number === activeDayNumber && t.period_number === slot.period
                    );
                    const subject = dbSlot?.subject || getSubjectForSlot(activeDayNumber, slot.period, selectedClass.id);
                    const isSelected = selectedPeriods.includes(slot.period);
                    const isLab = subject.includes('LAB');
                    const isRecorded = dailyOverview.completedPeriodNumbers.includes(slot.period);
                    const timeDisplay = dbSlot
                      ? formatTimeRange12h(dbSlot.start_time, dbSlot.end_time)
                      : slot.label;

                    return (
                      <button
                        key={slot.period}
                        type="button"
                        onClick={() => togglePeriod(slot.period)}
                        className={cn(
                          'flex-shrink-0 min-w-[125px] sm:min-w-0 flex flex-col p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all duration-150 active:scale-98 relative select-none cursor-pointer snap-start',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-500/40 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                        )}
                      >
                        {/* Selected Check Indicator */}
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              'w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold transition-colors',
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-300 bg-white text-transparent'
                            )}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className="font-bold text-slate-700">P{slot.period}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isLab && (
                              <span className="text-[9px] px-1 py-0.2 bg-purple-100 text-purple-700 font-bold rounded">
                                LAB
                              </span>
                            )}
                            {isRecorded && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Recorded" />
                            )}
                          </div>
                        </div>

                        <div className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5" title={subject}>
                          {subject}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                          {timeDisplay}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Multi-Selection Hint & Breaks Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-2">
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px] sm:text-xs">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Multi-Period Tip:</strong> Tap multiple periods (e.g. 2-hour labs) to mark attendance for all selected hours at once.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      <Coffee className="w-3 h-3 text-amber-600" /> Tea: 10:30–10:45 AM
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      <Utensils className="w-3 h-3 text-amber-600" /> Lunch: 12:45–1:15 PM
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Marking Grid Component with Multi-Period Support */}
              <AttendanceMarkingGrid
                classId={selectedClass.id}
                classNameTitle={selectedClass.name}
                date={selectedDate}
                selectedPeriods={selectedPeriods}
                dayOrderNumber={activeDayNumber}
                subject={compositeSubject}
                timeRange={compositeTiming}
                students={activeStudents}
                onSaveSuccess={reloadDashboard}
                onViewFullReport={() => {
                  setReportScope('period');
                  setActiveView('report');
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2: DEDICATED WHATSAPP & DAY SUMMARY REPORT TAB
         ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'report' && (
        <DailyAttendanceReportTab
          classId={selectedClass.id}
          classNameTitle={selectedClass.name}
          date={selectedDate}
          dayOrderNumber={activeDayNumber}
          students={activeStudents}
          dateRecords={dateRecords}
          todaySummaries={todaySummaries}
          dailyOverview={dailyOverview}
          selectedPeriod={selectedPeriods[0] || 1}
          initialScope={reportScope}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3: STUDENT SUMMARY TABLE
         ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'summary' && (
        <div className="space-y-4 sm:space-y-5">
          <DailyAttendanceOverviewCard
            classId={selectedClass.id}
            classNameTitle={selectedClass.name}
            date={selectedDate}
            dayOrderNumber={activeDayNumber}
            overview={dailyOverview}
            isHoliday={isHoliday}
            holidayReason={currentEntry?.holiday_reason}
            onSelectPeriod={(p) => togglePeriod(p)}
            selectedPeriods={selectedPeriods}
            onShareClick={() => {
              setReportScope('fullday');
              setActiveView('report');
            }}
          />

          <StudentAttendanceSummaryTable
            classId={selectedClass.id}
            classNameTitle={selectedClass.name}
            date={selectedDate}
            todaySummaries={todaySummaries}
            cumulativeSummaries={cumulativeSummaries}
          />
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
