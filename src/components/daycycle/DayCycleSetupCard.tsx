import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Palmtree,
  CheckCircle2,
  Pencil,
  Check,
  RefreshCw,
} from 'lucide-react';
import { DayNumber, ClassId } from '../../types';
import { DayCycleEntry } from '../../services/dayCycleService';
import { formatDate } from '../../lib/utils';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardContent } from '../common/Card';
import { ChangeDayOrderModal } from './ChangeDayOrderModal';
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
  isModalOpen?: boolean;
  setIsModalOpen?: (open: boolean) => void;
  className?: string;
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
  isModalOpen: externalModalOpen,
  setIsModalOpen: setExternalModalOpen,
  className,
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = setExternalModalOpen !== undefined ? setExternalModalOpen : setInternalModalOpen;

  const isAssigned = entry !== null;
  const isHoliday = entry?.is_holiday === true;
  const currentDayNumber = entry?.day_number;

  const handleQuickAccept = async () => {
    await onAssignDay(suggestedDay);
  };

  return (
    <>
      <Card
        className={cn(
          'transition-all duration-200 rounded-2xl',
          !isAssigned
            ? 'border-indigo-200/80 bg-indigo-50/40 shadow-2xs'
            : isHoliday
            ? 'border-rose-200/80 bg-rose-50/30 shadow-2xs'
            : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs',
          className
        )}
      >
        <CardContent className="p-3 sm:p-3.5">
          {/* CASE 1: Date is ASSIGNED WORKING DAY */}
          {isAssigned && !isHoliday && (
            <div className="flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                      Day Order {currentDayNumber} Active
                    </h3>
                    <Badge variant="success" size="sm" className="font-extrabold text-[10px] hidden min-[360px]:inline-flex py-0 px-1.5">
                      DO {currentDayNumber}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate leading-tight mt-0.5">
                    {formatDate(date)} • 7 Periods • {classId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="gap-1.5 text-xs bg-white border-slate-200 shadow-2xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold py-1.5 px-2.5 sm:px-3 rounded-xl cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    <span className="min-[480px]:hidden">Change</span>
                    <span className="hidden min-[480px]:inline">Change Day Order</span>
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* CASE 2: Date is HOLIDAY */}
          {isAssigned && isHoliday && (
            <div className="flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Palmtree className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-rose-950 leading-tight truncate">
                      Holiday: {entry?.holiday_reason || 'College Holiday'}
                    </h3>
                    <Badge variant="danger" size="sm" className="font-extrabold text-[10px] hidden min-[360px]:inline-flex py-0 px-1.5">
                      Holiday
                    </Badge>
                  </div>
                  <p className="text-[11px] text-rose-800/80 font-medium truncate leading-tight mt-0.5">
                    {formatDate(date)} • Attendance marking paused • {classId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="gap-1.5 text-xs bg-white border-rose-200 text-rose-700 hover:bg-rose-50 font-bold py-1.5 px-2.5 sm:px-3 rounded-xl cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    <span className="min-[480px]:hidden">Change</span>
                    <span className="hidden min-[480px]:inline">Change to Working Day</span>
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* CASE 3: Date is UNASSIGNED */}
          {!isAssigned && (
            <div className="flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                      Day Order Not Assigned Yet
                    </h3>
                    <Badge variant="warning" size="sm" className="font-extrabold text-[10px] hidden min-[360px]:inline-flex py-0 px-1.5">
                      Pending Setup
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium truncate leading-tight mt-0.5">
                    {formatDate(date)} • Recommended: <strong>Day Order {suggestedDay}</strong>
                    {prevWorkingDate && prevWorkingDay && (
                      <span className="text-slate-500 ml-1">
                        (follows DO {prevWorkingDay})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  onClick={handleQuickAccept}
                  className="gap-1.5 text-xs font-black py-1.5 px-3 rounded-xl shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept DO {suggestedDay}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => setModalOpen(true)}
                  className="gap-1 text-xs font-bold py-1.5 px-3 rounded-xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Choose Day / Holiday</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Day Order Modal */}
      <ChangeDayOrderModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        date={date}
        classId={classId}
        currentEntry={entry}
        suggestedDay={suggestedDay}
        prevWorkingDate={prevWorkingDate}
        prevWorkingDay={prevWorkingDay}
        onAssignDay={onAssignDay}
        onMarkHoliday={onMarkHoliday}
      />
    </>
  );
};

export default DayCycleSetupCard;
