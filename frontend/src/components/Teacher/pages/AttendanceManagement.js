import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const AttendanceManagement = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Get current teacher from localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const teacher = currentUser.teacher;
        
        if (!teacher || !teacher.classesAssigned || teacher.classesAssigned.length === 0) {
          setError('Teacher classes not found. Please login again.');
          return;
        }
        
        // Filter classes to only those assigned to the teacher
        const allClassesResponse = await apiService.getClasses();
        const teacherClasses = allClassesResponse.classes.filter(cls => 
          teacher.classesAssigned.includes(cls.classId.toString())
        );
        setClasses(teacherClasses);
        
        if (teacherClasses.length > 0 && !selectedClass) {
          setSelectedClass(teacherClasses[0].classId);
        }
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch students and attendance when class/date changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchClassData = async () => {
      try {
        setLoading(true);
        
        // Get current teacher
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const teacher = currentUser.teacher;
        
        if (!teacher) {
          setError('Teacher information not found. Please login again.');
          return;
        }
        
        // Fetch students for the selected class
        const studentsResponse = await apiService.request(`/students?classId=${selectedClass}`);
        setStudents(studentsResponse.students || []);
        
        // Fetch attendance for the selected class, date, and marked by this teacher
        const attendanceResponse = await apiService.request(
          `/attendance?classId=${selectedClass}&startDate=${selectedDate}&endDate=${selectedDate}&teacherId=${teacher.teacherId}`
        );
        
        console.log('Attendance API response:', attendanceResponse);
        
        // Use all attendance for the selected date (no period filtering needed)
        setAttendanceData(attendanceResponse.attendance || []);
        
      } catch (error) {
        console.error('Error fetching class data:', error);
        setError('Failed to load class data');
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [selectedClass, selectedDate]);

  const handleStatusToggle = async (attendanceId) => {
    try {
      const attendance = attendanceData.find(a => a.attendanceId === attendanceId);
      const newStatus = attendance.status === 'present' ? 'absent' : 'present';
      
      const response = await apiService.updateAttendance(attendanceId, { status: newStatus });
      
      if (response.success) {
        setAttendanceData(prev => prev.map(rec => rec.attendanceId === attendanceId ? {
          ...rec,
          status: newStatus
        } : rec));
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance');
    }
  };

  const markAttendanceForAll = async () => {
    // Ask teacher which period to mark attendance for
    const period = prompt('Which period would you like to mark attendance for? (1-8)');
    const periodNum = parseInt(period);
    
    if (!period || isNaN(periodNum) || periodNum < 1 || periodNum > 8) {
      alert('Please enter a valid period number (1-8)');
      return;
    }

    try {
      setSaving(true);
      
      // Get current teacher
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const teacher = currentUser.teacher;
      
      // Mark attendance for all students
      const attendancePromises = students.map(student => 
        apiService.addAttendance({
          studentId: student.studentId,
          classId: selectedClass,
          date: selectedDate,
          period: periodNum,
          status: 'present', // Default to present
          markedBy: teacher.teacherId
        })
      );
      
      await Promise.all(attendancePromises);
      
      // Refresh attendance data
      const attendanceResponse = await apiService.request(
        `/attendance?classId=${selectedClass}&startDate=${selectedDate}&endDate=${selectedDate}&teacherId=${teacher.teacherId}`
      );
      
      setAttendanceData(attendanceResponse.attendance || []);
      
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading attendance data...
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
      <h2>Attendance Management</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="classSelect" style={{ marginRight: '10px' }}>Select Class:</label>
          <select 
            id="classSelect" 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(parseInt(e.target.value))}
          >
            {classes.map(cls => (
              <option key={cls.classId} value={cls.classId}>
                {cls.className} {cls.section}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="dateSelect" style={{ marginRight: '10px' }}>Select Date:</label>
          <input
            type="date"
            id="dateSelect"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {attendanceData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <p>No attendance marked for {selectedDate}</p>
          <button 
            className="btn btn-primary" 
            onClick={markAttendanceForAll}
            disabled={saving || students.length === 0}
          >
            {saving ? 'Marking Attendance...' : `Mark Attendance for ${students.length} Students`}
          </button>
        </div>
      ) : (
        <div>
          <h3>Attendance for {selectedDate}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Period</th>
                <th>Schedule ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map(rec => (
                <tr key={rec.attendanceId}>
                  <td>{rec.studentId}</td>
                  <td>{rec.student?.name || 'N/A'}</td>
                  <td>Period {rec.period}</td>
                  <td>{rec.scheduleId || 'N/A'}</td>
                  <td style={{ color: rec.status === 'present' ? '#27ae60' : '#e74c3c' }}>
                    {rec.status.toUpperCase()}
                  </td>
                  <td>
                    <button 
                      className="btn btn-warning" 
                      onClick={() => handleStatusToggle(rec.attendanceId)}
                    >
                      Toggle Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
