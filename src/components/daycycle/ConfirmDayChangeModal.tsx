import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Check, ShieldAlert, Loader2 } from 'lucide-react';
import { ClassId, DayNumber } from '../../types';
import { formatDate } from '../../lib/utils';
import { fetchDateAttendance } from '../../services/attendanceService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface ConfirmDayChangeModalProps {
  date: string;
  classId: ClassId;
  currentType: 'working' | 'holiday' | 'unassigned';
  currentDayNumber?: DayNumber | null;
  newType: 'working' | 'holiday';
  newDayNumber?: DayNumber | null;
  holidayReason?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

export const ConfirmDayChangeModal: React.FC<ConfirmDayChangeModalProps> = ({
  date,
  classId,
  currentType,
  currentDayNumber,
  newType,
  newDayNumber,
  holidayReason,
  onConfirm,
  onClose,
  isSaving,
}) => {
  const [attendanceCount, setAttendanceCount] = useState<number | null>(null);
  const [checkingAttendance, setCheckingAttendance] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    async function checkExistingAttendance() {
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
    checkExistingAttendance();
    return () => {
      active = false;
    };
  }, [classId, date]);

  const hasAttendance = (attendanceCount ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Warning Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          hasAttendance ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-100 bg-amber-50/70 text-amber-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              hasAttendance ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {hasAttendance ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {hasAttendance ? 'Strong Warning: Day Order Change' : 'Confirm Day Order Change'}
              </h2>
              <p className="text-[11px] font-medium opacity-80">{formatDate(date)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {checkingAttendance ? (
            <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Checking existing attendance records…</span>
            </div>
          ) : hasAttendance ? (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-black text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>CRITICAL WARNING: ATTENDANCE ALREADY MARKED</span>
              </div>
              <p className="leading-relaxed text-rose-800">
                <strong>{attendanceCount} student-period records</strong> have already been recorded on this date for <strong>{classId}</strong>.
              </p>
              <p className="leading-relaxed text-rose-800">
                Changing this date's Day Order assignment will alter how past period attendance and subjects are interpreted!
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Changing an already-assigned calendar date will modify the timetable and period mapping for <strong>{classId}</strong> on <strong>{formatDate(date)}</strong>.
            </p>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Current Assignment:</span>
              <Badge variant={currentType === 'holiday' ? 'danger' : 'default'} size="sm">
                {currentType === 'holiday' ? 'Holiday' : `Day Order ${currentDayNumber ?? '?'}`}
              </Badge>
            </div>

            <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
              <span className="font-semibold text-slate-700">New Assignment:</span>
              <Badge variant={newType === 'holiday' ? 'danger' : 'info'} size="sm">
                {newType === 'holiday'
                  ? `Holiday (${holidayReason || 'Unspecified'})`
                  : `Day Order ${newDayNumber}`}
              </Badge>
            </div>
          </div>

          <div className="text-[11px] text-amber-800 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
            💡 <strong>Cycle Rule:</strong> If marked as a holiday, this date will not consume a Day Order number. The next working date will resume from the current cycle position.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/40">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isSaving}
            className={`gap-1.5 text-white ${
              hasAttendance ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500' : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{hasAttendance ? 'Proceed Anyway' : 'Confirm Change'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
