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

-- PRODUCTION USERS TABLE (SEVENTH - Referenced by students and teachers)
-- User creation handled at student/teacher table level
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
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
    student_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Not mandatory, used for user account creation
    address TEXT, -- Student's residential address
    admission_date DATE, -- Date when student was admitted to the school
    
    -- 🆕 PREVIOUS SCHOOL INFORMATION
    previous_school_id VARCHAR(255) REFERENCES schools(school_id), -- For known schools in our database
    previous_school_name VARCHAR(255), -- For schools not in our database
    previous_school_address TEXT, -- Previous school address
    previous_school_phone VARCHAR(20), -- Previous school contact
    transfer_reason TEXT, -- Reason for transfer (relocation, better facilities, etc.)
    
    class_id VARCHAR(10) NOT NULL REFERENCES classes(class_id), -- Updated to match new class_id format
    
    -- 🆕 GUARDIAN INFORMATION (2 guardians)
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
    teacher_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Not mandatory, used for user account creation
    phone_number VARCHAR(20),
    qualification TEXT,
    hire_date DATE,
    salary NUMERIC(10,2),
    
    -- 🆕 NEW TEACHER MANAGEMENT FIELDS
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
    CONSTRAINT chk_subject_code_format CHECK (subject_code ~ '^[0-9]{10}[A-Z]{3}$'),
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

-- Additional constraints for new fields
ALTER TABLE students ADD CONSTRAINT chk_students_admission_date_not_future
    CHECK (admission_date IS NULL OR admission_date <= CURRENT_DATE);

ALTER TABLE students ADD CONSTRAINT chk_students_previous_school_phone_format
    CHECK (previous_school_phone IS NULL OR previous_school_phone ~ '^[0-9]{10}$');

-- SCHOOLS TABLE CONSTRAINTS
-- No constraints needed for simplified schools table

-- CLASS STANDARD FEES TABLE CONSTRAINTS
ALTER TABLE class_standard_fees ADD CONSTRAINT chk_class_standard_fees_amount_positive
    CHECK (amount > 0);

ALTER TABLE class_standard_fees ADD CONSTRAINT chk_class_standard_fees_fee_name_not_empty
    CHECK (TRIM(fee_name) != '');

ALTER TABLE class_standard_fees ADD CONSTRAINT uk_class_standard_fees_unique_per_class_year
    UNIQUE (class_id, fee_name, academic_year_id);

-- ========================================
-- INDEXES
-- ========================================

-- CLASS STANDARD FEES TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_class_standard_fees_class_id ON class_standard_fees(class_id);
CREATE INDEX CONCURRENTLY idx_class_standard_fees_academic_year ON class_standard_fees(academic_year_id);
CREATE INDEX CONCURRENTLY idx_class_standard_fees_fee_name ON class_standard_fees(fee_name);
CREATE INDEX CONCURRENTLY idx_class_standard_fees_due_date ON class_standard_fees(due_date);