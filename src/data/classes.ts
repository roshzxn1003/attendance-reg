import { ClassInfo } from '../types';

export const CLASSES: Record<string, ClassInfo> = {
  'CSE-25': {
    id: 'CSE-25',
    name: 'BTech Computer Science Engineering',
    degree: 'B.Tech.',
    branch: 'Computer Science and Engineering',
    batch: '2025-2029 (Year II)',
    semester: 'Semester III',
    roomNumber: '245',
    rollPrefix: 'SPC25CSU0',
  },
  'AIDS-25': {
    id: 'AIDS-25',
    name: 'BTech Artificial Intelligence and Data Science',
    degree: 'B.Tech.',
    branch: 'Artificial Intelligence & Data Science',
    batch: '2025-2029 (Year II)',
    semester: 'Semester III',
    roomNumber: '245',
    rollPrefix: 'SPC25CSU6',
  },
};

export const CLASS_LIST: ClassInfo[] = Object.values(CLASSES);
