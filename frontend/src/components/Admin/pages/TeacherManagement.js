import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await apiService.getTeachers();
        console.log('👨‍🏫 Teachers response:', response);
        if (response.teachers) {
          setTeachers(response.teachers);
        } else {
          setError(response.message || 'Failed to fetch teachers');
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
        setError('Failed to load teachers');
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  const handleEditTeacher = (teacherId) => {
    alert(`Edit teacher ${teacherId} - Feature coming soon`);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        const response = await apiService.deleteTeacher(teacherId);
        if (response.message && response.message.includes('successfully')) {
          setTeachers(teachers.filter(teacher => teacher.id !== teacherId));
          alert('Teacher deleted successfully');
        } else {
          alert(response.message || 'Failed to delete teacher');
        }
      } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('Failed to delete teacher');
      }
    }
  };

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading teachers...
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
      <h2>Teacher Management</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Subjects</th>
            <th>Classes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map(teacher => (
            <tr key={teacher.id}>
              <td>{teacher.name}</td>
              <td>{teacher.email}</td>
              <td>{teacher.phoneNumber || 'N/A'}</td>
              <td>{teacher.subjectsHandled ? teacher.subjectsHandled.join(', ') : 'N/A'}</td>
              <td>{teacher.classesAssigned ? teacher.classesAssigned.join(', ') : 'N/A'}</td>
              <td>
                <button 
                  className="btn btn-warning" 
                  onClick={() => handleEditTeacher(teacher.id)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteTeacher(teacher.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeacherManagement;
