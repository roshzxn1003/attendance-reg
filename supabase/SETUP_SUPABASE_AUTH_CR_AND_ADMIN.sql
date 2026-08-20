-- ================================================================
-- SUPABASE AUTHENTICATION & AUTHORIZATION SETUP (CR & ADMIN)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create / Alter User Roles Table in public schema
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cr', 'student')),
    class_id TEXT REFERENCES public.classes(class_id),
    name TEXT,
    student_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist even if the table was created in an earlier migration
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_read_policy" ON public.user_roles;
CREATE POLICY "user_roles_read_policy" ON public.user_roles
    FOR SELECT USING (TRUE);

-- 2. Helper Function: Get Current User Role from JWT or user_roles table
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
BEGIN
    IF (auth.jwt() -> 'user_metadata' ->> 'role') IS NOT NULL THEN
        RETURN (auth.jwt() -> 'user_metadata' ->> 'role');
    END IF;

    RETURN COALESCE(
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
        'anon'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Helper Function: Create or Update Supabase Auth Users with Roles
CREATE OR REPLACE FUNCTION public.create_or_update_auth_user(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_name TEXT,
    p_class_id TEXT DEFAULT NULL,
    p_student_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

    IF v_user_id IS NULL THEN
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
                'class_id', p_class_id,
                'student_id', p_student_id
            ),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
    ELSE
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            raw_user_meta_data = jsonb_build_object(
                'role', p_role,
                'name', p_name,
                'class_id', p_class_id,
                'student_id', p_student_id
            ),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    INSERT INTO public.user_roles (user_id, email, role, class_id, name, student_id, updated_at)
    VALUES (v_user_id, p_email, p_role, p_class_id, p_name, p_student_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        class_id = EXCLUDED.class_id,
        name = EXCLUDED.name,
        student_id = EXCLUDED.student_id,
        updated_at = NOW();

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Seed Dedicated Admin & CR accounts
SELECT public.create_or_update_auth_user('admin@spiher.ac.in', 'Admin#2026', 'admin', 'System Administrator', 'CSE-25', NULL);
SELECT public.create_or_update_auth_user('cr.cse25@spiher.ac.in', 'CR#2026', 'cr', 'Class Representative (CSE-25)', 'CSE-25', NULL);
SELECT public.create_or_update_auth_user('cr.aids25@spiher.ac.in', 'CR#2026', 'cr', 'Class Representative (AIDS-25)', 'AIDS-25', NULL);

DO $$
BEGIN
    RAISE NOTICE 'Supabase Auth for CR and Admin configured successfully!';
END $$;
