import { AttendanceStatus, ClassId, DayNumber, PeriodNumber } from './index';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          class_id: ClassId;
          name: string;
          degree: string;
          branch: string;
          batch: string;
          semester: string;
          room_number: string;
          created_at: string;
        };
        Insert: {
          class_id: ClassId;
          name: string;
          degree?: string;
          branch?: string;
          batch?: string;
          semester?: string;
          room_number?: string;
          created_at?: string;
        };
        Update: {
          class_id?: ClassId;
          name?: string;
          degree?: string;
          branch?: string;
          batch?: string;
          semester?: string;
          room_number?: string;
          created_at?: string;
        };
      };
      students: {
        Row: {
          student_id: string;
          class_id: ClassId;
          name: string;
          email: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          student_id: string;
          class_id: ClassId;
          name: string;
          email?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          student_id?: string;
          class_id?: ClassId;
          name?: string;
          email?: string | null;
          active?: boolean;
          created_at?: string;
        };
      };
      timetable: {
        Row: {
          timetable_id: string;
          class_id: ClassId;
          day_number: DayNumber;
          period_number: PeriodNumber;
          subject_code: string;
          subject_name: string;
          short_form: string;
          is_lab: boolean;
          start_time: string;
          end_time: string;
        };
        Insert: {
          timetable_id?: string;
          class_id: ClassId;
          day_number: DayNumber;
          period_number: PeriodNumber;
          subject_code: string;
          subject_name: string;
          short_form: string;
          is_lab?: boolean;
          start_time: string;
          end_time: string;
        };
        Update: {
          timetable_id?: string;
          class_id?: ClassId;
          day_number?: DayNumber;
          period_number?: PeriodNumber;
          subject_code?: string;
          subject_name?: string;
          short_form?: string;
          is_lab?: boolean;
          start_time?: string;
          end_time?: string;
        };
      };
      day_cycle_log: {
        Row: {
          id: string;
          date: string;
          class_id: ClassId;
          day_number: DayNumber | null;
          is_holiday: boolean;
          holiday_reason: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          class_id: ClassId;
          day_number?: DayNumber | null;
          is_holiday?: boolean;
          holiday_reason?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          class_id?: ClassId;
          day_number?: DayNumber | null;
          is_holiday?: boolean;
          holiday_reason?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      attendance: {
        Row: {
          attendance_id: string;
          student_id: string;
          class_id: ClassId;
          date: string;
          period_number: PeriodNumber;
          status: AttendanceStatus;
          marked_at: string;
        };
        Insert: {
          attendance_id?: string;
          student_id: string;
          class_id: ClassId;
          date: string;
          period_number: PeriodNumber;
          status: AttendanceStatus;
          marked_at?: string;
        };
        Update: {
          attendance_id?: string;
          student_id?: string;
          class_id?: ClassId;
          date?: string;
          period_number?: PeriodNumber;
          status?: AttendanceStatus;
          marked_at?: string;
        };
      };
      holidays: {
        Row: {
          holiday_id: string;
          date: string;
          class_id: ClassId | null;
          reason: string;
          created_at: string;
        };
        Insert: {
          holiday_id?: string;
          date: string;
          class_id?: ClassId | null;
          reason: string;
          created_at?: string;
        };
        Update: {
          holiday_id?: string;
          date?: string;
          class_id?: ClassId | null;
          reason?: string;
          created_at?: string;
        };
      };
    };
  };
}
