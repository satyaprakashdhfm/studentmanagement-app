import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import './MarksManagement.css';

const MarksManagement = () => {
  const { classId, grade } = useParams();
  const navigate = useNavigate();
  const [marks, setMarks] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState({});
  
  // Expansion state for students
  const [expandedStudents, setExpandedStudents] = useState({});
  
  // Filter states for performance
  const [selectedSubject, setSelectedSubject] = useState(''); // Subject filter for better performance
  const [selectedExamType, setSelectedExamType] = useState(''); // Exam type filter
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false); // Loading state for filter changes
  
  const [newRecord, setNewRecord] = useState({
    studentId: '',
    subjectCode: '',
    classId: '',
    marksObtained: '',
    maxMarks: '',
    grade: '',
    examinationType: 'unit_test'
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

        // Fetch marks records only if classId is provided (never fetch all marks)
        if (classId && !grade) {
          setFiltersLoading(true);
          const selectedClass = filteredByYear.find(cls => cls.classId === parseInt(classId));
          if (selectedClass) {
            setSelectedClass(selectedClass);
            
            // Build query parameters with filters for performance
            const params = new URLSearchParams({
              classId: classId,
              limit: '500' // Reduced limit for better performance
            });

            // Apply subject filter for better performance
            if (selectedSubject) {
              params.append('subjectCode', selectedSubject);
            }

            // Apply exam type filter if selected
            if (selectedExamType) {
              params.append('examinationType', selectedExamType);
            }

            console.log('🔍 Fetching marks with filters:', {
              classId,
              subject: selectedSubject || 'All',
              examType: selectedExamType || 'Any'
            });

            try {
              const response = await apiService.get(`marks?${params.toString()}`);
              if (response.marks) {
                setMarks(response.marks);
                
                // Extract unique exam types from the fetched marks
                const uniqueExamTypes = [...new Set(response.marks.map(mark => mark.examinationType).filter(Boolean))];
                setAvailableExamTypes(uniqueExamTypes.sort());
                
                console.log(`📊 Loaded ${response.marks.length} marks records`);
              } else {
                setError(response.message || 'Failed to fetch marks records');
              }
            } catch (error) {
              console.error('Error fetching marks:', error);
              setError('Failed to load marks data');
            } finally {
              setFiltersLoading(false);
            }
          }
        } else if (grade) {
          // If grade is provided, filter classes for that grade
          const classesForGrade = filteredByYear.filter(cls => cls.className === grade);
          setFilteredClasses(classesForGrade);
        } else {
          // No class selected - clear data
          setMarks([]);
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
  }, [classId, grade, classes, selectedAcademicYear, selectedSubject, selectedExamType]); // Re-fetch when filters change

  // Toggle record details expansion
  const toggleRecordExpansion = (recordId) => {
    setExpandedRecords(prev => ({
      ...prev,
      [String(recordId)]: !prev[String(recordId)]
    }));
  };

  const handleEditRecord = (record) => {
    setSelectedRecord(record);
    setEditMode(true);
    setShowRecordModal(true);
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('Are you sure you want to delete this marks record?')) {
      try {
        const response = await apiService.deleteMarks(recordId);
        if (response.success) {
          setMarks(prev => prev.filter(record => record.marksId !== recordId));
        } else {
          setError('Failed to delete marks record');
        }
      } catch (error) {
        console.error('Error deleting marks record:', error);
        setError('Failed to delete marks record');
      }
    }
  };

  const handleAddRecord = () => {
    setNewRecord({
      studentId: '',
      subjectCode: '',
      classId: classId || '',
      marksObtained: '',
      maxMarks: '',
      grade: '',
      examinationType: 'unit_test'
    });
    setEditMode(false);
    setShowAddModal(true);
  };

  const handleSaveRecord = async () => {
    try {
      const recordData = editMode ? selectedRecord : newRecord;
      const response = editMode
        ? await apiService.updateMarks(selectedRecord.marksId, recordData)
        : await apiService.addMarks(recordData);

      if (response.mark && response.message) {
        if (editMode) {
          setMarks(prev => prev.map(record =>
            record.marksId === selectedRecord.marksId ? response.mark : record
          ));
        } else {
          setMarks(prev => [...prev, response.mark]);
        }
        setShowRecordModal(false);
        setShowAddModal(false);
        setSelectedRecord(null);
      } else {
        setError('Failed to save marks record');
      }
    } catch (error) {
      console.error('Error saving marks record:', error);
      setError('Failed to save marks record');
    }
  };

  const handleClassClick = (classId) => {
    navigate(`/admin/marks/class/${classId}`);
  };

  const handleBackToGrade = () => {
    navigate(`/admin/marks/grade/${grade}`);
  };

  const handleBackToSummary = () => {
    navigate('/admin/marks');
  };

  // Group marks by student
  const groupMarksByStudent = () => {
    const grouped = {};
    
    marks.forEach(record => {
      const studentKey = record.studentId;
      
      if (!grouped[studentKey]) {
        grouped[studentKey] = {
          student: record.student,
          class: record.class,
          records: [],
          totalRecords: 0,
          totalMarks: 0,
          totalMaxMarks: 0,
          averagePercentage: 0,
          subjectsCount: 0
        };
      }
      
      grouped[studentKey].records.push(record);
      grouped[studentKey].totalRecords++;
      grouped[studentKey].totalMarks += parseFloat(record.marksObtained || 0);
      grouped[studentKey].totalMaxMarks += parseFloat(record.maxMarks || 0);
      
      // Calculate average percentage
      if (grouped[studentKey].totalMaxMarks > 0) {
        grouped[studentKey].averagePercentage = 
          ((grouped[studentKey].totalMarks / grouped[studentKey].totalMaxMarks) * 100).toFixed(1);
      }
      
      // Count unique subjects
      const uniqueSubjects = [...new Set(grouped[studentKey].records.map(r => r.subjectCode))];
      grouped[studentKey].subjectsCount = uniqueSubjects.length;
    });
    
    return Object.values(grouped);
  };

  // Toggle student expansion
  const toggleStudentExpansion = (studentId) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Format percentage with color coding
  const formatPercentage = (percentage) => {
    const color = percentage >= 75 ? '#27ae60' : 
                  percentage >= 50 ? '#f39c12' : '#e74c3c';
    return { color, value: `${percentage}%` };
  };

  if (loading) {
    return (
      <div className="content-area">
        <div className="loading-container">
          <p>Loading marks records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-area">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="header-navigation">
          {grade && !classId && (
            <button className="back-button" onClick={handleBackToSummary}>
              ← Back to Summary
            </button>
          )}
          {classId && (
            <button className="back-button" onClick={handleBackToGrade}>
              ← Back to Grade {grade}
            </button>
          )}
        </div>
        <h2>
          {classId ? `Marks - Class ${selectedClass?.className}${selectedClass?.section}` :
           grade ? `Marks - Grade ${grade}` :
           'Marks Management'}
        </h2>
        <p>Academic Year: {selectedAcademicYear}</p>
      </div>

      <div className="action-buttons">
        <button className="add-button" onClick={handleAddRecord}>
          Add Marks Record
        </button>
      </div>

      {/* Show classes for grade */}
      {grade && !classId && (
        <div className="classes-grid">
          {filteredClasses.map(cls => (
            <div
              key={cls.classId}
              className={`class-card clickable ${!cls.active ? 'deactivated' : ''}`}
              onClick={() => handleClassClick(cls.classId)}
            >
              <div className="class-header">
                <h4>
                  Class {cls.className}{cls.section}
                  {!cls.active && <span className="deactivated-badge">DEACTIVATED</span>}
                </h4>
              </div>
              <div className="class-details">
                <p>Academic Year: {cls.academicYear}</p>
                <p>Max Students: {cls.maxStudents || 'N/A'}</p>
                {!cls.active && (
                  <p className="inactive-notice">⚠️ This class is deactivated but marks are still viewable</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show marks records for specific class */}
      {classId && (
        <div className="records-container">
          <div className="class-info">
            <h3>Class {selectedClass?.className}{selectedClass?.section} - {selectedClass?.academicYear}</h3>
          </div>

          {/* Filters Section */}
          <div className="filters-section">
            <div className="filters-header">
              <h4>Filters</h4>
              <button className="add-button" onClick={handleAddRecord}>
                Add Marks Record
              </button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label>Subject:</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="">All Subjects</option>
                  <option value={`${selectedClass?.className}_ENG`}>English</option>
                  <option value={`${selectedClass?.className}_HIN`}>Hindi</option>
                  <option value={`${selectedClass?.className}_MATH`}>Mathematics</option>
                  <option value={`${selectedClass?.className}_SCI`}>Science</option>
                  <option value={`${selectedClass?.className}_SOC`}>Social Studies</option>
                  <option value={`${selectedClass?.className}_TEL`}>Telugu</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Exam Type:</label>
                <select 
                  value={selectedExamType} 
                  onChange={(e) => setSelectedExamType(e.target.value)}
                >
                  <option value="">All Types</option>
                  {availableExamTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setSelectedSubject(''); // Reset to all subjects
                    setSelectedExamType('');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          <div className="students-table">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>CLASS</th>
                  <th>TOTAL RECORDS</th>
                  <th>TOTAL MARKS</th>
                  <th>MAX MARKS</th>
                  <th>AVERAGE %</th>
                  <th>SUBJECTS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {groupMarksByStudent().map((studentGroup, index) => {
                  const studentId = studentGroup.student?.studentId || `student_${index}`;
                  const isExpanded = expandedStudents[studentId];
                  const percentageData = formatPercentage(studentGroup.averagePercentage);
                  
                  return (
                    <React.Fragment key={studentId}>
                      {/* Student Summary Row */}
                      <tr className="student-summary-row">
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '8px' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <strong>{studentGroup.student?.name || 'N/A'}</strong>
                          </div>
                        </td>
                        <td><strong>{studentGroup.class ? `${studentGroup.class.className} ${studentGroup.class.section}` : 'N/A'}</strong></td>
                        <td><strong>{studentGroup.totalRecords}</strong></td>
                        <td><strong>{studentGroup.totalMarks}</strong></td>
                        <td><strong>{studentGroup.totalMaxMarks}</strong></td>
                        <td>
                          <strong style={{ color: percentageData.color }}>
                            {percentageData.value}
                          </strong>
                        </td>
                        <td><strong>{studentGroup.subjectsCount}</strong></td>
                        <td>
                          <button 
                            className="btn btn-info btn-sm" 
                            onClick={() => toggleStudentExpansion(studentId)}
                          >
                            {isExpanded ? 'Collapse' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Individual Marks Records (shown when expanded) */}
                      {isExpanded && studentGroup.records.map(record => (
                        <tr key={record.marksId} className="marks-detail-row">
                          <td style={{ paddingLeft: '30px' }}>
                            {record.subjectCode}
                          </td>
                          <td>{record.examinationType || 'N/A'}</td>
                          <td>
                            <strong>{record.marksObtained}</strong>/{record.maxMarks || 100}
                          </td>
                          <td>
                            {((record.marksObtained / (record.maxMarks || 100)) * 100).toFixed(1)}%
                          </td>
                          <td>
                            <span className={`grade-badge ${record.grade?.toLowerCase()}`}>
                              {record.grade || 'N/A'}
                            </span>
                          </td>
                          <td>-</td>
                          <td>
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleEditRecord(record)}
                              style={{ marginRight: '5px' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteRecord(record.marksId)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals for Add/Edit */}
      {(showAddModal || showRecordModal) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editMode ? 'Edit Marks Record' : 'Add Marks Record'}</h3>
              <button
                className="close-button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowRecordModal(false);
                  setSelectedRecord(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form className="record-form">
                <div className="form-group">
                  <label>Student ID:</label>
                  <input
                    type="text"
                    value={editMode ? selectedRecord?.studentId : newRecord.studentId}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, studentId: e.target.value});
                      } else {
                        setNewRecord({...newRecord, studentId: e.target.value});
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject Code:</label>
                  <input
                    type="text"
                    value={editMode ? selectedRecord?.subjectCode : newRecord.subjectCode}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, subjectCode: e.target.value});
                      } else {
                        setNewRecord({...newRecord, subjectCode: e.target.value});
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Marks Obtained:</label>
                  <input
                    type="number"
                    value={editMode ? selectedRecord?.marksObtained : newRecord.marksObtained}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, marksObtained: e.target.value});
                      } else {
                        setNewRecord({...newRecord, marksObtained: e.target.value});
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Marks:</label>
                  <input
                    type="number"
                    value={editMode ? selectedRecord?.maxMarks : newRecord.maxMarks}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, maxMarks: e.target.value});
                      } else {
                        setNewRecord({...newRecord, maxMarks: e.target.value});
                      }
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Grade:</label>
                  <select
                    value={editMode ? selectedRecord?.grade : newRecord.grade}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, grade: e.target.value});
                      } else {
                        setNewRecord({...newRecord, grade: e.target.value});
                      }
                    }}
                  >
                    <option value="">Select Grade</option>
                    <option value="A+">A+</option>
                    <option value="A">A</option>
                    <option value="B+">B+</option>
                    <option value="B">B</option>
                    <option value="C+">C+</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Examination Type:</label>
                  <select
                    value={editMode ? selectedRecord?.examinationType : newRecord.examinationType}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, examinationType: e.target.value});
                      } else {
                        setNewRecord({...newRecord, examinationType: e.target.value});
                      }
                    }}
                  >
                    <option value="unit_test">Unit Test</option>
                    <option value="mid_term">Mid Term</option>
                    <option value="final_exam">Final Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => {
                setShowAddModal(false);
                setShowRecordModal(false);
                setSelectedRecord(null);
              }}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSaveRecord}>
                {editMode ? 'Update' : 'Add'} Record
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .classes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .class-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          background: white;
          transition: all 0.3s ease;
        }
        .class-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .class-card.deactivated {
          background-color: #f8f9fa;
          border: 2px dashed #dc3545;
          opacity: 0.8;
        }
        .class-card.deactivated:hover {
          transform: none;
          box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
        }
        .class-header h4 {
          margin: 0 0 8px 0;
          color: #2c3e50;
        }
        .class-card.deactivated .class-header h4 {
          color: #dc3545;
        }
        .deactivated-badge {
          font-size: 0.7em;
          background: #dc3545;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: 8px;
        }
        .inactive-notice {
          color: #dc3545;
          font-size: 0.85em;
          font-style: italic;
          margin-top: 8px;
        }
        .student-count {
          font-size: 0.9em;
          color: #7f8c8d;
        }
        .class-details p {
          margin: 4px 0;
          font-size: 0.9em;
          color: #7f8c8d;
        }
        
        /* New student table styles */
        .students-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-top: 20px;
        }
        
        .table {
          width: 100%;
          margin-bottom: 0;
        }
        
        .table thead th {
          background-color: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.875rem;
          padding: 12px 8px;
        }
        
        .student-summary-row {
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
        }
        
        .student-summary-row:hover {
          background-color: #e9ecef;
        }
        
        .marks-detail-row {
          background-color: #ffffff;
        }
        
        .marks-detail-row:hover {
          background-color: #f1f3f4;
        }
        
        .grade-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .grade-badge.a {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .grade-badge.b {
          background-color: #cce7ff;
          color: #004085;
          border: 1px solid #b8daff;
        }
        
        .grade-badge.c {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        .grade-badge.d, .grade-badge.f {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          text-align: center;
        }
        
        .btn-sm {
          padding: 4px 8px;
          font-size: 0.75rem;
        }
        
        .btn-info {
          background-color: #17a2b8;
          color: white;
        }
        
        .btn-info:hover {
          background-color: #138496;
        }
        
        .btn-warning {
          background-color: #ffc107;
          color: #212529;
        }
        
        .btn-warning:hover {
          background-color: #e0a800;
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        
        .btn-danger:hover {
          background-color: #c82333;
        }
      `}</style>
    </div>
  );
};

export default MarksManagement;
