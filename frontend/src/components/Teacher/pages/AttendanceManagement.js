import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const AttendanceManagement = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [calendarSlots, setCalendarSlots] = useState([]);
  const [teacherSlots, setTeacherSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        if (!user || user.role !== 'teacher') {
          setError('Teacher session not found. Please login.');
          setLoading(false);
          return;
        }

        // Use username as teacherId and fetch teacher data
        const teacherId = user.username;
        console.log('Fetching attendance management for teacher:', teacherId);
        
        const teacher = await apiService.getTeacher(teacherId);
        
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

    if (user) {
      fetchInitialData();
    }
  }, [user]);

  // Fetch students, attendance, and calendar slots when class/date changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchClassData = async () => {
      try {
        setLoading(true);
        
        if (!user || user.role !== 'teacher') {
          setError('Teacher session not found. Please login.');
          setLoading(false);
          return;
        }

        // Use username as teacherId
        const teacherId = user.username;
        
        if (!teacherId) {
          setError('Teacher information not found. Please login again.');
          return;
        }
        
        // Check if selected date is today
        const today = new Date().toISOString().split('T')[0];
        const isToday = selectedDate === today;
        
        // Always fetch students for the selected class
        const studentsResponse = await apiService.request(`/students?classId=${selectedClass}`);
        setStudents(studentsResponse.data || []);
        
        // Fetch calendar slots for the selected class and date
        try {
          const calendarResponse = await apiService.getCalendarSlots(selectedClass, selectedDate);
          const allSlots = calendarResponse.data?.allSlots || [];
          setCalendarSlots(allSlots);
          
          // Filter slots by the current teacher
          const teacherScheduledSlots = allSlots.filter(slot => 
            slot.teacherId === teacherId && 
            slot.subjectCode && 
            !slot.subjectCode.includes('LUNCH') &&
            !slot.subjectCode.includes('STUDY')
          );
          setTeacherSlots(teacherScheduledSlots);
          
          console.log('Calendar slots for teacher:', teacherScheduledSlots);
        } catch (calendarError) {
          console.warn('Calendar slots not found for this date:', calendarError);
          setCalendarSlots([]);
          setTeacherSlots([]);
        }
        
        // Fetch existing attendance for the selected class and date
        const attendanceResponse = await apiService.request(
          `/attendance?classId=${selectedClass}&startDate=${selectedDate}&endDate=${selectedDate}&teacherId=${teacherId}`
        );
        
        console.log('Attendance API response:', attendanceResponse);
        const existingAttendance = attendanceResponse.attendance || [];
        console.log('Existing attendance data:', existingAttendance);
        
        if (isToday) {
          // For today's date: Show all students with overlay of existing attendance
          // This ensures the page doesn't change when marking attendance
          setAttendanceData(existingAttendance);
        } else {
          // For historical dates: Show only existing attendance records
          setAttendanceData(existingAttendance);
        }
        
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
      if (!user || user.role !== 'teacher') {
        setError('Teacher session not found. Please login.');
        return;
      }
      const teacherId = user.username;
      
      // Mark attendance for all students
      const attendancePromises = students.map(student => 
        apiService.addAttendance({
          studentId: student.studentId,
          classId: selectedClass,
          date: selectedDate,
          period: periodNum,
          status: 'present', // Default to present
          markedBy: teacherId
        })
      );
      
      await Promise.all(attendancePromises);
      
      // Refresh attendance data
      const attendanceResponse = await apiService.request(
        `/attendance?classId=${selectedClass}&startDate=${selectedDate}&endDate=${selectedDate}&teacherId=${teacherId}`
      );
      
      setAttendanceData(attendanceResponse.attendance || []);
      
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  // New function for marking individual student attendance using schedule data
  const markIndividualAttendance = async (studentId, status, scheduleSlot) => {
    try {
      if (!user || user.role !== 'teacher') {
        setError('Teacher session not found. Please login.');
        return;
      }
      const teacherId = user.username;
      
      await apiService.addAttendance({
        studentId: studentId,
        classId: selectedClass,
        date: selectedDate,
        period: scheduleSlot.period,
        status: status,
        markedBy: teacherId,
        scheduleId: scheduleSlot.scheduleId,
        subjectCode: scheduleSlot.subjectCode
      });
      
      // Refresh attendance data
      console.log('Refreshing attendance data after individual marking...');
      const attendanceResponse = await apiService.request(
        `/attendance?classId=${selectedClass}&startDate=${selectedDate}&endDate=${selectedDate}&teacherId=${teacherId}`
      );
      
      console.log('Fresh attendance data after individual marking:', attendanceResponse);
      setAttendanceData(attendanceResponse.attendance || []);
      
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    }
  };

  // Function for marking all students for a specific subject/period
  const markAllStudentsForSubject = async (scheduleSlot, status = 'present') => {
    try {
      setSaving(true);
      
      if (!user || user.role !== 'teacher') {
        setError('Teacher session not found. Please login.');
        return;
      }
      const teacherId = user.username;
      
      // Mark attendance for all students for this specific subject/period
      const attendancePromises = students.map(student => 
        apiService.addAttendance({
          studentId: student.studentId,
          classId: selectedClass,
          date: selectedDate,
          period: scheduleSlot.period,
          status: status,
          markedBy: teacherId,
          scheduleId: scheduleSlot.scheduleId,
          subjectCode: scheduleSlot.subjectCode
        })
      );
      
      await Promise.all(attendancePromises);
      
      // Refresh attendance data
      console.log('Refreshing attendance data after bulk marking...');
      const attendanceResponse = await apiService.request(
        `/attendance?classId=${selectedClass}&startDate=${selectedDate}&endDate=${selectedDate}&teacherId=${teacherId}`
      );
      
      console.log('Fresh attendance data after bulk marking:', attendanceResponse);
      setAttendanceData(attendanceResponse.attendance || []);
      alert(`All students marked as ${status} for ${scheduleSlot.subjectCode} (Period ${scheduleSlot.period})`);
      
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

      {/* Main Content Area */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const isToday = selectedDate === today;
        
        if (isToday) {
          // TODAY'S DATE: Show calendar-based marking interface
          return (
            <div>
              <h3>Mark Attendance for {selectedDate} - {classes.find(c => c.classId === selectedClass)?.className} {classes.find(c => c.classId === selectedClass)?.section}</h3>
              
              {teacherSlots.length > 0 ? (
                <div>
                  <p style={{ marginBottom: '20px', color: '#2c3e50', fontWeight: 'bold' }}>
                    You have {teacherSlots.length} subject(s) scheduled for today:
                  </p>
                  
                  {teacherSlots.map((slot, index) => (
                    <div key={slot.scheduleId} style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
                      <div style={{ marginBottom: '15px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>
                          {slot.subjectCode} - Period {slot.period} ({slot.startTime?.slice(0, 5)} - {slot.endTime?.slice(0, 5)})
                        </h4>
                        <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                          Schedule ID: {slot.scheduleId}
                        </p>
                      </div>

                      {students.length > 0 && (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Student ID</th>
                              <th>Student Name</th>
                              <th>Current Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(student => {
                              // Find attendance record for this student and period (same logic as historical view)
                              const existingAttendance = attendanceData.find(rec => 
                                rec.studentId === student.studentId && 
                                rec.period === slot.period
                              );
                              
                              return (
                                <tr key={`${student.studentId}-${slot.scheduleId}`}>
                                  <td>{student.studentId}</td>
                                  <td>{student.name}</td>
                                  <td>
                                    {existingAttendance ? (
                                      <span style={{ 
                                        color: existingAttendance.status === 'present' ? '#27ae60' : '#e74c3c',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                      }}>
                                        {existingAttendance.status}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                                        Not Marked
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {existingAttendance ? (
                                      // Show Edit button for already marked students (same as historical view)
                                      <button 
                                        className="btn btn-warning" 
                                        onClick={() => handleStatusToggle(existingAttendance.attendanceId)}
                                        disabled={saving}
                                        title="Click to change status"
                                      >
                                        Toggle Status
                                      </button>
                                    ) : (
                                      // Show Present/Absent buttons for unmarked students
                                      <>
                                        <button 
                                          className="btn btn-success" 
                                          onClick={() => markIndividualAttendance(student.studentId, 'present', slot)}
                                          style={{ marginRight: '10px' }}
                                          disabled={saving}
                                        >
                                          Present
                                        </button>
                                        <button 
                                          className="btn btn-danger" 
                                          onClick={() => markIndividualAttendance(student.studentId, 'absent', slot)}
                                          disabled={saving}
                                        >
                                          Absent
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <p style={{ color: '#6c757d', fontSize: '16px' }}>
                    You have no subjects scheduled for this class today.
                  </p>
                </div>
              )}
            </div>
          );
        } else {
          // HISTORICAL DATE: Show existing attendance records
          if (attendanceData.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <p>No attendance marked for {selectedDate}</p>
              </div>
            );
          } else {
            return (
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
            );
          }
        }
      })()}
    </div>
  );
};

export default AttendanceManagement;
