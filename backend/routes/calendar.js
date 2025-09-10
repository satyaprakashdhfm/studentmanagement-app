const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/calendar - Get academic calendar records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { academicYear, page = 1, limit = 50 } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add academic year filter
    if (academicYear) {
      where.academicYear = academicYear;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get calendar records with pagination and relations
    const calendars = await prisma.academicCalendar.findMany({
      where,
      include: {
        creator: {
          select: {
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { academicYear: 'desc' },
        { startDate: 'desc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.academicCalendar.count({ where });

    // Convert BigInt IDs to Numbers for JSON serialization
    const calendarsWithNumericIds = calendars.map(calendar => ({
      ...calendar,
      createdBy: Number(calendar.createdBy)
    }));

    res.json({
      calendars: calendarsWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/:id - Get calendar record by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const calendar = await prisma.academicCalendar.findUnique({
      where: { calendarId: parseInt(id) },
      include: {
        creator: {
          select: {
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar record not found' });
    }

    // Convert BigInt IDs to Numbers
    const calendarWithNumericIds = {
      ...calendar,
      createdBy: Number(calendar.createdBy)
    };

    res.json(calendarWithNumericIds);

  } catch (error) {
    console.error('Get calendar record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/current/:year - Get current academic calendar
router.get('/current/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;

    const calendar = await prisma.academicCalendar.findFirst({
      where: { 
        academicYear: year,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        creator: {
          select: {
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!calendar) {
      return res.status(404).json({ error: 'No active calendar found for the specified year' });
    }

    res.json({
      ...calendar,
      createdBy: Number(calendar.createdBy)
    });

  } catch (error) {
    console.error('Get current calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/calendar - Create new calendar record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      academicYear,
      startDate,
      endDate,
      holidays,
      examinationDates,
      createdBy
    } = req.body;

    // Validate required fields
    if (!academicYear || !startDate || !endDate || !createdBy) {
      return res.status(400).json({ error: 'Academic year, start date, end date, and creator are required' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Check if creator exists
    const creator = await prisma.user.findUnique({
      where: { id: BigInt(createdBy) }
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator user not found' });
    }

    // Check if calendar already exists for this academic year
    const existingCalendar = await prisma.academicCalendar.findFirst({
      where: { academicYear }
    });

    if (existingCalendar) {
      return res.status(409).json({ error: 'Calendar already exists for this academic year' });
    }

    // Validate JSON data
    let holidaysData = null;
    let examinationDatesData = null;

    if (holidays) {
      try {
        holidaysData = typeof holidays === 'string' ? JSON.parse(holidays) : holidays;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid holidays JSON format' });
      }
    }

    if (examinationDates) {
      try {
        examinationDatesData = typeof examinationDates === 'string' ? JSON.parse(examinationDates) : examinationDates;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid examination dates JSON format' });
      }
    }

    // Create new calendar record
    const newCalendar = await prisma.academicCalendar.create({
      data: {
        academicYear,
        startDate: start,
        endDate: end,
        holidays: holidaysData,
        examinationDates: examinationDatesData,
        createdBy: BigInt(createdBy)
      },
      include: {
        creator: {
          select: {
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      calendar: {
        ...newCalendar,
        createdBy: Number(newCalendar.createdBy)
      },
      message: 'Calendar created successfully'
    });

  } catch (error) {
    console.error('Create calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/calendar/:id - Update calendar record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      academicYear,
      startDate,
      endDate,
      holidays,
      examinationDates
    } = req.body;

    // Check if calendar record exists
    const existingCalendar = await prisma.academicCalendar.findUnique({
      where: { calendarId: parseInt(id) }
    });

    if (!existingCalendar) {
      return res.status(404).json({ error: 'Calendar record not found' });
    }

    // Validate dates if provided
    let updateData = {};

    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (academicYear) updateData.academicYear = academicYear;

    // Validate date range if both dates are provided
    if (updateData.startDate && updateData.endDate && updateData.startDate >= updateData.endDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Handle holidays JSON
    if (holidays !== undefined) {
      if (holidays === null) {
        updateData.holidays = null;
      } else {
        try {
          updateData.holidays = typeof holidays === 'string' ? JSON.parse(holidays) : holidays;
        } catch (error) {
          return res.status(400).json({ error: 'Invalid holidays JSON format' });
        }
      }
    }

    // Handle examination dates JSON
    if (examinationDates !== undefined) {
      if (examinationDates === null) {
        updateData.examinationDates = null;
      } else {
        try {
          updateData.examinationDates = typeof examinationDates === 'string' ? JSON.parse(examinationDates) : examinationDates;
        } catch (error) {
          return res.status(400).json({ error: 'Invalid examination dates JSON format' });
        }
      }
    }

    // Update calendar record
    const updatedCalendar = await prisma.academicCalendar.update({
      where: { calendarId: parseInt(id) },
      data: updateData,
      include: {
        creator: {
          select: {
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      calendar: {
        ...updatedCalendar,
        createdBy: Number(updatedCalendar.createdBy)
      },
      message: 'Calendar updated successfully'
    });

  } catch (error) {
    console.error('Update calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/calendar/:id - Delete calendar record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if calendar record exists
    const existingCalendar = await prisma.academicCalendar.findUnique({
      where: { calendarId: parseInt(id) }
    });

    if (!existingCalendar) {
      return res.status(404).json({ error: 'Calendar record not found' });
    }

    // Check if calendar is currently active
    const now = new Date();
    if (existingCalendar.startDate <= now && existingCalendar.endDate >= now) {
      return res.status(400).json({ 
        error: 'Cannot delete active calendar. Please ensure no academic activities are dependent on this calendar.' 
      });
    }

    // Delete calendar record
    await prisma.academicCalendar.delete({
      where: { calendarId: parseInt(id) }
    });

    res.json({ message: 'Calendar deleted successfully' });

  } catch (error) {
    console.error('Delete calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/holidays/:year - Get holidays for a specific year
router.get('/holidays/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;

    const calendar = await prisma.academicCalendar.findFirst({
      where: { academicYear: year },
      select: {
        holidays: true,
        academicYear: true
      }
    });

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found for the specified year' });
    }

    res.json({
      academicYear: calendar.academicYear,
      holidays: calendar.holidays || []
    });

  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/exams/:year - Get examination dates for a specific year
router.get('/exams/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;

    const calendar = await prisma.academicCalendar.findFirst({
      where: { academicYear: year },
      select: {
        examinationDates: true,
        academicYear: true
      }
    });

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found for the specified year' });
    }

    res.json({
      academicYear: calendar.academicYear,
      examinationDates: calendar.examinationDates || []
    });

  } catch (error) {
    console.error('Get examination dates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/stats/overview - Get calendar statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Total calendars
    const total = await prisma.academicCalendar.count();

    // Current active calendar
    const now = new Date();
    const activeCalendar = await prisma.academicCalendar.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now }
      },
      select: {
        academicYear: true,
        startDate: true,
        endDate: true
      }
    });

    // Upcoming calendars
    const upcomingCalendars = await prisma.academicCalendar.count({
      where: {
        startDate: { gt: now }
      }
    });

    // Past calendars
    const pastCalendars = await prisma.academicCalendar.count({
      where: {
        endDate: { lt: now }
      }
    });

    // Calendar by year
    const yearStats = await prisma.academicCalendar.groupBy({
      by: ['academicYear'],
      _count: {
        academicYear: true
      },
      orderBy: {
        academicYear: 'desc'
      }
    });

    res.json({
      total,
      active: activeCalendar ? 1 : 0,
      upcoming: upcomingCalendars,
      past: pastCalendars,
      currentCalendar: activeCalendar,
      yearDistribution: yearStats.map(stat => ({
        academicYear: stat.academicYear,
        count: stat._count.academicYear
      }))
    });

  } catch (error) {
    console.error('Get calendar stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/exceptions - Get schedule exceptions
router.get('/exceptions', authenticateToken, async (req, res) => {
  try {
    const {
      academicYear,
      classId,
      section,
      exceptionType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    if (academicYear) where.academicYear = academicYear;
    if (classId) where.classId = parseInt(classId);
    if (section) where.section = section;
    if (exceptionType) where.exceptionType = exceptionType;

    if (startDate || endDate) {
      where.exceptionDate = {};
      if (startDate) where.exceptionDate.gte = new Date(startDate);
      if (endDate) where.exceptionDate.lte = new Date(endDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const exceptions = await prisma.scheduleException.findMany({
      where,
      include: {
        class: {
          select: {
            className: true,
            section: true
          }
        },
        subject: {
          select: {
            subjectName: true
          }
        },
        teacher: {
          select: {
            name: true,
            email: true
          }
        },
        creator: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { exceptionDate: 'asc' },
      skip,
      take: limitNum
    });

    const total = await prisma.scheduleException.count({ where });

    // Convert BigInt IDs to Numbers
    const exceptionsWithNumericIds = exceptions.map(exc => ({
      exceptionId: Number(exc.exceptionId),
      classId: exc.classId,
      section: exc.section,
      exceptionDate: exc.exceptionDate,
      slotId: exc.slotId,
      exceptionType: exc.exceptionType,
      title: exc.title,
      description: exc.description,
      subjectId: exc.subjectId,
      teacherId: Number(exc.teacherId),
      academicYear: exc.academicYear,
      affectsAllClasses: exc.affectsAllClasses,
      createdBy: Number(exc.createdBy),
      createdAt: exc.createdAt,
      updatedAt: exc.updatedAt,
      class: exc.class,
      subject: exc.subject,
      teacher: exc.teacher,
      creator: exc.creator
    }));

    res.json({
      exceptions: exceptionsWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get schedule exceptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/exceptions/:id - Get schedule exception by ID
router.get('/exceptions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const exception = await prisma.scheduleException.findUnique({
      where: { exceptionId: BigInt(id) },
      include: {
        class: {
          select: {
            className: true,
            section: true
          }
        },
        subject: {
          select: {
            subjectName: true
          }
        },
        teacher: {
          select: {
            name: true,
            email: true
          }
        },
        creator: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!exception) {
      return res.status(404).json({ error: 'Schedule exception not found' });
    }

    // Convert BigInt IDs to Numbers
    const exceptionWithNumericIds = {
      exceptionId: Number(exception.exceptionId),
      classId: exception.classId,
      section: exception.section,
      exceptionDate: exception.exceptionDate,
      slotId: exception.slotId,
      exceptionType: exception.exceptionType,
      title: exception.title,
      description: exception.description,
      subjectId: exception.subjectId,
      teacherId: Number(exception.teacherId),
      academicYear: exception.academicYear,
      affectsAllClasses: exception.affectsAllClasses,
      createdBy: Number(exception.createdBy),
      createdAt: exception.createdAt,
      updatedAt: exception.updatedAt,
      class: exception.class,
      subject: exception.subject,
      teacher: exception.teacher,
      creator: exception.creator
    };

    res.json(exceptionWithNumericIds);

  } catch (error) {
    console.error('Get schedule exception error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/events - Get combined calendar events (academic calendar + schedule exceptions)
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { academicYear, startDate, endDate } = req.query;

    const where = {};
    if (academicYear) where.academicYear = academicYear;
    if (startDate || endDate) {
      where.exceptionDate = {};
      if (startDate) where.exceptionDate.gte = new Date(startDate);
      if (endDate) where.exceptionDate.lte = new Date(endDate);
    }

    // Get schedule exceptions
    const exceptions = await prisma.scheduleException.findMany({
      where,
      include: {
        class: {
          select: {
            className: true,
            section: true
          }
        },
        subject: {
          select: {
            subjectName: true
          }
        },
        teacher: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { exceptionDate: 'asc' }
    });

    // Get academic calendar events
    const calendarWhere = {};
    if (academicYear) calendarWhere.academicYear = academicYear;

    const calendars = await prisma.academicCalendar.findMany({
      where: calendarWhere,
      select: {
        calendarId: true,
        academicYear: true,
        startDate: true,
        endDate: true,
        holidays: true,
        examinationDates: true
      }
    });

    // Process calendar events
    const calendarEvents = [];

    calendars.forEach(calendar => {
      // Add holidays
      if (calendar.holidays && Array.isArray(calendar.holidays)) {
        calendar.holidays.forEach(holiday => {
          calendarEvents.push({
            id: `holiday-${calendar.calendarId}-${holiday.date}`,
            type: 'holiday',
            title: holiday.name || 'Holiday',
            date: holiday.date,
            description: holiday.description || '',
            academicYear: calendar.academicYear,
            source: 'academic_calendar'
          });
        });
      }

      // Add examination dates
      if (calendar.examinationDates && Array.isArray(calendar.examinationDates)) {
        calendar.examinationDates.forEach(exam => {
          calendarEvents.push({
            id: `exam-${calendar.calendarId}-${exam.date}`,
            type: 'exam',
            title: exam.name || 'Examination',
            date: exam.date,
            description: exam.description || '',
            academicYear: calendar.academicYear,
            source: 'academic_calendar'
          });
        });
      }
    });

    // Process schedule exceptions
    const exceptionEvents = exceptions.map(exc => ({
      id: `exception-${exc.exceptionId}`,
      type: exc.exceptionType,
      title: exc.title,
      date: exc.exceptionDate,
      description: exc.description,
      academicYear: exc.academicYear,
      classId: exc.classId,
      section: exc.section,
      subjectId: exc.subjectId,
      teacherId: Number(exc.teacherId),
      affectsAllClasses: exc.affectsAllClasses,
      class: exc.class,
      subject: exc.subject,
      teacher: exc.teacher,
      source: 'schedule_exception'
    }));

    // Combine all events
    const allEvents = [...calendarEvents, ...exceptionEvents];

    res.json({
      events: allEvents,
      summary: {
        totalEvents: allEvents.length,
        calendarEvents: calendarEvents.length,
        exceptionEvents: exceptionEvents.length
      }
    });

  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
