-- ========================================================================================
-- STUDENT MANAGEMENT SYSTEM - PRODUCTION DATABASE SCHEMA
-- ========================================================================================
-- Organized by: Types → Tables → Functions → Triggers → Indexes → Constraints → Data
-- ========================================================================================

-- ========================================
-- 1. TYPE DEFINITIONS
-- ========================================

-- CREATE ENUM FOR STRICT ROLE VALIDATION
-- CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- ========================================
-- 2. TABLE CREATIONS
-- ========================================

-- ACADEMIC YEARS TABLE (FIRST - Foundation table referenced by all others)
-- Central table for managing academic years with proper relationships
DROP TABLE IF EXISTS academic_years CASCADE;

CREATE TABLE academic_years (
    academic_year_id VARCHAR(4) PRIMARY KEY, -- Format: YY+YY (e.g., '2425' for 2024-2025)
    academic_year_display VARCHAR(9) NOT NULL, -- Format: YYYY-YYYY (e.g., '2024-2025')
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
    is_current BOOLEAN NOT NULL DEFAULT false,
    term_structure JSONB, -- Store term/semester information
    holidays JSONB, -- Holiday information
    examination_schedule JSONB, -- Exam schedule details
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    -- Ensure only one current academic year
    CONSTRAINT chk_single_current_year
        EXCLUDE (is_current WITH =) WHERE (is_current = true),

    -- Validate date range
    CONSTRAINT chk_valid_date_range
        CHECK (end_date > start_date),

    -- Validate academic year format
    CONSTRAINT chk_academic_year_format
        CHECK (academic_year_id ~ '^[0-9]{4}$' AND LENGTH(academic_year_display) = 9)
);

-- CLASSES TABLE (SECOND - Depends on academic_years, referenced by students)
-- Class management with academic year integration, capacity tracking, and room assignments
DROP TABLE IF EXISTS classes CASCADE;

CREATE TABLE classes (
    class_id VARCHAR(10) PRIMARY KEY, -- Format: YY+YY + ClassNum(01-10) + Section(001+) e.g., '242501001'
    class_name VARCHAR(20) NOT NULL, -- Format: 'Grade 1', 'Grade 2', etc.
    section_name VARCHAR(5) NOT NULL, -- Format: 'A', 'B', 'C', etc.
    academic_year_id VARCHAR(4) NOT NULL REFERENCES academic_years(academic_year_id), -- Link to academic year
    class_teacher_id VARCHAR(255), -- Will reference teachers(teacher_id) after teachers table is created
    max_students INTEGER, -- Maximum capacity
    current_students INTEGER DEFAULT 0, -- Current enrollment count (auto-updated)
    room_assignment VARCHAR(50), -- Room/classroom assignment (not strict, just a column)
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),

    -- Business constraints
    CONSTRAINT chk_class_id_format CHECK (class_id ~ '^[0-9]{4}[0-9]{2}[0-9]{3}$'),
    CONSTRAINT chk_class_name_format CHECK (class_name ~ '^Grade [0-9]{1,2}(st|nd|rd|th)?$'),
    CONSTRAINT chk_section_name_format CHECK (section_name ~ '^[A-Z]$'),
    CONSTRAINT chk_max_students_range CHECK (max_students IS NULL OR (max_students > 0 AND max_students <= 100)),
    CONSTRAINT chk_current_students_range CHECK (current_students >= 0),
    CONSTRAINT chk_capacity_not_exceeded CHECK (max_students IS NULL OR current_students <= max_students),
    CONSTRAINT uk_classes_unique_per_academic_year UNIQUE (academic_year_id, class_name, section_name)
);

-- PRODUCTION CLASS STANDARD FEES TABLE (SIXTH - Depends on classes and academic_years)
-- Standard fee structure for each class
DROP TABLE IF EXISTS class_standard_fees CASCADE;

CREATE TABLE class_standard_fees (
    fee_id VARCHAR(255) PRIMARY KEY,
    class_id VARCHAR(10) NOT NULL REFERENCES classes(class_id),
    fee_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    academic_year_id VARCHAR(4) NOT NULL REFERENCES academic_years(academic_year_id),
    due_date DATE, -- Date by which fee should be paid
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- STUDENT FEES TABLE (Referenced by triggers/functions and indexes below)
-- Added to resolve missing table causing failures in create_student_fee_records()
DROP TABLE IF EXISTS student_fees CASCADE;

CREATE TABLE student_fees (
    student_fee_id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL REFERENCES students(student_id),
    class_id VARCHAR(10) NOT NULL REFERENCES classes(class_id),
    fee_id VARCHAR(255) NOT NULL REFERENCES class_standard_fees(fee_id),
    standard_amount DECIMAL(10,2) NOT NULL CHECK (standard_amount > 0),
    final_amount DECIMAL(10,2) NOT NULL CHECK (final_amount > 0),
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    balance DECIMAL(10,2) NOT NULL CHECK (balance >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    due_date DATE,
    last_payment_date DATE,
    academic_year_id VARCHAR(4) NOT NULL REFERENCES academic_years(academic_year_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    CONSTRAINT chk_balance_calculation CHECK (balance = final_amount - amount_paid),
    CONSTRAINT chk_payment_not_exceed_final CHECK (amount_paid <= final_amount),
    CONSTRAINT chk_last_payment_date_valid CHECK (last_payment_date IS NULL OR last_payment_date <= CURRENT_DATE)
);

-- PRODUCTION USERS TABLE (SEVENTH - Referenced by students and teachers)
-- User creation handled at student/teacher table level
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255), -- Nullable: Application will handle password setting
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    academic_year_id VARCHAR(4) REFERENCES academic_years(academic_year_id), -- Link to academic year
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    last_login TIMESTAMP WITHOUT TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT true,
    current_session_id VARCHAR(255),
    session_expiry TIMESTAMP WITHOUT TIME ZONE,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- PRODUCTION SCHOOLS TABLE (FOURTH - Independent table for school information)
-- School information for tracking student transfers and previous schools
DROP TABLE IF EXISTS schools CASCADE;

CREATE TABLE schools (
    school_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    affiliation_board VARCHAR(100), -- CBSE, ICSE, State Board, etc.
    school_type VARCHAR(50) -- Government, Private, International, etc.
);

-- PRODUCTION STUDENTS TABLE (FIFTH - Depends on users, classes, academic_years, and schools)
-- Student management with class assignments and user account integration
DROP TABLE IF EXISTS students CASCADE;

CREATE TABLE students (
    student_id VARCHAR(255) PRIMARY KEY REFERENCES users(username), -- Links to user account
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Not mandatory, used for user account creation
    address TEXT, -- Student's residential address
    admission_date DATE, -- Date when student was admitted to the school
    
    -- PREVIOUS SCHOOL INFORMATION
    previous_school_id VARCHAR(255) REFERENCES schools(school_id), -- For known schools in our database
    previous_school_name VARCHAR(255), -- For schools not in our database
    previous_school_address TEXT, -- Previous school address
    previous_school_phone VARCHAR(20), -- Previous school contact
    transfer_reason TEXT, -- Reason for transfer (relocation, better facilities, etc.)
    
    class_id VARCHAR(10) NOT NULL REFERENCES classes(class_id), -- Updated to match new class_id format
    
    -- GUARDIAN INFORMATION (2 guardians)
    primary_guardian_name VARCHAR(255),
    primary_guardian_relationship VARCHAR(50), -- Father, Mother, Uncle, etc.
    primary_guardian_phone VARCHAR(20),
    primary_guardian_email VARCHAR(255),
    primary_guardian_address TEXT,
    
    secondary_guardian_name VARCHAR(255),
    secondary_guardian_relationship VARCHAR(50),
    secondary_guardian_phone VARCHAR(20),
    secondary_guardian_email VARCHAR(255),
    secondary_guardian_address TEXT,
    
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- PRODUCTION TEACHERS TABLE (SIXTH - Depends on users and academic_years)
-- Teacher management with user account integration and class assignments
DROP TABLE IF EXISTS teachers CASCADE;

CREATE TABLE teachers (
    teacher_id VARCHAR(255) PRIMARY KEY REFERENCES users(username), -- Links to user account
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Not mandatory, used for user account creation
    phone_number VARCHAR(20),
    qualification TEXT,
    hire_date DATE,
    salary NUMERIC(10,2),
    
    -- NEW TEACHER MANAGEMENT FIELDS
    classes_assigned JSONB DEFAULT '[]',        -- Array of class_ids teacher teaches
    subjects_handled JSONB DEFAULT '[]',        -- Array of subject_codes teacher can handle
    academic_year_id VARCHAR(4) REFERENCES academic_years(academic_year_id),
    class_teacher_of VARCHAR(10) REFERENCES classes(class_id),
    
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- SUBJECTS TABLE (THIRD - Depends on academic_years and classes)
-- Subject management with grade-level linking for reusability across sections
DROP TABLE IF EXISTS subjects CASCADE;

CREATE TABLE subjects (
    subject_code VARCHAR(20) PRIMARY KEY, -- Format: class_id + first 3 letters (e.g., '242501001ENG')
    subject_name VARCHAR(100) NOT NULL, -- Full subject name (e.g., 'English', 'Mathematics')
    grade_level VARCHAR(20) NOT NULL, -- Links to class grade (e.g., 'Grade 1', 'Grade 2')
    academic_year_id VARCHAR(4) NOT NULL REFERENCES academic_years(academic_year_id),
    max_marks_per_exam INTEGER DEFAULT 100, -- Maximum marks for examinations
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),

    -- Business constraints
    CONSTRAINT chk_subject_code_format CHECK (subject_code ~ '^[0-9]{9}[A-Z]{3}$'),
    CONSTRAINT chk_subject_name_length CHECK (LENGTH(TRIM(subject_name)) >= 2),
    CONSTRAINT chk_grade_level_format CHECK (grade_level ~ '^Grade [0-9]{1,2}(st|nd|rd|th)?$'),
    CONSTRAINT chk_max_marks_range CHECK (max_marks_per_exam > 0 AND max_marks_per_exam <= 500),
    CONSTRAINT uk_subjects_unique_per_grade_year UNIQUE (subject_name, grade_level, academic_year_id)
);

-- SYLLABUS TABLE (SEVENTH - Depends on academic_years, classes, subjects, teachers)
-- Unit-level tracking with JSONB sub-topic arrays for optimal performance
DROP TABLE IF EXISTS syllabus CASCADE;

CREATE TABLE syllabus (
    syllabus_id VARCHAR(50) PRIMARY KEY, -- Format: SYL + subject_code + unit_order (e.g., 'SYL10_MATH_01')
    academic_year_id VARCHAR(4) NOT NULL REFERENCES academic_years(academic_year_id),
    subject_code VARCHAR(20) NOT NULL REFERENCES subjects(subject_code),
    subject_name VARCHAR(100) NOT NULL, -- Redundant for JOIN-less queries
    class_id VARCHAR(10) NOT NULL REFERENCES classes(class_id),
    class_name VARCHAR(20) NOT NULL, -- Redundant for JOIN-less queries
    section_name VARCHAR(5) NOT NULL, -- Redundant for JOIN-less queries
    teacher_id VARCHAR(255) REFERENCES teachers(teacher_id), -- Nullable initially

    unit_order INTEGER NOT NULL,
    unit_name VARCHAR(255) NOT NULL,

    completion_status VARCHAR(20) NOT NULL DEFAULT 'not-started'
        CHECK (completion_status IN ('not-started', 'in-progress', 'completed')),
    completion_percentage INTEGER NOT NULL DEFAULT 0
        CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

    sub_topics JSONB DEFAULT '[]', -- Array of sub-topic objects
    completed_sub_topics JSONB DEFAULT '[]', -- Array of completed sub-topic names
    total_sub_topics INTEGER DEFAULT 0,
    completed_sub_topics_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    -- Business constraints
    CONSTRAINT chk_syllabus_id_format CHECK (syllabus_id ~ '^SYL[A-Z0-9_]+$'),
    CONSTRAINT chk_unit_order_positive CHECK (unit_order > 0),
    CONSTRAINT chk_sub_topics_consistency CHECK (completed_sub_topics_count <= total_sub_topics),
    CONSTRAINT chk_completion_logic CHECK (
        (completion_percentage = 0 AND completion_status = 'not-started') OR
        (completion_percentage > 0 AND completion_percentage < 100 AND completion_status = 'in-progress') OR
        (completion_percentage = 100 AND completion_status = 'completed')
    ),
    CONSTRAINT uk_syllabus_unique_per_class_subject_unit UNIQUE (class_id, subject_code, unit_name, academic_year_id)
);

-- TEMPLATE-BASED SCHEDULE SYSTEM - THREE TABLES
-- ========================================

-- 1. TIME_SLOTS TABLE (Schedule Template)
DROP TABLE IF EXISTS time_slots CASCADE;

CREATE TABLE time_slots (
    slot_id SERIAL PRIMARY KEY,
    class_id VARCHAR(10) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    session_type VARCHAR(10) NOT NULL CHECK (session_type IN ('morning', 'afternoon')),
    slot_type VARCHAR(20) DEFAULT 'regular' CHECK (slot_type IN ('regular', 'exam', 'break', 'holiday')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    UNIQUE(class_id, day_of_week, period_number),
    CHECK (end_time > start_time)
);

-- 2. SCHEDULE_DATA TABLE (Template Assignments)
DROP TABLE IF EXISTS schedule_data CASCADE;

CREATE TABLE schedule_data (
    schedule_id VARCHAR(30) PRIMARY KEY,
    slot_id INTEGER NOT NULL,
    class_id VARCHAR(10) NOT NULL,
    subject_code VARCHAR(20),
    teacher_id VARCHAR(255),
    academic_year VARCHAR(4) NOT NULL,
    is_template BOOLEAN DEFAULT true,
    template_name VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    UNIQUE(slot_id, academic_year)
);

-- 3. CALENDAR_GRID TABLE (Template Applications + Exceptions)
DROP TABLE IF EXISTS calendar_grid CASCADE;

CREATE TABLE calendar_grid (
    grid_id VARCHAR(30) PRIMARY KEY,
    class_id VARCHAR(10) NOT NULL,
    calendar_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    day_type VARCHAR(20) DEFAULT 'working' CHECK (day_type IN ('working', 'holiday', 'exam', 'vacation')),
    holiday_name VARCHAR(100),
    academic_year VARCHAR(4) NOT NULL,
    applied_template_id VARCHAR(30),
    schedule_overrides JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    UNIQUE(class_id, calendar_date),
    CHECK (EXTRACT(DOW FROM calendar_date) = day_of_week)
);

-- ========================================
-- ATTENDANCE TABLE - OPTIMIZED FOR CALENDAR_GRID INTEGRATION
-- ========================================

-- ATTENDANCE TABLE (Links to calendar_grid for date/class context)
DROP TABLE IF EXISTS attendance CASCADE;

CREATE TABLE attendance (
    -- CORE COLUMNS (Essential)
    attendance_id VARCHAR(50) PRIMARY KEY,
    grid_id VARCHAR(30) NOT NULL, -- Links to calendar_grid for date/class context
    student_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(10) NOT NULL, -- Fixed: VARCHAR(10) to match classes table
    attendance_date DATE NOT NULL, -- Fixed: DATE instead of TIMESTAMP
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0-6 for fast day queries

    -- TIME/SCHEDULE COLUMNS
    slot_id INTEGER NULL, -- Links to time_slots (when available)
    period_number INTEGER NULL, -- Keep for backward compatibility
    session_type VARCHAR(10) CHECK (session_type IN ('morning', 'afternoon')),

    -- ATTENDANCE DATA
    status VARCHAR(20) NOT NULL DEFAULT 'present'
        CHECK (status IN ('present', 'absent', 'late', 'excused', 'holiday')),
    attendance_type VARCHAR(20) DEFAULT 'regular'
        CHECK (attendance_type IN ('regular', 'exam', 'activity', 'holiday')),
    subject_code VARCHAR(20) NULL,
    teacher_id VARCHAR(255) NULL,
    marked_by VARCHAR(255) NOT NULL,

    -- METADATA
    remarks TEXT NULL, -- For notes/excuses
    is_bulk_entry BOOLEAN DEFAULT false, -- Track bulk operations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,

    -- Foreign Key Constraints
    FOREIGN KEY (grid_id) REFERENCES calendar_grid(grid_id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id) ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    FOREIGN KEY (marked_by) REFERENCES users(username),

    -- Business Logic Constraints
    UNIQUE(grid_id, student_id, COALESCE(slot_id, 0), COALESCE(period_number, 0)),
    CHECK (attendance_date <= CURRENT_DATE)
);

-- ========================================
-- ATTENDANCE INDEXES - ULTRA-FAST PERFORMANCE (8 indexes for 10x speed)
-- ========================================

-- Core Query Indexes (Most frequently used)
CREATE INDEX CONCURRENTLY idx_attendance_grid_student ON attendance(grid_id, student_id);
CREATE INDEX CONCURRENTLY idx_attendance_student_date ON attendance(student_id, attendance_date DESC);
CREATE INDEX CONCURRENTLY idx_attendance_class_date ON attendance(class_id, attendance_date);
CREATE INDEX CONCURRENTLY idx_attendance_date_status ON attendance(attendance_date, status);
CREATE INDEX CONCURRENTLY idx_attendance_teacher_date ON attendance(teacher_id, attendance_date);

-- Composite Indexes for Complex Queries
CREATE INDEX CONCURRENTLY idx_attendance_class_date_status ON attendance(class_id, attendance_date, status);

-- Partial Indexes for Specific Status Queries (Faster than full table scans)
CREATE INDEX CONCURRENTLY idx_attendance_absent_only ON attendance(student_id, attendance_date) WHERE status = 'absent';
CREATE INDEX CONCURRENTLY idx_attendance_bulk_entries ON attendance(grid_id, attendance_date) WHERE is_bulk_entry = true;

-- ========================================
-- MARKS TABLE - OPTIMIZED FOR CALENDAR_GRID INTEGRATION
-- ========================================

-- MARKS TABLE (Links to calendar_grid for exam context)
DROP TABLE IF EXISTS marks CASCADE;

CREATE TABLE marks (
    -- CORE IDENTIFIERS
    marks_id VARCHAR(50) PRIMARY KEY,
    grid_id VARCHAR(30) NULL, -- DIRECT LINK TO CALENDAR_GRID FOR EXAMS
    student_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(10) NOT NULL,
    academic_year VARCHAR(4) NOT NULL,

    -- EXAMINATION DETAILS (FROM CALENDAR_GRID)
    examination_name VARCHAR(20) NOT NULL,
    exam_date DATE NULL, -- FROM calendar_grid.calendar_date
    exam_session VARCHAR(10) NULL, -- FROM calendar_grid.exam_session

    -- MARKS DATA
    marks_obtained DECIMAL(5,2) NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (marks_obtained / max_marks * 100) STORED,
    weightage DECIMAL(4,2) DEFAULT 1.00,
    grade VARCHAR(5) NULL,
    is_final BOOLEAN DEFAULT false,

    -- RELATIONSHIPS
    subject_code VARCHAR(20) NULL,
    teacher_id VARCHAR(255) NULL,
    marked_by VARCHAR(255) NOT NULL,

    -- METADATA
    remarks TEXT NULL,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,

    -- CONSTRAINTS
    FOREIGN KEY (grid_id) REFERENCES calendar_grid(grid_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id),
    FOREIGN KEY (subject_code) REFERENCES subjects(subject_code),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    FOREIGN KEY (marked_by) REFERENCES users(username),
    CHECK (marks_obtained >= 0 AND marks_obtained <= max_marks),
    CHECK (exam_date IS NULL OR exam_date <= CURRENT_DATE)
);

-- ========================================
-- MARKS INDEXES - ULTRA-FAST PERFORMANCE
-- ========================================

-- Core Query Indexes (Most frequently used)
CREATE INDEX CONCURRENTLY idx_marks_grid_exam ON marks(grid_id, exam_date) WHERE grid_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_marks_exam_date_subject ON marks(exam_date, subject_code);
CREATE INDEX CONCURRENTLY idx_marks_academic_exam ON marks(academic_year, examination_name);
CREATE INDEX CONCURRENTLY idx_marks_student_exam_date ON marks(student_id, exam_date DESC);
CREATE INDEX CONCURRENTLY idx_marks_class_exam_session ON marks(class_id, exam_session, exam_date);
CREATE INDEX CONCURRENTLY idx_marks_teacher_exam_period ON marks(teacher_id, exam_date, exam_session);

-- Composite Indexes for Complex Queries
CREATE INDEX CONCURRENTLY idx_marks_final_exam_results ON marks(academic_year, examination_name, is_final) WHERE is_final = true;
CREATE INDEX CONCURRENTLY idx_marks_percentage_analysis ON marks(percentage DESC, examination_name);

-- ========================================
-- 3. DATABASE FUNCTIONS
-- ========================================

-- FUNCTION TO AUTO-CREATE USER ACCOUNT WHEN STUDENT IS ADDED
CREATE OR REPLACE FUNCTION create_student_user_account()
RETURNS TRIGGER AS $$
DECLARE
    user_email VARCHAR(255);
    first_name_part VARCHAR(255);
    last_name_part VARCHAR(255);
BEGIN
    -- Generate email if not provided
    user_email := COALESCE(NEW.email, NEW.student_id || '@school.com');
    
    -- Split name into first and last name
    first_name_part := SPLIT_PART(NEW.name, ' ', 1);
    last_name_part := CASE 
        WHEN array_length(string_to_array(NEW.name, ' '), 1) > 1 
        THEN array_to_string((string_to_array(NEW.name, ' '))[2:], ' ')
        ELSE '' 
    END;
    
    -- Create user account
    INSERT INTO users (
        username, 
        email, 
        password, 
        first_name, 
        last_name, 
        role, 
        academic_year_id,
        created_by,
        updated_by
    ) VALUES (
        NEW.student_id,
        user_email,
        NULL, -- Password will be set by the application
        first_name_part,
        last_name_part,
        'student',
        (SELECT academic_year_id FROM classes WHERE class_id = NEW.class_id),
        NEW.created_by,
        NEW.updated_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO AUTO-CREATE STUDENT FEE RECORDS WHEN STUDENT IS ADDED
CREATE OR REPLACE FUNCTION create_student_fee_records()
RETURNS TRIGGER AS $$
DECLARE
    fee_record RECORD;
    fee_counter INTEGER := 1;
BEGIN
    -- Loop through all standard fees for the student's class and academic year
    FOR fee_record IN
        SELECT fee_id, fee_name, amount, due_date, academic_year_id
        FROM class_standard_fees
        WHERE class_id = NEW.class_id 
        AND academic_year_id = (SELECT academic_year_id FROM classes WHERE class_id = NEW.class_id)
    LOOP
        -- Create individual fee record for the student
        INSERT INTO student_fees (
            student_fee_id,
            student_id,
            class_id,
            fee_id,
            standard_amount,
            final_amount,
            balance,
            due_date,
            academic_year_id,
            created_by,
            updated_by
        ) VALUES (
            'SF' || NEW.student_id || '_' || fee_counter,
            NEW.student_id,
            NEW.class_id,
            fee_record.fee_id,
            fee_record.amount,
            fee_record.amount, -- Initially same as standard
            fee_record.amount, -- Initially same as final_amount
            fee_record.due_date,
            fee_record.academic_year_id,
            NEW.created_by,
            NEW.updated_by
        );
        
        fee_counter := fee_counter + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO AUTO-CREATE USER ACCOUNT WHEN TEACHER IS ADDED
CREATE OR REPLACE FUNCTION create_teacher_user_account()
RETURNS TRIGGER AS $$
DECLARE
    user_email VARCHAR(255);
    first_name_part VARCHAR(255);
    last_name_part VARCHAR(255);
BEGIN
    -- Generate email if not provided
    user_email := COALESCE(NEW.email, NEW.teacher_id || '@school.com');
    
    -- Split name into first and last name
    first_name_part := SPLIT_PART(NEW.name, ' ', 1);
    last_name_part := CASE 
        WHEN array_length(string_to_array(NEW.name, ' '), 1) > 1 
        THEN array_to_string((string_to_array(NEW.name, ' '))[2:], ' ')
        ELSE '' 
    END;
    
    -- Create user account
    INSERT INTO users (
        username, 
        email, 
        password, 
        first_name, 
        last_name, 
        role, 
        academic_year_id,
        created_by,
        updated_by
    ) VALUES (
        NEW.teacher_id,
        user_email,
        NULL, -- Password will be set by the application
        first_name_part,
        last_name_part,
        'teacher',
        NEW.academic_year_id,
        NEW.created_by,
        NEW.updated_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. DATABASE TRIGGERS
-- ========================================

-- TRIGGER TO AUTO-CREATE USER ACCOUNT WHEN STUDENT IS INSERTED
CREATE TRIGGER trg_create_student_user_account
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION create_student_user_account();

-- TRIGGER TO AUTO-CREATE STUDENT FEE RECORDS WHEN STUDENT IS INSERTED
CREATE TRIGGER trg_create_student_fee_records
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION create_student_fee_records();

-- TRIGGER TO AUTO-CREATE USER ACCOUNT WHEN TEACHER IS INSERTED
CREATE TRIGGER trg_create_teacher_user_account
    AFTER INSERT ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION create_teacher_user_account();

-- ========================================
-- 5. INDEXES
-- ========================================

-- CLASS STANDARD FEES TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_class_standard_fees_class_id ON class_standard_fees(class_id);
CREATE INDEX CONCURRENTLY idx_class_standard_fees_academic_year ON class_standard_fees(academic_year_id);
CREATE INDEX CONCURRENTLY idx_class_standard_fees_fee_name ON class_standard_fees(fee_name);
CREATE INDEX CONCURRENTLY idx_class_standard_fees_due_date ON class_standard_fees(due_date);

-- STUDENT FEES TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX CONCURRENTLY idx_student_fees_class_id ON student_fees(class_id);
CREATE INDEX CONCURRENTLY idx_student_fees_fee_id ON student_fees(fee_id);
CREATE INDEX CONCURRENTLY idx_student_fees_academic_year ON student_fees(academic_year_id);
CREATE INDEX CONCURRENTLY idx_student_fees_payment_status ON student_fees(payment_status);
CREATE INDEX CONCURRENTLY idx_student_fees_due_date ON student_fees(due_date);
CREATE INDEX CONCURRENTLY idx_student_fees_last_payment_date ON student_fees(last_payment_date);

-- TEMPLATE-BASED SCHEDULE SYSTEM INDEXES
-- ========================================

-- Time Slots Indexes
CREATE INDEX CONCURRENTLY idx_time_slots_class_day ON time_slots(class_id, day_of_week);
CREATE INDEX CONCURRENTLY idx_time_slots_session ON time_slots(session_type);

-- Schedule Data Indexes
CREATE INDEX CONCURRENTLY idx_schedule_data_slot ON schedule_data(slot_id);
CREATE INDEX CONCURRENTLY idx_schedule_data_class_year ON schedule_data(class_id, academic_year);
CREATE INDEX CONCURRENTLY idx_schedule_data_teacher ON schedule_data(teacher_id);
CREATE INDEX CONCURRENTLY idx_schedule_data_subject ON schedule_data(subject_code);

-- Calendar Grid Indexes
CREATE INDEX CONCURRENTLY idx_calendar_grid_class_date ON calendar_grid(class_id, calendar_date);
CREATE INDEX CONCURRENTLY idx_calendar_grid_date_type ON calendar_grid(calendar_date, day_type);
CREATE INDEX CONCURRENTLY idx_calendar_grid_template ON calendar_grid(applied_template_id);
CREATE INDEX CONCURRENTLY idx_calendar_grid_year ON calendar_grid(academic_year);

-- Attendance Indexes
CREATE INDEX CONCURRENTLY idx_attendance_grid_student ON attendance(grid_id, student_id);
CREATE INDEX CONCURRENTLY idx_attendance_student_date ON attendance(student_id, attendance_date DESC);
CREATE INDEX CONCURRENTLY idx_attendance_class_date ON attendance(class_id, attendance_date);
CREATE INDEX CONCURRENTLY idx_attendance_date_status ON attendance(attendance_date, status);
CREATE INDEX CONCURRENTLY idx_attendance_teacher_date ON attendance(teacher_id, attendance_date);
CREATE INDEX CONCURRENTLY idx_attendance_class_date_status ON attendance(class_id, attendance_date, status);
CREATE INDEX CONCURRENTLY idx_attendance_absent_only ON attendance(student_id, attendance_date) WHERE status = 'absent';
CREATE INDEX CONCURRENTLY idx_attendance_bulk_entries ON attendance(grid_id, attendance_date) WHERE is_bulk_entry = true;

-- Marks Indexes
CREATE INDEX CONCURRENTLY idx_marks_grid_exam ON marks(grid_id, exam_date) WHERE grid_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_marks_exam_date_subject ON marks(exam_date, subject_code);
CREATE INDEX CONCURRENTLY idx_marks_academic_exam ON marks(academic_year, examination_name);
CREATE INDEX CONCURRENTLY idx_marks_student_exam_date ON marks(student_id, exam_date DESC);
CREATE INDEX CONCURRENTLY idx_marks_class_exam_session ON marks(class_id, exam_session, exam_date);
CREATE INDEX CONCURRENTLY idx_marks_teacher_exam_period ON marks(teacher_id, exam_date, exam_session);
CREATE INDEX CONCURRENTLY idx_marks_final_exam_results ON marks(academic_year, examination_name, is_final) WHERE is_final = true;
CREATE INDEX CONCURRENTLY idx_marks_percentage_analysis ON marks(percentage DESC, examination_name);

-- ========================================
-- ON-DEMAND PARTITIONING - ENTERPRISE PERFORMANCE (ON-DEMAND)
-- ========================================

-- ATTENDANCE TABLE PARTITIONING (Most Critical - Daily Records)
-- Partition by month for optimal query performance
-- NOTE: Partitioning plan placeholder. Implement actual partitions in deployment scripts when needed.
-- ALTER TABLE attendance PARTITION BY RANGE (attendance_date);

-- MARKS TABLE PARTITIONING (Exam Records)
-- NOTE: Partitioning plan placeholder. Implement actual partitions in deployment scripts when needed.
-- ALTER TABLE marks PARTITION BY RANGE (exam_date);

-- CALENDAR_GRID TABLE PARTITIONING (Schedule Records)
-- NOTE: Partitioning plan placeholder. Implement actual partitions in deployment scripts when needed.
-- ALTER TABLE calendar_grid PARTITION BY RANGE (calendar_date);

-- ========================================
-- PARTITION CLEANUP (Keep last 24 months)
-- ========================================

-- FUNCTION TO CLEANUP OLD PARTITIONS (Keep last 24 months)
CREATE OR REPLACE FUNCTION cleanup_old_partitions(table_name TEXT, months_to_keep INTEGER DEFAULT 24)
RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '1 month' * months_to_keep;

    FOR partition_record IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE table_name || '_%'
        AND tablename ~ '^\w+_\d{4}_\d{2}$'
    LOOP
        -- Extract date from partition name and drop if older than cutoff
        IF substring(partition_record.tablename from '[0-9]{4}_[0-9]{2}$')::DATE < cutoff_date THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.tablename);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;