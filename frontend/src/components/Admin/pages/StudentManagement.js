import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await apiService.getStudents();
        if (response.success) {
          setStudents(response.data);
        } else {
          setError(response.message || 'Failed to fetch students');
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleEditStudent = (studentId) => {
    alert(`Edit student ${studentId} - Feature coming soon`);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await apiService.deleteStudent(studentId);
        if (response.success) {
          setStudents(students.filter(student => student.id !== studentId));
          alert('Student deleted successfully');
        } else {
          alert(response.message || 'Failed to delete student');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student');
      }
    }
  };

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading students...
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

  return (
    <div className="content-card">
      <h2>Student Management</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{student.class ? `${student.class.className} ${student.class.section}` : 'N/A'}</td>
              <td>{student.email}</td>
              <td>{student.phone || 'N/A'}</td>
              <td style={{ color: student.status === 'active' ? '#27ae60' : '#e74c3c' }}>
                {student.status?.toUpperCase() || 'N/A'}
              </td>
              <td>
                <button className="btn btn-warning" onClick={() => handleEditStudent(student.id)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => handleDeleteStudent(student.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {students.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
          No students found
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
