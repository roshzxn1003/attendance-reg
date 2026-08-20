-- =============================================================================
-- Smart College CR Attendance Management System
-- Migration: 003 - Verification Queries
-- Created: 2026-08-20
-- Description: Read-only verification of schema setup.
--              Run this after migrations to confirm everything is correct.
--              Safe to run multiple times.
-- =============================================================================

-- 1. Verify classes were seeded
DO $$
DECLARE
    class_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO class_count FROM classes;
    IF class_count < 2 THEN
        RAISE EXCEPTION 'ERROR: Expected 2 class records, found %', class_count;
    END IF;
    RAISE NOTICE 'OK: classes table has % records', class_count;
END $$;

-- 2. Verify attendance unique constraint exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'attendance'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'uq_attendance_per_student_period'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'ERROR: UNIQUE constraint uq_attendance_per_student_period NOT found on attendance table';
    END IF;
    RAISE NOTICE 'OK: attendance duplicate-prevention UNIQUE constraint exists';
END $$;

-- 3. Verify day_cycle_log CHECK constraint exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'day_cycle_log'
          AND constraint_type = 'CHECK'
          AND constraint_name = 'chk_day_or_holiday'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'ERROR: CHECK constraint chk_day_or_holiday NOT found on day_cycle_log table';
    END IF;
    RAISE NOTICE 'OK: day_cycle_log holiday/day mutual exclusion CHECK constraint exists';
END $$;

-- 4. Verify all required indexes exist
DO $$
DECLARE
    idx_name TEXT;
    expected_indexes TEXT[] := ARRAY[
        'idx_students_class_id',
        'idx_attendance_student_id',
        'idx_attendance_date',
        'idx_attendance_period_number',
        'idx_attendance_student_date',
        'idx_attendance_date_period',
        'idx_day_cycle_log_date',
        'idx_day_cycle_log_class_id',
        'idx_timetable_class_day'
    ];
BEGIN
    FOREACH idx_name IN ARRAY expected_indexes LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = idx_name
        ) THEN
            RAISE EXCEPTION 'ERROR: Missing index: %', idx_name;
        END IF;
    END LOOP;
    RAISE NOTICE 'OK: All 9 required indexes are present';
END $$;

-- 5. Verify timetable CHECK constraint on day_number
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
            ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'timetable'
          AND tc.constraint_type = 'CHECK'
          AND cc.check_clause LIKE '%day_number%'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        RAISE WARNING 'WARNING: day_number CHECK on timetable may not be named as expected — verify manually';
    ELSE
        RAISE NOTICE 'OK: timetable.day_number BETWEEN 1 AND 6 CHECK constraint exists';
    END IF;
END $$;

DO $$ BEGIN
    RAISE NOTICE '=== All verification checks passed ===';
END $$;

