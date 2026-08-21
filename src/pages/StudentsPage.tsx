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
import { getTodayDateString } from '../lib/utils';
import { Grid, CalendarRange, FileText, Users } from 'lucide-react';

type StudentTab = 'register' | 'monthly' | 'report' | 'roster';

export const StudentsPage: React.FC = () => {
  const { selectedClass } = useApp();
  const [activeTab, setActiveTab] = useState<StudentTab>('register');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Load students for active class
  const { students, loading: studentsLoading } = useStudents(selectedClass.id);
  const activeStudents = React.useMemo(() => students.filter((s) => s.active), [students]);

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

          {/* Top View Selector Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-2 text-xs sm:text-sm font-bold overflow-x-auto">
              {/* Tab 1: Requested Template: Period Grid Register */}
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'register'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Monthly Period Register Grid</span>
              </button>

              {/* Tab 2: Monthly Attendance */}
              <button
                type="button"
                onClick={() => setActiveTab('monthly')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'monthly'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>Monthly Summary</span>
              </button>

              {/* Tab 3: Full Audit Report */}
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Full Audit Log</span>
              </button>

              {/* Tab 4: Cumulative Roster */}
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'roster'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Class Roster</span>
              </button>
            </nav>
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
