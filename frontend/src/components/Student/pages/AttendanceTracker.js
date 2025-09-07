import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const AttendanceTracker = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.student) {
          setError('Student data not found');
          return;
        }

        const studentId = currentUser.student.id;
        const response = await apiService.getStudentAttendance(studentId);
        
        if (response.attendance) {
          setAttendanceData(response.attendance);
        } else {
          setError('Failed to fetch attendance data');
        }
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        setError('Failed to load attendance information');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, []);

  // Generate calendar days for the selected month
  const generateCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendanceRecord = attendanceData.find(a => {
        const recordDate = new Date(a.date).toISOString().split('T')[0];
        return recordDate === dateStr;
      });
      
      days.push({
        day,
        date: dateStr,
        status: attendanceRecord ? attendanceRecord.status : 'future'
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  // Calculate attendance statistics
  const totalDays = calendarDays.filter(day => day && day.status !== 'future').length;
  const presentDays = calendarDays.filter(day => day && day.status === 'present').length;
  const absentDays = calendarDays.filter(day => day && day.status === 'absent').length;
  const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

  return (
    <div className="content-card">
      <h2>Attendance Tracker</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{ marginRight: '10px', padding: '5px' }}
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{ padding: '5px' }}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#27ae60', borderRadius: '3px' }}></div>
            <span>Present</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#e74c3c', borderRadius: '3px' }}></div>
            <span>Absent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#ecf0f1', borderRadius: '3px' }}></div>
            <span>Future</span>
          </div>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{totalDays}</div>
          <div style={{ color: '#7f8c8d' }}>Total Days</div>
        </div>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#d5f4e6', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{presentDays}</div>
          <div style={{ color: '#27ae60' }}>Present</div>
        </div>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fadbd8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{absentDays}</div>
          <div style={{ color: '#e74c3c' }}>Absent</div>
        </div>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#d6eaf8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>{attendancePercentage}%</div>
          <div style={{ color: '#3498db' }}>Attendance</div>
        </div>
      </div>

      {/* Calendar */}
      <div>
        <h3 style={{ marginBottom: '15px' }}>{monthNames[selectedMonth]} {selectedYear}</h3>
        
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '10px' }}>
          {dayNames.map(day => (
            <div key={day} style={{ 
              textAlign: 'center', 
              fontWeight: 'bold', 
              padding: '10px',
              backgroundColor: '#34495e',
              color: 'white',
              borderRadius: '4px'
            }}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="attendance-calendar">
          {calendarDays.map((day, index) => (
            <div 
              key={index} 
              className={`calendar-day ${day ? day.status : ''}`}
              style={{ 
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {day ? day.day : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;
