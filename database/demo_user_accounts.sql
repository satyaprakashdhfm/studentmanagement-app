-- ============================================================================
-- USER ACCOUNT CREATION DEMO
-- ============================================================================
--
-- This script demonstrates the automatic user account creation feature
-- when students and teachers are added to the system.
--
-- Run this script to see the user account automation in action.
--
-- ============================================================================

\echo '========================================'
\echo 'USER ACCOUNT CREATION DEMO'
\echo '========================================'

-- Demo 1: Create a student and see user account auto-creation
\echo '\n1. CREATING A STUDENT...'
INSERT INTO students (
    student_id, name, email, class_id, status, admission_date
) VALUES (
    'DEMO_STUDENT_001', 'Demo Student', 'demo.student@example.com',
    242508001, 'active', CURRENT_DATE
);

\echo '\n   Student created. Checking for auto-generated user account...'
SELECT
    username,
    email,
    first_name,
    last_name,
    role,
    active
FROM users
WHERE username = 'DEMO_STUDENT_001';

-- Demo 2: Create a teacher and see user account auto-creation
\echo '\n2. CREATING A TEACHER...'
INSERT INTO teachers (
    teacher_id, name, email, subjects_handled, classes_assigned, active, hire_date
) VALUES (
    'DEMO_TEACHER_001', 'Demo Teacher', 'demo.teacher@example.com',
    ARRAY['MATH_8', 'SCIENCE_8'], ARRAY['8 Grade'], TRUE, CURRENT_DATE
);

\echo '\n   Teacher created. Checking for auto-generated user account...'
SELECT
    username,
    email,
    first_name,
    last_name,
    role,
    active
FROM users
WHERE username = 'DEMO_TEACHER_001';

-- Demo 3: Show default password format
\echo '\n3. DEFAULT PASSWORD FORMAT...'
\echo '   Format: DefaultPass + Last4DigitsOfID + CurrentYear'
\echo '   Example for DEMO_STUDENT_001: DefaultPass00012025'
\echo '   Example for DEMO_TEACHER_001: DefaultPass00012025'
\echo ''
\echo '   ⚠️  IMPORTANT: In production, passwords should be properly hashed!'
\echo '   The current implementation uses a placeholder hash format.'
\echo '   Update the create_user_account() function to use proper bcrypt hashing.'

-- Demo 4: Show all demo user accounts
\echo '\n4. ALL DEMO USER ACCOUNTS CREATED...'
SELECT
    username,
    email,
    CONCAT(first_name, ' ', COALESCE(last_name, '')) as full_name,
    role,
    active,
    created_at
FROM users
WHERE username LIKE 'DEMO_%'
ORDER BY created_at DESC;

\echo '\n========================================'
\echo 'DEMO COMPLETE'
\echo '========================================'
\echo ''
\echo 'Features demonstrated:'
\echo '✅ Username = student_id/teacher_id'
\echo '✅ Email from student/teacher record'
\echo '✅ Role assignment (student/teacher)'
\echo '✅ Name parsing (first_name/last_name)'
\echo '✅ Default password generation'
\echo '✅ Account activation status'
\echo ''
\echo 'To clean up demo data, run:'
\echo 'DELETE FROM users WHERE username LIKE '\''DEMO_%'';'
\echo 'DELETE FROM fees WHERE student_id LIKE '\''DEMO_%'';'
\echo 'DELETE FROM students WHERE student_id LIKE '\''DEMO_%'';'
\echo 'DELETE FROM teachers WHERE teacher_id LIKE '\''DEMO_%'';'
