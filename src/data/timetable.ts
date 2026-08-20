import { DayNumber, PeriodNumber, PeriodTiming } from '../types';

export interface BreakTiming {
  name: string;
  shortName: string;
  startTime: string;
  endTime: string;
  label: string;
  afterPeriod: PeriodNumber;
  isAttendancePeriod: false;
}

export const BREAK_TIMINGS: BreakTiming[] = [
  {
    name: 'Tea Break',
    shortName: 'TEA BREAK',
    startTime: '10:30',
    endTime: '10:45',
    label: '10:30 AM – 10:45 AM',
    afterPeriod: 2,
    isAttendancePeriod: false,
  },
  {
    name: 'Lunch Break',
    shortName: 'LUNCH BREAK',
    startTime: '12:45',
    endTime: '13:15',
    label: '12:45 PM – 1:15 PM',
    afterPeriod: 4,
    isAttendancePeriod: false,
  },
];

export const PERIOD_TIMINGS: PeriodTiming[] = [
  { period: 1, startTime: '08:30', endTime: '09:30', label: '8:30 AM – 9:30 AM' },
  { period: 2, startTime: '09:30', endTime: '10:30', label: '9:30 AM – 10:30 AM' },
  // Tea Break: 10:30 AM – 10:45 AM
  { period: 3, startTime: '10:45', endTime: '11:45', label: '10:45 AM – 11:45 AM' },
  { period: 4, startTime: '11:45', endTime: '12:45', label: '11:45 AM – 12:45 PM' },
  // Lunch Break: 12:45 PM – 1:15 PM
  { period: 5, startTime: '13:15', endTime: '14:10', label: '1:15 PM – 2:10 PM' },
  { period: 6, startTime: '14:10', endTime: '15:05', label: '2:10 PM – 3:05 PM' },
  { period: 7, startTime: '15:05', endTime: '16:00', label: '3:05 PM – 4:00 PM' },
];

export const DAY_ORDERS: { dayNumber: DayNumber; label: string; shortLabel: string }[] = [
  { dayNumber: 1, label: 'Day Order 1', shortLabel: 'DO 1' },
  { dayNumber: 2, label: 'Day Order 2', shortLabel: 'DO 2' },
  { dayNumber: 3, label: 'Day Order 3', shortLabel: 'DO 3' },
  { dayNumber: 4, label: 'Day Order 4', shortLabel: 'DO 4' },
  { dayNumber: 5, label: 'Day Order 5', shortLabel: 'DO 5' },
  { dayNumber: 6, label: 'Day Order 6', shortLabel: 'DO 6' },
];

/**
 * Master Day Order 1 - Day Order 6 Timetable Grid
 * Based on SPIHER Department of CSE Timetable (MAY 2026 - DEC 2026)
 * Year: II, Semester: III, Class Room: 245
 */
export const MASTER_TIMETABLE: Record<DayNumber, Record<PeriodNumber, { subjectShort: string; isLab: boolean }>> = {
  1: {
    1: { subjectShort: 'DM', isLab: false },
    2: { subjectShort: 'DAA LAB', isLab: true },
    3: { subjectShort: 'DAA LAB', isLab: true },
    4: { subjectShort: 'DAA LAB', isLab: true },
    5: { subjectShort: 'DBMS', isLab: false },
    6: { subjectShort: 'DAA', isLab: false },
    7: { subjectShort: 'UHV', isLab: false },
  },
  2: {
    1: { subjectShort: 'DAA', isLab: false },
    2: { subjectShort: 'DM', isLab: false },
    3: { subjectShort: 'OS', isLab: false },
    4: { subjectShort: 'AI/CA', isLab: false },
    5: { subjectShort: 'OS', isLab: false },
    6: { subjectShort: 'DBMS', isLab: false },
    7: { subjectShort: 'UHV', isLab: false },
  },
  3: {
    1: { subjectShort: 'IOT', isLab: false },
    2: { subjectShort: 'DBMS LAB', isLab: true },
    3: { subjectShort: 'DBMS LAB', isLab: true },
    4: { subjectShort: 'DBMS LAB', isLab: true },
    5: { subjectShort: 'YOGA', isLab: false },
    6: { subjectShort: 'COURSERA', isLab: false },
    7: { subjectShort: 'PET', isLab: false },
  },
  4: {
    1: { subjectShort: 'DAA', isLab: false },
    2: { subjectShort: 'DBMS', isLab: false },
    3: { subjectShort: 'DM', isLab: false },
    4: { subjectShort: 'AI/CA', isLab: false },
    5: { subjectShort: 'IOT', isLab: false },
    6: { subjectShort: 'DM', isLab: false },
    7: { subjectShort: 'DBMS', isLab: false },
  },
  5: {
    1: { subjectShort: 'DAA', isLab: false },
    2: { subjectShort: 'OS LAB', isLab: true },
    3: { subjectShort: 'OS LAB', isLab: true },
    4: { subjectShort: 'OS LAB', isLab: true },
    5: { subjectShort: 'DM', isLab: false },
    6: { subjectShort: 'IOT', isLab: false },
    7: { subjectShort: 'AI/CA', isLab: false },
  },
  6: {
    1: { subjectShort: 'OS', isLab: false },
    2: { subjectShort: 'IOT', isLab: false },
    3: { subjectShort: 'DAA', isLab: false },
    4: { subjectShort: 'AI/CA', isLab: false },
    5: { subjectShort: 'LIB', isLab: false },
    6: { subjectShort: 'DBMS', isLab: false },
    7: { subjectShort: 'OS', isLab: false },
  },
};

/**
 * Returns the resolved subject for a given class, day, and period.
 * Handles AI vs CA branch differentiation.
 */
export function getSubjectForSlot(day: DayNumber, period: PeriodNumber, classId: string): string {
  const slot = MASTER_TIMETABLE[day]?.[period];
  if (!slot) return 'FREE';
  if (slot.subjectShort === 'AI/CA') {
    return classId === 'AIDS-25' ? 'AI' : 'CA';
  }
  return slot.subjectShort;
}

/**
 * Returns default master seed entries for a given class
 */
export function getDefaultTimetableEntries(classId: string) {
  const entries: Array<{
    class_id: string;
    day_number: DayNumber;
    period_number: PeriodNumber;
    subject: string;
    start_time: string;
    end_time: string;
  }> = [];

  const days: DayNumber[] = [1, 2, 3, 4, 5, 6];
  for (const day of days) {
    for (const timing of PERIOD_TIMINGS) {
      const subject = getSubjectForSlot(day, timing.period, classId);
      entries.push({
        class_id: classId,
        day_number: day,
        period_number: timing.period,
        subject,
        start_time: `${timing.startTime}:00`,
        end_time: `${timing.endTime}:00`,
      });
    }
  }

  return entries;
}
