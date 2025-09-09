import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import FeeManagement from './pages/FeeManagement';
import FeeSummary from './pages/FeeSummary';
import TeacherManagement from './pages/TeacherManagement';
import SystemConfiguration from './pages/SystemConfiguration';
import StudentManagement from './pages/StudentManagement';
import StudentSummary from './pages/StudentSummary';
import { AcademicYearProvider } from '../../context/AcademicYearContext';

const AdminDashboard = () => {
  return (
    <AcademicYearProvider>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/fees" replace />} />
          <Route path="/fees" element={<FeeSummary />} />
          <Route path="/fees/:classId" element={<FeeManagement />} />
          <Route path="/fees/grade/:grade" element={<FeeManagement />} />
          <Route path="/teachers" element={<TeacherManagement />} />
          <Route path="/system-config" element={<SystemConfiguration />} />
          <Route path="/students" element={<StudentSummary />} />
          <Route path="/students/:classId" element={<StudentManagement />} />
          <Route path="/students/grade/:grade" element={<StudentManagement />} />
        </Routes>
      </AdminLayout>
    </AcademicYearProvider>
  );
};

export default AdminDashboard;
