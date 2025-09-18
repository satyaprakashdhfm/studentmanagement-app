import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const TeacherProfile = () => {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        setLoading(true);
        
        console.log('Current user from auth context:', user);
        
        if (user && user.teacher) {
          // If user data includes teacher info, use it
          console.log('Using teacher data from auth context:', user.teacher);
          setTeacher(user.teacher);
        } else {
          console.log('No teacher data found in auth context, attempting API call...');
          // For now, show error since we don't have a specific teacher profile endpoint
          setError('Teacher profile not found in session. Please login again.');
        }
      } catch (err) {
        console.error('Error loading teacher profile:', err);
        setError('Failed to load teacher profile');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTeacherProfile();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="content-card">
        <h2>Teacher Profile</h2>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <h2>Teacher Profile</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="content-card">
        <h2>Teacher Profile</h2>
        <p>No teacher profile found.</p>
      </div>
    );
  }

  return (
    <div className="content-card">
      <h2>Teacher Profile</h2>
      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Personal Information</h3>
          <p><strong>Name:</strong> {teacher.name}</p>
          <p><strong>Email:</strong> {teacher.email}</p>
          <p><strong>Phone:</strong> {teacher.phoneNumber}</p>
          <p><strong>Qualification:</strong> {teacher.qualification}</p>
          <p><strong>Hire Date:</strong> {teacher.hireDate ? new Date(teacher.hireDate).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Salary:</strong> {
            teacher.salary 
              ? (typeof teacher.salary === 'object' && teacher.salary.d 
                  ? `$${teacher.salary.d[0]}` 
                  : `$${teacher.salary}`)
              : 'N/A'
          }</p>
        </div>
        <div style={{ flex: '1 1 300px' }}>
          <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Teaching Details</h3>
          <p><strong>Subjects Handled:</strong> {teacher.subjectsHandled ? teacher.subjectsHandled.join(', ') : 'N/A'}</p>
          <p><strong>Classes Assigned:</strong> {teacher.classesAssigned ? teacher.classesAssigned.join(', ') : 'N/A'}</p>
          <p><strong>Class Teacher Of:</strong> {teacher.classTeacherOf || 'N/A'}</p>
          <p><strong>Status:</strong> <span style={{ color: teacher.active ? 'green' : 'red' }}>{teacher.active ? 'Active' : 'Inactive'}</span></p>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
