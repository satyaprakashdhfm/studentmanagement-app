import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import './TeacherManagement.css';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    qualification: '',
    qualifiedSubjects: [], // Array for multiple subjects
    subjectsHandled: [], // Will be auto-generated based on qualifiedSubjects
    classesAssigned: [], // Will be selected from available classes
    classTeacherOf: '',
    hireDate: '',
    salary: '',
    username: '',
    password: 'teacher123', // Default password
    firstName: '',
    lastName: ''
  });

  // Subject mapping configuration
  const subjectOptions = [
    { value: 'English', code: 'ENG', grades: ['8_ENG', '9_ENG', '10_ENG'] },
    { value: 'Telugu', code: 'TEL', grades: ['8_TEL', '9_TEL', '10_TEL'] },
    { value: 'Science', code: 'SCI', grades: ['8_SCI', '9_SCI', '10_SCI'] },
    { value: 'Mathematics', code: 'MATH', grades: ['8_MATH', '9_MATH', '10_MATH'] },
    { value: 'Hindi', code: 'HIN', grades: ['8_HIN', '9_HIN', '10_HIN'] },
    { value: 'Social Studies', code: 'SOC', grades: ['8_SOC', '9_SOC', '10_SOC'] }
  ];

  // Available classes from database
  const availableClasses = [
    { id: '242508001', name: '8 Grade A', grade: '8', section: 'A' },
    { id: '242508002', name: '8 Grade B', grade: '8', section: 'B' },
    { id: '242508003', name: '8 Grade C', grade: '8', section: 'C' },
    { id: '242509001', name: '9 Grade A', grade: '9', section: 'A' },
    { id: '242509002', name: '9 Grade B', grade: '9', section: 'B' },
    { id: '242509003', name: '9 Grade C', grade: '9', section: 'C' },
    { id: '242510001', name: '10 Grade A', grade: '10', section: 'A' },
    { id: '242510002', name: '10 Grade B', grade: '10', section: 'B' },
    { id: '242510003', name: '10 Grade C', grade: '10', section: 'C' }
  ];

  // Generate teacher ID based on name and primary subject
  const generateTeacherId = (name, primarySubject) => {
    if (!name || !primarySubject) return '';
    
    const firstName = name.split(' ')[0].toLowerCase();
    const subjectCode = subjectOptions.find(s => s.value === primarySubject)?.code.toLowerCase() || '';
    const dateCode = '080910'; // Fixed date pattern as per examples
    
    return `${firstName}${subjectCode}${dateCode}`;
  };

  // Handle qualified subjects change
  const handleQualifiedSubjectsChange = (subject, isChecked) => {
    let updatedSubjects = [...newTeacher.qualifiedSubjects];
    
    if (isChecked) {
      updatedSubjects.push(subject);
    } else {
      updatedSubjects = updatedSubjects.filter(s => s !== subject);
      // Also remove any subject codes for this subject
      const subjectConfig = subjectOptions.find(s => s.value === subject);
      if (subjectConfig) {
        const updatedSubjectsHandled = newTeacher.subjectsHandled.filter(
          code => !subjectConfig.grades.includes(code)
        );
        setNewTeacher(prev => ({
          ...prev,
          qualifiedSubjects: updatedSubjects,
          subjectsHandled: updatedSubjectsHandled
        }));
        return;
      }
    }

    // Generate teacher ID if name exists and this is the first subject
    const teacherId = updatedSubjects.length > 0 && newTeacher.name ? 
      generateTeacherId(newTeacher.name, updatedSubjects[0]) : '';

    setNewTeacher({
      ...newTeacher,
      qualifiedSubjects: updatedSubjects,
      username: teacherId
    });
  };

  // Handle specific subject code selection
  const handleSubjectCodeChange = (subjectCode, isChecked) => {
    let updatedSubjectsHandled = [...newTeacher.subjectsHandled];
    
    if (isChecked) {
      updatedSubjectsHandled.push(subjectCode);
    } else {
      updatedSubjectsHandled = updatedSubjectsHandled.filter(code => code !== subjectCode);
    }
    
    setNewTeacher({
      ...newTeacher,
      subjectsHandled: updatedSubjectsHandled
    });
  };

  // Handle name change and regenerate teacher ID
  const handleNameChange = (name) => {
    const teacherId = newTeacher.qualifiedSubjects.length > 0 ? 
      generateTeacherId(name, newTeacher.qualifiedSubjects[0]) : '';
    
    setNewTeacher({
      ...newTeacher,
      name: name,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' '),
      username: teacherId
    });
  };

  // Handle class assignment change
  const handleClassAssignmentChange = (classId, isChecked) => {
    let updatedClasses = [...newTeacher.classesAssigned];
    
    if (isChecked) {
      updatedClasses.push(classId);
    } else {
      updatedClasses = updatedClasses.filter(c => c !== classId);
    }
    
    setNewTeacher({
      ...newTeacher,
      classesAssigned: updatedClasses
    });
  };

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

  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setEditMode(true);
    setShowTeacherModal(true);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        const response = await apiService.deleteTeacher(teacherId);
        if (response.success || response.message?.includes('successfully')) {
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

  const handleTeacherClick = (teacher) => {
    setSelectedTeacher(teacher);
    setEditMode(false);
    setShowTeacherModal(true);
  };

  const handleCloseModal = () => {
    setShowTeacherModal(false);
    setShowAddModal(false);
    setSelectedTeacher(null);
    setEditMode(false);
    setNewTeacher({
      name: '',
      email: '',
      phoneNumber: '',
      qualification: '',
      qualifiedSubjects: [],
      subjectsHandled: [],
      classesAssigned: [],
      classTeacherOf: '',
      hireDate: '',
      salary: '',
      username: '',
      password: 'teacher123',
      firstName: '',
      lastName: ''
    });
  };

  const handleAddTeacher = async () => {
    try {
      // Validate required fields
      if (!newTeacher.name || !newTeacher.email || !newTeacher.qualifiedSubjects.length) {
        alert('Please fill in all required fields: Name, Email, and at least one Qualified Subject');
        return;
      }

      const teacherData = {
        name: newTeacher.name,
        email: newTeacher.email,
        phoneNumber: newTeacher.phoneNumber,
        qualification: newTeacher.qualification,
        qualifiedSubjects: newTeacher.qualifiedSubjects,
        subjectsHandled: newTeacher.subjectsHandled,
        classesAssigned: newTeacher.classesAssigned,
        classTeacherOf: newTeacher.classTeacherOf,
        hireDate: newTeacher.hireDate,
        salary: newTeacher.salary ? parseFloat(newTeacher.salary) : null,
        username: newTeacher.username,
        password: newTeacher.password,
        firstName: newTeacher.firstName,
        lastName: newTeacher.lastName,
        teacherId: newTeacher.username // Use generated username as teacher ID
      };
      
      console.log('🎓 Adding teacher with data:', teacherData);
      
      const response = await apiService.createTeacher(teacherData);
      if (response.teacher || response.success) {
        setTeachers([...teachers, response.teacher || response.data]);
        handleCloseModal();
        alert('Teacher added successfully with ID: ' + teacherData.teacherId);
      } else {
        alert(response.message || 'Failed to add teacher');
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert('Failed to add teacher: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdateTeacher = async () => {
    try {
      const response = await apiService.updateTeacher(selectedTeacher.id, selectedTeacher);
      if (response.success || response.teacher) {
        setTeachers(teachers.map(t => t.id === selectedTeacher.id ? selectedTeacher : t));
        setEditMode(false);
        alert('Teacher updated successfully');
      } else {
        alert(response.message || 'Failed to update teacher');
      }
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert('Failed to update teacher');
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
      <div className="teacher-header">
        <h2>Teacher Management</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Add Teacher
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Class Teacher</th>
              <th>Subjects</th>
              <th>Classes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(teacher => (
              <tr key={teacher.id}>
                <td>{teacher.name}</td>
                <td>{teacher.classTeacherOf || 'N/A'}</td>
                <td>{teacher.subjectsHandled?.length > 0 ? teacher.subjectsHandled.join(', ') : 'N/A'}</td>
                <td>{teacher.classesAssigned?.length > 0 ? teacher.classesAssigned.join(', ') : 'N/A'}</td>
                <td>
                  <button 
                    className="btn btn-info btn-sm" 
                    onClick={() => handleTeacherClick(teacher)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {teachers.length === 0 && (
          <div className="no-teachers">
            No teachers found
          </div>
        )}
      </div>

      {/* Teacher Details Modal */}
      {showTeacherModal && selectedTeacher && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Teacher' : 'Teacher Details'}</h3>
              <div className="modal-actions">
                {!editMode && (
                  <>
                    <button className="btn btn-warning btn-sm" onClick={() => setEditMode(true)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTeacher(selectedTeacher.id)}>
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
                      value={selectedTeacher.name}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={selectedTeacher.email}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={selectedTeacher.phoneNumber || ''}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, phoneNumber: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Qualification</label>
                    <textarea
                      value={selectedTeacher.qualification || ''}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, qualification: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Subjects Handled</label>
                    <input
                      type="text"
                      value={selectedTeacher.subjectsHandled?.join(', ') || ''}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, subjectsHandled: e.target.value.split(',').map(s => s.trim())})}
                      placeholder="Math, Science, English"
                    />
                  </div>
                  <div className="form-group">
                    <label>Classes Assigned</label>
                    <input
                      type="text"
                      value={selectedTeacher.classesAssigned?.join(', ') || ''}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, classesAssigned: e.target.value.split(',').map(s => s.trim())})}
                      placeholder="10A, 10B, 11A"
                    />
                  </div>
                  <div className="form-group">
                    <label>Class Teacher Of</label>
                    <input
                      type="text"
                      value={selectedTeacher.classTeacherOf || ''}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, classTeacherOf: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary</label>
                    <input
                      type="number"
                      value={selectedTeacher.salary || ''}
                      onChange={(e) => setSelectedTeacher({...selectedTeacher, salary: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="details-grid">
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedTeacher.name}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {selectedTeacher.email}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedTeacher.phoneNumber || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Qualification:</strong> {selectedTeacher.qualification || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Subjects Handled:</strong> {selectedTeacher.subjectsHandled?.join(', ') || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Classes Assigned:</strong> {selectedTeacher.classesAssigned?.join(', ') || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Class Teacher Of:</strong> {selectedTeacher.classTeacherOf || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Hire Date:</strong> {selectedTeacher.hireDate ? new Date(selectedTeacher.hireDate).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Salary:</strong> {selectedTeacher.salary ? `₹${selectedTeacher.salary}` : 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> 
                    <span className={`status ${selectedTeacher.active ? 'active' : 'inactive'}`}>
                      {selectedTeacher.active ? 'ACTIVE' : 'INACTIVE'}
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
                <button className="btn btn-primary" onClick={handleUpdateTeacher}>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Add New Teacher</h3>
              <button className="btn btn-light btn-sm" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                
                {/* Basic Information */}
                <div style={{ gridColumn: '1 / -1', marginBottom: '20px' }}>
                  <h4 style={{ color: '#2c3e50', borderBottom: '2px solid #e8f4f8', paddingBottom: '8px' }}>
                    📝 Basic Information
                  </h4>
                </div>

                <div className="form-group">
                  <label>Name * <small style={{ color: '#7f8c8d' }}>(e.g., Amit Patel)</small></label>
                  <input
                    type="text"
                    value={newTeacher.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="Enter full name"
                  />
                </div>

                <div className="form-group">
                  <label>Email * <small style={{ color: '#7f8c8d' }}>(e.g., amit.patel@school.local)</small></label>
                  <input
                    type="email"
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                    required
                    placeholder="teacher@school.local"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number <small style={{ color: '#7f8c8d' }}>(e.g., +91-9876543210)</small></label>
                  <input
                    type="text"
                    value={newTeacher.phoneNumber}
                    onChange={(e) => setNewTeacher({...newTeacher, phoneNumber: e.target.value})}
                    placeholder="+91-9876543210"
                  />
                </div>

                <div className="form-group">
                  <label>Qualification <small style={{ color: '#7f8c8d' }}>(e.g., M.A. English, B.Ed.)</small></label>
                  <textarea
                    value={newTeacher.qualification}
                    onChange={(e) => setNewTeacher({...newTeacher, qualification: e.target.value})}
                    placeholder="M.A. English, B.Ed."
                    rows="2"
                  />
                </div>

                {/* Subject Information */}
                <div style={{ gridColumn: '1 / -1', marginTop: '20px', marginBottom: '20px' }}>
                  <h4 style={{ color: '#2c3e50', borderBottom: '2px solid #e8f4f8', paddingBottom: '8px' }}>
                    📚 Subject Qualifications
                  </h4>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Qualified Subjects * <small style={{ color: '#7f8c8d' }}>(Select subjects you can teach)</small></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                    {subjectOptions.map(subject => (
                      <label key={subject.value} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: newTeacher.qualifiedSubjects.includes(subject.value) ? '#e8f4f8' : 'white'
                      }}>
                        <input
                          type="checkbox"
                          checked={newTeacher.qualifiedSubjects.includes(subject.value)}
                          onChange={(e) => handleQualifiedSubjectsChange(subject.value, e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        {subject.value}
                      </label>
                    ))}
                  </div>
                </div>

                {newTeacher.qualifiedSubjects.length > 0 && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Select Specific Subject Codes to Handle <small style={{ color: '#7f8c8d' }}>(Choose which grade levels you'll teach for each subject)</small></label>
                    
                    <div style={{ marginTop: '15px' }}>
                      {newTeacher.qualifiedSubjects.map(subject => {
                        const subjectConfig = subjectOptions.find(s => s.value === subject);
                        if (!subjectConfig) return null;
                        
                        return (
                          <div key={subject} style={{ 
                            marginBottom: '20px', 
                            padding: '15px', 
                            border: '1px solid #e9ecef',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa'
                          }}>
                            <h5 style={{ 
                              color: '#2c3e50', 
                              marginBottom: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              📚 {subject}
                            </h5>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              {subjectConfig.grades.map(gradeCode => (
                                <label key={gradeCode} style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  padding: '6px 10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  backgroundColor: newTeacher.subjectsHandled.includes(gradeCode) ? '#e8f4f8' : 'white',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontFamily: 'monospace'
                                }}>
                                  <input
                                    type="checkbox"
                                    style={{ marginRight: '6px' }}
                                    checked={newTeacher.subjectsHandled.includes(gradeCode)}
                                    onChange={(e) => handleSubjectCodeChange(gradeCode, e.target.checked)}
                                  />
                                  {gradeCode}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ 
                      marginTop: '15px',
                      padding: '10px', 
                      backgroundColor: '#f8f9fa', 
                      border: '1px solid #e9ecef',
                      borderRadius: '4px'
                    }}>
                      <strong>Selected Codes:</strong>
                      <div style={{ 
                        marginTop: '5px',
                        padding: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #e9ecef',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}>
                        {newTeacher.subjectsHandled.length > 0 ? 
                          `[${newTeacher.subjectsHandled.map(s => `"${s}"`).join(', ')}]` : 
                          'No codes selected'
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Class Assignments */}
                <div style={{ gridColumn: '1 / -1', marginTop: '20px', marginBottom: '20px' }}>
                  <h4 style={{ color: '#2c3e50', borderBottom: '2px solid #e8f4f8', paddingBottom: '8px' }}>
                    🏫 Class Assignments
                  </h4>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Classes to Assign <small style={{ color: '#7f8c8d' }}>(Select classes where you'll teach)</small></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                    {availableClasses.map(classItem => (
                      <label key={classItem.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: newTeacher.classesAssigned.includes(classItem.id) ? '#e8f4f8' : 'white',
                        fontSize: '13px'
                      }}>
                        <input
                          type="checkbox"
                          checked={newTeacher.classesAssigned.includes(classItem.id)}
                          onChange={(e) => handleClassAssignmentChange(classItem.id, e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        {classItem.name}
                        <small style={{ color: '#6c757d', marginLeft: '4px' }}>({classItem.id})</small>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Class Teacher Of <small style={{ color: '#7f8c8d' }}>(Optional - Main class responsibility)</small></label>
                  <select
                    value={newTeacher.classTeacherOf}
                    onChange={(e) => setNewTeacher({...newTeacher, classTeacherOf: e.target.value})}
                  >
                    <option value="">Select a class (Optional)</option>
                    {availableClasses
                      .filter(c => newTeacher.classesAssigned.includes(c.id))
                      .map(classItem => (
                        <option key={classItem.id} value={classItem.name}>
                          {classItem.name} (ID: {classItem.id})
                        </option>
                      ))
                    }
                  </select>
                </div>

                {/* Employment Details */}
                <div style={{ gridColumn: '1 / -1', marginTop: '20px', marginBottom: '20px' }}>
                  <h4 style={{ color: '#2c3e50', borderBottom: '2px solid #e8f4f8', paddingBottom: '8px' }}>
                    💼 Employment Details
                  </h4>
                </div>

                <div className="form-group">
                  <label>Hire Date</label>
                  <input
                    type="date"
                    value={newTeacher.hireDate}
                    onChange={(e) => setNewTeacher({...newTeacher, hireDate: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Salary <small style={{ color: '#7f8c8d' }}>(e.g., 45000)</small></label>
                  <input
                    type="number"
                    value={newTeacher.salary}
                    onChange={(e) => setNewTeacher({...newTeacher, salary: e.target.value})}
                    placeholder="45000"
                    min="0"
                    step="1000"
                  />
                </div>

                {/* Generated Information */}
                <div style={{ gridColumn: '1 / -1', marginTop: '20px', marginBottom: '20px' }}>
                  <h4 style={{ color: '#2c3e50', borderBottom: '2px solid #e8f4f8', paddingBottom: '8px' }}>
                    🔐 Auto-Generated Login Details
                  </h4>
                </div>

                <div className="form-group">
                  <label>Teacher ID (Username)</label>
                  <input
                    type="text"
                    value={newTeacher.username}
                    readOnly
                    style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
                    placeholder="Will be auto-generated"
                  />
                  <small style={{ color: '#6c757d' }}>
                    Format: firstname + subjectcode + 080910 (e.g., amiteng080910)
                  </small>
                </div>

                <div className="form-group">
                  <label>Default Password</label>
                  <input
                    type="text"
                    value={newTeacher.password}
                    readOnly
                    style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
                  />
                  <small style={{ color: '#6c757d' }}>
                    Teacher can change this after first login
                  </small>
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddTeacher}
                disabled={!newTeacher.name || !newTeacher.email || !newTeacher.qualifiedSubjects.length}
              >
                Add Teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
