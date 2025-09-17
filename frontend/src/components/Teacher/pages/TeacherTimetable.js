import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import './TeacherTimetable.css';

const TeacherTimetable = () => {
  const [teacher, setTeacher] = useState(null);
  const [schedule, setSchedule] = useState([]); // weekly schedule data (array of days)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Week navigation state
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [weekInfo, setWeekInfo] = useState(null);
  const [weekDates, setWeekDates] = useState([]);

  // Tabs
  const [activeTab, setActiveTab] = useState('schedule'); // schedule | exams | holidays
  const [exams, setExams] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [examsError, setExamsError] = useState(null);
  const [holidaysError, setHolidaysError] = useState(null);

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

  // Function to find schedule item for teacher at specific time slot
  const findTeacherScheduleItem = (dayData, startTime, endTime) => {
    if (!dayData || !dayData.periods) return null;

    // Normalize time comparison
    const normalizeTime = (time) => {
      if (!time) return '';
      if (typeof time === 'string') {
        if (time.includes('T')) {
          return time.split('T')[1].substring(0, 5); // HH:MM
        }
        if (time.length === 8) return time.substring(0, 5); // HH:MM
        if (time.length === 5) return time;
        return time;
      }
      if (time instanceof Date) {
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return String(time);
    };

    const searchStartTime = normalizeTime(startTime);
    const searchEndTime = normalizeTime(endTime);

    // Find matching period for this time slot
    const matchingPeriod = dayData.periods.find(period => {
      const periodStart = normalizeTime(period.startTime);
      const periodEnd = normalizeTime(period.endTime);
      return periodStart === searchStartTime && periodEnd === searchEndTime;
    });

    return matchingPeriod;
  };

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const teacherObj = currentUser.teacher;
      
      if (!teacherObj || !teacherObj.teacherId) {
        setError('Teacher session not found. Please login.');
        return;
      }
      setTeacher(teacherObj);

      console.log('👩‍🏫 Loading teacher weekly calendar for:', teacherObj.teacherId, 'week offset:', currentWeekOffset);

      // Load dynamic weekly calendar for teacher
      const weeklyResponse = await apiService.get(`/timemanagement/teacher-calendar-week/${teacherObj.teacherId}/${teacherObj.academicYear || '2024-2025'}/${currentWeekOffset}`);
      
      if (weeklyResponse && weeklyResponse.success && weeklyResponse.data) {
        console.log('📅 Loaded teacher weekly calendar:', weeklyResponse.data);
        
        // Set schedule data from calendar
        setSchedule(weeklyResponse.data);
        setWeekInfo(weeklyResponse.weekInfo);
        
        // Generate week dates for display
        const dates = weeklyResponse.data.map(dayData => {
          const date = new Date(dayData.calendar_date);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          return {
            dayName: dayNames[dayData.day_of_week - 1] || `Day ${dayData.day_of_week}`,
            date: date,
            formatted: `${day}/${month}/${year}`,
            dayData: dayData
          };
        });
        setWeekDates(dates);
        
      } else {
        setSchedule([]);
        setWeekDates([]);
      }

    } catch (err) {
      console.error('❌ Error loading teacher timetable:', err);
      setError('Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, [currentWeekOffset]);

  // Week navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
  };

  const goToNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  // Lazy loaders for exams & holidays (for ALL classes teacher teaches)
  const loadExams = async (teacherObj) => {
    if (exams.length || loadingExams) return;
    try {
      setLoadingExams(true);
      setExamsError(null);
      const resp = await apiService.get(`/timemanagement/upcoming-exams/all`); // All exams for filtering
      if (resp && resp.success) setExams(resp.data || []); else setExams([]);
    } catch (e) {
      console.error('❌ Error loading exams:', e);
      setExamsError('Failed to load upcoming exams');
    } finally {
      setLoadingExams(false);
    }
  };

  const loadHolidays = async (teacherObj) => {
    if (holidays.length || loadingHolidays) return;
    try {
      setLoadingHolidays(true);
      setHolidaysError(null);
      const resp = await apiService.get(`/timemanagement/upcoming-holidays/all`);
      if (resp && resp.success) setHolidays(resp.data || []); else setHolidays([]);
    } catch (e) {
      console.error('❌ Error loading holidays:', e);
      setHolidaysError('Failed to load upcoming holidays');
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    if (!teacher) return;
    if (activeTab === 'exams') loadExams(teacher);
    if (activeTab === 'holidays') loadHolidays(teacher);
  }, [activeTab, teacher]);

  if (loading) return <div className="loading">Loading timetable...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="teacher-timetable">
      <h2>My Teaching Schedule</h2>
      {teacher && (
        <p className="teacher-info">
          <strong>{teacher.name}</strong> | Academic Year: {teacher.academicYear || '2024-2025'}
        </p>
      )}

      {/* Tabs */}
      <div className="tt-tabs">
        <button
          className={activeTab === 'schedule' ? 'tt-tab active' : 'tt-tab'}
          onClick={() => setActiveTab('schedule')}
        >Schedule</button>
        <button
          className={activeTab === 'exams' ? 'tt-tab active' : 'tt-tab'}
          onClick={() => setActiveTab('exams')}
        >Exams</button>
        <button
          className={activeTab === 'holidays' ? 'tt-tab active' : 'tt-tab'}
          onClick={() => setActiveTab('holidays')}
        >Holidays</button>
      </div>

      {activeTab === 'schedule' && (
        <>
          {/* Week Navigation */}
          <div className="week-navigation">
            <button className="nav-button" onClick={goToPreviousWeek}>◀ Previous Week</button>
            <div className="week-info">
              <h3>{weekInfo?.weekLabel || 'Current Week'}</h3>
              {weekInfo && (
                <p>{new Date(weekInfo.startDate).toLocaleDateString('en-GB')} - {new Date(weekInfo.endDate).toLocaleDateString('en-GB')}</p>
              )}
            </div>
            <button className="nav-button" onClick={goToNextWeek}>Next Week ▶</button>
            {currentWeekOffset !== 0 && (
              <button className="current-week-button" onClick={goToCurrentWeek}>📅 Current Week</button>
            )}
          </div>

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
                {weekDates.length > 0 ? weekDates.map((dateInfo, dayIndex) => (
                  <tr key={dayIndex}>
                    <td className="day-column">
                      <div className="day-header">
                        <strong>{dateInfo.dayName}</strong>
                        <div className="date-info">{dateInfo.formatted}</div>
                        {dateInfo.dayData.day_type === 'holiday' && (
                          <div className="holiday-indicator">🏖️ {dateInfo.dayData.holiday_name}</div>
                        )}
                      </div>
                    </td>
                    {timeSlots.map((slot, slotIndex) => {
                      const scheduleItem = findTeacherScheduleItem(dateInfo.dayData, slot.start_time, slot.end_time);
                      const dayData = dateInfo.dayData;
                      const isHoliday = dayData && dayData.holiday_name;
                      const isHalfHoliday = dayData && dayData.day_type === 'half_holiday';

                      return (
                        <td key={slotIndex} className="schedule-cell">
                          {/* Check if this entire day is a holiday first */}
                          {isHoliday ? (
                            <div className={`schedule-item ${isHalfHoliday ? 'half-holiday-cell' : 'holiday-cell'}`}>
                              <div className="holiday-text">
                                {isHalfHoliday ? 'HALF HOLIDAY' : 'Holiday'}
                              </div>
                              <div className="holiday-name">{dayData.holiday_name}</div>
                            </div>
                          ) : scheduleItem ? (
                            (() => {
                              // Check if this is a lunch break first
                              if (scheduleItem.subjectCode === 'LUNCH' || scheduleItem.teacherId === 'LUNCH') {
                                return (
                                  <div className="schedule-item lunch-break">
                                    <div className="subject-name">Lunch Break</div>
                                    <div className="teacher-name">Break Time</div>
                                  </div>
                                );
                              }
                              
                              // Check if this is an exam slot
                              const isExamSlot = scheduleItem.isExam;
                              
                              if (isExamSlot) {
                                // Get exam details - for teacher we show class and subject
                                const examSubject = scheduleItem.subjectCode || 'Unknown';
                                const examClass = scheduleItem.classId || '';
                                
                                return (
                                  <div className="schedule-item exam-cell">
                                    <div className="exam-text">EXAM</div>
                                    {examClass && <div className="class-name">Class {examClass}</div>}
                                    <div className="exam-subject">{subjectNames[examSubject] || examSubject}</div>
                                  </div>
                                );
                              }
                              
                              // Regular class schedule item
                              return (
                                <div className={`schedule-item ${
                                  scheduleItem.subjectCode === 'STUDY' ? 'study-period' :
                                  scheduleItem.subjectCode === 'LUNCH' ? 'lunch-break' : ''
                                }`}>
                                  <div className="class-name">
                                    Class {scheduleItem.classId}
                                  </div>
                                  <div className="subject-name">
                                    {subjectNames[scheduleItem.subjectCode] || scheduleItem.subjectCode || 'Unknown Subject'}
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="empty-slot">
                              <span>—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )) : (
                  dayNames.map((dayName, dayIndex) => (
                    <tr key={dayIndex}>
                      <td className="day-column">{dayName}</td>
                      {timeSlots.map((_, slotIndex) => (
                        <td key={slotIndex} className="schedule-cell">
                          <span className="no-class">—</span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'exams' && (
        <div className="exams-panel">
          <h3>Upcoming Exams (All Classes)</h3>
          {loadingExams && <p>Loading exams...</p>}
          {examsError && <p className="error-inline">{examsError}</p>}
          {!loadingExams && !examsError && exams.length === 0 && <p>No upcoming exams.</p>}
          {!loadingExams && exams.length > 0 && (
            <table className="aux-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Class</th>
                  <th>Exam Type</th>
                  <th>Session</th>
                  <th>Subjects</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.date}</td>
                    <td>{exam.dayName}</td>
                    <td>{exam.className}</td>
                    <td>{exam.examType}</td>
                    <td>{exam.examSession}</td>
                    <td>
                      {exam.examDetails && exam.examDetails.length > 0 ? (
                        exam.examDetails.map((d, i) => (
                          <span key={i} className="subject-pill">{d.subjectName || d.subject}</span>
                        ))
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="holidays-panel">
          <h3>Upcoming Holidays</h3>
          {loadingHolidays && <p>Loading holidays...</p>}
          {holidaysError && <p className="error-inline">{holidaysError}</p>}
          {!loadingHolidays && !holidaysError && holidays.length === 0 && <p>No upcoming holidays.</p>}
          {!loadingHolidays && holidays.length > 0 && (
            <table className="aux-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map(h => (
                  <tr key={h.id}>
                    <td>{h.date}</td>
                    <td>{h.dayName}</td>
                    <td>{h.holidayName}</td>
                    <td>{h.type}</td>
                    <td>{h.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherTimetable;
