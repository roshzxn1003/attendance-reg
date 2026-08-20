-- =============================================================================
-- Smart College CR Attendance Management System
-- Migration: 005 - Seed Official Timetable (CSE-25 and AIDS-25)
-- Created: 2026-08-20
-- Description: Seeds the full Day Order 1 to Day Order 6 timetable from the official
--              SPIHER Department of CSE timetable (May 2026 – Dec 2026, Room 245).
-- =============================================================================

-- Clear existing timetable entries if re-seeding to prevent duplicates
DELETE FROM timetable WHERE class_id IN ('CSE-25', 'AIDS-25');

-- CSE-25 Timetable (42 entries across Day Order 1–6)
INSERT INTO timetable (class_id, day_number, period_number, subject, start_time, end_time) VALUES
    -- Day Order 1
    ('CSE-25', 1, 1, 'DM', '08:30:00', '09:30:00'),
    ('CSE-25', 1, 2, 'DAA LAB', '09:30:00', '10:30:00'),
    ('CSE-25', 1, 3, 'DAA LAB', '10:45:00', '11:45:00'),
    ('CSE-25', 1, 4, 'DAA LAB', '11:45:00', '12:45:00'),
    ('CSE-25', 1, 5, 'DBMS', '13:15:00', '14:10:00'),
    ('CSE-25', 1, 6, 'DAA', '14:10:00', '15:05:00'),
    ('CSE-25', 1, 7, 'UHV', '15:05:00', '16:00:00'),

    -- Day Order 2
    ('CSE-25', 2, 1, 'DAA', '08:30:00', '09:30:00'),
    ('CSE-25', 2, 2, 'DM', '09:30:00', '10:30:00'),
    ('CSE-25', 2, 3, 'OS', '10:45:00', '11:45:00'),
    ('CSE-25', 2, 4, 'CA', '11:45:00', '12:45:00'),
    ('CSE-25', 2, 5, 'OS', '13:15:00', '14:10:00'),
    ('CSE-25', 2, 6, 'DBMS', '14:10:00', '15:05:00'),
    ('CSE-25', 2, 7, 'UHV', '15:05:00', '16:00:00'),

    -- Day Order 3
    ('CSE-25', 3, 1, 'IOT', '08:30:00', '09:30:00'),
    ('CSE-25', 3, 2, 'DBMS LAB', '09:30:00', '10:30:00'),
    ('CSE-25', 3, 3, 'DBMS LAB', '10:45:00', '11:45:00'),
    ('CSE-25', 3, 4, 'DBMS LAB', '11:45:00', '12:45:00'),
    ('CSE-25', 3, 5, 'YOGA', '13:15:00', '14:10:00'),
    ('CSE-25', 3, 6, 'COURSERA', '14:10:00', '15:05:00'),
    ('CSE-25', 3, 7, 'PET', '15:05:00', '16:00:00'),

    -- Day Order 4
    ('CSE-25', 4, 1, 'DAA', '08:30:00', '09:30:00'),
    ('CSE-25', 4, 2, 'DBMS', '09:30:00', '10:30:00'),
    ('CSE-25', 4, 3, 'DM', '10:45:00', '11:45:00'),
    ('CSE-25', 4, 4, 'CA', '11:45:00', '12:45:00'),
    ('CSE-25', 4, 5, 'IOT', '13:15:00', '14:10:00'),
    ('CSE-25', 4, 6, 'DM', '14:10:00', '15:05:00'),
    ('CSE-25', 4, 7, 'DBMS', '15:05:00', '16:00:00'),

    -- Day Order 5
    ('CSE-25', 5, 1, 'DAA', '08:30:00', '09:30:00'),
    ('CSE-25', 5, 2, 'OS LAB', '09:30:00', '10:30:00'),
    ('CSE-25', 5, 3, 'OS LAB', '10:45:00', '11:45:00'),
    ('CSE-25', 5, 4, 'OS LAB', '11:45:00', '12:45:00'),
    ('CSE-25', 5, 5, 'DM', '13:15:00', '14:10:00'),
    ('CSE-25', 5, 6, 'IOT', '14:10:00', '15:05:00'),
    ('CSE-25', 5, 7, 'CA', '15:05:00', '16:00:00'),

    -- Day Order 6
    ('CSE-25', 6, 1, 'OS', '08:30:00', '09:30:00'),
    ('CSE-25', 6, 2, 'IOT', '09:30:00', '10:30:00'),
    ('CSE-25', 6, 3, 'DAA', '10:45:00', '11:45:00'),
    ('CSE-25', 6, 4, 'CA', '11:45:00', '12:45:00'),
    ('CSE-25', 6, 5, 'LIB', '13:15:00', '14:10:00'),
    ('CSE-25', 6, 6, 'DBMS', '14:10:00', '15:05:00'),
    ('CSE-25', 6, 7, 'OS', '15:05:00', '16:00:00');

-- AIDS-25 Timetable (42 entries across Day Order 1–6, with AI subject in CA/AI slots)
INSERT INTO timetable (class_id, day_number, period_number, subject, start_time, end_time) VALUES
    -- Day Order 1
    ('AIDS-25', 1, 1, 'DM', '08:30:00', '09:30:00'),
    ('AIDS-25', 1, 2, 'DAA LAB', '09:30:00', '10:30:00'),
    ('AIDS-25', 1, 3, 'DAA LAB', '10:45:00', '11:45:00'),
    ('AIDS-25', 1, 4, 'DAA LAB', '11:45:00', '12:45:00'),
    ('AIDS-25', 1, 5, 'DBMS', '13:15:00', '14:10:00'),
    ('AIDS-25', 1, 6, 'DAA', '14:10:00', '15:05:00'),
    ('AIDS-25', 1, 7, 'UHV', '15:05:00', '16:00:00'),

    -- Day Order 2
    ('AIDS-25', 2, 1, 'DAA', '08:30:00', '09:30:00'),
    ('AIDS-25', 2, 2, 'DM', '09:30:00', '10:30:00'),
    ('AIDS-25', 2, 3, 'OS', '10:45:00', '11:45:00'),
    ('AIDS-25', 2, 4, 'AI', '11:45:00', '12:45:00'),
    ('AIDS-25', 2, 5, 'OS', '13:15:00', '14:10:00'),
    ('AIDS-25', 2, 6, 'DBMS', '14:10:00', '15:05:00'),
    ('AIDS-25', 2, 7, 'UHV', '15:05:00', '16:00:00'),

    -- Day Order 3
    ('AIDS-25', 3, 1, 'IOT', '08:30:00', '09:30:00'),
    ('AIDS-25', 3, 2, 'DBMS LAB', '09:30:00', '10:30:00'),
    ('AIDS-25', 3, 3, 'DBMS LAB', '10:45:00', '11:45:00'),
    ('AIDS-25', 3, 4, 'DBMS LAB', '11:45:00', '12:45:00'),
    ('AIDS-25', 3, 5, 'YOGA', '13:15:00', '14:10:00'),
    ('AIDS-25', 3, 6, 'COURSERA', '14:10:00', '15:05:00'),
    ('AIDS-25', 3, 7, 'PET', '15:05:00', '16:00:00'),

    -- Day Order 4
    ('AIDS-25', 4, 1, 'DAA', '08:30:00', '09:30:00'),
    ('AIDS-25', 4, 2, 'DBMS', '09:30:00', '10:30:00'),
    ('AIDS-25', 4, 3, 'DM', '10:45:00', '11:45:00'),
    ('AIDS-25', 4, 4, 'AI', '11:45:00', '12:45:00'),
    ('AIDS-25', 4, 5, 'IOT', '13:15:00', '14:10:00'),
    ('AIDS-25', 4, 6, 'DM', '14:10:00', '15:05:00'),
    ('AIDS-25', 4, 7, 'DBMS', '15:05:00', '16:00:00'),

    -- Day Order 5
    ('AIDS-25', 5, 1, 'DAA', '08:30:00', '09:30:00'),
    ('AIDS-25', 5, 2, 'OS LAB', '09:30:00', '10:30:00'),
    ('AIDS-25', 5, 3, 'OS LAB', '10:45:00', '11:45:00'),
    ('AIDS-25', 5, 4, 'OS LAB', '11:45:00', '12:45:00'),
    ('AIDS-25', 5, 5, 'DM', '13:15:00', '14:10:00'),
    ('AIDS-25', 5, 6, 'IOT', '14:10:00', '15:05:00'),
    ('AIDS-25', 5, 7, 'AI', '15:05:00', '16:00:00'),

    -- Day Order 6
    ('AIDS-25', 6, 1, 'OS', '08:30:00', '09:30:00'),
    ('AIDS-25', 6, 2, 'IOT', '09:30:00', '10:30:00'),
    ('AIDS-25', 6, 3, 'DAA', '10:45:00', '11:45:00'),
    ('AIDS-25', 6, 4, 'AI', '11:45:00', '12:45:00'),
    ('AIDS-25', 6, 5, 'LIB', '13:15:00', '14:10:00'),
    ('AIDS-25', 6, 6, 'DBMS', '14:10:00', '15:05:00'),
    ('AIDS-25', 6, 7, 'OS', '15:05:00', '16:00:00');

-- Verification query
DO $$
DECLARE
    cse_count INTEGER;
    aids_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cse_count FROM timetable WHERE class_id = 'CSE-25';
    SELECT COUNT(*) INTO aids_count FROM timetable WHERE class_id = 'AIDS-25';
    
    IF cse_count != 42 THEN
        RAISE EXCEPTION 'ERROR: Expected 42 CSE-25 entries, found %', cse_count;
    END IF;
    IF aids_count != 42 THEN
        RAISE EXCEPTION 'ERROR: Expected 42 AIDS-25 entries, found %', aids_count;
    END IF;

    RAISE NOTICE 'OK: Timetable seeded successfully with 84 total periods (42 CSE-25, 42 AIDS-25).';
END $$;
