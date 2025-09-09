const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');
const { hashPassword } = require('../utils/password');
const { 
  studentValidationRules, 
  updateStudentValidationRules,
  handleValidationErrors 
} = require('../utils/validation');

// GET /api/students - Get all students
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, classId, status, page = 1, limit = 50 } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { fatherName: { contains: search, mode: 'insensitive' } },
        { motherName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add class filter
    if (classId) {
      where.classId = parseInt(classId);
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get students with pagination and relations
    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            active: true
          }
        },
        class: {
          select: {
            classId: true,
            className: true,
            section: true,
            academicYear: true
          }
        },
        attendance: {
          select: {
            status: true,
            date: true
          },
          orderBy: {
            date: 'desc'
          },
          take: 10
        },
        marks: {
          select: {
            marksObtained: true,
            maxMarks: true,
            grade: true,
            examinationType: true,
            subject: {
              select: {
                subjectName: true
              }
            }
          },
          orderBy: {
            entryDate: 'desc'
          },
          take: 10
        },
        fees: {
          select: {
            feeType: true,
            amountDue: true,
            amountPaid: true,
            balance: true,
            paymentDate: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: { id: 'asc' },
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.student.count({ where });

    // Convert BigInt IDs to Numbers for JSON serialization
    const studentsWithNumericIds = students.map(student => ({
      ...student,
      id: Number(student.id),
      userId: Number(student.userId),
      fees: student.fees.map(fee => ({
        ...fee,
        amountDue: Number(fee.amountDue),
        amountPaid: Number(fee.amountPaid),
        balance: Number(fee.balance)
      }))
    }));

    res.json({
      success: true,
      data: studentsWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            active: true,
            lastLogin: true
          }
        },
        class: {
          select: {
            classId: true,
            className: true,
            section: true,
            academicYear: true,
            classTeacher: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        attendance: {
          include: {
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
          },
          orderBy: {
            date: 'desc'
          }
        },
        marks: {
          include: {
            subject: {
              select: {
                subjectName: true,
                subjectCode: true
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
          },
          orderBy: {
            entryDate: 'desc'
          }
        },
        fees: {
          include: {
            class: {
              select: {
                className: true,
                section: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    // Convert BigInt IDs and Decimals to Numbers
    const studentWithNumericIds = {
      ...student,
      id: Number(student.id),
      userId: Number(student.userId),
      fees: student.fees.map(fee => ({
        ...fee,
        feeId: Number(fee.feeId),
        studentId: Number(fee.studentId),
        amountDue: Number(fee.amountDue),
        amountPaid: Number(fee.amountPaid),
        balance: Number(fee.balance)
      })),
      marks: student.marks.map(mark => ({
        ...mark,
        marksId: Number(mark.marksId),
        studentId: Number(mark.studentId),
        teacherId: Number(mark.teacherId)
      })),
      attendance: student.attendance.map(att => ({
        ...att,
        attendanceId: Number(att.attendanceId),
        studentId: Number(att.studentId),
        markedBy: Number(att.markedBy)
      }))
    };

    res.json({
      success: true,
      data: studentWithNumericIds
    });

  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// POST /api/students - Create new student
router.post('/', authenticateToken, studentValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      name, 
      address, 
      phone, 
      dateOfBirth, 
      fatherName,
      fatherOccupation,
      motherName,
      motherOccupation,
      parentContact, 
      classId, 
      section, 
      admissionDate 
    } = req.body;

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(409).json({ 
        success: false,
        message: 'Username already exists' 
      });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create user and student in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create user first
      const newUser = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'student'
        }
      });

      // Create student
      const newStudent = await prisma.student.create({
        data: {
          userId: newUser.id,
          name: name || `${firstName} ${lastName}`.trim(),
          address,
          email,
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          fatherName,
          fatherOccupation,
          motherName,
          motherOccupation,
          parentContact,
          classId: classId ? parseInt(classId) : null,
          section,
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          status: 'active'
        },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          class: {
            select: {
              className: true,
              section: true,
              academicYear: true
            }
          }
        }
      });

      // Create default fee records for all fee types
      const defaultFeeTypes = [
        'Tuition Fee',
        'Transport Fee', 
        'Activity Fee',
        'Library Fee',
        'Exam Fee'
      ];

      // Get the current academic year from the class or use current year
      const academicYear = newStudent.class?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

      // Create fee records for each type with zero amounts
      for (const feeType of defaultFeeTypes) {
        await prisma.fee.create({
          data: {
            studentId: newStudent.id,
            classId: newStudent.classId,
            feeType: feeType,
            amountDue: 0,
            amountPaid: 0,
            balance: 0,
            academicYear: academicYear
          }
        });
      }

      return newStudent;
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        ...result,
        id: Number(result.id),
        userId: Number(result.userId)
      }
    });

  } catch (error) {
    console.error('Create student error:', error);
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return res.status(409).json({ 
        success: false,
        message: 'Email or username already exists' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', authenticateToken, updateStudentValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: BigInt(id) },
      include: { user: true }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Separate user data from student data
    const userData = {};
    const studentData = {};

    const userFields = ['username', 'email', 'firstName', 'lastName', 'active'];
  const studentFields = ['name', 'address', 'phone', 'dateOfBirth', 'fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'parentContact', 'classId', 'section', 'status'];

    Object.keys(updateData).forEach(key => {
      if (userFields.includes(key)) {
        userData[key] = updateData[key];
      } else if (studentFields.includes(key)) {
        if (key === 'dateOfBirth' && updateData[key]) {
          studentData[key] = new Date(updateData[key]);
        } else if (key === 'classId' && updateData[key]) {
          studentData[key] = parseInt(updateData[key]);
        } else {
          studentData[key] = updateData[key];
        }
      }
    });

    // Update in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update user if there's user data
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({
          where: { id: existingStudent.userId },
          data: userData
        });
      }

      // Update student
      const updatedStudent = await prisma.student.update({
        where: { id: BigInt(id) },
        data: studentData,
        include: {
          user: {
            select: {
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              active: true
            }
          },
          class: {
            select: {
              className: true,
              section: true,
              academicYear: true
            }
          }
        }
      });

      return updatedStudent;
    });

    res.json({
      student: {
        ...result,
        id: Number(result.id),
        userId: Number(result.userId)
      },
      message: 'Student updated successfully'
    });

  } catch (error) {
    console.error('Update student error:', error);
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return res.status(409).json({ error: 'Email or username already exists for another user' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete student and associated user in transaction
    await prisma.$transaction(async (prisma) => {
      // Delete student first (this will cascade delete related records)
      await prisma.student.delete({
        where: { id: BigInt(id) }
      });

      // Delete associated user
      await prisma.user.delete({
        where: { id: existingStudent.userId }
      });
    });

    res.json({ message: 'Student deleted successfully' });

  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/stats/overview - Get student statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Total students
    const total = await prisma.student.count();

    // Active students
    const active = await prisma.student.count({
      where: { status: 'active' }
    });

    // Students by class
    const classStats = await prisma.student.groupBy({
      by: ['classId'],
      where: {
        classId: { not: null }
      },
      _count: {
        classId: true
      }
    });

    // Get class details for the stats
    const classDetails = await prisma.class.findMany({
      where: {
        classId: {
          in: classStats.map(stat => stat.classId)
        }
      },
      select: {
        classId: true,
        className: true,
        section: true
      }
    });

    // Attendance stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceStats = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        date: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        status: true
      }
    });

    // Fee collection stats
    const feeStats = await prisma.fee.aggregate({
      _sum: {
        amountDue: true,
        amountPaid: true,
        balance: true
      }
    });

    res.json({
      total,
      active,
      inactive: total - active,
      classDistribution: classStats.map(stat => {
        const classDetail = classDetails.find(c => c.classId === stat.classId);
        return {
          classId: stat.classId,
          className: classDetail ? `${classDetail.className} - ${classDetail.section}` : 'Unknown',
          count: stat._count.classId
        };
      }),
      attendanceStats: attendanceStats.map(stat => ({
        status: stat.status,
        count: stat._count.status
      })),
      feeStats: {
        totalDue: Number(feeStats._sum.amountDue || 0),
        totalPaid: Number(feeStats._sum.amountPaid || 0),
        totalBalance: Number(feeStats._sum.balance || 0)
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
