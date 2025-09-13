import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const AttendanceTracker = () => {
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
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.student) {
          setError('Student data not found');
          return;
        }

        const studentId = currentUser.student.studentId;
        
        // Fetch attendance and subjects data
        const [attendanceResponse, subjectsResponse] = await Promise.all([
          apiService.request(`/attendance?studentId=${studentId}`),
          apiService.getSubjects()
        ]);
        
        if (attendanceResponse.attendance) {
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

    fetchData();
  }, []);

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
      const recordDate = new Date(a.date).toISOString().split('T')[0];
      return recordDate === dateStr;
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

  // Calculate attendance by subject
  const calculateSubjectAttendance = () => {
    const subjectStats = {};
    
    // Group attendance by subject
    attendanceData.forEach(record => {
      const subjectCode = record.subjectCode || 'Unknown';
      if (!subjectStats[subjectCode]) {
        subjectStats[subjectCode] = {
          total: 0,
          present: 0,
          absent: 0
        };
      }
      subjectStats[subjectCode].total++;
      if (record.status === 'present') {
        subjectStats[subjectCode].present++;
      } else if (record.status === 'absent') {
        subjectStats[subjectCode].absent++;
      }
    });
    
    // Convert to array with subject names and percentages
    return Object.entries(subjectStats).map(([subjectCode, stats]) => {
      const subject = subjects.find(s => s.subjectCode === subjectCode);
      const percentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0;
      
      return {
        subjectCode,
        subjectName: subject?.subjectName || record.subjectName || subjectCode,
        total: stats.total,
        present: stats.present,
        absent: stats.absent,
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

      {/* Subject-wise Attendance Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          📊 Subject-wise Attendance
        </h3>
        {subjectAttendance.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '500px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>📚 Subject</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Total Classes</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Present</th>
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
                    <td style={{ padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                      {subject.total}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#27ae60' }}>
                      {subject.present}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#e74c3c' }}>
                      {subject.absent}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: subject.percentage >= 75 ? '#d5f4e6' : subject.percentage >= 60 ? '#fff3cd' : '#fadbd8',
                        color: subject.percentage >= 75 ? '#27ae60' : subject.percentage >= 60 ? '#856404' : '#721c24',
                        display: 'inline-block',
                        minWidth: '50px'
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
                justifyContent: 'center',
                cursor: day ? 'pointer' : 'default'
              }}
              onClick={() => day && openDayModal(day.date)}
            >
              {day ? day.day : ''}
            </div>
          ))}
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
    </div>
  );
};

export default AttendanceTracker;
