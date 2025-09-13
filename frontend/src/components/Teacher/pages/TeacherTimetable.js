import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import './TeacherTimetable.css';

const TeacherTimetable = () => {
  const [teacher, setTeacher] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [classesMap, setClassesMap] = useState({});
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
        const teacherObj = currentUser.teacher;
        if (!teacherObj || !teacherObj.teacherId) {
          setError('Teacher session not found. Please login.');
          return;
        }
        setTeacher(teacherObj);

        // Fetch classes to build friendly names map
        try {
          const classesResp = await apiService.getClasses();
          if (classesResp && classesResp.classes) {
            const map = {};
            classesResp.classes.forEach(c => {
              const display = `${c.className} ${c.section}`;
              // store both numeric and string keys to be robust
              map[c.classId] = display;
              map[String(c.classId)] = display;
            });
            setClassesMap(map);
          }
        } catch (cErr) {
          console.warn('Could not fetch classes for friendly names:', cErr);
        }

        const response = await apiService.getTeacherSchedule(teacherObj.teacherId, teacherObj.academicYear || '2024-2025');
        if (response && response.data) setSchedule(response.data);
        else setSchedule([]);
      } catch (err) {
        console.error('Error loading teacher timetable:', err);
        setError('Failed to load timetable');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="content-card"><h2>My Timetable</h2><p>Loading...</p></div>;
  if (error) return <div className="content-card"><h2>My Timetable</h2><p style={{color: 'red'}}>{error}</p></div>;

  return (
    <div className="content-card">
      <h2>My Timetable</h2>
      <p><strong>{teacher?.name}</strong></p>
      <div className="table-container">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Day</th>
              {timeSlots.map((slot, i) => (
                <th key={i}>{slot.slot_name}<div style={{fontSize: '0.8rem'}}>{slot.start_time.substring(0,5)}-{slot.end_time.substring(0,5)}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayNames.map((day, di) => {
              const dow = di + 1;
              return (
                <tr key={day}>
                  <td>{day}</td>
                  {timeSlots.map((slot, si) => {
                    const item = findScheduleItem(dow, slot.start_time, slot.end_time);
                    return (
                      <td key={si} style={{minWidth: '140px'}}>
                        {item ? (
                          <div style={{padding: '6px', borderRadius: '6px', background: '#667eea', color: 'white'}}>
                            <div style={{fontWeight: 700}}>{item.classId ? (classesMap[item.classId] || classesMap[String(item.classId)] || `Class ${item.classId}`) : ''}</div>
                            {(() => {
                              const code = item.subjectCode || item.subject_code || '';
                              // Only show subject when it's not a Study or Lunch placeholder
                              if (!code || code.toUpperCase() === 'STUDY' || code.toUpperCase() === 'LUNCH') return null;
                              return <div style={{fontSize: '0.85rem'}}>{subjectNames[code] || code}</div>;
                            })()}
                          </div>
                        ) : (
                          <div style={{color: '#888'}}>—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherTimetable;
