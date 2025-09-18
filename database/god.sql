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

-- PRODUCTION USERS TABLE (FOURTH - Referenced by students and teachers)
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

-- PRODUCTION STUDENTS TABLE (FIFTH - Depends on users, classes, and academic_years)
-- Student management with class assignments and user account integration
DROP TABLE IF EXISTS students CASCADE;

CREATE TABLE students (
    student_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Not mandatory, used for user account creation
    class_id VARCHAR(10) NOT NULL REFERENCES classes(class_id), -- Updated to match new class_id format
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
-- ========================================
-- 3. FUNCTION DEFINITIONS
-- ========================================

-- AUTOMATIC TIMESTAMP UPDATES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GENERATE STUDENT ID (S + class_id + 001 format)
CREATE OR REPLACE FUNCTION generate_student_id(p_class_id VARCHAR)
RETURNS VARCHAR(255) AS $$
DECLARE
    next_seq INTEGER;
    student_id VARCHAR(255);
BEGIN
    -- Get the next sequence number for this class
    SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM LENGTH(p_class_id) + 2) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM students
    WHERE class_id = p_class_id AND active = true;

    -- Generate student_id as S + class_id + 3-digit sequence
    student_id := 'S' || p_class_id || LPAD(CAST(next_seq AS VARCHAR), 3, '0');

    RETURN student_id;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GENERATE TEACHER ID (T + academic_year_id + 001 format)
CREATE OR REPLACE FUNCTION generate_teacher_id()
RETURNS VARCHAR(255) AS $$
DECLARE
    current_academic_year VARCHAR(4);
    next_seq INTEGER;
    teacher_id VARCHAR(255);
BEGIN
    -- Get current academic year from the academic_years table
    SELECT academic_year_id INTO current_academic_year
    FROM academic_years
    WHERE is_current = true
    LIMIT 1;

    -- Fallback if no current year is set
    IF current_academic_year IS NULL THEN
        current_academic_year := get_current_academic_year();
    END IF;

    -- Get the next sequence number for this academic year
    SELECT COALESCE(MAX(CAST(SUBSTRING(teacher_id FROM 6) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM teachers
    WHERE teacher_id LIKE 'T' || current_academic_year || '%';

    -- Generate teacher_id as T + academic_year_id + 3-digit sequence
    teacher_id := 'T' || current_academic_year || LPAD(CAST(next_seq AS VARCHAR), 3, '0');

    RETURN teacher_id;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO HASH PASSWORD (simple bcrypt simulation - replace with proper hashing in production)
CREATE OR REPLACE FUNCTION hash_default_password()
RETURNS VARCHAR(255) AS $$
BEGIN
    -- In production, use proper bcrypt hashing
    -- For now, returning a placeholder hash for 'student123'
    RETURN '$2a$10$default.hash.for.student123.placeholder';
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GET CURRENT ACADEMIC YEAR
CREATE OR REPLACE FUNCTION get_current_academic_year()
RETURNS VARCHAR(4) AS $$
DECLARE
    current_year_id VARCHAR(4);
BEGIN
    SELECT academic_year_id INTO current_year_id
    FROM academic_years
    WHERE is_current = true
    LIMIT 1;

    IF current_year_id IS NULL THEN
        -- Fallback: generate based on current date
        current_year_id := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR, 2) ||
                          RIGHT((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::VARCHAR, 2);
    END IF;

    RETURN current_year_id;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FUNCTION TO AUTO-GENERATE STUDENT ID AND CREATE USER ACCOUNT
CREATE OR REPLACE FUNCTION create_student_and_user()
RETURNS TRIGGER AS $$
DECLARE
    current_year_id VARCHAR(4);
BEGIN
    -- Get current academic year
    SELECT academic_year_id INTO current_year_id
    FROM academic_years
    WHERE is_current = true
    LIMIT 1;

    -- Generate student_id if not provided
    IF NEW.student_id IS NULL THEN
        NEW.student_id := generate_student_id(NEW.class_id::VARCHAR); -- Cast to VARCHAR for new format
    END IF;

    -- Create user account if email is provided
    IF NEW.email IS NOT NULL THEN
        INSERT INTO users (username, email, password, role, academic_year_id, active, updated_by)
        VALUES (NEW.student_id, NEW.email, hash_default_password(), 'student', current_year_id, NEW.active, NEW.updated_by)
        ON CONFLICT (username) DO NOTHING; -- Prevent duplicate usernames
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FUNCTION TO AUTO-GENERATE TEACHER ID AND CREATE USER ACCOUNT
CREATE OR REPLACE FUNCTION create_teacher_and_user()
RETURNS TRIGGER AS $$
DECLARE
    current_year_id VARCHAR(4);
BEGIN
    -- Get current academic year
    SELECT academic_year_id INTO current_year_id
    FROM academic_years
    WHERE is_current = true
    LIMIT 1;

    -- Generate teacher_id if not provided
    IF NEW.teacher_id IS NULL THEN
        NEW.teacher_id := generate_teacher_id();
    END IF;

    -- Create user account if email is provided
    IF NEW.email IS NOT NULL THEN
        INSERT INTO users (username, email, password, role, academic_year_id, active, updated_by)
        VALUES (NEW.teacher_id, NEW.email, hash_default_password(), 'teacher', current_year_id, NEW.active, NEW.updated_by)
        ON CONFLICT (username) DO NOTHING; -- Prevent duplicate usernames
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FUNCTION TO ENSURE ONLY ONE CURRENT YEAR
CREATE OR REPLACE FUNCTION ensure_single_current_year()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        -- Set all other years to not current
        UPDATE academic_years
        SET is_current = false, updated_by = NEW.updated_by
        WHERE academic_year_id != NEW.academic_year_id AND is_current = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GENERATE CLASS ID (AcademicYear + ClassNumber + SectionSerial)
CREATE OR REPLACE FUNCTION generate_class_id(p_academic_year_id VARCHAR, p_class_number INTEGER, p_section_serial INTEGER)
RETURNS VARCHAR(10) AS $$
DECLARE
    class_id VARCHAR(10);
BEGIN
    -- Format: YY+YY + ClassNum(01-10) + Section(001+)
    class_id := p_academic_year_id ||
                LPAD(CAST(p_class_number AS VARCHAR), 2, '0') ||
                LPAD(CAST(p_section_serial AS VARCHAR), 3, '0');

    RETURN class_id;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GENERATE CLASS NAME (Grade X format)
CREATE OR REPLACE FUNCTION generate_class_name(p_class_number INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
    class_name VARCHAR(20);
BEGIN
    IF p_class_number = 1 THEN
        class_name := 'Grade 1st';
    ELSIF p_class_number = 2 THEN
        class_name := 'Grade 2nd';
    ELSIF p_class_number = 3 THEN
        class_name := 'Grade 3rd';
    ELSE
        class_name := 'Grade ' || CAST(p_class_number AS VARCHAR) || 'th';
    END IF;

    RETURN class_name;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GENERATE SECTION NAME (A, B, C, etc.)
CREATE OR REPLACE FUNCTION generate_section_name(p_section_serial INTEGER)
RETURNS VARCHAR(5) AS $$
DECLARE
    section_name VARCHAR(5);
    alphabet VARCHAR[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
BEGIN
    section_name := alphabet[p_section_serial];
    RETURN section_name;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO UPDATE CLASS CURRENT STUDENTS COUNT
CREATE OR REPLACE FUNCTION update_class_student_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_students count when students are added/removed
    IF TG_OP = 'INSERT' THEN
        UPDATE classes
        SET current_students = current_students + 1,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = NEW.updated_by
        WHERE class_id = NEW.class_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE classes
        SET current_students = GREATEST(current_students - 1, 0),
            updated_at = CURRENT_TIMESTAMP,
            updated_by = OLD.updated_by
        WHERE class_id = OLD.class_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If class_id changed, update both old and new classes
        IF OLD.class_id != NEW.class_id THEN
            UPDATE classes
            SET current_students = GREATEST(current_students - 1, 0),
                updated_at = CURRENT_TIMESTAMP,
                updated_by = NEW.updated_by
            WHERE class_id = OLD.class_id;

            UPDATE classes
            SET current_students = current_students + 1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = NEW.updated_by
            WHERE class_id = NEW.class_id;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GENERATE SUBJECT CODE (class_id + first 3 letters of subject)
CREATE OR REPLACE FUNCTION generate_subject_code(p_class_id VARCHAR, p_subject_name VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
    subject_code VARCHAR(20);
    subject_prefix VARCHAR(3);
BEGIN
    -- Extract first 3 letters of subject name, remove spaces and special chars
    subject_prefix := UPPER(REGEXP_REPLACE(LEFT(TRIM(p_subject_name), 3), '[^A-Z]', '', 'g'));
    
    -- Ensure we have at least 3 characters
    IF LENGTH(subject_prefix) < 3 THEN
        subject_prefix := subject_prefix || 'XXX';
    END IF;
    
    subject_prefix := LEFT(subject_prefix, 3);
    
    -- Combine class_id with subject prefix
    subject_code := p_class_id || subject_prefix;
    
    RETURN subject_code;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO GET GRADE LEVEL FROM CLASS NAME
CREATE OR REPLACE FUNCTION get_grade_level(p_class_name VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
    grade_level VARCHAR(20);
BEGIN
    -- Extract grade level from class name (e.g., 'Grade 1' from 'Grade 1st')
    grade_level := REGEXP_REPLACE(p_class_name, '(Grade [0-9]+)(st|nd|rd|th)?.*', '\1');
    
    -- Handle special cases
    IF grade_level = 'Grade 1' THEN
        grade_level := 'Grade 1st';
    ELSIF grade_level = 'Grade 2' THEN
        grade_level := 'Grade 2nd';
    ELSIF grade_level = 'Grade 3' THEN
        grade_level := 'Grade 3rd';
    ELSE
        grade_level := grade_level || 'th';
    END IF;
    
    RETURN grade_level;
END;
$$ LANGUAGE plpgsql;
-- ========================================
-- 4. TRIGGER DEFINITIONS
-- ========================================

-- ACADEMIC YEARS TABLE TRIGGERS
CREATE TRIGGER trigger_academic_years_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ensure_single_current_year
    BEFORE INSERT OR UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_year();

-- CLASSES TABLE TRIGGERS
CREATE TRIGGER trigger_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SUBJECTS TABLE TRIGGERS
CREATE TRIGGER trigger_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- USERS TABLE TRIGGERS
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STUDENTS TABLE TRIGGERS
CREATE TRIGGER trigger_create_student_and_user
    BEFORE INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION create_student_and_user();

CREATE TRIGGER trigger_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_class_student_count
    AFTER INSERT OR UPDATE OR DELETE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_class_student_count();

-- TEACHERS TABLE TRIGGERS
CREATE TRIGGER trigger_create_teacher_and_user
    BEFORE INSERT ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION create_teacher_and_user();

CREATE TRIGGER trigger_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- ========================================
-- 5. INDEX CREATIONS
-- ========================================

-- ACADEMIC YEARS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_academic_years_status ON academic_years(status);
CREATE INDEX CONCURRENTLY idx_academic_years_current ON academic_years(is_current);
CREATE INDEX CONCURRENTLY idx_academic_years_dates ON academic_years(start_date, end_date);

-- CLASSES TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_classes_academic_year ON classes(academic_year_id);
CREATE INDEX CONCURRENTLY idx_classes_teacher ON classes(class_teacher_id);
CREATE INDEX CONCURRENTLY idx_classes_active ON classes(active);
CREATE INDEX CONCURRENTLY idx_classes_name ON classes(class_name);
CREATE INDEX CONCURRENTLY idx_classes_room ON classes(room_assignment);
CREATE INDEX CONCURRENTLY idx_classes_academic_year_active ON classes(academic_year_id, active);

-- SUBJECTS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_subjects_academic_year ON subjects(academic_year_id);
CREATE INDEX CONCURRENTLY idx_subjects_grade_level ON subjects(grade_level);
CREATE INDEX CONCURRENTLY idx_subjects_active ON subjects(is_active);
CREATE INDEX CONCURRENTLY idx_subjects_name ON subjects(subject_name);
CREATE INDEX CONCURRENTLY idx_subjects_academic_year_grade ON subjects(academic_year_id, grade_level);

-- USERS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY idx_users_active ON users(active);
CREATE INDEX CONCURRENTLY idx_users_academic_year ON users(academic_year_id);

-- STUDENTS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_students_class_id ON students(class_id);
CREATE INDEX CONCURRENTLY idx_students_active ON students(active);
CREATE INDEX CONCURRENTLY idx_students_email ON students(email);

-- TEACHERS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_teachers_active ON teachers(active);
CREATE INDEX CONCURRENTLY idx_teachers_email ON teachers(email);
-- ========================================
-- 6. CONSTRAINT ADDITIONS
-- ========================================

-- CLASSES TABLE CONSTRAINTS - STRICT VALIDATION
ALTER TABLE classes ADD CONSTRAINT chk_classes_class_id_format
    CHECK (class_id ~ '^[0-9]{4}[0-9]{2}[0-9]{3}$');

ALTER TABLE classes ADD CONSTRAINT chk_classes_class_name_format
    CHECK (class_name ~ '^Grade [0-9]{1,2}(st|nd|rd|th)?$');

ALTER TABLE classes ADD CONSTRAINT chk_classes_section_name_format
    CHECK (section_name ~ '^[A-Z]$');

ALTER TABLE classes ADD CONSTRAINT chk_classes_max_students_range
    CHECK (max_students IS NULL OR (max_students > 0 AND max_students <= 100));

ALTER TABLE classes ADD CONSTRAINT chk_classes_current_students_range
    CHECK (current_students >= 0);

ALTER TABLE classes ADD CONSTRAINT chk_classes_capacity_not_exceeded
    CHECK (max_students IS NULL OR current_students <= max_students);

ALTER TABLE classes ADD CONSTRAINT uk_classes_unique_per_academic_year
    UNIQUE (academic_year_id, class_name, section_name);

-- Add foreign key constraint after teachers table is created
ALTER TABLE classes ADD CONSTRAINT fk_classes_teacher 
    FOREIGN KEY (class_teacher_id) REFERENCES teachers(teacher_id);

-- SUBJECTS TABLE CONSTRAINTS - STRICT VALIDATION
ALTER TABLE subjects ADD CONSTRAINT chk_subjects_subject_code_format
    CHECK (subject_code ~ '^[0-9]{10}[A-Z]{3}$');

ALTER TABLE subjects ADD CONSTRAINT chk_subjects_subject_name_length
    CHECK (LENGTH(TRIM(subject_name)) >= 2);

ALTER TABLE subjects ADD CONSTRAINT chk_subjects_grade_level_format
    CHECK (grade_level ~ '^Grade [0-9]{1,2}(st|nd|rd|th)?$');

ALTER TABLE subjects ADD CONSTRAINT chk_subjects_max_marks_range
    CHECK (max_marks_per_exam > 0 AND max_marks_per_exam <= 500);

ALTER TABLE subjects ADD CONSTRAINT uk_subjects_unique_per_grade_year
    UNIQUE (subject_name, grade_level, academic_year_id);

-- USERS TABLE CONSTRAINTS
ALTER TABLE users ADD CONSTRAINT chk_users_email_format
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-ZaZ