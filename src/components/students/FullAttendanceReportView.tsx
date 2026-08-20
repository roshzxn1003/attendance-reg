import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Table,
  Layers,
  AlertTriangle,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Student } from '../../services/studentService';
import { ClassId, AttendanceStatus } from '../../types';
import { useFullReport } from '../../hooks/useFullReport';
import { exportAttendanceToExcel, exportAttendanceToCSV } from '../../lib/exportUtils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { cn, formatDate } from '../../lib/utils';

interface FullAttendanceReportViewProps {
  classId: ClassId;
  classNameTitle: string;
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

export const FullAttendanceReportView: React.FC<FullAttendanceReportViewProps> = ({
  classId,
  classNameTitle,
  students,
  onSelectStudent,
}) => {
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const {
    viewMode,
    setViewMode,
    month,
    setMonth,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    studentId,
    setStudentId,
    subject,
    setSubject,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    resetFilters,
    filterOptions,
    detailedRecords,
    allFilteredDetailedRecords,
    totalDetailedCount,
    detailedSortKey,
    detailedSortDir,
    handleDetailedSort,
    summaryRecords,
    summarySortKey,
    summarySortDir,
    handleSummarySort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    stats,
    availableSubjects,
    academicMonths,
    loading,
  } = useFullReport(classId, students);

  const hasActiveFilters =
    month !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    studentId !== 'all' ||
    subject !== 'all' ||
    status !== 'all' ||
    searchQuery !== '';

  const handleExportExcel = () => {
    try {
      exportAttendanceToExcel(allFilteredDetailedRecords, summaryRecords, classId, filterOptions);
      setExportFeedback(`Exported Excel: ${allFilteredDetailedRecords.length} records, ${summaryRecords.length} students`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      alert(`Export failed: ${String(err)}`);
    }
  };

  const handleExportCSV = () => {
    try {
      exportAttendanceToCSV(allFilteredDetailedRecords, classId, filterOptions);
      setExportFeedback(`Exported CSV: ${allFilteredDetailedRecords.length} records`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      alert(`Export failed: ${String(err)}`);
    }
  };

  const getStatusBadge = (st: AttendanceStatus) => {
    switch (st) {
      case 'P':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Present (P)
          </span>
        );
      case 'A':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Absent (A)
          </span>
        );
      case 'OD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            On Duty (OD)
          </span>
        );
    }
  };

  const getPercentageBadge = (percentage: number, workingHours: number) => {
    if (workingHours === 0) {
      return <span className="text-slate-400 font-mono text-xs italic">—</span>;
    }

    const formatted = `${percentage.toFixed(1)}%`;

    if (percentage >= 75) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {formatted}
        </span>
      );
    }
    if (percentage >= 65) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3 h-3" />
          {formatted}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
        <AlertTriangle className="w-3 h-3" />
        {formatted}
      </span>
    );
  };

  const DetailedSortIcon = ({ col }: { col: string }) => {
    if (detailedSortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return detailedSortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  const SummarySortIcon = ({ col }: { col: string }) => {
    if (summarySortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return summarySortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  const startRecordNum = (currentPage - 1) * pageSize + 1;
  const endRecordNum = Math.min(currentPage * pageSize, totalDetailedCount);

  return (
    <div className="space-y-6">
      {/* ── Top Header & Export Actions ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-slate-900">
                    Full Attendance Audit Report
                  </h2>
                  <Badge variant="purple" size="sm">
                    {classId}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {classNameTitle} • Directly resolved from attendance, timetable & day_cycle_log
                </p>
              </div>
            </div>

            {/* Mode Switcher & Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
              {/* Mode Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('detailed')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all',
                    viewMode === 'detailed'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Table className="w-3.5 h-3.5 text-blue-600" />
                  <span>Detailed Log</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('summary')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all',
                    viewMode === 'summary'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Summary</span>
                </button>
              </div>

              {/* [Export Excel] */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs py-2 px-3.5 text-xs rounded-xl"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </Button>

              {/* [Export CSV] */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 font-bold shadow-2xs py-2 px-3.5 text-xs rounded-xl"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Export Feedback Toast */}
          {exportFeedback && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportFeedback}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Records */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Total Records</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats.totalRecords}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {stats.uniqueDatesCount} dates
          </p>
        </div>

        {/* Attendance % */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs text-white">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Attendance %</span>
            <Percent className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">
            {stats.totalRecords > 0 ? (
              <>
                {stats.attendancePercentage.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-0.5">%</span>
              </>
            ) : (
              <span className="text-sm font-normal text-slate-400 italic">—</span>
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">(P + OD) / Total</p>
        </div>

        {/* Present (P) */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wide">
            <span>Present (P)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-800 mt-2">
            {stats.presentCount}
            <span className="text-xs font-normal text-emerald-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">Attended hours</p>
        </div>

        {/* OD */}
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wide">
            <span>On Duty (OD)</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-800 mt-2">
            {stats.odCount}
            <span className="text-xs font-normal text-amber-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-amber-700 mt-1">On duty hours</p>
        </div>

        {/* Absent */}
        <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wide">
            <span>Absent (A)</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-800 mt-2">
            {stats.absentCount}
            <span className="text-xs font-normal text-rose-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-rose-700 mt-1">Missed hours</p>
        </div>

        {/* Unique Students */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Students</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">
            {stats.uniqueStudentsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Active in report</p>
        </div>
      </div>

      {/* ── Multi-Dimensional Filter Toolbar ── */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Report Filter Controls
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Search Student or Subject
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Roll no, name, subject…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Months</option>
                {academicMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Students ({students.length})</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_id} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* From Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Status Pills */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Status
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'P', 'A', 'OD'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                      status === st
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {st === 'all'
                      ? 'All'
                      : st === 'P'
                      ? 'Present (P)'
                      : st === 'A'
                      ? 'Absent (A)'
                      : 'OD'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="py-10 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Generating full attendance report…</span>
        </div>
      )}

      {/* ── Table View: 1. Detailed Records Mode ── */}
      {!loading && viewMode === 'detailed' && (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-600" />
                  Detailed Period Records Log — {classNameTitle}
                </CardTitle>
                <CardDescription>
                  Every individual period attendance entry with Day Order, subject, and timestamp.
                </CardDescription>
              </div>

              {totalDetailedCount > 0 && (
                <div className="text-xs text-slate-500 font-mono">
                  Showing {startRecordNum}–{endRecordNum} of {totalDetailedCount} records
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50 select-none">
                    <th className="py-3 px-3 w-10 text-center">#</th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleDetailedSort('student_id')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Roll No</span>
                        <DetailedSortIcon col="student_id" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleDetailedSort('student_name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Name</span>
                        <DetailedSortIcon col="student_name" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleDetailedSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <DetailedSortIcon col="date" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleDetailedSort('day_number')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Day Number</span>
                        <DetailedSortIcon col="day_number" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleDetailedSort('period_number')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Period & Timing</span>
                        <DetailedSortIcon col="period_number" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleDetailedSort('subject')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Subject</span>
                        <DetailedSortIcon col="subject" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleDetailedSort('status')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Status</span>
                        <DetailedSortIcon col="status" />
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {detailedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No attendance records found</p>
                        <p className="mt-0.5">Try widening your date range or clearing filters.</p>
                      </td>
                    </tr>
                  ) : (
                    detailedRecords.map((r, idx) => (
                      <tr
                        key={r.attendance_id}
                        className={cn(
                          'hover:bg-slate-50/70 transition-colors',
                          r.status === 'A' && 'bg-rose-50/20'
                        )}
                      >
                        <td className="py-3 px-3 text-center text-slate-400 text-xs font-mono">
                          {startRecordNum + idx}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                          {r.student_id}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {r.student_name}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {r.date}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatDate(r.date)}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="info" size="sm">
                            Day Order {r.day_number}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-xs text-slate-800">
                            Period {r.period_number}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {r.time_range}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-black text-slate-900 text-xs">
                            {r.subject}
                          </span>
                          {r.subject.includes('LAB') && (
                            <Badge variant="purple" size="sm" className="ml-1.5 text-[10px]">
                              Lab
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="gap-1 px-3 py-1 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </Button>

                  <span className="font-mono font-bold text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="gap-1 px-3 py-1 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Table View: 2. Summary Mode ── */}
      {!loading && viewMode === 'summary' && (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Aggregate Summary View — {classNameTitle}
                </CardTitle>
                <CardDescription>
                  Aggregated working hours and percentages for the current filter selection.
                </CardDescription>
              </div>
              <Badge variant="purple" size="md">
                {classId}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50 select-none">
                    <th className="py-3 px-3 w-10 text-center">#</th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleSummarySort('student_id')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Roll No</span>
                        <SummarySortIcon col="student_id" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleSummarySort('student_name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Student Name</span>
                        <SummarySortIcon col="student_name" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleSummarySort('totalWorkingHours')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Working</span>
                        <SummarySortIcon col="totalWorkingHours" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold text-emerald-800"
                      onClick={() => handleSummarySort('presentHours')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Present</span>
                        <SummarySortIcon col="presentHours" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold text-amber-800"
                      onClick={() => handleSummarySort('odHours')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>OD</span>
                        <SummarySortIcon col="odHours" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold text-rose-800"
                      onClick={() => handleSummarySort('absentHours')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Absent</span>
                        <SummarySortIcon col="absentHours" />
                      </div>
                    </th>

                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 font-bold"
                      onClick={() => handleSummarySort('percentage')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Attendance %</span>
                        <SummarySortIcon col="percentage" />
                      </div>
                    </th>

                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {summaryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                        No student records match filter.
                      </td>
                    </tr>
                  ) : (
                    summaryRecords.map((s, idx) => {
                      const studentObj = students.find((st) => st.student_id === s.student_id);

                      return (
                        <tr
                          key={s.student_id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-3 text-center text-slate-400 text-xs font-mono">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                            {s.student_id}
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {s.student_name}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                            {s.totalWorkingHours}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-xs font-bold text-emerald-700">
                            {s.presentHours}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-xs font-bold text-amber-700">
                            {s.odHours}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-xs font-bold text-rose-700">
                            {s.absentHours}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {getPercentageBadge(s.percentage, s.totalWorkingHours)}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {studentObj && (
                              <button
                                type="button"
                                onClick={() => onSelectStudent(studentObj)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <span>Profile</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
