const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/attendance - Get attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      teacherId,
      status, 
      startDate, 
      endDate,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add filters
    if (studentId) {
      where.studentId = BigInt(studentId);
    }
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (teacherId) {
      where.markedBy = BigInt(teacherId);
    }
    
    if (status) {
      where.status = status;
    }
    
    // Add date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get attendance records with pagination and relations
    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        },
        class: {
          select: {
            className: true,
            section: true,
            academicYear: true
          }
        },
        teacher: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { period: 'asc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.attendance.count({ where });

    // Convert BigInt IDs to Numbers for JSON serialization
    const attendanceWithNumericIds = attendance.map(record => {
      return JSON.parse(JSON.stringify(record, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    });

    res.json({
      attendance: attendanceWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(Number(total) / limitNum)
      }
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/attendance/student/:studentId - Get attendance records for a specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    
    // Build where clause
    const where = {
      studentId: BigInt(studentId)
    };
    
    // Add date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get attendance records with pagination and relations
    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        class: {
          select: {
            className: true,
            section: true,
            academicYear: true
          }
        },
        teacher: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { period: 'asc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.attendance.count({ where });

    // Convert BigInt IDs to Numbers for JSON serialization
    const attendanceWithNumericIds = attendance.map(record => {
      return JSON.parse(JSON.stringify(record, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    });

    res.json({
      attendance: attendanceWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(Number(total) / limitNum)
      }
    });

  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/attendance/:id - Get attendance record by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const attendanceRecord = await prisma.attendance.findUnique({
      where: { attendanceId: BigInt(id) },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        class: {
          select: {
            className: true,
            section: true,
            academicYear: true
          }
        },
        teacher: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!attendanceRecord) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Convert BigInt IDs to Numbers
    const recordWithNumericIds = {
      ...attendanceRecord,
      attendanceId: Number(attendanceRecord.attendanceId),
      studentId: Number(attendanceRecord.studentId),
      markedBy: Number(attendanceRecord.markedBy)
    };

    res.json(recordWithNumericIds);

  } catch (error) {
    console.error('Get attendance record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance - Create new attendance record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      studentId,
      classId,
      date,
      period,
      status,
      markedBy
    } = req.body;

    // Validate required fields
    if (!studentId || !classId || !date || !period || !status || !markedBy) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: BigInt(studentId) }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if class exists
    const classExists = await prisma.class.findUnique({
      where: { classId: parseInt(classId) }
    });

    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: BigInt(markedBy) }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Check if attendance already exists for this student, class, date, and period
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: BigInt(studentId),
        classId: parseInt(classId),
        date: new Date(date),
        period: parseInt(period)
      }
    });

    if (existingAttendance) {
      return res.status(409).json({ error: 'Attendance already marked for this student, class, date, and period' });
    }

    // Create new attendance record
    const newAttendance = await prisma.attendance.create({
      data: {
        studentId: BigInt(studentId),
        classId: parseInt(classId),
        date: new Date(date),
        period: parseInt(period),
        status,
        markedBy: BigInt(markedBy)
      },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        },
        class: {
          select: {
            className: true,
            section: true
          }
        },
        teacher: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(201).json({
      attendance: {
        ...newAttendance,
        attendanceId: Number(newAttendance.attendanceId),
        studentId: Number(newAttendance.studentId),
        markedBy: Number(newAttendance.markedBy)
      },
      message: 'Attendance marked successfully'
    });

  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance/bulk - Create multiple attendance records
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { attendanceRecords, classId, date, period, markedBy } = req.body;

    if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ error: 'Attendance records array is required' });
    }

    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: BigInt(markedBy) }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Validate class exists
    const classExists = await prisma.class.findUnique({
      where: { classId: parseInt(classId) }
    });

    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const attendanceDate = new Date(date);
    const periodNum = parseInt(period);

    // Create attendance records in transaction
    const result = await prisma.$transaction(async (prisma) => {
      const createdRecords = [];

      for (const record of attendanceRecords) {
        const { studentId, status } = record;

        // Check if attendance already exists
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            studentId: BigInt(studentId),
            classId: parseInt(classId),
            date: attendanceDate,
            period: periodNum
          }
        });

        if (!existingAttendance) {
          const newAttendance = await prisma.attendance.create({
            data: {
              studentId: BigInt(studentId),
              classId: parseInt(classId),
              date: attendanceDate,
              period: periodNum,
              status,
              markedBy: BigInt(markedBy)
            },
            include: {
              student: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          });

          createdRecords.push({
            ...newAttendance,
            attendanceId: Number(newAttendance.attendanceId),
            studentId: Number(newAttendance.studentId),
            markedBy: Number(newAttendance.markedBy)
          });
        }
      }

      return createdRecords;
    });

    res.status(201).json({
      attendance: result,
      message: `${result.length} attendance records created successfully`
    });

  } catch (error) {
    console.error('Bulk create attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/attendance/:id - Update attendance record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, period } = req.body;

    // Check if attendance record exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: { attendanceId: BigInt(id) }
    });

    if (!existingAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { attendanceId: BigInt(id) },
      data: {
        status: status || existingAttendance.status,
        period: period ? parseInt(period) : existingAttendance.period
      },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        },
        class: {
          select: {
            className: true,
            section: true
          }
        },
        teacher: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({
      attendance: {
        ...updatedAttendance,
        attendanceId: Number(updatedAttendance.attendanceId),
        studentId: Number(updatedAttendance.studentId),
        markedBy: Number(updatedAttendance.markedBy)
      },
      message: 'Attendance updated successfully'
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/attendance/:id - Delete attendance record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if attendance record exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: { attendanceId: BigInt(id) }
    });

    if (!existingAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Delete attendance record
    await prisma.attendance.delete({
      where: { attendanceId: BigInt(id) }
    });

    res.json({ message: 'Attendance record deleted successfully' });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/attendance/stats/overview - Get attendance statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, classId, studentId } = req.query;

    // Build where clause for date range
    const where = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (classId) {
      where.classId = parseInt(classId);
    }

    if (studentId) {
      where.studentId = BigInt(studentId);
    }

    // Get attendance statistics by status
    const statusStats = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      }
    });

    // Get daily attendance trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: {
        ...where,
        date: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        status: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Get class-wise attendance
    const classStats = await prisma.attendance.groupBy({
      by: ['classId', 'status'],
      where,
      _count: {
        status: true
      }
    });

    // Get class details for stats
    const classIds = [...new Set(classStats.map(stat => stat.classId))];
    const classDetails = await prisma.class.findMany({
      where: {
        classId: {
          in: classIds
        }
      },
      select: {
        classId: true,
        className: true,
        section: true
      }
    });

    res.json({
      statusDistribution: statusStats.map(stat => ({
        status: stat.status,
        count: stat._count.status
      })),
      dailyTrends: dailyStats,
      classWiseStats: classStats.map(stat => {
        const classDetail = classDetails.find(c => c.classId === stat.classId);
        return {
          classId: stat.classId,
          className: classDetail ? `${classDetail.className} - ${classDetail.section}` : 'Unknown',
          status: stat.status,
          count: stat._count.status
        };
      })
    });

  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
