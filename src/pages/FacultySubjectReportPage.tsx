import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useApp } from '../context/AppContext';
import { ClassId } from '../types';
import { ACADEMIC_MONTHS } from '../services/monthlyAttendanceService';
import {
  FacultySubjectReportData,
  getAvailableSubjectsForClass,
  generateFacultySubjectReport,
  exportFacultySubjectExcel,
  exportFacultySubjectCSV,
} from '../services/facultySubjectReportService';
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  Layers,
  Printer,
  RefreshCw,
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { cn } from '../lib/utils';

type ViewDisplayMode = 'matrix' | 'summary' | 'sessions';
type RangeMode = 'semester' | 'month' | 'custom';

export const FacultySubjectReportPage: React.FC = () => {
  const { selectedClass, setSelectedClassId } = useApp();

  const availableSubjects = useMemo(
    () => getAvailableSubjectsForClass(selectedClass.id),
    [selectedClass.id]
  );

  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>(() => {
    return availableSubjects[0]?.shortForm || 'OS';
  });

  // Keep subject in sync if class changes
  useEffect(() => {
    const list = getAvailableSubjectsForClass(selectedClass.id);
    if (!list.some((s) => s.shortForm === selectedSubjectKey)) {
      setSelectedSubjectKey(list[0]?.shortForm || 'OS');
    }
  }, [selectedClass.id, selectedSubjectKey]);

  // Date Filters
  const [rangeMode, setRangeMode] = useState<RangeMode>('semester');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-12-31');

  // Table Filters & Display
  const [defaulterFilter, setDefaulterFilter] = useState<'all' | 'eligible' | 'warning' | 'critical'>('all');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewDisplayMode>('matrix');
  const [useTickMarks, setUseTickMarks] = useState<boolean>(true);

  // Data Loading State
  const [reportData, setReportData] = useState<FacultySubjectReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      let startDate = '2026-07-01';
      let endDate = '2026-12-31';
      let monthParam: string | undefined = undefined;

      if (rangeMode === 'month') {
        monthParam = selectedMonth;
      } else if (rangeMode === 'custom') {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        // semester preset
        startDate = '2026-07-01';
        endDate = '2026-12-31';
      }

      const data = await generateFacultySubjectReport(selectedClass.id, {
        subjectKey: selectedSubjectKey,
        startDate,
        endDate,
        month: monthParam,
        defaulterFilter,
        search,
      });

      setReportData(data);
    } catch (err) {
      console.error('Failed to generate faculty subject report:', err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedClass.id,
    selectedSubjectKey,
    rangeMode,
    selectedMonth,
    customStartDate,
    customEndDate,
    defaulterFilter,
    search,
  ]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const activeSubject = useMemo(() => {
    return (
      availableSubjects.find((s) => s.shortForm === selectedSubjectKey) ||
      availableSubjects[0]
    );
  }, [availableSubjects, selectedSubjectKey]);

  // Handlers for Export & Print
  const handleExportExcel = () => {
    if (!reportData) return;
    setExportFeedback('Exporting Official Faculty Register Excel...');
    exportFacultySubjectExcel(reportData);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    setExportFeedback('Exporting CSV...');
    exportFacultySubjectCSV(reportData);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-3">
      {/* ── Page Header ── */}
      <div className="print:hidden">
        <PageHeader
          title="Faculty Subject Attendance Portal"
          subtitle="Generate, review, and export official period-by-period attendance registers, eligibility percentages, and session logs for your assigned subjects."
          badge="Faculty & CR Tools"
        />
      </div>

      {/* ── Subject & Class Filter Card ── */}
      <Card className="border-slate-200 bg-white shadow-xs print:hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            {/* Subject Selector */}
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Select Subject:</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {availableSubjects.map((subj) => {
                  const isSelected = subj.shortForm === selectedSubjectKey;
                  return (
                    <button
                      key={subj.shortForm}
                      type="button"
                      onClick={() => setSelectedSubjectKey(subj.shortForm)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      )}
                    >
                      <span>{subj.shortForm}</span>
                      {subj.isLab && (
                        <span
                          className={cn(
                            'text-[9px] px-1 py-0.2 rounded font-black',
                            isSelected
                              ? 'bg-blue-800 text-blue-100'
                              : 'bg-purple-100 text-purple-700'
                          )}
                        >
                          LAB
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Class Selector Switcher */}
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <span className="text-xs font-bold text-slate-500">Class:</span>
              {(['CSE-25', 'AIDS-25'] as ClassId[]).map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setSelectedClassId(cid)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                    selectedClass.id === cid
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {cid}
                </button>
              ))}
            </div>
          </div>

          {/* Active Subject Meta Details Banner */}
          {activeSubject && (
            <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                  {activeSubject.shortForm.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900">
                      {activeSubject.name}
                    </h3>
                    <Badge variant="purple" size="sm">
                      {activeSubject.code}
                    </Badge>
                    {activeSubject.isLab && (
                      <Badge variant="info" size="sm">
                        Practical / Lab
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Faculty In-Charge: <strong>{activeSubject.facultyName}</strong> • {activeSubject.hoursPerWeek} hrs/week
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadReport}
                  isLoading={loading}
                  className="gap-1 text-xs font-bold border-slate-300 py-1.5"
                  title="Reload subject attendance"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          )}

          {/* ── Date Range & Defaulter Filters ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Range Mode */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Date Range Filter:
              </label>
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRangeMode('semester')}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer',
                    rangeMode === 'semester'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Full Semester
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode('month')}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer',
                    rangeMode === 'month'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode('custom')}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer',
                    rangeMode === 'custom'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Secondary Date Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {rangeMode === 'month'
                  ? 'Select Month:'
                  : rangeMode === 'custom'
                  ? 'Custom Date Interval:'
                  : 'Active Window:'}
              </label>
              {rangeMode === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {ACADEMIC_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}

              {rangeMode === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full text-[11px] font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5"
                  />
                  <span className="text-slate-400 text-xs font-bold">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full text-[11px] font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5"
                  />
                </div>
              )}

              {rangeMode === 'semester' && (
                <div className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  August 2026 – December 2026 (Sem III)
                </div>
              )}
            </div>

            {/* Defaulter Cutoff Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Eligibility / Defaulter Filter:
              </label>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'eligible', label: '≥ 75%' },
                  { key: 'warning', label: '65–74%' },
                  { key: 'critical', label: '< 65%' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDefaulterFilter(key as any)}
                    className={cn(
                      'flex-1 py-1.5 px-1.5 rounded-lg transition-all text-center text-[11px] cursor-pointer',
                      defaulterFilter === key
                        ? key === 'critical'
                          ? 'bg-rose-600 text-white shadow-2xs font-black'
                          : key === 'warning'
                          ? 'bg-amber-500 text-white shadow-2xs font-black'
                          : 'bg-white text-blue-700 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Metric Cards ── */}
      {reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          {/* Total Sessions Held */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Sessions Held</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {reportData.totalSessionsHeld}
              <span className="text-xs font-normal text-slate-400 ml-1">periods</span>
            </p>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
              {reportData.dateLabel}
            </span>
          </div>

          {/* Average Attendance % */}
          <div className="p-4 bg-slate-900 text-white border border-slate-800 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Class Average</span>
              <GraduationCap className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {reportData.classAveragePercentage.toFixed(1)}%
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              In {reportData.subject.shortForm}
            </span>
          </div>

          {/* Eligible (>= 75%) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <span>Eligible (≥ 75%)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
              {reportData.eligibleCount}
              <span className="text-xs font-normal text-emerald-600 ml-1">students</span>
            </p>
            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
              Ready for Semester Exam
            </span>
          </div>

          {/* Shortage Defaulters (< 75%) */}
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800 uppercase tracking-wider">
              <span>Shortage (&lt; 75%)</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-800 mt-1">
              {reportData.warningCount + reportData.criticalCount}
              <span className="text-xs font-normal text-rose-600 ml-1">students</span>
            </p>
            <span className="text-[10px] text-rose-700 font-semibold mt-0.5 block">
              {reportData.criticalCount} Critical (&lt; 65%)
            </span>
          </div>
        </div>
      )}

      {/* ── Toolbar: Search, View Mode, Export & Print ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs print:hidden">
        {/* Left: View Mode Tabs & Search */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                viewMode === 'matrix'
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Register Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                viewMode === 'summary'
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student Summary</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('sessions')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                viewMode === 'sessions'
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Session Log</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Right: Export & Print Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          {/* Tick Symbol Toggle */}
          {viewMode === 'matrix' && (
            <button
              type="button"
              onClick={() => setUseTickMarks(!useTickMarks)}
              className={cn(
                'px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                useTickMarks
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              )}
              title="Toggle symbol mode (✓ vs P)"
            >
              <span>{useTickMarks ? '✓ / A' : 'P / A'}</span>
            </button>
          )}

          {/* Export Excel */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-xl shadow-xs cursor-pointer"
            title="Download formatted multi-sheet university attendance workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-slate-700 border-slate-300 text-xs font-bold py-1.5 rounded-xl cursor-pointer"
            title="Download CSV roster"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </Button>

          {/* Print Register */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-slate-700 border-slate-300 text-xs font-bold py-1.5 rounded-xl cursor-pointer hidden md:flex"
            title="Print official register"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {exportFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PRINT BANNER (Visible ONLY when printing)
         ════════════════════════════════════════════════════════════════════════ */}
      {reportData && (
        <div className="hidden print:block text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-base font-black uppercase tracking-wider">
            ST. PETER'S INSTITUTE OF HIGHER EDUCATION AND RESEARCH
          </h1>
          <h2 className="text-xs font-bold uppercase tracking-wide mt-0.5">
            Faculty Subject Period Attendance Register (Class Room 245)
          </h2>
          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-1 border-t border-slate-300">
            <span>
              <strong>Class:</strong> {reportData.classNameTitle} ({reportData.classId})
            </span>
            <span>
              <strong>Subject:</strong> {reportData.subject.code} - {reportData.subject.name} (
              {reportData.subject.shortForm})
            </span>
            <span>
              <strong>Faculty:</strong> {reportData.subject.facultyName}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
            <span>
              <strong>Range:</strong> {reportData.dateLabel}
            </span>
            <span>
              <strong>Total Sessions Held:</strong> {reportData.totalSessionsHeld}
            </span>
            <span>
              <strong>Class Avg %:</strong> {reportData.classAveragePercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW 1: SUBJECT REGISTER MATRIX (Period Grid Table)
         ════════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'matrix' && reportData && (
        <Card className="border-slate-200 bg-white shadow-xs overflow-hidden rounded-2xl print:border-black print:rounded-none">
          <div className="overflow-x-auto" ref={scrollRef}>
            <table className="w-full text-xs text-left border-collapse select-none">
              {/* Table Header */}
              <thead>
                {/* Header Row 1: Session Dates & Super Headers */}
                <tr className="bg-slate-900 text-white font-extrabold border-b border-slate-800 text-[11px]">
                  <th className="py-2 px-1 sm:py-2.5 sm:px-2 w-[32px] min-w-[32px] max-w-[32px] sm:w-[44px] sm:min-w-[44px] sm:max-w-[44px] text-center sticky left-0 z-20 bg-slate-900 border-r border-slate-800 font-mono text-[10px] sm:text-[11px]">
                    No
                  </th>
                  <th className="hidden sm:table-cell py-2.5 px-3 w-[116px] min-w-[116px] max-w-[116px] sm:sticky sm:left-[44px] z-20 bg-slate-900 border-r border-slate-800 font-mono text-left whitespace-nowrap">
                    Reg No
                  </th>
                  <th className="py-2 px-1.5 sm:py-2.5 sm:px-3 w-[110px] min-w-[110px] max-w-[110px] sm:w-[180px] sm:min-w-[180px] sm:max-w-[180px] sticky left-[32px] sm:left-[160px] z-20 bg-slate-900 border-r border-slate-800 text-left text-[11px] sm:text-xs truncate shadow-[3px_0_6px_-2px_rgba(0,0,0,0.3)]">
                    Student Name
                  </th>

                  {/* Session Date Columns */}
                  {reportData.sessions.length === 0 ? (
                    <th className="py-2.5 px-4 text-center text-slate-400 italic">
                      No attendance sessions recorded for {reportData.subject.shortForm} in this date range.
                    </th>
                  ) : (
                    reportData.sessions.map((sess) => {
                      const [, m, d] = sess.date.split('-');
                      return (
                        <th
                          key={sess.sessionKey}
                          className="py-2 px-2 text-center min-w-[46px] border-r border-slate-800 font-mono font-bold text-[10px]"
                        >
                          <div>{d}/{m}</div>
                          <div className="text-[9px] text-blue-300 font-normal">
                            P{sess.period_number}
                          </div>
                        </th>
                      );
                    })
                  )}

                  {/* Totals Summary Super Columns */}
                  <th className="py-2.5 px-2 text-center min-w-[50px] bg-slate-950 border-r border-slate-800 text-slate-300">
                    HELD
                  </th>
                  <th className="py-2.5 px-2 text-center min-w-[50px] bg-slate-950 border-r border-slate-800 text-emerald-400">
                    PRES
                  </th>
                  <th className="py-2.5 px-2 text-center min-w-[44px] bg-slate-950 border-r border-slate-800 text-amber-400">
                    OD
                  </th>
                  <th className="py-2.5 px-2 text-center min-w-[50px] bg-slate-950 border-r border-slate-800 text-rose-400">
                    ABS
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[65px] bg-slate-950 border-r border-slate-800 text-cyan-300">
                    ATT %
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[85px] bg-slate-950 text-slate-300">
                    STATUS
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {reportData.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9 + reportData.sessions.length}
                      className="py-12 text-center text-slate-400 text-xs"
                    >
                      No students found matching current search and filter.
                    </td>
                  </tr>
                ) : (
                  reportData.students.map((student, idx) => {
                    return (
                      <tr
                        key={student.student_id}
                        className={cn(
                          'hover:bg-blue-50/40 transition-colors',
                          student.status === 'critical' && 'bg-rose-50/20',
                          student.status === 'warning' && 'bg-amber-50/20',
                          idx % 2 === 1 && 'bg-slate-50/40'
                        )}
                      >
                        {/* No */}
                        <td className="py-2 px-1 sm:px-2 w-[32px] min-w-[32px] max-w-[32px] sm:w-[44px] sm:min-w-[44px] sm:max-w-[44px] text-center text-[10px] font-mono text-slate-400 sticky left-0 z-10 bg-white border-r border-slate-200">
                          {student.sNo}
                        </td>

                        {/* Reg No */}
                        <td className="hidden sm:table-cell py-2 px-3 w-[116px] min-w-[116px] max-w-[116px] font-mono font-bold text-[11px] text-slate-900 sm:sticky sm:left-[44px] z-10 bg-white border-r border-slate-200 whitespace-nowrap text-left">
                          {student.student_id}
                        </td>

                        {/* Student Name */}
                        <td className="py-1.5 px-1.5 sm:py-2 sm:px-3 w-[110px] min-w-[110px] max-w-[110px] sm:w-[180px] sm:min-w-[180px] sm:max-w-[180px] font-bold text-slate-900 sticky left-[32px] sm:left-[160px] z-10 bg-white border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] text-left">
                          <div className="truncate font-bold text-[11px] sm:text-xs">
                            {student.student_name}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono truncate sm:hidden leading-none mt-0.5">
                            {student.student_id}
                          </div>
                        </td>

                        {/* Session Marks */}
                        {reportData.sessions.map((sess) => {
                          const mark = student.sessionMarks[sess.sessionKey];

                          return (
                            <td
                              key={sess.sessionKey}
                              className={cn(
                                'py-2 px-1 text-center font-black text-xs border-r border-slate-100 font-mono',
                                mark === 'P' && 'text-emerald-700 bg-emerald-50/40',
                                mark === 'A' && 'text-rose-700 bg-rose-100/70 font-extrabold',
                                mark === 'OD' && 'text-amber-800 bg-amber-100/70',
                                !mark && 'text-slate-300'
                              )}
                            >
                              {mark === 'P'
                                ? useTickMarks
                                  ? '✓'
                                  : 'P'
                                : mark === 'A'
                                ? 'A'
                                : mark === 'OD'
                                ? 'OD'
                                : '—'}
                            </td>
                          );
                        })}

                        {/* Held */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200 bg-slate-50/80">
                          {student.totalHeld}
                        </td>

                        {/* Present */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 border-r border-slate-200 bg-emerald-50/30">
                          {student.presentHours}
                        </td>

                        {/* OD */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-amber-700 border-r border-slate-200 bg-amber-50/30">
                          {student.odHours}
                        </td>

                        {/* Absent */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-rose-700 border-r border-slate-200 bg-rose-50/30">
                          {student.absentHours}
                        </td>

                        {/* Percentage */}
                        <td className="py-2 px-3 text-center font-mono font-black text-xs border-r border-slate-200 bg-slate-50/80">
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[11px]',
                              student.percentage >= 75.0
                                ? 'text-emerald-800 bg-emerald-100/70'
                                : student.percentage >= 65.0
                                ? 'text-amber-800 bg-amber-100 font-black'
                                : 'text-rose-900 bg-rose-200 font-black'
                            )}
                          >
                            {student.percentage.toFixed(1)}%
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {student.percentage >= 75.0 ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Eligible
                            </span>
                          ) : student.percentage >= 65.0 ? (
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                              Warning
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                              Debarred
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary & Legend */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-700">Legend:</span>
              <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present (P / ✓)
              </span>
              <span className="inline-flex items-center gap-1 text-rose-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent (A)
              </span>
              <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> On Duty (OD)
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Showing {reportData.students.length} students across {reportData.sessions.length} sessions
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW 2: STUDENT SUMMARY CARDS & TABLE
         ════════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'summary' && reportData && (
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3 font-mono">Register No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-3 text-center">Classes Held</th>
                    <th className="py-3 px-3 text-center">Attended (P+OD)</th>
                    <th className="py-3 px-3 text-center">Absent Hours</th>
                    <th className="py-3 px-3 text-center">OD Hours</th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                    <th className="py-3 px-4 text-center">University Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.students.map((student) => (
                    <tr
                      key={student.student_id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        student.status === 'critical' && 'bg-rose-50/30',
                        student.status === 'warning' && 'bg-amber-50/30'
                      )}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {student.sNo}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {student.student_id}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {student.student_name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {student.totalHeld}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {student.presentHours + student.odHours}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                        {student.absentHours}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                        {student.odHours}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={cn(
                            'font-mono font-black px-2 py-0.5 rounded text-xs',
                            student.percentage >= 75.0
                              ? 'text-emerald-800 bg-emerald-100/70'
                              : student.percentage >= 65.0
                              ? 'text-amber-800 bg-amber-100 font-black'
                              : 'text-rose-900 bg-rose-200 font-black'
                          )}
                        >
                          {student.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {student.percentage >= 75.0 ? (
                          <Badge variant="success" size="sm">
                            Eligible
                          </Badge>
                        ) : student.percentage >= 65.0 ? (
                          <Badge variant="warning" size="sm">
                            Condonation Warning
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm">
                            Debarred (&lt; 65%)
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW 3: SESSION AUDIT LOG (Chronological Periods)
         ════════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'sessions' && reportData && (
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{reportData.subject.name} ({reportData.subject.shortForm}) — Chronological Session Register</span>
            </h3>

            {reportData.sessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No sessions found for this subject in the selected date range.
              </p>
            ) : (
              <div className="space-y-2.5">
                {reportData.sessions.map((sess, idx) => {
                  const total = sess.presentCount + sess.absentCount + sess.odCount;
                  const pct = total > 0 ? (((sess.presentCount + sess.odCount) / total) * 100).toFixed(1) : '0.0';

                  return (
                    <div
                      key={sess.sessionKey}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {sess.date}
                            </span>
                            <Badge variant="purple" size="sm">
                              Day Order {sess.day_number}
                            </Badge>
                            <Badge variant="info" size="sm">
                              Period {sess.period_number}
                            </Badge>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ({sess.time_range})
                            </span>
                          </div>

                          {sess.absenteeStudentNames.length > 0 ? (
                            <p className="text-xs text-rose-700 mt-1">
                              <strong>Absentees ({sess.absentCount}):</strong> {sess.absenteeStudentNames.join(', ')}
                            </p>
                          ) : (
                            <p className="text-xs text-emerald-700 mt-1 font-semibold">
                              ✓ 100% Attendance (All students attended)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Session Stats */}
                      <div className="flex items-center gap-2 self-start md:self-auto shrink-0 text-xs">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
                          P: {sess.presentCount}
                        </span>
                        <span className="px-2 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg">
                          A: {sess.absentCount}
                        </span>
                        {sess.odCount > 0 && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg">
                            OD: {sess.odCount}
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-slate-900 text-white font-black rounded-lg">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FacultySubjectReportPage;
