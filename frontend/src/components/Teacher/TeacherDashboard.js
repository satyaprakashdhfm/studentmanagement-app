import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import TeacherProfile from './pages/TeacherProfile';
import AttendanceManagement from './pages/AttendanceManagement';
import FeeInquiry from './pages/FeeInquiry';
import MarksManagement from './pages/MarksManagement';
import SyllabusManagement from './pages/SyllabusManagement';

const TeacherDashboard = () => {
  return (
    <TeacherLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/teacher/profile" replace />} />
        <Route path="/profile" element={<TeacherProfile />} />
        <Route path="/attendance" element={<AttendanceManagement />} />
        <Route path="/fees" element={<FeeInquiry />} />
        <Route path="/marks" element={<MarksManagement />} />
        <Route path="/syllabus" element={<SyllabusManagement />} />
      </Routes>
    </TeacherLayout>
  );
};

export default TeacherDashboard;
