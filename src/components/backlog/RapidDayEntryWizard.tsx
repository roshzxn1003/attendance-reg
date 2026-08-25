import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  Check,
  X,
  RotateCcw,
  Zap,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { ClassId, DayNumber, PeriodNumber } from '../../types';
import { Student } from '../../services/studentService';
import {
  AbsenteeEntry,
  resolveStudentInput,
  getStudentShortNumber,
  isDateSunday,
  computeSuggestedDayOrder,
  getBacklogProgress,
  saveDayBacklogAttendance,
  MonthBacklogProgress,
  parseInputTokenWithPeriods,
  reconstructDayAbsentees,
  addDaysToDateString,
} from '../../services/backlogAttendanceService';
import { getAllDayCycleLogs, DayCycleEntry } from '../../services/dayCycleService';
import { getSubjectForSlot } from '../../data/timetable';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardContent } from '../common/Card';
import { useToast } from '../../context/ToastContext';
import { cn, formatDate } from '../../lib/utils';

interface RapidDayEntryWizardProps {
  classId: ClassId;
  classNameTitle: string;
  startDate: string;
  endDate: string;
  students: Student[];
}

const ALL_7_PERIODS: PeriodNumber[] = [1, 2, 3, 4, 5, 6, 7];

export const RapidDayEntryWizard: React.FC<RapidDayEntryWizardProps> = ({
  classId,
  classNameTitle,
  startDate,
  endDate,
  students,
}) => {
  const [currentDate, setCurrentDate] = useState<string>(startDate);
  const [dayOrderNumber, setDayOrderNumber] = useState<DayNumber>(1);
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [holidayReason, setHolidayReason] = useState<string>('Sunday / Holiday');

  // Absentees list for the current day
  const [absentees, setAbsentees] = useState<AbsenteeEntry[]>([]);
  const [inputVal, setInputVal] = useState<string>('');

  // Global Scope & Custom Periods selection
  const [globalScope, setGlobalScope] = useState<'fullday' | 'morning' | 'afternoon' | 'custom'>('fullday');
  const [globalCustomPeriods, setGlobalCustomPeriods] = useState<PeriodNumber[]>([1, 2, 3, 4, 5, 6, 7]);

  // Loading & Progress states
  const [saving, setSaving] = useState<boolean>(false);
  const [progress, setProgress] = useState<MonthBacklogProgress | null>(null);
  const [dayLogs, setDayLogs] = useState<DayCycleEntry[]>([]);

  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const activeStudents = useMemo(
    () => students.filter((s) => s.active !== false),
    [students]
  );

  // Load progress and day logs
  const loadProgressAndLogs = useCallback(async () => {
    try {
      const logs = await getAllDayCycleLogs(classId);
      setDayLogs(logs);
      const prog = await getBacklogProgress(classId, startDate, endDate, activeStudents);
      setProgress(prog);
    } catch (err) {
      console.error('Failed to load backlog progress:', err);
    }
  }, [classId, startDate, endDate, activeStudents]);

  useEffect(() => {
    loadProgressAndLogs();
  }, [loadProgressAndLogs]);

  // Keep currentDate in sync if startDate / endDate change from parent
  useEffect(() => {
    setCurrentDate((prev) => {
      if (prev < startDate || prev > endDate) {
        return startDate;
      }
      return prev;
    });
  }, [startDate, endDate]);

  // When date changes, load existing records or auto-suggest day order & holidays
  useEffect(() => {
    const initDate = async () => {
      // Check if it's Sunday
      const isSunday = isDateSunday(currentDate);
      if (isSunday) {
        setIsHoliday(true);
        setHolidayReason('Sunday');
      } else {
        setIsHoliday(false);
        setHolidayReason('College Holiday');
      }

      // Check existing day log
      const existingLog = dayLogs.find((l) => l.date === currentDate);
      if (existingLog) {
        if (existingLog.is_holiday) {
          setIsHoliday(true);
          setHolidayReason(existingLog.holiday_reason || 'Holiday');
        } else if (existingLog.day_number) {
          setDayOrderNumber(existingLog.day_number as DayNumber);
        }
      } else {
        // Auto compute suggested day order based on prior days
        const suggested = computeSuggestedDayOrder(currentDate, dayLogs, 1);
        setDayOrderNumber(suggested);
      }

      // Reconstruct accurate attendance records across all 7 periods
      try {
        const existingAbsentees = await reconstructDayAbsentees(classId, currentDate, activeStudents);
        setAbsentees(existingAbsentees);
      } catch (err) {
        console.error('Failed to reconstruct absentees for date:', currentDate, err);
        setAbsentees([]);
      }
    };

    initDate();
  }, [currentDate, dayLogs, classId, activeStudents]);

  // Focus input on date switch
  useEffect(() => {
    if (!isHoliday) {
      inputRef.current?.focus();
    }
  }, [currentDate, isHoliday]);

  // Toggle a single period in the global custom period picker
  const handleToggleGlobalCustomPeriod = (period: PeriodNumber) => {
    setGlobalCustomPeriods((prev) => {
      if (prev.includes(period)) {
        const next = prev.filter((p) => p !== period);
        return next.length > 0 ? next : [period]; // Keep at least one period
      } else {
        return [...prev, period].sort((a, b) => a - b);
      }
    });
  };

  // Handle adding an absentee via roll number input (supports custom period syntax e.g. 4(2,4) or 18)
  const handleAddAbsentee = (token: string, status: 'A' | 'OD' = 'A') => {
    const clean = token.trim();
    if (!clean) return;

    // Handle comma or space-separated multiple tokens (e.g. "4, 18, 25" or "4(2,4) 18(p5-p7)")
    const parts = clean.split(/[\s,]+/);
    if (parts.length > 1) {
      parts.forEach((p) => handleAddAbsentee(p, status));
      setInputVal('');
      return;
    }

    const { identifier, customPeriods: tokenCustomPeriods } = parseInputTokenWithPeriods(clean);
    const matched = resolveStudentInput(identifier, activeStudents);
    if (!matched) {
      toast.warning(`No student found matching "${identifier}"`, 'Unrecognized Number');
      return;
    }

    // Determine custom periods for this student
    let effectiveScope: 'fullday' | 'morning' | 'afternoon' | 'custom' = globalScope;
    let effectivePeriods: PeriodNumber[] = [1, 2, 3, 4, 5, 6, 7];

    if (tokenCustomPeriods && tokenCustomPeriods.length > 0) {
      effectiveScope = 'custom';
      effectivePeriods = tokenCustomPeriods;
    } else if (globalScope === 'morning') {
      effectivePeriods = [1, 2, 3, 4];
    } else if (globalScope === 'afternoon') {
      effectivePeriods = [5, 6, 7];
    } else if (globalScope === 'custom') {
      effectivePeriods = globalCustomPeriods.length > 0 ? globalCustomPeriods : [1, 2, 3, 4, 5, 6, 7];
    }

    // Check if already in absentees list
    const existingIdx = absentees.findIndex((a) => a.student.student_id === matched.student_id);
    if (existingIdx !== -1) {
      // Update existing entry
      setAbsentees((prev) =>
        prev.map((a, i) =>
          i === existingIdx
            ? {
                ...a,
                status,
                periodScope: effectiveScope,
                customPeriods: effectivePeriods,
              }
            : a
        )
      );
      setInputVal('');
      return;
    }

    const newEntry: AbsenteeEntry = {
      student: matched,
      shortNo: getStudentShortNumber(matched, activeStudents),
      periodScope: effectiveScope,
      customPeriods: effectivePeriods,
      status,
    };

    setAbsentees((prev) => [...prev, newEntry]);
    setInputVal('');
  };

  // Remove absentee
  const handleRemoveAbsentee = (studentId: string) => {
    setAbsentees((prev) => prev.filter((a) => a.student.student_id !== studentId));
  };

  // Toggle a single period on a specific student's card
  const handleToggleStudentPeriod = (studentId: string, period: PeriodNumber) => {
    setAbsentees((prev) =>
      prev.map((a) => {
        if (a.student.student_id !== studentId) return a;

        let newPeriods: PeriodNumber[];
        if (a.customPeriods.includes(period)) {
          newPeriods = a.customPeriods.filter((p) => p !== period);
        } else {
          newPeriods = [...a.customPeriods, period].sort((x, y) => x - y);
        }

        // If no periods left, remove student from absentees
        if (newPeriods.length === 0) {
          return a;
        }

        return {
          ...a,
          periodScope: 'custom' as const,
          customPeriods: newPeriods,
        };
      }).filter((a): a is AbsenteeEntry => a.customPeriods.length > 0)
    );
  };

  // Apply a quick preset to a specific student card
  const handleSetStudentScope = (
    studentId: string,
    scope: 'fullday' | 'morning' | 'afternoon'
  ) => {
    const periods: PeriodNumber[] =
      scope === 'morning' ? [1, 2, 3, 4] : scope === 'afternoon' ? [5, 6, 7] : [1, 2, 3, 4, 5, 6, 7];

    setAbsentees((prev) =>
      prev.map((a) =>
        a.student.student_id === studentId
          ? {
              ...a,
              periodScope: scope,
              customPeriods: periods,
            }
          : a
      )
    );
  };

  // Toggle student status from the interactive number keypad
  const handleToggleStudentKeypad = (student: Student) => {
    const existing = absentees.find((a) => a.student.student_id === student.student_id);
    if (!existing) {
      // Present -> Absent (Apply active global scope & custom periods)
      handleAddAbsentee(student.student_id, 'A');
    } else if (existing.status === 'A') {
      // Absent -> OD
      setAbsentees((prev) =>
        prev.map((a) =>
          a.student.student_id === student.student_id ? { ...a, status: 'OD' } : a
        )
      );
    } else {
      // OD -> Present (Remove)
      handleRemoveAbsentee(student.student_id);
    }
  };

  // Navigate to Next Date (timezone-safe)
  const handleNextDate = () => {
    const nextStr = addDaysToDateString(currentDate, 1);
    if (nextStr <= endDate) {
      setCurrentDate(nextStr);
    } else {
      toast.success('You have reached the end of the selected period range!', 'Completed');
    }
  };

  // Navigate to Previous Date (timezone-safe)
  const handlePrevDate = () => {
    const prevStr = addDaysToDateString(currentDate, -1);
    if (prevStr >= startDate) {
      setCurrentDate(prevStr);
    }
  };

  // Save Current Day & Advance to Next Date
  const handleSaveAndNext = async () => {
    setSaving(true);
    try {
      const res = await saveDayBacklogAttendance(
        classId,
        currentDate,
        dayOrderNumber,
        isHoliday,
        holidayReason,
        activeStudents,
        absentees
      );

      if (res.success) {
        toast.success(
          isHoliday
            ? `Marked ${formatDate(currentDate)} as Holiday`
            : `Saved ${formatDate(currentDate)} (DO ${dayOrderNumber}) with ${absentees.length} absentees`,
          'Day Saved'
        );

        await loadProgressAndLogs();
        handleNextDate();
      }
    } catch (err) {
      toast.error(String(err), 'Failed to Save');
    } finally {
      setSaving(false);
    }
  };

  // Quick 100% Present (No absentees)
  const handleQuickMark100Present = async () => {
    setAbsentees([]);
    setIsHoliday(false);
    setSaving(true);
    try {
      await saveDayBacklogAttendance(
        classId,
        currentDate,
        dayOrderNumber,
        false,
        undefined,
        activeStudents,
        []
      );
      toast.success(`Marked ${formatDate(currentDate)} as 100% Present!`, 'All Present Saved');
      await loadProgressAndLogs();
      handleNextDate();
    } catch (err) {
      toast.error(String(err), 'Failed to Save');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut listener (Ctrl+Enter or Enter in input)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputVal.trim()) {
        handleAddAbsentee(inputVal, 'A');
      } else {
        handleSaveAndNext();
      }
    } else if (e.key === ',' || e.key === ' ') {
      if (inputVal.trim()) {
        e.preventDefault();
        handleAddAbsentee(inputVal, 'A');
      }
    }
  };

  const isMarked = progress?.dateStatuses.find((d) => d.date === currentDate)?.isMarked;

  return (
    <div className="space-y-5">
      {/* ── TOP HEADER PROGRESS & DATE CONTROLLER ── */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-3xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          
          {/* Progress Bar */}
          {progress && (
            <div className="space-y-1.5 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-current" />
                  <span>
                    Backlog Progress: <strong>{progress.markedDays}</strong> / {progress.totalWorkingDays} Working Days Recorded
                  </span>
                </span>
                <span className="font-mono text-blue-600 font-black">
                  {progress.percentComplete}% Complete ({progress.remainingWorkingDays} days remaining)
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percentComplete}%` }}
                />
              </div>

              {/* Compact Date Map Ribbon */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 pt-2 no-scrollbar">
                {progress.dateStatuses.map((ds) => {
                  const isCurrent = ds.date === currentDate;
                  const [, m, d] = ds.date.split('-');

                  return (
                    <button
                      key={ds.date}
                      type="button"
                      onClick={() => setCurrentDate(ds.date)}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all shrink-0 border cursor-pointer flex items-center gap-1',
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30'
                          : ds.isHoliday
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : ds.isMarked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      )}
                      title={`${ds.date}: ${ds.isHoliday ? 'Holiday' : ds.isMarked ? 'Marked' : 'Pending'}`}
                    >
                      <span>{d}/{m}</span>
                      {ds.isMarked && !ds.isHoliday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      {ds.isHoliday && <Palmtree className="w-2.5 h-2.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Date Navigation & Day Order Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Date Selector with Previous/Next Arrows */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevDate}
                disabled={currentDate <= startDate}
                className="h-10 w-10 p-0 rounded-2xl border-slate-300 text-slate-700 cursor-pointer shrink-0"
                title="Previous Day"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-2xl shadow-2xs">
                <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {formatDate(currentDate)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {currentDate} • {classNameTitle} ({classId})
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDate}
                disabled={currentDate >= endDate}
                className="h-10 w-10 p-0 rounded-2xl border-slate-300 text-slate-700 cursor-pointer shrink-0"
                title="Next Day"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              {isMarked && (
                <Badge variant="success" size="md" className="font-bold gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Already Recorded</span>
                </Badge>
              )}
            </div>

            {/* Right: Day Order 1–6 Buttons & Holiday Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Holiday Toggle Button */}
              <button
                type="button"
                onClick={() => setIsHoliday(!isHoliday)}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer',
                  isHoliday
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                <Palmtree className="w-4 h-4" />
                <span>{isHoliday ? 'Holiday Marked' : 'Mark Holiday'}</span>
              </button>

              {/* Day Order 1 to 6 Pills */}
              {!isHoliday && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase px-2 hidden sm:inline">
                    Day:
                  </span>
                  {([1, 2, 3, 4, 5, 6] as DayNumber[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOrderNumber(d)}
                      className={cn(
                        'w-8 h-8 rounded-xl font-black text-xs transition-all flex items-center justify-center cursor-pointer',
                        dayOrderNumber === d
                          ? 'bg-indigo-600 text-white shadow-xs scale-105'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CASE 1: HOLIDAY MODE ── */}
      {isHoliday ? (
        <Card className="border-rose-200 bg-rose-50/60 rounded-3xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner">
            <Palmtree className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-rose-950">
              {formatDate(currentDate)} is marked as a Holiday
            </h3>
            <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
              Day Order cycle rotation is paused. Attendance will not be scheduled on this day.
            </p>
          </div>

          <div className="max-w-xs mx-auto">
            <label className="block text-xs font-bold text-rose-900 mb-1 text-left">
              Holiday Reason:
            </label>
            <input
              type="text"
              value={holidayReason}
              onChange={(e) => setHolidayReason(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-rose-300 rounded-xl text-rose-900 focus:outline-none"
              placeholder="e.g. Sunday / College Holiday"
            />
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsHoliday(false)}
              className="border-rose-300 text-rose-800 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            >
              Cancel (Mark as Working Day)
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleSaveAndNext}
              isLoading={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black py-2.5 px-6 rounded-xl shadow-md cursor-pointer gap-2"
            >
              <span>Save Holiday & Next Day ➔</span>
            </Button>
          </div>
        </Card>
      ) : (
        /* ── CASE 2: WORKING DAY RAPID ENTRY ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT: ABSENTEE FAST INPUT & BADGES (7 COLS) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Rapid Tag Input Card */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-3xl overflow-hidden">
              <CardContent className="p-5 space-y-4">
                
                {/* Scope Header */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">
                        🔴
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900">
                          Rapid Absentee Entry with Custom Periods
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Default = 100% Present. Choose period scope and enter absentee roll numbers.
                        </p>
                      </div>
                    </div>

                    {/* Scope Selector Pills */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => setGlobalScope('fullday')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]',
                          globalScope === 'fullday'
                            ? 'bg-white text-blue-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        All 7 Periods
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlobalScope('morning')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]',
                          globalScope === 'morning'
                            ? 'bg-white text-blue-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        P1–P4 (Morn)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlobalScope('afternoon')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]',
                          globalScope === 'afternoon'
                            ? 'bg-white text-blue-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        P5–P7 (Aft)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlobalScope('custom')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center gap-1',
                          globalScope === 'custom'
                            ? 'bg-indigo-600 text-white shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Custom</span>
                      </button>
                    </div>
                  </div>

                  {/* If Custom Scope active: Show 7 Period Toggle Strip */}
                  {globalScope === 'custom' && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                        <span>Select active periods to apply for newly typed roll numbers:</span>
                        <span className="font-mono text-indigo-700">
                          {globalCustomPeriods.length} selected ({globalCustomPeriods.map((p) => `P${p}`).join(', ')})
                        </span>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5">
                        {ALL_7_PERIODS.map((p) => {
                          const isSelected = globalCustomPeriods.includes(p);
                          const subjectName = getSubjectForSlot(dayOrderNumber, p, classId);

                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleToggleGlobalCustomPeriod(p)}
                              className={cn(
                                'py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 select-none',
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs font-black'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 font-semibold'
                              )}
                            >
                              <span className="text-xs font-bold leading-none">P{p}</span>
                              <span className="text-[9px] truncate max-w-[40px] opacity-85 leading-none">
                                {subjectName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fast Typing Input Box */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type short roll numbers (e.g. 4, 18, 25 or 4(2,4) for custom periods)..."
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-4 pr-24 py-3 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none transition-all shadow-inner"
                    />

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddAbsentee(inputVal, 'A')}
                        disabled={!inputVal.trim()}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1 px-3 rounded-xl cursor-pointer"
                      >
                        Add (A)
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>💡 Syntax: <code>4 18 25</code> or specific periods like <code>4(2,4)</code> or <code>18(1-3)</code></span>
                    <span>Press <strong>Enter</strong> to commit</span>
                  </div>
                </div>

                {/* Active Absentees List with Custom Period Strips */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      <span>Marked Absentees ({absentees.length} Students):</span>
                    </span>

                    {absentees.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAbsentees([])}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  {absentees.length === 0 ? (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-1">
                      <p className="text-xs font-black text-emerald-800">
                        ✓ 100% Attendance for {formatDate(currentDate)}
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        All {activeStudents.length} students are currently marked Present (P) across all 7 periods.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {absentees.map((entry) => (
                        <div
                          key={entry.student.student_id}
                          className={cn(
                            'p-3.5 rounded-2xl border space-y-2.5 transition-all text-xs',
                            entry.status === 'OD'
                              ? 'bg-amber-50/60 border-amber-200'
                              : 'bg-rose-50/60 border-rose-200'
                          )}
                        >
                          {/* Student Info & Top Action Bar */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  'w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs',
                                  entry.status === 'OD'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-rose-600 text-white'
                                )}
                              >
                                #{entry.shortNo}
                              </span>
                              <div className="truncate">
                                <div className="font-black text-slate-900 truncate">
                                  {entry.student.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  {entry.student.student_id}
                                </div>
                              </div>
                            </div>

                            {/* Status and Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Toggle Status (OD / A) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAbsentees((prev) =>
                                    prev.map((a) =>
                                      a.student.student_id === entry.student.student_id
                                        ? { ...a, status: a.status === 'A' ? 'OD' : 'A' }
                                        : a
                                    )
                                  );
                                }}
                                className={cn(
                                  'px-2.5 py-1 rounded-xl text-[10px] font-black border transition-colors cursor-pointer',
                                  entry.status === 'OD'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-rose-100 text-rose-900 border-rose-300'
                                )}
                              >
                                {entry.status === 'OD' ? 'On Duty (OD)' : 'Absent (A)'}
                              </button>

                              {/* Remove Student */}
                              <button
                                type="button"
                                onClick={() => handleRemoveAbsentee(entry.student.student_id)}
                                className="w-7 h-7 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-100 flex items-center justify-center cursor-pointer border border-transparent hover:border-rose-200"
                                title="Remove"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Interactive 7-Period Pill Strip for this specific student */}
                          <div className="p-2 bg-white/80 rounded-xl border border-slate-200/80 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span>Custom Period Scope (Tap P1–P7 to toggle):</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSetStudentScope(entry.student.student_id, 'fullday')}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold cursor-pointer"
                                >
                                  All 7
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetStudentScope(entry.student.student_id, 'morning')}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold cursor-pointer"
                                >
                                  P1–P4
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetStudentScope(entry.student.student_id, 'afternoon')}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold cursor-pointer"
                                >
                                  P5–P7
                                </button>
                              </div>
                            </div>

                            {/* 7 Period Pills */}
                            <div className="grid grid-cols-7 gap-1">
                              {ALL_7_PERIODS.map((p) => {
                                const isPeriodActive = entry.customPeriods.includes(p);
                                const subjectName = getSubjectForSlot(dayOrderNumber, p, classId);

                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => handleToggleStudentPeriod(entry.student.student_id, p)}
                                    className={cn(
                                      'py-1 px-1 rounded-lg text-center transition-all cursor-pointer border flex flex-col items-center justify-center select-none',
                                      isPeriodActive
                                        ? entry.status === 'OD'
                                          ? 'bg-amber-500 text-white border-amber-600 font-black shadow-2xs'
                                          : 'bg-rose-600 text-white border-rose-700 font-black shadow-2xs'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 font-semibold'
                                    )}
                                    title={`Period ${p}: ${subjectName} (${isPeriodActive ? (entry.status === 'OD' ? 'OD' : 'Absent') : 'Present'})`}
                                  >
                                    <span className="text-[11px] font-bold leading-none">P{p}</span>
                                    <span className="text-[8px] truncate max-w-[34px] opacity-90 leading-none">
                                      {subjectName}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bottom Action Bar (Save & Next Day) */}
            <div className="p-4 bg-white border-2 border-slate-300 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleQuickMark100Present}
                  disabled={saving}
                  className="gap-1.5 text-xs font-bold border-emerald-300 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100 py-2.5 rounded-2xl w-full sm:w-auto cursor-pointer"
                  title="Mark all students present and move to next day"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>100% Present (No Absentees)</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSaveAndNext}
                  isLoading={saving}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm py-3 px-6 rounded-2xl shadow-md shadow-blue-500/20 w-full sm:w-auto cursor-pointer"
                >
                  <span>Save & Next Day ➔</span>
                  <span className="text-[10px] opacity-75 font-mono hidden sm:inline">[Enter]</span>
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE NUMBER KEYPAD (01 TO 60) (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-200 bg-white shadow-xs rounded-3xl overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                      Quick-Tap Student Keypad ({activeStudents.length})
                    </h4>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Tap to toggle: P ➔ A ➔ OD
                  </span>
                </div>

                {/* 60 Student Number Buttons Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 max-h-[460px] overflow-y-auto p-1">
                  {activeStudents.map((student, idx) => {
                    const shortNo = idx + 1;
                    const match = absentees.find((a) => a.student.student_id === student.student_id);
                    const isA = match?.status === 'A';
                    const isOD = match?.status === 'OD';

                    return (
                      <button
                        key={student.student_id}
                        type="button"
                        onClick={() => handleToggleStudentKeypad(student)}
                        className={cn(
                          'p-2 rounded-xl text-center transition-all duration-100 flex flex-col items-center justify-center gap-0.5 select-none cursor-pointer border',
                          isA
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-400/40 font-black'
                            : isOD
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-400/40 font-black'
                            : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100 font-bold'
                        )}
                        title={`#${shortNo} - ${student.name} (${student.student_id})${match ? ` [${match.customPeriods.map(p => `P${p}`).join(',')}]` : ''}`}
                      >
                        <span className="text-xs font-mono font-black leading-none">
                          {String(shortNo).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] truncate max-w-[44px] opacity-90 leading-none">
                          {student.name.split(' ')[0]}
                        </span>
                        {match && match.customPeriods.length < 7 && (
                          <span className="text-[7px] font-bold text-rose-200 bg-rose-800/80 px-1 rounded-xs">
                            {match.customPeriods.length}p
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Keypad Legend */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present (P)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-800">
                      <span className="w-2 h-2 rounded-full bg-rose-600" /> Absent (A)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> OD
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-slate-400">
                    {activeStudents.length - absentees.length} Pres / {absentees.length} Abs
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
};

export default RapidDayEntryWizard;
