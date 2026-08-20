import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Student } from '../../services/studentService';
import { StudentAttendanceSummary, ClassId } from '../../types';
import { Badge } from '../common/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { cn } from '../../lib/utils';

interface StudentBrowseListProps {
  classId: ClassId;
  classNameTitle: string;
  students: Student[];
  summaries: StudentAttendanceSummary[];
  loading: boolean;
  onSelectStudent: (student: Student) => void;
}

type FilterMode = 'all' | 'low' | 'critical' | 'absent';
type SortKey = 'student_id' | 'name' | 'totalWorkingHours' | 'presentHours' | 'odHours' | 'absentHours' | 'percentage';
type SortDir = 'asc' | 'desc';

export const StudentBrowseList: React.FC<StudentBrowseListProps> = ({
  classId,
  classNameTitle,
  students,
  summaries,
  loading,
  onSelectStudent,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey>('student_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Map summaries by student_id
  const summaryMap = useMemo(() => {
    const map = new Map<string, StudentAttendanceSummary>();
    for (const s of summaries) {
      map.set(s.student_id, s);
    }
    return map;
  }, [summaries]);

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

    return students
      .filter((s) => {
        const sum = summaryMap.get(s.student_id);
        const working = sum?.totalWorkingHours || 0;
        const pct = sum?.percentage ?? 100.0;
        const absent = sum?.absentHours || 0;

        const matchSearch =
          !q ||
          s.student_id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q);

        const matchFilter =
          filterMode === 'all' ||
          (filterMode === 'low' && working > 0 && pct < 75) ||
          (filterMode === 'critical' && working > 0 && pct < 65) ||
          (filterMode === 'absent' && absent > 0);

        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        const sumA = summaryMap.get(a.student_id);
        const sumB = summaryMap.get(b.student_id);

        if (sortKey === 'student_id') {
          return sortDir === 'asc'
            ? a.student_id.localeCompare(b.student_id)
            : b.student_id.localeCompare(a.student_id);
        }
        if (sortKey === 'name') {
          return sortDir === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }

        const valA = sumA ? (sumA as any)[sortKey] || 0 : 0;
        const valB = sumB ? (sumB as any)[sortKey] || 0 : 0;

        return sortDir === 'asc' ? valA - valB : valB - valA;
      });
  }, [students, summaryMap, search, filterMode, sortKey, sortDir]);

  const lowCount = summaries.filter((s) => s.totalWorkingHours > 0 && s.percentage < 75).length;
  const criticalCount = summaries.filter((s) => s.totalWorkingHours > 0 && s.percentage < 65).length;

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
      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${classId} by roll number or name…`}
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
            All Students ({students.length})
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
            <span>&lt; 75% ({lowCount})</span>
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
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Calculating student attendance summaries…</span>
        </div>
      )}

      {/* ── Table Card ── */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {classNameTitle} — Cumulative Roster
              </CardTitle>
              <CardDescription>
                Click any student row to view complete period history and detailed analytics.
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
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Student Name</span>
                      <SortIcon col="name" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold"
                    onClick={() => handleSort('totalWorkingHours')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Working</span>
                      <SortIcon col="totalWorkingHours" />
                    </div>
                  </th>

                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 font-bold text-emerald-800"
                    onClick={() => handleSort('presentHours')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Present</span>
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
                      <span>Absent</span>
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
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((student, idx) => {
                    const sum = summaryMap.get(student.student_id);
                    const working = sum?.totalWorkingHours || 0;
                    const present = sum?.presentHours || 0;
                    const od = sum?.odHours || 0;
                    const absent = sum?.absentHours || 0;
                    const pct = sum?.percentage ?? 100.0;

                    return (
                      <tr
                        key={student.student_id}
                        onClick={() => onSelectStudent(student)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-3 text-center text-slate-400 text-xs font-mono">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                          {student.student_id}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block group-hover:text-blue-700 transition-colors">
                            {student.name}
                          </span>
                          {student.email && (
                            <span className="text-[11px] text-slate-400 font-normal block">
                              {student.email}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                          {working}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-emerald-700">
                          {present}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-amber-700">
                          {od}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-rose-700">
                          {absent}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {getPercentageBadge(pct, working)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(student);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
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
