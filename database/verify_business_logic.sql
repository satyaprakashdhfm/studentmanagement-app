-- ============================================================================
-- BUSINESS LOGIC VERIFICATION SCRIPT
-- ============================================================================
--
-- Run this script to verify that all business logic functions and triggers
-- are properly installed and working in your database.
--
-- Usage: psql -h localhost -U postgres -d student_management -f verify_business_logic.sql
--
-- ============================================================================

\echo '========================================'
\echo 'BUSINESS LOGIC VERIFICATION REPORT'
\echo '========================================'

-- Check 1: Required Functions
\echo '\n1. CHECKING REQUIRED FUNCTIONS...'
SELECT
    'Functions Found: ' || COUNT(*)::text as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name IN (
    'create_student_fees',
    'check_teacher_schedule_conflict',
    'validate_teacher_subject_qualification',
    'check_class_capacity',
    'calculate_grade',
    'validate_fee_payment',
    'get_available_teachers_for_class',
    'get_class_utilization',
    'generate_schedule_id',
    'validate_schedule_insertion',
    'update_student_fees_on_class_change',
    'create_user_account'
);

-- List all business logic functions
\echo '\nBusiness Logic Functions:'
SELECT
    routine_name,
    '✅ INSTALLED' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name IN (
    'create_student_fees',
    'check_teacher_schedule_conflict',
    'validate_teacher_subject_qualification',
    'check_class_capacity',
    'calculate_grade',
    'validate_fee_payment',
    'get_available_teachers_for_class',
    'get_class_utilization',
    'generate_schedule_id',
    'validate_schedule_insertion',
    'update_student_fees_on_class_change'
)
ORDER BY routine_name;

-- Check 2: Required Triggers
\echo '\n2. CHECKING REQUIRED TRIGGERS...'
SELECT
    'Triggers Found: ' || COUNT(*)::text as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'trigger_create_student_fees',
    'trigger_check_teacher_schedule_conflict',
    'trigger_validate_teacher_qualification',
    'trigger_check_class_capacity',
    'trigger_calculate_grade',
    'trigger_validate_fee_payment',
    'trigger_validate_schedule_insertion',
    'trigger_update_student_fees_on_class_change',
    'trigger_create_student_user_account',
    'trigger_create_teacher_user_account'
);

-- List all business logic triggers
\echo '\nBusiness Logic Triggers:'
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    '✅ ACTIVE' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'trigger_create_student_fees',
    'trigger_check_teacher_schedule_conflict',
    'trigger_validate_teacher_qualification',
    'trigger_check_class_capacity',
    'trigger_calculate_grade',
    'trigger_validate_fee_payment',
    'trigger_validate_schedule_insertion',
    'trigger_update_student_fees_on_class_change'
)
ORDER BY event_object_table, trigger_name;

-- Check 3: Required CHECK Constraints
\echo '\n3. CHECKING CHECK CONSTRAINTS...'
SELECT
    'CHECK Constraints Found: ' || COUNT(*)::text as status
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type = 'CHECK';

-- List all CHECK constraints by table
\echo '\nCHECK Constraints by Table:'
SELECT
    table_name,
    constraint_name,
    '✅ ENFORCED' as status
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type = 'CHECK'
ORDER BY table_name, constraint_name;

-- Check 4: Required Indexes
\echo '\n4. CHECKING PERFORMANCE INDEXES...'
SELECT
    'Indexes Found: ' || COUNT(*)::text as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- List key performance indexes
\echo '\nKey Performance Indexes:'
SELECT
    indexname,
    tablename,
    '✅ OPTIMIZED' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check 5: Test Function Execution
\echo '\n5. TESTING FUNCTION EXECUTION...'

-- Test get_class_utilization function
DO $$
DECLARE
    function_test_count INT := 0;
BEGIN
    -- Test if get_class_utilization works
    SELECT COUNT(*) INTO function_test_count
    FROM get_class_utilization()
    LIMIT 1;

    RAISE NOTICE '✅ get_class_utilization(): Working (% rows returned)', function_test_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ get_class_utilization(): Error - %', SQLERRM;
END $$;

-- Test generate_schedule_id function
DO $$
DECLARE
    test_id VARCHAR(50);
BEGIN
    SELECT generate_schedule_id(242508001, 1, 'P1_0900_0940', 'MATH_8')
    INTO test_id;

    RAISE NOTICE '✅ generate_schedule_id(): Working (Generated: %)', test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ generate_schedule_id(): Error - %', SQLERRM;
END $$;

-- Check 6: Data Integrity Verification
\echo '\n6. CHECKING DATA INTEGRITY...'

-- Check for orphaned records
SELECT
    'Students without classes: ' || COUNT(*)::text
FROM students s
LEFT JOIN classes c ON s.class_id = c.class_id
WHERE c.class_id IS NULL AND s.class_id IS NOT NULL;

SELECT
    'Schedules without valid classes: ' || COUNT(*)::text
FROM class_schedule cs
LEFT JOIN classes c ON cs.class_id = c.class_id
WHERE c.class_id IS NULL;

SELECT
    'Fees without valid students: ' || COUNT(*)::text
FROM fees f
LEFT JOIN students s ON f.student_id = s.student_id
WHERE s.student_id IS NULL;

-- Check 7: Business Rules Verification
\echo '\n7. CHECKING BUSINESS RULES...'

-- Check for schedule conflicts
SELECT
    'Schedule conflicts found: ' || COUNT(*)::text
FROM (
    SELECT teacher_id, day_of_week, slot_id, academic_year, COUNT(*)
    FROM class_schedule
    WHERE teacher_id IS NOT NULL
    GROUP BY teacher_id, day_of_week, slot_id, academic_year
    HAVING COUNT(*) > 1
) conflicts;

-- Check fee balance consistency
SELECT
    'Inconsistent fee balances: ' || COUNT(*)::text
FROM fees
WHERE balance != (amount_due - amount_paid);

-- Check grade calculation consistency
SELECT
    'Marks without grades: ' || COUNT(*)::text
FROM marks
WHERE grade IS NULL OR grade = '';

\echo '\n========================================'
\echo 'VERIFICATION COMPLETE'
\echo '========================================'
\echo ''
\echo 'If all checks show ✅ then business logic is properly installed!'
\echo 'If any show ❌ then there may be issues to investigate.'
\echo ''
\echo 'For detailed testing, run: \i database/test_business_logic.sql'
\echo ''
