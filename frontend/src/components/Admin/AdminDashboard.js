import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import FeeManagement from './pages/FeeManagement';
import TeacherManagement from './pages/TeacherManagement';
import SystemConfiguration from './pages/SystemConfiguration';
import StudentManagement from './pages/StudentManagement';

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/fees" replace />} />
        <Route path="/fees" element={<FeeManagement />} />
        <Route path="/teachers" element={<TeacherManagement />} />
        <Route path="/system-config" element={<SystemConfiguration />} />
        <Route path="/students" element={<StudentManagement />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminDashboard;
