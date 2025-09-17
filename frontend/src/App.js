import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/Auth/AdminLogin';
import TeacherLogin from './components/Auth/TeacherLogin';
import StudentLogin from './components/Auth/StudentLogin';
import StudentDashboard from './components/Student/StudentDashboard';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route redirects to admin login */}
          <Route path="/" element={<Navigate to="/login/admin" replace />} />

          {/* Role-specific login routes */}
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/teacher" element={<TeacherLogin />} />
          <Route path="/login/student" element={<StudentLogin />} />

          {/* Student Routes */}
          <Route path="/student/*" element={<StudentDashboard />} />

          {/* Teacher Routes */}
          <Route path="/teacher/*" element={<TeacherDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={<AdminDashboard />} />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login/admin" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
