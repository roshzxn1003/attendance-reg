import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/common/Badge';
import { StudentImport } from '../components/students/StudentImport';
import { StudentTable } from '../components/students/StudentTable';
import { TimetableEditor } from '../components/timetable/TimetableEditor';
import { HolidayLogManager } from '../components/daycycle/HolidayLogManager';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { useStudents } from '../hooks/useStudents';
import { useDayCycle } from '../hooks/useDayCycle';
import { getTodayDateString } from '../lib/utils';
import { Users, Clock, Palmtree, Upload, Sliders } from 'lucide-react';

type AdminTab = 'students' | 'timetable' | 'holidays' | 'settings';

export const AdminPage: React.FC = () => {
  const { selectedClass } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('students');
  const [showImport, setShowImport] = useState(false);

  // Student hook
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    reload: reloadStudents,
    toggleActive,
    editStudent,
    addStudent,
  } = useStudents(selectedClass.id);

  // Day cycle hook for admin management
  const {
    allLogs,
    loading: cycleLoading,
    assignDay,
    markHoliday,
    removeEntry,
  } = useDayCycle(selectedClass.id, getTodayDateString());

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'students', label: 'Classes & Students', icon: <Users className="w-4 h-4" /> },
    { key: 'timetable', label: 'Timetable', icon: <Clock className="w-4 h-4" /> },
    { key: 'holidays', label: 'Holidays & Day-Cycle', icon: <Palmtree className="w-4 h-4" /> },
    { key: 'settings', label: 'Settings & System Reset', icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Admin Control Center"
        subtitle={`Configure class rosters, Day 1–6 timetable matrix, holidays, and system resets for ${selectedClass.name}.`}
        badge="Administration"
      />

      {/* Tabs Bar */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 text-xs sm:text-sm font-bold overflow-x-auto">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB 1: CLASSES & STUDENTS ── */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Import Banner Card */}
          <Card className="border-blue-100 bg-blue-50/40">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Bulk Import Students</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Import students via Excel (.xlsx, .xls) or CSV with automatic column detection (Reg No, Name, Email).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImport(!showImport)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                {showImport ? 'Hide Import Tool' : 'Open Bulk Import Tool'}
              </button>
            </CardContent>
          </Card>

          {/* Import Section (Collapsible) */}
          {showImport && (
            <StudentImport
              onImportComplete={() => {
                reloadStudents();
                setShowImport(false);
              }}
            />
          )}

          {/* Student Table */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {selectedClass.name} ({selectedClass.id}) Student Roster
                </CardTitle>
                <CardDescription className="text-xs">
                  Add, search, edit, or deactivate students. Inactive students are preserved in history but hidden from marking grids.
                </CardDescription>
              </div>
              <Badge variant="info" size="md">
                {students.filter((s) => s.active).length} Active / {students.length} Total
              </Badge>
            </CardHeader>
            <CardContent>
              <StudentTable
                students={students}
                loading={studentsLoading}
                error={studentsError}
                classId={selectedClass.id}
                onToggleActive={toggleActive}
                onEdit={editStudent}
                onAddStudent={addStudent}
                onReload={reloadStudents}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 2: TIMETABLE ── */}
      {activeTab === 'timetable' && (
        <TimetableEditor
          classId={selectedClass.id}
          classNameTitle={selectedClass.name}
        />
      )}

      {/* ── TAB 3: HOLIDAYS & DAY-CYCLE LOG ── */}
      {activeTab === 'holidays' && (
        <HolidayLogManager
          classId={selectedClass.id}
          classNameTitle={selectedClass.name}
          logs={allLogs}
          onAssignDay={async (date, dayNumber, notes) => {
            await assignDay(dayNumber, notes, date);
          }}
          onMarkHoliday={async (date, reason, notes) => {
            await markHoliday(reason, notes, date);
          }}
          onDeleteEntry={async (date) => {
            await removeEntry(date);
          }}
          loading={cycleLoading}
        />
      )}

      {/* ── TAB 4: SETTINGS & SYSTEM RESET (ADMIN PASSWORD PROTECTED) ── */}
      {activeTab === 'settings' && (
        <AdminSettingsTab
          selectedClassId={selectedClass.id}
          onRefreshParent={reloadStudents}
        />
      )}
    </div>
  );
};
