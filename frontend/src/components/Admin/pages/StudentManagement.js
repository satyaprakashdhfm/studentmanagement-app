import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';

const StudentManagement = () => {
  const { classId, grade } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get the current academic year (default to 2025-2026)
  const currentAcademicYear = "2025-2026";

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await apiService.getClasses();
        if (response.classes) {
          setClasses(response.classes);
          
          // If classId is provided, find the matching class
          if (classId && !grade) {
            const selectedClass = response.classes.find(cls => cls.classId === parseInt(classId));
            if (selectedClass) {
              setSelectedClass(selectedClass);
            }
          }
          
          // If grade is provided, filter classes for that grade
          if (grade) {
            const classesForGrade = response.classes.filter(cls => cls.className === grade);
            setFilteredClasses(classesForGrade);
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    const fetchStudents = async () => {
      try {
        // If classId is provided, fetch students for that specific class
        const response = classId && !grade
          ? await apiService.getStudentsByClass(classId)
          : await apiService.getStudents();
            
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

    fetchClasses();
    fetchStudents();
  }, [classId, grade]);

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

  // Group classes by grade level (8th, 9th, 10th)
  const classGroups = classes.reduce((groups, cls) => {
    const grade = cls.className; // e.g., "8th"
    if (!groups[grade]) {
      groups[grade] = [];
    }
    groups[grade].push(cls);
    return groups;
  }, {});

  // Handle clicking on a class section box
  const handleClassClick = (classId) => {
    navigate(`/admin/students/${classId}`);
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

  // If a specific grade is selected
  if (grade && filteredClasses.length > 0) {
    return (
      <div className="content-card">
        <div className="class-management-header">
          <h2>Student Management: Grade {grade}</h2>
          <button className="btn btn-primary" onClick={() => navigate('/admin/students')}>
            Back to All Classes
          </button>
        </div>
        
        <div className="class-boxes">
          {filteredClasses.map(cls => (
            <div 
              key={cls.classId} 
              className="class-box"
              onClick={() => handleClassClick(cls.classId)}
            >
              <h4>{cls.className} {cls.section}</h4>
              <div className="class-info">
                <p>Academic Year: {cls.academicYear}</p>
                <p>Max Students: {cls.maxStudents}</p>
              </div>
            </div>
          ))}
        </div>
        
        <style jsx>{`
          .class-management-header {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .class-boxes {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          .class-box {
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            width: 250px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .class-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          .class-box h4 {
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #3498db;
          }
          .class-info {
            font-size: 0.9em;
            color: #7f8c8d;
          }
          .class-info p {
            margin-bottom: 5px;
          }
        `}</style>
      </div>
    );
  }
  
  // If no class is selected, show the class selection UI
  if (!selectedClass && !classId) {
    return (
      <div className="content-card">
        <div className="class-management-header">
          <h2>Student Management</h2>
          <p>Select a class to manage students</p>
        </div>
        
        {Object.keys(classGroups).map(grade => (
          <div key={grade} className="grade-section">
            <h3>Grade {grade}</h3>
            <div className="class-boxes">
              {classGroups[grade].map(cls => (
                <div 
                  key={cls.classId} 
                  className="class-box"
                  onClick={() => handleClassClick(cls.classId)}
                >
                  <h4>{cls.className} {cls.section}</h4>
                  <div className="class-info">
                    <p>Academic Year: {cls.academicYear}</p>
                    <p>Max Students: {cls.maxStudents}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <style jsx>{`
          .class-management-header {
            margin-bottom: 20px;
          }
          .grade-section {
            margin-bottom: 25px;
          }
          .grade-section h3 {
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }
          .class-boxes {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          .class-box {
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            width: 250px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .class-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          .class-box h4 {
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #3498db;
          }
          .class-info {
            font-size: 0.9em;
            color: #7f8c8d;
          }
          .class-info p {
            margin-bottom: 5px;
          }
        `}</style>
      </div>
    );
  }

  // If a class is selected, show the student management interface for that class
  return (
    <div className="content-card">
      <div className="class-header">
        <h2>Student Management: {selectedClass ? `${selectedClass.className} ${selectedClass.section}` : 'All Classes'}</h2>
        {selectedClass && (
          <button className="btn btn-primary" onClick={() => navigate('/admin/students')}>
            Back to All Classes
          </button>
        )}
      </div>

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
