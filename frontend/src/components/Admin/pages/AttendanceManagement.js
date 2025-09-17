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
  
  // Expansion state for students (removed - no longer needed)
  
  // Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null); // Store actual studentId
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Calendar state for summary modal
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalPeriods, setModalPeriods] = useState([]);
  const [allAttendanceForStudent, setAllAttendanceForStudent] = useState([]);
  
  // Edit state for individual attendance records in day modal
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingStatus, setEditingStatus] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
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
  }, [classId, grade, classes, selectedAcademicYear]); // Removed filter dependencies

  // Remove the old complex filter functions - no longer needed

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

  // Return all attendance records (no filtering)
  const getFilteredRecords = () => {
    return attendanceRecords;
  };

  // Group attendance records by student
  const groupAttendanceByStudent = () => {
    const grouped = {};
    const filteredRecords = getFilteredRecords();
    
    filteredRecords.forEach(record => {
      const studentKey = record.studentId;
      
      if (!grouped[studentKey]) {
        grouped[studentKey] = {
          studentId: studentKey, // Add the actual studentId to the group
          student: record.student,
          class: record.class,
          records: [],
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          attendancePercentage: 0
        };
      }
      
      grouped[studentKey].records.push(record);
      grouped[studentKey].totalRecords++;
      
      // Count attendance status
      if (record.status === 'present') {
        grouped[studentKey].presentCount++;
      } else if (record.status === 'absent') {
        grouped[studentKey].absentCount++;
      } else if (record.status === 'late') {
        grouped[studentKey].lateCount++;
      }
      
      // Calculate attendance percentage (present + late count as attended)
      const attendedCount = grouped[studentKey].presentCount + grouped[studentKey].lateCount;
      grouped[studentKey].attendancePercentage = 
        ((attendedCount / grouped[studentKey].totalRecords) * 100).toFixed(1);
    });
    
    return Object.values(grouped);
  };

  // Format attendance percentage with color coding
  const formatAttendancePercentage = (percentage) => {
    const color = percentage >= 75 ? '#27ae60' : 
                  percentage >= 50 ? '#f39c12' : '#e74c3c';
    return { color, value: `${percentage}%` };
  };

  // Generate all attendance days for the entire academic year
  const generateAllAttendanceDays = () => {
    if (!allAttendanceForStudent || allAttendanceForStudent.length === 0) return [];
    
    // Get all unique dates from attendance data and sort them
    const uniqueDates = [...new Set(allAttendanceForStudent.map(record => {
      return new Date(record.date).toISOString().split('T')[0];
    }))].sort();
    
    return uniqueDates.map(dateStr => {
      // Parse date as UTC to avoid timezone shifts
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Get all attendance records for this date
      const dayRecords = allAttendanceForStudent.filter(record => {
        return new Date(record.date).toISOString().split('T')[0] === dateStr;
      });
      
      // Determine overall status for the day
      let status = 'present';
      if (dayRecords.some(record => record.status === 'absent')) {
        status = 'absent';
      } else if (dayRecords.some(record => record.status === 'late')) {
        status = 'late';
      }
      
      return {
        date: dateStr,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        status: status,
        recordsCount: dayRecords.length,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: date.toLocaleDateString('en-US', { month: 'short' })
      };
    });
  };

  // Open day modal for attendance details
  const openDayModal = (dateStr) => {
    const dayRecords = allAttendanceForStudent.filter(record => {
      return new Date(record.date).toISOString().split('T')[0] === dateStr;
    });

    const periods = [];
    for (let p = 1; p <= 8; p++) {
      const rec = dayRecords.find(r => r.period === p);
      const status = rec ? rec.status : 'no-data';
      
      periods.push({
        period: p,
        status,
        subjectCode: rec?.subjectCode || 'Unknown',
        subjectName: rec?.subjectName || rec?.subjectCode || 'Not set',
        markedBy: rec?.markedBy || null,
        attendanceId: rec?.attendanceId || null // Include attendanceId for editing
      });
    }

    setModalPeriods(periods);
    setModalDate(dateStr);
    setModalOpen(true);
  };

  // Close day modal
  const closeDayModal = () => {
    setModalOpen(false);
    setModalDate(null);
    setModalPeriods([]);
    setEditingRecordId(null);
    setEditingStatus('');
  };

  // Handle editing individual attendance record in day modal
  const handleEditDayRecord = (period) => {
    if (period.attendanceId) {
      setEditingRecordId(period.attendanceId);
      setEditingStatus(period.status);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRecordId(null);
    setEditingStatus('');
  };

  // Save edited attendance record
  const saveEditedRecord = async (attendanceId, newStatus) => {
    setUpdateLoading(true);
    try {
      const response = await apiService.put(`attendance/${attendanceId}`, {
        status: newStatus,
        markedBy: 'Admin', // Mark as updated by admin
        updatedAt: new Date().toISOString()
      });
      
      if (response.attendance && response.message) {
        // Update the modal periods state
        setModalPeriods(prev => prev.map(period => 
          period.attendanceId === attendanceId 
            ? { ...period, status: newStatus, markedBy: 'Admin' }
            : period
        ));
        
        // Update the allAttendanceForStudent state for calendar refresh
        setAllAttendanceForStudent(prev => prev.map(record =>
          record.attendanceId === attendanceId
            ? { ...record, status: newStatus, markedBy: 'Admin' }
            : record
        ));
        
        alert('Attendance record updated successfully!');
      } else {
        alert('Failed to update attendance record');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Error updating attendance record');
    } finally {
      setUpdateLoading(false);
      setEditingRecordId(null);
      setEditingStatus('');
    }
  };

  // Handle opening summary modal
  const handleShowSummary = async (student, studentId) => {
    setSelectedStudentForSummary(student);
    setSelectedStudentId(studentId); // Store the actual studentId
    setShowSummaryModal(true);
    setSummaryLoading(true);
    
    // Use the passed studentId or fallback to student object properties
    const actualStudentId = studentId || student?.studentId || student?.student_id;
    
    console.log('🎯 Opening summary for student:', actualStudentId, 'Student object:', student);
    
    try {
      // Fetch ALL attendance records for this student (entire academic year)
      // Remove all filters to get complete data - no limit restriction
      const response = await apiService.get(`attendance?studentId=${actualStudentId}&limit=50000`);
      
      console.log('📊 Summary fetch for student:', actualStudentId, 'Records found:', response.attendance?.length || 0);
      
      if (response.attendance && response.attendance.length > 0) {
        const studentAttendance = response.attendance;
        
        // Store attendance data for calendar generation
        setAllAttendanceForStudent(studentAttendance);
        
        // Calculate subject-wise attendance
        const subjectStats = {};
        
        studentAttendance.forEach(record => {
          const subjectCode = record.subjectCode || 'Unknown';
          if (!subjectStats[subjectCode]) {
            subjectStats[subjectCode] = {
              total: 0,
              present: 0,
              absent: 0,
              late: 0
            };
          }
          subjectStats[subjectCode].total++;
          if (record.status === 'present') {
            subjectStats[subjectCode].present++;
          } else if (record.status === 'absent') {
            subjectStats[subjectCode].absent++;
          } else if (record.status === 'late') {
            subjectStats[subjectCode].late++;
          }
        });
        
        // Convert to array with percentages
        const subjectSummary = Object.entries(subjectStats).map(([subjectCode, stats]) => {
          const attended = stats.present + stats.late;
          const percentage = stats.total > 0 ? ((attended / stats.total) * 100).toFixed(1) : 0;
          
          return {
            subjectCode,
            subjectName: subjectCode.replace(/^\d+_/, '').toUpperCase(), // Remove grade prefix
            total: stats.total,
            present: stats.present,
            absent: stats.absent,
            late: stats.late,
            percentage: parseFloat(percentage)
          };
        }).sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
        
        console.log('📈 Subject summary calculated:', subjectSummary);
        setSummaryData(subjectSummary);
      } else {
        console.log('❌ No attendance records found for student:', actualStudentId);
        setSummaryData([]);
      }
    } catch (error) {
      console.error('Error fetching student attendance summary:', error);
      setSummaryData([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Close summary modal
  const closeSummaryModal = () => {
    setShowSummaryModal(false);
    setSelectedStudentForSummary(null);
    setSelectedStudentId(null);
    setSummaryData(null);
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show attendance records for specific class */}
      {classId && (
        <div className="records-container">
          {/* Student-based Attendance Table */}
          <div className="students-table">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>CLASS</th>
                  <th>TOTAL RECORDS</th>
                  <th>PRESENT</th>
                  <th>ABSENT</th>
                  <th>LATE</th>
                  <th>ATTENDANCE %</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {groupAttendanceByStudent().map((studentGroup, index) => {
                  const studentId = studentGroup.studentId; // Use the studentId from the group
                  const percentageData = formatAttendancePercentage(studentGroup.attendancePercentage);
                  
                  return (
                    <tr key={studentId}>
                      <td><strong>{studentGroup.student?.name || 'N/A'}</strong></td>
                      <td><strong>{studentGroup.class ? `${studentGroup.class.className} ${studentGroup.class.section}` : 'N/A'}</strong></td>
                      <td><strong>{studentGroup.totalRecords}</strong></td>
                      <td><strong style={{ color: '#27ae60' }}>{studentGroup.presentCount}</strong></td>
                      <td><strong style={{ color: '#e74c3c' }}>{studentGroup.absentCount}</strong></td>
                      <td><strong style={{ color: '#f39c12' }}>{studentGroup.lateCount}</strong></td>
                      <td>
                        <strong style={{ color: percentageData.color }}>
                          {percentageData.value}
                        </strong>
                      </td>
                      <td>
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleShowSummary(studentGroup.student, studentId)}
                        >
                          Summary
                        </button>
                      </td>
                    </tr>
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

      {/* Add styling for the new structure */}
      <style jsx>{`
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
        
        .attendance-detail-row {
          background-color: #ffffff;
        }
        
        .attendance-detail-row:hover {
          background-color: #f1f3f4;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .status-badge.present {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .status-badge.absent {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .status-badge.late {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
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
        
        .btn-success {
          background-color: #28a745;
          color: white;
        }
        
        .btn-success:hover {
          background-color: #218838;
        }
        
        /* Class grid styles */
        .classes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .class-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: 1px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .class-card.clickable {
          cursor: pointer;
        }
        
        .class-card.clickable:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }
        
        .class-card.deactivated {
          background-color: #f8f9fa;
          border-color: #dc3545;
          opacity: 0.8;
        }
        
        .class-header {
          margin-bottom: 15px;
          display: flex;
          flex-direction: column;
        }
        
        .class-header h4 {
          margin: 0 0 5px 0;
          color: #2c3e50;
          font-size: 1.2em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .deactivated-badge {
          background-color: #dc3545;
          color: white;
          font-size: 0.7em;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .class-details p {
          margin: 5px 0;
          color: #6c757d;
          font-size: 0.9em;
        }
        
        .inactive-notice {
          color: #dc3545 !important;
          font-weight: 500 !important;
          font-size: 0.85em !important;
          margin-top: 10px !important;
        }
      `}</style>

      {/* Summary Modal */}
      {showSummaryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '1200px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #dee2e6',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>
                📊 Subject-wise Attendance Summary
              </h3>
              <button
                onClick={closeSummaryModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            {/* Student Info */}
            {selectedStudentForSummary && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>
                  {selectedStudentForSummary.name || 'Unknown Student'}
                </h4>
                <p style={{ margin: 0, color: '#6c757d' }}>
                  Student ID: {selectedStudentId || selectedStudentForSummary.studentId || 'N/A'}
                </p>
              </div>
            )}

            {/* Loading State */}
            {summaryLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                Loading attendance summary...
              </div>
            )}

            {/* Summary Content */}
            {!summaryLoading && summaryData && (
              <>
                {/* Overall Statistics Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px',
                  marginBottom: '30px'
                }}>
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#d5f4e6', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                      {allAttendanceForStudent.filter(r => r.status === 'present').length}
                    </div>
                    <div style={{ color: '#27ae60' }}>Present</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fef9e7', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
                      {allAttendanceForStudent.filter(r => r.status === 'late').length}
                    </div>
                    <div style={{ color: '#f39c12' }}>Late</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fadbd8', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
                      {allAttendanceForStudent.filter(r => r.status === 'absent').length}
                    </div>
                    <div style={{ color: '#e74c3c' }}>Absent</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#d6eaf8', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                      {allAttendanceForStudent.length > 0 ? 
                        (((allAttendanceForStudent.filter(r => r.status === 'present' || r.status === 'late').length / allAttendanceForStudent.length) * 100).toFixed(1)) : 0}%
                    </div>
                    <div style={{ color: '#3498db' }}>Attendance</div>
                  </div>
                </div>

                {/* Subject-wise Attendance Table */}
                {summaryData.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.9rem'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                            📚 Subject
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                            Total Classes
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                            Present
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                            Late
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                            Absent
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>
                            Attendance %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryData.map((subject, index) => (
                          <tr key={subject.subjectCode} style={{
                            borderBottom: '1px solid #dee2e6',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                          }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>
                              {subject.subjectName}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#6c757d', fontWeight: '600' }}>
                              {subject.total}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#28a745', fontWeight: '600' }}>
                              {subject.present}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#ffc107', fontWeight: '600' }}>
                              {subject.late}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#dc3545', fontWeight: '600' }}>
                              {subject.absent}
                            </td>
                            <td style={{ 
                              padding: '12px', 
                              textAlign: 'center', 
                              fontWeight: '700',
                              color: subject.percentage >= 75 ? '#28a745' : 
                                     subject.percentage >= 50 ? '#ffc107' : '#dc3545'
                            }}>
                              {subject.percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    No attendance data found for this student.
                  </div>
                )}

                {/* Monthly Calendar View */}
                <div style={{ marginTop: '30px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                    padding: '15px 0',
                    borderBottom: '2px solid #3498db'
                  }}>
                    <h3 style={{ margin: 0 }}>📅 Monthly Calendar</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedYear, selectedMonth - 1);
                          setSelectedMonth(newDate.getMonth());
                          setSelectedYear(newDate.getFullYear());
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          backgroundColor: '#fff',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        ← Previous
                      </button>
                      <span style={{ fontSize: '18px', fontWeight: '600', minWidth: '160px', textAlign: 'center' }}>
                        {['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} {selectedYear}
                      </span>
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedYear, selectedMonth + 1);
                          setSelectedMonth(newDate.getMonth());
                          setSelectedYear(newDate.getFullYear());
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          backgroundColor: '#fff',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: '2px',
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '10px',
                    border: '1px solid #dee2e6'
                  }}>
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} style={{ 
                        padding: '10px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: '#e9ecef',
                        color: '#495057',
                        fontSize: '14px'
                      }}>
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar Days */}
                    {(() => {
                      const allAttendanceDays = generateAllAttendanceDays();
                      const firstDay = new Date(selectedYear, selectedMonth, 1);
                      const startDate = new Date(firstDay);
                      const dayOfWeek = firstDay.getDay();
                      startDate.setDate(startDate.getDate() - dayOfWeek);
                      
                      const days = [];
                      const currentDate = new Date(startDate);
                      
                      for (let i = 0; i < 42; i++) {
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const day = String(currentDate.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        
                        const isCurrentMonth = currentDate.getMonth() === selectedMonth;
                        const dayAttendance = allAttendanceDays.find(day => day.date === dateStr);
                        
                        days.push(
                          <div
                            key={i}
                            style={{
                              minHeight: '60px',
                              padding: '8px',
                              backgroundColor: dayAttendance ? 
                                (dayAttendance.status === 'present' ? '#d5f4e6' :
                                 dayAttendance.status === 'late' ? '#fef9e7' :
                                 dayAttendance.status === 'absent' ? '#fadbd8' : '#ffffff') : '#ffffff',
                              border: '1px solid #dee2e6',
                              borderRadius: '4px',
                              cursor: dayAttendance ? 'pointer' : 'default',
                              position: 'relative',
                              opacity: isCurrentMonth ? 1 : 0.3,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={dayAttendance ? () => openDayModal(dateStr) : undefined}
                          >
                            <div style={{ 
                              fontWeight: isCurrentMonth ? '600' : '400',
                              fontSize: '16px',
                              color: isCurrentMonth ? '#2c3e50' : '#bdc3c7',
                              marginBottom: dayAttendance ? '4px' : '0'
                            }}>
                              {currentDate.getDate()}
                            </div>
                            
                            {dayAttendance && dayAttendance.recordsCount > 0 && (
                              <div style={{
                                fontSize: '11px',
                                color: '#7f8c8d',
                                textAlign: 'center'
                              }}>
                                {dayAttendance.recordsCount} periods
                              </div>
                            )}
                          </div>
                        );
                        
                        currentDate.setDate(currentDate.getDate() + 1);
                      }
                      
                      return days;
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div style={{
              marginTop: '20px',
              textAlign: 'right',
              borderTop: '1px solid #dee2e6',
              paddingTop: '15px'
            }}>
              <button
                onClick={closeSummaryModal}
                className="btn btn-secondary"
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Modal for attendance details */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200
        }} onClick={closeDayModal}>
          <div style={{
            width: '700px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '25px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h4 style={{ margin: 0 }}>Attendance for {modalDate}</h4>
              <button
                onClick={closeDayModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Period</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Subject</th>
                    <th style={{ textAlign: 'center', padding: '12px', fontWeight: '600' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Marked By</th>
                    <th style={{ textAlign: 'center', padding: '12px', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modalPeriods.map(p => (
                    <tr key={p.period} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{p.period}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{p.subjectName}</div>
                        <small style={{ color: '#7f8c8d' }}>({p.subjectCode})</small>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {editingRecordId === p.attendanceId ? (
                          <select
                            value={editingStatus}
                            onChange={(e) => setEditingStatus(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                              fontSize: '12px'
                            }}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            backgroundColor: p.status === 'present' ? '#d5f4e6' : 
                                             p.status === 'absent' ? '#fadbd8' : 
                                             p.status === 'late' ? '#fff3cd' : '#ecf0f1',
                            color: '#2c3e50',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}>
                            {p.status === 'no-data' ? 'No Record' : p.status}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '14px' }}>{p.markedBy || '-'}</div>
                        {p.markedBy === 'Admin' && (
                          <small style={{ color: '#3498db', fontSize: '11px' }}>✓ Updated by Admin</small>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {p.attendanceId ? (
                          editingRecordId === p.attendanceId ? (
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                              <button
                                onClick={() => saveEditedRecord(p.attendanceId, editingStatus)}
                                disabled={updateLoading}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: updateLoading ? 'not-allowed' : 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                {updateLoading ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={updateLoading}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditDayRecord(p)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              Edit
                            </button>
                          )
                        ) : (
                          <span style={{ color: '#999', fontSize: '11px' }}>No Record</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
