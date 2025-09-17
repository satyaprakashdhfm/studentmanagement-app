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
  const [weekDates, setWeekDates] = useState([]);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, +1 = next week, -1 = previous week
  
  // Tab management state
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule', 'exams', 'holidays'
  
  // Exam scheduling state
  const [showExamModal, setShowExamModal] = useState(false);
  const [examType, setExamType] = useState(null); // '2_per_day' or '1_per_day'
  const [examForm, setExamForm] = useState({
    numberOfDays: '',
    startDate: '',
    classId: ''
  });
  const [examSessions, setExamSessions] = useState([]);
  const [showSessionsGrid, setShowSessionsGrid] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  
  // Holiday management state
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    startDate: '',
    endDate: '',
    holidayName: '',
    description: '',
    type: 'general',
    duration: 'full-day', // full-day, half-day
    classId: ''
  });

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

  // Fetch schedule data from calendar grid
  const fetchSchedule = async () => {
    if (!selectedClass) return;

    try {
      setLoading(true);
      setError(null);

      console.log('📅 Fetching calendar week schedule for class:', selectedClass.classId, 'academic year:', selectedAcademicYear, 'week offset:', currentWeekOffset);

      const response = await apiService.getCalendarWeekSchedule(
        selectedClass.classId,
        selectedAcademicYear,
        currentWeekOffset
      );

      console.log('📊 Calendar week API response:', response);

      if (response && response.data) {
        console.log('📅 Calendar week data received:', response.data.length, 'days');
        console.log('📅 Week info:', response.weekInfo);
        
        // Set the schedule data
        setSchedule(response.data);
        
        // Extract week dates for headers
        const dates = response.data.map(dayData => {
          const date = new Date(dayData.calendar_date);
          // Format as DD/MM/YY
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          return {
            dayName: dayData.day_name || dayNames[dayData.day_of_week - 1],
            date: date,
            formatted: `${day}/${month}/${year}`
          };
        });
        setWeekDates(dates);
        
        console.log('📊 Schedule state updated with calendar data, week dates:', dates);
      } else {
        console.log('📅 No calendar data received');
        setSchedule([]);
        setWeekDates([]);
      }
    } catch (error) {
      console.error('❌ Error fetching calendar schedule:', error);
      setError('Failed to load calendar week data');
      setSchedule([]);
      setWeekDates([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch upcoming exams for the selected class
  const fetchUpcomingExams = async () => {
    try {
      console.log('📚 Fetching upcoming exams for class:', selectedClass?.classId);
      
      if (selectedClass) {
        const response = await apiService.get(`/timemanagement/upcoming-exams/${selectedClass.classId}`);
        
        if (response && response.data) {
          console.log('📚 Upcoming exams received:', response.data);
          setUpcomingExams(response.data);
        } else {
          setUpcomingExams([]);
        }
      } else {
        setUpcomingExams([]);
      }
    } catch (error) {
      console.error('❌ Error fetching upcoming exams:', error);
      setUpcomingExams([]);
    }
  };

  // Fetch upcoming holidays for the selected class
  const fetchUpcomingHolidays = async () => {
    try {
      console.log('🏖️ Fetching upcoming holidays for class:', selectedClass?.classId);
      
      if (selectedClass) {
        const response = await apiService.get(`/timemanagement/upcoming-holidays/${selectedClass.classId}`);
        
        if (response && response.data) {
          console.log('🏖️ Upcoming holidays received:', response.data);
          setUpcomingHolidays(response.data);
        } else {
          setUpcomingHolidays([]);
        }
      } else {
        setUpcomingHolidays([]);
      }
    } catch (error) {
      console.error('❌ Error fetching upcoming holidays:', error);
      setUpcomingHolidays([]);
    }
  };

  // Clear data when navigation parameters change
  useEffect(() => {
    console.log('🎯 Navigation params changed - clearing schedule data');
    setSchedule([]);
    setError(null);
    setWeekDates([]);
    setCurrentWeekOffset(0); // Reset to current week when navigating
  }, [classId, section, grade]);

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
    } else if (!classId) {
      console.log('❌ No classId - resetting selectedClass');
      setSelectedClass(null); // Reset selectedClass when no classId
    }
  }, [classId, section, effectiveClasses, selectedAcademicYear, classes.length, localLoading, localClasses.length]);

  // Fetch schedule when selected class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSchedule();
      fetchUpcomingExams();
      fetchUpcomingHolidays();
    }
  }, [selectedClass]);

  // Fetch schedule when week offset changes
  useEffect(() => {
    if (selectedClass) {
      fetchSchedule();
    }
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

  // Format week display
  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return 'Current Week';
    if (currentWeekOffset === 1) return 'Next Week';
    if (currentWeekOffset === -1) return 'Previous Week';
    if (currentWeekOffset > 1) return `${currentWeekOffset} Weeks Ahead`;
    return `${Math.abs(currentWeekOffset)} Weeks Ago`;
  };

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

  // Find schedule item for specific day and time from calendar data
  const findScheduleItem = (dayIndex, startTime, endTime) => {
    if (!schedule.length || dayIndex >= schedule.length) return null;

    const dayData = schedule[dayIndex]; // Use array index instead of day_of_week
    if (!dayData) return null;



    // Normalize time comparison - handle different formats
    const normalizeTime = (time) => {
      if (!time) return '';
      if (typeof time === 'string') {
        // If it's an ISO string like "1970-01-01T09:00:00.000Z", extract time part
        if (time.includes('T')) {
          return time.split('T')[1].substring(0, 5); // HH:MM
        }
        // If it's already HH:MM:SS format
        if (time.length === 8) return time.substring(0, 5); // HH:MM
        // If it's HH:MM format
        if (time.length === 5) return time;
        return time;
      }
      // If it's a Date object, format it to HH:MM
      if (time instanceof Date) {
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return String(time);
    };

    const searchStartTime = normalizeTime(startTime);
    const searchEndTime = normalizeTime(endTime);

    // Search in morning slots
    if (dayData.morning_slots) {
      for (const slot of dayData.morning_slots) {
        // First check for lunch breaks (highest priority)
        if (slot.includes('LUNCH_')) {
          // Handle complex format: "242508001_1_P1_1140_1220_LUNCH_242508001_LUNCH"
          if (slot.includes('_P1_') && slot.includes('1140_1220')) {
            const parts = slot.split('_');
            const slotStart = parts[3]; // "1140"
            const slotEnd = parts[4]; // "1220"
            const formattedStart = slotStart.substring(0, 2) + ':' + slotStart.substring(2);
            const formattedEnd = slotEnd.substring(0, 2) + ':' + slotEnd.substring(2);
            
            if (formattedStart === searchStartTime && formattedEnd === searchEndTime) {
              return {
                subjectCode: 'LUNCH',
                teacherId: 'LUNCH',
                startTime: searchStartTime,
                endTime: searchEndTime,
                period: 'LUNCH'
              };
            }
          }
          // Handle simple format: "LUNCH_242510001_LUNCH" (only for lunch time)
          else if (searchStartTime === '11:40' && searchEndTime === '12:20') {
            return {
              subjectCode: 'LUNCH',
              teacherId: 'LUNCH',
              startTime: searchStartTime,
              endTime: searchEndTime,
              period: 'LUNCH'
            };
          }
        }
        // Then check for exam slots (but NOT during lunch time)
        else if (slot.startsWith('EXAM_') && !(searchStartTime === '11:40' && searchEndTime === '12:20')) {
          const parts = slot.split('_');
          if (parts.length >= 3) {
            const subjectCode = parts[1]; // "MATH"
            const sessionType = parts[2]; // "morning", "afternoon", "full_day"
            
            // Only return exam slot if it's not during lunch period
            return {
              subjectCode: subjectCode,
              teacherId: 'EXAM',
              startTime: searchStartTime,
              endTime: searchEndTime,
              period: 'EXAM',
              isExam: true,
              sessionType: sessionType
            };
          }
        } else {
          // Parse regular slot data - format: "242508001_2_P1_0900_0940_rajeshmaths080910_8_MATH"
          const parts = slot.split('_');
          if (parts.length >= 7) {
            const slotStart = parts[3]; // "0900"
            const slotEnd = parts[4]; // "0940"
            const subjectCode = parts[parts.length - 1]; // "MATH"
            const teacherId = parts[5]; // "rajeshmaths080910"
            
            // Format times to HH:MM
            const formattedStart = slotStart.substring(0, 2) + ':' + slotStart.substring(2);
            const formattedEnd = slotEnd.substring(0, 2) + ':' + slotEnd.substring(2);
            
            if (formattedStart === searchStartTime && formattedEnd === searchEndTime) {
              return {
                subjectCode: subjectCode,
                teacherId: teacherId,
                startTime: formattedStart,
                endTime: formattedEnd,
                period: parts[2] // P1, P2, etc.
              };
            }
          }
        }
      }
    }

    // Search in afternoon slots
    if (dayData.afternoon_slots) {
      for (const slot of dayData.afternoon_slots) {
        // Check if this is a lunch break (both formats)
        if (slot.includes('LUNCH_')) {
          // Handle complex format: "242508001_1_P1_1140_1220_LUNCH_242508001_LUNCH"
          if (slot.includes('_P1_') && slot.includes('1140_1220')) {
            const parts = slot.split('_');
            const slotStart = parts[3]; // "1140"
            const slotEnd = parts[4]; // "1220"
            const formattedStart = slotStart.substring(0, 2) + ':' + slotStart.substring(2);
            const formattedEnd = slotEnd.substring(0, 2) + ':' + slotEnd.substring(2);
            
            if (formattedStart === searchStartTime && formattedEnd === searchEndTime) {
              console.log('🍽️ Found complex lunch break in afternoon:', slot, 'at time:', searchStartTime, '-', searchEndTime);
              return {
                subjectCode: 'LUNCH',
                teacherId: 'LUNCH',
                startTime: searchStartTime,
                endTime: searchEndTime,
                period: 'LUNCH'
              };
            }
          }
          // Handle simple format: "LUNCH_242510001_LUNCH" (only for lunch time)
          else if (searchStartTime === '11:40' && searchEndTime === '12:20') {
            console.log('🍽️ Found simple lunch break in afternoon:', slot, 'at time:', searchStartTime, '-', searchEndTime);
            return {
              subjectCode: 'LUNCH',
              teacherId: 'LUNCH',
              startTime: searchStartTime,
              endTime: searchEndTime,
              period: 'LUNCH'
            };
          }
        }
        // Check if this is an exam slot (format: "EXAM_MATH_afternoon")
        else if (slot.startsWith('EXAM_')) {
          const parts = slot.split('_');
          if (parts.length >= 3) {
            const subjectCode = parts[1]; // "MATH"
            const sessionType = parts[2]; // "morning", "afternoon", "full_day"
            
            // Return exam slot data for any afternoon time slot
            return {
              subjectCode: subjectCode,
              teacherId: 'EXAM',
              startTime: searchStartTime,
              endTime: searchEndTime,
              period: 'EXAM',
              isExam: true,
              sessionType: sessionType
            };
          }
        } else {
          // Parse regular slot data
          const parts = slot.split('_');
          if (parts.length >= 7) {
            const slotStart = parts[3];
            const slotEnd = parts[4];
            const subjectCode = parts[parts.length - 1];
            const teacherId = parts[5];
            
            const formattedStart = slotStart.substring(0, 2) + ':' + slotStart.substring(2);
            const formattedEnd = slotEnd.substring(0, 2) + ':' + slotEnd.substring(2);
            
            if (formattedStart === searchStartTime && formattedEnd === searchEndTime) {
              return {
                subjectCode: subjectCode,
                teacherId: teacherId,
                startTime: formattedStart,
                endTime: formattedEnd,
                period: parts[2]
              };
            }
          }
        }
      }
    }

    return null;
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM format
  };

  // Exam scheduling functions
  const handleExamTypeClick = (type) => {
    setExamType(type);
    setShowExamModal(true);
    setExamForm({
      numberOfDays: '',
      startDate: '',
      classId: selectedClass ? selectedClass.classId : ''
    });
  };

  const handleExamFormSubmit = () => {
    const effectiveClassId = selectedClass ? selectedClass.classId : examForm.classId;
    
    if (!examForm.numberOfDays || !examForm.startDate || !effectiveClassId) {
      alert('Please fill in all fields');
      return;
    }
    
    // Update examForm with effective class ID
    if (selectedClass && !examForm.classId) {
      setExamForm(prev => ({...prev, classId: selectedClass.classId}));
    }
    
    // Generate exam sessions based on form data
    generateExamSessions();
    setShowExamModal(false);
    setShowSessionsGrid(true);
  };

  const generateExamSessions = () => {
    const sessions = [];
    const startDate = new Date(examForm.startDate);
    const numberOfDays = parseInt(examForm.numberOfDays);
    const effectiveClassId = selectedClass ? selectedClass.classId : examForm.classId;
    
    for (let i = 0; i < numberOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (examType === '2_per_day') {
        sessions.push({
          id: `${effectiveClassId}_${dateStr}_morning`,
          date: dateStr,
          session: 'morning',
          subjectCode: '',
          classId: effectiveClassId
        });
        sessions.push({
          id: `${effectiveClassId}_${dateStr}_afternoon`,
          date: dateStr,
          session: 'afternoon',
          subjectCode: '',
          classId: effectiveClassId
        });
      } else {
        sessions.push({
          id: `${effectiveClassId}_${dateStr}_full_day`,
          date: dateStr,
          session: 'full_day',
          subjectCode: '',
          classId: effectiveClassId
        });
      }
    }
    
    setExamSessions(sessions);
  };

  const handleSessionSubjectChange = (sessionId, subjectCode) => {
    setExamSessions(prev => prev.map(session => 
      session.id === sessionId ? {...session, subjectCode} : session
    ));
  };

  const saveExamSchedule = async () => {
    try {
      // Validate all sessions have subjects
      const incompleteSessions = examSessions.filter(session => !session.subjectCode);
      if (incompleteSessions.length > 0) {
        alert('Please select subjects for all exam sessions');
        return;
      }

      setLoading(true);
      console.log('💾 Saving exam schedule to database:', examSessions);

      // Prepare exam data for API
      const examData = {
        examType,
        examSessions,
        academicYear: selectedAcademicYear
      };

      // Call API to save exam schedule
      const response = await apiService.saveExamSchedule(examData);
      
      console.log('✅ Exam schedule saved successfully:', response);
      alert(`Exam schedule saved successfully! ${response.totalSessions} sessions created.`);
      
      // Reset form and refresh schedule if class is selected
      setShowSessionsGrid(false);
      setExamSessions([]);
      
      // Refresh the schedule to show exams in calendar and update upcoming exams table
      if (selectedClass) {
        await fetchSchedule();
      }
      await fetchUpcomingExams();
      
    } catch (error) {
      console.error('❌ Error saving exam schedule:', error);
      alert('Error saving exam schedule: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Holiday scheduling functions
  const handleHolidayClick = () => {
    setShowHolidayModal(true);
    setHolidayForm({
      startDate: '',
      endDate: '',
      holidayName: '',
      description: '',
      type: 'general',
      duration: 'full-day',
      classId: selectedClass ? selectedClass.classId : ''
    });
  };

  const handleHolidayFormSubmit = () => {
    const effectiveClassId = selectedClass ? selectedClass.classId : holidayForm.classId;
    
    if (!holidayForm.startDate || !holidayForm.endDate || !holidayForm.holidayName || !effectiveClassId) {
      alert('Please fill in all required fields (Start Date, End Date, Holiday Name)');
      return;
    }
    
    // Validate that end date is not before start date
    if (new Date(holidayForm.endDate) < new Date(holidayForm.startDate)) {
      alert('End date cannot be before start date');
      return;
    }
    
    // Update holidayForm with effective class ID
    if (selectedClass && !holidayForm.classId) {
      setHolidayForm(prev => ({...prev, classId: selectedClass.classId}));
    }
    
    saveHolidaySchedule();
    setShowHolidayModal(false);
  };

  const saveHolidaySchedule = async () => {
    try {
      setLoading(true);
      console.log('🏖️ Saving holiday schedule to database:', holidayForm);

      const effectiveClassId = selectedClass ? selectedClass.classId : holidayForm.classId;
      
      // Prepare holiday data for API
      const holidayData = {
        startDate: holidayForm.startDate,
        endDate: holidayForm.endDate,
        holidayName: holidayForm.holidayName,
        description: holidayForm.description,
        type: holidayForm.type,
        duration: holidayForm.duration,
        classId: effectiveClassId,
        academicYear: selectedAcademicYear
      };

      // Call API to save holiday schedule
      const response = await apiService.post('/timemanagement/holidays', holidayData);
      
      console.log('✅ Holiday schedule saved successfully:', response);
      alert(`Holiday "${holidayForm.holidayName}" scheduled successfully!`);
      
      // Reset form and refresh data
      setHolidayForm({
        startDate: '',
        endDate: '',
        holidayName: '',
        description: '',
        type: 'general',
        duration: 'full-day',
        classId: selectedClass ? selectedClass.classId : ''
      });
      
      // Refresh the schedule to show holidays in calendar and update upcoming holidays table
      if (selectedClass) {
        await fetchSchedule();
      }
      await fetchUpcomingHolidays();
      
    } catch (error) {
      console.error('❌ Error saving holiday schedule:', error);
      alert('Error saving holiday schedule: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.holidayName || !holidayForm.startDate) {
      alert('Please fill in holiday name and start date');
      return;
    }

    try {
      setLoading(true);
      console.log('🏖️ Adding holiday:', holidayForm);

      const holidayData = {
        holidayName: holidayForm.holidayName,
        startDate: holidayForm.startDate,
        endDate: holidayForm.endDate || holidayForm.startDate,
        description: holidayForm.description,
        type: holidayForm.type || 'general',
        academicYear: selectedAcademicYear
      };

      const response = await apiService.post('/timemanagement/holidays', holidayData);
      
      console.log('✅ Holiday added successfully:', response);
      alert(`Holiday "${holidayForm.holidayName}" added successfully!`);
      
      // Reset form and refresh data
      setShowHolidayModal(false);
      setHolidayForm({
        startDate: '',
        endDate: '',
        holidayName: '',
        description: '',
        type: 'general'
      });
      
      await fetchUpcomingHolidays();
      
    } catch (error) {
      console.error('❌ Error adding holiday:', error);
      alert('Error adding holiday: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHoliday = async () => {
    if (!editingHoliday.name || !editingHoliday.date) {
      alert('Please fill in holiday name and date');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Updating holiday:', editingHoliday);

      const holidayData = {
        holidayName: editingHoliday.name,
        startDate: new Date(editingHoliday.date).toISOString().split('T')[0],
        description: editingHoliday.description,
        type: editingHoliday.type || 'general'
      };

      const response = await apiService.put(`/timemanagement/holiday/${editingHoliday.id}`, holidayData);
      
      console.log('✅ Holiday updated successfully:', response);
      alert('Holiday updated successfully!');
      
      setEditingHoliday(null);
      await fetchUpcomingHolidays();
      
    } catch (error) {
      console.error('❌ Error updating holiday:', error);
      alert('Error updating holiday: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🗑️ Deleting holiday:', holidayId);

      const response = await apiService.delete(`/timemanagement/holiday/${holidayId}`);
      
      console.log('✅ Holiday deleted successfully:', response);
      alert('Holiday deleted successfully!');
      
      await fetchUpcomingHolidays();
      
    } catch (error) {
      console.error('❌ Error deleting holiday:', error);
      alert('Error deleting holiday: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
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

      {/* Tab Navigation - Only show when a specific class is selected */}
      {selectedClass && (
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            SCHEDULE
          </button>
          <button 
            className={`tab-btn ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
          >
            EXAMS
          </button>
          <button 
            className={`tab-btn ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => setActiveTab('holidays')}
          >
            HOLIDAYS
          </button>
        </div>
      )}

      <div className="tab-content">
        {/* Schedule Tab Content */}
        {activeTab === 'schedule' && (
          <>
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
                        className={`class-card ${!cls.active ? 'deactivated' : ''}`}
                        onClick={() => navigate(`/admin/time-management/${cls.classId}/${cls.section}`)}
                      >
                        <div className="class-name">
                          {cls.className}
                          {!cls.active && <span className="deactivated-badge">DEACTIVATED</span>}
                        </div>
                        <div className="class-section">Section {cls.section}</div>
                        {!cls.active && (
                          <div className="inactive-notice">⚠️ This class is deactivated</div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Show loading when class is being selected via URL params */}
        {!selectedClass && classId && effectiveClasses.length === 0 && (effectiveLoading || localLoading) && (
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
                  <div className="schedule-title-section">
                    <h3>Weekly Schedule - Class {selectedClass.className} {selectedClass.section}</h3>
                    <div className="week-info">
                      <span className="week-label">{getWeekLabel()}</span>
                    </div>
                  </div>
                  
                  <div className="schedule-controls">
                    <div className="week-navigation">
                      <button 
                        className="week-nav-btn prev-btn" 
                        onClick={goToPreviousWeek}
                        disabled={loading}
                      >
                        ◀ Previous Week
                      </button>
                      
                      {currentWeekOffset !== 0 && (
                        <button 
                          className="week-nav-btn current-btn" 
                          onClick={goToCurrentWeek}
                          disabled={loading}
                        >
                          Current Week
                        </button>
                      )}
                      
                      <button 
                        className="week-nav-btn next-btn" 
                        onClick={goToNextWeek}
                        disabled={loading}
                      >
                        Next Week ▶
                      </button>
                    </div>
                    
                    <div className="schedule-stats">
                      {schedule.length > 0 && (
                        <span>{schedule.length} days scheduled</span>
                      )}
                    </div>
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
                      {weekDates.length > 0 ? weekDates.map((dateInfo, dayIndex) => (
                        <tr key={dayIndex}>
                          <td className="day-cell">
                            <div className="day-name">{dateInfo.dayName}</div>
                            <div className="day-date">({dateInfo.formatted})</div>
                          </td>
                          {timeSlots.map((slot, slotIndex) => {
                            const scheduleItem = findScheduleItem(dayIndex, slot.start_time, slot.end_time);
                            const dayData = schedule[dayIndex];
                            const isHoliday = dayData && dayData.holiday_name;
                            const isHalfHoliday = dayData && dayData.day_type === 'half_holiday';

                            return (
                              <td key={slotIndex} className="period-cell">
                                {/* Check if this entire day is a holiday first */}
                                {isHoliday ? (
                                  <div className={`schedule-item ${isHalfHoliday ? 'half-holiday-slot' : 'holiday-slot'}`}>
                                    <div className="holiday-label">
                                      {isHalfHoliday ? 'HALF HOLIDAY' : 'HOLIDAY'}
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
                                    const isExamSlot = scheduleItem.isExam || (scheduleItem.teacherId === 'EXAM');
                                    
                                    if (isExamSlot) {
                                      // Get exam details
                                      const examSubject = scheduleItem.subjectCode || 'Unknown';
                                      const examSession = scheduleItem.sessionType || 'exam';
                                      
                                      return (
                                        <div className="schedule-item exam-slot">
                                          <div className="exam-label">EXAM</div>
                                          <div className="exam-subject">{subjectNames[examSubject] || examSubject}</div>
                                        </div>
                                      );
                                    }
                                    
                                    // Regular class schedule item
                                    return (
                                      <div className={`schedule-item ${getSubjectClass(scheduleItem.subjectCode)} ${
                                        scheduleItem.subjectCode === 'STUDY' ? 'study-period' :
                                        scheduleItem.subjectCode === 'LUNCH' ? 'lunch-break' : ''
                                      }`}>
                                        <div className="subject-name">
                                          {subjectNames[scheduleItem.subjectCode] || scheduleItem.subjectCode || 'Unknown Subject'}
                                        </div>
                                        <div className="teacher-name">
                                          {scheduleItem.teacherId && scheduleItem.teacherId.includes('LUNCH')
                                            ? 'Lunch Break'
                                            : scheduleItem.teacherId || 'No Teacher'}
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="empty-slot">
                                    <span>-</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )) : dayNames.map((day, dayIndex) => (
                        <tr key={day}>
                          <td className="day-cell">{day}</td>
                          {timeSlots.map((slot, slotIndex) => (
                            <td key={slotIndex} className="period-cell">
                              <div className="empty-slot">Loading...</div>
                            </td>
                          ))}
                        </tr>
                      ))}
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
          </>
        )}
        
        {/* Exams Tab Content */}
        {activeTab === 'exams' && (
          <div className="exams-content">
            {/* Upcoming Exams Table */}
            <div className="upcoming-exams-section" style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, color: '#495057' }}>
                  📚 Upcoming Exams {selectedClass ? `- ${selectedClass.grade} ${selectedClass.section}` : ''}
                </h3>
              </div>
                
                {upcomingExams.length > 0 ? (
                  <div className="upcoming-exams-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#667eea', color: 'white' }}>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Day</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Session Type</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Subjects</th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Total</th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingExams.map((exam, index) => (
                          <tr key={exam.id} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                            <td style={{ padding: '15px', fontWeight: '500' }}>
                              {new Date(exam.date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td style={{ padding: '15px' }}>{exam.dayName}</td>
                            <td style={{ padding: '15px' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem', 
                                fontWeight: '500',
                                backgroundColor: exam.examType === '2_per_day' ? '#e3f2fd' : '#f3e5f5',
                                color: exam.examType === '2_per_day' ? '#1565c0' : '#7b1fa2'
                              }}>
                                {exam.examType === '2_per_day' ? '2 Per Day' : '1 Per Day'}
                                {exam.examSession && ` - ${exam.examSession}`}
                              </span>
                            </td>
                            <td style={{ padding: '15px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {exam.examDetails.map((detail, idx) => (
                                  <span key={idx} style={{
                                    padding: '2px 6px',
                                    backgroundColor: '#e9ecef',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    color: '#495057'
                                  }}>
                                    {detail.subjectName}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#667eea' }}>
                              {exam.totalSubjects}
                            </td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                              <button
                                onClick={() => setEditingExam(exam)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  fontWeight: '500',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                              >
                                ✏️ Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📅</div>
                    <h4 style={{ marginBottom: '10px', color: '#495057' }}>No Upcoming Exams</h4>
                    <p>No exam schedules found for this class. Create an exam schedule below.</p>
                  </div>
                )}
              </div>
            
            {!showSessionsGrid ? (
              selectedClass ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <h3>Exam Schedule Management</h3>
                  <div style={{ 
                    marginBottom: '20px', 
                    padding: '10px 20px', 
                    backgroundColor: '#e8f4fd', 
                    borderRadius: '8px', 
                    border: '2px solid #667eea',
                    display: 'inline-block'
                  }}>
                    <span style={{ color: '#495057', fontSize: '0.9rem' }}>Creating exam schedule for: </span>
                    <strong style={{ color: '#667eea', fontSize: '1.1rem' }}>
                      {selectedClass.grade} {selectedClass.section}
                    </strong>
                  </div>
                  <p style={{ marginBottom: '40px', color: '#6c757d' }}>
                    Choose the type of exam schedule you want to create
                  </p>
                
                  <div className="exam-type-buttons" style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button 
                    className="exam-type-btn"
                    onClick={() => handleExamTypeClick('2_per_day')}
                    style={{
                      padding: '20px 30px',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minWidth: '250px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    📅 Schedule 2 Exams Per Day
                    <div style={{ fontSize: '0.9rem', fontWeight: '400', marginTop: '8px', opacity: '0.9' }}>
                      Morning & Afternoon Sessions
                    </div>
                  </button>
                  
                  <button 
                    className="exam-type-btn"
                    onClick={() => handleExamTypeClick('1_per_day')}
                    style={{
                      padding: '20px 30px',
                      backgroundColor: '#764ba2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minWidth: '250px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    📖 Schedule 1 Exam Per Day
                    <div style={{ fontSize: '0.9rem', fontWeight: '400', marginTop: '8px', opacity: '0.9' }}>
                      Full Day Sessions
                    </div>
                  </button>
                </div>
              </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏫</div>
                  <h3 style={{ color: '#6c757d', marginBottom: '15px' }}>Select a Class First</h3>
                  <p style={{ color: '#6c757d' }}>
                    Please select a class from the sidebar to create exam schedules.
                  </p>
                </div>
              )
            ) : (
              <div className="exam-sessions-grid" style={{ padding: '20px' }}>
                <h3>Configure Exam Sessions</h3>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>Exam Type:</strong> {examType === '2_per_day' ? '2 Exams Per Day' : '1 Exam Per Day'} | 
                  <strong> Days:</strong> {examForm.numberOfDays} | 
                  <strong> Start Date:</strong> {examForm.startDate}
                </div>
                
                <div className="sessions-grid" style={{ display: 'grid', gap: '15px' }}>
                  {examSessions.map((session, index) => (
                    <div key={session.id} className="session-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 2fr',
                      gap: '15px',
                      padding: '15px',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      alignItems: 'center'
                    }}>
                      <div><strong>{new Date(session.date).toLocaleDateString()}</strong></div>
                      <div style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: session.session === 'morning' ? '#e3f2fd' : session.session === 'afternoon' ? '#fff3e0' : '#f3e5f5',
                        color: session.session === 'morning' ? '#1976d2' : session.session === 'afternoon' ? '#f57c00' : '#7b1fa2',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        {session.session === 'morning' ? '🌅 Morning' : session.session === 'afternoon' ? '🌆 Afternoon' : '📚 Full Day'}
                      </div>
                      <select
                        value={session.subjectCode}
                        onChange={(e) => handleSessionSubjectChange(session.id, e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '6px',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="">Select Subject</option>
                        {/* TODO: Add subject options based on selected class */}
                        <option value="MATH">Mathematics</option>
                        <option value="SCI">Science</option>
                        <option value="ENG">English</option>
                        <option value="SOC">Social Studies</option>
                        <option value="HIN">Hindi</option>
                        <option value="TEL">Telugu</option>
                      </select>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    onClick={() => {setShowSessionsGrid(false); setExamSessions([]);}}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveExamSchedule}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Save Exam Schedule
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Holidays Tab Content */}
        {activeTab === 'holidays' && (
          <div className="holidays-content">
            {/* Upcoming Holidays Table */}
            <div className="upcoming-holidays-section" style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, color: '#495057' }}>
                  🏖️ Upcoming Holidays {selectedClass ? `- ${selectedClass.grade} ${selectedClass.section}` : ''}
                </h3>
              </div>
                
                {upcomingHolidays.length > 0 ? (
                  <div className="upcoming-holidays-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Day</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Holiday Name</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Description</th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingHolidays.map((holiday, index) => (
                          <tr key={holiday.id} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                            <td style={{ padding: '15px', fontWeight: '500' }}>
                              {new Date(holiday.date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td style={{ padding: '15px' }}>{holiday.dayName}</td>
                            <td style={{ padding: '15px', fontWeight: '500', color: '#28a745' }}>
                              {holiday.name}
                            </td>
                            <td style={{ padding: '15px' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem', 
                                fontWeight: '500',
                                backgroundColor: holiday.type === 'national' ? '#dc3545' : 
                                                 holiday.type === 'religious' ? '#6f42c1' :
                                                 holiday.type === 'school' ? '#fd7e14' : '#17a2b8',
                                color: 'white'
                              }}>
                                {holiday.type === 'national' ? '🇮🇳 National' :
                                 holiday.type === 'religious' ? '🕉️ Religious' :
                                 holiday.type === 'school' ? '🏫 School' : '📅 General'}
                              </span>
                            </td>
                            <td style={{ padding: '15px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {holiday.description || 'No description'}
                            </td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => setEditingHoliday(holiday)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                                  onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteHoliday(holiday.id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                                  onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏖️</div>
                    <h4 style={{ marginBottom: '10px', color: '#495057' }}>No Upcoming Holidays</h4>
                    <p>No holidays found in the academic calendar. Add a holiday below.</p>
                  </div>
                )}
              </div>
            
            {/* Add Holiday Section */}
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '20px', color: '#495057' }}>Holiday Management</h3>
              <p style={{ marginBottom: '40px', color: '#6c757d' }}>
                Add new holidays to the academic calendar
              </p>
              
              <button 
                onClick={() => setShowHolidayModal(true)}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.backgroundColor = '#218838';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.backgroundColor = '#28a745';
                }}
              >
                🏖️ Add New Holiday
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exam Form Modal */}
      {showExamModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            minWidth: '500px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ marginBottom: '20px' }}>
              {examType === '2_per_day' ? 'Schedule 2 Exams Per Day' : 'Schedule 1 Exam Per Day'}
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Number of Days:
              </label>
              <input
                type="number"
                value={examForm.numberOfDays}
                onChange={(e) => setExamForm({...examForm, numberOfDays: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                placeholder="Enter number of exam days"
                min="1"
                max="30"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Start Date:
              </label>
              <input
                type="date"
                value={examForm.startDate}
                onChange={(e) => setExamForm({...examForm, startDate: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Class:
              </label>
              {selectedClass ? (
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#e9ecef',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ 
                    backgroundColor: '#667eea', 
                    color: 'white', 
                    padding: '4px 8px', 
                    borderRadius: '12px',
                    fontSize: '0.8rem'
                  }}>
                    Selected
                  </span>
                  {selectedClass.grade} {selectedClass.section}
                </div>
              ) : (
                <select
                  value={examForm.classId}
                  onChange={(e) => setExamForm({...examForm, classId: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Class</option>
                  {effectiveClasses.filter(cls => cls.academicYear === selectedAcademicYear).map(cls => (
                    <option key={cls.classId} value={cls.classId}>
                      {cls.className} - Section {cls.section}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExamModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExamFormSubmit}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Generate Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {editingExam && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            minWidth: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ marginBottom: '25px', textAlign: 'center', color: '#495057' }}>
              ✏️ Edit Exam Schedule
            </h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>Date:</strong>
                <span>{new Date(editingExam.date).toLocaleDateString('en-GB')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>Day:</strong>
                <span>{editingExam.dayName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>Class:</strong>
                <span>{editingExam.className}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Session Type:</strong>
                <span>{editingExam.examType === '2_per_day' ? '2 Per Day' : '1 Per Day'}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '15px', color: '#495057' }}>📚 Exam Subjects</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {editingExam.examDetails.map((detail, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    backgroundColor: '#fff',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{detail.timeSlot}:</strong>
                      <span style={{ marginLeft: '10px', color: '#6c757d' }}>
                        {detail.subjectName}
                      </span>
                    </div>
                    <select
                      value={detail.subject}
                      onChange={(e) => {
                        const newDetails = [...editingExam.examDetails];
                        newDetails[index] = {
                          ...detail,
                          subject: e.target.value,
                          subjectName: subjectNames[e.target.value] || e.target.value
                        };
                        setEditingExam({
                          ...editingExam,
                          examDetails: newDetails
                        });
                      }}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid #dee2e6',
                        borderRadius: '6px',
                        backgroundColor: '#fff',
                        color: '#495057',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="">Select Subject</option>
                      <option value="8_MATH">Mathematics</option>
                      <option value="8_SCI">Science</option>
                      <option value="8_ENG">English</option>
                      <option value="8_SOC">Social Studies</option>
                      <option value="8_HIN">Hindi</option>
                      <option value="8_TEL">Telugu</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingExam(null)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log('💾 Updating exam:', editingExam);
                    
                    const response = await apiService.put(`/timemanagement/exam/${editingExam.id}`, {
                      examDetails: editingExam.examDetails,
                      academicYear: selectedAcademicYear
                    });
                    
                    console.log('✅ Exam updated successfully:', response);
                    alert('Exam schedule updated successfully!');
                    
                    setEditingExam(null);
                    await fetchUpcomingExams();
                    await fetchSchedule();
                    
                  } catch (error) {
                    console.error('❌ Error updating exam:', error);
                    alert('Error updating exam: ' + (error.message || 'Unknown error'));
                  }
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Update Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showHolidayModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            minWidth: '500px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#495057' }}>
              🏖️ Add New Holiday
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Holiday Name:
              </label>
              <input
                type="text"
                value={holidayForm.holidayName}
                onChange={(e) => setHolidayForm({...holidayForm, holidayName: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                placeholder="Enter holiday name"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Start Date:
              </label>
              <input
                type="date"
                value={holidayForm.startDate}
                onChange={(e) => setHolidayForm({...holidayForm, startDate: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                End Date (Optional):
              </label>
              <input
                type="date"
                value={holidayForm.endDate}
                onChange={(e) => setHolidayForm({...holidayForm, endDate: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                placeholder="Leave empty for single day"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Holiday Type:
              </label>
              <select
                value={holidayForm.type || 'general'}
                onChange={(e) => setHolidayForm({...holidayForm, type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              >
                <option value="general">📅 General</option>
                <option value="national">🇮🇳 National</option>
                <option value="religious">🕉️ Religious</option>
                <option value="school">🏫 School</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Holiday Duration:
              </label>
              <select
                value={holidayForm.duration || 'full-day'}
                onChange={(e) => setHolidayForm({...holidayForm, duration: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              >
                <option value="full-day">🌅 Full Day Holiday</option>
                <option value="half-day">🌤️ Half Day Holiday</option>
              </select>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Description (Optional):
              </label>
              <textarea
                value={holidayForm.description}
                onChange={(e) => setHolidayForm({...holidayForm, description: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
                placeholder="Enter holiday description"
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowHolidayModal(false);
                  setHolidayForm({
                    startDate: '',
                    endDate: '',
                    holidayName: '',
                    description: '',
                    type: 'general'
                  });
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddHoliday}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Add Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {editingHoliday && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '30px',
            minWidth: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ marginBottom: '25px', textAlign: 'center', color: '#495057' }}>
              ✏️ Edit Holiday
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Holiday Name:
              </label>
              <input
                type="text"
                value={editingHoliday.name}
                onChange={(e) => setEditingHoliday({...editingHoliday, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                placeholder="Enter holiday name"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Date:
              </label>
              <input
                type="date"
                value={new Date(editingHoliday.date).toISOString().split('T')[0]}
                onChange={(e) => setEditingHoliday({...editingHoliday, date: new Date(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Holiday Type:
              </label>
              <select
                value={editingHoliday.type || 'general'}
                onChange={(e) => setEditingHoliday({...editingHoliday, type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              >
                <option value="general">📅 General</option>
                <option value="national">🇮🇳 National</option>
                <option value="religious">🕉️ Religious</option>
                <option value="school">🏫 School</option>
              </select>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Description:
              </label>
              <textarea
                value={editingHoliday.description || ''}
                onChange={(e) => setEditingHoliday({...editingHoliday, description: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
                placeholder="Enter holiday description"
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingHoliday(null)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateHoliday}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Update Holiday
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .class-card.deactivated {
          background-color: #f8f9fa;
          border: 2px dashed #dc3545;
          opacity: 0.8;
        }
        .class-card.deactivated:hover {
          transform: none;
          box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
        }
        .class-card.deactivated .class-name {
          color: #dc3545;
        }
        .deactivated-badge {
          font-size: 0.7em;
          background: #dc3545;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: 8px;
        }
        .inactive-notice {
          color: #dc3545;
          font-size: 0.85em;
          font-style: italic;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default TimeManagement;
