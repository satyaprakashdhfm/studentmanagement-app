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
      subjectCode, // Added subject filtering
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add filters
    if (studentId) {
      where.studentId = studentId;
    }
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (teacherId) {
      where.markedBy = teacherId;
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

    // For class-specific queries, student-specific queries, or when high limit is requested, show ALL records without pagination
    // This ensures attendance tracker gets full academic year data
    const shouldPaginate = !classId && !studentId && limitNum <= 1000;

        // Build WHERE conditions
    let whereConditions = 'WHERE 1=1';

    if (studentId) {
      whereConditions += ` AND a.student_id = '${studentId.replace(/'/g, "''")}'`;
    }

    if (classId) {
      whereConditions += ` AND a.class_id = ${parseInt(classId)}`;
    }

    if (teacherId) {
      whereConditions += ` AND a.marked_by = '${teacherId.replace(/'/g, "''")}'`;
    }

    if (status) {
      whereConditions += ` AND a.status = '${status.replace(/'/g, "''")}'`;
    }

    if (startDate) {
      whereConditions += ` AND a.date >= '${startDate.replace(/'/g, "''")}'`;
    }

    if (endDate) {
      whereConditions += ` AND a.date <= '${endDate.replace(/'/g, "''")}'`;
    }

    if (subjectCode) {
      whereConditions += ` AND COALESCE(s.subject_code, a.subject_code) = '${subjectCode.replace(/'/g, "''")}'`;
    }

    // Add pagination
    let limitOffset = '';
    if (shouldPaginate) {
      limitOffset = ` LIMIT ${limitNum} OFFSET ${skip}`;
    }

    // Get attendance records with pagination and relations
    const query = `
      SELECT
        a.attendance_id, a.student_id, a.class_id, a.date, a.period, a.status, a.marked_by, a.timestamp, a.created_at, a.updated_at, a.schedule_id,
        COALESCE(s.subject_code, a.subject_code) as subject_code,
        sub.subject_name as subject_name,
        sub.subject_code as subject_code_key,
        st.name as student_name,
        st.email as student_email,
        c.class_name as class_name,
        c.section as section,
        c.academic_year as academic_year,
        u.username as marked_by_username,
        u.first_name as marked_by_firstname,
        u.last_name as marked_by_lastname
      FROM attendance a
      LEFT JOIN schedule_data s ON a.schedule_id = s.schedule_id
      LEFT JOIN subjects sub ON COALESCE(s.subject_code, a.subject_code) = sub.subject_code
      LEFT JOIN students st ON a.student_id = st.student_id
      LEFT JOIN classes c ON a.class_id = c.class_id
      LEFT JOIN users u ON a.marked_by = u.username
      ${whereConditions}
      ORDER BY a.date DESC, a.period ASC
      ${limitOffset}
    `;

    const attendance = await prisma.$queryRawUnsafe(query);

    // Get total count
    const total = await prisma.attendance.count({ where });

    // Format the raw query results to match the expected structure
    const formattedAttendance = attendance.map(record => ({
      attendanceId: record.attendance_id,
      studentId: record.student_id,
      classId: record.class_id,
      date: record.date.toISOString().split('T')[0],
      period: record.period,
      status: record.status,
      markedBy: record.marked_by,
      timestamp: record.timestamp,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      scheduleId: record.schedule_id,
      subjectCode: record.subject_code || record.subject_code_key,
      subjectName: record.subject_name,
      student: {
        name: record.student_name,
        email: record.student_email
      },
      class: {
        className: record.class_name,
        section: record.section,
        academicYear: record.academic_year
      },
      markedByUser: {
        username: record.marked_by_username,
        firstName: record.marked_by_firstname,
        lastName: record.marked_by_lastname
      }
    }));

    res.json({
      attendance: formattedAttendance,
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
      studentId: studentId
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
        markedByUser: {
          select: {
            username: true,
            firstName: true,
            lastName: true
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

// GET /api/attendance/:id - Get attendance by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const attendanceId = req.params.id;

    const attendance = await prisma.attendance.findUnique({
      where: { attendanceId },
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
      }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Format attendance record for JSON serialization
    const formattedRecord = {
      ...attendance,
      date: attendance.date.toISOString(),
      timestamp: attendance.timestamp.toISOString(),
      createdAt: attendance.createdAt.toISOString(),
      updatedAt: attendance.updatedAt.toISOString()
    };

    res.json(formattedRecord);

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
      markedBy,
      scheduleId,
      subjectCode
    } = req.body;

    // Validate required fields
    if (!studentId || !classId || !date || !period || !status || !markedBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: studentId, classId, date, period, status, markedBy' 
      });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { studentId }
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

    // Check if marker (teacher/admin) exists
    const marker = await prisma.user.findUnique({
      where: { username: markedBy }
    });
    if (!marker) {
      return res.status(404).json({ error: 'Marker (user) not found' });
    }

    // Check for duplicate attendance record
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        classId: parseInt(classId),
        date: new Date(date),
        period: parseInt(period)
      }
    });

    if (existingAttendance) {
      return res.status(409).json({ 
        error: 'Attendance record already exists for this student, class, date, and period' 
      });
    }

    // Get the day of week from the date (0 = Sunday, 1 = Monday, etc.)
    const attendanceDate = new Date(date);
    const dayOfWeek = attendanceDate.getDay();
    // Convert to match schedule_data format (1 = Monday, 7 = Sunday)
    const scheduleDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Find the schedule for this class, day, and period
    const schedule = await prisma.scheduleData.findFirst({
      where: {
        classId: parseInt(classId),
        dayOfWeek: scheduleDayOfWeek,
        slotNames: {
          contains: `P${period}`
        }
      }
    });

    // Generate attendance ID in format: YYYYMMDD_classId_period_studentId
    const dateStr = new Date(date).toISOString().split('T')[0].replace(/-/g, '');
    const attendanceId = `${dateStr}_${classId}_${period}_${studentId}`;

    // Create attendance record
    const newAttendance = await prisma.attendance.create({
      data: {
        attendanceId,
        studentId,
        classId: parseInt(classId),
        date: new Date(date),
        period: parseInt(period),
        status,
        markedBy,
        timestamp: new Date(),
        scheduleId: schedule?.scheduleId || null,
        subjectCode: subjectCode || null
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
        markedByUser: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      attendance: {
        ...newAttendance,
        date: newAttendance.date.toISOString(),
        timestamp: newAttendance.timestamp.toISOString(),
        createdAt: newAttendance.createdAt.toISOString(),
        updatedAt: newAttendance.updatedAt.toISOString()
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

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { username: markedBy }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
            studentId: studentId,
            classId: parseInt(classId),
            date: attendanceDate,
            period: periodNum
          }
        });

        if (!existingAttendance) {
          const newAttendance = await prisma.attendance.create({
            data: {
              studentId: studentId,
              classId: parseInt(classId),
              date: attendanceDate,
              period: periodNum,
              status,
              markedBy: markedBy
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
            date: newAttendance.date.toISOString(),
            timestamp: newAttendance.timestamp ? newAttendance.timestamp.toISOString() : new Date().toISOString(),
            createdAt: newAttendance.createdAt.toISOString(),
            updatedAt: newAttendance.updatedAt.toISOString()
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
    const attendanceId = req.params.id;
    const { status, markedBy } = req.body;

    // Check if attendance exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: { attendanceId }
    });

    if (!existingAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { attendanceId },
      data: {
        status: status || existingAttendance.status,
        markedBy: markedBy || existingAttendance.markedBy
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
        markedByUser: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      attendance: {
        ...updatedAttendance,
        date: updatedAttendance.date.toISOString(),
        timestamp: updatedAttendance.timestamp.toISOString(),
        createdAt: updatedAttendance.createdAt.toISOString(),
        updatedAt: updatedAttendance.updatedAt.toISOString()
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
    const attendanceId = req.params.id;

    // Check if attendance exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: { attendanceId }
    });

    if (!existingAttendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Delete attendance record
    await prisma.attendance.delete({
      where: { attendanceId }
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
    const { startDate, endDate, classId, studentId, academicYear } = req.query;

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
      where.studentId = studentId;
    }

    // Add academic year filtering by joining with Class table
    if (academicYear) {
      where.class = {
        academicYear: academicYear
      };
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
