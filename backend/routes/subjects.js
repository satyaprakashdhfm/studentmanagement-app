const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { Prisma } = require('@prisma/client');
const { authenticateToken } = require('../utils/jwt');

// GET /api/subjects - Get all subjects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, classApplicable, isActive, page = 1, limit = 50 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { subjectName: { contains: search, mode: 'insensitive' } },
        { subjectCode: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (classApplicable) {
      where.classApplicable = classApplicable;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get subjects with pagination
    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        orderBy: { subjectName: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.subject.count({ where })
    ]);

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
    const subjectCode = req.params.id;

    const subject = await prisma.subject.findUnique({
      where: { subjectCode },
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

    res.json(subject);

  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subjects - Create new subject
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subjectName, subjectCode, classApplicable, maxMarksPerExam } = req.body;

    // Validate required fields
    if (!subjectName || !subjectCode || !classApplicable || !maxMarksPerExam) {
      return res.status(400).json({ 
        error: 'Missing required fields: subjectName, subjectCode, classApplicable, maxMarksPerExam' 
      });
    }

    // Check if subject code already exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectCode }
    });

    if (existingSubject) {
      return res.status(409).json({ 
        error: 'Subject code already exists' 
      });
    }

    // Create subject
    const newSubject = await prisma.subject.create({
      data: {
        subjectName,
        subjectCode,
        classApplicable,
        maxMarksPerExam: parseInt(maxMarksPerExam),
        isActive: true
      }
    });

    res.status(201).json({
      subject: newSubject,
      message: 'Subject created successfully'
    });

  } catch (error) {
    console.error('Create subject error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Subject code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/subjects/:id - Update subject
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const subjectCode = req.params.id;
    const updateData = req.body;

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectCode }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Prepare update data
    const dataToUpdate = {
      ...updateData,
      maxMarksPerExam: updateData.maxMarksPerExam ? parseInt(updateData.maxMarksPerExam) : updateData.maxMarksPerExam
    };

    // Update subject
    const updatedSubject = await prisma.subject.update({
      where: { subjectCode },
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
    const subjectCode = req.params.id;

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { subjectCode }
    });

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if subject is being used in marks or syllabus
    const marksCount = await prisma.mark.count({
      where: { subjectCode }
    });

    const syllabusCount = await prisma.syllabus.count({
      where: { subjectCode }
    });

    if (marksCount > 0 || syllabusCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete subject. It is referenced in ${marksCount} marks records and ${syllabusCount} syllabus records.` 
      });
    }

    // Delete subject
    await prisma.subject.delete({
      where: { subjectCode }
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
      by: ['subjectCode'],
      _avg: {
        marksObtained: true,
        maxMarks: true
      },
      _count: {
        subjectCode: true
      }
    });

    // Get subject details for performance stats
    const subjectDetails = await prisma.subject.findMany({
      where: {
        subjectCode: {
          in: performanceStats.map(stat => stat.subjectCode)
        }
      },
      select: {
        subjectCode: true,
        subjectName: true
      }
    });

    const performanceWithDetails = performanceStats.map(stat => {
      const subject = subjectDetails.find(s => s.subjectCode === stat.subjectCode);
      const avgPercentage = stat._avg.maxMarks > 0 
        ? Math.round((stat._avg.marksObtained / stat._avg.maxMarks) * 100)
        : 0;
      
      return {
        subjectCode: stat.subjectCode,
        subjectName: subject ? subject.subjectName : 'Unknown',
        averageMarks: Math.round(stat._avg.marksObtained || 0),
        averageMaxMarks: Math.round(stat._avg.maxMarks || 0),
        averagePercentage: avgPercentage,
        totalExams: stat._count.subjectCode
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
