import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import FeeManagement from './pages/FeeManagement';
import FeeSummary from './pages/FeeSummary';
import TeacherManagement from './pages/TeacherManagement';
import SystemConfiguration from './pages/SystemConfiguration';
import StudentManagement from './pages/StudentManagement';
import StudentSummary from './pages/StudentSummary';
import { AcademicYearProvider } from '../../context/AcademicYearContext';

// Lazy load TimeManagement component
const TimeManagement = React.lazy(() => import('./pages/TimeManagement'));

const AdminDashboard = () => {
  return (
    <AcademicYearProvider>
      <AdminLayout>
        <Suspense fallback={<div className="d-flex justify-content-center m-4"><div className="spinner-border" role="status"></div></div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/fees" replace />} />
            <Route path="/fees" element={<FeeSummary />} />
            <Route path="/fees/:classId" element={<FeeManagement />} />
            <Route path="/fees/grade/:grade" element={<FeeManagement />} />
            <Route path="/teachers" element={<TeacherManagement />} />
            <Route path="/time-management" element={<TimeManagement />} />
            <Route path="/time-management/grade/:grade" element={<TimeManagement />} />
            <Route path="/time-management/:classId/:section" element={<TimeManagement />} />
            <Route path="/system-config" element={<SystemConfiguration />} />
            <Route path="/students" element={<StudentSummary />} />
            <Route path="/students/:classId" element={<StudentManagement />} />
            <Route path="/students/grade/:grade" element={<StudentManagement />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    </AcademicYearProvider>
  );
};

export default AdminDashboard;
