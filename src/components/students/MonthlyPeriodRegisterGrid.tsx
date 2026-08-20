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
} from 'lucide-react';
import { ClassId } from '../../types';
import { Student } from '../../services/studentService';
import {
  MonthlyMatrixData,
  generateMonthlyMatrix,
  exportMonthlyMatrixExcel,
} from '../../services/monthlyMatrixService';
import { ACADEMIC_MONTHS } from '../../services/monthlyAttendanceService';
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

export const MonthlyPeriodRegisterGrid: React.FC<MonthlyPeriodRegisterGridProps> = ({
  classId,
  classNameTitle,
  students,
  onSelectStudent,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [onlyMarkedDates, setOnlyMarkedDates] = useState<boolean>(true);
  const [useTickMark, setUseTickMark] = useState<boolean>(true);
  const [lockColumns, setLockColumns] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
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

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await generateMonthlyMatrix(classId, selectedMonth, onlyMarkedDates);
      setMatrixData(data);
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setLoading(false);
    }
  }, [classId, selectedMonth, onlyMarkedDates]);

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
      setExportFeedback(`Exported Attendance Register (${matrixData.monthLabel})`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      alert(`Export failed: ${String(err)}`);
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

  const getCellDisplay = (status: string | null) => {
    if (status === 'P') {
      return (
        <span className="text-emerald-700 font-black text-xs font-mono">
          {useTickMark ? '✓' : 'P'}
        </span>
      );
    }
    if (status === 'A') {
      return (
        <span className="text-rose-600 font-black text-xs font-mono">
          A
        </span>
      );
    }
    if (status === 'OD') {
      return (
        <span className="text-amber-700 font-black text-[10px] font-mono">
          OD
        </span>
      );
    }
    return <span className="text-slate-200 text-xs">—</span>;
  };

  const getPercentageBadge = (pct: number, working: number) => {
    if (working === 0) return <span className="text-slate-400 font-mono text-xs italic">—</span>;
    const formatted = `${pct.toFixed(1)}%`;
    if (pct >= 75) {
      return (
        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
          {formatted}
        </span>
      );
    }
    if (pct >= 65) {
      return (
        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
          {formatted}
        </span>
      );
    }
    return (
      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
        {formatted}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Official Register Header Banner Card ── */}
      <Card className="border-slate-200 bg-white shadow-xs print:shadow-none print:border-none">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-xs uppercase tracking-wider">
                  College Register Template
                </span>
                <Badge variant="purple" size="md">
                  {classId}
                </Badge>
              </div>

              {/* Exact user requested banner typography */}
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                {matrixData?.headerBanner || `B.TECH (${classId.slice(0, 3)}) 2025-2029 | II YEAR | III SEM`}
              </h1>
              <h2 className="text-base font-extrabold text-blue-700 uppercase tracking-widest font-mono">
                {matrixData?.monthLabel || 'MONTHLY REGISTER'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {classNameTitle} • Room 245 • 7 Periods / Day • Continuous Rotation Day Order 1–6
              </p>
            </div>

            {/* Actions & Selector Toolbar */}
            <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto print:hidden">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Month:
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {ACADEMIC_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Scope Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setOnlyMarkedDates(true)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition-all text-[11px]',
                    onlyMarkedDates
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Marked Dates
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyMarkedDates(false)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition-all text-[11px]',
                    !onlyMarkedDates
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  All 31 Days
                </button>
              </div>

              {/* Symbol Toggle */}
              <button
                type="button"
                onClick={() => setUseTickMark(!useTickMark)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                title="Toggle between checkmark (✓) and letter code (P)"
              >
                Symbol: <span className="font-mono text-blue-600">{useTickMark ? '✓ / A / OD' : 'P / A / OD'}</span>
              </button>

              {/* [Export Excel] */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs py-2 px-3 text-xs rounded-xl"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel Register</span>
              </Button>

              {/* [Print] */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 font-bold shadow-2xs py-2 px-3 text-xs rounded-xl"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </Button>
            </div>
          </div>

          {/* Feedback */}
          {exportFeedback && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
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
              Total Hours Present
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

      {/* ── Search & View Navigation Bar ── */}
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
          {/* Lock / Unlock Sticky Student Names */}
          <button
            type="button"
            onClick={() => setLockColumns(!lockColumns)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border',
              lockColumns
                ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            )}
            title="Lock or unlock student names column when scrolling horizontally"
          >
            {lockColumns ? <Pin className="w-3.5 h-3.5 text-blue-600" /> : <PinOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>{lockColumns ? 'Names Locked (Left)' : 'Free Scroll'}</span>
          </button>

          {/* Quick Scroll Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={scrollToLeft}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 shadow-2xs"
              title="Jump to left side (Student names & Roll numbers)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Left (Names)</span>
            </button>
            <button
              type="button"
              onClick={scrollToRight}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 shadow-2xs"
              title="Jump to right side (Total hours present & percentage)"
            >
              <span>Right (Totals)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Generating attendance register matrix for {selectedMonth}…</span>
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
                      lockColumns && 'sticky left-0 z-40'
                    )}
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-3 w-[116px] min-w-[116px] max-w-[116px] border-r border-slate-300 bg-slate-100 font-mono text-left whitespace-nowrap',
                      lockColumns && 'sticky left-[44px] z-40'
                    )}
                  >
                    Reg No
                  </th>
                  <th
                    rowSpan={2}
                    className={cn(
                      'py-2.5 px-3 w-[180px] min-w-[180px] max-w-[180px] border-r-2 border-slate-400 bg-slate-100 text-left font-bold truncate',
                      lockColumns && 'sticky left-[160px] z-40 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]'
                    )}
                  >
                    Student Name
                  </th>

                  {/* Date Header Spans (7 Periods each) */}
                  {matrixData.dateColumns.length === 0 ? (
                    <th colSpan={7} className="py-2.5 px-4 text-center text-slate-400">
                      No dates recorded in this month
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

                  {/* Trailing Summary Fixed Columns */}
                  <th
                    rowSpan={2}
                    className="py-2.5 px-2.5 min-w-[85px] border-l-2 border-r border-slate-300 bg-emerald-50 text-emerald-950 font-black text-[10px] tracking-tight leading-tight"
                  >
                    TOTAL HOURS PRESENT
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-2 min-w-[65px] border-r border-slate-300 bg-slate-100 text-slate-700 font-bold text-[10px]"
                  >
                    WORKING
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-2 min-w-[50px] border-r border-slate-300 bg-amber-50 text-amber-900 font-bold text-[10px]"
                  >
                    OD
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-2 min-w-[50px] border-r border-slate-300 bg-rose-50 text-rose-900 font-bold text-[10px]"
                  >
                    ABSENT
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 min-w-[75px] bg-slate-900 text-white font-black text-[10px] text-right"
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
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        {/* S.No */}
                        <td
                          className={cn(
                            'py-2 px-2 w-[44px] min-w-[44px] max-w-[44px] border-r border-slate-200 bg-white group-hover:bg-blue-50 font-mono text-slate-400 text-center font-bold',
                            lockColumns && 'sticky left-0 z-20'
                          )}
                        >
                          {s.sNo}
                        </td>

                        {/* Reg No */}
                        <td
                          className={cn(
                            'py-2 px-3 w-[116px] min-w-[116px] max-w-[116px] border-r border-slate-200 bg-white group-hover:bg-blue-50 font-mono text-slate-900 text-left font-bold whitespace-nowrap',
                            lockColumns && 'sticky left-[44px] z-20'
                          )}
                        >
                          {s.regNo}
                        </td>

                        {/* Student Name */}
                        <td
                          onClick={() => studentObj && onSelectStudent && onSelectStudent(studentObj)}
                          className={cn(
                            'py-2 px-3 w-[180px] min-w-[180px] max-w-[180px] border-r-2 border-slate-400 bg-white group-hover:bg-blue-50 font-bold text-slate-900 text-left truncate',
                            lockColumns && 'sticky left-[160px] z-20 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]',
                            onSelectStudent && 'cursor-pointer hover:text-blue-700 hover:underline'
                          )}
                        >
                          {s.studentName}
                        </td>

                        {/* Period Cells */}
                        {matrixData.dateColumns.map((col) => (
                          <React.Fragment key={`${s.regNo}_${col.dateStr}`}>
                            {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                              const mark = s.marks[`${col.dateStr}_${p}`];
                              return (
                                <td
                                  key={`${s.regNo}_${col.dateStr}_${p}`}
                                  className={cn(
                                    'py-1 px-0.5 border-r border-slate-100 transition-colors text-center',
                                    p === 7 && 'border-r-slate-300',
                                    mark === 'A' && 'bg-rose-50/60',
                                    mark === 'OD' && 'bg-amber-50/60'
                                  )}
                                >
                                  {getCellDisplay(mark)}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        ))}

                        {/* Trailing Total Hours Present */}
                        <td className="py-2 px-2.5 border-l-2 border-r border-slate-200 bg-emerald-50/60 font-mono font-black text-xs text-emerald-800 text-center">
                          {s.totalPresent + s.totalOD}
                        </td>

                        {/* Working Hours */}
                        <td className="py-2 px-2 border-r border-slate-200 font-mono font-semibold text-xs text-slate-700 text-center">
                          {s.totalWorking}
                        </td>

                        {/* OD */}
                        <td className="py-2 px-2 border-r border-slate-200 font-mono font-bold text-xs text-amber-700 text-center">
                          {s.totalOD}
                        </td>

                        {/* Absent */}
                        <td className="py-2 px-2 border-r border-slate-200 font-mono font-bold text-xs text-rose-700 text-center">
                          {s.totalAbsent}
                        </td>

                        {/* Percentage */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {getPercentageBadge(s.percentage, s.totalWorking)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Bottom Aggregate Summary Row */}
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 sticky bottom-0 z-30 text-[11px]">
                <tr>
                  <td
                    colSpan={3}
                    className={cn(
                      'py-3 px-4 w-[340px] min-w-[340px] max-w-[340px] border-r-2 border-slate-400 bg-slate-100 text-left font-black uppercase text-slate-800 tracking-wider',
                      lockColumns && 'sticky left-0 z-40 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]'
                    )}
                  >
                    TOTAL PRESENT / PERIOD
                  </td>

                  {/* Period Counts */}
                  {matrixData.dateColumns.map((col) => (
                    <React.Fragment key={`foot_${col.dateStr}`}>
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                        let presentCount = 0;
                        for (const s of matrixData.students) {
                          const mark = s.marks[`${col.dateStr}_${p}`];
                          if (mark === 'P' || mark === 'OD') presentCount++;
                        }
                        return (
                          <td
                            key={`foot_${col.dateStr}_${p}`}
                            className={cn(
                              'py-2 px-0.5 border-r border-slate-200 font-mono font-extrabold text-[10px] text-slate-700 text-center',
                              p === 7 && 'border-r-slate-300'
                            )}
                          >
                            {presentCount}
                          </td>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* Trailing Aggregates */}
                  <td className="py-2 px-2.5 border-l-2 border-r border-slate-300 bg-emerald-100 font-mono font-black text-xs text-emerald-950 text-center">
                    {matrixData.totalClassPresentHours + matrixData.totalClassODHours}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 font-mono font-bold text-xs text-slate-800 text-center">
                    {matrixData.totalClassWorkingHours}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 font-mono font-bold text-xs text-amber-800 text-center">
                    {matrixData.totalClassODHours}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 font-mono font-bold text-xs text-rose-800 text-center">
                    {matrixData.totalClassAbsentHours}
                  </td>
                  <td className="py-2 px-3 bg-slate-900 text-white font-mono font-black text-xs text-right whitespace-nowrap">
                    {matrixData.totalClassWorkingHours > 0
                      ? `${matrixData.classAveragePercentage.toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
