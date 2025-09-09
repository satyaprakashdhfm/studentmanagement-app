const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();
const prisma = new PrismaClient();

// Get all time slots
router.get('/timeslots', authenticateToken, async (req, res) => {
  try {
    const timeSlots = await prisma.$queryRaw`
      SELECT * FROM time_slots 
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
    const { academicYear } = req.query;

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

    // Transform the data to match frontend expectations
    const transformedSchedule = schedule.map(item => ({
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
      } : null
    }));

    res.json({ schedule: transformedSchedule, exceptions: [] });
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

    res.json(scheduleEntry[0] || scheduleEntry);
  } catch (error) {
    console.error('Error creating/updating schedule:', error);
    res.status(500).json({ error: 'Failed to create/update schedule' });
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

    res.json(exception);
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

    res.json(exception);
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
