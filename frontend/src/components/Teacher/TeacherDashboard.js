import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import TeacherProfile from './pages/TeacherProfile';
import AttendanceManagement from './pages/AttendanceManagement';
import FeeInquiry from './pages/FeeInquiry';
import MarksManagement from './pages/MarksManagement';
import SyllabusManagement from './pages/SyllabusManagement';
import TeacherTimetable from './pages/TeacherTimetable';

const TeacherDashboard = () => {
  useEffect(() => {
    document.title = 'Teacher Dashboard - Student Management System';
  }, []);

  return (
    <TeacherLayout>
      <Routes>
        <Route path="" element={<Navigate to="/teacher/profile" replace />} />
        <Route path="dashboard" element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="fees" element={<FeeInquiry />} />
        <Route path="marks" element={<MarksManagement />} />
        <Route path="syllabus" element={<SyllabusManagement />} />
        <Route path="timetable" element={<TeacherTimetable />} />
      </Routes>
    </TeacherLayout>
  );
};

export default TeacherDashboard;
