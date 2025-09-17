const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('../utils/jwt');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Helper function to get calendar grid for a specific academic year
const getCalendarGrid = async (academicYear) => {
  return await prisma.calendarGrid.findFirst({
    where: { academicYear }
  });
};

// Helper function to validate schedule data
const validateScheduleData = (data) => {
  const { dayOfWeek, classId, subjectId, teacherId, startTime, endTime, room } = data;

  if (!dayOfWeek || !classId || !subjectId || !teacherId || !startTime || !endTime) {
    throw new Error('Missing required fields: dayOfWeek, classId, subjectId, teacherId, startTime, endTime');
  }

  // Validate dayOfWeek (0-6 for Sunday-Saturday)
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new Error('Time must be in HH:MM format');
  }

  return true;
};

// GET /api/timemanagement/calendar/:academicYear
// Get calendar grid for a specific academic year
router.get('/calendar/:academicYear', authenticateToken, async (req, res) => {
  try {
    const { academicYear } = req.params;

    const calendarGrid = await getCalendarGrid(academicYear);

    if (!calendarGrid) {
      return res.status(404).json({ error: 'Calendar grid not found for this academic year' });
    }

    res.json({
      success: true,
      data: calendarGrid
    });
  } catch (error) {
    console.error('Error fetching calendar grid:', error);
    res.status(500).json({ error: 'Failed to fetch calendar grid' });
  }
});

// GET /api/timemanagement/calendar-slots/:classId/:date
// Get calendar slots for a specific class and date
router.get('/calendar-slots/:classId/:date', authenticateToken, async (req, res) => {
  try {
    const { classId, date } = req.params;
    
    // Convert date to get day of week (1=Monday, 7=Sunday)
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay(); // Convert Sunday from 0 to 7
    
    // Get calendar grid for the specific class and date
    const calendarGrid = await prisma.calendarGrid.findFirst({
      where: {
        classId: parseInt(classId),
        calendarDate: selectedDate
      }
    });

    if (!calendarGrid) {
      return res.status(404).json({ 
        error: 'Calendar grid not found for this class and date',
        classId: parseInt(classId),
        date: date,
        dayOfWeek: dayOfWeek
      });
    }

    // Parse morning and afternoon slots
    const morningSlots = calendarGrid.morningSlots ? JSON.parse(calendarGrid.morningSlots) : [];
    const afternoonSlots = calendarGrid.afternoonSlots ? JSON.parse(calendarGrid.afternoonSlots) : [];
    const allSlots = [...morningSlots, ...afternoonSlots];

    // Get detailed schedule information for each slot
    const slotsWithDetails = await Promise.all(
      allSlots.map(async (scheduleId) => {
        const scheduleData = await prisma.scheduleData.findFirst({
          where: { scheduleId }
        });
        
        return {
          scheduleId,
          ...scheduleData,
          period: scheduleData ? parseInt(scheduleId.split('_')[2].replace('P', '')) : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        classId: parseInt(classId),
        date: date,
        dayOfWeek: dayOfWeek,
        morningSlots: morningSlots,
        afternoonSlots: afternoonSlots,
        allSlots: slotsWithDetails.filter(slot => slot.scheduleId) // Remove any null results
      }
    });
  } catch (error) {
    console.error('Error fetching calendar slots:', error);
    res.status(500).json({ error: 'Failed to fetch calendar slots' });
  }
});

// GET /api/timemanagement/schedule/:academicYear
// Get all schedule data for a specific academic year
router.get('/schedule/:academicYear', authenticateToken, async (req, res) => {
  try {
    const { academicYear } = req.params;

    const schedules = await prisma.scheduleData.findMany({
      where: { academicYear },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    res.status(500).json({ error: 'Failed to fetch schedule data' });
  }
});

// POST /api/timemanagement/schedule
// Create a new schedule entry
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const scheduleData = req.body;

    // Validate the schedule data
    validateScheduleData(scheduleData);

    // Check if calendar grid exists for the academic year
    const calendarGrid = await getCalendarGrid(scheduleData.academicYear);
    if (!calendarGrid) {
      return res.status(404).json({ error: 'Calendar grid not found for this academic year' });
    }

    // Check for teacher conflicts
    const teacherConflict = await prisma.scheduleData.findFirst({
      where: {
        academicYear: scheduleData.academicYear,
        teacherId: scheduleData.teacherId,
        dayOfWeek: scheduleData.dayOfWeek,
        OR: [
          {
            AND: [
              { startTime: { lte: scheduleData.startTime } },
              { endTime: { gt: scheduleData.startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: scheduleData.endTime } },
              { endTime: { gte: scheduleData.endTime } }
            ]
          }
        ]
      }
    });

    if (teacherConflict) {
      return res.status(409).json({
        error: 'Teacher scheduling conflict detected',
        conflict: teacherConflict
      });
    }

    // Create the schedule entry
    const newSchedule = await prisma.scheduleData.create({
      data: scheduleData
    });

    res.status(201).json({
      success: true,
      data: newSchedule,
      message: 'Schedule entry created successfully'
    });
  } catch (error) {
    console.error('Error creating schedule entry:', error);
    if (error.message.includes('Missing required fields') || error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create schedule entry' });
  }
});

// PUT /api/timemanagement/schedule/:id
// Update an existing schedule entry
router.put('/schedule/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate the update data if provided
    if (updateData.dayOfWeek !== undefined || updateData.startTime !== undefined ||
        updateData.endTime !== undefined || updateData.teacherId !== undefined) {
      validateScheduleData({ ...updateData, id });
    }

    // Check if schedule exists
    const existingSchedule = await prisma.scheduleData.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    // If updating teacher or time, check for conflicts
    if (updateData.teacherId || updateData.dayOfWeek || updateData.startTime || updateData.endTime) {
      const checkData = {
        academicYear: updateData.academicYear || existingSchedule.academicYear,
        teacherId: updateData.teacherId || existingSchedule.teacherId,
        dayOfWeek: updateData.dayOfWeek !== undefined ? updateData.dayOfWeek : existingSchedule.dayOfWeek,
        startTime: updateData.startTime || existingSchedule.startTime,
        endTime: updateData.endTime || existingSchedule.endTime
      };

      const conflict = await prisma.scheduleData.findFirst({
        where: {
          academicYear: checkData.academicYear,
          teacherId: checkData.teacherId,
          dayOfWeek: checkData.dayOfWeek,
          id: { not: parseInt(id) }, // Exclude current entry
          OR: [
            {
              AND: [
                { startTime: { lte: checkData.startTime } },
                { endTime: { gt: checkData.startTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: checkData.endTime } },
                { endTime: { gte: checkData.endTime } }
              ]
            }
          ]
        }
      });

      if (conflict) {
        return res.status(409).json({
          error: 'Teacher scheduling conflict detected',
          conflict: conflict
        });
      }
    }

    // Update the schedule entry
    const updatedSchedule = await prisma.scheduleData.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedSchedule,
      message: 'Schedule entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating schedule entry:', error);
    if (error.message.includes('Missing required fields') || error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update schedule entry' });
  }
});

// DELETE /api/timemanagement/schedule/:id
// Delete a schedule entry
router.delete('/schedule/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if schedule exists
    const existingSchedule = await prisma.scheduleData.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    // Delete the schedule entry
    await prisma.scheduleData.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Schedule entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule entry:', error);
    res.status(500).json({ error: 'Failed to delete schedule entry' });
  }
});

// GET /api/timemanagement/teacher-schedule/:teacherId/:academicYear
// Get schedule for a specific teacher in an academic year
router.get('/teacher-schedule/:teacherId/:academicYear', authenticateToken, async (req, res) => {
  try {
    const { teacherId, academicYear } = req.params;

    const schedules = await prisma.scheduleData.findMany({
      where: {
        teacherId: teacherId,
        academicYear
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({ error: 'Failed to fetch teacher schedule' });
  }
});

// GET /api/timemanagement/class-schedule/:classId/:academicYear
// Get schedule for a specific class in an academic year
router.get('/class-schedule/:classId/:academicYear', authenticateToken, async (req, res) => {
  try {
    const { classId, academicYear } = req.params;

    console.log('📅 Fetching class schedule for:', { classId, academicYear });

    // Fetch schedule data without includes (since ScheduleData model doesn't have direct relations)
    const schedules = await prisma.scheduleData.findMany({
      where: {
        classId: parseInt(classId),
        academicYear
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    console.log('📅 Found schedules:', schedules.length);

    // Get unique teacher IDs and subject codes for additional lookups
    const teacherIds = [...new Set(schedules.map(s => s.teacherId).filter(Boolean))];
    const subjectCodes = [...new Set(schedules.map(s => s.subjectCode).filter(Boolean))];

    // Fetch teacher information separately
    const teachers = await prisma.teacher.findMany({
      where: {
        teacherId: { in: teacherIds }
      },
      select: {
        teacherId: true,
        name: true
      }
    });

    // Fetch subject information separately  
    const subjects = await prisma.subject.findMany({
      where: {
        subjectCode: { in: subjectCodes }
      },
      select: {
        subjectCode: true,
        subjectName: true
      }
    });

    // Create lookup maps for efficient data joining
    const teacherMap = {};
    teachers.forEach(teacher => {
      teacherMap[teacher.teacherId] = teacher;
    });

    const subjectMap = {};
    subjects.forEach(subject => {
      subjectMap[subject.subjectCode] = subject;
    });

    // Enhance schedule data with teacher and subject information
    const enhancedSchedules = schedules.map(schedule => ({
      ...schedule,
      teacher: schedule.teacherId ? teacherMap[schedule.teacherId] : null,
      subject: schedule.subjectCode ? subjectMap[schedule.subjectCode] : null
    }));

    console.log('📅 Enhanced schedules ready:', enhancedSchedules.length);

    res.json({
      success: true,
      data: enhancedSchedules
    });
  } catch (error) {
    console.error('Error fetching class schedule:', error);
    res.status(500).json({ error: 'Failed to fetch class schedule' });
  }
});

// GET /api/timemanagement/calendar-week/:classId/:academicYear
// Get week's schedule from calendar grid with real dates (with optional week offset)
router.get('/calendar-week/:classId/:academicYear/:weekOffset?', authenticateToken, async (req, res) => {
  try {
    const { classId, academicYear, weekOffset } = req.params;
    const offset = weekOffset ? parseInt(weekOffset) : 0; // Default to current week (0)
    
    // Get current date and apply week offset
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate the start of the target week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Apply week offset (0 = current week, +1 = next week, -1 = previous week)
    startOfWeek.setDate(startOfWeek.getDate() + (offset * 7));
    
    // Calculate end of week (Friday for school week)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Monday + 4 = Friday
    
    console.log('📅 Fetching calendar week from', startOfWeek.toISOString().split('T')[0], 'to', endOfWeek.toISOString().split('T')[0], 'with offset:', offset);
    
    const calendarData = await prisma.calendarGrid.findMany({
      where: {
        classId: parseInt(classId),
        academicYear,
        calendarDate: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      orderBy: {
        calendarDate: 'asc'
      }
    });
    
    console.log('📊 Found', calendarData.length, 'calendar entries');
    
    // Process the calendar data to extract schedule information
    const weeklySchedule = calendarData.map(day => {
      const morningSlots = day.morningSlots ? JSON.parse(day.morningSlots) : [];
      const afternoonSlots = day.afternoonSlots ? JSON.parse(day.afternoonSlots) : [];
      const allSlots = [...morningSlots, ...afternoonSlots];
      
      // Parse each slot to extract schedule info
      const periods = allSlots.map(slot => {
        // Parse slot format: "242508001_1_P1_0900_0940_rajeshmaths080910_8_MATH"
        const parts = slot.split('_');
        if (parts.length >= 6) {
          const timeStart = parts[3];
          const timeEnd = parts[4]; 
          const teacherId = parts[5];
          const subjectCode = parts.length > 6 ? parts.slice(6).join('_') : '';
          
          return {
            startTime: `${timeStart.substring(0,2)}:${timeStart.substring(2)}:00`,
            endTime: `${timeEnd.substring(0,2)}:${timeEnd.substring(2)}:00`,
            teacherId,
            subjectCode,
            rawSlot: slot
          };
        }
        return null;
      }).filter(Boolean);
      
      return {
        calendar_date: day.calendarDate,
        day_of_week: day.dayOfWeek,
        day_type: day.dayType,
        holiday_name: day.holidayName,
        morning_slots: morningSlots,
        afternoon_slots: afternoonSlots,
        periods
      };
    });
    
    res.json({
      success: true,
      data: weeklySchedule,
      weekInfo: {
        offset: offset,
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        isCurrentWeek: offset === 0,
        weekLabel: offset === 0 ? 'Current Week' : 
                   offset === 1 ? 'Next Week' : 
                   offset === -1 ? 'Previous Week' :
                   offset > 1 ? `${offset} Weeks Ahead` :
                   `${Math.abs(offset)} Weeks Ago`
      },
      // Keep backward compatibility
      weekRange: {
        start: startOfWeek.toISOString().split('T')[0],
        end: endOfWeek.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error fetching calendar week:', error);
    res.status(500).json({ error: 'Failed to fetch calendar week data' });
  }
});

// GET /api/timemanagement/student-calendar-week/:studentId/:academicYear/:weekOffset?
// Get student's weekly calendar based on their class assignment
router.get('/student-calendar-week/:studentId/:academicYear/:weekOffset?', authenticateToken, async (req, res) => {
  try {
    const { studentId, academicYear, weekOffset } = req.params;
    const offset = weekOffset ? parseInt(weekOffset) : 0;
    
    console.log('📚 Fetching student weekly calendar for:', { studentId, academicYear, weekOffset: offset });
    
    // First, get the student's class assignment
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { classId: true, name: true, class: { select: { className: true } } }
    });
    
    if (!student || !student.classId) {
      return res.status(404).json({ error: 'Student not found or not assigned to a class' });
    }
    
    console.log('👦 Student found:', student.name, 'in class:', student.class?.className);
    
    // Use the existing calendar-week logic but for the student's class
    const classId = student.classId;
    
    // Get current date and apply week offset
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate the start of the target week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Apply week offset
    startOfWeek.setDate(startOfWeek.getDate() + (offset * 7));
    
    // Calculate end of week (Friday for school week)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Monday + 4 = Friday
    
    console.log('📅 Student calendar week from', startOfWeek.toISOString().split('T')[0], 'to', endOfWeek.toISOString().split('T')[0]);
    
    const calendarData = await prisma.calendarGrid.findMany({
      where: {
        classId: parseInt(classId),
        academicYear,
        calendarDate: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      orderBy: {
        calendarDate: 'asc'
      }
    });
    
    console.log('📊 Found', calendarData.length, 'calendar entries for student');
    
    // Process the calendar data
    const weeklySchedule = calendarData.map(day => {
      const morningSlots = day.morningSlots ? JSON.parse(day.morningSlots) : [];
      const afternoonSlots = day.afternoonSlots ? JSON.parse(day.afternoonSlots) : [];
      const allSlots = [...morningSlots, ...afternoonSlots];
      
      // Check if this day has exams
      const hasExams = day.examType || day.dayType === 'exam';
      
      // Parse each slot to extract schedule info
      const periods = allSlots.map(slot => {
        const parts = slot.split('_');
        if (parts.length >= 6) {
          const timeStart = parts[3];
          const timeEnd = parts[4]; 
          const teacherId = parts[5];
          let subjectCode = parts.length > 6 ? parts.slice(6).join('_') : '';
          let isExam = false;
          
          // Check if this slot is an exam slot
          if (slot.startsWith('EXAM_')) {
            isExam = true;
            subjectCode = parts[1]; // For EXAM_SUBJECT_... format
          } else if (hasExams && allSlots.some(s => s.startsWith('EXAM_') && s.includes(`_${day.classId}_`))) {
            // If there are exams for this class on this day, check if this period has an exam
            const examSlots = allSlots.filter(s => s.startsWith('EXAM_'));
            const examForThisPeriod = examSlots.find(examSlot => {
              const examParts = examSlot.split('_');
              if (examParts.length >= 5) {
                const examTimeStart = examParts[3];
                return examTimeStart === timeStart && examSlot.includes(`_${day.classId}_`);
              }
              return false;
            });
            if (examForThisPeriod) {
              isExam = true;
              const examParts = examForThisPeriod.split('_');
              subjectCode = examParts[1]; // Subject from exam slot
            }
          }
          
          return {
            startTime: `${timeStart.substring(0,2)}:${timeStart.substring(2)}:00`,
            endTime: `${timeEnd.substring(0,2)}:${timeEnd.substring(2)}:00`,
            teacherId,
            subjectCode,
            rawSlot: slot,
            isExam: isExam
          };
        }
        return null;
      }).filter(Boolean);
      
      return {
        calendar_date: day.calendarDate,
        day_of_week: day.dayOfWeek,
        day_type: day.dayType,
        holiday_name: day.holidayName,
        morning_slots: morningSlots,
        afternoon_slots: afternoonSlots,
        periods
      };
    });
    
    res.json({
      success: true,
      data: weeklySchedule,
      studentInfo: {
        studentId,
        name: student.name,
        classId: student.classId,
        className: student.class?.className
      },
      weekInfo: {
        offset: offset,
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        isCurrentWeek: offset === 0,
        weekLabel: offset === 0 ? 'Current Week' : 
                   offset === 1 ? 'Next Week' : 
                   offset === -1 ? 'Previous Week' :
                   offset > 1 ? `${offset} Weeks Ahead` :
                   `${Math.abs(offset)} Weeks Ago`
      }
    });

  } catch (error) {
    console.error('Error fetching student calendar week:', error);
    res.status(500).json({ error: 'Failed to fetch student calendar week data' });
  }
});

// GET /api/timemanagement/teacher-calendar-week/:teacherId/:academicYear/:weekOffset?
// Get teacher's weekly calendar aggregated from all their assigned classes
router.get('/teacher-calendar-week/:teacherId/:academicYear/:weekOffset?', authenticateToken, async (req, res) => {
  try {
    const { teacherId, academicYear, weekOffset } = req.params;
    const offset = weekOffset ? parseInt(weekOffset) : 0;
    
    console.log('👨‍🏫 Fetching teacher weekly calendar for:', { teacherId, academicYear, weekOffset: offset });
    
    // Get teacher information and their assigned classes
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
      select: { 
        name: true, 
        teacherId: true
      }
    });
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    console.log('👨‍🏫 Teacher found:', teacher.name);
    
    // Get current date and apply week offset
    const today = new Date();
    const currentDay = today.getDay();
    
    // Calculate the start of the target week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Apply week offset
    startOfWeek.setDate(startOfWeek.getDate() + (offset * 7));
    
    // Calculate end of week (Friday for school week)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4);
    
    console.log('📅 Teacher calendar week from', startOfWeek.toISOString().split('T')[0], 'to', endOfWeek.toISOString().split('T')[0]);
    
    // Get ALL calendar entries for the week across ALL classes
    // We'll filter for teacher-specific slots afterward
    const allCalendarData = await prisma.calendarGrid.findMany({
      where: {
        academicYear,
        calendarDate: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      orderBy: [
        { calendarDate: 'asc' },
        { classId: 'asc' }
      ]
    });
    
    console.log('📊 Found', allCalendarData.length, 'total calendar entries to filter');
    
    // Group calendar data by date and filter for teacher's slots
    const teacherWeeklySchedule = [];
    
    // Create a map for each day of the week
    const weekDays = {};
    for (let i = 0; i < 5; i++) { // Monday to Friday
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];
      weekDays[dateKey] = {
        calendar_date: currentDate,
        day_of_week: currentDate.getDay(),
        day_type: 'working',
        holiday_name: null,
        periods: [],
        classes: []
      };
    }
    
    // Process each calendar entry
    allCalendarData.forEach(dayData => {
      const dateKey = dayData.calendarDate.toISOString().split('T')[0];
      
      if (!weekDays[dateKey]) return; // Skip if not in our target week
      
      const morningSlots = dayData.morningSlots ? JSON.parse(dayData.morningSlots) : [];
      const afternoonSlots = dayData.afternoonSlots ? JSON.parse(dayData.afternoonSlots) : [];
      const allSlots = [...morningSlots, ...afternoonSlots];
      
      // Check if this day has exams
      const hasExams = dayData.examType || dayData.dayType === 'exam';
      
      // Filter slots for this specific teacher OR exam slots for classes they teach
      const teacherSlots = allSlots.filter(slot => {
        // Check if it's an exam slot first
        if (slot.startsWith('EXAM_')) {
          // For exam slots, we need to check if this teacher teaches any subject in this class
          // Since exams are class-wide, if teacher has any period in this class, they should see the exams
          return true; // We'll handle teacher filtering at the period level later
        }
        
        // For regular slots, check teacher ID
        const parts = slot.split('_');
        if (parts.length >= 6) {
          const slotTeacherId = parts[5];
          return slotTeacherId === teacherId;
        }
        return false;
      });
      
      // Process teacher's slots for this class
      teacherSlots.forEach(slot => {
        const parts = slot.split('_');
        let isTeacherSlot = false;
        let isExam = false;
        let subjectCode = '';
        let timeStart = '';
        let timeEnd = '';
        
        // Check if this is an exam slot
        if (slot.startsWith('EXAM_')) {
          // EXAM slots format: EXAM_SUBJECT_SESSION_TIME_TIME_...
          if (parts.length >= 5) {
            isExam = true;
            subjectCode = parts[1]; // Subject code
            timeStart = parts[3]; // Start time
            timeEnd = parts[4]; // End time
            
            // Check if this teacher teaches this subject in this class during this time
            // We need to see if teacher has any regular class at this time in this class
            const regularSlots = allSlots.filter(s => !s.startsWith('EXAM_'));
            const teacherHasClassAtThisTime = regularSlots.some(regularSlot => {
              const regularParts = regularSlot.split('_');
              if (regularParts.length >= 6) {
                const regularTeacherId = regularParts[5];
                const regularTimeStart = regularParts[3];
                const regularSubject = regularParts.length > 6 ? regularParts.slice(6).join('_') : '';
                
                return regularTeacherId === teacherId && 
                       regularTimeStart === timeStart && 
                       (regularSubject === subjectCode || regularSubject.includes(subjectCode));
              }
              return false;
            });
            
            // Only include this exam if teacher teaches this subject/time in this class
            isTeacherSlot = teacherHasClassAtThisTime;
          }
        } else {
          // Regular slot format: CLASSID_PERIOD_SLOT_TIME_TIME_TEACHERID_SUBJECT
          if (parts.length >= 6) {
            const slotTeacherId = parts[5];
            if (slotTeacherId === teacherId) {
              isTeacherSlot = true;
              timeStart = parts[3];
              timeEnd = parts[4];
              subjectCode = parts.length > 6 ? parts.slice(6).join('_') : '';
            }
          }
        }
        
        // Only process slots that belong to this teacher
        if (isTeacherSlot && timeStart && timeEnd) {
          weekDays[dateKey].periods.push({
            startTime: `${timeStart.substring(0,2)}:${timeStart.substring(2)}:00`,
            endTime: `${timeEnd.substring(0,2)}:${timeEnd.substring(2)}:00`,
            teacherId,
            subjectCode,
            classId: dayData.classId,
            rawSlot: slot,
            isExam: isExam
          });
          
          // Track which classes the teacher teaches this day
          if (!weekDays[dateKey].classes.includes(dayData.classId)) {
            weekDays[dateKey].classes.push(dayData.classId);
          }
        }
      });
      
      // Update day info if it's a holiday
      if (dayData.dayType === 'holiday') {
        weekDays[dateKey].day_type = 'holiday';
        weekDays[dateKey].holiday_name = dayData.holidayName;
      }
    });
    
    // Convert weekDays object to array and sort periods by time
    Object.values(weekDays).forEach(day => {
      day.periods.sort((a, b) => a.startTime.localeCompare(b.startTime));
      teacherWeeklySchedule.push(day);
    });
    
    const totalPeriods = teacherWeeklySchedule.reduce((sum, day) => sum + day.periods.length, 0);
    console.log('👨‍🏫 Teacher has', totalPeriods, 'periods this week across', 
      new Set(teacherWeeklySchedule.flatMap(day => day.classes)).size, 'classes');
    
    res.json({
      success: true,
      data: teacherWeeklySchedule,
      teacherInfo: {
        teacherId,
        name: teacher.name,
        totalPeriods,
        classesThisWeek: new Set(teacherWeeklySchedule.flatMap(day => day.classes)).size
      },
      weekInfo: {
        offset: offset,
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        isCurrentWeek: offset === 0,
        weekLabel: offset === 0 ? 'Current Week' : 
                   offset === 1 ? 'Next Week' : 
                   offset === -1 ? 'Previous Week' :
                   offset > 1 ? `${offset} Weeks Ahead` :
                   `${Math.abs(offset)} Weeks Ago`
      }
    });

  } catch (error) {
    console.error('Error fetching teacher calendar week:', error);
    res.status(500).json({ error: 'Failed to fetch teacher calendar week data' });
  }
});

// POST /api/timemanagement/exams - Save exam schedule
router.post('/exams', authenticateToken, async (req, res) => {
  try {
    const { examType, examSessions, academicYear } = req.body;

    if (!examSessions || !Array.isArray(examSessions) || examSessions.length === 0) {
      return res.status(400).json({ error: 'Exam sessions are required' });
    }

    console.log('💾 Saving exam schedule:', { examType, examSessions: examSessions.length, academicYear });

    const savedSessions = [];

    // Process each exam session
    for (const session of examSessions) {
      const { date, session: sessionType, subjectCode, classId } = session;

      if (!date || !sessionType || !subjectCode || !classId) {
        console.warn('⚠️ Skipping incomplete session:', session);
        continue;
      }

      const calendarDate = new Date(date);
      const dayOfWeek = calendarDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const gridId = `${classId}_${date}`;

      // Create exam slot entry
      const examSlot = `EXAM_${subjectCode}_${sessionType}`;

      try {
        // Check if calendar grid entry exists for this date and class
        let calendarGrid = await prisma.calendarGrid.findUnique({
          where: { gridId }
        });

        if (calendarGrid) {
          // Update existing calendar grid entry with exam data
          let updatedMorningSlots = calendarGrid.morningSlots ? JSON.parse(calendarGrid.morningSlots) : [];
          let updatedAfternoonSlots = calendarGrid.afternoonSlots ? JSON.parse(calendarGrid.afternoonSlots) : [];

          if (sessionType === 'morning' || sessionType === 'full_day') {
            // Replace morning slots with exam, but preserve lunch breaks
            updatedMorningSlots = updatedMorningSlots.map(slot => {
              // Keep lunch breaks and replace others with exam
              if (slot && slot.includes('LUNCH_')) {
                return slot; // Preserve lunch break
              }
              return examSlot; // Replace with exam
            });
            
            // If morning slots array is empty or too short, create it properly
            if (updatedMorningSlots.length < 5) {
              updatedMorningSlots = [examSlot, examSlot, examSlot, examSlot, examSlot];
              // Find and preserve lunch in the 5th position (11:40-12:20)
              if (calendarGrid.morningSlots) {
                const originalSlots = JSON.parse(calendarGrid.morningSlots);
                originalSlots.forEach((slot, index) => {
                  if (slot && slot.includes('LUNCH_')) {
                    updatedMorningSlots[index] = slot;
                  }
                });
              }
            }
          }
          
          if (sessionType === 'afternoon' || sessionType === 'full_day') {
            // Replace afternoon slots with exam
            updatedAfternoonSlots = updatedAfternoonSlots.map(slot => {
              // No lunch breaks in afternoon, so replace all with exam
              return examSlot;
            });
            
            // If afternoon slots array is empty or too short
            if (updatedAfternoonSlots.length < 5) {
              updatedAfternoonSlots = [examSlot, examSlot, examSlot, examSlot, examSlot];
            }
          }

          calendarGrid = await prisma.calendarGrid.update({
            where: { gridId },
            data: {
              morningSlots: JSON.stringify(updatedMorningSlots),
              afternoonSlots: JSON.stringify(updatedAfternoonSlots),
              examType,
              examSession: sessionType,
              dayType: 'exam',
              updatedAt: new Date()
            }
          });
        } else {
          // Create new calendar grid entry for exam
          let morningSlots = [];
          if (sessionType === 'morning' || sessionType === 'full_day') {
            // Create morning slots with exam, but include lunch in 5th position
            const lunchSlot = `LUNCH_${classId}_LUNCH`;
            morningSlots = [examSlot, examSlot, examSlot, examSlot, lunchSlot];
          }
          
          const afternoonSlots = (sessionType === 'afternoon' || sessionType === 'full_day') 
            ? [examSlot, examSlot, examSlot, examSlot, examSlot] 
            : [];

          calendarGrid = await prisma.calendarGrid.create({
            data: {
              gridId,
              classId: parseInt(classId),
              calendarDate,
              dayOfWeek,
              academicYear: academicYear || '2024-2025',
              dayType: 'exam',
              morningSlots: JSON.stringify(morningSlots),
              afternoonSlots: JSON.stringify(afternoonSlots),
              examType,
              examSession: sessionType
            }
          });
        }

        savedSessions.push({
          gridId,
          date,
          sessionType,
          subjectCode,
          classId: parseInt(classId)
        });

        console.log('✅ Saved exam session:', { gridId, date, sessionType, subjectCode });

      } catch (sessionError) {
        console.error('❌ Error saving session:', sessionError);
        // Continue with other sessions even if one fails
      }
    }

    res.json({
      message: 'Exam schedule saved successfully',
      savedSessions,
      examType,
      totalSessions: savedSessions.length
    });

  } catch (error) {
    console.error('❌ Error saving exam schedule:', error);
    res.status(500).json({ error: 'Failed to save exam schedule' });
  }
});

// GET /api/timemanagement/upcoming-exams/all
// Get upcoming exams for all classes
router.get('/upcoming-exams/all', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    console.log('📚 Fetching upcoming exams for all classes from date:', today);

    // Fetch upcoming exam entries from calendar grid for all classes
    const upcomingExams = await prisma.calendarGrid.findMany({
      where: {
        calendarDate: {
          gte: today
        },
        OR: [
          { examType: { not: null } },
          { dayType: 'exam' }
        ]
      },
      orderBy: [
        { calendarDate: 'asc' },
        { classId: 'asc' },
        { examSession: 'asc' }
      ]
    });

    console.log('📚 Found upcoming exams for all classes:', upcomingExams.length);

    // Get class information for better display
    const classIds = [...new Set(upcomingExams.map(exam => exam.classId))];
    const classes = await prisma.class.findMany({
      where: {
        classId: { in: classIds }
      }
    });

    const classMap = {};
    classes.forEach(cls => {
      classMap[cls.classId] = cls;
    });

    // Process and format the exam data
    const formattedExams = upcomingExams.map(exam => {
      let examDetails = [];
      
      // Parse morning and afternoon slots to extract exam subjects
      try {
        const morningSlots = exam.morningSlots ? JSON.parse(exam.morningSlots) : [];
        const afternoonSlots = exam.afternoonSlots ? JSON.parse(exam.afternoonSlots) : [];
        
        // Extract exam subjects from morning slots
        morningSlots.forEach((slot, index) => {
          if (slot && slot.startsWith('EXAM_')) {
            const parts = slot.split('_');
            if (parts.length >= 2) {
              const subjectCode = parts[1];
              examDetails.push({
                timeSlot: `morning-${index + 1}`,
                subject: subjectCode,
                subjectName: getSubjectName(subjectCode),
                session: 'morning'
              });
            }
          }
        });
        
        // Extract exam subjects from afternoon slots
        afternoonSlots.forEach((slot, index) => {
          if (slot && slot.startsWith('EXAM_')) {
            const parts = slot.split('_');
            if (parts.length >= 2) {
              const subjectCode = parts[1];
              examDetails.push({
                timeSlot: `afternoon-${index + 1}`,
                subject: subjectCode,
                subjectName: getSubjectName(subjectCode),
                session: 'afternoon'
              });
            }
          }
        });
      } catch (parseError) {
        console.error('Error parsing exam slots:', parseError);
      }

      const classInfo = classMap[exam.classId];

      return {
        id: exam.gridId,
        classId: exam.classId,
        className: classInfo ? `${classInfo.className} ${classInfo.section}` : `Class ${exam.classId}`,
        grade: classInfo?.className, // Use className as grade
        section: classInfo?.section || '',
        date: exam.calendarDate.toISOString().split('T')[0], // Format as YYYY-MM-DD string
        dayName: exam.calendarDate.toLocaleDateString('en-US', { weekday: 'long' }),
        examType: exam.examType || 'General',
        examSession: exam.examSession || 'full_day',
        examDetails,
        totalSubjects: examDetails.length
      };
    }).filter(exam => exam.examDetails.length > 0); // Only include exams with actual subjects

    console.log('📚 Formatted upcoming exams for all classes:', formattedExams.length);

    res.json({
      success: true,
      data: formattedExams
    });

  } catch (error) {
    console.error('❌ Error fetching upcoming exams for all classes:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming exams for all classes' });
  }
});

// GET /api/timemanagement/upcoming-exams/:classId
// Get upcoming exams for a specific class
router.get('/upcoming-exams/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    console.log('📚 Fetching upcoming exams for class:', classId, 'from date:', today);

    // Fetch upcoming exam entries from calendar grid
    const upcomingExams = await prisma.calendarGrid.findMany({
      where: {
        classId: parseInt(classId),
        calendarDate: {
          gte: today
        },
        OR: [
          { examType: { not: null } },
          { dayType: 'exam' }
        ]
      },
      orderBy: [
        { calendarDate: 'asc' },
        { examSession: 'asc' }
      ]
    });

    console.log('📚 Found upcoming exams:', upcomingExams.length);

    // Process and format the exam data
    const formattedExams = upcomingExams.map(exam => {
      let morningSubjects = new Set();
      let afternoonSubjects = new Set();
      
      // Parse morning and afternoon slots to extract exam subjects
      try {
        const morningSlots = exam.morningSlots ? JSON.parse(exam.morningSlots) : [];
        const afternoonSlots = exam.afternoonSlots ? JSON.parse(exam.afternoonSlots) : [];
        
        // Extract unique subjects from morning slots
        morningSlots.forEach((slot) => {
          if (slot && slot.startsWith('EXAM_')) {
            const parts = slot.split('_');
            if (parts.length >= 2) {
              const subjectCode = parts[1];
              morningSubjects.add(subjectCode);
            }
          }
        });
        
        // Extract unique subjects from afternoon slots
        afternoonSlots.forEach((slot) => {
          if (slot && slot.startsWith('EXAM_')) {
            const parts = slot.split('_');
            if (parts.length >= 2) {
              const subjectCode = parts[1];
              afternoonSubjects.add(subjectCode);
            }
          }
        });
      } catch (parseError) {
        console.error('Error parsing exam slots:', parseError);
      }

      // Create exam details with unique subjects per session
      let examDetails = [];
      
      // Add morning subjects
      morningSubjects.forEach(subjectCode => {
        examDetails.push({
          subject: subjectCode,
          subjectName: getSubjectName(subjectCode),
          session: 'morning'
        });
      });
      
      // Add afternoon subjects
      afternoonSubjects.forEach(subjectCode => {
        examDetails.push({
          subject: subjectCode,
          subjectName: getSubjectName(subjectCode),
          session: 'afternoon'
        });
      });

      return {
        id: exam.gridId,
        date: exam.calendarDate.toISOString().split('T')[0], // Format as YYYY-MM-DD string
        dayName: exam.calendarDate.toLocaleDateString('en-US', { weekday: 'long' }),
        examType: exam.examType || 'General',
        examSession: exam.examSession || 'full_day',
        examDetails,
        totalSubjects: examDetails.length
      };
    }).filter(exam => exam.examDetails.length > 0); // Only include exams with actual subjects

    console.log('📚 Formatted upcoming exams:', formattedExams.length);

    res.json({
      success: true,
      data: formattedExams
    });

  } catch (error) {
    console.error('❌ Error fetching upcoming exams:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming exams' });
  }
});

// Helper function to convert subject codes to readable names
const getSubjectName = (subjectCode) => {
  const subjectNames = {
    'MATH': 'Mathematics',
    'SCI': 'Science', 
    'ENG': 'English',
    'SOC': 'Social Studies',
    'HIN': 'Hindi',
    'TEL': 'Telugu',
    'PHY': 'Physics',
    'CHEM': 'Chemistry',
    'BIO': 'Biology',
    'COMP': 'Computer Science',
    'ART': 'Arts',
    'PE': 'Physical Education',
    '8_MATH': 'Mathematics',
    '8_SCI': 'Science',
    '8_ENG': 'English',
    '8_SOC': 'Social Studies',
    '8_HIN': 'Hindi',
    '8_TEL': 'Telugu',
    'STUDY': 'Study Period',
    'LUNCH': 'Lunch Break'
  };
  return subjectNames[subjectCode] || subjectCode;
};

// PUT /api/timemanagement/exam/:examId
// Update an existing exam schedule
router.put('/exam/:examId', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const { examDetails, academicYear } = req.body;

    console.log('📝 Updating exam:', examId, 'with details:', examDetails);

    // Find the existing exam entry
    const existingExam = await prisma.calendarGrid.findUnique({
      where: { gridId: parseInt(examId) }
    });

    if (!existingExam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Parse current slots
    const currentMorningSlots = existingExam.morningSlots ? JSON.parse(existingExam.morningSlots) : {};
    const currentAfternoonSlots = existingExam.afternoonSlots ? JSON.parse(existingExam.afternoonSlots) : {};

    // Update slots with new subjects
    examDetails.forEach(detail => {
      const timeSlot = detail.timeSlot;
      const subject = detail.subject;
      
      // Determine if it's morning or afternoon slot based on time
      if (timeSlot.includes('09:') || timeSlot.includes('10:') || timeSlot.includes('11:')) {
        currentMorningSlots[timeSlot] = subject;
      } else if (timeSlot.includes('12:') || timeSlot.includes('13:') || timeSlot.includes('14:') || timeSlot.includes('15:')) {
        currentAfternoonSlots[timeSlot] = subject;
      }
    });

    // Preserve LUNCH slots
    if (currentMorningSlots['11:40:00-12:20:00']) {
      currentMorningSlots['11:40:00-12:20:00'] = 'LUNCH';
    }
    if (currentAfternoonSlots['11:40:00-12:20:00']) {
      currentAfternoonSlots['11:40:00-12:20:00'] = 'LUNCH';
    }

    // Update the calendar grid entry
    const updatedExam = await prisma.calendarGrid.update({
      where: { gridId: parseInt(examId) },
      data: {
        morningSlots: JSON.stringify(currentMorningSlots),
        afternoonSlots: JSON.stringify(currentAfternoonSlots)
      }
    });

    console.log('✅ Exam updated successfully:', updatedExam.gridId);

    res.json({
      success: true,
      message: 'Exam schedule updated successfully',
      examId: updatedExam.gridId
    });

  } catch (error) {
    console.error('❌ Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam schedule' });
  }
});

// GET /api/timemanagement/upcoming-holidays/all
// Get upcoming holidays for all classes
router.get('/upcoming-holidays/all', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    console.log('🏖️ Fetching upcoming holidays for all classes from date:', today);

    // Fetch holidays from academic calendar
    const academicCalendar = await prisma.academicCalendar.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!academicCalendar || !academicCalendar.holidays) {
      console.log('🏖️ No academic calendar or holidays found');
      return res.json({
        success: true,
        data: []
      });
    }

    // Parse holidays from JSONB field
    const holidays = academicCalendar.holidays || [];
    
    // Get class information for mapping
    const classes = await prisma.class.findMany({
      where: { academicYear: academicCalendar.academicYear }
    });

    // Create a map for quick class lookup
    const classMap = {};
    classes.forEach(cls => {
      classMap[cls.classId] = cls;
    });
    
    // Filter upcoming holidays (include today's holidays) and format for frontend
    const upcomingHolidays = holidays
      .map(holiday => {
        const holidayDate = new Date(holiday.date);
        holidayDate.setHours(0, 0, 0, 0);
        
        // Get class information
        const classInfo = classMap[holiday.classId];
        
        return {
          id: holiday.date + '_' + (holiday.classId || 'all'), // Create unique ID
          holidayName: holiday.name,
          startDate: holiday.date, // Keep as string for frontend
          endDate: holiday.endDate || holiday.date, // Use same date if no end date
          date: holidayDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          dayName: holidayDate.toLocaleDateString('en-US', { weekday: 'long' }),
          description: holiday.description || '',
          type: holiday.type || 'general',
          duration: holiday.duration || 'full_day',
          classId: holiday.classId,
          className: classInfo ? `${classInfo.className} ${classInfo.section}` : 'All Classes',
          grade: classInfo?.className, // Add grade field for consistency
          section: classInfo?.section || '',
          academicYear: academicCalendar.academicYear
        };
      })
      .filter(holiday => holiday.date >= today.toISOString().split('T')[0]) // Compare with string dates
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log('🏖️ Found upcoming holidays for all classes:', upcomingHolidays.length);

    res.json({
      success: true,
      data: upcomingHolidays
    });

  } catch (error) {
    console.error('❌ Error fetching upcoming holidays for all classes:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming holidays for all classes' });
  }
});

// GET /api/timemanagement/upcoming-holidays/:classId
// Get upcoming holidays for a specific class (same as all classes since holidays are global)
router.get('/upcoming-holidays/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    console.log('🏖️ Fetching upcoming holidays for class:', classId, 'from date:', today.toISOString().split('T')[0]);

    // Fetch holidays from academic calendar (holidays are global, not class-specific)
    const academicCalendar = await prisma.academicCalendar.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!academicCalendar || !academicCalendar.holidays) {
      console.log('🏖️ No academic calendar or holidays found');
      return res.json({
        success: true,
        data: []
      });
    }

    // Parse holidays from JSONB field
    const holidays = academicCalendar.holidays || [];
    
    // Get class information
    const classInfo = await prisma.class.findUnique({
      where: { classId: parseInt(classId) }
    });
    
    // Filter upcoming holidays for this class (include today's holidays) and format for frontend
    const upcomingHolidays = holidays
      .filter(holiday => !holiday.classId || holiday.classId == classId) // Include holidays for this class or global holidays
      .map(holiday => {
        const holidayDate = new Date(holiday.date);
        holidayDate.setHours(0, 0, 0, 0);
        
        return {
          id: holiday.date + '_' + (holiday.classId || 'all'), // Create unique ID
          holidayName: holiday.name,
          startDate: holiday.date,
          endDate: holiday.endDate || holiday.date,
          date: holidayDate,
          dayName: holidayDate.toLocaleDateString('en-US', { weekday: 'long' }),
          description: holiday.description || '',
          type: holiday.type || 'general',
          duration: holiday.duration || 'full_day',
          classId: holiday.classId,
          className: classInfo ? `${classInfo.className}` : 'All Classes',
          section: classInfo ? classInfo.section : '',
          academicYear: academicCalendar.academicYear
        };
      })
      .filter(holiday => holiday.date >= today) // This will include today's holidays
      .sort((a, b) => a.date - b.date);

    console.log('🏖️ Found upcoming holidays:', upcomingHolidays.length);

    res.json({
      success: true,
      data: upcomingHolidays
    });

  } catch (error) {
    console.error('❌ Error fetching upcoming holidays:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming holidays' });
  }
});

// POST /api/timemanagement/holidays - Save holiday
router.post('/holidays', authenticateToken, async (req, res) => {
  try {
    const { holidays } = req.body;

    // Handle both single holiday and array of holidays
    const holidaysArray = holidays || [req.body];

    console.log('🏖️ Processing holidays:', holidaysArray.length, 'holidays');

    // Process each holiday
    const results = [];
    for (const holidayData of holidaysArray) {
      const { holidayName, startDate, endDate, description, type = 'general', duration = 'full_day', classId, academicYear } = holidayData;

      console.log('🏖️ Adding holiday:', { holidayName, startDate, endDate, description, type, duration, classId });

      if (!holidayName || !startDate) {
        return res.status(400).json({ error: 'Holiday name and start date are required' });
      }

      // Get or create academic calendar
      let academicCalendar = await prisma.academicCalendar.findFirst({
        where: { academicYear: academicYear },
        orderBy: { createdAt: 'desc' }
      });

      if (!academicCalendar) {
        return res.status(404).json({ error: 'Academic calendar not found for the specified year' });
      }

      // Parse existing holidays
      const existingHolidays = academicCalendar.holidays || [];
      
      // Create new holiday entry with duration support
      const newHoliday = {
        date: startDate,
        name: holidayName,
        description: description || '',
        type: type,
        duration: duration, // full_day, half_day
        classId: classId // Add classId to track which class this holiday is for
      };

      // If it's a multi-day holiday, create entries for each day
      const holidays = [];
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : start;
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        holidays.push({
          ...newHoliday,
          date: d.toISOString().split('T')[0]
        });
      }

      // Add new holidays to existing ones
      const updatedHolidays = [...existingHolidays, ...holidays];

      // Sort holidays by date
      updatedHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Update academic calendar
      const updatedCalendar = await prisma.academicCalendar.update({
        where: { calendarId: academicCalendar.calendarId },
        data: {
          holidays: updatedHolidays,
          updatedAt: new Date()
        }
      });

      // Also update calendar grid entries for the specific class to show holidays
      await Promise.all(holidays.map(async (holiday) => {
        try {
          // Update calendar grid for the specific class on the holiday date
          const calendarDate = new Date(holiday.date);
          const dayOfWeek = calendarDate.getDay();
          const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = weekdays[dayOfWeek];

          console.log(`🏖️ Updating calendar grid for class ${classId} on ${holiday.date} (${dayName})`);

          // Find existing calendar grid entry
          let calendarGridEntry = await prisma.calendarGrid.findFirst({
            where: {
              classId: classId,
              date: calendarDate,
              academicYear: academicYear
            }
          });

          if (calendarGridEntry) {
            // Update existing entry
            const existingHolidays = calendarGridEntry.holidays || [];
            const newHolidays = [...existingHolidays, {
              name: holiday.name,
              type: holiday.type,
              duration: holiday.duration,
              description: holiday.description
            }];

            await prisma.calendarGrid.update({
              where: { gridId: calendarGridEntry.gridId },
              data: {
                holidays: newHolidays,
                updatedAt: new Date()
              }
            });
            console.log(`🏖️ Updated existing calendar grid entry for class ${classId}`);
          } else {
            // Create new entry
            await prisma.calendarGrid.create({
              data: {
                classId: classId,
                date: calendarDate,
                dayOfWeek: dayName,
                academicYear: academicYear,
                holidays: [{
                  name: holiday.name,
                  type: holiday.type,
                  duration: holiday.duration,
                  description: holiday.description
                }],
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            console.log(`🏖️ Created new calendar grid entry for class ${classId}`);
          }
        } catch (error) {
          console.error(`❌ Error updating calendar grid for class ${classId}:`, error);
        }
      }));

      results.push({ classId, holidayName, status: 'success' });
    }

    res.json({
      success: true,
      message: `Successfully added holidays for ${results.length} classes`,
      data: results
    });

  } catch (error) {
    console.error('❌ Error adding holiday:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add holiday', 
      details: error.message 
    });
  }
});

// PUT /api/timemanagement/holiday/:holidayId
// Update an existing holiday
router.put('/holiday/:holidayId', authenticateToken, async (req, res) => {
  try {
    const { holidayId } = req.params;
    const { holidayName, startDate, description, type } = req.body;

    console.log('📝 Updating holiday:', holidayId, 'with data:', { holidayName, startDate, description, type });

    // Extract original date from holidayId (format: "YYYY-MM-DD_holiday")
    const originalDate = holidayId.replace('_holiday', '');

    // Get academic calendar
    const academicCalendar = await prisma.academicCalendar.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!academicCalendar || !academicCalendar.holidays) {
      return res.status(404).json({ error: 'Academic calendar or holidays not found' });
    }

    // Parse existing holidays
    const existingHolidays = academicCalendar.holidays || [];
    
    // Find and update the holiday
    const holidayIndex = existingHolidays.findIndex(holiday => holiday.date === originalDate);
    
    if (holidayIndex === -1) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    // Update the holiday
    existingHolidays[holidayIndex] = {
      date: startDate || originalDate,
      name: holidayName || existingHolidays[holidayIndex].name,
      description: description || existingHolidays[holidayIndex].description || '',
      type: type || existingHolidays[holidayIndex].type || 'general'
    };

    // Sort holidays by date
    existingHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Update academic calendar
    const updatedCalendar = await prisma.academicCalendar.update({
      where: { calendarId: academicCalendar.calendarId },
      data: {
        holidays: existingHolidays,
        updatedAt: new Date()
      }
    });

    console.log('✅ Holiday updated successfully');

    res.json({
      success: true,
      message: 'Holiday updated successfully',
      holiday: existingHolidays[holidayIndex]
    });

  } catch (error) {
    console.error('❌ Error updating holiday:', error);
    res.status(500).json({ error: 'Failed to update holiday' });
  }
});

// DELETE /api/timemanagement/holiday/:holidayId
// Delete a holiday
router.delete('/holiday/:holidayId', authenticateToken, async (req, res) => {
  try {
    const { holidayId } = req.params;

    console.log('🗑️ Deleting holiday:', holidayId);

    // Extract original date from holidayId (format: "YYYY-MM-DD_holiday")
    const originalDate = holidayId.replace('_holiday', '');

    // Get academic calendar
    const academicCalendar = await prisma.academicCalendar.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!academicCalendar || !academicCalendar.holidays) {
      return res.status(404).json({ error: 'Academic calendar or holidays not found' });
    }

    // Parse existing holidays
    const existingHolidays = academicCalendar.holidays || [];
    
    // Filter out the holiday to delete
    const updatedHolidays = existingHolidays.filter(holiday => holiday.date !== originalDate);
    
    if (existingHolidays.length === updatedHolidays.length) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    // Update academic calendar
    const updatedCalendar = await prisma.academicCalendar.update({
      where: { calendarId: academicCalendar.calendarId },
      data: {
        holidays: updatedHolidays,
        updatedAt: new Date()
      }
    });

    console.log('✅ Holiday deleted successfully');

    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting holiday:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

module.exports = router;
