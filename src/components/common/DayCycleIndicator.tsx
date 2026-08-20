import React from 'react';
import { DayNumber } from '../../types';
import { DAY_ORDERS } from '../../data/timetable';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DayCycleIndicatorProps {
  currentDayNumber?: DayNumber | null;
  isHoliday?: boolean;
  className?: string;
  onSelectDay?: (day: DayNumber) => void;
}

export const DayCycleIndicator: React.FC<DayCycleIndicatorProps> = ({
  currentDayNumber = 1,
  isHoliday = false,
  className,
  onSelectDay,
}) => {
  return (
    <div className={cn('flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs', className)}>
      <div className="flex items-center gap-1.5 text-slate-500 font-semibold shrink-0 pl-1">
        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
        <span className="hidden sm:inline">Cycle:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {DAY_ORDERS.map((d) => {
          const isActive = !isHoliday && currentDayNumber === d.dayNumber;
          return (
            <button
              key={d.dayNumber}
              type="button"
              disabled={!onSelectDay}
              onClick={() => onSelectDay?.(d.dayNumber)}
              className={cn(
                'px-2 py-0.5 rounded font-medium text-xs transition-all whitespace-nowrap',
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900',
                !onSelectDay && 'cursor-default'
              )}
            >
              {d.shortLabel}
            </button>
          );
        })}

        {isHoliday && (
          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200">
            Holiday
          </span>
        )}
      </div>
    </div>
  );
};
