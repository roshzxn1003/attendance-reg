import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Palmtree,
  Check,
  X,
  ShieldAlert,
  Loader2,
  Clock,
} from 'lucide-react';
import { ClassId, DayNumber } from '../../types';
import { DayCycleEntry } from '../../services/dayCycleService';
import { DAY_ORDERS } from '../../data/timetable';
import { formatDate } from '../../lib/utils';
import { fetchDateAttendance } from '../../services/attendanceService';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

interface ChangeDayOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  classId: ClassId;
  currentEntry: DayCycleEntry | null;
  suggestedDay: DayNumber;
  prevWorkingDate?: string;
  prevWorkingDay?: DayNumber;
  onAssignDay: (dayNumber: DayNumber, notes?: string) => Promise<void>;
  onMarkHoliday: (reason: string, notes?: string) => Promise<void>;
}

const COMMON_HOLIDAY_PRESETS = [
  'College Holiday',
  'Saturday Holiday',
  'Government Holiday',
  'Festival / Pongal',
  'Local Holiday',
  'Semester Exam',
];

export const ChangeDayOrderModal: React.FC<ChangeDayOrderModalProps> = ({
  isOpen,
  onClose,
  date,
  classId,
  currentEntry,
  suggestedDay,
  prevWorkingDate,
  prevWorkingDay,
  onAssignDay,
  onMarkHoliday,
}) => {
  const toast = useToast();

  const isAssigned = currentEntry !== null;
  const isHoliday = currentEntry?.is_holiday === true;
  const currentDayNumber = currentEntry?.day_number;

  const [activeMode, setActiveMode] = useState<'working' | 'holiday'>(
    isHoliday ? 'holiday' : 'working'
  );
  const [selectedDayNumber, setSelectedDayNumber] = useState<DayNumber>(
    (currentDayNumber as DayNumber) || suggestedDay || 1
  );
  const [holidayReason, setHolidayReason] = useState(
    currentEntry?.holiday_reason || 'College Holiday'
  );
  const [notes, setNotes] = useState(currentEntry?.notes || '');

  const [attendanceCount, setAttendanceCount] = useState<number | null>(null);
  const [checkingAttendance, setCheckingAttendance] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when modal opens or entry changes
  useEffect(() => {
    if (isOpen) {
      setActiveMode(currentEntry?.is_holiday ? 'holiday' : 'working');
      setSelectedDayNumber((currentEntry?.day_number as DayNumber) || suggestedDay || 1);
      setHolidayReason(currentEntry?.holiday_reason || 'College Holiday');
      setNotes(currentEntry?.notes || '');
    }
  }, [isOpen, currentEntry, suggestedDay]);

  // Check attendance records for this date
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setCheckingAttendance(true);

    async function checkAttendance() {
      try {
        const records = await fetchDateAttendance(classId, date);
        if (active) {
          setAttendanceCount(records.length);
        }
      } catch {
        if (active) setAttendanceCount(0);
      } finally {
        if (active) setCheckingAttendance(false);
      }
    }

    checkAttendance();
    return () => {
      active = false;
    };
  }, [isOpen, classId, date]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasAttendance = (attendanceCount ?? 0) > 0;
  const isChangingExisting = isAssigned && (
    activeMode === 'holiday'
      ? !isHoliday || currentEntry?.holiday_reason !== holidayReason
      : isHoliday || currentDayNumber !== selectedDayNumber
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeMode === 'working') {
        await onAssignDay(selectedDayNumber, notes || undefined);
        toast.success(
          `Date ${formatDate(date)} set to Day Order ${selectedDayNumber}`,
          'Day Order Updated'
        );
      } else {
        await onMarkHoliday(holidayReason || 'Holiday', notes || undefined);
        toast.success(
          `Date ${formatDate(date)} marked as Holiday (${holidayReason || 'Holiday'})`,
          'Holiday Set'
        );
      }
      onClose();
    } catch (err) {
      toast.error(String(err), 'Failed to update day order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptSuggested = async () => {
    setIsSaving(true);
    try {
      await onAssignDay(suggestedDay, notes || undefined);
      toast.success(
        `Date ${formatDate(date)} set to Day Order ${suggestedDay}`,
        'Day Order Updated'
      );
      onClose();
    } catch (err) {
      toast.error(String(err), 'Failed to assign day order');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-3 sm:pt-6 md:pt-10 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl shadow-slate-900/10 w-full max-w-lg border border-slate-200/90 overflow-hidden max-h-[calc(100vh-1.5rem)] sm:max-h-[88vh] flex flex-col mt-0 sm:mt-1 animate-in fade-in slide-in-from-top-4 duration-200"
      >
        {/* Unified Blended Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-indigo-50/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs transition-colors',
                activeMode === 'holiday'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-indigo-100 text-indigo-700'
              )}
            >
              {activeMode === 'holiday' ? (
                <Palmtree className="w-5 h-5" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  {isAssigned ? 'Change Day Order / Status' : 'Set Day Order'}
                </h2>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight shrink-0',
                    isHoliday
                      ? 'bg-rose-100 text-rose-800'
                      : isAssigned
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-900'
                  )}
                >
                  {isHoliday ? 'Holiday' : isAssigned ? `DO ${currentDayNumber}` : 'Pending'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5 truncate">
                {formatDate(date)} • <span className="font-mono font-bold text-slate-700">{classId}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Attendance Warning if records already exist */}
          {checkingAttendance ? (
            <div className="flex items-center justify-center py-2 gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Verifying calendar attendance history…</span>
            </div>
          ) : hasAttendance && isChangingExisting ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-xs text-rose-900 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-black text-rose-950">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>ATTENDANCE ALREADY RECORDED</span>
              </div>
              <p className="leading-relaxed text-rose-800 text-[11px]">
                <strong>{attendanceCount} student-period records</strong> already exist on {formatDate(date)}.
                Changing this day order alters the timetable interpretation for those periods.
              </p>
            </div>
          ) : null}

          {/* Sleek Segmented Switcher: Working Day vs Holiday */}
          <div className="p-1 bg-slate-100/90 rounded-2xl flex gap-1 border border-slate-200/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveMode('working')}
              className={cn(
                'flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none',
                activeMode === 'working'
                  ? 'bg-white text-indigo-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Working Day (DO 1–6)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('holiday')}
              className={cn(
                'flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none',
                activeMode === 'holiday'
                  ? 'bg-white text-rose-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Palmtree className="w-3.5 h-3.5 shrink-0" />
              <span>College Holiday</span>
            </button>
          </div>

          {/* ── MODE 1: WORKING DAY ── */}
          {activeMode === 'working' && (
            <div className="space-y-4">
              {/* Recommended Day Order Blended Callout */}
              {suggestedDay && (
                <div className="p-3 sm:p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-indigo-950 min-w-0">
                      <span className="font-black">Recommended:</span>{' '}
                      <span className="font-bold text-indigo-800">Day Order {suggestedDay}</span>
                      {prevWorkingDate && prevWorkingDay && (
                        <span className="text-indigo-700/80 ml-1 text-[11px] block sm:inline">
                          (follows DO {prevWorkingDay})
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedDayNumber !== suggestedDay ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => setSelectedDayNumber(suggestedDay)}
                      className="py-1 px-2.5 text-xs font-black border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 shadow-2xs cursor-pointer shrink-0"
                    >
                      <Check className="w-3 h-3" />
                      <span>Select DO {suggestedDay}</span>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isSaving}
                      onClick={handleAcceptSuggested}
                      className="py-1 px-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer shrink-0"
                    >
                      <Check className="w-3 h-3" />
                      <span>Apply DO {suggestedDay}</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Day Order 1–6 Interactive Tiles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Select Active Day Order:</span>
                  <span className="text-indigo-700 font-extrabold normal-case">
                    Currently Selected: DO {selectedDayNumber}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
                  {DAY_ORDERS.map((d) => {
                    const isSelected = selectedDayNumber === d.dayNumber;
                    const isSuggested = d.dayNumber === suggestedDay;

                    return (
                      <button
                        key={d.dayNumber}
                        type="button"
                        onClick={() => setSelectedDayNumber(d.dayNumber)}
                        className={cn(
                          'p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative select-none group',
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500 ring-offset-1'
                            : isSuggested
                            ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900 hover:bg-indigo-100/60'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                        )}
                      >
                        {/* Check badge when selected */}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-white text-indigo-700 rounded-full flex items-center justify-center shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}

                        <span
                          className={cn(
                            'text-sm sm:text-base font-black tracking-tight leading-none',
                            isSelected ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'
                          )}
                        >
                          {d.shortLabel}
                        </span>

                        <span
                          className={cn(
                            'text-[10px] mt-1 font-semibold leading-none truncate',
                            isSelected
                              ? 'text-indigo-100'
                              : isSuggested
                              ? 'text-indigo-600 font-bold'
                              : 'text-slate-400'
                          )}
                        >
                          {isSuggested ? 'Suggested' : `Day ${d.dayNumber}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── MODE 2: HOLIDAY ── */}
          {activeMode === 'holiday' && (
            <div className="space-y-3.5 p-4 bg-rose-50/40 border border-rose-100 rounded-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-rose-950 block">
                  Holiday Reason / Title:
                </label>
                <input
                  type="text"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  placeholder="e.g. Saturday Holiday, Pongal, Govt Holiday"
                  className="w-full px-3.5 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 shadow-2xs"
                  required
                />
              </div>

              {/* Quick Preset Pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black text-rose-800 tracking-wider">
                  Quick Preset Titles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_HOLIDAY_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHolidayReason(preset)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer select-none',
                        holidayReason === preset
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-white text-rose-800 border-rose-200/80 hover:bg-rose-100/60'
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-rose-800/90 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-rose-200/60">
                💡 <strong>Rotating Cycle Rule:</strong> Marking a holiday preserves the Day Order sequence. The next working date will resume without advancing on this non-working day.
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">
              Optional Remarks / Notes:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special schedule, departmental event, etc."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors shadow-2xs"
            />
          </div>
        </div>

        {/* Unified Blended Action Footer */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            className={cn(
              'gap-1.5 text-white font-black shadow-sm cursor-pointer rounded-xl px-4 py-2 transition-all',
              activeMode === 'holiday'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
            )}
          >
            <Check className="w-4 h-4" />
            <span>
              {activeMode === 'holiday'
                ? 'Confirm Holiday'
                : `Set as Day Order ${selectedDayNumber}`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};
