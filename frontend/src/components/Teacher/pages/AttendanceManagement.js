import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const AttendanceManagement = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesResponse, attendanceResponse] = await Promise.all([
          apiService.getClasses(),
          apiService.getAttendance()
        ]);

        if (classesResponse.classes) {
          setClasses(classesResponse.classes);
          if (classesResponse.classes.length > 0) {
            setSelectedClass(classesResponse.classes[0].classId);
          }
        }

        if (attendanceResponse.attendance) {
          setAttendanceData(attendanceResponse.attendance);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatusToggle = async (attendanceId) => {
    try {
      const attendance = attendanceData.find(a => a.id === attendanceId);
      const newStatus = attendance.status === 'present' ? 'absent' : 'present';
      
      const response = await apiService.updateAttendance(attendanceId, { status: newStatus });
      
      if (response.success) {
        setAttendanceData(prev => prev.map(rec => rec.id === attendanceId ? {
          ...rec,
          status: newStatus
        } : rec));
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance');
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

  const classAttendance = attendanceData.filter(a => a.classId === selectedClass);

  return (
    <div className="content-card">
      <h2>Attendance Management</h2>
      
      <div style={{ marginBottom: '20px' }}>
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

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Period</th>
            <th>Student</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {classAttendance.map(rec => (
            <tr key={rec.id}>
              <td>{new Date(rec.date).toLocaleDateString()}</td>
              <td>{rec.period}</td>
              <td>{rec.student?.name || 'N/A'}</td>
              <td style={{ color: rec.status === 'present' ? '#27ae60' : '#e74c3c' }}>
                {rec.status.toUpperCase()}
              </td>
              <td>
                <button 
                  className="btn btn-warning" 
                  onClick={() => handleStatusToggle(rec.id)}
                >
                  Toggle Status
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceManagement;
