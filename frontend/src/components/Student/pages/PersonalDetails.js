import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const PersonalDetails = () => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.student) {
          setError('Student data not found');
          return;
        }

        const studentId = currentUser.student.studentId;
        const response = await apiService.getStudent(studentId);
        
        if (response.success) {
          setStudentData(response.data);
        } else {
          setError(response.message || 'Failed to fetch student data');
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        setError('Failed to load student information');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading student information...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px', color: '#e74c3c' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          No student data available
        </div>
      </div>
    );
  }

  return (
    <div className="content-card">
      <h2>Personal Details</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div>
          <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Student Information</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>Name:</strong> {studentData.name}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Email:</strong> {studentData.email}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Phone:</strong> {studentData.phone || 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Address:</strong> {studentData.address || 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Date of Birth:</strong> {studentData.dateOfBirth ? new Date(studentData.dateOfBirth).toLocaleDateString() : 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Admission Date:</strong> {studentData.admissionDate ? new Date(studentData.admissionDate).toLocaleDateString() : 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Status:</strong> 
            <span style={{ 
              color: studentData.status === 'active' ? '#27ae60' : '#e74c3c',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {studentData.status?.toUpperCase() || 'N/A'}
            </span>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Parent/Guardian Information</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>Father Name:</strong> {studentData.fatherName || 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Father Occupation:</strong> {studentData.fatherOccupation || 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Mother Name:</strong> {studentData.motherName || 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Mother Occupation:</strong> {studentData.motherOccupation || 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Parent Contact:</strong> {studentData.parentContact || 'N/A'}
          </div>
          
          <h3 style={{ marginBottom: '15px', color: '#2c3e50', marginTop: '30px' }}>Class Information</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>Class:</strong> {studentData.class ? `${studentData.class.className} - ${studentData.class.section}` : 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Class Teacher:</strong> {studentData.class?.classTeacher?.name || 'N/A'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Academic Year:</strong> {studentData.class?.academicYear || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetails;
