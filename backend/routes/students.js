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

// GET /api/students - Get all students with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Show more students by default
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const classFilter = req.query.classId || req.query.class;
    const classNameFilter = req.query.className || req.query.grade;
    const status = req.query.status;

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (classFilter) {
      where.classId = parseInt(classFilter);
    }
    
    if (classNameFilter) {
      where.class = {
        className: { contains: classNameFilter, mode: 'insensitive' }
      };
    }
    
    if (status) {
      where.status = status;
    }
    // Removed default filter to show ALL students (active and inactive) for management interface
    // else {
    //   // Default: only show active students (exclude inactive/deleted)
    //   where.status = 'active';
    // }

    // Get students with pagination
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          class: {
            select: {
              classId: true,
              className: true,
              section: true,
              academicYear: true
            }
          },
          attendances: {
            select: {
              attendanceId: true,
              date: true,
              status: true,
              timestamp: true
            },
            orderBy: { date: 'desc' },
            take: 5
          },
          marks: {
            select: {
              marksId: true,
              examinationType: true,
              marksObtained: true,
              maxMarks: true,
              grade: true,
              subject: {
                select: {
                  subjectCode: true,
                  subjectName: true
                }
              }
            },
            orderBy: { entryDate: 'desc' },
            take: 5
          },
          fees: {
            select: {
              feeId: true,
              feeType: true,
              amountDue: true,
              amountPaid: true,
              balance: true,
              paymentDate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.student.count({ where })
    ]);

    // Convert BigInt fields to numbers for JSON serialization
    const serializedStudents = students.map(student => ({
      ...student,
      attendances: student.attendances.map(att => ({
        ...att,
        attendanceId: Number(att.attendanceId)
      })),
      fees: student.fees.map(fee => ({
        ...fee,
        amountDue: Number(fee.amountDue),
        amountPaid: Number(fee.amountPaid),
        balance: Number(fee.balance)
      }))
    }));

    res.json({
      success: true,
      data: serializedStudents,
      pagination: {
        page: page,
        limit: limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit)
      }
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await prisma.student.findUnique({
      where: { studentId },
      include: {
        class: {
          select: {
            classId: true,
            className: true,
            section: true,
            academicYear: true,
            classTeacher: {
              select: {
                teacherId: true,
                name: true,
                email: true
              }
            }
          }
        },
        attendances: {
          select: {
            attendanceId: true,
            date: true,
            period: true,
            status: true,
            timestamp: true
          },
          orderBy: { date: 'desc' }
        },
        marks: {
          select: {
            marksId: true,
            examinationType: true,
            marksObtained: true,
            maxMarks: true,
            grade: true,
            entryDate: true,
            subject: {
              select: {
                subjectCode: true,
                subjectName: true
              }
            },
            teacher: {
              select: {
                teacherId: true,
                name: true
              }
            }
          },
          orderBy: { entryDate: 'desc' }
        },
        fees: {
          select: {
            feeId: true,
            feeType: true,
            amountDue: true,
            amountPaid: true,
            balance: true,
            paymentDate: true,
            paymentMethod: true,
            academicYear: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Convert BigInt fields to numbers for JSON serialization
    const serializedStudent = {
      ...student,
      attendances: student.attendances.map(att => ({
        ...att,
        attendanceId: Number(att.attendanceId)
      })),
      fees: student.fees.map(fee => ({
        ...fee,
        amountDue: Number(fee.amountDue),
        amountPaid: Number(fee.amountPaid),
        balance: Number(fee.balance)
      }))
    };

    res.json({ 
      success: true,
      data: serializedStudent 
    });

  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      admissionDate,
      studentId,
      personalEmail
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

    // Use the studentId from request (auto-generated on frontend)
    if (!studentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Student ID is required' 
      });
    }

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
          role: 'student',
          active: true
        }
      });

      // Create student
      const newStudent = await prisma.student.create({
        data: {
          studentId,
          name: name || `${firstName} ${lastName}`.trim(),
          address,
          email: email, // Use the same auto-generated school email as in users table
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          fatherName,
          fatherOccupation,
          motherName,
          motherOccupation,
          parentContact,
          classId: classId ? parseInt(classId) : null,
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          status: 'active'
        },
        include: {
          class: {
            select: {
              className: true,
              section: true,
              academicYear: true
            }
          }
        }
      });

      // Create default fee records for all fee types with proper amounts
      const defaultFeeTypes = [
        { type: 'tuition_term1', amount: 15000 },
        { type: 'tuition_term2', amount: 15000 },
        { type: 'tuition_term3', amount: 15000 },
        { type: 'bus_fee', amount: 5000 },
        { type: 'books_fee', amount: 3000 },
        { type: 'dress_fee', amount: 2000 }
      ];

      // Get the academic year from the class
      const classData = await prisma.class.findUnique({
        where: { classId: parseInt(classId) }
      });
      const academicYear = classData?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

      // Create unique fee records for each type
      for (const feeTypeData of defaultFeeTypes) {
        const feeId = `${studentId}_${feeTypeData.type}_${academicYear}`;
        
        // Check if fee already exists to prevent duplicates
        const existingFee = await prisma.fee.findFirst({
          where: {
            studentId: studentId,
            feeType: feeTypeData.type,
            academicYear: academicYear
          }
        });

        if (!existingFee) {
          await prisma.fee.create({
            data: {
              feeId: feeId,
              studentId: studentId,
              classId: parseInt(classId),
              feeType: feeTypeData.type,
              amountDue: feeTypeData.amount,
              amountPaid: 0,
              balance: feeTypeData.amount,
              academicYear: academicYear
            }
          });
        }
      }

      return newStudent;
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: result
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
    const studentId = req.params.id;
    const updateData = req.body;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { studentId }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Prepare student data for update
    const studentData = {};
    const studentFields = ['name', 'address', 'phone', 'dateOfBirth', 'fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'parentContact', 'classId', 'status'];

    Object.keys(updateData).forEach(key => {
      if (studentFields.includes(key)) {
        if (key === 'dateOfBirth' && updateData[key]) {
          studentData[key] = new Date(updateData[key]);
        } else if (key === 'classId' && updateData[key]) {
          studentData[key] = parseInt(updateData[key]);
        } else {
          studentData[key] = updateData[key];
        }
      }
    });

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { studentId },
      data: studentData,
      include: {
        class: {
          select: {
            classId: true,
            className: true,
            section: true,
            academicYear: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedStudent,
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
    const studentId = req.params.id;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { studentId }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Use transaction to soft delete (preserves historical data)
    await prisma.$transaction(async (prisma) => {
      // Step 1: Soft delete student record (set status to inactive)
      await prisma.student.update({
        where: { studentId },
        data: { 
          status: 'inactive',
          updatedAt: new Date()
        }
      });

      // Step 2: Soft delete corresponding user account (set active to false)
      await prisma.user.update({
        where: { username: studentId },
        data: { 
          active: false,
          updatedAt: new Date()
        }
      });

      // Note: Fee, attendance, and marks records are preserved for historical data
      // They remain linked to the inactive student for reporting and audit purposes
    });

    res.json({ 
      success: true,
      message: 'Student and user account deactivated successfully (data preserved for history)' 
    });

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
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/grade/:gradeName - Get students by grade/class name
router.get('/grade/:gradeName', authenticateToken, async (req, res) => {
  try {
    const { gradeName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Show all students for the grade
    const skip = (page - 1) * limit;

    // Decode URL-encoded grade name
    const decodedGradeName = decodeURIComponent(gradeName);

    const where = {
      class: {
        className: { contains: decodedGradeName, mode: 'insensitive' }
      }
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          class: {
            select: {
              classId: true,
              className: true,
              section: true,
              academicYear: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.student.count({ where })
    ]);

    res.json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit)
      }
    });

  } catch (error) {
    console.error('Get students by grade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:studentId/hard-delete - Permanently delete student from database
router.delete('/:studentId/hard-delete', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { studentId: studentId },
      include: {
        _count: {
          select: {
            attendance: true,
            marks: true,
            fees: true
          }
        }
      }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Use transaction to permanently delete everything
    await prisma.$transaction(async (prisma) => {
      // Step 1: Delete all related data
      
      // Delete attendance records
      await prisma.attendance.deleteMany({
        where: { studentId: studentId }
      });

      // Delete marks records
      await prisma.marks.deleteMany({
        where: { studentId: studentId }
      });

      // Delete fees records
      await prisma.fees.deleteMany({
        where: { studentId: studentId }
      });

      // Step 2: Delete user account
      await prisma.user.deleteMany({
        where: { username: studentId }
      });

      // Step 3: Finally delete the student record
      await prisma.student.delete({
        where: { studentId: studentId }
      });
    });

    res.json({ 
      message: `Student "${existingStudent.name}" permanently deleted from database. All related data has been removed.`,
      studentName: existingStudent.name,
      attendanceRecordsDeleted: existingStudent._count.attendance,
      marksRecordsDeleted: existingStudent._count.marks,
      feesRecordsDeleted: existingStudent._count.fees
    });

  } catch (error) {
    console.error('Hard delete student error:', error);
    res.status(500).json({ error: 'Failed to permanently delete student' });
  }
});

module.exports = router;
