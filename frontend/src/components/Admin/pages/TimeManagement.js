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
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [examDates, setExamDates] = useState([]);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Subject colors for visual identification - using prefixes for cleaner legend
  const subjectColors = {
    // Subject prefixes with their colors
    'MATH': '#FF6B6B',     // Red for Mathematics
    'ENG': '#FFEAA7',      // Yellow for English
    'SCI': '#81ECEC',      // Teal for Science
    'HIN': '#DDA0DD',      // Purple for Hindi
    'SOC': '#98D8C8',      // Green for Social Science
    'TEL': '#FFA726',      // Orange for Telugu
    
    // Special periods
    'LUNCH': '#A8E6CF',    // Light green for Lunch
    'OPTIONAL': '#FFD3A5',  // Light orange for Optional periods
    'OPT': '#FFD3A5',       // Light orange for Optional periods
    
    // Full subject names for backward compatibility
    'Mathematics': '#FF6B6B',
    'English': '#FFEAA7',
    'Science': '#81ECEC',
    'Hindi': '#DDA0DD',
    'Social Science': '#98D8C8',
    'Social Studies': '#98D8C8',
    'Computer Science': '#6C5CE7',
    'Physics': '#4ECDC4',
    'Chemistry': '#45B7D1',
    'Biology': '#96CEB4',
    'Telugu': '#FFA726',
    'Lunch Break': '#A8E6CF',
    'Optional': '#FFD3A5'
  };

  // Function to get color for a subject (supports both prefix and full name matching)
  const getSubjectColor = (subjectName) => {
    if (!subjectName) return '#f8f9fa';
    
    // First try exact match
    if (subjectColors[subjectName]) {
      return subjectColors[subjectName];
    }
    
    // Then try prefix match (e.g., "MATH Grade 8" -> "MATH")
    const prefix = subjectName.split(' ')[0];
    if (subjectColors[prefix]) {
      return subjectColors[prefix];
    }
    
    // Fallback to default
    return '#f8f9fa';
  };

  // Transform new API data structure to match component expectations
  const transformScheduleData = (apiData) => {
    console.log('🔄 RAW API DATA RECEIVED:', apiData);
    const transformed = [];

    apiData.forEach(scheduleEntry => {
      console.log('🔄 PROCESSING SCHEDULE ENTRY:', scheduleEntry);
      try {

        // The API now returns individual schedule entries with subject/teacher objects
        // No need to parse PostgreSQL arrays - data is already structured

        // Create a consistent slot_id format that matches time slots
        // Use the scheduleId which already contains the slot information
        let consistentSlotId = scheduleEntry.scheduleId;

        // Extract slot name from scheduleId or use subject info
        let slotName = scheduleEntry.subject?.subjectName || scheduleEntry.subject_code || 'Unknown';

        // For lunch and optional periods, use special names
        if (scheduleEntry.subjectCode === 'LUNCH' || scheduleEntry.subject_code === 'LUNCH') {
          slotName = 'Lunch Break';
        } else if (scheduleEntry.subjectCode === 'OPTIONAL' || scheduleEntry.subject_code === 'OPTIONAL' ||
                   scheduleEntry.subjectCode?.includes('OPT') || scheduleEntry.subject_code?.includes('OPT')) {
          slotName = 'Optional';
        }

        const transformedEntry = {
          schedule_id: scheduleEntry.scheduleId,
          day_of_week: scheduleEntry.dayOfWeek, // Keep as-is: 1=Monday, 2=Tuesday, etc.
          slot_id: consistentSlotId,
          slot_name: slotName,
          subject: {
            subject_code: scheduleEntry.subject?.subjectCode || scheduleEntry.subject_code,
            subject_name: scheduleEntry.subject?.subjectName || scheduleEntry.subject_code || 'Unknown'
          },
          teacher: {
            teacher_id: scheduleEntry.teacher?.teacherId || scheduleEntry.teacher_id,
            name: scheduleEntry.teacher?.name || scheduleEntry.teacher_name || 'No Teacher'
          },
          start_time: scheduleEntry.startTime,
          end_time: scheduleEntry.endTime,
          is_active: scheduleEntry.isActive,
          academic_year: scheduleEntry.academicYear,
          class_id: scheduleEntry.classId,
          is_exception: false, // Default to false for now
          exception_type: null
        };

        transformed.push(transformedEntry);
      } catch (error) {
        console.error('Error transforming schedule entry:', error, scheduleEntry);
      }
    });

    return transformed;
  };
  const getLegendSubjects = () => {
    const usedPrefixes = new Set();

    if (schedule && schedule.length > 0) {
      schedule.forEach(item => {
        if (item.subject?.subject_name) {
          const prefix = item.subject.subject_name.split(' ')[0];
          if (subjectColors[prefix]) {
            usedPrefixes.add(prefix);
          }
        } else if (item.subject?.subject_code === 'LUNCH') {
          usedPrefixes.add('LUNCH');
        } else if (item.subject?.subject_code === 'OPTIONAL' || item.subject?.subject_name?.includes('Optional')) {
          usedPrefixes.add('OPTIONAL');
        }
      });
    }

    // If no subjects found in schedule, show all available prefixes
    if (usedPrefixes.size === 0) {
      return ['MATH', 'ENG', 'SCI', 'HIN', 'SOC', 'TEL', 'LUNCH', 'OPTIONAL'];
    }

    return Array.from(usedPrefixes).sort();
  };

  // Format slot time for display. Accepts ISO string or HH:MM:SS; returns HH:MM
  const formatSlotTime = (time) => {
    if (!time) return '';
    try {
      // If time includes a 'T' or is a full ISO timestamp, parse and format as UTC
      if (time.includes('T') || time.includes('-')) {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          // Use UTC methods to avoid timezone conversion
          return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
        }
      }

      // If format is HH:MM:SS or HH:MM, take first 5 chars (HH:MM)
      if (time.length >= 5) {
        return time.substring(0,5);
      }

      return time;
    } catch (err) {
      console.error('Error formatting time:', time, err);
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

  // Fetch schedule when week changes
  useEffect(() => {
    if (selectedClass && currentWeekStart) {
      fetchSchedule();
    }
  }, [currentWeekStart]);

  const fetchTimeSlots = async () => {
    try {
      // For now, use default time slots instead of trying to extract from calendar grid
      // The calendar grid contains date-specific slots, not general class time slots
      console.log('🕐 USING DEFAULT TIME SLOTS FOR CLASS SCHEDULE');
      
      const defaultSlots = [
        { slot_id: 'P1_0900_0940', simple_slot_id: 'P1_0900_0940', slot_name: 'Period 1', start_time: '09:00:00', end_time: '09:40:00' },
        { slot_id: 'P2_0940_1020', simple_slot_id: 'P2_0940_1020', slot_name: 'Period 2', start_time: '09:40:00', end_time: '10:20:00' },
        { slot_id: 'P3_1020_1100', simple_slot_id: 'P3_1020_1100', slot_name: 'Period 3', start_time: '10:20:00', end_time: '11:00:00' },
        { slot_id: 'P4_1100_1140', simple_slot_id: 'P4_1100_1140', slot_name: 'Period 4', start_time: '11:00:00', end_time: '11:40:00' },
        { slot_id: 'LUNCH_1140_1220', simple_slot_id: 'LUNCH_1140_1220', slot_name: 'Lunch Break', start_time: '11:40:00', end_time: '12:20:00' },
        { slot_id: 'P5_1220_1300', simple_slot_id: 'P5_1220_1300', slot_name: 'Period 5', start_time: '12:20:00', end_time: '13:00:00' },
        { slot_id: 'P6_1300_1340', simple_slot_id: 'P6_1300_1340', slot_name: 'Period 6', start_time: '13:00:00', end_time: '13:40:00' },
        { slot_id: 'P7_1340_1420', simple_slot_id: 'P7_1340_1420', slot_name: 'Period 7', start_time: '13:40:00', end_time: '14:20:00' },
        { slot_id: 'P8_1420_1500', simple_slot_id: 'P8_1420_1500', slot_name: 'Period 8', start_time: '14:20:00', end_time: '15:00:00' },
        { slot_id: 'OPT1_1500_1540', simple_slot_id: 'OPT1_1500_1540', slot_name: 'Period 9', start_time: '15:00:00', end_time: '15:40:00' }
      ];
      
      console.log('🕐 DEFAULT TIME SLOTS:', defaultSlots);
      setTimeSlots(defaultSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      // Use default slots as fallback
      const defaultSlots = [
        { slot_id: 'P1_0900_0940', simple_slot_id: 'P1_0900_0940', slot_name: 'Period 1', start_time: '09:00:00', end_time: '09:40:00' },
        { slot_id: 'P2_0940_1020', simple_slot_id: 'P2_0940_1020', slot_name: 'Period 2', start_time: '09:40:00', end_time: '10:20:00' },
        { slot_id: 'P3_1020_1100', simple_slot_id: 'P3_1020_1100', slot_name: 'Period 3', start_time: '10:20:00', end_time: '11:00:00' },
        { slot_id: 'P4_1100_1140', simple_slot_id: 'P4_1100_1140', slot_name: 'Period 4', start_time: '11:00:00', end_time: '11:40:00' },
        { slot_id: 'LUNCH_1140_1220', simple_slot_id: 'LUNCH_1140_1220', slot_name: 'Lunch Break', start_time: '11:40:00', end_time: '12:20:00' },
        { slot_id: 'P5_1220_1300', simple_slot_id: 'P5_1220_1300', slot_name: 'Period 5', start_time: '12:20:00', end_time: '13:00:00' },
        { slot_id: 'P6_1300_1340', simple_slot_id: 'P6_1300_1340', slot_name: 'Period 6', start_time: '13:00:00', end_time: '13:40:00' },
        { slot_id: 'P7_1340_1420', simple_slot_id: 'P7_1340_1420', slot_name: 'Period 7', start_time: '13:40:00', end_time: '14:20:00' },
        { slot_id: 'P8_1420_1500', simple_slot_id: 'P8_1420_1500', slot_name: 'Period 8', start_time: '14:20:00', end_time: '15:00:00' },
        { slot_id: 'OPT1_1500_1540', simple_slot_id: 'OPT1_1500_1540', slot_name: 'Period 9', start_time: '15:00:00', end_time: '15:40:00' }
      ];
      setTimeSlots(defaultSlots);
    }
  };

  // Helper function to extract slot information from slot_id
  const extractSlotInfo = (slotId) => {
    // Handle complex slot_id format from calendar grid
    // Format: {class_id}_{date}_{period}_{start_time}_{end_time}
    // Example: 242508001_2024-06-09 00:00:00+05:30_OPT1_1500_1540
    // Or simpler format: {class_id}_{day_of_week}_{period}_{start_time}_{end_time}
    // Example: 242508001_1_P1_0900_0940

    console.log('🔍 PARSING SLOT_ID:', slotId);

    const parts = slotId.split('_');
    console.log('🔍 SLOT_ID PARTS:', parts);

    if (parts.length >= 5) {
      let period, startTime, endTime;

      // Check if this is the complex format with date
      if (parts.length >= 7 && parts[4] === '00:00:00+05:30') {
        // Complex format: class_id, date, time+tz, period, start, end
        period = parts[5]; // OPT1
        startTime = parts[6]; // 1500
        endTime = parts[7]; // 1540
      } else {
        // Simple format: class_id, day_of_week, period, start, end
        period = parts[2]; // P1, P2, LUNCH, OPT1, etc.
        startTime = parts[3]; // 0900, 0940, etc.
        endTime = parts[4]; // 0940, 1020, etc.
      }

      // Format times: 0900 -> 09:00:00
      const formattedStart = startTime.length === 4 ?
        `${startTime.substring(0,2)}:${startTime.substring(2,4)}:00` : startTime;
      const formattedEnd = endTime.length === 4 ?
        `${endTime.substring(0,2)}:${endTime.substring(2,4)}:00` : endTime;

      // Determine slot name
      let slotName = period;
      if (period === 'LUNCH') {
        slotName = 'Lunch Break';
      } else if (period.startsWith('OPT')) {
        slotName = `Optional ${period.substring(3)}`;
      } else if (period.startsWith('P')) {
        slotName = `Period ${period.substring(1)}`;
      }

      const slotInfo = {
        slot_id: slotId, // Keep original complex slot_id for calendar grid compatibility
        simple_slot_id: `${parts[0]}_${parts[1]}_${period}_${startTime}_${endTime}`, // Create simple version for matching
        slot_name: slotName,
        start_time: formattedStart,
        end_time: formattedEnd
      };

      console.log('🔍 EXTRACTED SLOT INFO:', slotInfo);
      return slotInfo;
    }

    // Fallback for unrecognized format
    console.log('🔍 FALLBACK SLOT INFO FOR:', slotId);
    return {
      slot_id: slotId,
      slot_name: slotId,
      start_time: '00:00:00',
      end_time: '00:00:00'
    };
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      
      // Use currentWeekStart if available, otherwise calculate start of current week (Monday)
      let startDate;
      if (currentWeekStart) {
        startDate = currentWeekStart.toISOString().split('T')[0];
      } else {
        const today = new Date();
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
        startOfWeek.setDate(diff);
        startDate = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      const data = await apiService.getClassSchedule(
        selectedClass.classId,
        selectedAcademicYear
      );
      console.log('📅 SCHEDULE API RESPONSE:', data);
      console.log('📅 SCHEDULE DATA:', data?.data);

      // Transform the new API data structure to match component expectations
      const transformedSchedule = transformScheduleData(data.data || []);
      console.log('📅 TRANSFORMED SCHEDULE:', transformedSchedule);
      console.log('📅 SCHEDULE COUNT:', transformedSchedule.length);
      
      setSchedule(transformedSchedule);
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
      setSubjects(data.subjects || data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]); // Ensure it's always an array
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await apiService.getTeachers();
      console.log('Teachers response:', data); // Debug
      setTeachers(data.teachers || data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]); // Ensure it's always an array
    }
  };

  // Fetch exam dates for the current week
  const fetchExamDates = async () => {
    try {
      const data = await apiService.getCalendarGrid(selectedAcademicYear);
      console.log('📅 CALENDAR GRID DATA:', data);

      // Extract exam dates and holidays from calendar grid
      if (data && data.data) {
        const calendarData = data.data;
        const examAndHolidayDates = [];

        // For now, we'll create some sample exam dates
        // In the future, this should be extracted from the calendar grid JSON data
        const sampleExamDates = [
          '2024-09-15', // Sample exam date
          '2024-09-20', // Sample exam date
          '2024-10-01'  // Sample holiday
        ];

        setExamDates(sampleExamDates);
        console.log('📅 EXTRACTED EXAM/HOLIDAY DATES:', sampleExamDates);
      } else {
        console.log('📅 NO CALENDAR DATA RECEIVED');
        setExamDates([]);
      }
    } catch (error) {
      console.error('Error fetching calendar grid:', error);
      setExamDates([]);
    }
  };

  // Get week dates starting from Monday
  const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dayNumber: date.getDate(),
        isExam: examDates.includes(date.toISOString().split('T')[0])
      });
    }
    
    return dates;
  };

  // Navigate to previous/next week
  const navigateWeek = (direction) => {
    const newStartDate = new Date(currentWeekStart);
    newStartDate.setDate(newStartDate.getDate() + (direction * 7));
    setCurrentWeekStart(newStartDate);
  };

  // Initialize current week start
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    setCurrentWeekStart(startOfWeek);
  }, []);

  // Fetch exam dates when component mounts
  useEffect(() => {
    fetchExamDates();
  }, [selectedAcademicYear]);

  const renderClassHeader = () => {
    if (!selectedClass) return null;
    
    return (
      <div className="class-management-header">
        <div>
          <h2>Time Management: {selectedClass.className} {selectedClass.section}</h2>
          <p>Manage weekly schedule for this class</p>
        </div>
        <div className="header-actions">
          <div className="academic-year-info small">
            <span>AY: {selectedAcademicYear}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    if (!currentWeekStart) return <div>Loading calendar...</div>;

    const weekDates = getWeekDates(currentWeekStart);
    const weekRange = `${weekDates[0].date} to ${weekDates[6].date}`;

    return (
      <div className="calendar-view">
        <div className="calendar-header">
          <div className="calendar-navigation">
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={() => navigateWeek(-1)}
            >
              <i className="fas fa-chevron-left"></i> Previous Week
            </button>
            <h4 className="calendar-title">
              Week of {new Date(currentWeekStart).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </h4>
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={() => navigateWeek(1)}
            >
              Next Week <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {weekDates.map((dayInfo, index) => (
            <div 
              key={dayInfo.date} 
              className={`calendar-day ${dayInfo.isExam ? 'exam-day' : ''}`}
            >
              <div className="day-header">
                <div className="day-name">{dayInfo.dayName}</div>
                <div className="day-number">{dayInfo.dayNumber}</div>
                {dayInfo.isExam && (
                  <div className="exam-indicator">
                    <i className="fas fa-graduation-cap"></i>
                    <span>EXAM</span>
                  </div>
                )}
              </div>
              <div className="day-content">
                {dayInfo.isExam ? (
                  <div className="exam-schedule">
                    <div className="exam-icon">
                      <i className="fas fa-book-open"></i>
                    </div>
                    <div className="exam-details">
                      <h5>Final Exam</h5>
                      <p>All periods scheduled for exams</p>
                      <small>Regular schedule overridden</small>
                    </div>
                  </div>
                ) : (
                  <div className="regular-day">
                    <i className="fas fa-calendar-check"></i>
                    <p>Regular schedule</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color regular"></div>
            <span>Regular Schedule</span>
          </div>
          <div className="legend-item">
            <div className="legend-color exam"></div>
            <span>Exam Day</span>
          </div>
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

    const weekDates = currentWeekStart ? getWeekDates(currentWeekStart) : [];
    const examDays = weekDates.filter(day => day.isExam);

    return (
      <div className="schedule-container">
        {/* Week Navigation and Exam Info */}
        <div className="week-navigation">
          <div className="week-nav-controls">
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={() => navigateWeek(-1)}
            >
              <i className="fas fa-chevron-left"></i> Previous Week
            </button>
            <h5 className="week-title">
              Week of {currentWeekStart ? new Date(currentWeekStart).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              }) : 'Current Week'}
            </h5>
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={() => navigateWeek(1)}
            >
              Next Week <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          
          {examDays.length > 0 && (
            <div className="exam-alert">
              <div className="exam-alert-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <div className="exam-alert-content">
                <strong>Exam Week:</strong> {examDays.map(day => day.dayName).join(', ')} 
                ({examDays.length} exam day{examDays.length > 1 ? 's' : ''})
              </div>
            </div>
          )}
        </div>

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
                  timeSlots.filter(slot => 
                    slot.slot_name !== 'Break'
                  ).length : 0} periods/day
              </span>
              <span className="stat-item">
                <i className="fas fa-utensils"></i> 
                {timeSlots && timeSlots.length > 0 ? 
                  timeSlots.filter(slot => 
                    slot.slot_name === 'Lunch Break' || 
                    slot.slot_name.includes('Lunch') ||
                    slot.slot_name.includes('LUNCH')
                  ).length : 0} lunch period{timeSlots && timeSlots.filter(slot => slot.slot_name === 'Lunch Break' || slot.slot_name.includes('Lunch') || slot.slot_name.includes('LUNCH')).length !== 1 ? 's' : ''}
              </span>
              <span className="stat-item">
                <i className="fas fa-plus-circle"></i> 
                {timeSlots && timeSlots.length > 0 ? 
                  timeSlots.filter(slot => 
                    slot.slot_name.includes('Optional') || 
                    slot.slot_name.includes('OPT') ||
                    slot.slot_name.includes('Optional')
                  ).length : 0} optional period{timeSlots && timeSlots.filter(slot => slot.slot_name.includes('Optional') || slot.slot_name.includes('OPT') || slot.slot_name.includes('Optional')).length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Legend for subjects */}
        <div className="schedule-legend">
          <h6>Subject Legend:</h6>
          <div className="legend-items">
            {getLegendSubjects().map((prefix) => (
              <span key={prefix} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: getSubjectColor(prefix) }}></div>
                {prefix}
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
                    .filter(slot => slot.slot_name !== 'Break')
                    .map(slot => (
                          <th key={slot.slot_id} className={`period-header ${
                            slot.slot_name.includes('Lunch') || slot.slot_name.includes('LUNCH') ? 'lunch-header' :
                            slot.slot_name.includes('Optional') || slot.slot_name.includes('OPT') ? 'optional-header' : ''
                          }`}>
                            <div className="period-title">{slot.slot_name}</div>
                            <div className="period-time">
                              {formatSlotTime(slot.start_time)}{slot.start_time || slot.end_time ? ' - ' : ''}{formatSlotTime(slot.end_time)}
                            </div>
                          </th>
                        ))
                  : 
                  <th colSpan="8" className="period-header">
                    <div className="loading-message">Loading time slots...</div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              {timeSlots && timeSlots.length > 0 ? 
                dayNames.slice(0, 6).map((day, dayIndex) => {
                  const dayOfWeek = dayIndex + 1;
                  const dayDate = weekDates.find(d => d.dayOfWeek === dayOfWeek);
                  const isExamDay = dayDate && dayDate.isExam;
                  
                  return (
                    <tr key={day} className="schedule-row">
                      <td className={`day-cell ${isExamDay ? 'exam-day-header' : ''}`}>
                        <div className="day-name">
                          {day}
                          {isExamDay && <span className="exam-badge">📚</span>}
                        </div>
                      </td>
                      {timeSlots
                        .filter(slot => slot.slot_name !== 'Break')
                        .map(slot => {
                          // Find matching schedule item with flexible slot_id matching
                          const scheduleItem = schedule.find(s => {
                            // Match by day of week and time first (most reliable)
                            const dayMatch = s.day_of_week === (dayIndex + 1); // dayIndex 0-5 -> day_of_week 1-6
                            const timeMatch = s.start_time === slot.start_time && s.end_time === slot.end_time;
                            
                            if (dayMatch && timeMatch) {
                              console.log('✅ FOUND SCHEDULE MATCH:', s, 'for slot:', slot, 'day:', dayIndex + 1);
                              return true;
                            }

                            // Fallback: exact slot_id match
                            if (s.slot_id === slot.slot_id) return true;

                            // Fallback: simple slot_id match
                            if (slot.simple_slot_id && s.slot_id === slot.simple_slot_id) return true;

                            // For lunch/optional periods, match by type and time
                            if ((slot.slot_name === 'Lunch Break' || slot.slot_name.includes('Lunch') || slot.slot_name.includes('LUNCH')) && 
                                (s.subject?.subject_code === 'LUNCH' || s.subject?.subject_name?.toUpperCase().includes('LUNCH'))) {
                              return s.day_of_week === (dayIndex + 1) &&
                                     s.start_time === slot.start_time &&
                                     s.end_time === slot.end_time;
                            }

                            if ((slot.slot_name.includes('Optional') || slot.slot_name.includes('OPT')) && 
                                (s.subject?.subject_code === 'OPTIONAL' || s.subject?.subject_name?.toUpperCase().includes('OPTIONAL'))) {
                              return s.day_of_week === (dayIndex + 1) &&
                                     s.start_time === slot.start_time &&
                                     s.end_time === slot.end_time;
                            }

                            return false;
                          });
                          
                          if (!scheduleItem) {
                            console.log('❌ NO SCHEDULE MATCH for day:', dayIndex + 1, 'slot:', slot, 'available schedule items for this day:', schedule.filter(s => s.day_of_week === (dayIndex + 1)));
                          }
                          
                          return (
                            <td key={`${day}-${slot.slot_id}`} className="period-cell">
                              {scheduleItem ? (
                                <div 
                                  className={`period-content filled ${
                                    scheduleItem.is_exception && scheduleItem.exception_type === 'exam' ? 'exam-slot' : 
                                    scheduleItem.is_exception && scheduleItem.exception_type === 'holiday' ? 'holiday-slot' :
                                    (scheduleItem.subject?.subject_code === 'LUNCH' || scheduleItem.subject?.subject_name?.toUpperCase().includes('LUNCH')) ? 'lunch-period' :
                                    (scheduleItem.subject?.subject_code === 'OPTIONAL' || scheduleItem.subject?.subject_name?.toUpperCase().includes('OPTIONAL')) ? 'optional-period' : ''
                                  }`}
                                  style={{ 
                                    backgroundColor: scheduleItem.is_exception && scheduleItem.exception_type === 'exam' 
                                      ? '#ffeaa7' 
                                      : scheduleItem.is_exception && scheduleItem.exception_type === 'holiday'
                                      ? '#fab1a0'
                                      : getSubjectColor(scheduleItem.subject?.subject_name),
                                    borderLeft: `4px solid ${
                                      scheduleItem.is_exception && scheduleItem.exception_type === 'exam' 
                                      ? '#e17055' 
                                      : scheduleItem.is_exception && scheduleItem.exception_type === 'holiday'
                                      ? '#e84393'
                                      : getSubjectColor(scheduleItem.subject?.subject_name)
                                    }`
                                  }}
                                  onClick={() => handleScheduleClick(day, slot.slot_id, scheduleItem)}
                                >
                                  <div className="subject-name">
                                    {scheduleItem.is_exception && scheduleItem.exception_type === 'exam' 
                                      ? 'EXAM' 
                                      : scheduleItem.is_exception && scheduleItem.exception_type === 'holiday'
                                      ? 'HOLIDAY'
                                      : (scheduleItem.subject?.subject_name || 'Unknown')}
                                  </div>
                                  <div className="teacher-name">
                                    <i className="fas fa-user"></i> {
                                      scheduleItem.is_exception && scheduleItem.exception_type === 'exam'
                                      ? (scheduleItem.exception_title || 'Exam Session')
                                      : scheduleItem.is_exception && scheduleItem.exception_type === 'holiday'
                                      ? (scheduleItem.exception_title || 'Holiday')
                                      : (scheduleItem.teacher?.name || 'No Teacher')
                                    }
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
                  );
                })
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
        subjectId: existingSchedule.subject?.subject_code || '',
        teacherId: existingSchedule.teacher?.teacher_id || '',
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
      // Find the selected slot details
      const selectedSlotData = timeSlots.find(slot => slot.slot_id === selectedSlot);

      // Transform data to match new API structure
      const scheduleData = {
        classId: selectedClass.classId,
        academicYear: selectedAcademicYear,
        dayOfWeek: dayNames.indexOf(selectedDay), // Convert to 0-6 (Sunday-Saturday)
        subjectCode: modalData.subjectId,
        teacherId: modalData.teacherId,
        slotIds: JSON.stringify([selectedSlot]), // Single slot as JSON array
        slotNames: JSON.stringify([selectedSlotData?.slot_name || selectedSlot]),
        startTime: selectedSlotData?.start_time || '09:00:00',
        endTime: selectedSlotData?.end_time || '10:00:00',
        isActive: true,
        room: modalData.room || ''
      };

      console.log('Sending schedule data:', scheduleData); // Debug

      if (modalData.isEdit) {
        await apiService.updateScheduleEntry(modalData.scheduleId, scheduleData);
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
              className="close-btn btn-close-custom"
              aria-label="Close"
              onClick={() => setShowScheduleModal(false)}
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
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
            
            <div className="inner-top-nav">
              <div className={`top-nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Class Schedule</div>
              <div className={`top-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events & Exams</div>
              <div className="top-nav-spacer" />
              <div className="top-actions">
                <button className="btn btn-outline-primary btn-sm me-2"><i className="fas fa-copy"></i> Copy</button>
                <button className="btn btn-outline-success btn-sm me-2" onClick={() => window.print()}><i className="fas fa-print"></i> Print</button>
                <button className="btn btn-outline-info btn-sm"><i className="fas fa-download"></i> Export</button>
              </div>
            </div>

            <div className="tab-content">
              {activeTab === 'schedule' ? renderScheduleGrid() : renderEventsTab()}
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
