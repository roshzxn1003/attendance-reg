-- =============================================================================
-- Smart College CR Attendance Management System
-- Migration: 002 - Seed Class Records
-- Created: 2026-08-20
-- Description: Inserts the two verified class records.
--              CSE-25 and AIDS-25.
--              No students or timetable rows are seeded here —
--              those come from the verified source workbook in Step 3.
-- =============================================================================

INSERT INTO classes (class_id, name, degree, semester) VALUES
    (
        'CSE-25',
        'BTech Computer Science and Engineering',
        'Bachelor of Technology — Computer Science and Engineering',
        'Year II / Semester III (May 2026 – Dec 2026)'
    ),
    (
        'AIDS-25',
        'BTech Artificial Intelligence and Data Science',
        'Bachelor of Technology — Artificial Intelligence & Data Science',
        'Year II / Semester III (May 2026 – Dec 2026)'
    )
ON CONFLICT (class_id) DO UPDATE
    SET name     = EXCLUDED.name,
        degree   = EXCLUDED.degree,
        semester = EXCLUDED.semester;

-- Verification query (informational — not executed by migrator, for manual check)
-- SELECT class_id, name, degree, semester FROM classes ORDER BY class_id;

