/**
 * Master Faculty Accounts Directory
 * SPIHER Year II / Semester III (Room 245) - B.Tech CSE & AI&DS
 * 
 * Each faculty member has dedicated subject-specific credentials with direct
 * auto-routing to their respective subject registers.
 */

export interface FacultyAccount {
  id: string;
  name: string;
  department: string;
  designation: string;
  username: string;
  aliases: string[];
  email: string;
  defaultPassword: string;
  assignedSubjects: string[]; // Short forms matching SUBJECTS key
  defaultSubject: string;     // Initial active subject
  badgeColor?: string;
}

export const MASTER_FACULTY_ACCOUNTS: FacultyAccount[] = [
  {
    id: 'faculty_dm',
    name: 'Mrs. G. Tabassum Fathima',
    department: 'Mathematics',
    designation: 'AP / Maths',
    username: 'dm',
    aliases: ['faculty.dm', 'maths', 'tabassum'],
    email: 'faculty.dm@spiher.ac.in',
    defaultPassword: 'faculty@dm123',
    assignedSubjects: ['DM'],
    defaultSubject: 'DM',
    badgeColor: 'blue',
  },
  {
    id: 'faculty_os',
    name: 'Ms. Jayageetha',
    department: 'Information Technology',
    designation: 'AP / IT',
    username: 'os',
    aliases: ['faculty.os', 'oslab', 'jayageetha'],
    email: 'faculty.os@spiher.ac.in',
    defaultPassword: 'faculty@os123',
    assignedSubjects: ['OS', 'OS LAB'],
    defaultSubject: 'OS',
    badgeColor: 'indigo',
  },
  {
    id: 'faculty_dbms',
    name: 'Ms. Revathy',
    department: 'Information Technology',
    designation: 'AP / IT',
    username: 'dbms',
    aliases: ['faculty.dbms', 'dbmslab', 'revathy'],
    email: 'faculty.dbms@spiher.ac.in',
    defaultPassword: 'faculty@dbms123',
    assignedSubjects: ['DBMS', 'DBMS LAB'],
    defaultSubject: 'DBMS',
    badgeColor: 'purple',
  },
  {
    id: 'faculty_daa',
    name: 'Mr. Balaji',
    department: 'Artificial Intelligence & Data Science',
    designation: 'AP / AI',
    username: 'daa',
    aliases: ['faculty.daa', 'daalab', 'balaji'],
    email: 'faculty.daa@spiher.ac.in',
    defaultPassword: 'faculty@daa123',
    assignedSubjects: ['DAA', 'DAA LAB'],
    defaultSubject: 'DAA',
    badgeColor: 'amber',
  },
  {
    id: 'faculty_iot',
    name: 'Ms. Shanmuga Lakshmi',
    department: 'Electronics & Communication Engineering',
    designation: 'AP / ECE',
    username: 'iot',
    aliases: ['faculty.iot', 'ece', 'shanmuga'],
    email: 'faculty.iot@spiher.ac.in',
    defaultPassword: 'faculty@iot123',
    assignedSubjects: ['IOT'],
    defaultSubject: 'IOT',
    badgeColor: 'emerald',
  },
  {
    id: 'faculty_ca_ai',
    name: 'Ms. Smirna',
    department: 'Computer Science & Engineering',
    designation: 'TA / CSE',
    username: 'ca',
    aliases: ['ai', 'faculty.ca', 'faculty.ai', 'smirna'],
    email: 'faculty.ca@spiher.ac.in',
    defaultPassword: 'faculty@ca123',
    assignedSubjects: ['CA', 'AI'],
    defaultSubject: 'CA',
    badgeColor: 'cyan',
  },
  {
    id: 'faculty_uhv',
    name: 'Dr. B. S. Charulatha',
    department: 'Artificial Intelligence & Data Science',
    designation: 'HoD / AI',
    username: 'uhv',
    aliases: ['faculty.uhv', 'charulatha', 'hod.ai'],
    email: 'faculty.uhv@spiher.ac.in',
    defaultPassword: 'faculty@uhv123',
    assignedSubjects: ['UHV'],
    defaultSubject: 'UHV',
    badgeColor: 'rose',
  },
  {
    id: 'faculty_pe_yoga',
    name: 'Physical Education & Yoga Dept',
    department: 'Physical Education & Yoga',
    designation: 'Physical Director / Yoga Master',
    username: 'yoga',
    aliases: ['pet', 'faculty.yoga', 'faculty.pet', 'pe'],
    email: 'faculty.pe@spiher.ac.in',
    defaultPassword: 'faculty@yoga123',
    assignedSubjects: ['YOGA', 'PET'],
    defaultSubject: 'YOGA',
    badgeColor: 'teal',
  },
  {
    id: 'faculty_general',
    name: 'Class Advisor / General Faculty',
    department: 'CSE & AIDS Department',
    designation: 'Class Advisor',
    username: 'faculty',
    aliases: ['advisor', 'classadvisor', 'faculty@spiher.ac.in'],
    email: 'faculty@spiher.ac.in',
    defaultPassword: 'faculty@spiher2026',
    assignedSubjects: ['DM', 'UHV', 'CA', 'AI', 'IOT', 'OS', 'OS LAB', 'DBMS', 'DBMS LAB', 'DAA', 'DAA LAB', 'YOGA', 'COURSERA', 'LIB', 'PET'],
    defaultSubject: 'OS',
    badgeColor: 'blue',
  },
];

/**
 * Find a faculty account by username, alias, or email
 */
export function getFacultyByIdentifier(identifier: string): FacultyAccount | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase();

  return MASTER_FACULTY_ACCOUNTS.find(
    (f) =>
      f.username.toLowerCase() === clean ||
      f.email.toLowerCase() === clean ||
      f.aliases.some((a) => a.toLowerCase() === clean) ||
      f.assignedSubjects.some((s) => s.toLowerCase() === clean)
  );
}

/**
 * Find a faculty account by subject key
 */
export function getFacultyBySubject(subjectKey: string): FacultyAccount | undefined {
  if (!subjectKey) return undefined;
  const clean = subjectKey.trim().toUpperCase();

  return MASTER_FACULTY_ACCOUNTS.find((f) =>
    f.assignedSubjects.some((s) => s.toUpperCase() === clean)
  );
}
