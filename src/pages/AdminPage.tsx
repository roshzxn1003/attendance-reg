import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/common/Badge';
import { StudentImport } from '../components/students/StudentImport';
import { StudentTable } from '../components/students/StudentTable';
import { TimetableEditor } from '../components/timetable/TimetableEditor';
import { HolidayLogManager } from '../components/daycycle/HolidayLogManager';
import { useStudents } from '../hooks/useStudents';
import { useDayCycle } from '../hooks/useDayCycle';
import { getTodayDateString } from '../lib/utils';
import { Users, Clock, Palmtree, Upload } from 'lucide-react';

type AdminTab = 'students' | 'timetable' | 'holidays';

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
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Admin Control Center"
        subtitle={`Configure class rosters, Day 1–6 timetable matrix, and holiday calendar logs for ${selectedClass.name}.`}
        badge="Administration"
      />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 text-xs sm:text-sm font-bold overflow-x-auto">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
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
                  <p className="text-sm font-bold text-slate-800">
                    Import Students from Excel (XLSX) or CSV
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Upload <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">attendance details .xlsx</code> or CSV to populate the student roster. Duplicate student IDs are skipped and existing records are preserved.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowImport((v) => !v)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  showImport
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {showImport ? 'Close Importer' : 'Open XLSX/CSV Importer ↑'}
              </button>
            </CardContent>
          </Card>

          {showImport && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Excel & CSV Student Importer</CardTitle>
                <CardDescription>
                  Extracts Roll number, Name, Class, and Email. Preserves existing students and prevents duplicates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentImport
                  onImportComplete={() => {
                    setShowImport(false);
                    reloadStudents();
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Student Table */}
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">
                    {selectedClass.id} — {selectedClass.name}
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {studentsLoading
                      ? 'Loading…'
                      : `${students.filter((s) => s.active).length} active · ${students.filter((s) => !s.active).length} inactive · ${students.length} total enrolled`}
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="info" size="md">
                    Prefix: {selectedClass.rollPrefix}##
                  </Badge>
                  <Badge variant={students.length > 0 ? 'success' : 'default'} size="md">
                    {students.length} in Roster
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <StudentTable
                classId={selectedClass.id}
                students={students}
                loading={studentsLoading}
                error={studentsError}
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
    </div>
  );
};
