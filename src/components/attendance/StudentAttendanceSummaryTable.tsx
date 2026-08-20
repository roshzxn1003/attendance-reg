import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { StudentAttendanceSummary, ClassId } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { cn } from '../../lib/utils';

interface StudentAttendanceSummaryTableProps {
  classId: ClassId;
  classNameTitle: string;
  date: string;
  todaySummaries: StudentAttendanceSummary[];
  cumulativeSummaries: StudentAttendanceSummary[];
}

type ScopeMode = 'today' | 'cumulative';
type FilterFilter = 'all' | 'low' | 'critical' | 'absent';
type SortKey = 'student_id' | 'student_name' | 'totalWorkingHours' | 'presentHours' | 'odHours' | 'absentHours' | 'percentage';
type SortDir = 'asc' | 'desc';

export const StudentAttendanceSummaryTable: React.FC<StudentAttendanceSummaryTableProps> = ({
  classId,
  classNameTitle,
  date,
  todaySummaries,
  cumulativeSummaries,
}) => {
  const [scope, setScope] = useState<ScopeMode>('today');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('student_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const activeSummaries = scope === 'today' ? todaySummaries : cumulativeSummaries;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return activeSummaries
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
  }, [activeSummaries, search, filterMode, sortKey, sortDir]);

  const lowAttendanceCount = activeSummaries.filter((s) => s.totalWorkingHours > 0 && s.percentage < 75).length;
  const criticalCount = activeSummaries.filter((s) => s.totalWorkingHours > 0 && s.percentage < 65).length;
  const absentStudentsCount = activeSummaries.filter((s) => s.absentHours > 0).length;

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />;
  };

  const getPercentageBadge = (percentage: number, workingHours: number) => {
    if (workingHours === 0) {
      return (
        <span className="text-slate-400 font-mono text-xs italic">
          —
        </span>
      );
    }

    const formatted = `${percentage.toFixed(1)}%`;

    if (percentage >= 75) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {formatted}
        </span>
      );
    }
    if (percentage >= 65) {
      return (
        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3 h-3" />
          {formatted}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
        <AlertTriangle className="w-3 h-3" />
        {formatted}
      </span>
    );
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Student Attendance Summary Table — {classNameTitle}
              </CardTitle>
              <Badge variant="purple" size="sm">
                {classId}
              </Badge>
            </div>
            <CardDescription className="mt-0.5">
              Calculated dynamically: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">(Present + OD) / Working Hours × 100</code>
            </CardDescription>
          </div>

          {/* Scope Toggle Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start lg:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setScope('today')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all',
                scope === 'today'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Selected Date ({date})</span>
            </button>

            <button
              type="button"
              onClick={() => setScope('cumulative')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all',
                scope === 'cumulative'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Overall Cumulative</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Toolbar: Search and Filter Pills */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by roll number or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              All ({activeSummaries.length})
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
              <span>&lt; 75% ({lowAttendanceCount})</span>
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
              <span>&lt; 65% ({criticalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('absent')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-colors text-[11px]',
                filterMode === 'absent'
                  ? 'bg-rose-800 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Has Absents ({absentStudentsCount})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
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
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                    No student records match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr
                    key={s.student_id}
                    className={cn(
                      'hover:bg-slate-50/70 transition-colors',
                      s.absentHours > 0 && s.totalWorkingHours > 0 && s.percentage < 75 && 'bg-rose-50/20'
                    )}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
