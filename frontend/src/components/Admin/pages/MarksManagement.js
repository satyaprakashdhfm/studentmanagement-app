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
  const [newRecord, setNewRecord] = useState({
    studentId: '',
    subjectId: '',
    classId: '',
    examDate: '',
    marks: '',
    maxMarks: '',
    grade: '',
    remarks: ''
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

        // Fetch marks records
        const response = classId && !grade
          ? await apiService.getMarksByClass(classId)
          : await apiService.getMarks();

        if (response.marks) {
          setMarks(response.marks);
        } else {
          setError(response.message || 'Failed to fetch marks records');
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
      subjectId: '',
      classId: classId || '',
      examDate: new Date().toISOString().split('T')[0],
      marks: '',
      maxMarks: '',
      grade: '',
      remarks: ''
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

      if (response.success) {
        if (editMode) {
          setMarks(prev => prev.map(record =>
            record.marksId === selectedRecord.marksId ? response.data : record
          ));
        } else {
          setMarks(prev => [...prev, response.data]);
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
              className="class-card clickable"
              onClick={() => handleClassClick(cls.classId)}
            >
              <div className="class-header">
                <h4>Class {cls.className}{cls.section}</h4>
                <span className="student-count">
                  {marks.filter(record => record.classId === cls.classId).length} records
                </span>
              </div>
              <div className="class-details">
                <p>Academic Year: {cls.academicYear}</p>
                <p>Max Students: {cls.maxStudents || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show marks records for specific class */}
      {classId && (
        <div className="records-container">
          <div className="records-table">
            <div className="table-header">
              <div className="header-cell">Student ID</div>
              <div className="header-cell">Subject</div>
              <div className="header-cell">Marks</div>
              <div className="header-cell">Grade</div>
              <div className="header-cell">Actions</div>
            </div>
            {marks.map(record => (
              <div key={record.marksId} className="table-row">
                <div className="table-cell">{record.studentId}</div>
                <div className="table-cell">{record.subjectId}</div>
                <div className="table-cell">
                  {record.marks}/{record.maxMarks || 100}
                </div>
                <div className="table-cell">
                  <span className={`grade-badge ${record.grade?.toLowerCase()}`}>
                    {record.grade || 'N/A'}
                  </span>
                </div>
                <div className="table-cell">
                  <button
                    className="edit-button"
                    onClick={() => handleEditRecord(record)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteRecord(record.marksId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
                  <label>Subject ID:</label>
                  <input
                    type="text"
                    value={editMode ? selectedRecord?.subjectId : newRecord.subjectId}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, subjectId: e.target.value});
                      } else {
                        setNewRecord({...newRecord, subjectId: e.target.value});
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Exam Date:</label>
                  <input
                    type="date"
                    value={editMode ? selectedRecord?.examDate?.split('T')[0] : newRecord.examDate}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, examDate: e.target.value});
                      } else {
                        setNewRecord({...newRecord, examDate: e.target.value});
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Marks:</label>
                  <input
                    type="number"
                    value={editMode ? selectedRecord?.marks : newRecord.marks}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, marks: e.target.value});
                      } else {
                        setNewRecord({...newRecord, marks: e.target.value});
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
                  <label>Remarks:</label>
                  <textarea
                    value={editMode ? selectedRecord?.remarks : newRecord.remarks}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, remarks: e.target.value});
                      } else {
                        setNewRecord({...newRecord, remarks: e.target.value});
                      }
                    }}
                    rows="3"
                  />
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
    </div>
  );
};

export default MarksManagement;
