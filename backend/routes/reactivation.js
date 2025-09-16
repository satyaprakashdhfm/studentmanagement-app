const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/reactivation/deactivated - Get all deactivated records
router.get('/deactivated', authenticateToken, async (req, res) => {
  try {
    // Get deactivated classes
    const deactivatedClasses = await prisma.class.findMany({
      where: { active: false },
      include: {
        classTeacher: {
          select: {
            teacherId: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: [
        { className: 'asc' },
        { section: 'asc' }
      ]
    });

    // Get deactivated students
    const deactivatedStudents = await prisma.student.findMany({
      where: { status: 'inactive' },
      include: {
        class: {
          select: {
            classId: true,
            className: true,
            section: true,
            active: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    // Get deactivated users (not linked to students)
    const deactivatedUsers = await prisma.user.findMany({
      where: { 
        active: false,
        students: null // Users not linked to student records
      },
      select: {
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true
      },
      orderBy: [
        { firstName: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: {
        classes: deactivatedClasses,
        students: deactivatedStudents,
        users: deactivatedUsers
      },
      counts: {
        classes: deactivatedClasses.length,
        students: deactivatedStudents.length,
        users: deactivatedUsers.length,
        total: deactivatedClasses.length + deactivatedStudents.length + deactivatedUsers.length
      }
    });

  } catch (error) {
    console.error('Get deactivated records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reactivation/class/:id - Reactivate a class
router.post('/class/:id', authenticateToken, async (req, res) => {
  try {
    const classId = parseInt(req.params.id);

    // Check if class exists and is deactivated
    const existingClass = await prisma.class.findUnique({
      where: { classId },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (existingClass.active) {
      return res.status(400).json({ error: 'Class is already active' });
    }

    // Reactivate the class
    const reactivatedClass = await prisma.class.update({
      where: { classId },
      data: { 
        active: true,
        updatedAt: new Date()
      },
      include: {
        classTeacher: {
          select: {
            teacherId: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: { students: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Class reactivated successfully',
      class: reactivatedClass
    });

  } catch (error) {
    console.error('Reactivate class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reactivation/student/:id - Reactivate a student
router.post('/student/:id', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;

    // Check if student exists and is deactivated
    const existingStudent = await prisma.student.findUnique({
      where: { studentId },
      include: {
        class: {
          select: {
            classId: true,
            className: true,
            section: true,
            active: true
          }
        }
      }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (existingStudent.status === 'active') {
      return res.status(400).json({ error: 'Student is already active' });
    }

    // Check if the class is active
    if (!existingStudent.class?.active) {
      return res.status(400).json({ 
        error: `Cannot reactivate student because their class ${existingStudent.class?.className} - ${existingStudent.class?.section} is deactivated. Please reactivate the class first.` 
      });
    }

    // Use transaction to reactivate both student and user
    const result = await prisma.$transaction(async (prisma) => {
      // Reactivate student
      const reactivatedStudent = await prisma.student.update({
        where: { studentId },
        data: { 
          status: 'active',
          updatedAt: new Date()
        },
        include: {
          class: {
            select: {
              classId: true,
              className: true,
              section: true,
              active: true
            }
          }
        }
      });

      // Reactivate corresponding user account
      await prisma.user.update({
        where: { username: studentId },
        data: { 
          active: true,
          updatedAt: new Date()
        }
      });

      return reactivatedStudent;
    });

    res.json({
      success: true,
      message: 'Student and user account reactivated successfully',
      student: result
    });

  } catch (error) {
    console.error('Reactivate student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reactivation/class/:id/students - Reactivate class and all its students
router.post('/class/:id/students', authenticateToken, async (req, res) => {
  try {
    const classId = parseInt(req.params.id);

    // Check if class exists and is deactivated
    const existingClass = await prisma.class.findUnique({
      where: { classId },
      include: {
        students: {
          where: { status: 'inactive' }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (existingClass.active) {
      return res.status(400).json({ error: 'Class is already active' });
    }

    const inactiveStudentsCount = existingClass.students.length;

    // Use transaction to reactivate class and all its students
    const result = await prisma.$transaction(async (prisma) => {
      // Reactivate the class
      const reactivatedClass = await prisma.class.update({
        where: { classId },
        data: { 
          active: true,
          updatedAt: new Date()
        }
      });

      let reactivatedStudentsCount = 0;
      if (inactiveStudentsCount > 0) {
        // Reactivate all inactive students in this class
        const updateStudents = await prisma.student.updateMany({
          where: { 
            classId: classId,
            status: 'inactive'
          },
          data: { 
            status: 'active',
            updatedAt: new Date()
          }
        });

        // Reactivate corresponding user accounts
        const studentIds = existingClass.students.map(s => s.studentId);
        await prisma.user.updateMany({
          where: {
            username: { in: studentIds }
          },
          data: {
            active: true,
            updatedAt: new Date()
          }
        });

        reactivatedStudentsCount = updateStudents.count;
      }

      return {
        class: reactivatedClass,
        studentsCount: reactivatedStudentsCount
      };
    });

    const message = inactiveStudentsCount > 0 
      ? `Class reactivated successfully. ${result.studentsCount} students were also reactivated.`
      : 'Class reactivated successfully (no inactive students to reactivate).';

    res.json({
      success: true,
      message: message,
      class: result.class,
      reactivatedStudentsCount: result.studentsCount
    });

  } catch (error) {
    console.error('Reactivate class and students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;