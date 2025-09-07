const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/classes - Get all classes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, academicYear, page = 1, limit = 50 } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add search filter
    if (search) {
      where.OR = [
        { className: { contains: search, mode: 'insensitive' } },
        { section: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add academic year filter
    if (academicYear) {
      where.academicYear = academicYear;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get classes with pagination and relations
    const classes = await prisma.class.findMany({
      where,
      include: {
        classTeacher: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true
          }
        },
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        },
        _count: {
          select: {
            students: true,
            attendance: true,
            marks: true,
            fees: true
          }
        }
      },
      orderBy: [
        { className: 'asc' },
        { section: 'asc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.class.count({ where });

    // Convert BigInt IDs to Numbers for JSON serialization
    const classesWithNumericIds = classes.map(classItem => {
      return JSON.parse(JSON.stringify(classItem, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    });

    res.json({
      classes: classesWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(Number(total) / limitNum)
      }
    });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/classes/:id - Get class by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const classItem = await prisma.class.findUnique({
      where: { classId: parseInt(id) },
      include: {
        classTeacher: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            qualification: true
          }
        },
        students: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                active: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        },
        attendance: {
          include: {
            student: {
              select: {
                name: true,
                email: true
              }
            },
            teacher: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          take: 50
        },
        marks: {
          include: {
            student: {
              select: {
                name: true,
                email: true
              }
            },
            subject: {
              select: {
                subjectName: true,
                subjectCode: true
              }
            },
            teacher: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            entryDate: 'desc'
          },
          take: 50
        },
        fees: {
          include: {
            student: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        syllabus: {
          include: {
            subject: {
              select: {
                subjectName: true,
                subjectCode: true
              }
            },
            teacher: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!classItem) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Convert BigInt IDs and Decimals to Numbers
    const classWithNumericIds = {
      ...classItem,
      classTeacher: classItem.classTeacher ? {
        ...classItem.classTeacher,
        id: Number(classItem.classTeacher.id)
      } : null,
      students: classItem.students.map(student => ({
        ...student,
        id: Number(student.id),
        userId: Number(student.userId)
      })),
      attendance: classItem.attendance.map(att => ({
        ...att,
        attendanceId: Number(att.attendanceId),
        studentId: Number(att.studentId),
        markedBy: Number(att.markedBy)
      })),
      marks: classItem.marks.map(mark => ({
        ...mark,
        marksId: Number(mark.marksId),
        studentId: Number(mark.studentId),
        teacherId: Number(mark.teacherId)
      })),
      fees: classItem.fees.map(fee => ({
        ...fee,
        feeId: Number(fee.feeId),
        studentId: Number(fee.studentId),
        amountDue: Number(fee.amountDue),
        amountPaid: Number(fee.amountPaid),
        balance: Number(fee.balance)
      })),
      syllabus: classItem.syllabus.map(syl => ({
        ...syl,
        teacherId: Number(syl.teacherId)
      }))
    };

    res.json(classWithNumericIds);

  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes - Create new class
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      className,
      section,
      classTeacherId,
      academicYear,
      maxStudents
    } = req.body;

    // Check if class already exists
    const existingClass = await prisma.class.findUnique({
      where: { classId: parseInt(classId) }
    });

    if (existingClass) {
      return res.status(409).json({ error: 'Class ID already exists' });
    }

    // Check if class teacher exists
    if (classTeacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: BigInt(classTeacherId) }
      });

      if (!teacher) {
        return res.status(400).json({ error: 'Class teacher not found' });
      }
    }

    // Create new class
    const newClass = await prisma.class.create({
      data: {
        classId: parseInt(classId),
        className,
        section,
        classTeacherId: classTeacherId ? BigInt(classTeacherId) : null,
        academicYear,
        maxStudents: maxStudents ? parseInt(maxStudents) : null
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      class: {
        ...newClass,
        classTeacher: newClass.classTeacher ? {
          ...newClass.classTeacher,
          id: Number(newClass.classTeacher.id)
        } : null
      },
      message: 'Class created successfully'
    });

  } catch (error) {
    console.error('Create class error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Class ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { classId: parseInt(id) }
    });

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Validate class teacher if provided
    if (updateData.classTeacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: BigInt(updateData.classTeacherId) }
      });

      if (!teacher) {
        return res.status(400).json({ error: 'Class teacher not found' });
      }
    }

    // Prepare update data
    const dataToUpdate = {
      ...updateData,
      classTeacherId: updateData.classTeacherId ? BigInt(updateData.classTeacherId) : null,
      maxStudents: updateData.maxStudents ? parseInt(updateData.maxStudents) : updateData.maxStudents
    };

    // Remove classId from update data (shouldn't be updated)
    delete dataToUpdate.classId;

    // Update class
    const updatedClass = await prisma.class.update({
      where: { classId: parseInt(id) },
      data: dataToUpdate,
      include: {
        classTeacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      class: {
        ...updatedClass,
        classTeacher: updatedClass.classTeacher ? {
          ...updatedClass.classTeacher,
          id: Number(updatedClass.classTeacher.id)
        } : null
      },
      message: 'Class updated successfully'
    });

  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { classId: parseInt(id) },
      include: {
        _count: {
          select: {
            students: true
          }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if class has students
    if (existingClass._count.students > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class with enrolled students. Please transfer students first.' 
      });
    }

    // Delete class
    await prisma.class.delete({
      where: { classId: parseInt(id) }
    });

    res.json({ message: 'Class deleted successfully' });

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/classes/stats/overview - Get class statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Total classes
    const total = await prisma.class.count();

    // Classes by academic year
    const yearStats = await prisma.class.groupBy({
      by: ['academicYear'],
      _count: {
        academicYear: true
      },
      orderBy: {
        academicYear: 'desc'
      }
    });

    // Class enrollment statistics
    const enrollmentStats = await prisma.class.findMany({
      select: {
        classId: true,
        className: true,
        section: true,
        maxStudents: true,
        _count: {
          select: {
            students: true
          }
        }
      }
    });

    // Calculate utilization
    const utilizationData = enrollmentStats.map(classItem => ({
      classId: classItem.classId,
      className: `${classItem.className} - ${classItem.section}`,
      currentStudents: classItem._count.students,
      maxStudents: classItem.maxStudents || 0,
      utilizationPercentage: classItem.maxStudents 
        ? Math.round((classItem._count.students / classItem.maxStudents) * 100)
        : 0
    }));

    res.json({
      total,
      yearDistribution: yearStats.map(stat => ({
        academicYear: stat.academicYear,
        count: stat._count.academicYear
      })),
      enrollmentStats: utilizationData
    });

  } catch (error) {
    console.error('Get class stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
