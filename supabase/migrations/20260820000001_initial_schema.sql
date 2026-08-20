-- =============================================================================
-- Smart College CR Attendance Management System
-- Migration: 001 - Initial Schema
-- Created: 2026-08-20
-- Description: Full database schema for attendance tracking
--              with rotating Day 1-6 cycle system.
-- =============================================================================

-- ============================================================
-- TABLE: classes
-- Represents the two class sections tracked by this system.
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
    class_id    TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL,
    degree      TEXT        NOT NULL DEFAULT '',
    semester    TEXT        NOT NULL DEFAULT ''
);

COMMENT ON TABLE  classes             IS 'Class sections tracked by the CR attendance system';
COMMENT ON COLUMN classes.class_id   IS 'Short identifier e.g. CSE-25, AIDS-25';
COMMENT ON COLUMN classes.name       IS 'Human-readable name displayed in the UI';
COMMENT ON COLUMN classes.degree     IS 'Degree program e.g. BTech CSE, BTech AIDS';
COMMENT ON COLUMN classes.semester   IS 'Current active semester e.g. Year II / Sem III';


-- ============================================================
-- TABLE: students
-- Roster of all enrolled students per class.
-- Roll number is used as the primary key (already unique college-wide).
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    student_id  TEXT        PRIMARY KEY,
    class_id    TEXT        NOT NULL REFERENCES classes(class_id) ON DELETE RESTRICT,
    name        TEXT        NOT NULL,
    email       TEXT,
    active      BOOLEAN     NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE  students              IS 'Student roster for all tracked classes';
COMMENT ON COLUMN students.student_id  IS 'Roll number, e.g. SPC25CSU001 — unique college-wide';
COMMENT ON COLUMN students.class_id    IS 'FK → classes.class_id';
COMMENT ON COLUMN students.name        IS 'Full student name in CAPS as per college records';
COMMENT ON COLUMN students.email       IS 'College-issued email (optional)';
COMMENT ON COLUMN students.active      IS 'FALSE if student discontinued — past records preserved';


-- ============================================================
-- TABLE: timetable
-- The master rotating Day 1–Day 6 period schedule.
-- One row per (class × day × period).
-- ============================================================
CREATE TABLE IF NOT EXISTS timetable (
    timetable_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id        TEXT        NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    day_number      INTEGER     NOT NULL CHECK (day_number BETWEEN 1 AND 6),
    period_number   INTEGER     NOT NULL CHECK (period_number BETWEEN 1 AND 7),
    subject         TEXT        NOT NULL,
    start_time      TIME        NOT NULL,
    end_time        TIME        NOT NULL,
    UNIQUE (class_id, day_number, period_number)
);

COMMENT ON TABLE  timetable                 IS 'Rotating Day 1–6 period schedule per class';
COMMENT ON COLUMN timetable.day_number      IS 'Cycle day 1–6 (NOT Monday–Saturday)';
COMMENT ON COLUMN timetable.period_number   IS 'Period slot 1–7 within the day';
COMMENT ON COLUMN timetable.subject         IS 'Subject short code e.g. DM, OS, DAA LAB';


-- ============================================================
-- TABLE: day_cycle_log
-- Maps every real calendar date to a Day Number (1–6) or Holiday.
-- This is the critical table that makes the rotating cycle work.
-- A holiday date gets is_holiday=TRUE and day_number=NULL.
-- Holidays do NOT consume a cycle slot — the next working date
-- simply continues with the next day number.
-- ============================================================
CREATE TABLE IF NOT EXISTS day_cycle_log (
    date            DATE        NOT NULL,
    class_id        TEXT        NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    day_number      INTEGER     CHECK (day_number BETWEEN 1 AND 6),
    is_holiday      BOOLEAN     NOT NULL DEFAULT FALSE,
    holiday_reason  TEXT,
    notes           TEXT,
    PRIMARY KEY (date, class_id),
    -- Either a day_number is assigned OR it is a holiday, never neither on a working day
    CONSTRAINT chk_day_or_holiday CHECK (
        (is_holiday = TRUE AND day_number IS NULL)
        OR
        (is_holiday = FALSE AND day_number IS NOT NULL)
    )
);

COMMENT ON TABLE  day_cycle_log                 IS 'Maps each calendar date to a timetable day number or holiday';
COMMENT ON COLUMN day_cycle_log.date            IS 'Actual calendar date';
COMMENT ON COLUMN day_cycle_log.class_id        IS 'FK → classes.class_id (future-proof for per-class cycles)';
COMMENT ON COLUMN day_cycle_log.day_number      IS 'Timetable Day 1–6; NULL if holiday';
COMMENT ON COLUMN day_cycle_log.is_holiday      IS 'TRUE = holiday; FALSE = working day with day_number set';
COMMENT ON COLUMN day_cycle_log.holiday_reason  IS 'E.g. Pongal, College Day, etc.';


-- ============================================================
-- TABLE: attendance
-- Core attendance record — one row per (student × date × period).
-- The UNIQUE constraint on (student_id, date, period_number)
-- is the hard guarantee against double-marking.
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      TEXT        NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
    date            DATE        NOT NULL,
    period_number   INTEGER     NOT NULL CHECK (period_number BETWEEN 1 AND 7),
    status          TEXT        NOT NULL CHECK (status IN ('P', 'A', 'OD')),
    marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- THE critical constraint: prevents any double-marking for a student in the same period on the same date
    CONSTRAINT uq_attendance_per_student_period UNIQUE (student_id, date, period_number)
);

COMMENT ON TABLE  attendance                    IS 'Per-student per-period attendance record';
COMMENT ON COLUMN attendance.student_id         IS 'FK → students.student_id (roll number)';
COMMENT ON COLUMN attendance.date               IS 'Calendar date of the attendance';
COMMENT ON COLUMN attendance.period_number      IS 'Period slot 1–7 matching day_cycle_log + timetable';
COMMENT ON COLUMN attendance.status             IS 'P=Present, A=Absent, OD=On-Duty';
COMMENT ON COLUMN attendance.marked_at          IS 'Timestamp when CR marked/last updated this record';


-- ============================================================
-- TABLE: holidays
-- Explicit holiday registry (optional reference table).
-- day_cycle_log is the authoritative source for the cycle,
-- but this table lets admin add named holidays in advance.
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
    holiday_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    date        DATE        NOT NULL,
    class_id    TEXT        REFERENCES classes(class_id) ON DELETE CASCADE,
    reason      TEXT        NOT NULL,
    UNIQUE (date, class_id)
);

COMMENT ON TABLE  holidays              IS 'Named holiday registry; NULL class_id means college-wide';
COMMENT ON COLUMN holidays.class_id    IS 'NULL = college-wide holiday; set = class-specific';
COMMENT ON COLUMN holidays.reason      IS 'e.g. Pongal, Independence Day, College Day';


-- =============================================================================
-- INDEXES
-- Tuned for the most common query patterns:
--   - Load all students in a class
--   - Load all attendance for a student
--   - Load attendance for a class on a date
--   - Look up a day number for a date
-- =============================================================================

-- Students: filtering by class
CREATE INDEX IF NOT EXISTS idx_students_class_id
    ON students (class_id);

-- Attendance: primary lookup by student
CREATE INDEX IF NOT EXISTS idx_attendance_student_id
    ON attendance (student_id);

-- Attendance: primary lookup by date (for daily dashboard / marking)
CREATE INDEX IF NOT EXISTS idx_attendance_date
    ON attendance (date);

-- Attendance: filter by period within a date
CREATE INDEX IF NOT EXISTS idx_attendance_period_number
    ON attendance (period_number);

-- Attendance: combined (student + date) for percentage calculation
CREATE INDEX IF NOT EXISTS idx_attendance_student_date
    ON attendance (student_id, date);

-- Attendance: combined (date + period) for class-wide view
CREATE INDEX IF NOT EXISTS idx_attendance_date_period
    ON attendance (date, period_number);

-- Day cycle log: lookup by date
CREATE INDEX IF NOT EXISTS idx_day_cycle_log_date
    ON day_cycle_log (date);

-- Day cycle log: lookup by class
CREATE INDEX IF NOT EXISTS idx_day_cycle_log_class_id
    ON day_cycle_log (class_id);

-- Timetable: class + day lookup
CREATE INDEX IF NOT EXISTS idx_timetable_class_day
    ON timetable (class_id, day_number);

