import React, { useState } from 'react';
import { X, Save, AlertCircle, Clock } from 'lucide-react';
import { TimetableEntry } from '../../services/timetableService';
import { DayNumber, PeriodNumber } from '../../types';
import { DAY_ORDERS, PERIOD_TIMINGS } from '../../data/timetable';
import { SUBJECTS } from '../../data/subjects';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatTime12h } from '../../lib/utils';

interface EditTimetableModalProps {
  entry?: TimetableEntry | null;
  defaultDayNumber: DayNumber;
  classId: string;
  onSave: (entry: {
    timetable_id?: string;
    class_id: string;
    day_number: DayNumber;
    period_number: PeriodNumber;
    subject: string;
    start_time: string;
    end_time: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const EditTimetableModal: React.FC<EditTimetableModalProps> = ({
  entry,
  defaultDayNumber,
  classId,
  onSave,
  onClose,
}) => {
  const [dayNumber, setDayNumber] = useState<DayNumber>(entry?.day_number ?? defaultDayNumber);
  const [periodNumber, setPeriodNumber] = useState<PeriodNumber>(entry?.period_number ?? 1);
  const [subject, setSubject] = useState<string>(entry?.subject ?? 'DM');

  const defaultTiming = PERIOD_TIMINGS.find((p) => p.period === (entry?.period_number ?? 1));
  const [startTime, setStartTime] = useState<string>(
    entry?.start_time ? entry.start_time.slice(0, 5) : defaultTiming?.startTime ?? '08:30'
  );
  const [endTime, setEndTime] = useState<string>(
    entry?.end_time ? entry.end_time.slice(0, 5) : defaultTiming?.endTime ?? '09:30'
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePeriodChange = (p: PeriodNumber) => {
    setPeriodNumber(p);
    const timing = PERIOD_TIMINGS.find((t) => t.period === p);
    if (timing) {
      setStartTime(timing.startTime);
      setEndTime(timing.endTime);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Subject code / name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        timetable_id: entry?.timetable_id,
        class_id: classId,
        day_number: dayNumber,
        period_number: periodNumber,
        subject: subject.trim().toUpperCase(),
        start_time: startTime,
        end_time: endTime,
      });
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const subjectOptions = Object.keys(SUBJECTS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {entry ? 'Edit Timetable Entry' : 'Add Timetable Period'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={classId === 'CSE-25' ? 'info' : 'purple'} size="sm">
                {classId}
              </Badge>
              <span className="text-xs text-slate-500 font-medium">Room 245</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Day Order */}
            <div>
              <label htmlFor="day-order-select-modal" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Day Order *
              </label>
              <select
                id="day-order-select-modal"
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value) as DayNumber)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {DAY_ORDERS.map((d) => (
                  <option key={d.dayNumber} value={d.dayNumber}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Number */}
            <div>
              <label htmlFor="period-number-select-modal" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Period Number *
              </label>
              <select
                id="period-number-select-modal"
                value={periodNumber}
                onChange={(e) => handlePeriodChange(Number(e.target.value) as PeriodNumber)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {PERIOD_TIMINGS.map((p) => (
                  <option key={p.period} value={p.period}>
                    Period {p.period} ({p.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Selection / Input */}
          <div>
            <label htmlFor="subject-input-modal" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Subject Code / Name *
            </label>
            <div className="space-y-2">
              <input
                id="subject-input-modal"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.toUpperCase())}
                placeholder="e.g. DM, OS LAB, DAA"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="text-[11px] text-slate-400 self-center">Quick pick:</span>
                {subjectOptions.slice(0, 8).map((subKey) => (
                  <button
                    key={subKey}
                    type="button"
                    onClick={() => setSubject(subKey)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                  >
                    {subKey}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-time-input-modal" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Start Time *
                </span>
                <span className="text-[10px] font-mono text-blue-600 lowercase font-normal">
                  {formatTime12h(startTime)}
                </span>
              </label>
              <input
                id="start-time-input-modal"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="end-time-input-modal" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  End Time *
                </span>
                <span className="text-[10px] font-mono text-blue-600 lowercase font-normal">
                  {formatTime12h(endTime)}
                </span>
              </label>
              <input
                id="end-time-input-modal"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              Save Entry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
