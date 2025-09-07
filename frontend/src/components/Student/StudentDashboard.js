import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout from './StudentLayout';
import PersonalDetails from './pages/PersonalDetails';
import AttendanceTracker from './pages/AttendanceTracker';
import FeeHistory from './pages/FeeHistory';
import AcademicPerformance from './pages/AcademicPerformance';
import SyllabusProgress from './pages/SyllabusProgress';

const StudentDashboard = () => {
  return (
    <StudentLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/student/personal-details" replace />} />
        <Route path="/personal-details" element={<PersonalDetails />} />
        <Route path="/attendance" element={<AttendanceTracker />} />
        <Route path="/fees" element={<FeeHistory />} />
        <Route path="/performance" element={<AcademicPerformance />} />
        <Route path="/syllabus" element={<SyllabusProgress />} />
      </Routes>
    </StudentLayout>
  );
};

export default StudentDashboard;
