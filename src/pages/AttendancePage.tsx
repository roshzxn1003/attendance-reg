import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/common/Card';
import { useApp } from '../context/AppContext';
import { getTodayDateString, formatDate, formatTimeRange12h } from '../lib/utils';
import { PERIOD_TIMINGS, getSubjectForSlot, DAY_ORDERS } from '../data/timetable';
import { DayNumber, PeriodNumber } from '../types';
import { Calendar, Clock, Palmtree, Info, Coffee, Utensils, BarChart3, CheckSquare } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { DayCycleSetupCard } from '../components/daycycle/DayCycleSetupCard';
import { AttendanceMarkingGrid } from '../components/attendance/AttendanceMarkingGrid';
import { DailyAttendanceOverviewCard } from '../components/attendance/DailyAttendanceOverviewCard';
import { StudentAttendanceSummaryTable } from '../components/attendance/StudentAttendanceSummaryTable';
import { useDayCycle } from '../hooks/useDayCycle';
import { useTimetable } from '../hooks/useTimetable';
import { useStudents } from '../hooks/useStudents';
import { useAttendanceDashboard } from '../hooks/useAttendanceDashboard';

type ActiveViewMode = 'marking' | 'summary';

export const AttendancePage: React.FC = () => {
  const { selectedClass } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodNumber>(1);
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

  // Resolve current selected period info
  const currentSlotRecord = activeDayNumber
    ? timetableEntries.find((t) => t.day_number === activeDayNumber && t.period_number === selectedPeriod)
    : undefined;

  const activeSubject = currentSlotRecord?.subject || (activeDayNumber ? getSubjectForSlot(activeDayNumber, selectedPeriod, selectedClass.id) : '');
  const activeTiming = currentSlotRecord
    ? formatTimeRange12h(currentSlotRecord.start_time, currentSlotRecord.end_time)
    : PERIOD_TIMINGS.find((p) => p.period === selectedPeriod)?.label || '';

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Attendance Marking & Dashboard"
        subtitle="Fast, CR-optimized period attendance marking powered by the rotating Day Order 1–Day Order 6 calendar cycle."
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
            onSelectPeriod={(p) => setSelectedPeriod(p)}
            activePeriod={selectedPeriod}
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
              {/* Period Selector Cards */}
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    {activeDayOrderLabel} Periods — {selectedClass.id}
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    Tap period to open student marking list
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {PERIOD_TIMINGS.map((slot) => {
                    const dbSlot = timetableEntries.find(
                      (t) => t.day_number === activeDayNumber && t.period_number === slot.period
                    );
                    const subject = dbSlot?.subject || getSubjectForSlot(activeDayNumber, slot.period, selectedClass.id);
                    const isSelected = selectedPeriod === slot.period;
                    const isLab = subject.includes('LAB');
                    const isRecorded = dailyOverview.completedPeriodNumbers.includes(slot.period);
                    const timeDisplay = dbSlot
                      ? formatTimeRange12h(dbSlot.start_time, dbSlot.end_time)
                      : slot.label;

                    return (
                      <button
                        key={slot.period}
                        type="button"
                        onClick={() => setSelectedPeriod(slot.period)}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all duration-150 active:scale-98 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/40 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-500">Period {slot.period}</span>
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
                        <div className="text-sm font-black text-slate-900 truncate">
                          {subject}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">
                          {timeDisplay}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Break Information Note */}
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-3">
                  <span className="font-bold text-slate-600">Official Breaks (Non-attendance):</span>
                  <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Coffee className="w-3.5 h-3.5 text-amber-600" /> Tea Break (10:30 AM – 10:45 AM)
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Utensils className="w-3.5 h-3.5 text-amber-600" /> Lunch Break (12:45 PM – 1:15 PM)
                  </span>
                </div>
              </div>

              {/* ── Attendance Marking Grid Component ── */}
              <AttendanceMarkingGrid
                classId={selectedClass.id}
                classNameTitle={selectedClass.name}
                date={selectedDate}
                periodNumber={selectedPeriod}
                dayOrderNumber={activeDayNumber}
                subject={activeSubject}
                timeRange={activeTiming}
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
