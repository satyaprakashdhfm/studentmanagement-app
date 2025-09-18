import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import FeeManagement from './pages/FeeManagement';
import FeeSummary from './pages/FeeSummary';
import TeacherManagement from './pages/TeacherManagement';
import SystemConfiguration from './pages/SystemConfiguration';
import StudentManagement from './pages/StudentManagement';
import StudentSummary from './pages/StudentSummary';
import { AcademicYearProvider } from '../../context/AcademicYearContext';
import ClassManagement from './pages/ClassManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import AttendanceSummary from './pages/AttendanceSummary';
import MarksManagement from './pages/MarksManagement';
import MarksSummary from './pages/MarksSummary';
import StudentClassMarks from './pages/StudentClassMarks';
import ExamManagement from './pages/ExamManagement';
import HolidayManagement from './pages/HolidayManagement';
import ScheduleManagement from './pages/ScheduleManagement';
import { useAuth } from '../../context/AuthContext';

// Lazy load TimeManagement component
const TimeManagement = React.lazy(() => import('./pages/TimeManagement'));

const AdminDashboard = () => {
  const { login, isAuthenticated } = useAuth();
  
  // Dev-only helper: if running on localhost and no auth token, auto-login using seeded admin
  useEffect(() => {
    document.title = 'Admin Dashboard - Student Management System';
    
    const tryAutoLogin = async () => {
      try {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !isAuthenticated) {
          const token = localStorage.getItem('authToken');
          if (!token) {
            console.log('No auth token found — attempting dev auto-login as admin');
            const result = await login({ username: 'admin', password: 'admin123', role: 'admin' });
            if (result.success) {
              console.log('Dev auto-login successful');
            } else {
              console.log('Dev auto-login failed:', result.message);
            }
          }
        }
      } catch (err) {
        console.error('Dev auto-login error:', err);
      }
    };

    tryAutoLogin();
  }, [login, isAuthenticated]);
  return (
    <AcademicYearProvider>
      <AdminLayout>
        <Suspense fallback={<div className="d-flex justify-content-center m-4"><div className="spinner-border" role="status"></div></div>}>
          <Routes>
            <Route path="" element={<Navigate to="fees" replace />} />
            <Route path="dashboard" element={<Navigate to="fees" replace />} />
            <Route path="fees" element={<FeeSummary />} />
            <Route path="fees/:classId" element={<FeeManagement />} />
            <Route path="fees/grade/:grade" element={<FeeManagement />} />
            {/* New admin routes */}
            <Route path="classes" element={<ClassManagement />} />
            <Route path="attendance" element={<AttendanceManagement />} />
            <Route path="attendance/grade/:grade" element={<AttendanceManagement />} />
            <Route path="attendance/class/:classId" element={<AttendanceManagement />} />
            <Route path="marks" element={<MarksSummary />} />
            <Route path="marks/grade/:grade" element={<MarksManagement />} />
            <Route path="marks/class/:classId" element={<MarksManagement />} />
            <Route path="teachers" element={<TeacherManagement />} />
            <Route path="time-management" element={<TimeManagement key="default" />} />
            <Route path="time-management/grade/:grade" element={<TimeManagement key={window.location.pathname} />} />
            <Route path="time-management/:classId/:section" element={<TimeManagement key={window.location.pathname} />} />
            <Route path="schedule-management" element={<ScheduleManagement />} />
            <Route path="schedule-management/exams" element={<ExamManagement />} />
            <Route path="schedule-management/holidays" element={<HolidayManagement />} />
            <Route path="system-config" element={<SystemConfiguration />} />
            <Route path="students" element={<StudentSummary />} />
            <Route path="students/:classId" element={<StudentManagement />} />
            <Route path="students/grade/:grade" element={<StudentManagement />} />
            <Route path="students/grade/:grade/class/:classId/marks" element={<StudentClassMarks />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    </AcademicYearProvider>
  );
};

export default AdminDashboard;
