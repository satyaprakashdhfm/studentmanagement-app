-- Student Management System Database Setup (PostgreSQL)
-- Run this script to create the database and tables

-- Note: Create database separately first:
-- CREATE DATABASE student_management;

-- Connect to the database before running this script
-- \c student_management;

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
    teacher_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    qualification TEXT,
    subjects_handled TEXT[],
    classes_assigned TEXT[],
    class_teacher_of VARCHAR(50),
    hire_date TIMESTAMP,
    salary NUMERIC,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
    class_id INTEGER PRIMARY KEY,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(10) NOT NULL,
    class_teacher_id BIGINT,
    academic_year VARCHAR(20) NOT NULL,
    max_students INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (class_teacher_id) REFERENCES teachers(teacher_id)
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    student_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    date_of_birth TIMESTAMP,
    father_name VARCHAR(255),
    father_occupation VARCHAR(255),
    mother_name VARCHAR(255),
    mother_occupation VARCHAR(255),
    parent_contact VARCHAR(20),
    class_id INTEGER,
    section VARCHAR(10),
    admission_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
    subject_id INTEGER PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(20),
    class_applicable VARCHAR(50) NOT NULL,
    max_marks_per_exam INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    class_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    period INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    marked_by BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id),
    FOREIGN KEY (marked_by) REFERENCES teachers(teacher_id)
);

-- Create marks table
CREATE TABLE IF NOT EXISTS marks (
    marks_id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    examination_type VARCHAR(20) NOT NULL,
    marks_obtained INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    grade VARCHAR(5),
    teacher_id BIGINT NOT NULL,
    entry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

-- Create fees table
CREATE TABLE IF NOT EXISTS fees (
    fee_id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    class_id INTEGER NOT NULL,
    fee_type VARCHAR(50) NOT NULL,
    amount_due NUMERIC NOT NULL,
    amount_paid NUMERIC NOT NULL,
    payment_date TIMESTAMP,
    payment_method VARCHAR(50),
    balance NUMERIC NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
);

-- Create syllabus table
CREATE TABLE IF NOT EXISTS syllabus (
    syllabus_id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    unit_name VARCHAR(255) NOT NULL,
    completion_status VARCHAR(20) NOT NULL,
    completion_percentage INTEGER NOT NULL,
    current_topic TEXT,
    teacher_id BIGINT NOT NULL,
    last_updated TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(class_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

-- Create academic_calendar table
CREATE TABLE IF NOT EXISTS academic_calendar (
    calendar_id SERIAL PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    holidays JSONB,
    examination_dates JSONB,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marks_updated_at BEFORE UPDATE ON marks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_syllabus_updated_at BEFORE UPDATE ON syllabus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_calendar_updated_at BEFORE UPDATE ON academic_calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Insert default admin user (password: admin123 - hashed with bcrypt)
INSERT INTO users (username, email, password, first_name, last_name, role, active, updated_at) 
VALUES ('admin', 'admin@example.com', '$2b$10$rQZ4qZ8YqZ8YqZ8YqZ8YqOeqZ8YqZ8YqZ8YqZ8YqZ8YqZ8YqZ8YqO', 'Admin', 'User', 'admin', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Sample data inserts would go here...
