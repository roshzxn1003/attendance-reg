import React from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Check,
  Palmtree,
} from 'lucide-react';
import { ClassId, PeriodNumber } from '../../types';
import { DailyAttendanceOverview } from '../../services/attendanceService';
import { PERIOD_TIMINGS } from '../../data/timetable';
import { Card, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { cn, formatDate } from '../../lib/utils';

interface DailyAttendanceOverviewCardProps {
  classId: ClassId;
  classNameTitle: string;
  date: string;
  dayOrderNumber?: number;
  overview: DailyAttendanceOverview;
  isHoliday: boolean;
  holidayReason?: string | null;
  onSelectPeriod: (p: PeriodNumber) => void;
  selectedPeriods: PeriodNumber[];
}

export const DailyAttendanceOverviewCard: React.FC<DailyAttendanceOverviewCardProps> = ({
  classId,
  classNameTitle,
  date,
  dayOrderNumber,
  overview,
  isHoliday,
  holidayReason,
  onSelectPeriod,
  selectedPeriods,
}) => {
  if (isHoliday) {
    return (
      <Card className="border-rose-200 bg-rose-50/60">
        <CardContent className="p-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-950">
              Holiday — {holidayReason || 'College Holiday'} ({formatDate(date)})
            </h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Attendance is not recorded on holidays. Day cycle rotation is paused.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionPercent = Math.round((overview.periodsCompleted / overview.totalPeriods) * 100);

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardContent className="p-5 space-y-4">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900">
                  {formatDate(date)} Attendance Overview
                </h3>
                {dayOrderNumber && (
                  <Badge variant="info" size="sm">
                    Day Order {dayOrderNumber}
                  </Badge>
                )}
                <Badge variant="purple" size="sm">
                  {classId}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {classNameTitle} • Dynamic calculations updated live
              </p>
            </div>
          </div>

          {/* Periods Completed Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Periods Completed:</span>
            <span className="font-mono font-bold text-slate-900">
              {overview.periodsCompleted} / {overview.totalPeriods}
            </span>
            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Metric Cards Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Present */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wide">
              <span>Present (P)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-800 mt-1.5">
              {overview.presentCount}
              <span className="text-xs font-normal text-emerald-600 ml-1">hours</span>
            </p>
          </div>

          {/* Absent */}
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wide">
              <span>Absent (A)</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-800 mt-1.5">
              {overview.absentCount}
              <span className="text-xs font-normal text-rose-600 ml-1">hours</span>
            </p>
          </div>

          {/* OD */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wide">
              <span>On Duty (OD)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-800 mt-1.5">
              {overview.odCount}
              <span className="text-xs font-normal text-amber-600 ml-1">hours</span>
            </p>
          </div>

          {/* Today's Overall Percentage */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wide">
              <span>Day Percentage</span>
              <Percent className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">
              {overview.totalStudentPeriods > 0 ? (
                <>
                  {overview.attendancePercentage.toFixed(1)}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">%</span>
                </>
              ) : (
                <span className="text-sm font-normal text-slate-400 italic">No periods marked</span>
              )}
            </p>
          </div>
        </div>

        {/* ── Period Status Pills (Quick Navigation) ── */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs border-t border-slate-100">
          <span className="font-bold text-slate-600">Quick Period Selector:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PERIOD_TIMINGS.map((slot) => {
              const isRecorded = overview.completedPeriodNumbers.includes(slot.period);
              const isSelected = selectedPeriods.includes(slot.period);

              return (
                <button
                  key={slot.period}
                  type="button"
                  onClick={() => onSelectPeriod(slot.period)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none',
                    isSelected
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/40 shadow-2xs'
                      : isRecorded
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                  )}
                >
                  {isRecorded && <Check className="w-3 h-3 text-emerald-700" />}
                  <span>P{slot.period}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
