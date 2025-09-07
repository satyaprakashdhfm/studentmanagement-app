const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/subjects - Get all subjects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, classApplicable, isActive, page = 1, limit = 50 } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add search filter
    if (search) {
      where.OR = [
        { subjectName: { contains: search, mode: 'insensitive' } },
        { subjectCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add class applicable filter
    if (classApplicable) {
      where.classApplicable = { contains: classApplicable, mode: 'insensitive' };
    }

    // Add active filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get subjects with pagination and relations
    const subjects = await prisma.subject.findMany({
      where,
      include: {
        _count: {
          select: {
            marks: true,
            syllabus: true
          }
        }
      },
      orderBy: { subjectName: 'asc' },
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.subject.count({ where });

    res.json({
      subjects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subjects/:id - Get subject by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { subjectId: parseInt(id) },
      include: {
        marks: {
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
          },
          orderBy: {
            entryDate: 'desc'
          },
          take: 50
        },
        syllabus: {
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
          }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Convert BigInt IDs to Numbers
    const subjectWithNumericIds = {
      ...subject,
      marks: subject.marks.map(mark => ({
        ...mark,
        marksId: Number(mark.marksId),
        studentId: Number(mark.studentId),
        teacherId: Number(mark.teacherId)
      })),
      syllabus: subject.syllabus.map(syl => ({
        ...syl,
        teacherId: Number(syl.teacherId)
      }))
    };

    res.json(subjectWithNumericIds);

  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subjects - Create new subject
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      subjectId,
      subjectName,
      subjectCode,
      classApplicable,
      maxMarksPerExam,
      isActive = true
    } = req.body;

    // Check if subject ID already exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId: parseInt(subjectId) }
    });

    if (existingSubject) {
      return res.status(409).json({ error: 'Subject ID already exists' });
    }

    // Create new subject
    const newSubject = await prisma.subject.create({
      data: {
        subjectId: parseInt(subjectId),
        subjectName,
        subjectCode,
        classApplicable,
        maxMarksPerExam: parseInt(maxMarksPerExam),
        isActive
      }
    });

    res.status(201).json({
      subject: newSubject,
      message: 'Subject created successfully'
    });

  } catch (error) {
    console.error('Create subject error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Subject ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/subjects/:id - Update subject
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId: parseInt(id) }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Prepare update data
    const dataToUpdate = {
      ...updateData,
      maxMarksPerExam: updateData.maxMarksPerExam ? parseInt(updateData.maxMarksPerExam) : updateData.maxMarksPerExam
    };

    // Remove subjectId from update data (shouldn't be updated)
    delete dataToUpdate.subjectId;

    // Update subject
    const updatedSubject = await prisma.subject.update({
      where: { subjectId: parseInt(id) },
      data: dataToUpdate
    });

    res.json({
      subject: updatedSubject,
      message: 'Subject updated successfully'
    });

  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectId: parseInt(id) },
      include: {
        _count: {
          select: {
            marks: true,
            syllabus: true
          }
        }
      }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if subject has marks or syllabus
    if (existingSubject._count.marks > 0 || existingSubject._count.syllabus > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete subject with existing marks or syllabus records. Please remove them first.' 
      });
    }

    // Delete subject
    await prisma.subject.delete({
      where: { subjectId: parseInt(id) }
    });

    res.json({ message: 'Subject deleted successfully' });

  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subjects/stats/overview - Get subject statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Total subjects
    const total = await prisma.subject.count();

    // Active subjects
    const active = await prisma.subject.count({
      where: { isActive: true }
    });

    // Subjects by class
    const classStats = await prisma.subject.groupBy({
      by: ['classApplicable'],
      _count: {
        classApplicable: true
      },
      orderBy: {
        classApplicable: 'asc'
      }
    });

    // Subject performance (average marks)
    const performanceStats = await prisma.mark.groupBy({
      by: ['subjectId'],
      _avg: {
        marksObtained: true,
        maxMarks: true
      },
      _count: {
        subjectId: true
      }
    });

    // Get subject details for performance stats
    const subjectDetails = await prisma.subject.findMany({
      where: {
        subjectId: {
          in: performanceStats.map(stat => stat.subjectId)
        }
      },
      select: {
        subjectId: true,
        subjectName: true
      }
    });

    const performanceWithDetails = performanceStats.map(stat => {
      const subject = subjectDetails.find(s => s.subjectId === stat.subjectId);
      const avgPercentage = stat._avg.maxMarks > 0 
        ? Math.round((stat._avg.marksObtained / stat._avg.maxMarks) * 100)
        : 0;
      
      return {
        subjectId: stat.subjectId,
        subjectName: subject ? subject.subjectName : 'Unknown',
        averageMarks: Math.round(stat._avg.marksObtained || 0),
        averageMaxMarks: Math.round(stat._avg.maxMarks || 0),
        averagePercentage: avgPercentage,
        totalExams: stat._count.subjectId
      };
    });

    res.json({
      total,
      active,
      inactive: total - active,
      classDistribution: classStats.map(stat => ({
        classApplicable: stat.classApplicable,
        count: stat._count.classApplicable
      })),
      performanceStats: performanceWithDetails
    });

  } catch (error) {
    console.error('Get subject stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
