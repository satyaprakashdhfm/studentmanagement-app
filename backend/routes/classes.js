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

    // Include both active and inactive classes for management interface
    // where.active = true;  // Removed this filter to show all classes

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
            teacherId: true,
            name: true,
            email: true,
            phoneNumber: true
          }
        },
        students: {
          // Include all students (active and inactive) for management interface
          select: {
            studentId: true,
            name: true,
            email: true,
            status: true
          }
        },
        _count: {
          select: {
            students: true,
            attendances: true,
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

    res.json({
      classes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
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
            teacherId: true,
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

    // Convert Decimal fields to numbers for JSON serialization
    const classWithSerializedData = {
      ...classItem,
      fees: classItem.fees.map(fee => ({
        ...fee,
        amountDue: Number(fee.amountDue),
        amountPaid: Number(fee.amountPaid),
        balance: Number(fee.balance)
      }))
    };

    res.json(classWithSerializedData);

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

    // Check if class combination already exists (className + section + academicYear)
    const existingClass = await prisma.class.findFirst({
      where: {
        className: className,
        section: section,
        academicYear: academicYear
      }
    });

    if (existingClass) {
      return res.status(409).json({ 
        error: `Class ${className} - Section ${section} already exists for academic year ${academicYear}` 
      });
    }

    // Check if class teacher exists
    if (classTeacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId: classTeacherId }
      });

      if (!teacher) {
        return res.status(400).json({ error: 'Class teacher not found' });
      }
    }

    // Generate a unique classId following the pattern: ACADEMIC_YEAR + GRADE + SECTION_SEQUENCE
    // Example: 242510001 = 2425(2024-2025) + 10(Grade 10) + 001(Section A)
    
    // Extract academic year digits (e.g., "2024-2025" -> "2425")
    const academicYearParts = academicYear.split('-');
    const yearPrefix = academicYearParts[0].slice(2) + academicYearParts[1].slice(2); // "24" + "25"
    
    // Grade part (ensure 2 digits for grades 1-9, keep as-is for 10)
    const gradePart = className.padStart(2, '0');
    
    // Section sequence (A=001, B=002, C=003, D=004, etc.)
    const sectionSequence = (section.charCodeAt(0) - 65 + 1).toString().padStart(3, '0');
    
    // Generate the class ID
    const newClassId = parseInt(`${yearPrefix}${gradePart}${sectionSequence}`);

    // Check if a deactivated class with the same classId already exists
    const existingDeactivatedClass = await prisma.class.findUnique({
      where: { classId: newClassId },
      include: {
        classTeacher: {
          select: {
            teacherId: true,
            name: true,
            email: true,
            qualification: true,
            subjectsHandled: true
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      }
    });

    let newClass;
    let message;

    if (existingDeactivatedClass && !existingDeactivatedClass.active) {
      // Reactivate the existing deactivated class
      newClass = await prisma.class.update({
        where: { classId: newClassId },
        data: {
          className,
          section,
          classTeacherId: classTeacherId || null,
          academicYear,
          maxStudents: maxStudents ? parseInt(maxStudents) : null,
          active: true, // Reactivate the class
          updatedAt: new Date()
        },
        include: {
          classTeacher: {
            select: {
              teacherId: true,
              name: true,
              email: true,
              qualification: true,
              subjectsHandled: true
            }
          },
          _count: {
            select: {
              students: true
            }
          }
        }
      });
      message = 'Class reactivated successfully (existing class was restored)';
    } else if (existingDeactivatedClass && existingDeactivatedClass.active) {
      // Active class already exists
      return res.status(409).json({ 
        error: `Class ${className} - ${section} already exists and is active` 
      });
    } else {
      // Create completely new class
      newClass = await prisma.class.create({
        data: {
          classId: newClassId,
          className,
          section,
          classTeacherId: classTeacherId || null,
          academicYear,
          maxStudents: maxStudents ? parseInt(maxStudents) : null,
          active: true // Explicitly set as active
        },
        include: {
          classTeacher: {
            select: {
              teacherId: true,
              name: true,
              email: true,
              qualification: true,
              subjectsHandled: true
            }
          },
          _count: {
            select: {
              students: true
            }
          }
        }
      });
      message = 'Class created successfully';
    }

    res.status(201).json({
      class: newClass,
      message: message
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
        where: { teacherId: updateData.classTeacherId }
      });

      if (!teacher) {
        return res.status(400).json({ error: 'Class teacher not found' });
      }
    }

    // Prepare update data
    const dataToUpdate = {
      ...updateData,
      classTeacherId: updateData.classTeacherId || null,
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
      class: updatedClass,
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

    // Get count of active students in this class for reporting
    const activeStudentsCount = await prisma.student.count({
      where: { 
        classId: parseInt(id),
        status: 'active'
      }
    });

    // Use transaction to deactivate class and all its students
    await prisma.$transaction(async (prisma) => {
      // Step 1: Deactivate all active students in this class
      if (activeStudentsCount > 0) {
        await prisma.student.updateMany({
          where: { 
            classId: parseInt(id),
            status: 'active'
          },
          data: { 
            status: 'inactive',
            updatedAt: new Date()
          }
        });

        // Step 2: Deactivate corresponding user accounts for those students
        const activeStudents = await prisma.student.findMany({
          where: { 
            classId: parseInt(id),
            status: 'inactive'  // Just deactivated above
          },
          select: { studentId: true }
        });

        if (activeStudents.length > 0) {
          await prisma.user.updateMany({
            where: {
              username: {
                in: activeStudents.map(s => s.studentId)
              }
            },
            data: {
              active: false,
              updatedAt: new Date()
            }
          });
        }
      }

      // Step 3: Deactivate the class itself
      await prisma.class.update({
        where: { classId: parseInt(id) },
        data: { 
          active: false,
          updatedAt: new Date()
        }
      });
    });

    const message = activeStudentsCount > 0 
      ? `Class deactivated successfully. ${activeStudentsCount} students were also deactivated (data preserved for history)`
      : 'Class deactivated successfully (data preserved for history)';

    res.json({ message });

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

// DELETE /api/classes/:id/hard-delete - Permanently delete class from database
router.delete('/:id/hard-delete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { classId: parseInt(id) },
      include: {
        _count: {
          select: {
            students: true,
            attendance: true,
            marks: true,
            fees: true
          }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Use transaction to permanently delete everything
    await prisma.$transaction(async (prisma) => {
      // Step 1: Delete all related data
      
      // Delete attendance records
      await prisma.attendance.deleteMany({
        where: { classId: parseInt(id) }
      });

      // Delete marks records
      await prisma.marks.deleteMany({
        where: { classId: parseInt(id) }
      });

      // Delete fees records
      await prisma.fees.deleteMany({
        where: { classId: parseInt(id) }
      });

      // Delete syllabus records
      await prisma.syllabus.deleteMany({
        where: { classId: parseInt(id) }
      });

      // Step 2: Get all students in this class
      const studentsInClass = await prisma.student.findMany({
        where: { classId: parseInt(id) },
        select: { studentId: true }
      });

      // Step 3: Delete user accounts for these students
      if (studentsInClass.length > 0) {
        await prisma.user.deleteMany({
          where: {
            username: {
              in: studentsInClass.map(s => s.studentId)
            }
          }
        });
      }

      // Step 4: Delete all students in this class
      await prisma.student.deleteMany({
        where: { classId: parseInt(id) }
      });

      // Step 5: Finally delete the class itself
      await prisma.class.delete({
        where: { classId: parseInt(id) }
      });
    });

    res.json({ 
      message: `Class permanently deleted from database. All related data has been removed.`,
      studentsDeleted: existingClass._count.students,
      attendanceRecordsDeleted: existingClass._count.attendance,
      marksRecordsDeleted: existingClass._count.marks,
      feesRecordsDeleted: existingClass._count.fees
    });

  } catch (error) {
    console.error('Hard delete class error:', error);
    res.status(500).json({ error: 'Failed to permanently delete class' });
  }
});

module.exports = router;
