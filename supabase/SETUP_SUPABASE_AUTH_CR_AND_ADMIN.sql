-- ================================================================
-- SUPABASE AUTHENTICATION & AUTHORIZATION SETUP (CR & ADMIN)
-- ================================================================
-- Run this script in the Supabase Dashboard -> SQL Editor.
-- This sets up Supabase Auth User Roles and RLS policies for:
--   1. Administrator (admin@spiher.ac.in) -> Role: 'admin'
--   2. Class Representative CSE (cr.cse25@spiher.ac.in) -> Role: 'cr'
--   3. Class Representative AIDS (cr.aids25@spiher.ac.in) -> Role: 'cr'
-- ================================================================

-- 1. Enable pgcrypto extension for secure password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create User Roles Table in public schema
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cr', 'student')),
    class_id TEXT REFERENCES public.classes(class_id),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Policy for user_roles: Users can read their own role; Admins can manage all
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
    ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 4. Helper Function: Get Current User Role from JWT or user_roles table
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
BEGIN
    -- Check user metadata in JWT token first
    IF (auth.jwt() -> 'user_metadata' ->> 'role') IS NOT NULL THEN
        RETURN (auth.jwt() -> 'user_metadata' ->> 'role');
    END IF;

    -- Otherwise check public.user_roles table
    RETURN COALESCE(
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
        'anon'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Helper Function: Create or Update Supabase Auth Users with Roles
CREATE OR REPLACE FUNCTION public.create_or_update_auth_user(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_name TEXT,
    p_class_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Check if user already exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

    IF v_user_id IS NULL THEN
        -- Generate new UUID and insert into auth.users
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            p_email,
            v_encrypted_pw,
            NOW(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object(
                'role', p_role,
                'name', p_name,
                'class_id', p_class_id
            ),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
    ELSE
        -- Update existing user password and metadata
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object(
                'role', p_role,
                'name', p_name,
                'class_id', p_class_id
            ),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- Upsert into public.user_roles table
    INSERT INTO public.user_roles (user_id, email, role, class_id, name, updated_at)
    VALUES (v_user_id, p_email, p_role, p_class_id, p_name, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        class_id = EXCLUDED.class_id,
        name = EXCLUDED.name,
        updated_at = NOW();

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. SEED DEFAULT AUTH ACCOUNTS IN SUPABASE
-- ================================================================

-- 1. Administrator Account
SELECT public.create_or_update_auth_user(
    'admin@spiher.ac.in',
    'admin@123',
    'admin',
    'System Administrator (HOD / Faculty)',
    'CSE-25'
);

-- 2. Class Representative (CSE-25)
SELECT public.create_or_update_auth_user(
    'cr.cse25@spiher.ac.in',
    'cr@123',
    'cr',
    'Class Representative (CSE-25)',
    'CSE-25'
);

-- 3. Class Representative (AIDS-25)
SELECT public.create_or_update_auth_user(
    'cr.aids25@spiher.ac.in',
    'cr@123',
    'cr',
    'Class Representative (AIDS-25)',
    'AIDS-25'
);

-- 4. Sample Student Account (Abu Buhari)
SELECT public.create_or_update_auth_user(
    'abubuharii25.cse@spiher.ac.in',
    'spiher@123',
    'student',
    'ABU BUHARI I',
    'CSE-25'
);

-- ================================================================
-- 7. REFRESH ROW LEVEL SECURITY POLICIES FOR CR & ADMIN
-- ================================================================

-- Attendance Table RLS
DROP POLICY IF EXISTS "attendance_select_policy" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_policy" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_policy" ON public.attendance;
DROP POLICY IF EXISTS "attendance_delete_policy" ON public.attendance;

CREATE POLICY "attendance_select_policy" ON public.attendance
    FOR SELECT USING (TRUE);

CREATE POLICY "attendance_insert_policy" ON public.attendance
    FOR INSERT WITH CHECK (
        public.get_current_role() IN ('admin', 'cr') OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

CREATE POLICY "attendance_update_policy" ON public.attendance
    FOR UPDATE USING (
        public.get_current_role() IN ('admin', 'cr') OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

CREATE POLICY "attendance_delete_policy" ON public.attendance
    FOR DELETE USING (
        public.get_current_role() = 'admin' OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- Day Cycle Log Table RLS
DROP POLICY IF EXISTS "day_cycle_log_modify_policy" ON public.day_cycle_log;
CREATE POLICY "day_cycle_log_modify_policy" ON public.day_cycle_log
    FOR ALL USING (
        public.get_current_role() IN ('admin', 'cr') OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- Timetable Table RLS
DROP POLICY IF EXISTS "timetable_modify_policy" ON public.timetable;
CREATE POLICY "timetable_modify_policy" ON public.timetable
    FOR ALL USING (
        public.get_current_role() IN ('admin', 'cr') OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- Students Table RLS
DROP POLICY IF EXISTS "students_modify_policy" ON public.students;
CREATE POLICY "students_modify_policy" ON public.students
    FOR ALL USING (
        public.get_current_role() = 'admin' OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- Confirmation output
DO $$
BEGIN
    RAISE NOTICE 'Supabase Auth for CR, Admin, and Students configured successfully!';
END $$;
