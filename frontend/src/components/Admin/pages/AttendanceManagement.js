import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import './AttendanceManagement.css';

const AttendanceManagement = () => {
  const { classId, grade } = useParams();
  const navigate = useNavigate();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
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
  
  const [newRecord, setNewRecord] = useState({
    studentId: '',
    classId: '',
    date: '',
    period: 1,
    status: 'present',
    markedBy: ''
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

        // Fetch attendance records
        const response = classId && !grade
          ? await apiService.getAttendanceByClass(classId)
          : await apiService.getAttendance();

        if (response && response.attendance) {
          setAttendanceRecords(response.attendance);
        } else if (response && Array.isArray(response)) {
          setAttendanceRecords(response);
        } else {
          setError(response?.message || 'Failed to fetch attendance records');
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
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        const response = await apiService.deleteAttendance(recordId);
        if (response.success) {
          setAttendanceRecords(prev => prev.filter(record => record.attendanceId !== recordId));
        } else {
          setError('Failed to delete attendance record');
        }
      } catch (error) {
        console.error('Error deleting attendance record:', error);
        setError('Failed to delete attendance record');
      }
    }
  };

  const handleAddRecord = () => {
    setNewRecord({
      studentId: '',
      classId: classId || '',
      date: new Date().toISOString().split('T')[0],
      period: 1,
      status: 'present',
      markedBy: ''
    });
    setEditMode(false);
    setShowAddModal(true);
  };

  const handleSaveRecord = async () => {
    try {
      const recordData = editMode ? selectedRecord : newRecord;
      const response = editMode
        ? await apiService.updateAttendance(selectedRecord.attendanceId, recordData)
        : await apiService.addAttendance(recordData);

      if (response.success) {
        if (editMode) {
          setAttendanceRecords(prev => prev.map(record =>
            record.attendanceId === selectedRecord.attendanceId ? response.data : record
          ));
        } else {
          setAttendanceRecords(prev => [...prev, response.data]);
        }
        setShowRecordModal(false);
        setShowAddModal(false);
        setSelectedRecord(null);
      } else {
        setError('Failed to save attendance record');
      }
    } catch (error) {
      console.error('Error saving attendance record:', error);
      setError('Failed to save attendance record');
    }
  };

  const handleClassClick = (classId) => {
    navigate(`/admin/attendance/class/${classId}`);
  };

  const handleBackToGrade = () => {
    navigate(`/admin/attendance/grade/${grade}`);
  };

  const handleBackToSummary = () => {
    navigate('/admin/attendance');
  };

  if (loading) {
    return (
      <div className="content-area">
        <div className="loading-container">
          <p>Loading attendance records...</p>
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
          {classId ? `Attendance - Class ${selectedClass?.className}${selectedClass?.section}` :
           grade ? `Attendance - Grade ${grade}` :
           'Attendance Management'}
        </h2>
        <p>Academic Year: {selectedAcademicYear}</p>
      </div>

      <div className="action-buttons">
        <button className="add-button" onClick={handleAddRecord}>
          Add Attendance Record
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
                  {attendanceRecords.filter(record => record.classId === cls.classId).length} records
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

      {/* Show attendance records for specific class */}
      {classId && (
        <div className="records-container">
          <div className="records-table">
            <div className="table-header">
              <div className="header-cell">Student ID</div>
              <div className="header-cell">Date</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Period</div>
              <div className="header-cell">Actions</div>
            </div>
            {attendanceRecords.map(record => (
              <div key={record.attendanceId} className="table-row">
                <div className="table-cell">{record.studentId}</div>
                <div className="table-cell">{new Date(record.date).toLocaleDateString()}</div>
                <div className="table-cell">
                  <span className={`status-badge ${record.status}`}>
                    {record.status}
                  </span>
                </div>
                <div className="table-cell">Period {record.period}</div>
                <div className="table-cell">
                  <button
                    className="edit-button"
                    onClick={() => handleEditRecord(record)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteRecord(record.attendanceId)}
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
              <h3>{editMode ? 'Edit Attendance Record' : 'Add Attendance Record'}</h3>
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
                  <label>Date:</label>
                  <input
                    type="date"
                    value={editMode ? selectedRecord?.date?.split('T')[0] : newRecord.date}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, date: e.target.value});
                      } else {
                        setNewRecord({...newRecord, date: e.target.value});
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status:</label>
                  <select
                    value={editMode ? selectedRecord?.status : newRecord.status}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, status: e.target.value});
                      } else {
                        setNewRecord({...newRecord, status: e.target.value});
                      }
                    }}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Period:</label>
                  <select
                    value={editMode ? selectedRecord?.period : newRecord.period}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, period: parseInt(e.target.value)});
                      } else {
                        setNewRecord({...newRecord, period: parseInt(e.target.value)});
                      }
                    }}
                  >
                    <option value={1}>Period 1</option>
                    <option value={2}>Period 2</option>
                    <option value={3}>Period 3</option>
                    <option value={4}>Period 4</option>
                    <option value={5}>Period 5</option>
                    <option value={6}>Period 6</option>
                    <option value={7}>Period 7</option>
                    <option value={8}>Period 8</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Marked By:</label>
                  <input
                    type="text"
                    value={editMode ? selectedRecord?.markedBy : newRecord.markedBy}
                    onChange={(e) => {
                      if (editMode) {
                        setSelectedRecord({...selectedRecord, markedBy: e.target.value});
                      } else {
                        setNewRecord({...newRecord, markedBy: e.target.value});
                      }
                    }}
                    placeholder="Teacher ID"
                    required
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

export default AttendanceManagement;
