export const APP_CONFIG = {
  appName: 'Smart CR Attendance',
  institution: 'SPIHER - Department of Computer Science & AI',
  semester: 'Year II / Semester III (May 2026 - Dec 2026)',
  classroom: 'Room 245',
  totalDaysInCycle: 6,
  totalPeriodsPerDay: 7,
  defaultClass: 'CSE-25' as const,
};

export const ATTENDANCE_STATUS_META = {
  P: {
    label: 'Present',
    shortLabel: 'P',
    bgColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Present in class',
  },
  A: {
    label: 'Absent',
    shortLabel: 'A',
    bgColor: 'bg-rose-500',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    textColor: 'text-rose-700',
    description: 'Absent from class',
  },
  OD: {
    label: 'On Duty',
    shortLabel: 'OD',
    bgColor: 'bg-amber-500',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    textColor: 'text-amber-700',
    description: 'Official on duty / event permission',
  },
};
