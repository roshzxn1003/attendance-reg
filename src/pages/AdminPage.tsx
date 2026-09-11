import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { StudentImport } from '../components/students/StudentImport';
import { StudentTable } from '../components/students/StudentTable';
import { TimetableEditor } from '../components/timetable/TimetableEditor';
import { HolidayLogManager } from '../components/daycycle/HolidayLogManager';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { useStudents } from '../hooks/useStudents';
import { useDayCycle } from '../hooks/useDayCycle';
import { getTodayDateString, cn } from '../lib/utils';
import {
  Users,
  Clock,
  Upload,
  Sliders,
  Calendar,
} from 'lucide-react';

type AdminTab = 'holidays' | 'students' | 'timetable' | 'settings';

export const AdminPage: React.FC = () => {
  const { selectedClass } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab | null;

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (tabParam && ['holidays', 'students', 'timetable', 'settings'].includes(tabParam)) {
      return tabParam;
    }
    return 'holidays';
  });

  const [showImport, setShowImport] = useState(false);

  // Sync state if URL search param changes
  useEffect(() => {
    if (tabParam && ['holidays', 'students', 'timetable', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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

  const handleSelectTab = (key: AdminTab) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Admin Control Center"
        subtitle={`Configure rotating Day 1–6 cycle, class rosters, timetable matrix, holidays, and system resets for ${selectedClass.name}.`}
        badge="Administration"
      />

      {/* ── Tabs Bar: All 4 Admin Tabs Visible & Stable Across Mobile and Desktop ── */}
      <div className="bg-white p-1 sm:p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {/* Tab 1: Day Order & Holidays */}
          <button
            type="button"
            onClick={() => handleSelectTab('holidays')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
              activeTab === 'holidays'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title="Day Order (1–6) cycle, schedule working dates, and manage holiday logs"
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-current" />
            <span className="truncate">
              <span className="sm:hidden text-[11px] leading-tight">Day Order</span>
              <span className="hidden sm:inline">Day Order & Holidays</span>
            </span>
          </button>

          {/* Tab 2: Classes & Students */}
          <button
            type="button"
            onClick={() => handleSelectTab('students')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
              activeTab === 'students'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title="Manage student rosters, activation status, and Excel/CSV bulk import"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden text-[11px] leading-tight">Students</span>
              <span className="hidden sm:inline">Classes & Students</span>
            </span>
          </button>

          {/* Tab 3: Timetable Matrix */}
          <button
            type="button"
            onClick={() => handleSelectTab('timetable')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
              activeTab === 'timetable'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title="7-period master timetable schedule for Days 1 to 6"
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden text-[11px] leading-tight">Timetable</span>
              <span className="hidden sm:inline">Timetable Matrix</span>
            </span>
          </button>

          {/* Tab 4: Settings & System Reset */}
          <button
            type="button"
            onClick={() => handleSelectTab('settings')}
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title="Administrative database diagnostics, offline backups, and system reset controls"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden text-[11px] leading-tight">Settings</span>
              <span className="hidden sm:inline">Settings & Reset</span>
            </span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: DAY ORDER & HOLIDAYS LOG ── */}
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

      {/* ── TAB 2: CLASSES & STUDENTS ── */}
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
                {students.filter((s) => s.active !== false).length} Active / {students.length} Total
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

      {/* ── TAB 3: TIMETABLE ── */}
      {activeTab === 'timetable' && (
        <TimetableEditor
          classId={selectedClass.id}
          classNameTitle={selectedClass.name}
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
