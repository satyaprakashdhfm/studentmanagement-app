import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import './StudentManagement.css';

const StudentManagement = () => {
  const { classId, grade } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    parentContact: '',
    classId: '',
    section: '',
    admissionDate: ''
  });
  
  // Use the academic year context
  const { selectedAcademicYear, classes } = useAcademicYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Filter classes by selected academic year
        const filteredByYear = classes.filter(cls => cls.academicYear === selectedAcademicYear);
        
        // If classId is provided, find the matching class
        if (classId && !grade) {
          const selectedClass = filteredByYear.find(cls => cls.classId === parseInt(classId));
          if (selectedClass) {
            setSelectedClass(selectedClass);
          }
        }
        
        // If grade is provided, filter classes for that grade and academic year
        if (grade) {
          const classesForGrade = filteredByYear.filter(cls => cls.className === grade);
          setFilteredClasses(classesForGrade);
        }

        // Fetch students
        const response = classId && !grade
          ? await apiService.getStudentsByClass(classId)
          : await apiService.getStudents();
            
        if (response.success) {
          setStudents(response.data);
        } else {
          setError(response.message || 'Failed to fetch students');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if classes are available
    if (classes.length > 0) {
      fetchData();
    }
  }, [classId, grade, classes, selectedAcademicYear]);

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditMode(true);
    setShowStudentModal(true);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await apiService.deleteStudent(studentId);
        if (response.success || response.message) {
          setStudents(students.filter(student => student.id !== studentId));
          alert('Student deleted successfully');
        } else {
          alert('Failed to delete student');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student');
      }
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setEditMode(false);
    setShowStudentModal(true);
  };

  const handleCloseModal = () => {
    setShowStudentModal(false);
    setShowAddModal(false);
    setSelectedStudent(null);
    setEditMode(false);
    setNewStudent({
      name: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      fatherName: '',
      fatherOccupation: '',
      motherName: '',
      motherOccupation: '',
      parentContact: '',
      classId: '',
      section: '',
      admissionDate: ''
    });
  };

  const handleAddStudent = async () => {
    try {
      const studentData = {
        ...newStudent,
        classId: selectedClass ? selectedClass.classId : parseInt(newStudent.classId),
        username: newStudent.email.split('@')[0],
        password: 'student123',
        firstName: newStudent.name.split(' ')[0],
        lastName: newStudent.name.split(' ').slice(1).join(' ')
      };
      
      const response = await apiService.createStudent(studentData);
      if (response.student) {
        setStudents([...students, response.student]);
        handleCloseModal();
        alert('Student added successfully');
      } else {
        alert(response.message || 'Failed to add student');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to add student');
    }
  };

  const handleUpdateStudent = async () => {
    try {
      const response = await apiService.updateStudent(selectedStudent.id, selectedStudent);
      if (response.student) {
        setStudents(students.map(s => s.id === selectedStudent.id ? response.student : s));
        handleCloseModal();
        alert('Student updated successfully');
      } else {
        alert(response.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Failed to update student');
    }
  };

  // Group classes by grade level (8th, 9th, 10th) - filtered by academic year
  const classGroups = classes
    .filter(cls => cls.academicYear === selectedAcademicYear)
    .reduce((groups, cls) => {
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
          <div className="academic-year-info">
            <span>Academic Year: {selectedAcademicYear}</span>
          </div>
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
          .academic-year-info {
            background-color: #3498db;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 0.9em;
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
          <div className="academic-year-info">
            <span>Academic Year: {selectedAcademicYear}</span>
          </div>
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
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .academic-year-info {
            background-color: #3498db;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 0.9em;
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
        <div className="header-actions">
          <div className="academic-year-info">
            <span>Academic Year: {selectedAcademicYear}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Add Student
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
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
                <td>{student.address || 'N/A'}</td>
                <td>
                  <span className={`status ${student.status}`}>
                    {student.status?.toUpperCase() || 'N/A'}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn-info btn-sm" 
                    onClick={() => handleStudentClick(student)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <div className="no-students">
            No students found for this class
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showStudentModal && selectedStudent && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Student' : 'Student Details'}</h3>
              <div className="modal-actions">
                {!editMode && (
                  <>
                    <button className="btn btn-warning btn-sm" onClick={() => setEditMode(true)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(selectedStudent.id)}>
                      Delete
                    </button>
                  </>
                )}
                <button className="btn btn-light btn-sm" onClick={handleCloseModal}>
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body">
              {editMode ? (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={selectedStudent.name}
                      onChange={(e) => setSelectedStudent({...selectedStudent, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={selectedStudent.email}
                      onChange={(e) => setSelectedStudent({...selectedStudent, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={selectedStudent.phone || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      value={selectedStudent.address || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, address: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Father Name</label>
                    <input
                      type="text"
                      value={selectedStudent.fatherName || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, fatherName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Father Occupation</label>
                    <input
                      type="text"
                      value={selectedStudent.fatherOccupation || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, fatherOccupation: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mother Name</label>
                    <input
                      type="text"
                      value={selectedStudent.motherName || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, motherName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mother Occupation</label>
                    <input
                      type="text"
                      value={selectedStudent.motherOccupation || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, motherOccupation: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Parent Contact</label>
                    <input
                      type="text"
                      value={selectedStudent.parentContact || ''}
                      onChange={(e) => setSelectedStudent({...selectedStudent, parentContact: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="details-grid">
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedStudent.name}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {selectedStudent.email}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedStudent.phone || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Address:</strong> {selectedStudent.address || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Date of Birth:</strong> {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Class:</strong> {selectedStudent.class ? `${selectedStudent.class.className} ${selectedStudent.class.section}` : 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Father Name:</strong> {selectedStudent.fatherName || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Father Occupation:</strong> {selectedStudent.fatherOccupation || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Mother Name:</strong> {selectedStudent.motherName || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Mother Occupation:</strong> {selectedStudent.motherOccupation || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Parent Contact:</strong> {selectedStudent.parentContact || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> 
                    <span className={`status ${selectedStudent.status}`}>
                      {selectedStudent.status?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {editMode && (
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleUpdateStudent}>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button className="btn btn-light btn-sm" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    value={newStudent.address}
                    onChange={(e) => setNewStudent({...newStudent, address: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={newStudent.dateOfBirth}
                    onChange={(e) => setNewStudent({...newStudent, dateOfBirth: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Father Name</label>
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => setNewStudent({...newStudent, fatherName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Father Occupation</label>
                  <input
                    type="text"
                    value={newStudent.fatherOccupation}
                    onChange={(e) => setNewStudent({...newStudent, fatherOccupation: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Mother Name</label>
                  <input
                    type="text"
                    value={newStudent.motherName}
                    onChange={(e) => setNewStudent({...newStudent, motherName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Mother Occupation</label>
                  <input
                    type="text"
                    value={newStudent.motherOccupation}
                    onChange={(e) => setNewStudent({...newStudent, motherOccupation: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Parent Contact</label>
                  <input
                    type="text"
                    value={newStudent.parentContact}
                    onChange={(e) => setNewStudent({...newStudent, parentContact: e.target.value})}
                  />
                </div>
                {!selectedClass && (
                  <>
                    <div className="form-group">
                      <label>Class</label>
                      <select
                        value={newStudent.classId}
                        onChange={(e) => setNewStudent({...newStudent, classId: e.target.value})}
                      >
                        <option value="">Select Class</option>
                        {classes.filter(c => c.academicYear === selectedAcademicYear).map(cls => (
                          <option key={cls.classId} value={cls.classId}>
                            {cls.className} - {cls.section}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddStudent}
                disabled={!newStudent.name || !newStudent.email}
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .class-header {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .academic-year-info {
          background-color: #3498db;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};

export default StudentManagement;
