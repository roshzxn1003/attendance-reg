-- =============================================================================
-- Smart College CR Attendance Management System
-- Migration: 004 - Row Level Security Policies
-- Created: 2026-08-20
-- Description: Defines RLS policies for all tables so the anon key
--              can read and write data from the frontend.
--
-- CONTEXT: This app has no user-level authentication in the current phase
--          (Step 3/4). All access is via the Supabase anon key.
--          Policies are set permissive for now and will be tightened
--          when authentication is added in a later step.
--
-- SECURITY NOTE: The anon key is already restricted to this project.
--                The service_role key is never used in frontend code.
-- =============================================================================


-- ============================================================
-- classes — read-only for anon (only admin SQL seeds this)
-- ============================================================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select_anon" ON classes;
CREATE POLICY "classes_select_anon"
    ON classes FOR SELECT
    TO anon
    USING (true);


-- ============================================================
-- students — full CRUD for anon (CR imports and edits roster)
-- ============================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_select_anon" ON students;
CREATE POLICY "students_select_anon"
    ON students FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "students_insert_anon" ON students;
CREATE POLICY "students_insert_anon"
    ON students FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "students_update_anon" ON students;
CREATE POLICY "students_update_anon"
    ON students FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "students_delete_anon" ON students;
CREATE POLICY "students_delete_anon"
    ON students FOR DELETE
    TO anon
    USING (true);


-- ============================================================
-- timetable — full CRUD for anon (admin configures it)
-- ============================================================
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_select_anon" ON timetable;
CREATE POLICY "timetable_select_anon"
    ON timetable FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "timetable_insert_anon" ON timetable;
CREATE POLICY "timetable_insert_anon"
    ON timetable FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "timetable_update_anon" ON timetable;
CREATE POLICY "timetable_update_anon"
    ON timetable FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "timetable_delete_anon" ON timetable;
CREATE POLICY "timetable_delete_anon"
    ON timetable FOR DELETE
    TO anon
    USING (true);


-- ============================================================
-- day_cycle_log — full CRUD for anon (CR sets day numbers)
-- ============================================================
ALTER TABLE day_cycle_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "day_cycle_log_select_anon" ON day_cycle_log;
CREATE POLICY "day_cycle_log_select_anon"
    ON day_cycle_log FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "day_cycle_log_insert_anon" ON day_cycle_log;
CREATE POLICY "day_cycle_log_insert_anon"
    ON day_cycle_log FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "day_cycle_log_update_anon" ON day_cycle_log;
CREATE POLICY "day_cycle_log_update_anon"
    ON day_cycle_log FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "day_cycle_log_delete_anon" ON day_cycle_log;
CREATE POLICY "day_cycle_log_delete_anon"
    ON day_cycle_log FOR DELETE
    TO anon
    USING (true);


-- ============================================================
-- attendance — full CRUD for anon (CR marks attendance)
-- ============================================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_anon" ON attendance;
CREATE POLICY "attendance_select_anon"
    ON attendance FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "attendance_insert_anon" ON attendance;
CREATE POLICY "attendance_insert_anon"
    ON attendance FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_update_anon" ON attendance;
CREATE POLICY "attendance_update_anon"
    ON attendance FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_delete_anon" ON attendance;
CREATE POLICY "attendance_delete_anon"
    ON attendance FOR DELETE
    TO anon
    USING (true);


-- ============================================================
-- holidays — full CRUD for anon (admin marks holidays)
-- ============================================================
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_select_anon" ON holidays;
CREATE POLICY "holidays_select_anon"
    ON holidays FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "holidays_insert_anon" ON holidays;
CREATE POLICY "holidays_insert_anon"
    ON holidays FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "holidays_update_anon" ON holidays;
CREATE POLICY "holidays_update_anon"
    ON holidays FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "holidays_delete_anon" ON holidays;
CREATE POLICY "holidays_delete_anon"
    ON holidays FOR DELETE
    TO anon
    USING (true);


-- ============================================================
-- Verification
-- ============================================================
DO $$ BEGIN
    RAISE NOTICE 'OK: RLS policies applied to all 6 tables (classes, students, timetable, day_cycle_log, attendance, holidays)';
    RAISE NOTICE 'NOTE: These are permissive anon policies. Tighten with auth when authentication is added.';
END $$;
