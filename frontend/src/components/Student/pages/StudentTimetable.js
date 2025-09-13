import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import './StudentTimetable.css';

const StudentTimetable = () => {
  const [student, setStudent] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const subjectNames = {
    '8_MATH': 'Mathematics',
    '8_SCI': 'Science',
    '8_ENG': 'English',
    '8_SOC': 'Social Studies',
    '8_HIN': 'Hindi',
    '8_TEL': 'Telugu',
    'STUDY': 'Study Period',
    'LUNCH': 'Lunch Break'
  };

  const timeSlots = [
    { slot_name: 'Period 1', start_time: '09:00:00', end_time: '09:40:00' },
    { slot_name: 'Period 2', start_time: '09:40:00', end_time: '10:20:00' },
    { slot_name: 'Period 3', start_time: '10:20:00', end_time: '11:00:00' },
    { slot_name: 'Period 4', start_time: '11:00:00', end_time: '11:40:00' },
    { slot_name: 'Lunch Break', start_time: '11:40:00', end_time: '12:20:00' },
    { slot_name: 'Period 5', start_time: '12:20:00', end_time: '13:00:00' },
    { slot_name: 'Period 6', start_time: '13:00:00', end_time: '13:40:00' },
    { slot_name: 'Period 7', start_time: '13:40:00', end_time: '14:20:00' },
    { slot_name: 'Period 8', start_time: '14:20:00', end_time: '15:00:00' },
    { slot_name: 'Period 9', start_time: '15:00:00', end_time: '15:40:00' }
  ];

  // Normalize time like admin component
  const normalizeTime = (time) => {
    if (!time) return '';
    if (typeof time === 'string') {
      if (time.includes('T')) return time.split('T')[1].substring(0, 8);
      if (time.length === 8) return time;
      if (time.length === 5) return time + ':00';
      return time;
    }
    if (time instanceof Date) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const seconds = time.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return String(time);
  };

  const findScheduleItem = (dayOfWeek, startTime, endTime) => {
    const sStart = normalizeTime(startTime);
    const sEnd = normalizeTime(endTime);
    return schedule.find(item => item.dayOfWeek === dayOfWeek && normalizeTime(item.startTime) === sStart && normalizeTime(item.endTime) === sEnd);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const studentObj = currentUser.student;
        if (!studentObj || !studentObj.classId) {
          setError('Student session not found. Please login.');
          return;
        }
        setStudent(studentObj);

        const response = await apiService.getClassSchedule(studentObj.classId, studentObj.academicYear || '2024-2025');
        if (response && response.data) setSchedule(response.data);
        else setSchedule([]);
      } catch (err) {
        console.error('Error loading student timetable:', err);
        setError('Failed to load timetable');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="loading">Loading timetable...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="student-timetable">
      <h2>My Class Timetable</h2>
      {student && (
        <p className="class-info">
          Class: {student.className} {student.section} | Academic Year: {student.academicYear || '2024-2025'}
        </p>
      )}

      <div className="timetable-container">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Day</th>
              {timeSlots.map((slot, index) => (
                <th key={index}>
                  {slot.slot_name}<br />
                  <small>{slot.start_time.substring(0, 5)}-{slot.end_time.substring(0, 5)}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayNames.map((dayName, dayIndex) => (
              <tr key={dayIndex}>
                <td className="day-column">{dayName}</td>
                {timeSlots.map((slot, slotIndex) => {
                  const scheduleItem = findScheduleItem(dayIndex + 1, slot.start_time, slot.end_time);
                  return (
                    <td key={slotIndex} className="schedule-cell">
                      {scheduleItem ? (
                        <div className="schedule-item">
                          {scheduleItem.subjectCode === 'STUDY' || scheduleItem.subjectCode === 'LUNCH' ? (
                            <span className="study-lunch">
                              {subjectNames[scheduleItem.subjectCode] || scheduleItem.subjectCode}
                            </span>
                          ) : (
                            <span className="subject-info">
                              {subjectNames[scheduleItem.subjectCode] || scheduleItem.subjectCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="no-class">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTimetable;