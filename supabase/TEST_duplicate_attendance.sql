-- =============================================================================
-- Step 5 Verification: Test that duplicate attendance is REJECTED
-- Run this in the Supabase SQL Editor AFTER running the main migration.
-- All inserts are rolled back at the end — nothing persists.
-- =============================================================================

DO $$
DECLARE
    inserted_count INTEGER;
BEGIN
    -- ---------------------------------------------------------------
    -- Step 1: Insert a temporary test student linked to CSE-25
    -- ---------------------------------------------------------------
    INSERT INTO students (student_id, class_id, name, active)
    VALUES ('TEST_STUDENT_001', 'CSE-25', 'Test Student (DELETE ME)', TRUE);

    -- ---------------------------------------------------------------
    -- Step 2: First attendance record — must SUCCEED
    -- ---------------------------------------------------------------
    INSERT INTO attendance (student_id, date, period_number, status)
    VALUES ('TEST_STUDENT_001', '2026-08-20', 1, 'P');

    RAISE NOTICE 'Step 2 OK: First attendance insert succeeded (expected).';

    -- ---------------------------------------------------------------
    -- Step 3: Duplicate — must be REJECTED by the UNIQUE constraint
    -- ---------------------------------------------------------------
    BEGIN
        INSERT INTO attendance (student_id, date, period_number, status)
        VALUES ('TEST_STUDENT_001', '2026-08-20', 1, 'A');

        -- Reaching this line means the constraint is broken
        RAISE EXCEPTION 'FAIL: Duplicate attendance was NOT rejected — constraint is broken!';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Step 3 OK: Duplicate correctly REJECTED (unique_violation).';
    END;

    -- ---------------------------------------------------------------
    -- Step 4: Confirm exactly 1 row exists for this slot
    -- ---------------------------------------------------------------
    SELECT COUNT(*) INTO inserted_count
    FROM attendance
    WHERE student_id = 'TEST_STUDENT_001'
      AND date = '2026-08-20'
      AND period_number = 1;

    IF inserted_count = 1 THEN
        RAISE NOTICE 'Step 4 OK: Exactly 1 row exists — duplicate blocked correctly.';
    ELSE
        RAISE EXCEPTION 'FAIL: Expected 1 row, found %.', inserted_count;
    END IF;

    -- ---------------------------------------------------------------
    -- Step 5: Trigger rollback via a custom exception
    -- ---------------------------------------------------------------
    RAISE EXCEPTION 'ROLLBACK_MARKER';

EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'ROLLBACK_MARKER' THEN
            RAISE NOTICE '=== All duplicate-prevention tests PASSED. Test data rolled back cleanly. ===';
        ELSE
            RAISE;  -- re-raise any real unexpected error
        END IF;
END $$;
