import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const AttendanceTracker = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalPeriods, setModalPeriods] = useState([]);
  const [maxPeriods, setMaxPeriods] = useState(8);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user || user.role !== 'student') {
          setError('Student session not found. Please login.');
          return;
        }

        // Use username as studentId for students
        const studentId = user.username;
        console.log('Fetching attendance for student:', studentId);
        
        // Fetch attendance and subjects data
        const [attendanceResponse, subjectsResponse] = await Promise.all([
          apiService.request(`/attendance?studentId=${studentId}`),
          apiService.getSubjects()
        ]);
        
        console.log('Attendance Response:', attendanceResponse); // Debug log
        
        if (attendanceResponse.attendance) {
          console.log('Attendance records count:', attendanceResponse.attendance.length); // Debug log
          setAttendanceData(attendanceResponse.attendance);
        }
        
        if (subjectsResponse.subjects) {
          setSubjects(subjectsResponse.subjects);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load attendance information');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Update max periods when attendance data changes
  useEffect(() => {
    if (!attendanceData || attendanceData.length === 0) return;
    const maxP = attendanceData.reduce((m, r) => {
      const p = Number(r.period) || 0;
      return Math.max(m, p);
    }, 0);
    setMaxPeriods(maxP > 0 ? maxP : 8);
  }, [attendanceData]);

  const openDayModal = (dateStr) => {
    // build per-period view for the selected date
    const records = attendanceData.filter(a => {
      // Convert UTC date to IST for comparison
      const utcDate = new Date(a.date);
      const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours for IST
      return istDate.toISOString().split('T')[0] === dateStr;
    });

    const periods = [];
    const todayStr = new Date().toISOString().split('T')[0];
    for (let p = 1; p <= maxPeriods; p++) {
      const rec = records.find(r => Number(r.period) === p);
      let status = 'not-marked';
      if (rec) status = rec.status;
      if (dateStr > todayStr && status === 'not-marked') status = 'future';

      periods.push({
        period: p,
        status,
        subjectCode: rec?.subjectCode || 'Unknown',
        subjectName: rec?.subjectName || rec?.subjectCode || 'Not set',
        markedBy: rec?.markedBy || null
      });
    }

    setModalPeriods(periods);
    setModalDate(dateStr);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalDate(null);
    setModalPeriods([]);
  };

  // Generate all attendance days for the entire academic year
  const generateAllAttendanceDays = () => {
    if (!attendanceData || attendanceData.length === 0) return [];
    
    // Get all unique dates from attendance data and sort them
    // Database now stores IST timestamps, so we can use them directly
    const uniqueDates = [...new Set(attendanceData.map(record => {
      // Database already has IST dates, extract date part directly
      return new Date(record.date).toISOString().split('T')[0];
    }))].sort();
    
    return uniqueDates.map(dateStr => {
      // Parse date as UTC to avoid timezone shifts
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Create local date object
      
      // Get all attendance records for this date
      const dayRecords = attendanceData.filter(record => {
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

  const allAttendanceDays = generateAllAttendanceDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate attendance by subject for the entire academic year
  const calculateSubjectAttendance = () => {
    const subjectStats = {};
    
    // Group attendance by subject for ALL attendance data (entire academic year)
    attendanceData.forEach(record => {
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
    
    // Convert to array with subject names and percentages
    return Object.entries(subjectStats).map(([subjectCode, stats]) => {
      const subject = subjects.find(s => s.subjectCode === subjectCode);
      // Calculate percentage based on present + late (both count as attended)
      const attended = stats.present + stats.late;
      const percentage = stats.total > 0 ? ((attended / stats.total) * 100).toFixed(1) : 0;
      
      return {
        subjectCode,
        subjectName: subject?.subjectName || subjectCode,
        total: stats.total,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        percentage: parseFloat(percentage)
      };
    }).sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
  };

  const subjectAttendance = calculateSubjectAttendance();

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

  // Calculate attendance statistics for the entire academic year (all data)
  const totalRecords = attendanceData.length;
  const presentRecords = attendanceData.filter(record => record.status === 'present').length;
  const lateRecords = attendanceData.filter(record => record.status === 'late').length;
  const absentRecords = attendanceData.filter(record => record.status === 'absent').length;
  
  // Get unique dates for day-based statistics
  const uniqueDates = [...new Set(attendanceData.map(record => {
    return new Date(record.date).toISOString().split('T')[0];
  }))];
  
  const totalDays = uniqueDates.length;
  const attendancePercentage = totalRecords > 0 ? (((presentRecords + lateRecords) / totalRecords) * 100).toFixed(1) : 0;

  return (
    <div className="content-card">
      <h2>📈 Attendance Tracker - Academic Year 2024-25</h2>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#27ae60', borderRadius: '3px' }}></div>
            <span>Present</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#f39c12', borderRadius: '3px' }}></div>
            <span>Late</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#e74c3c', borderRadius: '3px' }}></div>
            <span>Absent</span>
          </div>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '30px' }}>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{totalDays}</div>
          <div style={{ color: '#7f8c8d' }}>School Days</div>
        </div>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#d5f4e6', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{presentRecords}</div>
          <div style={{ color: '#27ae60' }}>Present</div>
        </div>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fef9e7', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>{lateRecords}</div>
          <div style={{ color: '#f39c12' }}>Late</div>
        </div>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fadbd8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{absentRecords}</div>
          <div style={{ color: '#e74c3c' }}>Absent</div>
        </div>
        <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#d6eaf8', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>{attendancePercentage}%</div>
          <div style={{ color: '#3498db' }}>Attendance</div>
        </div>
      </div>

      {/* Subject-wise Attendance Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          📊 Subject-wise Attendance (Academic Year 2024-25)
        </h3>
        {subjectAttendance.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>📚 Subject</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Total Classes</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Present</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Late</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Absent</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {subjectAttendance.map((subject) => (
                  <tr key={subject.subjectCode} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {subject.subjectName}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#7f8c8d', fontWeight: '600' }}>
                      {subject.total}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#27ae60' }}>
                      {subject.present}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#f39c12' }}>
                      {subject.late}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#e74c3c' }}>
                      {subject.absent}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        backgroundColor: subject.percentage >= 75 ? '#d5f4e6' : subject.percentage >= 60 ? '#fff3cd' : '#fadbd8',
                        color: subject.percentage >= 75 ? '#27ae60' : subject.percentage >= 60 ? '#856404' : '#721c24',
                        display: 'inline-block',
                        minWidth: '55px'
                      }}>
                        {subject.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: '#7f8c8d',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📊</div>
            <div style={{ fontSize: '16px', marginBottom: '5px' }}>No Subject-wise Data Available</div>
            <div>Attendance data will appear here once classes begin</div>
          </div>
        )}
      </div>

      {/* Monthly Calendar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
              {monthNames[selectedMonth]} {selectedYear}
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
          {dayNames.map(day => (
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
            const firstDay = new Date(selectedYear, selectedMonth, 1);
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
            const startDate = new Date(firstDay);
            
            // Adjust for Sunday start (getDay() returns 0 for Sunday, 1 for Monday, etc.)
            const dayOfWeek = firstDay.getDay();
            startDate.setDate(startDate.getDate() - dayOfWeek);
            
            const days = [];
            const currentDate = new Date(startDate);
            
            for (let i = 0; i < 42; i++) {
              // Generate date string in YYYY-MM-DD format consistently
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
                    backgroundColor: '#ffffff',
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
                  onMouseEnter={dayAttendance ? (e) => {
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.transform = 'scale(1.02)';
                  } : undefined}
                  onMouseLeave={dayAttendance ? (e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.transform = 'scale(1)';
                  } : undefined}
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

      {/* Day Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={closeModal}>
          <div className="modal" style={{ width: '520px', background: 'white', borderRadius: '8px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0 }}>Attendance for {modalDate}</h4>
              <button onClick={closeModal} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Period</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Subject</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {modalPeriods.map(p => (
                    <tr key={p.period} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{p.period}</td>
                      <td style={{ padding: '8px' }}>{p.subjectName} <small style={{ color: '#7f8c8d' }}>({p.subjectCode})</small></td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: p.status === 'present' ? '#d5f4e6' : p.status === 'absent' ? '#fadbd8' : p.status === 'future' ? '#ecf0f1' : '#fff3cd', color: '#2c3e50', fontWeight: 600 }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>{p.markedBy || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={closeModal} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
