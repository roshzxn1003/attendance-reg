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
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
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
  const [reportScope, setReportScope] = useState<'period' | 'fullday'>('period');

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
    : `${selectedSlots[0]?.timing.split(' – ')[0] || ''} – ${selectedSlots[selectedSlots.length - 1]?.timing.split(' – ')[1] || ''}`;

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Attendance Marking & Daily Reports"
        subtitle="Fast, CR-optimized period attendance marking, WhatsApp reports, and period registers for Room 245."
        badge="Daily Flow"
      />

      {/* ── Top Bar: Date Picker & Quick Actions ── */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
              {activeDayOrderLabel && !isHoliday && (
                <Badge variant="info" size="sm">{activeDayOrderLabel}</Badge>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAssigned && !isHoliday && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setReportScope('period');
                    setActiveView('report');
                  }}
                  className={cn(
                    'gap-1.5 font-bold text-xs py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                    activeView === 'report'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  )}
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>WhatsApp Report</span>
                </Button>
              )}
              <NavLink
                to="/backlog-entry"
                className="gap-1.5 font-bold text-xs py-1.5 px-3 rounded-xl transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Backlog Wizard</span>
              </NavLink>
            </div>

            {/* Class Selector — bottom on mobile, inline on sm+ */}
            <div className="w-full sm:w-auto order-last sm:order-none flex sm:justify-end">
              <Badge variant="purple" size="md" className="w-full sm:w-auto justify-center text-center">
                {selectedClass.id} ({selectedClass.name})
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Top Level View Switcher Tabs (Placed prominently at the top!) ── */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
          {/* Tab 1: Period Marking */}
          <button
            type="button"
            onClick={() => setActiveView('marking')}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer',
              activeView === 'marking'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Period Marking</span>
          </button>

          {/* Tab 2: WhatsApp & Day Report (Dedicated Tab!) */}
          <button
            type="button"
            onClick={() => {
              setReportScope('period');
              setActiveView('report');
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer',
              activeView === 'report'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-emerald-800 bg-emerald-50/70 border border-emerald-300 hover:bg-emerald-100'
            )}
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>WhatsApp & Day Report</span>
          </button>

          {/* Tab 3: Student Summary Table */}
          <button
            type="button"
            onClick={() => setActiveView('summary')}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer',
              activeView === 'summary'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Student Summary Table</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden md:inline px-2">
          {activeStudents.length} Active Students
        </span>
      </div>

      {/* ── CASE 1: Holiday Banner ── */}
      {isAssigned && isHoliday && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="p-8 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner">
              <Palmtree className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-950">
              Holiday — Attendance cannot be marked.
            </h3>
            <p className="text-xs text-rose-800 leading-relaxed">
              Reason: <strong>{currentEntry.holiday_reason || 'Holiday'}</strong> on {formatDate(selectedDate)}.
              Attendance periods are not scheduled on holidays.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── CASE 2: Unassigned Notice (if Day Order not set yet) ── */}
      {!isAssigned && (
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
        />
      )}

      {/* ── CASE 3: Assigned Working Day Content ── */}
      {isAssigned && !isHoliday && activeDayNumber && (
        <div className="space-y-6">
          {/* ════════════════════════════════════════════════════════════════════
              TAB 1: PERIOD MARKING VIEW
             ════════════════════════════════════════════════════════════════════ */}
          {activeView === 'marking' && (
            <div className="space-y-5">
              {/* Day Cycle Setup Card (Collapsible or configurable) */}
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
              />

              {/* Multi-Period Selector Toolbar */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{activeDayOrderLabel} Periods</span>
                    </h2>
                    <Badge variant={selectedPeriods.length > 1 ? 'purple' : 'info'} size="sm" className="font-bold">
                      {selectedPeriods.length === 1
                        ? `Period ${selectedPeriods[0]} Selected`
                        : `${selectedPeriods.length} Periods Selected (P${selectedPeriods.join(', P')})`}
                    </Badge>
                  </div>

                  {/* Multi-Select Quick Action Shortcuts */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mr-0.5">
                      Select:
                    </span>
                    <button
                      type="button"
                      onClick={selectAllPeriods}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer',
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
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      P1–P4
                    </button>
                    <button
                      type="button"
                      onClick={selectAfternoonPeriods}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      P5–P7
                    </button>
                    {selectedPeriods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => selectSinglePeriod(selectedPeriods[0])}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        Single (P{selectedPeriods[0]})
                      </button>
                    )}
                  </div>
                </div>

                {/* 7 Period Cards with Checkbox Toggle Support */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
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
                          'flex flex-col p-3 rounded-2xl border text-left transition-all duration-150 active:scale-98 relative select-none cursor-pointer',
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
                              <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-700 font-semibold rounded">
                                LAB
                              </span>
                            )}
                            {isRecorded && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Recorded" />
                            )}
                          </div>
                        </div>

                        <div className="text-sm font-black text-slate-900 truncate mt-0.5">
                          {subject}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">
                          {timeDisplay}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Multi-Selection Hint & Breaks Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Multi-Period Tip:</strong> Tap multiple periods (e.g. 2-hour labs) to mark attendance for all selected hours at once.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-semibold">
                      <Coffee className="w-3 h-3 text-amber-600" /> Tea: 10:30–10:45 AM
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-semibold">
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

          {/* ════════════════════════════════════════════════════════════════════
              TAB 2: DEDICATED WHATSAPP & DAY SUMMARY REPORT TAB (NO SCROLLING NEEDED!)
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
            <div className="space-y-5">
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
      )}
    </div>
  );
};

export default AttendancePage;
