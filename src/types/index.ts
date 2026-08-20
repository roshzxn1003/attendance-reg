/**
 * Smart College CR Attendance Management System
 * Core Domain Types
 */

export type ClassId = 'CSE-25' | 'AIDS-25';

export type AttendanceStatus = 'P' | 'A' | 'OD';

export type DayNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type PeriodNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ClassInfo {
  id: ClassId;
  name: string;
  degree: string;
  branch: string;
  batch: string;
  semester: string;
  roomNumber: string;
  rollPrefix: string;
}

export interface Student {
  student_id: string; // Roll number e.g. SPC25CSU001
  class_id: ClassId;
  name: string;
  email?: string | null;
  active: boolean;
  created_at?: string;
}

export interface Subject {
  code: string;
  shortForm: string;
  name: string;
  hoursPerWeek: string;
  facultyName: string;
  isLab: boolean;
}

export interface PeriodTiming {
  period: PeriodNumber;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "09:30"
  label: string;     // e.g. "08:30 - 09:30"
}

export interface TimetableSlot {
  dayNumber: DayNumber;
  periodNumber: PeriodNumber;
  subjectCode: string;
  subjectShort: string;
  subjectName: string;
  isLab: boolean;
  classId?: ClassId; // if subject differs by class (e.g. CA for CSE vs AI for AIDS)
}

export interface DayCycleLog {
  id?: string;
  date: string; // YYYY-MM-DD
  class_id: ClassId;
  day_number: DayNumber | null;
  is_holiday: boolean;
  holiday_reason?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface AttendanceRecord {
  attendance_id?: string;
  student_id: string;
  class_id: ClassId;
  date: string; // YYYY-MM-DD
  period_number: PeriodNumber;
  status: AttendanceStatus;
  marked_at?: string;
}

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  class_id: ClassId;
  totalWorkingHours: number;
  presentHours: number;
  odHours: number;
  absentHours: number;
  percentage: number;
}
