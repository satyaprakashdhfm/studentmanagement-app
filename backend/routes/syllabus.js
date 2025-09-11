const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/syllabus - Get syllabus records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      classId, 
      subjectId,
      teacherId,
      completionStatus,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add filters
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }
    
    if (teacherId) {
      where.teacherId = BigInt(teacherId);
    }
    
    if (completionStatus) {
      where.completionStatus = completionStatus;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get syllabus records with pagination and relations
    const syllabus = await prisma.syllabus.findMany({
      where,
      include: {
        class: {
          select: {
            className: true,
            section: true,
            academicYear: true
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
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { lastUpdated: 'desc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.syllabus.count({ where });

    res.json({
      syllabus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get syllabus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/syllabus/:id - Get syllabus record by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const syllabusItem = await prisma.syllabus.findUnique({
      where: { syllabusId: id },
      include: {
        class: {
          select: {
            className: true,
            section: true,
            academicYear: true
          }
        },
        subject: {
          select: {
            subjectName: true,
            subjectCode: true,
            maxMarksPerExam: true
          }
        },
        teacher: {
          select: {
            name: true,
            email: true,
            qualification: true
          }
        }
      }
    });

    if (!syllabusItem) {
      return res.status(404).json({ error: 'Syllabus record not found' });
    }

    res.json(syllabusItem);

  } catch (error) {
    console.error('Get syllabus record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/syllabus - Create new syllabus record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      subjectId,
      unitName,
      completionStatus = 'not_started',
      completionPercentage = 0,
      currentTopic,
      teacherId
    } = req.body;

    // Validate required fields
    if (!classId || !subjectId || !unitName || !teacherId) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate completion percentage
    if (completionPercentage < 0 || completionPercentage > 100) {
      return res.status(400).json({ error: 'Completion percentage must be between 0 and 100' });
    }

    // Check if class exists
    const classExists = await prisma.class.findUnique({
      where: { classId: parseInt(classId) }
    });

    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectCode: subjectId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Check if syllabus record already exists for this combination
    const existingSyllabus = await prisma.syllabus.findFirst({
      where: {
        classId: parseInt(classId),
        subjectCode: subjectId,
        unitName
      }
    });

    if (existingSyllabus) {
      return res.status(409).json({ error: 'Syllabus record already exists for this class, subject, and unit' });
    }

    // Generate syllabus ID
    const syllabusId = `SYL${Date.now()}`;

    // Create new syllabus record
    const newSyllabus = await prisma.syllabus.create({
      data: {
        syllabusId,
        classId: parseInt(classId),
        subjectCode: subjectId,
        unitName,
        completionStatus,
        completionPercentage: parseInt(completionPercentage),
        currentTopic,
        teacherId,
        lastUpdated: new Date()
      },
      include: {
        class: {
          select: {
            className: true,
            section: true
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
      }
    });

    res.status(201).json({
      syllabus: newSyllabus,
      message: 'Syllabus record created successfully'
    });

  } catch (error) {
    console.error('Create syllabus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/syllabus/:id - Update syllabus record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      unitName, 
      completionStatus, 
      completionPercentage, 
      currentTopic,
      teacherId 
    } = req.body;

    // Check if syllabus record exists
    const existingSyllabus = await prisma.syllabus.findUnique({
      where: { syllabusId: parseInt(id) }
    });

    if (!existingSyllabus) {
      return res.status(404).json({ error: 'Syllabus record not found' });
    }

    // Validate completion percentage if provided
    if (completionPercentage !== undefined && (completionPercentage < 0 || completionPercentage > 100)) {
      return res.status(400).json({ error: 'Completion percentage must be between 0 and 100' });
    }

    // Validate teacher if provided
    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
    }

    // Prepare update data
    const updateData = {
      lastUpdated: new Date()
    };

    if (unitName) updateData.unitName = unitName;
    if (completionStatus) updateData.completionStatus = completionStatus;
    if (completionPercentage !== undefined) updateData.completionPercentage = parseInt(completionPercentage);
    if (currentTopic) updateData.currentTopic = currentTopic;
    if (teacherId) updateData.teacherId = teacherId;

    // Update syllabus record
    const updatedSyllabus = await prisma.syllabus.update({
      where: { syllabusId: id },
      data: updateData,
      include: {
        class: {
          select: {
            className: true,
            section: true
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
      }
    });

    res.json({
      syllabus: updatedSyllabus,
      message: 'Syllabus record updated successfully'
    });

  } catch (error) {
    console.error('Update syllabus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/syllabus/:id - Delete syllabus record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if syllabus record exists
    const existingSyllabus = await prisma.syllabus.findUnique({
      where: { syllabusId: parseInt(id) }
    });

    if (!existingSyllabus) {
      return res.status(404).json({ error: 'Syllabus record not found' });
    }

    // Delete syllabus record
    await prisma.syllabus.delete({
      where: { syllabusId: id }
    });

    res.json({ message: 'Syllabus record deleted successfully' });

  } catch (error) {
    console.error('Delete syllabus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/syllabus/stats/overview - Get syllabus statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { classId, subjectId, teacherId } = req.query;

    // Build where clause
    const where = {};
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }
    
    if (teacherId) {
      where.teacherId = BigInt(teacherId);
    }

    // Get completion status distribution
    const statusStats = await prisma.syllabus.groupBy({
      by: ['completionStatus'],
      where,
      _count: {
        completionStatus: true
      },
      _avg: {
        completionPercentage: true
      }
    });

    // Get class-wise progress
    const classStats = await prisma.syllabus.groupBy({
      by: ['classId'],
      where,
      _avg: {
        completionPercentage: true
      },
      _count: {
        classId: true
      }
    });

    // Get class details for stats
    const classIds = classStats.map(stat => stat.classId);
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

    // Get subject-wise progress
    const subjectStats = await prisma.syllabus.groupBy({
      by: ['subjectCode'],
      where,
      _avg: {
        completionPercentage: true
      },
      _count: {
        subjectCode: true
      }
    });

    // Get subject details for stats
    const subjectCodes = subjectStats.map(stat => stat.subjectCode);
    const subjectDetails = await prisma.subject.findMany({
      where: {
        subjectCode: {
          in: subjectCodes
        }
      },
      select: {
        subjectCode: true,
        subjectName: true
      }
    });

    // Get overall progress
    const overallStats = await prisma.syllabus.aggregate({
      where,
      _avg: {
        completionPercentage: true
      },
      _count: {
        syllabusId: true
      }
    });

    const classWiseProgress = classStats.map(stat => {
      const classDetail = classDetails.find(c => c.classId === stat.classId);
      return {
        classId: stat.classId,
        className: classDetail ? `${classDetail.className} - ${classDetail.section}` : 'Unknown',
        averageProgress: Math.round(stat._avg.completionPercentage || 0),
        unitCount: stat._count.classId
      };
    });

    const subjectWiseProgress = subjectStats.map(stat => {
      const subjectDetail = subjectDetails.find(s => s.subjectCode === stat.subjectCode);
      return {
        subjectCode: stat.subjectCode,
        subjectName: subjectDetail ? subjectDetail.subjectName : 'Unknown',
        averageProgress: Math.round(stat._avg.completionPercentage || 0),
        unitCount: stat._count.subjectCode
      };
    });

    res.json({
      overall: {
        totalUnits: overallStats._count.syllabusId,
        averageProgress: Math.round(overallStats._avg.completionPercentage || 0)
      },
      statusDistribution: statusStats.map(stat => ({
        status: stat.completionStatus,
        count: stat._count.completionStatus,
        averageProgress: Math.round(stat._avg.completionPercentage || 0)
      })),
      classWiseProgress,
      subjectWiseProgress
    });

  } catch (error) {
    console.error('Get syllabus stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
