import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Download,
  Printer,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Layers,
  CalendarRange,
  ArrowRight,
} from 'lucide-react';
import { ClassId } from '../../types';
import { Student } from '../../services/studentService';
import {
  MonthlyMatrixData,
  generateDateRangeMatrix,
  exportMonthlyMatrixExcel,
} from '../../services/monthlyMatrixService';
import { ACADEMIC_MONTHS, MULTI_MONTH_PRESETS } from '../../services/monthlyAttendanceService';
import { Card, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';

interface MonthlyPeriodRegisterGridProps {
  classId: ClassId;
  classNameTitle: string;
  students: Student[];
  onSelectStudent?: (student: Student) => void;
}

type RangeSelectionMode = 'single_month' | 'multi_month' | 'custom_range';

export const MonthlyPeriodRegisterGrid: React.FC<MonthlyPeriodRegisterGridProps> = ({
  classId,
  classNameTitle,
  students,
  onSelectStudent,
}) => {
  // Range Mode & Dates
  const [rangeMode, setRangeMode] = useState<RangeSelectionMode>('single_month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [selectedPreset, setSelectedPreset] = useState<string>('5m-semester');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-12-31');

  // Display Options
  const [onlyMarkedDates, setOnlyMarkedDates] = useState<boolean>(true);
  const [useTickMark, setUseTickMark] = useState<boolean>(true);
  const [lockLeftNames, setLockLeftNames] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [lockRightTotals, setLockRightTotals] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [search, setSearch] = useState<string>('');

  // Data & State
  const [matrixData, setMatrixData] = useState<MonthlyMatrixData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    for (const s of students) {
      map.set(s.student_id, s);
    }
    return map;
  }, [students]);

  // Compute active start & end dates
  const activeDateRange = useMemo(() => {
    if (rangeMode === 'single_month') {
      const [y, m] = selectedMonth.split('-');
      const days = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      const monthObj = ACADEMIC_MONTHS.find((item) => item.value === selectedMonth);
      return {
        startDate: `${selectedMonth}-01`,
        endDate: `${selectedMonth}-${String(days).padStart(2, '0')}`,
        label: monthObj ? monthObj.label.toUpperCase() : selectedMonth,
      };
    }

    if (rangeMode === 'multi_month') {
      const preset = MULTI_MONTH_PRESETS.find((p) => p.id === selectedPreset) || MULTI_MONTH_PRESETS[0];
      return {
        startDate: preset.start,
        endDate: preset.end,
        label: preset.label.toUpperCase(),
      };
    }

    // Custom range
    return {
      startDate: customStartDate || '2026-08-01',
      endDate: customEndDate || '2026-12-31',
      label: `CUSTOM: ${customStartDate} TO ${customEndDate}`,
    };
  }, [rangeMode, selectedMonth, selectedPreset, customStartDate, customEndDate]);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await generateDateRangeMatrix(
        classId,
        activeDateRange.startDate,
        activeDateRange.endDate,
        onlyMarkedDates,
        activeDateRange.label
      );
      setMatrixData(data);
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setLoading(false);
    }
  }, [classId, activeDateRange, onlyMarkedDates]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const filteredStudents = useMemo(() => {
    if (!matrixData) return [];
    const q = search.toLowerCase().trim();
    if (!q) return matrixData.students;
    return matrixData.students.filter(
      (s) =>
        s.regNo.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q)
    );
  }, [matrixData, search]);

  const handleExportExcel = () => {
    if (!matrixData) return;
    try {
      exportMonthlyMatrixExcel(matrixData, useTickMark);
      setExportFeedback(`Exported Register: ${matrixData.monthLabel}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollToRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Multi-Month & Custom Date Range Control Card ── */}
      <Card className="border-slate-200 bg-white shadow-xs print:hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">
                    Period Attendance Register Matrix
                  </h3>
                  <Badge variant="purple" size="sm">
                    {classId}
                  </Badge>
                  {matrixData && (
                    <Badge variant="info" size="sm" className="font-mono">
                      {matrixData.dateColumns.length} Dates ({matrixData.dateColumns.length * 7} Periods)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {classNameTitle} • Complete 7-Period register grid with sticky left names & sticky right totals.
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRangeMode('single_month')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all',
                  rangeMode === 'single_month'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Single Month
              </button>

              <button
                type="button"
                onClick={() => setRangeMode('multi_month')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1',
                  rangeMode === 'multi_month'
                    ? 'bg-white text-indigo-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Month (2–5 Mo)</span>
              </button>

              <button
                type="button"
                onClick={() => setRangeMode('custom_range')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all',
                  rangeMode === 'custom_range'
                    ? 'bg-white text-purple-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* ── Date Filters Row based on Mode ── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
            {/* Mode 1: Single Month Dropdown */}
            {rangeMode === 'single_month' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Month:
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                >
                  {ACADEMIC_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode 2: Multi-Month Presets */}
            {rangeMode === 'multi_month' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide mr-1">
                  Preset:
                </span>
                {MULTI_MONTH_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                      selectedPreset === preset.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {/* Mode 3: Custom Date Range Inputs */}
            {rangeMode === 'custom_range' && (
              <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                <span className="text-slate-700 uppercase">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700 uppercase">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {/* Display Options & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Only Marked vs All Days */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setOnlyMarkedDates(true)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer',
                    onlyMarkedDates
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Working Dates Only
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyMarkedDates(false)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer',
                    !onlyMarkedDates
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  All Calendar Days
                </button>
              </div>

              {/* Symbol Toggle */}
              <button
                type="button"
                onClick={() => setUseTickMark(!useTickMark)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
                title="Toggle between checkmark (✓) and letter code (P)"
              >
                Symbol: <span className="font-mono text-blue-600">{useTickMark ? '✓' : 'P'}</span>
              </button>

              {/* [Export Excel] */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs py-2 px-3 text-xs rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </Button>

              {/* [Print] */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 font-bold shadow-2xs py-2 px-3 text-xs rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </Button>
            </div>
          </div>

          {/* Feedback */}
          {exportFeedback && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportFeedback}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary Overview Bar ── */}
      {matrixData && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:grid-cols-5">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Students
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {matrixData.students.length}
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
              Total Present Hours
            </div>
            <p className="text-2xl font-black text-emerald-800 mt-1">
              {matrixData.totalClassPresentHours}
              <span className="text-xs font-normal text-emerald-600 ml-1">hrs</span>
            </p>
          </div>

          <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
              Total OD Hours
            </div>
            <p className="text-2xl font-black text-amber-800 mt-1">
              {matrixData.totalClassODHours}
              <span className="text-xs font-normal text-amber-600 ml-1">hrs</span>
            </p>
          </div>

          <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wide text-rose-800">
              Total Absent Hours
            </div>
            <p className="text-2xl font-black text-rose-800 mt-1">
              {matrixData.totalClassAbsentHours}
              <span className="text-xs font-normal text-rose-600 ml-1">hrs</span>
            </p>
          </div>

          <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs text-white">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Average Attendance
            </div>
            <p className="text-2xl font-black text-white mt-1">
              {matrixData.totalClassWorkingHours > 0 ? (
                <>
                  {matrixData.classAveragePercentage.toFixed(1)}
                  <span className="text-sm font-normal text-slate-400 ml-0.5">%</span>
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Search & View Navigation Bar (With Right-Side Totals Locking Controls) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search roll no or student name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-medium"
          />
        </div>

        {/* Quick Viewport Navigation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lock / Unlock Sticky Student Names (Left) */}
          <button
            type="button"
            onClick={() => setLockLeftNames(!lockLeftNames)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none',
              lockLeftNames
                ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            )}
            title="Lock or unlock student names on the left side while scrolling"
          >
            {lockLeftNames ? <Pin className="w-3.5 h-3.5 text-blue-600" /> : <PinOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>{lockLeftNames ? 'Names Locked (Left)' : 'Free Scroll (Left)'}</span>
          </button>

          {/* Lock / Unlock Sticky Totals (Right) */}
          <button
            type="button"
            onClick={() => setLockRightTotals(!lockRightTotals)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none',
              lockRightTotals
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            )}
            title="Lock or unlock final totals columns on the right side while scrolling"
          >
            {lockRightTotals ? <Pin className="w-3.5 h-3.5 text-emerald-600" /> : <PinOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>{lockRightTotals ? 'Totals Locked (Right)' : 'Free Scroll (Right)'}</span>
          </button>

          {/* Jump Scroll Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={scrollToLeft}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Jump to left side (Student names & Roll numbers)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Left</span>
            </button>
            <button
              type="button"
              onClick={scrollToRight}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Jump to right side (Totals & Percentage)"
            >
              <span>Right</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Generating attendance register matrix for {activeDateRange.label}…</span>
        </div>
      )}

      {/* ── The Period Grid Matrix Register Table ── */}
      {!loading && matrixData && (
        <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto max-h-[72vh] relative"
          >
            <table className="w-full text-center border-collapse text-xs select-none">
              {/* Header */}
              <thead className="sticky top-0 z-30 bg-slate-100 shadow-xs">
                {/* Level 1 Header: Date Spans */}
                <tr className="border-b border-slate-300 text-slate-700 font-bold uppercase text-[11px]">
                  {/* Leading Fixed Columns (Exact Pixel Positions to Avoid Any Overlap) */}
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-2 w-[44px] min-w-[44px] max-w-[44px] border-r border-slate-300 bg-slate-100 font-mono text-center',
                      lockLeftNames && 'sticky left-0 z-40'
                    )}
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-3 w-[116px] min-w-[116px] max-w-[116px] border-r border-slate-300 bg-slate-100 font-mono text-left whitespace-nowrap',
                      lockLeftNames && 'sticky left-[44px] z-40'
                    )}
                  >
                    Reg No
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-3 w-[180px] min-w-[180px] max-w-[180px] border-r-2 border-slate-400 bg-slate-100 text-left font-bold truncate',
                      lockLeftNames && 'sticky left-[160px] z-40 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                    )}
                  >
                    Student Name
                  </th>

                  {/* Date Header Spans (7 Periods each) */}
                  {matrixData.dateColumns.length === 0 ? (
                    <th colSpan={7} className="py-2.5 px-4 text-center text-slate-400">
                      No dates recorded in this range ({activeDateRange.label})
                    </th>
                  ) : (
                    matrixData.dateColumns.map((col) => (
                      <th
                        key={col.dateStr}
                        colSpan={7}
                        className={cn(
                          'py-1.5 px-1 border-r border-slate-300 text-center font-mono transition-colors',
                          col.isHoliday
                            ? 'bg-rose-100 text-rose-900'
                            : col.hasAttendance
                            ? 'bg-blue-50 text-blue-900'
                            : 'bg-slate-50 text-slate-600'
                        )}
                      >
                        <div className="font-extrabold text-xs tracking-wider">
                          {col.dayMonthLabel}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-500 tracking-tight">
                          {col.dayOfWeek} {col.dayNumber ? `• DO ${col.dayNumber}` : ''}
                        </div>
                      </th>
                    ))
                  )}

                  {/* ── Trailing Summary Sticky Fixed Columns (Locked on Right Side) ── */}
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-2.5 w-[88px] min-w-[88px] max-w-[88px] border-l-2 border-r border-slate-300 bg-emerald-100 text-emerald-950 font-black text-[10px] tracking-tight leading-tight',
                      lockRightTotals && 'sticky right-[244px] z-40 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                    )}
                  >
                    TOTAL PRESENT
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-2 w-[64px] min-w-[64px] max-w-[64px] border-r border-slate-300 bg-slate-200 text-slate-800 font-bold text-[10px]',
                      lockRightTotals && 'sticky right-[180px] z-40'
                    )}
                  >
                    WORKING
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-2 w-[48px] min-w-[48px] max-w-[48px] border-r border-slate-300 bg-amber-100 text-amber-900 font-bold text-[10px]',
                      lockRightTotals && 'sticky right-[132px] z-40'
                    )}
                  >
                    OD
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-2 w-[50px] min-w-[50px] max-w-[50px] border-r border-slate-300 bg-rose-100 text-rose-900 font-bold text-[10px]',
                      lockRightTotals && 'sticky right-[82px] z-40'
                    )}
                  >
                    ABSENT
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-3 w-[82px] min-w-[82px] max-w-[82px] bg-slate-950 text-white font-black text-[10px] text-right',
                      lockRightTotals && 'sticky right-0 z-40'
                    )}
                  >
                    ATTENDANCE %
                  </th>
                </tr>

                {/* Level 2 Header: Periods 1 2 3 4 5 6 7 */}
                <tr className="border-b-2 border-slate-400 bg-slate-100 text-slate-600 text-[10px] font-mono font-extrabold">
                  {matrixData.dateColumns.map((col) => (
                    <React.Fragment key={`${col.dateStr}_periods`}>
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                        <th
                          key={`${col.dateStr}_p${p}`}
                          className={cn(
                            'py-1 px-1 w-7 border-r border-slate-200',
                            p === 7 && 'border-r-slate-300'
                          )}
                        >
                          {p}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              {/* Student Rows */}
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + matrixData.dateColumns.length * 7 + 5}
                      className="py-12 text-center text-slate-500 text-xs"
                    >
                      No attendance records found for {matrixData.monthLabel}.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => {
                    const studentObj = studentMap.get(s.regNo);

                    return (
                      <tr
                        key={s.regNo}
                        onClick={() => studentObj && onSelectStudent && onSelectStudent(studentObj)}
                        className={cn(
                          'transition-colors group hover:bg-blue-50/40',
                          onSelectStudent && 'cursor-pointer'
                        )}
                      >
                        {/* 1. S.No */}
                        <td
                          className={cn(
                            'py-1.5 px-2 w-[44px] min-w-[44px] max-w-[44px] font-mono font-bold text-slate-500 bg-white border-r border-slate-200 text-center text-[11px] group-hover:bg-blue-50/60',
                            lockLeftNames && 'sticky left-0 z-20 bg-white'
                          )}
                        >
                          {s.sNo}
                        </td>

                        {/* 2. Reg No */}
                        <td
                          className={cn(
                            'py-1.5 px-3 w-[116px] min-w-[116px] max-w-[116px] font-mono font-bold text-slate-900 bg-white border-r border-slate-200 text-left whitespace-nowrap text-[11px] group-hover:bg-blue-50/60',
                            lockLeftNames && 'sticky left-[44px] z-20 bg-white'
                          )}
                        >
                          {s.regNo}
                        </td>

                        {/* 3. Student Name */}
                        <td
                          className={cn(
                            'py-1.5 px-3 w-[180px] min-w-[180px] max-w-[180px] font-bold text-slate-900 bg-white border-r-2 border-slate-400 text-left truncate text-xs group-hover:bg-blue-50/60',
                            lockLeftNames && 'sticky left-[160px] z-20 bg-white shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                          )}
                          title={s.studentName}
                        >
                          {s.studentName}
                        </td>

                        {/* 4. Periods for Each Date */}
                        {matrixData.dateColumns.map((col) => (
                          <React.Fragment key={`${s.regNo}_${col.dateStr}`}>
                            {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                              const mark = s.marks[`${col.dateStr}_${p}`];
                              const isP = mark === 'P';
                              const isA = mark === 'A';
                              const isOD = mark === 'OD';

                              return (
                                <td
                                  key={`${s.regNo}_${col.dateStr}_p${p}`}
                                  className={cn(
                                    'py-1 px-0.5 w-7 text-center font-mono font-bold text-[11px] border-r border-slate-100 transition-colors',
                                    p === 7 && 'border-r-slate-300',
                                    isP && 'text-emerald-700 bg-emerald-50/40',
                                    isA && 'text-rose-700 bg-rose-100/70 font-black',
                                    isOD && 'text-amber-800 bg-amber-100/60 font-black',
                                    !mark && col.isHoliday && 'text-slate-300 bg-rose-50/20',
                                    !mark && !col.isHoliday && 'text-slate-300'
                                  )}
                                >
                                  {isP
                                    ? useTickMark
                                      ? '✓'
                                      : 'P'
                                    : isA
                                    ? 'A'
                                    : isOD
                                    ? 'OD'
                                    : col.isHoliday
                                    ? '—'
                                    : '·'}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        ))}

                        {/* ── 5. Sticky Locked Totals on the Right Side ── */}
                        {/* Present Hours */}
                        <td
                          className={cn(
                            'py-1.5 px-2.5 w-[88px] min-w-[88px] max-w-[88px] font-black font-mono text-emerald-950 bg-emerald-50/90 border-l-2 border-r border-slate-300 text-center text-xs group-hover:bg-emerald-100',
                            lockRightTotals && 'sticky right-[244px] z-20 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                          )}
                        >
                          {s.totalPresent}
                        </td>

                        {/* Working Hours */}
                        <td
                          className={cn(
                            'py-1.5 px-2 w-[64px] min-w-[64px] max-w-[64px] font-mono font-bold text-slate-700 bg-slate-100/90 border-r border-slate-200 text-center text-xs group-hover:bg-slate-200',
                            lockRightTotals && 'sticky right-[180px] z-20'
                          )}
                        >
                          {s.totalWorking}
                        </td>

                        {/* OD Hours */}
                        <td
                          className={cn(
                            'py-1.5 px-2 w-[48px] min-w-[48px] max-w-[48px] font-mono font-bold text-amber-900 bg-amber-50/90 border-r border-slate-200 text-center text-xs group-hover:bg-amber-100',
                            lockRightTotals && 'sticky right-[132px] z-20'
                          )}
                        >
                          {s.totalOD}
                        </td>

                        {/* Absent Hours */}
                        <td
                          className={cn(
                            'py-1.5 px-2 w-[50px] min-w-[50px] max-w-[50px] font-mono font-bold text-rose-900 bg-rose-50/90 border-r border-slate-200 text-center text-xs group-hover:bg-rose-100',
                            lockRightTotals && 'sticky right-[82px] z-20'
                          )}
                        >
                          {s.totalAbsent}
                        </td>

                        {/* Attendance % */}
                        <td
                          className={cn(
                            'py-1.5 px-3 w-[82px] min-w-[82px] max-w-[82px] font-mono font-black text-right text-xs bg-slate-100 group-hover:bg-slate-200',
                            lockRightTotals && 'sticky right-0 z-20',
                            s.percentage < 75 ? 'text-rose-700 bg-rose-50' : 'text-slate-900'
                          )}
                        >
                          {s.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
