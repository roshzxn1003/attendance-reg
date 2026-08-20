import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Users,
  Percent,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  CalendarRange,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Student } from '../../services/studentService';
import { ClassId } from '../../types';
import { useMonthlyAttendance } from '../../hooks/useMonthlyAttendance';
import { generateFullAttendanceReport } from '../../services/fullReportService';
import { exportAttendanceToExcel, exportAttendanceToCSV } from '../../lib/exportUtils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';

interface MonthlyAttendanceViewProps {
  classId: ClassId;
  classNameTitle: string;
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

type FilterMode = 'all' | 'low' | 'critical' | 'absent';
type SortKey = 'student_id' | 'student_name' | 'totalWorkingHours' | 'presentHours' | 'odHours' | 'absentHours' | 'percentage';
type SortDir = 'asc' | 'desc';

export const MonthlyAttendanceView: React.FC<MonthlyAttendanceViewProps> = ({
  classId,
  classNameTitle,
  students,
  onSelectStudent,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey>('student_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const {
    selectedMonth,
    setSelectedMonth,
    currentMonthLabel,
    monthlySummaries,
    monthlyOverview,
    academicMonths,
    loading,
  } = useMonthlyAttendance(classId, students, '2026-08');

  // Map student info
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    for (const s of students) {
      map.set(s.student_id, s);
    }
    return map;
  }, [students]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase().trim();

    return monthlySummaries
      .filter((s) => {
        const matchSearch =
          !q ||
          s.student_id.toLowerCase().includes(q) ||
          s.student_name.toLowerCase().includes(q);

        const matchFilter =
          filterMode === 'all' ||
          (filterMode === 'low' && s.totalWorkingHours > 0 && s.percentage < 75) ||
          (filterMode === 'critical' && s.totalWorkingHours > 0 && s.percentage < 65) ||
          (filterMode === 'absent' && s.absentHours > 0);

        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        valA = Number(valA || 0);
        valB = Number(valB || 0);
        return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [monthlySummaries, search, filterMode, sortKey, sortDir]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await generateFullAttendanceReport(classId, {
        month: selectedMonth,
      });
      exportAttendanceToExcel(res.detailedRecords, res.summaryRecords, classId, {
        month: selectedMonth,
      });
      setExportFeedback(`Exported Excel for ${currentMonthLabel}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      alert(`Export failed: ${String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await generateFullAttendanceReport(classId, {
        month: selectedMonth,
      });
      exportAttendanceToCSV(res.detailedRecords, classId, {
        month: selectedMonth,
      });
      setExportFeedback(`Exported CSV for ${currentMonthLabel}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      alert(`Export failed: ${String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const lowCount = monthlySummaries.filter((s) => s.totalWorkingHours > 0 && s.percentage < 75).length;
  const criticalCount = monthlySummaries.filter((s) => s.totalWorkingHours > 0 && s.percentage < 65).length;

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />;
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

  return (
    <div className="space-y-6">
      {/* ── Top Month & Class Selection Header Card ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-slate-900">
                    Monthly Attendance Report — {currentMonthLabel}
                  </h2>
                  <Badge variant="purple" size="sm">
                    {classId}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {classNameTitle} • Semester III (May–Dec 2026)
                </p>
              </div>
            </div>

            {/* Month Selector Dropdown & Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Month:
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {academicMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* [Export Excel] */}
              <Button
                variant="primary"
                size="sm"
                disabled={exporting}
                onClick={handleExportExcel}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs py-2 px-3 text-xs rounded-xl"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </Button>

              {/* [Export CSV] */}
              <Button
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={handleExportCSV}
                className="gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 font-bold shadow-2xs py-2 px-3 text-xs rounded-xl"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {exportFeedback && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportFeedback}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Monthly Overview Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Students */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Total Students</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">
            {monthlyOverview.totalStudents}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Enrolled in {classId}</p>
        </div>

        {/* Average Attendance */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs text-white">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Average %</span>
            <Percent className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">
            {monthlyOverview.totalWorkingHours > 0 ? (
              <>
                {monthlyOverview.averageAttendance.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-0.5">%</span>
              </>
            ) : (
              <span className="text-sm font-normal text-slate-400 italic">—</span>
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Class average</p>
        </div>

        {/* Total Working Hours */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Working Hours</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">
            {monthlyOverview.totalWorkingHours}
            <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">In {currentMonthLabel}</p>
        </div>

        {/* Present Hours */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wide">
            <span>Present (P)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-800 mt-2">
            {monthlyOverview.totalPresent}
            <span className="text-xs font-normal text-emerald-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">Total attended</p>
        </div>

        {/* OD Hours */}
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wide">
            <span>On Duty (OD)</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-800 mt-2">
            {monthlyOverview.totalOD}
            <span className="text-xs font-normal text-amber-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-amber-700 mt-1">On duty hours</p>
        </div>

        {/* Absent Hours */}
        <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wide">
            <span>Absent (A)</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-800 mt-2">
            {monthlyOverview.totalAbsent}
            <span className="text-xs font-normal text-rose-600 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-rose-700 mt-1">Total missed</p>
        </div>
      </div>

      {/* ── Search & Filters Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student by roll no or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-colors text-[11px]',
              filterMode === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            All Students ({monthlySummaries.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('low')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-colors text-[11px] flex items-center gap-1',
              filterMode === 'low'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>&lt; 75% Shortage ({lowCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('critical')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-colors text-[11px] flex items-center gap-1',
              filterMode === 'critical'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            )}
          >
            <span>&lt; 65% Critical ({criticalCount})</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Computing monthly attendance for {currentMonthLabel}…</span>
        </div>
      )}

      {/* ── Monthly Student Attendance Table ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {currentMonthLabel} Attendance Roster — {classNameTitle}
              </CardTitle>
              <CardDescription>
                Dynamic calculation: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">(Present + OD) / Working × 100</code>
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
                    onClick={() => handleSort('student_id')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Roll No</span>
                      <SortIcon col="student_id" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 font-bold"
                    onClick={() => handleSort('student_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Student Name</span>
                      <SortIcon col="student_name" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold"
                    onClick={() => handleSort('totalWorkingHours')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Working Hours</span>
                      <SortIcon col="totalWorkingHours" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold text-emerald-800"
                    onClick={() => handleSort('presentHours')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Present (P)</span>
                      <SortIcon col="presentHours" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold text-amber-800"
                    onClick={() => handleSort('odHours')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>OD</span>
                      <SortIcon col="odHours" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold text-rose-800"
                    onClick={() => handleSort('absentHours')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Absent (A)</span>
                      <SortIcon col="absentHours" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 font-bold"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Attendance %</span>
                      <SortIcon col="percentage" />
                    </div>
                  </th>

                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                      No records found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((s, idx) => {
                    const studentObj = studentMap.get(s.student_id);

                    return (
                      <tr
                        key={s.student_id}
                        onClick={() => studentObj && onSelectStudent(studentObj)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-3 text-center text-slate-400 text-xs font-mono">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                          {s.student_id}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block group-hover:text-blue-700 transition-colors">
                            {s.student_name}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                          {s.totalWorkingHours}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-emerald-700">
                          {s.presentHours}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-amber-700">
                          {s.odHours}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-rose-700">
                          {s.absentHours}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {getPercentageBadge(s.percentage, s.totalWorkingHours)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {studentObj && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectStudent(studentObj);
                              }}
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
    </div>
  );
};
