import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';
import './TimeManagement.css';

const TimeManagement = () => {
  const { classId, section, grade: rawGrade } = useParams();
  const grade = rawGrade ? decodeURIComponent(rawGrade) : null;
  const navigate = useNavigate();
  const { selectedAcademicYear, classes } = useAcademicYear();

  const [localClasses, setLocalClasses] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Schedule and class state
  const [schedule, setSchedule] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use local classes if available, otherwise use context classes
  const effectiveClasses = localClasses.length > 0 ? localClasses : classes;
  const effectiveLoading = localLoading || loading;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Subject code to name mapping
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

  // Teacher ID to name mapping (restore to fix runtime error)
  const teacherNames = {
    'rajeshmaths080910': 'Rajesh Kumar (Math)',
    'priyasci080910': 'Priya Sharma (Science)',
    'amiteng080910': 'Amit Singh (English)',
    'sunitasoc080910': 'Sunita Patel (Social Studies)',
    'rameshhind080910': 'Ramesh Gupta (Hindi)',
    'lakshmitel080910': 'Lakshmi Reddy (Telugu)'
  };

  // Subject code to CSS class mapping for colors
  const getSubjectClass = (subjectCode) => {
    const classMap = {
      '8_MATH': 'math',
      '8_SCI': 'science',
      '8_ENG': 'english',
      '8_SOC': 'social-studies',
      '8_HIN': 'hindi',
      '8_TEL': 'telugu',
      'STUDY': 'study-period',
      'LUNCH': 'lunch-break'
    };
    return classMap[subjectCode] || '';
  };

  // Time slots for the schedule
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

  // Fetch schedule data
  const fetchSchedule = async () => {
    if (!selectedClass) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching schedule for class:', selectedClass.classId, 'academic year:', selectedAcademicYear);

      const response = await apiService.getClassSchedule(
        selectedClass.classId,
        selectedAcademicYear
      );

      console.log('Schedule API response:', response);

      if (response && response.data) {
        console.log('Schedule data received:', response.data.length, 'entries');
        console.log('Sample schedule item:', response.data[0]);
        setSchedule(response.data);
        console.log('Schedule state updated with', response.data.length, 'items');
      } else {
        console.log('No schedule data received');
        setSchedule([]);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('Failed to load schedule data');
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  // Set selected class when component mounts or params change
  useEffect(() => {
    console.log('🔍 useEffect triggered - classId:', classId, 'section:', section, 'effectiveClasses length:', effectiveClasses.length);
    console.log('🔍 selectedAcademicYear:', selectedAcademicYear);
    console.log('🔍 effectiveClasses data:', effectiveClasses);

    if (classId && effectiveClasses.length > 0) {
      const filteredClasses = effectiveClasses.filter(cls => cls.academicYear === selectedAcademicYear);
      console.log('🔍 filtered classes for academic year:', filteredClasses);

      const foundClass = filteredClasses.find(cls => {
        const idMatch = String(cls.classId) === String(classId);
        console.log('🔍 checking class:', cls.classId, cls.section, 'against:', classId, section, 'idMatch:', idMatch);

        if (section) {
          const sectionMatch = String(cls.section) === String(section);
          console.log('🔍 section match:', sectionMatch);
          return idMatch && sectionMatch;
        }
        return idMatch;
      });

      if (foundClass) {
        console.log('✅ Selected class found:', foundClass);
        setSelectedClass(foundClass);
      } else {
        console.log('❌ Class not found for id:', classId, 'section:', section);
        console.log('❌ Available classes:', filteredClasses.map(cls => ({ id: cls.classId, section: cls.section, grade: cls.grade })));

        // If class not found and we haven't tried local fetching yet, trigger it
        if (classes.length === 0 && !localLoading && localClasses.length === 0) {
          console.log('🔍 Class not found in context, will try local fetching...');
          // Don't reset selectedClass yet - let the local fetching useEffect handle it
        } else {
          setSelectedClass(null); // Reset if class not found and we've exhausted options
        }
      }
    } else if (classId && effectiveClasses.length === 0 && !localLoading) {
      console.log('🔍 classId present but no classes loaded yet, will fetch locally...');
      // Don't set selectedClass to null - let local fetching handle it
    } else {
      console.log('❌ Missing classId or classes not loaded yet - resetting selectedClass');
      setSelectedClass(null); // Reset selectedClass when no classId
    }
  }, [classId, section, effectiveClasses, selectedAcademicYear, classes.length, localLoading, localClasses.length]);

  // Reset selectedClass when grade changes (navigating between grades)
  useEffect(() => {
    console.log('🎯 Grade changed to:', grade, '- resetting selectedClass');
    setSelectedClass(null);
    setSchedule([]); // Also reset schedule data
    setError(null);
  }, [grade]);

  // Fetch schedule when selected class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSchedule();
    }
  }, [selectedClass]);

  // Debug schedule state changes
  useEffect(() => {
    console.log('Schedule state changed:', schedule.length, 'items');
    if (schedule.length > 0) {
      console.log('First schedule item:', schedule[0]);
    }
  }, [schedule]);

  // Debug classes data
  useEffect(() => {
    console.log('🔍 Context classes updated:', classes.length, 'classes');
    console.log('🔍 Local classes:', localClasses.length, 'classes');
    console.log('🔍 Effective classes:', effectiveClasses.length, 'classes');
    if (effectiveClasses.length > 0) {
      console.log('🔍 First few effective classes:', effectiveClasses.slice(0, 3).map(cls => ({
        classId: cls.classId,
        className: cls.className,
        section: cls.section,
        academicYear: cls.academicYear
      })));
    }
  }, [classes, localClasses, effectiveClasses]);

  // Fetch classes if not available or if specific class not found
  useEffect(() => {
    const fetchClassesIfNeeded = async () => {
      const shouldFetchLocally = (
        classes.length === 0 || // No classes in context
        (classId && effectiveClasses.length > 0 && !localLoading && localClasses.length === 0) // Have classId but class not found in current classes
      );

      if (shouldFetchLocally && !localLoading) {
        console.log('🔍 Classes not available or specific class not found, fetching locally...');
        console.log('🔍 Context classes:', classes.length, 'Local classes:', localClasses.length, 'classId:', classId);
        setLocalLoading(true);
        try {
          const response = await apiService.getClasses();
          if (response.classes) {
            // Filter by selected academic year for the local list view
            const filteredByYear = response.classes.filter(
              cls => cls.academicYear === selectedAcademicYear
            );

            // Always try to find the requested class in the full response (no year filter)
            let foundClass = null;
            if (classId) {
              foundClass = response.classes.find(cls => {
                const idMatch = String(cls.classId) === String(classId);
                if (section) return idMatch && String(cls.section) === String(section);
                return idMatch;
              });
            }

            // If we found the requested class, select it immediately (this fixes direct URL entry)
            if (foundClass) {
              console.log('✅ Found requested class after local fetch (no year filter):', foundClass);
              setSelectedClass(foundClass);
              // Ensure localClasses includes the found class so lists will render consistently
              const existsInFiltered = filteredByYear.some(c => String(c.classId) === String(foundClass.classId) && String(c.section) === String(foundClass.section));
              if (!existsInFiltered) {
                setLocalClasses([foundClass, ...filteredByYear]);
              } else {
                setLocalClasses(filteredByYear);
              }
            } else {
              // No specific requested class — just set the local classes filtered by year
              setLocalClasses(filteredByYear);
            }

            console.log('🔍 Fetched local classes (post-process):', filteredByYear.length);
          }
        } catch (error) {
          console.error('Error fetching classes locally:', error);
        } finally {
          setLocalLoading(false);
        }
      }
    };

    fetchClassesIfNeeded();
  }, [classes.length, selectedAcademicYear, localLoading, classId, section, effectiveClasses.length, localClasses.length]);

  // Find schedule item for specific day and time
  const findScheduleItem = (dayOfWeek, startTime, endTime) => {
    // Normalize time comparison - handle different formats
    const normalizeTime = (time) => {
      if (!time) return '';
      if (typeof time === 'string') {
        // If it's an ISO string like "1970-01-01T09:00:00.000Z", extract time part
        if (time.includes('T')) {
          return time.split('T')[1].substring(0, 8); // HH:MM:SS
        }
        // If it's already HH:MM:SS format
        if (time.length === 8) return time;
        // If it's HH:MM format, add seconds
        if (time.length === 5) return time + ':00';
        return time;
      }
      // If it's a Date object, format it to HH:MM:SS
      if (time instanceof Date) {
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        const seconds = time.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      }
      return String(time);
    };

    const searchStartTime = normalizeTime(startTime);
    const searchEndTime = normalizeTime(endTime);

    return schedule.find(item => {
      // Check day of week match
      if (item.dayOfWeek !== dayOfWeek) return false;

      // Check time match
      const itemStartTime = normalizeTime(item.startTime);
      const itemEndTime = normalizeTime(item.endTime);

      return itemStartTime === searchStartTime && itemEndTime === searchEndTime;
    });
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM format
  };

  return (
    <div className="time-management">
      {console.log('🔄 TimeManagement render - grade:', grade, 'classId:', classId, 'classes.length:', classes.length)}
      <div className="class-header">
        <h2>
          Time Management: {
            selectedClass
              ? `${selectedClass.className} ${selectedClass.section}`
              : grade
                ? `${grade} - Select Section`
                : 'Select Class'
          }
        </h2>
        <div className="header-actions">
          <div className="academic-year-info">
            AY: {selectedAcademicYear}
          </div>
        </div>
      </div>

      <div className="tab-content">
        {/* Class Selection when no class is selected */}
        {!selectedClass && !classId && (
          <div className="class-selection">
            {effectiveClasses.length === 0 ? (
              <div className="loading-message">
                Loading classes...
              </div>
            ) : (
              <>
                <h3>
                  {grade
                    ? `Select Section for ${grade}`
                    : 'Select a Class to View Schedule'
                  }
                </h3>
                <div className="class-grid">
                  {(() => {
                    console.log('🔍 Rendering class selection - grade:', grade, 'effectiveClasses:', effectiveClasses.length, 'selectedAcademicYear:', selectedAcademicYear);
                    console.log('🔍 Classes sample:', effectiveClasses.slice(0, 2));
                    // Filter by academic year first
                    const yearFiltered = effectiveClasses.filter(cls => {
                      const yearMatch = cls.academicYear === selectedAcademicYear;
                      console.log('🔍 Class', cls.classId, 'academicYear:', cls.academicYear, 'vs', selectedAcademicYear, '=', yearMatch);
                      return yearMatch;
                    });
                    console.log('🔍 After academic year filter:', yearFiltered.length);
                    
                    const filteredClasses = grade
                      ? yearFiltered.filter(cls => {
                          const match = cls.className === grade;
                          console.log('🔍 Filtering class:', cls.className, 'vs', grade, '=', match);
                          return match;
                        })
                      : yearFiltered;
                    console.log('🔍 Final filtered classes:', filteredClasses.length, filteredClasses.map(cls => `${cls.className} ${cls.section}`));
                    return filteredClasses.map(cls => (
                      <div
                        key={`${cls.classId}-${cls.section}`}
                        className="class-card"
                        onClick={() => navigate(`/admin/time-management/${cls.classId}/${cls.section}`)}
                      >
                        <div className="class-name">{cls.className}</div>
                        <div className="class-section">Section {cls.section}</div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Show loading when class is being selected via URL params */}
        {!selectedClass && classId && (
          <div className="loading-message">
            Loading class information...
          </div>
        )}

        {/* Schedule View when class is selected */}
        {selectedClass && (
          <div className="schedule-tab">
            {effectiveLoading && (
              <div className="loading-message">
                Loading schedule data...
              </div>
            )}

            {error && (
              <div className="error-message" style={{ color: 'red', padding: '10px', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            {!effectiveLoading && !error && (
              <div className="schedule-container">
                <div className="schedule-header">
                  <h3>Weekly Schedule - Class {selectedClass.className} {selectedClass.section}</h3>
                  <div className="schedule-stats">
                    {schedule.length > 0 && (
                      <span>{schedule.length} periods scheduled</span>
                    )}
                  </div>
                </div>

                <div className="table-container">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th className="day-header">Day</th>
                        {timeSlots.map((slot, index) => (
                          <th key={index} className={`period-header ${slot.slot_name === 'Lunch Break' ? 'lunch-header' : ''}`}>
                            <div className="period-title">{slot.slot_name}</div>
                            <div className="period-time">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dayNames.map((day, dayIndex) => {
                        const dayOfWeek = dayIndex + 1; // 1 = Monday, 2 = Tuesday, etc.

                        return (
                          <tr key={day}>
                            <td className="day-cell">{day}</td>
                            {timeSlots.map((slot, slotIndex) => {
                              const scheduleItem = findScheduleItem(dayOfWeek, slot.start_time, slot.end_time);

                              // Debug logging for first few cells
                              if (dayIndex === 0 && slotIndex < 3) {
                                console.log(`Cell [${dayIndex},${slotIndex}] - Day ${dayOfWeek}, Time ${slot.start_time}-${slot.end_time}:`, scheduleItem ? 'HAS DATA' : 'EMPTY');
                              }

                              return (
                                <td key={slotIndex} className="period-cell">
                                  {scheduleItem ? (
                                    <div className={`schedule-item ${getSubjectClass(scheduleItem.subjectCode)} ${
                                      scheduleItem.subjectCode === 'STUDY' ? 'study-period' :
                                      scheduleItem.subjectCode === 'LUNCH' ? 'lunch-break' : ''
                                    }`}>
                                      <div className="subject-name">
                                        {subjectNames[scheduleItem.subjectCode] || scheduleItem.subjectCode || 'Unknown Subject'}
                                      </div>
                                      <div className="teacher-name">
                                        {scheduleItem.teacherId && scheduleItem.teacherId.startsWith('LUNCH_')
                                          ? 'Lunch Break'
                                          : scheduleItem.teacherId
                                            ? teacherNames[scheduleItem.teacherId] || scheduleItem.teacherId
                                            : 'Study Period'
                                        }
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="empty-slot">
                                      <span>-</span>
                                    </div>
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

                {schedule.length === 0 && !effectiveLoading && (
                  <div className="no-data-message">
                    No schedule data found for this class.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeManagement;
