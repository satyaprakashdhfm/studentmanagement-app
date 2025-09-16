const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');
const { hashPassword } = require('../utils/password');

// GET /api/teachers - Get all teachers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, active = 'true', page = 1, limit = 50 } = req.query;

    const where = {};
    if (active !== undefined) {
      where.active = String(active) === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { qualification: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
        select: {
          teacherId: true,
          name: true,
          email: true,
          phoneNumber: true,
          qualification: true,
          subjectsHandled: true,
          classesAssigned: true,
          classTeacherOf: true,
          hireDate: true,
          salary: true,
          active: true,
        },
      }),
      prisma.teacher.count({ where }),
    ]);

    // Map BigInt/Decimal to JS types and provide defaults for arrays
    const normalized = teachers.map(t => ({
      teacherId: t.teacherId,
      name: t.name,
      email: t.email,
      phoneNumber: t.phoneNumber || null,
      qualification: t.qualification || null,
      subjectsHandled: Array.isArray(t.subjectsHandled) ? t.subjectsHandled : [],
      classesAssigned: Array.isArray(t.classesAssigned) ? t.classesAssigned : [],
      classTeacherOf: t.classTeacherOf || null,
      hireDate: t.hireDate,
      salary: t.salary ? Number(t.salary) : null,
      active: t.active,
    }));

    res.json({
      teachers: normalized,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });

  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teachers/:id - Get teacher by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.params.id;

    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
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
        classesTeaching: {
          select: {
            classId: true,
            className: true,
            section: true,
            academicYear: true,
            students: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
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
                subjectName: true
              }
            }
          },
          orderBy: {
            entryDate: 'desc'
          },
          take: 20
        },
        attendance: {
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
            }
          },
          orderBy: {
            date: 'desc'
          },
          take: 20
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Convert BigInt IDs to Numbers
    const teacherWithNumericIds = {
      ...teacher,
      id: Number(teacher.id),
      userId: Number(teacher.userId),
      salary: teacher.salary ? Number(teacher.salary) : null,
      marks: teacher.marks.map(mark => ({
        ...mark,
        marksId: Number(mark.marksId),
        studentId: Number(mark.studentId),
        teacherId: Number(mark.teacherId)
      })),
      attendance: teacher.attendance.map(att => ({
        ...att,
        attendanceId: Number(att.attendanceId),
        studentId: Number(att.studentId),
        markedBy: Number(att.markedBy)
      }))
    };

    res.json(teacherWithNumericIds);

  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teachers - Create new teacher
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      name, 
      phoneNumber, 
      qualification, 
      qualifiedSubjects,  // Array of subject names like ["English", "Mathematics"]
      subjectsHandled,    // Array of subject codes like ["8_ENG", "9_ENG", "10_ENG"]
      classesAssigned,    // Array of class IDs
      classTeacherOf, 
      hireDate, 
      salary,
      teacherId           // Custom teacher ID like "amiteng080910"
    } = req.body;

    console.log('🎓 Creating teacher with data:', {
      username, email, name, qualifiedSubjects, subjectsHandled, classesAssigned, teacherId
    });

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

    // Check if teacher ID already exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { teacherId: teacherId || username }
    });

    if (existingTeacher) {
      return res.status(409).json({ 
        success: false,
        message: 'Teacher ID already exists' 
      });
    }

    // Use provided teacher ID or generate one
    const finalTeacherId = teacherId || username || `TCH${Date.now()}`;

    // Hash the password
    const hashedPassword = await hashPassword(password || 'teacher123');

    // Create user and teacher in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      console.log('🔄 Starting transaction for teacher creation...');
      
      // Create user first
      console.log('👤 Creating user with data:', {
        username: finalTeacherId,
        email,
        firstName: firstName || name.split(' ')[0],
        lastName: lastName || name.split(' ').slice(1).join(' '),
        role: 'teacher'
      });
      
      const newUser = await prisma.user.create({
        data: {
          username: finalTeacherId, // Use teacher ID as username
          email,
          password: hashedPassword,
          firstName: firstName || name.split(' ')[0],
          lastName: lastName || name.split(' ').slice(1).join(' '),
          role: 'teacher',
          active: true
        }
      });
      
      console.log('✅ User created successfully:', newUser.username);
      
      // Create teacher
      console.log('🎓 Creating teacher with data:', {
        teacherId: finalTeacherId,
        name: name || `${firstName} ${lastName}`.trim(),
        email,
        qualified_subjects: qualifiedSubjects || [],
        subjectsHandled: subjectsHandled || [],
        classesAssigned: classesAssigned || []
      });
      
      const newTeacher = await prisma.teacher.create({
        data: {
          teacherId: finalTeacherId,
          name: name || `${firstName} ${lastName}`.trim(),
          email,
          phoneNumber,
          qualification,
          qualified_subjects: qualifiedSubjects || [], // Note: snake_case for database field
          subjectsHandled: subjectsHandled || [],
          classesAssigned: classesAssigned || [],
          classTeacherOf,
          hireDate: hireDate ? new Date(hireDate) : null,
          salary: salary ? parseFloat(salary) : null,
          active: true
        }
      });

      console.log('✅ Teacher created successfully:', newTeacher.teacherId);
      return newTeacher;
    });

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      teacher: {
        ...result,
        id: result.teacherId, // Add id field for frontend compatibility
        salary: result.salary ? Number(result.salary) : null
      }
    });

  } catch (error) {
    console.error('Create teacher error:', error);
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return res.status(409).json({ 
        success: false,
        message: 'Email or Teacher ID already exists' 
      });
    }
    if (error.code === 'P2003') { // Foreign key constraint violation
      return res.status(400).json({ 
        success: false,
        message: `Foreign key constraint error: ${error.meta?.field_name || 'unknown field'}`,
        details: 'This usually means a referenced record does not exist'
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Internal server error: ' + error.message 
    });
  }
});

// PUT /api/teachers/:id - Update teacher
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.params.id;
    const updateData = req.body;

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { teacherId }
    });

    if (!existingTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Separate user data from teacher data
    const userData = {};
    const teacherData = {};

    const userFields = ['username', 'email', 'firstName', 'lastName', 'active'];
    const teacherFields = ['name', 'phoneNumber', 'qualification', 'subjectsHandled', 'classesAssigned', 'classTeacherOf', 'hireDate', 'salary', 'active'];

    Object.keys(updateData).forEach(key => {
      if (userFields.includes(key)) {
        userData[key] = updateData[key];
      } else if (teacherFields.includes(key)) {
        if (key === 'hireDate' && updateData[key]) {
          teacherData[key] = new Date(updateData[key]);
        } else if (key === 'salary' && updateData[key]) {
          teacherData[key] = parseFloat(updateData[key]);
        } else {
          teacherData[key] = updateData[key];
        }
      }
    });

    // Update in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update user if there's user data
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({
          where: { id: existingTeacher.userId },
          data: userData
        });
      }

      // Update teacher
      const updatedTeacher = await prisma.teacher.update({
        where: { id: BigInt(id) },
        data: teacherData,
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
          }
        }
      });

      return updatedTeacher;
    });

    res.json({
      teacher: {
        ...result,
        id: Number(result.id),
        userId: Number(result.userId),
        salary: result.salary ? Number(result.salary) : null
      },
      message: 'Teacher updated successfully'
    });

  } catch (error) {
    console.error('Update teacher error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email or username already exists for another user' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/teachers/:id - Delete teacher
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { teacherId }
    });

    if (!existingTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Delete teacher (related records will be handled by database constraints)
    await prisma.teacher.delete({
      where: { teacherId }
    });

    res.json({ message: 'Teacher deleted successfully' });

  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teachers/stats/overview - Get teacher statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Total teachers
    const total = await prisma.teacher.count();

    // Active teachers
    const active = await prisma.teacher.count({
      where: { active: true }
    });

    // Teachers by subjects
    const subjectStats = await prisma.teacher.findMany({
      select: {
        subjectsHandled: true
      }
    });

    // Count subjects
    const subjectCount = {};
    subjectStats.forEach(teacher => {
      teacher.subjectsHandled.forEach(subject => {
        subjectCount[subject] = (subjectCount[subject] || 0) + 1;
      });
    });

    // Recently hired teachers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyHired = await prisma.teacher.count({
      where: {
        hireDate: {
          gte: thirtyDaysAgo
        }
      }
    });

    res.json({
      total,
      active,
      inactive: total - active,
      recentlyHired,
      subjectDistribution: Object.entries(subjectCount).map(([subject, count]) => ({
        subject,
        count
      }))
    });

  } catch (error) {
    console.error('Get teacher stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
