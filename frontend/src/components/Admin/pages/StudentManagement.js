import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';
import logger from '../../../utils/logger';
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
  const [expandedStudents, setExpandedStudents] = useState({});
  const [newStudent, setNewStudent] = useState({
    name: '',
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
    admissionDate: '',
    studentId: ''
  });
  
  // Use the academic year context
  const { selectedAcademicYear, classes } = useAcademicYear();

  // Reusable function to fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      let response;
      
      if (classId) {
        // Fetch students for specific class
        response = await apiService.getStudentsByClass(classId);
      } else if (!grade) {
        // Fetch all students if no grade or class is selected
        response = await apiService.getStudents();
      } else {
        // If grade is selected but no specific class, don't fetch students yet
        setStudents([]);
        return;
      }
      
      if (response.success) {
        const studentData = response.data || response.students || [];
        setStudents(studentData);
        setError('');
      } else {
        const errorMsg = response.message || 'Failed to fetch students';
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      logger.componentLifecycle('StudentManagement', 'fetchData started', { classId, grade, selectedAcademicYear });
      
      try {
        // Filter classes by selected academic year
        const filteredByYear = classes.filter(cls => cls.academicYear === selectedAcademicYear);
        logger.debug('Filtered classes by academic year', { filteredByYear: filteredByYear.length, selectedAcademicYear });
        
        // If classId is provided, find the matching class
        if (classId && !grade) {
          const selectedClass = filteredByYear.find(cls => cls.classId === parseInt(classId));
          if (selectedClass) {
            setSelectedClass(selectedClass);
            logger.debug('Selected class found', { selectedClass });
          }
        }
        
        // If grade is provided, filter classes for that grade and academic year
        if (grade) {
          const classesForGrade = filteredByYear.filter(cls => cls.className.includes(grade.replace('th', '').replace('Grade', '').trim()));
          setFilteredClasses(classesForGrade);
          logger.debug('Classes filtered by grade', { grade, classesForGrade: classesForGrade.length, foundClasses: classesForGrade.map(c => c.className) });
        }

        // Fetch students - only fetch if we have a specific classId, not for grade selection
        let response;
        logger.info('Starting student data fetch', { grade, classId, hasGrade: !!grade, hasClassId: !!classId });
        
        if (classId) {
          // Fetch students for specific class only
          response = await apiService.getStudentsByClass(classId);
        } else if (!grade) {
          // Only fetch all students if no grade or class is selected
          response = await apiService.getStudents();
        } else {
          // If grade is selected but no specific class, don't fetch students yet
          logger.info('Grade selected but no specific class - skipping student fetch');
          setStudents([]);
          return;
        }
        
        logger.info('Student API response received', { 
          success: response?.success, 
          hasData: !!response?.data, 
          hasStudents: !!response?.students,
          dataLength: response?.data?.length || response?.students?.length || 0,
          responseKeys: Object.keys(response || {}),
          firstStudentSample: response?.data?.[0] || response?.students?.[0] || null
        });
            
        if (response.success) {
          const studentData = response.data || response.students || [];
          logger.info('Students set successfully', { 
            count: studentData.length,
            sampleStudentNames: studentData.slice(0, 3).map(s => s.name || s.firstName + ' ' + s.lastName),
            sampleStudentIds: studentData.slice(0, 3).map(s => s.studentId || s.id)
          });
          setStudents(studentData);
        } else {
          const errorMsg = response.message || 'Failed to fetch students';
          setError(errorMsg);
          logger.error('Student fetch failed', null, { response, errorMsg });
        }
      } catch (error) {
        logger.error('Error in fetchData', error, { classId, grade, selectedAcademicYear });
        setError('Failed to load data');
      } finally {
        setLoading(false);
        logger.componentLifecycle('StudentManagement', 'fetchData completed');
      }
    };

    // Only fetch data if classes are available
    if (classes.length > 0) {
      fetchData();
    }
  }, [classId, grade, classes, selectedAcademicYear]);

  // Toggle student details expansion
  const toggleStudentExpansion = (studentId) => {
    setExpandedStudents(prev => ({
      ...prev,
      [String(studentId)]: !prev[String(studentId)]
    }));
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditMode(true);
    setShowStudentModal(true);
  };

  const handleDeleteStudent = async (studentId) => {
    // For active students, show soft delete option
    const confirmText = prompt('⚠️ This will DEACTIVATE the student and user account.\n\nTo confirm SOFT deletion, please type "student" (without quotes):');
    if (confirmText === 'student') {
      try {
        const response = await apiService.deleteStudent(studentId);
        if (response.success || response.message) {
          setShowStudentModal(false);
          setSelectedStudent(null);
          setEditMode(false);
          
          await fetchStudents();
          
          alert('Student and user account deactivated successfully (data preserved for history)');
        } else {
          alert('Failed to delete student');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student');
      }
    }
  };

  const handleHardDeleteStudent = async (student) => {
    const finalConfirm = window.confirm(
      `⚠️⚠️ PERMANENT HARD DELETE ⚠️⚠️\n\nThis will PERMANENTLY DELETE student "${student.name}" (ID: ${student.studentId}) and ALL their data from the database.\n\n🚨 This action CANNOT be undone!\n🚨 All attendance, marks, fees, and personal data will be LOST FOREVER!\n\nAre you absolutely sure you want to HARD DELETE this student?`
    );
    
    if (!finalConfirm) return;
    
    const typeConfirm = prompt('Type "HARD DELETE" to confirm permanent deletion:');
    if (typeConfirm !== 'HARD DELETE') return;
    
    try {
      const response = await apiService.request(`/students/${student.studentId}/hard-delete`, {
        method: 'DELETE'
      });
      
      setShowStudentModal(false);
      setSelectedStudent(null);
      setEditMode(false);
      
      await fetchStudents();
      alert('Student permanently deleted from database');
    } catch (err) {
      console.error('Hard delete error', err);
      const errorMessage = err.response?.data?.error || 'Failed to hard delete student';
      alert(errorMessage);
    }
  };

  const handleReactivateStudent = async (student) => {
    const message = `🔄 This student "${student.name}" (ID: ${student.studentId}) is currently DEACTIVATED.\n\nReactivating will:\n- Restore the student to active status\n- Reactivate their user account\n- Make them visible in normal operations\n\nDo you want to REACTIVATE this student?`;
    
    const confirmed = window.confirm(message);
    if (!confirmed) return;
    
    try {
      const response = await apiService.post(`/reactivation/student/${student.studentId}`);
      
      // Refresh the student list
      await fetchStudents();
      
      const successMessage = response?.message || 
        `✅ Student "${student.name}" has been reactivated successfully!`;
      alert(successMessage);
      
    } catch (err) {
      console.error('Reactivation error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to reactivate student';
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setEditMode(false);
    setShowStudentModal(true);
  };

  // Handle opening add modal with pre-populated class
  const handleOpenAddModal = () => {
    // If we're in a specific class view, pre-populate the class
    if (selectedClass) {
      const autoStudentId = generateStudentId(selectedClass);
      setNewStudent({
        ...newStudent,
        classId: selectedClass.classId.toString(),
        section: selectedClass.section,
        studentId: autoStudentId
      });
    }
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowStudentModal(false);
    setShowAddModal(false);
    setSelectedStudent(null);
    setEditMode(false);
    
    // Reset form - keep class info if in specific class view
    const resetForm = {
      name: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      fatherName: '',
      fatherOccupation: '',
      motherName: '',
      motherOccupation: '',
      parentContact: '',
      classId: selectedClass ? selectedClass.classId.toString() : '',
      section: selectedClass ? selectedClass.section : '',
      admissionDate: '',
      studentId: selectedClass ? generateStudentId(selectedClass) : ''
    };
    
    setNewStudent(resetForm);
  };

  // Generate student ID based on class and existing pattern
  const generateStudentId = (classData) => {
    if (!classData) return '';
    
    // Use classId + sequence number (001, 002, 003...)
    const classId = classData.classId.toString();
    
    // Find the highest existing student ID for this class to avoid reusing deleted IDs
    const studentsInClass = students.filter(s => s.classId === classData.classId);
    let maxRollNumber = 0;
    
    studentsInClass.forEach(student => {
      const studentIdStr = student.studentId || student.id || '';
      // Extract the last 3 digits (roll number) from studentId
      const rollNumberStr = studentIdStr.toString().slice(-3);
      const rollNumber = parseInt(rollNumberStr, 10);
      if (!isNaN(rollNumber) && rollNumber > maxRollNumber) {
        maxRollNumber = rollNumber;
      }
    });
    
    const nextRollNumber = (maxRollNumber + 1).toString().padStart(3, '0');
    
    return `${classId}${nextRollNumber}`;
  };

  // Handle name change (removed auto-email generation since it's optional)
  const handleNameChange = (name) => {
    setNewStudent({
      ...newStudent, 
      name: name
    });
  };

  // Handle class selection and auto-generate student ID
  const handleClassChange = (classId) => {
    const classData = classes.find(c => c.classId === parseInt(classId));
    const autoStudentId = generateStudentId(classData);
    
    setNewStudent({
      ...newStudent,
      classId: classId,
      studentId: autoStudentId,
      section: classData?.section || ''
    });
  };

  const handleAddStudent = async () => {
    try {
      const studentData = {
        ...newStudent,
        classId: selectedClass ? selectedClass.classId : parseInt(newStudent.classId),
        studentId: newStudent.studentId, // Use auto-generated student ID
        username: newStudent.studentId, // Username same as student ID
        email: `student_${newStudent.studentId}@school.edu`, // School email for both tables
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
              className={`class-box ${!cls.active ? 'deactivated' : ''}`}
              onClick={() => handleClassClick(cls.classId)}
            >
              <h4>
                {cls.className} {cls.section}
                {!cls.active && <span className="deactivated-badge">DEACTIVATED</span>}
              </h4>
              <div className="class-info">
                <p>Academic Year: {cls.academicYear}</p>
                <p>Max Students: {cls.maxStudents}</p>
                <p>Current Students: {cls.students?.length || 0}</p>
                {!cls.active && (
                  <p className="inactive-notice">⚠️ This class is deactivated but students are still viewable</p>
                )}
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
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              // Debug logging for each student being rendered
              logger.debug('Rendering student', { 
                student: {
                  id: student.id,
                  studentId: student.studentId,
                  name: student.name,
                  email: student.email,
                  classId: student.classId,
                  className: student.class?.className
                }
              });
              
              const studentId = String(student.studentId || student.id);
              const isExpanded = expandedStudents[studentId] || false;
              
              return (
                <React.Fragment key={studentId}>
                  {/* Student Summary Row */}
                  <tr 
                    className={`student-summary-row ${student.status !== 'active' ? 'deactivated' : ''}`}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <strong>
                          {student.name}
                          {student.status !== 'active' && <span className="deactivated-badge"> (DEACTIVATED)</span>}
                        </strong>
                      </div>
                    </td>
                    <td><strong>{student.class ? `${student.class.className} ${student.class.section}` : 'N/A'}</strong></td>
                    <td><strong>{student.email}</strong></td>
                    <td>
                      <span className={`status ${student.status}`}>
                        <strong>{student.status?.toUpperCase() || 'N/A'}</strong>
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-info btn-sm" 
                        onClick={() => toggleStudentExpansion(studentId)}
                        style={{ marginRight: '5px' }}
                      >
                        {isExpanded ? 'Collapse' : 'View Details'}
                      </button>
                      
                      {student.status === 'active' ? (
                        <>
                          <button 
                            className="btn btn-warning btn-sm" 
                            onClick={() => handleEditStudent(student)}
                            style={{ marginRight: '5px' }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDeleteStudent(student.studentId)}
                          >
                            Soft Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="btn btn-success btn-sm" 
                            onClick={() => handleReactivateStudent(student)}
                            style={{ marginRight: '5px' }}
                          >
                            🔄 Reactivate
                          </button>
                          <button 
                            className="btn btn-dark btn-sm" 
                            onClick={() => handleHardDeleteStudent(student)}
                            style={{ marginRight: '5px' }}
                          >
                            💀 Hard Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  
                  {/* Student Detail Rows (shown when expanded) */}
                  {isExpanded && (
                    <>
                      <tr className="student-detail-row">
                        <td style={{ paddingLeft: '30px' }}>Phone</td>
                        <td>-</td>
                        <td>{student.phone || 'N/A'}</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr className="student-detail-row">
                        <td style={{ paddingLeft: '30px' }}>Address</td>
                        <td>-</td>
                        <td>{student.address || 'N/A'}</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr className="student-detail-row">
                        <td style={{ paddingLeft: '30px' }}>Date of Birth</td>
                        <td>-</td>
                        <td>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr className="student-detail-row">
                        <td style={{ paddingLeft: '30px' }}>Father's Name</td>
                        <td>-</td>
                        <td>{student.fatherName || 'N/A'}</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr className="student-detail-row">
                        <td style={{ paddingLeft: '30px' }}>Mother's Name</td>
                        <td>-</td>
                        <td>{student.motherName || 'N/A'}</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr className="student-detail-row">
                        <td style={{ paddingLeft: '30px' }}>Parent Contact</td>
                        <td>-</td>
                        <td>{student.parentContact || 'N/A'}</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr className="student-detail-row">
                        <td style={{ paddingLeft: '30px' }}>Admission Date</td>
                        <td>-</td>
                        <td>{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              );
            })}
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
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(selectedStudent.studentId)}>
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
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
                
                {/* Only show class dropdown if not pre-selected */}
                {!selectedClass && (
                  <div className="form-group">
                    <label>Class *</label>
                    <select
                      value={newStudent.classId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.classId} value={cls.classId}>
                          {cls.className}th Grade - Section {cls.section}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Show selected class info if pre-selected */}
                {selectedClass && (
                  <div className="form-group">
                    <label>Class</label>
                    <input
                      type="text"
                      value={`${selectedClass.className}th Grade - Section ${selectedClass.section}`}
                      readOnly
                      style={{backgroundColor: '#f8f9fa', color: '#6c757d'}}
                    />
                  </div>
                )}
                

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
                disabled={!newStudent.name}
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
