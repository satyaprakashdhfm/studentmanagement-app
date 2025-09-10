import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';
import './TimeManagement.css';

const TimeManagement = () => {
  const { classId, section, grade } = useParams();
  const navigate = useNavigate();
  const { selectedAcademicYear, classes } = useAcademicYear();
  
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedClass, setSelectedClass] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalData, setModalData] = useState({});
  const [loading, setLoading] = useState(false);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Subject colors for visual identification
  const subjectColors = {
    'Mathematics': '#FF6B6B',
    'Physics': '#4ECDC4', 
    'Chemistry': '#45B7D1',
    'Biology': '#96CEB4',
    'English': '#FFEAA7',
    'Hindi': '#DDA0DD',
    'Social Science': '#98D8C8',
    'Social Studies': '#98D8C8',
    'Computer Science': '#6C5CE7',
    'Science': '#81ECEC'
  };

  // Format slot time for display. Accepts ISO string or HH:MM:SS; returns HH:MM
  const formatSlotTime = (time) => {
    if (!time) return '';
    try {
      // If time includes a 'T' or is a full ISO timestamp, parse and format
      if (time.includes('T') || time.includes('-')) {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
      }

      // If format is HH:MM:SS or HH:MM, take first 5 chars
      return time.substring(0,5);
    } catch (err) {
      return time.substring(0,5);
    }
  };

  const handleClassBoxClick = (cls) => {
    navigate(`/admin/time-management/${cls.classId}/${cls.section}`);
  };

  // Clear selected class when navigating between different routes
  useEffect(() => {
    console.log('Route change detected:', { grade, classId, selectedClass });
    // If we're on a grade page (without classId), clear the selected class
    if (grade && !classId) {
      console.log('Clearing selectedClass because on grade page without classId');
      setSelectedClass(null);
    }
    // If we're on the main page (no grade, no classId), clear the selected class
    if (!grade && !classId) {
      console.log('Clearing selectedClass because on main page');
      setSelectedClass(null);
    }
  }, [grade, classId]);

  // Fetch initial data
  useEffect(() => {
    fetchTimeSlots();
    fetchSubjects();
    fetchTeachers();
    
    // If classId (and optionally section) are provided, find the matching class
    if (classId && classes.length > 0) {
      const filteredClasses = classes.filter(cls => cls.academicYear === selectedAcademicYear);
      const foundClass = filteredClasses.find(cls => {
        const idMatch = String(cls.classId) === String(classId);
        if (section) {
          return idMatch && String(cls.section) === String(section);
        }
        return idMatch;
      });
      if (foundClass) {
        setSelectedClass(foundClass);
      }
    }
  }, [selectedAcademicYear, classId, section, classes]);

  // Fetch schedule when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSchedule();
    }
  }, [selectedClass, selectedAcademicYear]);

  const fetchTimeSlots = async () => {
    try {
      const data = await apiService.getTimeSlots();
      console.log('Time slots fetched:', data); // Debug
      setTimeSlots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]); // Ensure it's always an array
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const data = await apiService.getClassSchedule(
        selectedClass.classId, 
        selectedClass.section, 
        selectedAcademicYear
      );
      console.log('Schedule data fetched:', data); // Debug
      setSchedule(data.schedule || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await apiService.getSubjects();
      console.log('Subjects response:', data); // Debug
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]); // Ensure it's always an array
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await apiService.getTeachers();
      console.log('Teachers response:', data); // Debug
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]); // Ensure it's always an array
    }
  };

  const renderClassHeader = () => {
    if (!selectedClass) return null;
    
    return (
      <div className="class-management-header">
        <div>
          <h2>Time Management: {selectedClass.className} {selectedClass.section}</h2>
          <p>Manage weekly schedule for this class</p>
        </div>
        <div className="header-actions">
          <div className="academic-year-info">
            <span>Academic Year: {selectedAcademicYear}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/admin/time-management')}
          >
            Back to All Classes
          </button>
        </div>
      </div>
    );
  };

  const renderScheduleGrid = () => {
    if (!selectedClass) {
      return null; // Don't show anything if no class is selected
    }

    console.log('TimeManagement render:', { 
      grade, 
      classId, 
      section, 
      selectedClass,
      timeSlots: timeSlots?.length || 0,
      schedule: schedule?.length || 0
    });

    return (
      <div className="schedule-container">
        <div className="schedule-header">
          <div className="schedule-title">
            <h4>Weekly Schedule - Class {selectedClass.className} Section {selectedClass.section}</h4>
            <div className="schedule-stats">
              <span className="stat-item">
                <i className="fas fa-calendar"></i> 
                {schedule.length} periods scheduled
              </span>
              <span className="stat-item">
                <i className="fas fa-clock"></i> 
                {timeSlots && timeSlots.length > 0 ? 
                  timeSlots.filter(slot => slot.slot_name !== 'Break' && slot.slot_name !== 'Lunch Break').length : 0} periods/day
              </span>
            </div>
          </div>
          <div className="schedule-actions">
            <button className="btn btn-outline-primary btn-sm me-2">
              <i className="fas fa-copy"></i> Copy Schedule
            </button>
            <button className="btn btn-outline-success btn-sm me-2" onClick={() => window.print()}>
              <i className="fas fa-print"></i> Print
            </button>
            <button className="btn btn-outline-info btn-sm">
              <i className="fas fa-download"></i> Export
            </button>
          </div>
        </div>

        {/* Legend for subjects */}
        <div className="schedule-legend">
          <h6>Subject Legend:</h6>
          <div className="legend-items">
            {Object.entries(subjectColors).map(([subject, color]) => (
              <span key={subject} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: color }}></div>
                {subject}
              </span>
            ))}
          </div>
        </div>

        <div className="schedule-grid-wrapper">
          <table className="schedule-table">
            <thead>
              <tr className="schedule-header-row">
                <th className="day-header">Day</th>
                {timeSlots && timeSlots.length > 0 ? 
                  timeSlots
                    .filter(slot => slot.slot_name !== 'Break' && slot.slot_name !== 'Lunch Break')
                    .map(slot => (
                          <th key={slot.slot_id} className="period-header">
                            <div className="period-title">{slot.slot_name}</div>
                            <div className="period-time">
                              {formatSlotTime(slot.start_time)}{slot.start_time || slot.end_time ? ' - ' : ''}{formatSlotTime(slot.end_time)}
                            </div>
                          </th>
                        ))
                  : 
                  <th colSpan="7" className="period-header">
                    <div className="loading-message">Loading time slots...</div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              {timeSlots && timeSlots.length > 0 ? 
                dayNames.slice(0, 6).map((day, dayIndex) => (
                  <tr key={day} className="schedule-row">
                    <td className="day-cell">
                      <div className="day-name">{day}</div>
                    </td>
                    {timeSlots
                      .filter(slot => slot.slot_name !== 'Break' && slot.slot_name !== 'Lunch Break')
                      .map(slot => {
                        const scheduleItem = schedule.find(
                          s => s.day_of_week === (dayIndex + 1) && s.slot_id === slot.slot_id
                        );
                        
                        return (
                          <td key={`${day}-${slot.slot_id}`} className="period-cell">
                            {scheduleItem ? (
                              <div 
                                className="period-content filled"
                                style={{ 
                                  backgroundColor: subjectColors[scheduleItem.subject?.subject_name] || '#f8f9fa',
                                  borderLeft: `4px solid ${subjectColors[scheduleItem.subject?.subject_name] || '#ddd'}`
                                }}
                                onClick={() => handleScheduleClick(day, slot.slot_id, scheduleItem)}
                              >
                                <div className="subject-name">
                                  {scheduleItem.subject?.subject_name || 'Unknown'}
                                </div>
                                <div className="teacher-name">
                                  <i className="fas fa-user"></i> {scheduleItem.teacher?.name || 'No Teacher'}
                                </div>
                                {scheduleItem.room && (
                                  <div className="room-info">
                                    <i className="fas fa-door-open"></i> {scheduleItem.room}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div 
                                className="period-content empty"
                                onClick={() => handleScheduleClick(day, slot.slot_id, null)}
                              >
                                <div className="empty-content">
                                  <i className="fas fa-plus-circle"></i>
                                  <span>Add Subject</span>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))
                :
                <tr>
                  <td colSpan="8" className="text-center p-4">
                    <div className="loading-message">
                      {timeSlots.length === 0 ? 'No time slots available' : 'Loading schedule...'}
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleScheduleClick = (day, slotId, existingSchedule) => {
    setSelectedDay(day);
    setSelectedSlot(slotId);
    
    if (existingSchedule) {
      setModalData({
        scheduleId: existingSchedule.schedule_id,
        subjectId: existingSchedule.subject_id,
        teacherId: existingSchedule.teacher_id,
        room: existingSchedule.room || '',
        isEdit: true
      });
    } else {
      setModalData({
        scheduleId: null,
        subjectId: '',
        teacherId: '',
        room: '',
        isEdit: false
      });
    }
    
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const scheduleData = {
        classId: selectedClass.classId,
        section: selectedClass.section,
        dayOfWeek: dayNames.indexOf(selectedDay) + 1,
        slotId: selectedSlot,
        subjectId: modalData.subjectId,
        teacherId: modalData.teacherId,
        room: modalData.room || '',
        academicYear: selectedAcademicYear
      };

      if (modalData.isEdit) {
        await apiService.updateScheduleEntry({ ...scheduleData, scheduleId: modalData.scheduleId });
      } else {
        await apiService.createScheduleEntry(scheduleData);
      }

      fetchSchedule();
      setShowScheduleModal(false);
      setModalData({});
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule entry?')) return;

    try {
      await apiService.deleteScheduleEntry(scheduleId);
      fetchSchedule();
      setShowScheduleModal(false);
      setModalData({});
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const renderScheduleModal = () => (
    <div className={`modal fade ${showScheduleModal ? 'show' : ''}`} style={{ display: showScheduleModal ? 'block' : 'none' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {modalData.isEdit ? 'Edit' : 'Add'} Schedule - {selectedDay} {timeSlots.find(t => t.slot_id === selectedSlot)?.slot_name}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setShowScheduleModal(false)}
            ></button>
          </div>
          
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Class & Section:</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={selectedClass ? `Class ${selectedClass.className} - Section ${selectedClass.section}` : ''}
                    disabled 
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Day & Time:</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={`${selectedDay} - ${timeSlots.find(t => t.slot_id === selectedSlot)?.slot_name || ''}`}
                    disabled 
                  />
                </div>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Subject: <span className="text-danger">*</span></label>
                  <select 
                    className="form-select"
                    value={modalData.subjectId || ''}
                    onChange={(e) => setModalData({...modalData, subjectId: e.target.value})}
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {Array.isArray(subjects) && subjects.map(subject => (
                      <option key={subject.subject_id} value={subject.subject_id}>
                        {subject.subject_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Teacher: <span className="text-danger">*</span></label>
                  <select 
                    className="form-select"
                    value={modalData.teacherId || ''}
                    onChange={(e) => setModalData({...modalData, teacherId: e.target.value})}
                    required
                  >
                    <option value="">-- Select Teacher --</option>
                    {Array.isArray(teachers) && teachers.map(teacher => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Room (optional):</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="e.g., Lab-1 or 204"
                    value={modalData.room || ''}
                    onChange={(e) => setModalData({ ...modalData, room: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </button>
            {modalData.scheduleId && (
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteSchedule(modalData.scheduleId)}
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            )}
            <button 
              className="btn btn-primary"
              onClick={handleSaveSchedule}
              disabled={!modalData.subjectId || !modalData.teacherId}
            >
              <i className="fas fa-save"></i> {modalData.scheduleId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEventsTab = () => (
    <div className="events-container">
      <div className="events-header">
        <div className="events-title">
          <h4>Events & Examinations</h4>
          <p>Manage special events, exams, and schedule overrides</p>
        </div>
        <div className="events-actions">
          <button className="btn btn-primary" onClick={() => setShowEventModal(true)}>
            <i className="fas fa-plus"></i> Add Event/Exam
          </button>
        </div>
      </div>

      <div className="events-content">
        <div className="row">
          <div className="col-md-4">
            <div className="event-type-card">
              <div className="event-icon exam">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h5>Examinations</h5>
              <p>Schedule term exams, unit tests, and assessments</p>
              <div className="event-stats">
                <span className="stat">0 Upcoming</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="event-type-card">
              <div className="event-icon holiday">
                <i className="fas fa-calendar-day"></i>
              </div>
              <h5>Holidays</h5>
              <p>Mark holidays and school closure days</p>
              <div className="event-stats">
                <span className="stat">0 This Month</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="event-type-card">
              <div className="event-icon event">
                <i className="fas fa-star"></i>
              </div>
              <h5>Special Events</h5>
              <p>Sports day, assemblies, and other activities</p>
              <div className="event-stats">
                <span className="stat">0 Planned</span>
              </div>
            </div>
          </div>
        </div>

        <div className="upcoming-events">
          <h5>Upcoming Events & Exams</h5>
          <div className="events-list">
            <div className="no-events">
              <i className="fas fa-calendar-plus"></i>
              <p>No events scheduled yet</p>
              <button className="btn btn-outline-primary btn-sm" onClick={() => setShowEventModal(true)}>
                Schedule Your First Event
              </button>
            </div>
          </div>
        </div>

        <div className="exam-schedule-preview">
          <h5>Exam Schedule Override Preview</h5>
          <div className="override-info">
            <div className="info-card">
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>How Exam Override Works:</strong>
                <ul>
                  <li>When you schedule exams, regular periods are automatically replaced</li>
                  <li>Exam days show "EXAM" instead of regular subjects</li>
                  <li>After exam dates, normal schedule resumes</li>
                  <li>You can set different exam times and subjects</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Group classes by grade and show selection grid if no class is selected
  const classGroups = classes.reduce((groups, cls) => {
    if (cls.academicYear !== selectedAcademicYear) return groups;
    const grade = cls.className;
    if (!groups[grade]) groups[grade] = [];
    groups[grade].push(cls);
    return groups;
  }, {});

  if (!selectedClass && !classId) {
    const filteredByGrade = grade ? (classGroups[grade] || []) : null;
    
    console.log('Time Management Debug:', {
      grade,
      classId,
      selectedClass,
      classGroups,
      filteredByGrade,
      classes: classes.length
    });
    
    return (
      <div className="time-management-container">
        <div className="content-card">
          <div className="class-management-header">
            <div>
              <h2>Time Management{grade ? `: Grade ${grade}` : ''}</h2>
              {!grade && <p>Select a class to view or edit the timetable</p>}
            </div>
            <div className="header-actions">
              <div className="academic-year-info">
                <span>Academic Year: {selectedAcademicYear}</span>
              </div>
            </div>
          </div>

          {grade ? (
            <div className="grade-section">
              <h3>Classes for Grade {grade}</h3>
              <div className="class-boxes horizontal">
                {filteredByGrade && filteredByGrade.length > 0 ? (
                  filteredByGrade.map(cls => (
                    <div 
                      key={`${cls.classId}-${cls.section}`}
                      className="class-box"
                      style={{
                        padding: '20px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        width: '250px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        marginBottom: '10px',
                        marginRight: '16px',
                        minWidth: '240px',
                        flex: '0 0 auto',
                      }}
                      onClick={() => handleClassBoxClick(cls)}
                    >
                      <div style={{ position: 'relative' }}>
                        <span className="ay-badge">{cls.academicYear}</span>
                        <h4 style={{ fontSize: '1.2em', marginBottom: '10px', color: '#3498db' }}>{cls.className} {cls.section}</h4>
                      </div>
                      <div className="class-info" style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
                        {cls.maxStudents && <p style={{ marginBottom: '5px' }}>Max Students: {cls.maxStudents}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-classes-message">
                    <p>No classes found for Grade {grade}</p>
                    <p>Available grades: {Object.keys(classGroups).join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            Object.keys(classGroups).map(gr => (
              <div key={gr} className="grade-section">
                <h3>Grade {gr}</h3>
                <div className="class-boxes horizontal">
                  {classGroups[gr].map(cls => (
                    <div 
                      key={`${cls.classId}-${cls.section}`}
                      className="class-box"
                      style={{
                        padding: '20px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        width: '250px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        marginBottom: '10px',
                        marginRight: '16px',
                        minWidth: '240px',
                        flex: '0 0 auto',
                      }}
                      onClick={() => handleClassBoxClick(cls)}
                    >
                      <div style={{ position: 'relative' }}>
                        <span className="ay-badge">{cls.academicYear}</span>
                        <h4 style={{ fontSize: '1.2em', marginBottom: '10px', color: '#3498db' }}>{cls.className} {cls.section}</h4>
                      </div>
                      <div className="class-info" style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
                        {cls.maxStudents && <p style={{ marginBottom: '5px' }}>Max Students: {cls.maxStudents}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="time-management-container">
      <div className="content-card">
        {selectedClass ? (
          <>
            {renderClassHeader()}
            
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
                  onClick={() => setActiveTab('schedule')}
                >
                  Class Schedule
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
                  onClick={() => setActiveTab('events')}
                >
                  Events & Exams
                </button>
              </li>
            </ul>

            <div className="tab-content">
              {activeTab === 'schedule' && (
                <div className="tab-pane fade show active">
                  {renderScheduleGrid()}
                </div>
              )}
              
              {activeTab === 'events' && (
                <div className="tab-pane fade show active">
                  {renderEventsTab()}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="class-management-header">
            <div>
              <h2>Time Management</h2>
              <p>Select a class to view or edit the timetable</p>
            </div>
            <div className="header-actions">
              <div className="academic-year-info">
                <span>Academic Year: {selectedAcademicYear}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {renderScheduleModal()}
    </div>
  );
};

export default TimeManagement;
