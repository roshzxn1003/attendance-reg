import React, { useState } from 'react';
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
  Info,
  Coffee,
  Utensils,
  BarChart3,
  CheckSquare,
  Layers,
  Check,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { DayCycleSetupCard } from '../components/daycycle/DayCycleSetupCard';
import { AttendanceMarkingGrid } from '../components/attendance/AttendanceMarkingGrid';
import { DailyAttendanceOverviewCard } from '../components/attendance/DailyAttendanceOverviewCard';
import { StudentAttendanceSummaryTable } from '../components/attendance/StudentAttendanceSummaryTable';
import { useDayCycle } from '../hooks/useDayCycle';
import { useTimetable } from '../hooks/useTimetable';
import { useStudents } from '../hooks/useStudents';
import { useAttendanceDashboard } from '../hooks/useAttendanceDashboard';
import { cn } from '../lib/utils';

type ActiveViewMode = 'marking' | 'summary';

export const AttendancePage: React.FC = () => {
  const { selectedClass } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodNumber[]>([1]);
  const [activeView, setActiveView] = useState<ActiveViewMode>('marking');

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

  // Students Hook for active class
  const { students } = useStudents(selectedClass.id);

  // Step 7 Attendance Dashboard & Calculations Hook
  const {
    dailyOverview,
    todaySummaries,
    cumulativeSummaries,
    reload: reloadDashboard,
  } = useAttendanceDashboard(selectedClass.id, selectedDate, students);

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
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Attendance Marking & Dashboard"
        subtitle="Fast, CR-optimized period attendance marking with multi-period selection support for combined lab sessions."
        badge="Daily Flow"
      />

      {/* Date Picker Bar */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-300 shadow-2xs">
                <Calendar className="w-4 h-4 text-blue-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer font-mono"
                />
              </div>

              <div className="text-xs text-slate-600 font-semibold">
                {formatDate(selectedDate)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Active Roster:</span>
              <Badge variant="purple" size="md">
                {selectedClass.id} ({selectedClass.name})
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── STEP 5: Day 1–Day 6 Calendar Cycle Setup Card ── */}
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

      {/* ── Working Day Content ── */}
      {isAssigned && !isHoliday && activeDayNumber && (
        <div className="space-y-6">
          {/* ── STEP 7: Daily Attendance Overview Dashboard Card ── */}
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
          />

          {/* Navigation View Switcher (Marking vs Summary Table) */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('marking')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                  activeView === 'marking'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Period Marking</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('summary')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                  activeView === 'summary'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Student Summary Table</span>
              </button>
            </div>

            <span className="text-xs text-slate-400 hidden sm:inline font-mono">
              {students.filter((s) => s.active).length} Active Students
            </span>
          </div>

          {/* ── View 1: Period Marking Flow ── */}
          {activeView === 'marking' && (
            <div className="space-y-6">
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
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all border',
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
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                    >
                      P1–P4
                    </button>
                    <button
                      type="button"
                      onClick={selectAfternoonPeriods}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                    >
                      P5–P7
                    </button>
                    {selectedPeriods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => selectSinglePeriod(selectedPeriods[0])}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200"
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

              {/* ── Attendance Marking Grid Component with Multi-Period Support ── */}
              <AttendanceMarkingGrid
                classId={selectedClass.id}
                classNameTitle={selectedClass.name}
                date={selectedDate}
                selectedPeriods={selectedPeriods}
                dayOrderNumber={activeDayNumber}
                subject={compositeSubject}
                timeRange={compositeTiming}
                students={students}
                onSaveSuccess={reloadDashboard}
              />
            </div>
          )}

          {/* ── View 2: Student Summary Table ── */}
          {activeView === 'summary' && (
            <StudentAttendanceSummaryTable
              classId={selectedClass.id}
              classNameTitle={selectedClass.name}
              date={selectedDate}
              todaySummaries={todaySummaries}
              cumulativeSummaries={cumulativeSummaries}
            />
          )}
        </div>
      )}

      {/* ── CASE 2: Holiday Banner ── */}
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

      {/* ── CASE 3: Unassigned Notice ── */}
      {!isAssigned && (
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
          <CardContent className="p-8 text-center max-w-md mx-auto space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Please assign a Day Order to mark attendance
            </h3>
            <p className="text-xs text-slate-500">
              Use the card above to accept the suggested Day Order or choose a day number (1–6) for {formatDate(selectedDate)}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
