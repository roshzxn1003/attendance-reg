import React, { useState } from 'react';
import {
  Calendar,
  Palmtree,
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import { ClassId, DayNumber } from '../../types';
import { DayCycleEntry } from '../../services/dayCycleService';
import { DAY_ORDERS } from '../../data/timetable';
import { formatDate, getTodayDateString } from '../../lib/utils';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { ConfirmDayChangeModal } from './ConfirmDayChangeModal';
import { cn } from '../../lib/utils';

interface HolidayLogManagerProps {
  classId: ClassId;
  classNameTitle: string;
  logs: DayCycleEntry[];
  onAssignDay: (date: string, dayNumber: DayNumber, notes?: string) => Promise<void>;
  onMarkHoliday: (date: string, reason: string, notes?: string) => Promise<void>;
  onDeleteEntry: (date: string) => Promise<void>;
  loading: boolean;
}

type FilterMode = 'all' | 'working' | 'holidays';

export const HolidayLogManager: React.FC<HolidayLogManagerProps> = ({
  classId,
  classNameTitle,
  logs,
  onAssignDay,
  onMarkHoliday,
  onDeleteEntry,
  loading,
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add / Edit Form State
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formType, setFormType] = useState<'working' | 'holiday'>('working');
  const [formDayNumber, setFormDayNumber] = useState<DayNumber>(1);
  const [formHolidayReason, setFormHolidayReason] = useState('Saturday Holiday');
  const [formNotes, setFormNotes] = useState('');

  // Confirmation Modal state
  const [confirmModalData, setConfirmModalData] = useState<{
    date: string;
    currentType: 'working' | 'holiday' | 'unassigned';
    currentDayNumber?: DayNumber | null;
    newType: 'working' | 'holiday';
    newDayNumber?: DayNumber | null;
    holidayReason?: string;
    notes?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const matchFilter =
      filterMode === 'all' ||
      (filterMode === 'working' && !log.is_holiday) ||
      (filterMode === 'holidays' && log.is_holiday);

    const matchSearch =
      !searchQuery ||
      log.date.includes(searchQuery) ||
      (log.holiday_reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchFilter && matchSearch;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = logs.find((l) => l.date === formDate);

    if (existing) {
      // Trigger confirmation modal for existing date
      setConfirmModalData({
        date: formDate,
        currentType: existing.is_holiday ? 'holiday' : 'working',
        currentDayNumber: existing.day_number,
        newType: formType,
        newDayNumber: formType === 'working' ? formDayNumber : null,
        holidayReason: formType === 'holiday' ? formHolidayReason : undefined,
        notes: formNotes,
      });
    } else {
      // Direct save
      if (formType === 'working') {
        onAssignDay(formDate, formDayNumber, formNotes);
      } else {
        onMarkHoliday(formDate, formHolidayReason, formNotes);
      }
      setShowAddModal(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!confirmModalData) return;
    setIsSaving(true);
    try {
      if (confirmModalData.newType === 'working' && confirmModalData.newDayNumber) {
        await onAssignDay(confirmModalData.date, confirmModalData.newDayNumber, confirmModalData.notes);
      } else if (confirmModalData.newType === 'holiday') {
        await onMarkHoliday(
          confirmModalData.date,
          confirmModalData.holidayReason || 'Holiday',
          confirmModalData.notes
        );
      }
      setConfirmModalData(null);
      setShowAddModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (log: DayCycleEntry) => {
    const desc = log.is_holiday ? `Holiday (${log.holiday_reason})` : `Day Order ${log.day_number}`;
    if (!window.confirm(`Delete calendar log for ${formatDate(log.date)} (${desc})?`)) {
      return;
    }
    await onDeleteEntry(log.date);
  };

  const workingCount = logs.filter((l) => !l.is_holiday).length;
  const holidayCount = logs.filter((l) => l.is_holiday).length;

  return (
    <div className="space-y-6">
      {/* Informative Header / Guide Banner */}
      <Card className="bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white border-blue-200/80">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Rotating Day Order 1–6 Cycle System & Holiday Registry
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                The college runs a rotating 6-day cycle. Dates do not advance by calendar week names. Marking an irregular Saturday or festival as a holiday preserves the cycle number for the next working day.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormDate(getTodayDateString());
                setShowAddModal(true);
              }}
              className="gap-1.5 shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Set Date / Mark Holiday</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Stats Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dates (YYYY-MM-DD) or holiday reasons…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium self-end sm:self-auto">
          {(
            [
              ['all', `All Records (${logs.length})`],
              ['working', `Working Days (${workingCount})`],
              ['holidays', `Holidays (${holidayCount})`],
            ] as [FilterMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={cn(
                'px-3 py-1.5 rounded-md transition-colors font-medium',
                filterMode === mode
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          Synchronizing calendar records…
        </div>
      )}

      {/* History Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">
                Calendar Cycle History — {classNameTitle}
              </CardTitle>
              <CardDescription>
                {filteredLogs.length} date entries logged for {classId}.
              </CardDescription>
            </div>
            <Badge variant="info" size="sm">
              {classId}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No date records found.</p>
              <p className="mt-1">Dates are recorded as you set Day Orders or mark holidays on the /attendance page or via the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50">
                    <th className="py-3 px-4">Calendar Date</th>
                    <th className="py-3 px-4">Cycle Assignment</th>
                    <th className="py-3 px-4">Status & Details</th>
                    <th className="py-3 px-4 hidden md:table-cell">Notes / Reason</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.date} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                        {log.date}
                        <span className="block text-[11px] font-sans font-normal text-slate-500">
                          {formatDate(log.date)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {log.is_holiday ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <Palmtree className="w-3.5 h-3.5" />
                            Holiday
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Day Order {log.day_number}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {log.is_holiday ? (
                          <span className="font-semibold text-rose-700">
                            {log.holiday_reason || 'Holiday (Cycle preserved)'}
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            Working Day (Timetable Active)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 hidden md:table-cell">
                        {log.notes || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Edit date assignment"
                            onClick={() => {
                              setFormDate(log.date);
                              setFormType(log.is_holiday ? 'holiday' : 'working');
                              setFormDayNumber(log.day_number || 1);
                              setFormHolidayReason(log.holiday_reason || 'Holiday');
                              setFormNotes(log.notes || '');
                              setShowAddModal(true);
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            title="Delete log"
                            onClick={() => handleDelete(log)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Date Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Set Calendar Date Assignment
              </h3>
              <Badge variant="info" size="sm">{classId}</Badge>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Calendar Date *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {formatDate(formDate)}
                </span>
              </div>

              {/* Type toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Assignment Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('working')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs font-bold transition-colors text-center',
                      formType === 'working'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    Working Day (Day Order 1–6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('holiday')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs font-bold transition-colors text-center',
                      formType === 'holiday'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    Holiday (Cycle Preserved)
                  </button>
                </div>
              </div>

              {/* Day Order selection if working */}
              {formType === 'working' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Day Order *
                  </label>
                  <select
                    value={formDayNumber}
                    onChange={(e) => setFormDayNumber(Number(e.target.value) as DayNumber)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {DAY_ORDERS.map((d) => (
                      <option key={d.dayNumber} value={d.dayNumber}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Holiday Reason *
                  </label>
                  <input
                    type="text"
                    value={formHolidayReason}
                    onChange={(e) => setFormHolidayReason(e.target.value)}
                    placeholder="e.g. Saturday Holiday, Pongal, College Day"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500/20"
                    required
                  />
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Adjusted after special event"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalData && (
        <ConfirmDayChangeModal
          date={confirmModalData.date}
          classId={classId}
          currentType={confirmModalData.currentType}
          currentDayNumber={confirmModalData.currentDayNumber}
          newType={confirmModalData.newType}
          newDayNumber={confirmModalData.newDayNumber}
          holidayReason={confirmModalData.holidayReason}
          onConfirm={handleConfirmSave}
          onClose={() => setConfirmModalData(null)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};
