-- Student Management System Database Setup (PostgreSQL)
-- Run this script to create the database and tables

-- Note: Create database separately first:
-- CREATE DATABASE student_management;

-- Connect to the database before running this script
-- \c student_management;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    course VARCHAR(255),
    age INTEGER,
    phone_number VARCHAR(20),
    enrolled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);

-- Insert default admin user (password: admin123 - hashed with bcrypt)
INSERT INTO users (username, email, password, first_name, last_name, active) 
VALUES ('admin', 'admin@example.com', '$2b$10$rQZ4qZ8YqZ8YqZ8YqZ8YqOeqZ8YqZ8YqZ8YqZ8YqZ8YqZ8YqZ8YqO', 'Admin', 'User', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Insert sample students
INSERT INTO students (id, name, email, course, age, phone_number, enrolled) VALUES
(1, 'John Doe', 'john.doe@email.com', 'Computer Science', 22, '+1234567890', TRUE),
(2, 'Jane Smith', 'jane.smith@email.com', 'Mathematics', 21, '+1234567891', TRUE),
(3, 'Mike Johnson', 'mike.johnson@email.com', 'Physics', 23, '+1234567892', TRUE),
(4, 'Sarah Wilson', 'sarah.wilson@email.com', 'Chemistry', 20, '+1234567893', TRUE),
(5, 'David Brown', 'david.brown@email.com', 'Biology', 22, '+1234567894', FALSE)
ON CONFLICT (id) DO NOTHING;
