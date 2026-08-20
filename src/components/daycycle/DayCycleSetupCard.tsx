import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Palmtree,
  CheckCircle2,

  Pencil,

  Check,


} from 'lucide-react';
import { DayNumber, ClassId } from '../../types';
import { DayCycleEntry } from '../../services/dayCycleService';
import { DAY_ORDERS } from '../../data/timetable';
import { formatDate } from '../../lib/utils';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardContent } from '../common/Card';
import { ConfirmDayChangeModal } from './ConfirmDayChangeModal';
import { cn } from '../../lib/utils';

interface DayCycleSetupCardProps {
  date: string;
  classId: ClassId;
  classNameTitle: string;
  entry: DayCycleEntry | null;
  suggestedDay: DayNumber;
  prevWorkingDate?: string;
  prevWorkingDay?: DayNumber;
  onAssignDay: (dayNumber: DayNumber, notes?: string) => Promise<void>;
  onMarkHoliday: (reason: string, notes?: string) => Promise<void>;
  loading: boolean;
}

export const DayCycleSetupCard: React.FC<DayCycleSetupCardProps> = ({
  date,
  classId,
  entry,
  suggestedDay,
  prevWorkingDate,
  prevWorkingDay,
  onAssignDay,
  onMarkHoliday,
  loading,
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const [showHolidayInput, setShowHolidayInput] = useState(false);
  const [holidayReason, setHolidayReason] = useState('College Holiday');
  const [pendingAction, setPendingAction] = useState<{
    type: 'working' | 'holiday';
    dayNumber?: DayNumber;
    reason?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAssigned = entry !== null;
  const isHoliday = entry?.is_holiday === true;
  const currentDayNumber = entry?.day_number;

  const handleDayClick = (dayNum: DayNumber) => {
    if (isAssigned) {
      // Prompt confirmation before changing existing assignment
      setPendingAction({
        type: 'working',
        dayNumber: dayNum,
      });
    } else {
      // Direct assign for new date
      onAssignDay(dayNum);
    }
  };

  const handleHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAssigned) {
      setPendingAction({
        type: 'holiday',
        reason: holidayReason,
      });
    } else {
      onMarkHoliday(holidayReason);
      setShowHolidayInput(false);
    }
  };

  const executePendingChange = async () => {
    if (!pendingAction) return;
    setIsSaving(true);
    try {
      if (pendingAction.type === 'working' && pendingAction.dayNumber) {
        await onAssignDay(pendingAction.dayNumber);
      } else if (pendingAction.type === 'holiday' && pendingAction.reason) {
        await onMarkHoliday(pendingAction.reason);
      }
      setPendingAction(null);
      setIsChanging(false);
      setShowHolidayInput(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className={cn(
        'transition-all duration-200 border-2',
        !isAssigned
          ? 'border-blue-300 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white shadow-sm'
          : isHoliday
          ? 'border-rose-200 bg-rose-50/40'
          : 'border-emerald-200 bg-emerald-50/30'
      )}>
        <CardContent className="p-5">
          {/* CASE 1: Date is ASSIGNED and NOT in edit mode */}
          {isAssigned && !isChanging && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs',
                    isHoliday ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {isHoliday ? <Palmtree className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      {isHoliday ? (
                        <span>Holiday: {entry?.holiday_reason || 'Holiday'}</span>
                      ) : (
                        <span>Day Order {currentDayNumber} Active</span>
                      )}
                    </h3>
                    <Badge variant={isHoliday ? 'danger' : 'success'} size="sm">
                      {isHoliday ? 'Non-Working' : `DO ${currentDayNumber}`}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {formatDate(date)} • {classId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChanging(true)}
                  className="gap-1.5 text-xs bg-white border-slate-300 shadow-2xs hover:bg-slate-50 text-slate-700"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Correct Day Order</span>
                </Button>
              </div>
            </div>
          )}

          {/* CASE 2: Date is UNASSIGNED or CR clicked "Correct Day Order" */}
          {(!isAssigned || isChanging) && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {!isAssigned ? (
                        'This date has not been assigned a Day Order yet.'
                      ) : (
                        `Correct Day Order for ${formatDate(date)}`
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select a Day Order (1–6) or mark this date as a holiday for {classId}.
                    </p>
                  </div>
                </div>

                {isChanging && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsChanging(false);
                      setShowHolidayInput(false);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline self-start sm:self-auto"
                  >
                    Cancel Correction
                  </button>
                )}
              </div>

              {/* Suggestion banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-100/70 border border-blue-200/80 text-xs text-blue-950 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                  <span>
                    <strong>Recommended:</strong> Set as <strong>Day Order {suggestedDay}</strong>
                    {prevWorkingDate && prevWorkingDay && (
                      <span className="text-blue-800 ml-1">
                        (follows Day Order {prevWorkingDay} on {prevWorkingDate})
                      </span>
                    )}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleDayClick(suggestedDay)}
                  className="py-1 px-3 text-xs gap-1.5 shadow-xs font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept Day Order {suggestedDay}
                </Button>
              </div>

              {/* Manual Selection Grid */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  Or manually choose Day Order / Holiday:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {DAY_ORDERS.map((d) => {
                    const isSuggested = d.dayNumber === suggestedDay;
                    const isCurrent = isAssigned && currentDayNumber === d.dayNumber;
                    return (
                      <button
                        key={d.dayNumber}
                        type="button"
                        disabled={loading}
                        onClick={() => handleDayClick(d.dayNumber)}
                        className={cn(
                          'flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all',
                          isCurrent
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : isSuggested
                            ? 'bg-white text-blue-700 border-blue-400 ring-2 ring-blue-400/20 hover:bg-blue-50'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <span>{d.label}</span>
                        {isSuggested && (
                          <span className="text-[9px] font-semibold text-blue-600 uppercase tracking-tight mt-0.5">
                            Suggested
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Mark Holiday button */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowHolidayInput((v) => !v)}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all',
                      isHoliday
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <Palmtree className="w-3.5 h-3.5" />
                      Holiday
                    </span>
                    <span className="text-[9px] font-normal text-rose-600 mt-0.5">
                      No cycle advance
                    </span>
                  </button>
                </div>
              </div>

              {/* Inline Holiday Reason Input */}
              {showHolidayInput && (
                <form
                  onSubmit={handleHolidaySubmit}
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-center gap-2 text-xs"
                >
                  <span className="font-bold text-rose-900 shrink-0">Holiday Reason:</span>
                  <input
                    type="text"
                    value={holidayReason}
                    onChange={(e) => setHolidayReason(e.target.value)}
                    placeholder="e.g. Saturday Holiday, Pongal, Govt Holiday"
                    className="flex-1 px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    required
                  />
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setShowHolidayInput(false)}
                      className="text-xs py-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      type="submit"
                      disabled={loading}
                      className="text-xs py-1 font-bold"
                    >
                      Confirm Holiday
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {pendingAction && (
        <ConfirmDayChangeModal
          date={date}
          classId={classId}
          currentType={isHoliday ? 'holiday' : isAssigned ? 'working' : 'unassigned'}
          currentDayNumber={currentDayNumber}
          newType={pendingAction.type}
          newDayNumber={pendingAction.dayNumber}
          holidayReason={pendingAction.reason}
          onConfirm={executePendingChange}
          onClose={() => setPendingAction(null)}
          isSaving={isSaving}
        />
      )}
    </>
  );
};
