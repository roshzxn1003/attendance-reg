-- ================================================================
-- MASTER SUPABASE AUTH & PASSWORDS SEED SCRIPT
-- ================================================================
-- This script creates encrypted Supabase Auth accounts for:
--   1. Administrator (admin@spiher.ac.in) -> pass: admin@123
--   2. CR CSE (cr.cse25@spiher.ac.in) -> pass: cr@123
--   3. CR AIDS (cr.aids25@spiher.ac.in) -> pass: cr@123
--   4. ALL 60 College Students (CSE-25 & AIDS-25) -> pass: spiher@123
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create User Roles Table in public schema
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

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_read_policy" ON public.user_roles;
CREATE POLICY "user_roles_read_policy" ON public.user_roles
    FOR SELECT USING (TRUE);

-- 2. Helper Function to create/update users in auth.users
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

-- ----------------------------------------------------------------
-- 3. SEED ADMIN & CR ACCOUNTS
-- ----------------------------------------------------------------
SELECT public.create_or_update_auth_user('admin@spiher.ac.in', 'admin@123', 'admin', 'System Administrator', 'CSE-25', NULL);
SELECT public.create_or_update_auth_user('cr.cse25@spiher.ac.in', 'cr@123', 'cr', 'Class Representative (CSE-25)', 'CSE-25', NULL);
SELECT public.create_or_update_auth_user('cr.aids25@spiher.ac.in', 'cr@123', 'cr', 'Class Representative (AIDS-25)', 'AIDS-25', NULL);

-- ----------------------------------------------------------------
-- 4. SEED ALL 60 STUDENTS (Default password: spiher@123)
-- ----------------------------------------------------------------
SELECT public.create_or_update_auth_user('abubuharii25.cse@spiher.ac.in', 'spiher@123', 'student', 'ABU BUHARI I', 'CSE-25', 'SPC25CSU001');
SELECT public.create_or_update_auth_user('arunkumarg25.cse@spiher.ac.in', 'spiher@123', 'student', 'ARUN KUMAR G', 'CSE-25', 'SPC25CSU002');
SELECT public.create_or_update_auth_user('arunroshangj25.cse@spiher.ac.in', 'spiher@123', 'student', 'ARUN ROSHAN GJ', 'CSE-25', 'SPC25CSU003');
SELECT public.create_or_update_auth_user('ashwinrajm25.cse@spiher.ac.in', 'spiher@123', 'student', 'ASHWIN RAJ M', 'CSE-25', 'SPC25CSU004');
SELECT public.create_or_update_auth_user('ayshasithikai25.cse@spiher.ac.in', 'spiher@123', 'student', 'AYSHA SITHIKA I', 'CSE-25', 'SPC25CSU005');
SELECT public.create_or_update_auth_user('charum25.cse@spiher.ac.in', 'spiher@123', 'student', 'CHARU M', 'CSE-25', 'SPC25CSU006');
SELECT public.create_or_update_auth_user('ebinesha25.cse@spiher.ac.in', 'spiher@123', 'student', 'EBINESH.A', 'CSE-25', 'SPC25CSU010');
SELECT public.create_or_update_auth_user('jananipriyaa25.cse@spiher.ac.in', 'spiher@123', 'student', 'JANANI PRIYA A', 'CSE-25', 'SPC25CSU012');
SELECT public.create_or_update_auth_user('karthicka25.cse@spiher.ac.in', 'spiher@123', 'student', 'KARTHICK A', 'CSE-25', 'SPC25CSU013');
SELECT public.create_or_update_auth_user('krishnapillaim25.cse@spiher.ac.in', 'spiher@123', 'student', 'KRISHNA PILLAI M', 'CSE-25', 'SPC25CSU014');
SELECT public.create_or_update_auth_user('lakshmidevib25.cse@spiher.ac.in', 'spiher@123', 'student', 'LAKSHMI DEVI B', 'CSE-25', 'SPC25CSU015');
SELECT public.create_or_update_auth_user('mahantg25.cse@spiher.ac.in', 'spiher@123', 'student', 'MAHANT G', 'CSE-25', 'SPC25CSU017');
SELECT public.create_or_update_auth_user('nancyi25.cse@spiher.ac.in', 'spiher@123', 'student', 'NANCY I', 'CSE-25', 'SPC25CSU018');
SELECT public.create_or_update_auth_user('nitins25.cse@spiher.ac.in', 'spiher@123', 'student', 'NITIN S', 'CSE-25', 'SPC25CSU019');
SELECT public.create_or_update_auth_user('periyakarupparajar25.cse@spiher.ac.in', 'spiher@123', 'student', 'PERIYA KARUPPA RAJA.R', 'CSE-25', 'SPC25CSU021');
SELECT public.create_or_update_auth_user('pothanp25.cse@spiher.ac.in', 'spiher@123', 'student', 'POTHAN P', 'CSE-25', 'SPC25CSU022');
SELECT public.create_or_update_auth_user('pradeepp25.cse@spiher.ac.in', 'spiher@123', 'student', 'PRADEEP P', 'CSE-25', 'SPC25CSU023');
SELECT public.create_or_update_auth_user('priyadharshinis25.cse@spiher.ac.in', 'spiher@123', 'student', 'PRIYADHARSHINI S', 'CSE-25', 'SPC25CSU026');
SELECT public.create_or_update_auth_user('rupashreep25.cse@spiher.ac.in', 'spiher@123', 'student', 'RUPASHREE P', 'CSE-25', 'SPC25CSU028');
SELECT public.create_or_update_auth_user('sanjeevkumard25.cse@spiher.ac.in', 'spiher@123', 'student', 'SANJEEV KUMAR D', 'CSE-25', 'SPC25CSU029');
SELECT public.create_or_update_auth_user('soundhariyans25.cse@spiher.ac.in', 'spiher@123', 'student', 'SOUNDHARIYAN S', 'CSE-25', 'SPC25CSU030');
SELECT public.create_or_update_auth_user('subasrip25.cse@spiher.ac.in', 'spiher@123', 'student', 'SUBASRI P', 'CSE-25', 'SPC25CSU033');
SELECT public.create_or_update_auth_user('thiruvenkadamr25.cse@spiher.ac.in', 'spiher@123', 'student', 'THIRUVENKADAM R', 'CSE-25', 'SPC25CSU034');
SELECT public.create_or_update_auth_user('varshinimarya25.cse@spiher.ac.in', 'spiher@123', 'student', 'VARSHINI MARY A', 'CSE-25', 'SPC25CSU035');
SELECT public.create_or_update_auth_user('vasanthm25.cse@spiher.ac.in', 'spiher@123', 'student', 'VASANTH M', 'CSE-25', 'SPC25CSU036');
SELECT public.create_or_update_auth_user('velmurugane25.cse@spiher.ac.in', 'spiher@123', 'student', 'VELMURUGAN E', 'CSE-25', 'SPC25CSU037');
SELECT public.create_or_update_auth_user('vetrivels25.cse@spiher.ac.in', 'spiher@123', 'student', 'VETRIVEL S', 'CSE-25', 'SPC25CSU038');
SELECT public.create_or_update_auth_user('yashinisp25.cse@spiher.ac.in', 'spiher@123', 'student', 'YASHINI S.P', 'CSE-25', 'SPC25CSU040');
SELECT public.create_or_update_auth_user('yetheshwarjg25.cse@spiher.ac.in', 'spiher@123', 'student', 'YETHESHWAR JG', 'CSE-25', 'SPC25CSU042');
SELECT public.create_or_update_auth_user('lokeshj25.cse@spiher.ac.in', 'spiher@123', 'student', 'LOKESH J', 'CSE-25', 'SPC25CSU043');
SELECT public.create_or_update_auth_user('hariharan25.cse@spiher.ac.in', 'spiher@123', 'student', 'HARIHARAN', 'CSE-25', 'SPC25CSU044');
SELECT public.create_or_update_auth_user('harshinidevi25.cse@spiher.ac.in', 'spiher@123', 'student', 'HARSHINI DEVI', 'CSE-25', 'SPC25CSU045');
SELECT public.create_or_update_auth_user('nagomij25.cse@spiher.ac.in', 'spiher@123', 'student', 'NAGOMI J', 'CSE-25', 'SPC25CSU046');
SELECT public.create_or_update_auth_user('naveenj25.cse@spiher.ac.in', 'spiher@123', 'student', 'NAVEEN J', 'CSE-25', 'SPC25CSU047');
SELECT public.create_or_update_auth_user('rahithr25.cse@spiher.ac.in', 'spiher@123', 'student', 'RAHITH R', 'CSE-25', 'SPC25CSU048');
SELECT public.create_or_update_auth_user('sadhanaa25.cse@spiher.ac.in', 'spiher@123', 'student', 'SADHANA A', 'CSE-25', 'SPC25CSU049');
SELECT public.create_or_update_auth_user('sadhanad25.cse@spiher.ac.in', 'spiher@123', 'student', 'SADHANA D', 'CSE-25', 'SPC25CSU050');
SELECT public.create_or_update_auth_user('sakthivela25.cse@spiher.ac.in', 'spiher@123', 'student', 'SAKTHIVEL A', 'CSE-25', 'SPC25CSU051');
SELECT public.create_or_update_auth_user('thamizarasans25.cse@spiher.ac.in', 'spiher@123', 'student', 'THAMIZARASAN S', 'CSE-25', 'SPC25CSU052');
SELECT public.create_or_update_auth_user('varalakshmiv25.cse@spiher.ac.in', 'spiher@123', 'student', 'VARALAKSHMI V', 'CSE-25', 'SPC25CSU053');
SELECT public.create_or_update_auth_user('vishalv25.cse@spiher.ac.in', 'spiher@123', 'student', 'VISHAL V', 'CSE-25', 'SPC25CSU054');
SELECT public.create_or_update_auth_user('ajaypoluboina25.cse@spiher.ac.in', 'spiher@123', 'student', 'AJAY POLU BOINA', 'CSE-25', 'SPC25CSU055');
SELECT public.create_or_update_auth_user('moneshwarr25.cse@spiher.ac.in', 'spiher@123', 'student', 'MONESHWAR R', 'CSE-25', 'SPC25CSU056');
SELECT public.create_or_update_auth_user('rageshr25.cse@spiher.ac.in', 'spiher@123', 'student', 'RAGESH R', 'CSE-25', 'SPC25CSU057');
SELECT public.create_or_update_auth_user('akashk25.aids@spiher.ac.in', 'spiher@123', 'student', 'AKASH K', 'AIDS-25', 'SPC25CSU602');
SELECT public.create_or_update_auth_user('dhananjayanb25.aids@spiher.ac.in', 'spiher@123', 'student', 'DHANANJAYAN B', 'AIDS-25', 'SPC25CSU605');
SELECT public.create_or_update_auth_user('endluricharan25.aids@spiher.ac.in', 'spiher@123', 'student', 'ENDLURI CHARAN', 'AIDS-25', 'SPC25CSU607');
SELECT public.create_or_update_auth_user('gayathri25.aids@spiher.ac.in', 'spiher@123', 'student', 'GAYATHRI', 'AIDS-25', 'SPC25CSU608');
SELECT public.create_or_update_auth_user('kameshr25.aids@spiher.ac.in', 'spiher@123', 'student', 'KAMESH R', 'AIDS-25', 'SPC25CSU611');
SELECT public.create_or_update_auth_user('keerthanas25.aids@spiher.ac.in', 'spiher@123', 'student', 'KEERTHANA S', 'AIDS-25', 'SPC25CSU612');
SELECT public.create_or_update_auth_user('krishnapuradhanusri25.aids@spiher.ac.in', 'spiher@123', 'student', 'KRISHNAPURAM DHANUSRI', 'AIDS-25', 'SPC25CSU614');
SELECT public.create_or_update_auth_user('mohammedalik25.aids@spiher.ac.in', 'spiher@123', 'student', 'MOHAMMED ALI K', 'AIDS-25', 'SPC25CSU616');
SELECT public.create_or_update_auth_user('nithyashreeg25.aids@spiher.ac.in', 'spiher@123', 'student', 'NITHYA SHREE G', 'AIDS-25', 'SPC25CSU618');
SELECT public.create_or_update_auth_user('nuthalapatimonika25.aids@spiher.ac.in', 'spiher@123', 'student', 'NUTHALAPATI MONIKA', 'AIDS-25', 'SPC25CSU619');
SELECT public.create_or_update_auth_user('praveene25.aids@spiher.ac.in', 'spiher@123', 'student', 'PRAVEEN E', 'AIDS-25', 'SPC25CSU620');
SELECT public.create_or_update_auth_user('rohithr25.aids@spiher.ac.in', 'spiher@123', 'student', 'ROHITH R', 'AIDS-25', 'SPC25CSU621');
SELECT public.create_or_update_auth_user('tharanih25.aids@spiher.ac.in', 'spiher@123', 'student', 'THARANI H', 'AIDS-25', 'SPC25CSU626');
SELECT public.create_or_update_auth_user('vijayakumart25.aids@spiher.ac.in', 'spiher@123', 'student', 'VIJAYAKUMAR T', 'AIDS-25', 'SPC25CSU628');
SELECT public.create_or_update_auth_user('haripriyas25.aids@spiher.ac.in', 'spiher@123', 'student', 'HARIPRIYA S', 'AIDS-25', 'SPC25CSU630');
SELECT public.create_or_update_auth_user('shaguftas25.aids@spiher.ac.in', 'spiher@123', 'student', 'SHAGUFTA S', 'AIDS-25', 'SPC25CSU633');

DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: All Admin, CR, and 60 Students seeded into Supabase Auth with passwords!';
END $$;
