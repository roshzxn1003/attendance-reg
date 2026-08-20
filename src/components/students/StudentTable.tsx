import React, { useState, useMemo } from 'react';
import {
  Search,
  Pencil,
  UserX,
  UserCheck,
  ChevronUp,
  ChevronDown,
  Mail,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { Student } from '../../services/studentService';
import { ClassId } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { EditStudentModal } from './EditStudentModal';
import { AddStudentModal } from './AddStudentModal';
import { cn } from '../../lib/utils';

interface StudentTableProps {
  classId: ClassId;
  students: Student[];
  loading: boolean;
  error: string | null;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onEdit: (id: string, updates: { name: string; email: string | null }) => Promise<void>;
  onAddStudent: (student: {
    student_id: string;
    class_id: ClassId;
    name: string;
    email: string | null;
  }) => Promise<void>;
  onReload: () => void;
}

type SortKey = 'student_id' | 'name' | 'class_id' | 'active';
type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

export const StudentTable: React.FC<StudentTableProps> = ({
  classId,
  students,
  loading,
  error,
  onToggleActive,
  onEdit,
  onAddStudent,
  onReload,
}) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('student_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

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
    return students
      .filter((s) => {
        const matchSearch =
          !q ||
          s.student_id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q);
        const matchActive =
          activeFilter === 'all' ||
          (activeFilter === 'active' && s.active) ||
          (activeFilter === 'inactive' && !s.active);
        return matchSearch && matchActive;
      })
      .sort((a, b) => {
        const aVal = String(a[sortKey] ?? '');
        const bVal = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
  }, [students, search, activeFilter, sortKey, sortDir]);

  const handleToggle = async (s: Student) => {
    setTogglingIds((prev) => new Set(prev).add(s.student_id));
    try {
      await onToggleActive(s.student_id, !s.active);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(s.student_id);
        return next;
      });
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  const activeCount = students.filter((s) => s.active).length;
  const inactiveCount = students.filter((s) => !s.active).length;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by roll no, name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 focus:bg-white shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Active filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {([
              ['all', `All (${students.length})`],
              ['active', `Active (${activeCount})`],
              ['inactive', `Inactive (${inactiveCount})`],
            ] as [ActiveFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setActiveFilter(val)}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-colors text-[11px]',
                  activeFilter === val
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Add Student Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 text-xs rounded-xl shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </Button>

          <Button variant="outline" size="sm" onClick={onReload} className="gap-1.5 py-2 px-2.5 rounded-xl border-slate-200">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Loading students…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && students.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-xs">
          <p className="font-semibold text-slate-700">No students found.</p>
          <p className="mt-1">Add a student or import an XLSX/CSV file.</p>
        </div>
      )}

      {/* Table */}
      {!loading && students.length > 0 && (
        <>
          <div className="text-xs text-slate-500 mb-2 font-medium">
            Showing {filtered.length} of {students.length} students
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 select-none">
                <tr>
                  {([
                    ['student_id', 'Roll No'],
                    ['name', 'Student Name'],
                    ['class_id', 'Class'],
                    ['active', 'Status'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <span>{label}</span>
                        <SortIcon col={key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3">College Email</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => (
                  <tr
                    key={student.student_id}
                    className={cn(
                      'transition-colors',
                      student.active
                        ? 'hover:bg-slate-50/70'
                        : 'bg-slate-50/50 opacity-60 hover:opacity-80'
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                      {student.student_id}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{student.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={student.class_id === 'CSE-25' ? 'info' : 'purple'}
                        size="sm"
                      >
                        {student.class_id}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={student.active ? 'success' : 'danger'} size="sm">
                        {student.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate font-mono">
                      {student.email ? (
                        <a
                          href={`mailto:${student.email}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {student.email}
                        </a>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">no email</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit */}
                        <button
                          type="button"
                          title="Edit student"
                          onClick={() => setEditingStudent(student)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Deactivate / Reactivate */}
                        <button
                          type="button"
                          title={student.active ? 'Deactivate student' : 'Reactivate student'}
                          disabled={togglingIds.has(student.student_id)}
                          onClick={() => handleToggle(student)}
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            student.active
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          )}
                        >
                          {togglingIds.has(student.student_id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : student.active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onSave={(updates) => onEdit(editingStudent.student_id, updates)}
          onClose={() => setEditingStudent(null)}
        />
      )}

      {/* Add student modal */}
      {showAddModal && (
        <AddStudentModal
          initialClassId={classId}
          onSave={onAddStudent}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
};
