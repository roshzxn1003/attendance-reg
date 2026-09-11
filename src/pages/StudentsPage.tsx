import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { useApp } from '../context/AppContext';
import { Student } from '../services/studentService';
import { useStudents } from '../hooks/useStudents';
import { useAttendanceDashboard } from '../hooks/useAttendanceDashboard';
import { MonthlyPeriodRegisterGrid } from '../components/students/MonthlyPeriodRegisterGrid';
import { MonthlyAttendanceView } from '../components/students/MonthlyAttendanceView';
import { FullAttendanceReportView } from '../components/students/FullAttendanceReportView';
import { StudentBrowseList } from '../components/students/StudentBrowseList';
import { StudentProfileView } from '../components/students/StudentProfileView';
import { getTodayDateString, cn } from '../lib/utils';
import { Grid, CalendarRange, FileText, Users } from 'lucide-react';

type StudentTab = 'register' | 'monthly' | 'report' | 'roster';

export const StudentsPage: React.FC = () => {
  const { selectedClass } = useApp();
  const [activeTab, setActiveTab] = useState<StudentTab>('register');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Load students for active class
  const { students, loading: studentsLoading } = useStudents(selectedClass.id);
  const activeStudents = React.useMemo(() => students.filter((s) => s.active !== false), [students]);

  // Load attendance calculations for active class
  const { cumulativeSummaries, loading: dashLoading } = useAttendanceDashboard(
    selectedClass.id,
    getTodayDateString(),
    activeStudents
  );

  const activeCount = activeStudents.length;

  return (
    <div className="space-y-6 pb-12">
      {!selectedStudent ? (
        <>
          <PageHeader
            title="Student Roster & Attendance Register"
            subtitle={`Period-by-period monthly register sheets, individual attendance percentages, monthly summaries, and audit logs for ${selectedClass.name}.`}
            badge={`${activeCount} Enrolled (${selectedClass.id})`}
          />

          {/* Top View Selector Tabs: Stable 4-column Grid Across Mobile & Desktop */}
          <div className="bg-white p-1 sm:p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {/* Tab 1: Requested Template: Period Grid Register */}
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={cn(
                  'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
                  activeTab === 'register'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                title="Monthly Period Register Grid"
              >
                <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden text-[11px] leading-tight">Register</span>
                  <span className="hidden sm:inline">Register Grid</span>
                </span>
              </button>

              {/* Tab 2: Monthly Attendance */}
              <button
                type="button"
                onClick={() => setActiveTab('monthly')}
                className={cn(
                  'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
                  activeTab === 'monthly'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                title="Monthly attendance percentage and summary"
              >
                <CalendarRange className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden text-[11px] leading-tight">Monthly</span>
                  <span className="hidden sm:inline">Monthly Summary</span>
                </span>
              </button>

              {/* Tab 3: Full Audit Report */}
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={cn(
                  'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
                  activeTab === 'report'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                title="Full audit log and records"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden text-[11px] leading-tight">Audit Log</span>
                  <span className="hidden sm:inline">Full Audit Log</span>
                </span>
              </button>

              {/* Tab 4: Cumulative Roster */}
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={cn(
                  'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
                  activeTab === 'roster'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                title="Class roster and profiles"
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden text-[11px] leading-tight">Roster</span>
                  <span className="hidden sm:inline">Class Roster</span>
                </span>
              </button>
            </div>
          </div>

          {/* ── View 1: Monthly Period Register Grid (Requested Template) ── */}
          {activeTab === 'register' && (
            <MonthlyPeriodRegisterGrid
              classId={selectedClass.id}
              classNameTitle={selectedClass.name}
              students={activeStudents}
              onSelectStudent={(student) => setSelectedStudent(student)}
            />
          )}

          {/* ── View 2: Monthly Attendance Summary ── */}
          {activeTab === 'monthly' && (
            <MonthlyAttendanceView
              classId={selectedClass.id}
              classNameTitle={selectedClass.name}
              students={activeStudents}
              onSelectStudent={(student) => setSelectedStudent(student)}
            />
          )}

          {/* ── View 3: Full Attendance Report ── */}
          {activeTab === 'report' && (
            <FullAttendanceReportView
              classId={selectedClass.id}
              classNameTitle={selectedClass.name}
              students={activeStudents}
              onSelectStudent={(student) => setSelectedStudent(student)}
            />
          )}

          {/* ── View 4: Cumulative Roster ── */}
          {activeTab === 'roster' && (
            <StudentBrowseList
              classId={selectedClass.id}
              classNameTitle={selectedClass.name}
              students={students}
              summaries={cumulativeSummaries}
              loading={studentsLoading || dashLoading}
              onSelectStudent={(student) => setSelectedStudent(student)}
            />
          )}
        </>
      ) : (
        <StudentProfileView
          student={selectedStudent}
          classId={selectedClass.id}
          onBack={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};
