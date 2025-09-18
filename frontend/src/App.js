import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ConnectionStatus from './components/Common/ConnectionStatus';
import AdminLogin from './components/Auth/AdminLogin';
import TeacherLogin from './components/Auth/TeacherLogin';
import StudentLogin from './components/Auth/StudentLogin';
import StudentDashboard from './components/Student/StudentDashboard';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import AuthGuard from './components/Auth/AuthGuard';
import './utils/sessionDebugger'; // Import session debugger for console access
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <ConnectionStatus />
            <Routes>
              {/* Default route redirects to admin login */}
              <Route path="/" element={<Navigate to="/login/admin" replace />} />

              {/* Role-specific login routes */}
              <Route path="/login/admin" element={<AdminLogin />} />
              <Route path="/login/teacher" element={<TeacherLogin />} />
              <Route path="/login/student" element={<StudentLogin />} />

            {/* Protected Student Routes */}
            <Route path="/student/*" element={
              <AuthGuard allowedRoles={['student']}>
                <StudentDashboard />
              </AuthGuard>
            } />

            {/* Protected Teacher Routes */}
            <Route path="/teacher/*" element={
              <AuthGuard allowedRoles={['teacher']}>
                <TeacherDashboard />
              </AuthGuard>
            } />

            {/* Protected Admin Routes */}
            <Route path="/admin/*" element={
              <AuthGuard allowedRoles={['admin']}>
                <AdminDashboard />
              </AuthGuard>
            } />

            {/* Catch all route redirects to admin login */}
            <Route path="*" element={<Navigate to="/login/admin" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
