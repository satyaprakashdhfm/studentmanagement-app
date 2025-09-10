const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();
const prisma = new PrismaClient();

// Get all time slots
router.get('/timeslots', authenticateToken, async (req, res) => {
  try {
    const timeSlots = await prisma.$queryRaw`
      SELECT
        slot_id,
        slot_name,
        TO_CHAR(start_time, 'HH24:MI:SS') as start_time,
        TO_CHAR(end_time, 'HH24:MI:SS') as end_time,
        slot_order,
        is_active,
        created_at,
        updated_at
      FROM time_slots
      WHERE is_active = true
      ORDER BY slot_order ASC
    `;

    // Convert BigInt fields to strings for JSON serialization
    const timeSlotsWithStringIds = timeSlots.map(slot => ({
      ...slot,
      slot_id: slot.slot_id.toString()
    }));

    res.json(timeSlotsWithStringIds);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

// Get class schedule for a specific class and section
router.get('/schedule/:classId/:section', authenticateToken, async (req, res) => {
  try {
    const { classId, section } = req.params;
    const { academicYear, startDate } = req.query;

    const schedule = await prisma.$queryRaw`
      SELECT cs.*, 
             s.subject_name, s.subject_id,
             t.name as teacher_name, t.teacher_id,
             ts.slot_name, ts.start_time, ts.end_time, ts.slot_order
      FROM class_schedule cs
      LEFT JOIN subjects s ON cs.subject_id = s.subject_id
      LEFT JOIN teachers t ON cs.teacher_id = t.teacher_id
      LEFT JOIN time_slots ts ON cs.slot_id = ts.slot_id
      WHERE cs.class_id = ${parseInt(classId)}
        AND cs.section = ${section}
        AND cs.academic_year = ${academicYear || '2024-2025'}
        AND cs.is_active = true
      ORDER BY cs.day_of_week ASC, ts.slot_order ASC
    `;

    let exceptions = [];
    let weekDates = {};

    // If startDate is provided, calculate week dates and fetch exceptions
    if (startDate) {
      const start = new Date(startDate);
      // Calculate dates for the week (Monday to Sunday)
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dayOfWeek = (date.getDay() === 0 ? 7 : date.getDay()); // Convert Sunday (0) to 7
        weekDates[dayOfWeek] = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      // Fetch exceptions for this week
      exceptions = await prisma.$queryRaw`
        SELECT se.*, 
               s.subject_name, s.subject_id,
               t.name as teacher_name, t.teacher_id,
               ts.slot_name, ts.start_time, ts.end_time, ts.slot_order
        FROM schedule_exceptions se
        LEFT JOIN subjects s ON se.subject_id = s.subject_id
        LEFT JOIN teachers t ON se.teacher_id = t.teacher_id
        LEFT JOIN time_slots ts ON se.slot_id = ts.slot_id
        WHERE se.exception_date >= ${weekDates[1]}::date
          AND se.exception_date <= ${weekDates[7]}::date
          AND se.academic_year = ${academicYear || '2024-2025'}
          AND (se.class_id IS NULL OR se.class_id = ${parseInt(classId)})
          AND (se.section IS NULL OR se.section = ${section})
        ORDER BY se.exception_date ASC, ts.slot_order ASC
      `;

      // Convert BigInt fields to strings
      exceptions = exceptions.map(exc => ({
        ...exc,
        exception_id: exc.exception_id ? exc.exception_id.toString() : null,
        class_id: exc.class_id ? exc.class_id.toString() : null,
        slot_id: exc.slot_id ? exc.slot_id.toString() : null,
        subject_id: exc.subject_id ? exc.subject_id.toString() : null,
        teacher_id: exc.teacher_id ? exc.teacher_id.toString() : null,
        created_by: exc.created_by ? exc.created_by.toString() : null
      }));
    }

    // Transform the schedule data
    const transformedSchedule = schedule.map(item => {
      const dayOfWeek = item.day_of_week;
      const slotId = item.slot_id;
      const exceptionDate = weekDates[dayOfWeek];

      // Find matching exception
      const matchingException = exceptions.find(exc => 
        exc.exception_date === exceptionDate && 
        String(exc.slot_id) === String(slotId) &&
        (exc.class_id === null || String(exc.class_id) === String(classId)) &&
        (exc.section === null || exc.section === section)
      );

      if (matchingException) {
        // Override with exception data
        return {
          ...item,
          schedule_id: item.schedule_id ? item.schedule_id.toString() : null,
          class_id: item.class_id ? item.class_id.toString() : null,
          slot_id: item.slot_id ? item.slot_id.toString() : null,
          subject_id: matchingException.subject_id ? matchingException.subject_id.toString() : null,
          teacher_id: matchingException.teacher_id ? matchingException.teacher_id.toString() : null,
          subject: matchingException.subject_id ? {
            subject_id: matchingException.subject_id.toString(),
            subject_name: matchingException.exception_type === 'exam' ? 'EXAM' : (matchingException.subject_name || matchingException.title)
          } : null,
          teacher: matchingException.teacher_id ? {
            teacher_id: matchingException.teacher_id.toString(),
            name: matchingException.teacher_name
          } : null,
          is_exception: true,
          exception_type: matchingException.exception_type,
          exception_title: matchingException.title
        };
      } else {
        // Regular schedule
        return {
          ...item,
          schedule_id: item.schedule_id ? item.schedule_id.toString() : null,
          class_id: item.class_id ? item.class_id.toString() : null,
          slot_id: item.slot_id ? item.slot_id.toString() : null,
          subject_id: item.subject_id ? item.subject_id.toString() : null,
          teacher_id: item.teacher_id ? item.teacher_id.toString() : null,
          subject: item.subject_id ? {
            subject_id: item.subject_id.toString(),
            subject_name: item.subject_name
          } : null,
          teacher: item.teacher_id ? {
            teacher_id: item.teacher_id.toString(),
            name: item.teacher_name
          } : null,
          is_exception: false
        };
      }
    });

    res.json({ schedule: transformedSchedule, exceptions: exceptions, weekDates: weekDates });
  } catch (error) {
    console.error('Error fetching class schedule:', error);
    res.status(500).json({ error: 'Failed to fetch class schedule' });
  }
});

// Create or update schedule entry
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      section,
      dayOfWeek,
      slotId,
      subjectId,
      teacherId,
      academicYear
    } = req.body;

    // Check if schedule entry already exists
    const existingSchedule = await prisma.$queryRaw`
      SELECT * FROM class_schedule 
      WHERE class_id = ${parseInt(classId)}
        AND section = ${section}
        AND day_of_week = ${parseInt(dayOfWeek)}
        AND slot_id = ${parseInt(slotId)}
        AND academic_year = ${academicYear || '2024-2025'}
    `;

    let scheduleEntry;
    
    if (existingSchedule.length > 0) {
      // Update existing entry
      scheduleEntry = await prisma.$queryRaw`
        UPDATE class_schedule 
        SET subject_id = ${subjectId ? parseInt(subjectId) : null},
            teacher_id = ${teacherId ? BigInt(teacherId) : null},
            updated_at = NOW()
        WHERE schedule_id = ${existingSchedule[0].schedule_id}
        RETURNING *
      `;
    } else {
      // Create new entry
      scheduleEntry = await prisma.$queryRaw`
        INSERT INTO class_schedule 
        (class_id, section, day_of_week, slot_id, subject_id, teacher_id, academic_year, is_active)
        VALUES (${parseInt(classId)}, ${section}, ${parseInt(dayOfWeek)}, ${parseInt(slotId)}, 
                ${subjectId ? parseInt(subjectId) : null}, ${teacherId ? BigInt(teacherId) : null}, 
                ${academicYear || '2024-2025'}, true)
        RETURNING *
      `;
    }

    // Convert BigInt fields to strings for JSON serialization
    const normalizedResult = scheduleEntry[0] || scheduleEntry;
    if (normalizedResult) {
      normalizedResult.schedule_id = normalizedResult.schedule_id ? normalizedResult.schedule_id.toString() : null;
      normalizedResult.class_id = normalizedResult.class_id ? normalizedResult.class_id.toString() : null;
      normalizedResult.slot_id = normalizedResult.slot_id ? normalizedResult.slot_id.toString() : null;
      normalizedResult.subject_id = normalizedResult.subject_id ? normalizedResult.subject_id.toString() : null;
      normalizedResult.teacher_id = normalizedResult.teacher_id ? normalizedResult.teacher_id.toString() : null;
    }

    res.json(normalizedResult);
  } catch (error) {
    console.error('Error creating/updating schedule:', error);
    res.status(500).json({ error: 'Failed to create/update schedule' });
  }
});

// Update schedule entry (PUT method for frontend compatibility)
router.put('/schedule', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      section,
      dayOfWeek,
      slotId,
      subjectId,
      teacherId,
      academicYear,
      scheduleId
    } = req.body;

    console.log('PUT Schedule Update Request:', {
      classId,
      section,
      dayOfWeek,
      slotId,
      subjectId,
      teacherId,
      academicYear,
      scheduleId
    });

    // Handle teacherId - if it's a string (teacher name), find the teacher ID
    let finalTeacherId = teacherId;
    if (teacherId && isNaN(teacherId)) {
      // teacherId is a string (teacher name), find the actual teacher ID
      const teacher = await prisma.$queryRaw`
        SELECT teacher_id FROM teachers WHERE name = ${teacherId}
      `;
      if (teacher.length > 0) {
        finalTeacherId = teacher[0].teacher_id;
      } else {
        return res.status(400).json({ error: 'Teacher not found' });
      }
    }

    // If scheduleId is provided, update that specific entry
    if (scheduleId) {
      const updateQuery = await prisma.$queryRaw`
        UPDATE class_schedule
        SET subject_id = ${subjectId ? parseInt(subjectId) : null},
            teacher_id = ${finalTeacherId ? BigInt(finalTeacherId) : null},
            updated_at = NOW()
        WHERE schedule_id = ${BigInt(scheduleId)}
        RETURNING *
      `;

      if (updateQuery.length === 0) {
        return res.status(404).json({ error: 'Schedule entry not found' });
      }

      // Convert BigInt fields to strings for JSON serialization
      const normalizedResult = {
        ...updateQuery[0],
        schedule_id: updateQuery[0].schedule_id ? updateQuery[0].schedule_id.toString() : null,
        class_id: updateQuery[0].class_id ? updateQuery[0].class_id.toString() : null,
        slot_id: updateQuery[0].slot_id ? updateQuery[0].slot_id.toString() : null,
        subject_id: updateQuery[0].subject_id ? updateQuery[0].subject_id.toString() : null,
        teacher_id: updateQuery[0].teacher_id ? updateQuery[0].teacher_id.toString() : null,
      };

      return res.json(normalizedResult);
    }

    // Otherwise, find by class/section/day/slot and update
    const existingSchedule = await prisma.$queryRaw`
      SELECT * FROM class_schedule
      WHERE class_id = ${parseInt(classId)}
        AND section = ${section}
        AND day_of_week = ${parseInt(dayOfWeek)}
        AND slot_id = ${parseInt(slotId)}
        AND academic_year = ${academicYear || '2024-2025'}
    `;

    if (existingSchedule.length === 0) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    const updateQuery = await prisma.$queryRaw`
      UPDATE class_schedule
      SET subject_id = ${subjectId ? parseInt(subjectId) : null},
          teacher_id = ${finalTeacherId ? BigInt(finalTeacherId) : null},
          updated_at = NOW()
      WHERE schedule_id = ${existingSchedule[0].schedule_id}
      RETURNING *
    `;

    // Convert BigInt fields to strings for JSON serialization
    const normalizedResult = {
      ...updateQuery[0],
      schedule_id: updateQuery[0].schedule_id ? updateQuery[0].schedule_id.toString() : null,
      class_id: updateQuery[0].class_id ? updateQuery[0].class_id.toString() : null,
      slot_id: updateQuery[0].slot_id ? updateQuery[0].slot_id.toString() : null,
      subject_id: updateQuery[0].subject_id ? updateQuery[0].subject_id.toString() : null,
      teacher_id: updateQuery[0].teacher_id ? updateQuery[0].teacher_id.toString() : null,
    };

    res.json(normalizedResult);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete schedule entry
router.delete('/schedule/:scheduleId', authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    await prisma.$queryRaw`
      DELETE FROM class_schedule 
      WHERE schedule_id = ${BigInt(scheduleId)}
    `;

    res.json({ message: 'Schedule entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Get all schedule exceptions (events/exams)
router.get('/exceptions', authenticateToken, async (req, res) => {
  try {
    const { academicYear, classId, section } = req.query;
    
    const whereClause = {
      academicYear: academicYear || '2024-25'
    };

    if (classId && section) {
      whereClause.OR = [
        {
          classId: parseInt(classId),
          section: section
        },
        {
          affectsAllClasses: true
        }
      ];
    }

    const exceptions = await prisma.scheduleException.findMany({
      where: whereClause,
      include: {
        class: true,
        timeSlot: true,
        subject: true,
        teacher: true,
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { exceptionDate: 'asc' }
    });

    res.json(exceptions);
  } catch (error) {
    console.error('Error fetching exceptions:', error);
    res.status(500).json({ error: 'Failed to fetch exceptions' });
  }
});

// Get schedule exceptions
router.get('/exceptions', authenticateToken, async (req, res) => {
  try {
    const { academicYear, classId, section, startDate, endDate } = req.query;

    let whereClause = {
      academicYear: academicYear || '2024-2025'
    };

    if (classId) {
      whereClause.classId = parseInt(classId);
    }

    if (section) {
      whereClause.section = section;
    }

    if (startDate && endDate) {
      whereClause.exceptionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const exceptions = await prisma.scheduleException.findMany({
      where: whereClause,
      include: {
        class: true,
        timeSlot: true,
        subject: true,
        teacher: true,
        creator: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { exceptionDate: 'asc' },
        { slotId: 'asc' }
      ]
    });

    // Convert BigInt fields to strings for JSON serialization
    const exceptionsWithStringIds = exceptions.map(exc => ({
      ...exc,
      exception_id: exc.exceptionId.toString(),
      class_id: exc.classId ? exc.classId.toString() : null,
      slot_id: exc.slotId ? exc.slotId.toString() : null,
      subject_id: exc.subjectId ? exc.subjectId.toString() : null,
      teacher_id: exc.teacherId ? exc.teacherId.toString() : null,
      created_by: exc.createdBy.toString(),
      exception_date: exc.exceptionDate.toISOString().split('T')[0] // Format date
    }));

    res.json(exceptionsWithStringIds);
  } catch (error) {
    console.error('Error fetching exceptions:', error);
    res.status(500).json({ error: 'Failed to fetch exceptions' });
  }
});

// Create schedule exception (exam/event)
router.post('/exceptions', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      section,
      exceptionDate,
      slotId,
      exceptionType,
      title,
      description,
      subjectId,
      teacherId,
      academicYear,
      affectsAllClasses
    } = req.body;

    const exception = await prisma.scheduleException.create({
      data: {
        classId: classId ? parseInt(classId) : null,
        section: section || null,
        exceptionDate: new Date(exceptionDate),
        slotId: slotId ? parseInt(slotId) : null,
        exceptionType: exceptionType,
        title: title,
        description: description || null,
        subjectId: subjectId ? parseInt(subjectId) : null,
        teacherId: teacherId ? BigInt(teacherId) : null,
        academicYear: academicYear || '2024-25',
        affectsAllClasses: affectsAllClasses || false,
        createdBy: BigInt(req.user.id)
      },
      include: {
        class: true,
        timeSlot: true,
        subject: true,
        teacher: true
      }
    });

    // Convert BigInt fields to strings for JSON serialization
    const exceptionWithStringIds = {
      ...exception,
      exceptionId: exception.exceptionId.toString(),
      classId: exception.classId ? exception.classId.toString() : null,
      slotId: exception.slotId ? exception.slotId.toString() : null,
      subjectId: exception.subjectId ? exception.subjectId.toString() : null,
      teacherId: exception.teacherId ? exception.teacherId.toString() : null,
      createdBy: exception.createdBy.toString()
    };

    res.json(exceptionWithStringIds);
  } catch (error) {
    console.error('Error creating exception:', error);
    res.status(500).json({ error: 'Failed to create exception' });
  }
});

// Update schedule exception
router.put('/exceptions/:exceptionId', authenticateToken, async (req, res) => {
  try {
    const { exceptionId } = req.params;
    const {
      exceptionDate,
      slotId,
      title,
      description,
      subjectId,
      teacherId
    } = req.body;

    const exception = await prisma.scheduleException.update({
      where: { exceptionId: BigInt(exceptionId) },
      data: {
        exceptionDate: exceptionDate ? new Date(exceptionDate) : undefined,
        slotId: slotId ? parseInt(slotId) : undefined,
        title: title,
        description: description,
        subjectId: subjectId ? parseInt(subjectId) : undefined,
        teacherId: teacherId ? BigInt(teacherId) : undefined
      },
      include: {
        class: true,
        timeSlot: true,
        subject: true,
        teacher: true
      }
    });

    // Convert BigInt fields to strings for JSON serialization
    const exceptionWithStringIds = {
      ...exception,
      exceptionId: exception.exceptionId.toString(),
      classId: exception.classId ? exception.classId.toString() : null,
      slotId: exception.slotId ? exception.slotId.toString() : null,
      subjectId: exception.subjectId ? exception.subjectId.toString() : null,
      teacherId: exception.teacherId ? exception.teacherId.toString() : null,
      createdBy: exception.createdBy.toString()
    };

    res.json(exceptionWithStringIds);
  } catch (error) {
    console.error('Error updating exception:', error);
    res.status(500).json({ error: 'Failed to update exception' });
  }
});

// Delete schedule exception
router.delete('/exceptions/:exceptionId', authenticateToken, async (req, res) => {
  try {
    const { exceptionId } = req.params;

    await prisma.scheduleException.delete({
      where: { exceptionId: BigInt(exceptionId) }
    });

    res.json({ message: 'Exception deleted successfully' });
  } catch (error) {
    console.error('Error deleting exception:', error);
    res.status(500).json({ error: 'Failed to delete exception' });
  }
});

// Get schedule for multiple classes (for bulk exam scheduling)
router.get('/bulk-schedule', authenticateToken, async (req, res) => {
  try {
    const { academicYear, grade } = req.query;

    // Get all classes for the grade or all classes
    const whereClause = { academicYear: academicYear || '2024-25' };
    if (grade) {
      whereClause.className = { startsWith: grade };
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        classSchedules: {
          include: {
            timeSlot: true,
            subject: true,
            teacher: true
          }
        }
      }
    });

    res.json(classes);
  } catch (error) {
    console.error('Error fetching bulk schedule:', error);
    res.status(500).json({ error: 'Failed to fetch bulk schedule' });
  }
});

module.exports = router;
