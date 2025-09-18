import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout from './StudentLayout';
import SequentialDashboard from '../Common/SequentialDashboard';
import PersonalDetails from './pages/PersonalDetails';
import StudentTimetable from './pages/StudentTimetable';
import AttendanceTracker from './pages/AttendanceTracker';
import FeeHistory from './pages/FeeHistory';
import AcademicPerformance from './pages/AcademicPerformance';
import SyllabusProgress from './pages/SyllabusProgress';

const StudentDashboard = () => {
  useEffect(() => {
    document.title = 'Student Dashboard - Student Management System';
  }, []);

  return (
    <StudentLayout>
      <SequentialDashboard loadingMessage="Loading student dashboard...">
        <Routes>
        <Route path="" element={<Navigate to="personal-details" replace />} />
        <Route path="dashboard" element={<Navigate to="../personal-details" replace />} />
        <Route path="personal-details" element={<PersonalDetails />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="attendance" element={<AttendanceTracker />} />
        <Route path="fees" element={<FeeHistory />} />
        <Route path="performance" element={<AcademicPerformance />} />
        <Route path="syllabus" element={<SyllabusProgress />} />
      </Routes>
      </SequentialDashboard>
    </StudentLayout>
  );
};

export default StudentDashboard;
