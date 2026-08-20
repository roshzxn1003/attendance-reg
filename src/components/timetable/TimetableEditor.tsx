import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Coffee,
  Utensils,
  RotateCcw,
  Info,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Table as TableIcon,
} from 'lucide-react';
import { useTimetable } from '../../hooks/useTimetable';
import { TimetableEntry } from '../../services/timetableService';
import { DayNumber } from '../../types';
import { DAY_ORDERS, PERIOD_TIMINGS, BREAK_TIMINGS, MASTER_TIMETABLE } from '../../data/timetable';
import { SUBJECTS } from '../../data/subjects';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { EditTimetableModal } from './EditTimetableModal';
import { cn, formatTimeRange12h } from '../../lib/utils';

interface TimetableEditorProps {
  classId: string;
  classNameTitle: string;
}

export const TimetableEditor: React.FC<TimetableEditorProps> = ({ classId, classNameTitle }) => {
  const [selectedDayNumber, setSelectedDayNumber] = useState<DayNumber>(1);
  const [viewMode, setViewMode] = useState<'day' | 'matrix'>('day');
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  const {
    entries,
    loading,
    error,
    isLocalFallback,
    saveEntry,
    removeEntry,
    seedOfficial,
  } = useTimetable(classId);

  const handleSeedOfficial = async () => {
    if (!window.confirm(`Reset ${classId} timetable to the official SPIHER May-Dec 2026 schedule (42 periods)?`)) {
      return;
    }
    setSeeding(true);
    setSeedSuccessMsg(null);
    try {
      const res = await seedOfficial();
      setSeedSuccessMsg(`Successfully synchronized ${res.count} periods to Supabase for ${classId}!`);
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    } catch (err) {
      alert(`Failed to seed timetable: ${String(err)}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (entry: TimetableEntry) => {
    if (!window.confirm(`Remove Period ${entry.period_number} (${entry.subject}) from Day Order ${entry.day_number}?`)) {
      return;
    }
    try {
      await removeEntry(entry.timetable_id);
    } catch (err) {
      alert(`Failed to delete entry: ${String(err)}`);
    }
  };

  // Filter entries for the selected day
  const dayEntries = entries
    .filter((e) => e.day_number === selectedDayNumber)
    .sort((a, b) => a.period_number - b.period_number);

  // Group entries for full matrix view
  const matrixByDay: Record<number, Record<number, TimetableEntry>> = {};
  for (const entry of entries) {
    if (!matrixByDay[entry.day_number]) matrixByDay[entry.day_number] = {};
    matrixByDay[entry.day_number][entry.period_number] = entry;
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Day Order Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {DAY_ORDERS.map((d) => {
            const isSelected = viewMode === 'day' && selectedDayNumber === d.dayNumber;
            return (
              <button
                key={d.dayNumber}
                type="button"
                onClick={() => {
                  setSelectedDayNumber(d.dayNumber);
                  setViewMode('day');
                }}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 whitespace-nowrap',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                {d.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 whitespace-nowrap ml-1',
              viewMode === 'matrix'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            )}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Full Matrix</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            className="gap-1.5 bg-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Period</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedOfficial}
            isLoading={seeding}
            className="gap-1.5 text-xs text-slate-700 bg-white shadow-xs hover:bg-blue-50 hover:text-blue-700"
            title="Reset/Synchronize with official May-Dec 2026 timetable"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Official Timetable</span>
          </Button>
        </div>
      </div>

      {/* Fallback / Seed Notice */}
      {isLocalFallback && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Displaying official master schedule in offline/preview mode. Click <strong>Sync Official Timetable</strong> to store these entries in Supabase.
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSeedOfficial}
            isLoading={seeding}
            className="text-xs shrink-0 py-1"
          >
            Sync to DB
          </Button>
        </div>
      )}

      {seedSuccessMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{seedSuccessMsg}</span>
        </div>
      )}

      {/* Break Policy Informational Notice */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Daily Schedule Rules:</span>
          <span>7 attendance periods (60/55 min) • 2 official non-attendance breaks (Tea & Lunch)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
            <Coffee className="w-3 h-3 text-amber-600" /> Tea Break (10:30 AM – 10:45 AM)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
            <Utensils className="w-3 h-3 text-amber-600" /> Lunch Break (12:45 PM – 1:15 PM)
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          Loading timetable data…
        </div>
      )}

      {/* ── View Mode: Single Day Order Grid ── */}
      {!loading && viewMode === 'day' && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Day Order {selectedDayNumber} Schedule — {classNameTitle}
                </CardTitle>
                <CardDescription>
                  Official period assignments mapped from Room 245 Department Timetable (12-hour AM/PM format).
                </CardDescription>
              </div>
              <Badge variant={classId === 'CSE-25' ? 'info' : 'purple'} size="md">
                {classId}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50/80">
                    <th className="py-3 px-4 font-semibold">Period</th>
                    <th className="py-3 px-4 font-semibold">Time (AM / PM)</th>
                    <th className="py-3 px-4 font-semibold">Subject</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Faculty & Code</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERIOD_TIMINGS.map((slot) => {
                    const entry = dayEntries.find((e) => e.period_number === slot.period);
                    const rawSubject = entry?.subject ?? 'FREE';
                    const isLab = rawSubject.includes('LAB');
                    const subjectDetail = SUBJECTS[rawSubject];
                    
                    const timeRangeDisplay = entry
                      ? formatTimeRange12h(entry.start_time, entry.end_time)
                      : slot.label;

                    // Check for breaks after this period
                    const breakAfter = BREAK_TIMINGS.find((b) => b.afterPeriod === slot.period);

                    return (
                      <React.Fragment key={slot.period}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 inline-flex items-center justify-center text-xs font-mono mr-2">
                              {slot.period}
                            </span>
                            Period {slot.period}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-500" />
                              {timeRangeDisplay}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{rawSubject}</span>
                              {subjectDetail && (
                                <span className="hidden sm:inline text-xs font-normal text-slate-500">
                                  ({subjectDetail.name})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 hidden md:table-cell">
                            {subjectDetail ? (
                              <div>
                                <span className="font-medium text-slate-800">{subjectDetail.facultyName}</span>
                                <span className="block text-[11px] font-mono text-slate-400">{subjectDetail.code}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Class Advisor / Department</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {isLab ? (
                              <Badge variant="purple" size="sm">Laboratory</Badge>
                            ) : (
                              <Badge variant="info" size="sm">Lecture</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Edit period"
                                onClick={() =>
                                  setEditingEntry(
                                    entry || {
                                      timetable_id: '',
                                      class_id: classId,
                                      day_number: selectedDayNumber,
                                      period_number: slot.period,
                                      subject: rawSubject,
                                      start_time: slot.startTime,
                                      end_time: slot.endTime,
                                    }
                                  )
                                }
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {entry && !entry.timetable_id.startsWith('local-') && (
                                <button
                                  type="button"
                                  title="Delete period"
                                  onClick={() => handleDelete(entry)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Break Period Row */}
                        {breakAfter && (
                          <tr className="bg-amber-50/60 border-y border-amber-200/70 text-amber-900">
                            <td colSpan={6} className="py-2.5 px-4">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                  {breakAfter.name === 'Tea Break' ? (
                                    <Coffee className="w-4 h-4 text-amber-600" />
                                  ) : (
                                    <Utensils className="w-4 h-4 text-amber-600" />
                                  )}
                                  <span>{breakAfter.shortName}</span>
                                  <span className="font-mono text-[11px] font-medium text-amber-800">
                                    ({breakAfter.label})
                                  </span>
                                </div>
                                <span className="text-[11px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                                  Non-attendance Period
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── View Mode: Full 6-Day Order Matrix ── */}
      {!loading && viewMode === 'matrix' && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-indigo-600" />
                  Full Timetable Matrix (Day Order 1–6) — {classNameTitle}
                </CardTitle>
                <CardDescription>
                  Comprehensive rotating timetable matrix with 12-hour AM/PM timings.
                </CardDescription>
              </div>
              <Badge variant={classId === 'CSE-25' ? 'info' : 'purple'} size="md">
                {classId}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-3 border-r border-slate-200 text-left font-bold w-24">Day Order</th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      <div className="font-bold">P1</div>
                      <div className="text-[10px] text-slate-500 font-mono">8:30–9:30 AM</div>
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      <div className="font-bold">P2</div>
                      <div className="text-[10px] text-slate-500 font-mono">9:30–10:30 AM</div>
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200 bg-amber-50 text-amber-800 font-semibold w-16">
                      <div className="text-[10px] font-bold">TEA</div>
                      <div className="text-[9px] text-amber-700">10:30 AM</div>
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      <div className="font-bold">P3</div>
                      <div className="text-[10px] text-slate-500 font-mono">10:45–11:45 AM</div>
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      <div className="font-bold">P4</div>
                      <div className="text-[10px] text-slate-500 font-mono">11:45 AM–12:45 PM</div>
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200 bg-amber-50 text-amber-800 font-semibold w-16">
                      <div className="text-[10px] font-bold">LUNCH</div>
                      <div className="text-[9px] text-amber-700">12:45 PM</div>
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      <div className="font-bold">P5</div>
                      <div className="text-[10px] text-slate-500 font-mono">1:15–2:10 PM</div>
                    </th>
                    <th className="py-2 px-2 border-r border-slate-200">
                      <div className="font-bold">P6</div>
                      <div className="text-[10px] text-slate-500 font-mono">2:10–3:05 PM</div>
                    </th>
                    <th className="py-2 px-2">
                      <div className="font-bold">P7</div>
                      <div className="text-[10px] text-slate-500 font-mono">3:05–4:00 PM</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {DAY_ORDERS.map((d) => (
                    <tr key={d.dayNumber} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 text-left font-bold text-slate-900 border-r border-slate-200 bg-slate-50/50">
                        {d.label}
                      </td>

                      {/* Period 1 */}
                      <td className="py-3 px-2 border-r border-slate-200 font-semibold text-slate-800">
                        {matrixByDay[d.dayNumber]?.[1]?.subject ?? MASTER_TIMETABLE[d.dayNumber]?.[1]?.subjectShort}
                      </td>

                      {/* Period 2 */}
                      <td className="py-3 px-2 border-r border-slate-200 font-semibold text-slate-800">
                        {matrixByDay[d.dayNumber]?.[2]?.subject ?? MASTER_TIMETABLE[d.dayNumber]?.[2]?.subjectShort}
                      </td>

                      {/* Tea Break */}
                      <td className="py-3 px-1 border-r border-slate-200 bg-amber-50/60 text-amber-800 text-[10px] font-mono">
                        Break
                      </td>

                      {/* Period 3 */}
                      <td className="py-3 px-2 border-r border-slate-200 font-semibold text-slate-800">
                        {matrixByDay[d.dayNumber]?.[3]?.subject ?? MASTER_TIMETABLE[d.dayNumber]?.[3]?.subjectShort}
                      </td>

                      {/* Period 4 */}
                      <td className="py-3 px-2 border-r border-slate-200 font-semibold text-slate-800">
                        {matrixByDay[d.dayNumber]?.[4]?.subject ?? (classId === 'AIDS-25' ? 'AI' : 'CA')}
                      </td>

                      {/* Lunch Break */}
                      <td className="py-3 px-1 border-r border-slate-200 bg-amber-50/60 text-amber-800 text-[10px] font-mono">
                        Break
                      </td>

                      {/* Period 5 */}
                      <td className="py-3 px-2 border-r border-slate-200 font-semibold text-slate-800">
                        {matrixByDay[d.dayNumber]?.[5]?.subject ?? MASTER_TIMETABLE[d.dayNumber]?.[5]?.subjectShort}
                      </td>

                      {/* Period 6 */}
                      <td className="py-3 px-2 border-r border-slate-200 font-semibold text-slate-800">
                        {matrixByDay[d.dayNumber]?.[6]?.subject ?? MASTER_TIMETABLE[d.dayNumber]?.[6]?.subjectShort}
                      </td>

                      {/* Period 7 */}
                      <td className="py-3 px-2 font-semibold text-slate-800">
                        {matrixByDay[d.dayNumber]?.[7]?.subject ??
                          (d.dayNumber === 5 && classId === 'AIDS-25' ? 'AI' : MASTER_TIMETABLE[d.dayNumber]?.[7]?.subjectShort)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit / Add Modal */}
      {(editingEntry || isAddingNew) && (
        <EditTimetableModal
          entry={editingEntry}
          defaultDayNumber={selectedDayNumber}
          classId={classId}
          onSave={saveEntry}
          onClose={() => {
            setEditingEntry(null);
            setIsAddingNew(false);
          }}
        />
      )}
    </div>
  );
};
