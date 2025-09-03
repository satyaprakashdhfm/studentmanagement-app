
-- Insert sample users
INSERT INTO users (username, email, password, first_name, last_name, active)
VALUES
('admin', 'admin@example.com', 'admin123', 'Admin', 'User', true),
('johndoe', 'john.doe@example.com', 'user123', 'John', 'Doe', true),
('janesmit', 'jane.smith@example.com', 'user123', 'Jane', 'Smith', true),
('testuser', 'test@example.com', 'test123', 'Test', 'User', false);

-- Insert sample students
INSERT INTO students (name, email, course, age, phone_number, enrolled)
VALUES
('Alice Johnson', 'alice.johnson@student.edu', 'Computer Science', 20, '+1-555-0101', true),
('Bob Wilson', 'bob.wilson@student.edu', 'Information Technology', 22, '+1-555-0102', true),
('Charlie Brown', 'charlie.brown@student.edu', 'Software Engineering', 21, '+1-555-0103', true),
('Diana Prince', 'diana.prince@student.edu', 'Data Science', 23, '+1-555-0104', true),
('Edward Clark', 'edward.clark@student.edu', 'Cybersecurity', 24, '+1-555-0105', false),
('Fiona Davis', 'fiona.davis@student.edu', 'Computer Science', 19, '+1-555-0106', true),
('George Miller', 'george.miller@student.edu', 'Information Technology', 25, '+1-555-0107', true),
('Hannah Taylor', 'hannah.taylor@student.edu', 'Software Engineering', 20, '+1-555-0108', false),
('Ivan Rodriguez', 'ivan.rodriguez@student.edu', 'Data Science', 22, '+1-555-0109', true),
('Julia Anderson', 'julia.anderson@student.edu', 'Computer Science', 21, '+1-555-0110', true);
