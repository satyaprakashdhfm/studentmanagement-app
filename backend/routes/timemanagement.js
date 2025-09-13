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
        teacherId: parseInt(teacherId),
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

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching class schedule:', error);
    res.status(500).json({ error: 'Failed to fetch class schedule' });
  }
});

module.exports = router;
