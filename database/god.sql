-- ========================================================================================
-- STUDENT MANAGEMENT SYSTEM - PRODUCTION DATABASE SCHEMA
-- ========================================================================================
-- Organized by: Types → Tables → Functions → Triggers → Indexes → Constraints → Data
-- ========================================================================================

-- ========================================
-- 1. TYPE DEFINITIONS
-- ========================================

-- CREATE ENUM FOR STRICT ROLE VALIDATION
CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- ========================================
-- 2. TABLE CREATIONS
-- ========================================

-- PRODUCTION USERS TABLE WITH DATA INTEGRITY
-- User creation handled at student/teacher table level
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE, -- Made nullable as requested
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- PRODUCTION STUDENTS TABLE WITH AUTO-GENERATED IDs
-- Student creation automatically creates user account
DROP TABLE IF EXISTS students CASCADE;

CREATE TABLE students (
    student_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Not mandatory, used for user account creation
    class_id INTEGER NOT NULL REFERENCES classes(class_id),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- PRODUCTION TEACHERS TABLE WITH AUTO-GENERATED IDs
-- Teacher creation automatically creates user account
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

-- OPTIMIZED ACADEMIC YEARS TABLE
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
CREATE OR REPLACE FUNCTION generate_student_id(p_class_id INTEGER)
RETURNS VARCHAR(255) AS $$
DECLARE
    next_seq INTEGER;
    student_id VARCHAR(255);
BEGIN
    -- Get the next sequence number for this class
    SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM LENGTH(CAST(p_class_id AS VARCHAR)) + 2) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM students
    WHERE class_id = p_class_id AND active = true;

    -- Generate student_id as S + class_id + 3-digit sequence
    student_id := 'S' || CAST(p_class_id AS VARCHAR) || LPAD(CAST(next_seq AS VARCHAR), 3, '0');

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
BEGIN
    -- Generate student_id if not provided
    IF NEW.student_id IS NULL THEN
        NEW.student_id := generate_student_id(NEW.class_id);
    END IF;

    -- Create user account if email is provided
    IF NEW.email IS NOT NULL THEN
        INSERT INTO users (username, email, password_hash, role, is_active, updated_by)
        VALUES (NEW.student_id, NEW.email, hash_default_password(), 'STUDENT', NEW.active, NEW.updated_by)
        ON CONFLICT (username) DO NOTHING; -- Prevent duplicate usernames
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FUNCTION TO AUTO-GENERATE TEACHER ID AND CREATE USER ACCOUNT
CREATE OR REPLACE FUNCTION create_teacher_and_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate teacher_id if not provided
    IF NEW.teacher_id IS NULL THEN
        NEW.teacher_id := generate_teacher_id();
    END IF;

    -- Create user account if email is provided
    IF NEW.email IS NOT NULL THEN
        INSERT INTO users (username, email, password_hash, role, is_active, updated_by)
        VALUES (NEW.teacher_id, NEW.email, hash_default_password(), 'TEACHER', NEW.active, NEW.updated_by)
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

-- ========================================
-- 4. TRIGGER DEFINITIONS
-- ========================================

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

-- TEACHERS TABLE TRIGGERS
CREATE TRIGGER trigger_create_teacher_and_user
    BEFORE INSERT ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION create_teacher_and_user();

CREATE TRIGGER trigger_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ACADEMIC YEARS TABLE TRIGGERS
CREATE TRIGGER trigger_academic_years_updated_at
    BEFORE UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ensure_single_current_year
    BEFORE INSERT OR UPDATE ON academic_years
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_year();

-- ========================================
-- 5. INDEX CREATIONS
-- ========================================

-- USERS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY idx_users_active ON users(is_active);

-- STUDENTS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_students_class_id ON students(class_id);
CREATE INDEX CONCURRENTLY idx_students_active ON students(active);
CREATE INDEX CONCURRENTLY idx_students_email ON students(email);

-- TEACHERS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_teachers_active ON teachers(active);
CREATE INDEX CONCURRENTLY idx_teachers_email ON teachers(email);

-- ACADEMIC YEARS TABLE INDEXES
CREATE INDEX CONCURRENTLY idx_academic_years_status ON academic_years(status);
CREATE INDEX CONCURRENTLY idx_academic_years_current ON academic_years(is_current);
CREATE INDEX CONCURRENTLY idx_academic_years_dates ON academic_years(start_date, end_date);

-- ========================================
-- 6. CONSTRAINT ADDITIONS
-- ========================================

-- USERS TABLE CONSTRAINTS
ALTER TABLE users ADD CONSTRAINT chk_users_email_format
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users ADD CONSTRAINT chk_users_username_length
    CHECK (LENGTH(TRIM(username)) >= 3);

-- STUDENTS TABLE CONSTRAINTS
ALTER TABLE students ADD CONSTRAINT chk_students_name_length
    CHECK (LENGTH(TRIM(name)) >= 2);

ALTER TABLE students ADD CONSTRAINT chk_students_email_format
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- TEACHERS TABLE CONSTRAINTS
ALTER TABLE teachers ADD CONSTRAINT chk_teachers_name_length
    CHECK (LENGTH(TRIM(name)) >= 2);

ALTER TABLE teachers ADD CONSTRAINT chk_teachers_email_format
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za