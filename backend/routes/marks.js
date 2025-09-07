const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/marks - Get marks records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      subjectId,
      teacherId,
      examinationType,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add filters
    if (studentId) {
      where.studentId = BigInt(studentId);
    }
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }
    
    if (teacherId) {
      where.teacherId = BigInt(teacherId);
    }
    
    if (examinationType) {
      where.examinationType = examinationType;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get marks records with pagination and relations
    const marks = await prisma.mark.findMany({
      where,
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
            email: true
          }
        }
      },
      orderBy: [
        { entryDate: 'desc' },
        { examinationType: 'asc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.mark.count({ where });

    // Convert BigInt IDs to Numbers for JSON serialization
    const marksWithNumericIds = marks.map(record => {
      return JSON.parse(JSON.stringify(record, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    });

    res.json({
      marks: marksWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(Number(total) / limitNum)
      }
    });

  } catch (error) {
    console.error('Get marks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/marks/student/:studentId - Get marks for a specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      classId, 
      subjectId, 
      examinationType, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build where clause
    const where = {
      studentId: BigInt(studentId)
    };
    
    // Add filters
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }
    
    if (examinationType) {
      where.examinationType = examinationType;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get marks with pagination and relations
    const marks = await prisma.mark.findMany({
      where,
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
      orderBy: [
        { entryDate: 'desc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.mark.count({ where });

    // Convert BigInt IDs to Numbers for JSON serialization
    const marksWithNumericIds = marks.map(record => {
      return JSON.parse(JSON.stringify(record, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    });

    res.json({
      marks: marksWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(Number(total) / limitNum)
      }
    });

  } catch (error) {
    console.error('Get student marks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/marks/:id - Get mark record by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const mark = await prisma.mark.findUnique({
      where: { marksId: BigInt(id) },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
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
            email: true
          }
        }
      }
    });

    if (!mark) {
      return res.status(404).json({ error: 'Mark record not found' });
    }

    // Convert BigInt IDs to Numbers
    const markWithNumericIds = {
      ...mark,
      marksId: Number(mark.marksId),
      studentId: Number(mark.studentId),
      teacherId: Number(mark.teacherId)
    };

    res.json(markWithNumericIds);

  } catch (error) {
    console.error('Get mark record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/marks - Create new mark record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      studentId,
      classId,
      subjectId,
      examinationType,
      marksObtained,
      maxMarks,
      grade,
      teacherId,
      entryDate
    } = req.body;

    // Validate required fields
    if (!studentId || !classId || !subjectId || !examinationType || marksObtained === undefined || !maxMarks || !teacherId) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate marks
    if (marksObtained < 0 || marksObtained > maxMarks) {
      return res.status(400).json({ error: 'Marks obtained cannot be negative or exceed maximum marks' });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: BigInt(studentId) }
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

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectId: parseInt(subjectId) }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: BigInt(teacherId) }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Check if marks already exist for this combination
    const existingMark = await prisma.mark.findFirst({
      where: {
        studentId: BigInt(studentId),
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        examinationType
      }
    });

    if (existingMark) {
      return res.status(409).json({ error: 'Marks already exist for this student, class, subject, and examination type' });
    }

    // Calculate grade if not provided
    let calculatedGrade = grade;
    if (!calculatedGrade) {
      const percentage = (marksObtained / maxMarks) * 100;
      if (percentage >= 90) calculatedGrade = 'A+';
      else if (percentage >= 80) calculatedGrade = 'A';
      else if (percentage >= 70) calculatedGrade = 'B+';
      else if (percentage >= 60) calculatedGrade = 'B';
      else if (percentage >= 50) calculatedGrade = 'C+';
      else if (percentage >= 40) calculatedGrade = 'C';
      else if (percentage >= 35) calculatedGrade = 'D';
      else calculatedGrade = 'F';
    }

    // Create new mark record
    const newMark = await prisma.mark.create({
      data: {
        studentId: BigInt(studentId),
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        examinationType,
        marksObtained: parseInt(marksObtained),
        maxMarks: parseInt(maxMarks),
        grade: calculatedGrade,
        teacherId: BigInt(teacherId),
        entryDate: entryDate ? new Date(entryDate) : new Date()
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
      mark: {
        ...newMark,
        marksId: Number(newMark.marksId),
        studentId: Number(newMark.studentId),
        teacherId: Number(newMark.teacherId)
      },
      message: 'Mark record created successfully'
    });

  } catch (error) {
    console.error('Create mark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/marks/bulk - Create multiple mark records
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { markRecords, classId, subjectId, examinationType, maxMarks, teacherId, entryDate } = req.body;

    if (!markRecords || !Array.isArray(markRecords) || markRecords.length === 0) {
      return res.status(400).json({ error: 'Mark records array is required' });
    }

    // Validate common fields
    if (!classId || !subjectId || !examinationType || !maxMarks || !teacherId) {
      return res.status(400).json({ error: 'All required common fields must be provided' });
    }

    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: BigInt(teacherId) }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Validate class exists
    const classExists = await prisma.class.findUnique({
      where: { classId: parseInt(classId) }
    });

    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Validate subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectId: parseInt(subjectId) }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Create mark records in transaction
    const result = await prisma.$transaction(async (prisma) => {
      const createdRecords = [];

      for (const record of markRecords) {
        const { studentId, marksObtained, grade } = record;

        // Validate marks
        if (marksObtained < 0 || marksObtained > maxMarks) {
          continue; // Skip invalid records
        }

        // Check if marks already exist
        const existingMark = await prisma.mark.findFirst({
          where: {
            studentId: BigInt(studentId),
            classId: parseInt(classId),
            subjectId: parseInt(subjectId),
            examinationType
          }
        });

        if (!existingMark) {
          // Calculate grade if not provided
          let calculatedGrade = grade;
          if (!calculatedGrade) {
            const percentage = (marksObtained / maxMarks) * 100;
            if (percentage >= 90) calculatedGrade = 'A+';
            else if (percentage >= 80) calculatedGrade = 'A';
            else if (percentage >= 70) calculatedGrade = 'B+';
            else if (percentage >= 60) calculatedGrade = 'B';
            else if (percentage >= 50) calculatedGrade = 'C+';
            else if (percentage >= 40) calculatedGrade = 'C';
            else if (percentage >= 35) calculatedGrade = 'D';
            else calculatedGrade = 'F';
          }

          const newMark = await prisma.mark.create({
            data: {
              studentId: BigInt(studentId),
              classId: parseInt(classId),
              subjectId: parseInt(subjectId),
              examinationType,
              marksObtained: parseInt(marksObtained),
              maxMarks: parseInt(maxMarks),
              grade: calculatedGrade,
              teacherId: BigInt(teacherId),
              entryDate: entryDate ? new Date(entryDate) : new Date()
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
            ...newMark,
            marksId: Number(newMark.marksId),
            studentId: Number(newMark.studentId),
            teacherId: Number(newMark.teacherId)
          });
        }
      }

      return createdRecords;
    });

    res.status(201).json({
      marks: result,
      message: `${result.length} mark records created successfully`
    });

  } catch (error) {
    console.error('Bulk create marks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/marks/:id - Update mark record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { marksObtained, maxMarks, grade, examinationType } = req.body;

    // Check if mark record exists
    const existingMark = await prisma.mark.findUnique({
      where: { marksId: BigInt(id) }
    });

    if (!existingMark) {
      return res.status(404).json({ error: 'Mark record not found' });
    }

    // Validate marks if provided
    const newMarksObtained = marksObtained !== undefined ? parseInt(marksObtained) : existingMark.marksObtained;
    const newMaxMarks = maxMarks !== undefined ? parseInt(maxMarks) : existingMark.maxMarks;

    if (newMarksObtained < 0 || newMarksObtained > newMaxMarks) {
      return res.status(400).json({ error: 'Marks obtained cannot be negative or exceed maximum marks' });
    }

    // Calculate grade if not provided
    let calculatedGrade = grade || existingMark.grade;
    if (marksObtained !== undefined || maxMarks !== undefined) {
      const percentage = (newMarksObtained / newMaxMarks) * 100;
      if (percentage >= 90) calculatedGrade = 'A+';
      else if (percentage >= 80) calculatedGrade = 'A';
      else if (percentage >= 70) calculatedGrade = 'B+';
      else if (percentage >= 60) calculatedGrade = 'B';
      else if (percentage >= 50) calculatedGrade = 'C+';
      else if (percentage >= 40) calculatedGrade = 'C';
      else if (percentage >= 35) calculatedGrade = 'D';
      else calculatedGrade = 'F';
    }

    // Update mark record
    const updatedMark = await prisma.mark.update({
      where: { marksId: BigInt(id) },
      data: {
        marksObtained: newMarksObtained,
        maxMarks: newMaxMarks,
        grade: calculatedGrade,
        examinationType: examinationType || existingMark.examinationType
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
      mark: {
        ...updatedMark,
        marksId: Number(updatedMark.marksId),
        studentId: Number(updatedMark.studentId),
        teacherId: Number(updatedMark.teacherId)
      },
      message: 'Mark record updated successfully'
    });

  } catch (error) {
    console.error('Update mark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/marks/:id - Delete mark record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if mark record exists
    const existingMark = await prisma.mark.findUnique({
      where: { marksId: BigInt(id) }
    });

    if (!existingMark) {
      return res.status(404).json({ error: 'Mark record not found' });
    }

    // Delete mark record
    await prisma.mark.delete({
      where: { marksId: BigInt(id) }
    });

    res.json({ message: 'Mark record deleted successfully' });

  } catch (error) {
    console.error('Delete mark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/marks/stats/overview - Get marks statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { classId, subjectId, examinationType } = req.query;

    // Build where clause
    const where = {};
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }
    
    if (examinationType) {
      where.examinationType = examinationType;
    }

    // Get grade distribution
    const gradeStats = await prisma.mark.groupBy({
      by: ['grade'],
      where,
      _count: {
        grade: true
      },
      orderBy: {
        grade: 'asc'
      }
    });

    // Get subject-wise performance
    const subjectStats = await prisma.mark.groupBy({
      by: ['subjectId'],
      where,
      _avg: {
        marksObtained: true,
        maxMarks: true
      },
      _count: {
        subjectId: true
      }
    });

    // Get subject details for performance stats
    const subjectIds = subjectStats.map(stat => stat.subjectId);
    const subjectDetails = await prisma.subject.findMany({
      where: {
        subjectId: {
          in: subjectIds
        }
      },
      select: {
        subjectId: true,
        subjectName: true
      }
    });

    // Get examination type performance
    const examTypeStats = await prisma.mark.groupBy({
      by: ['examinationType'],
      where,
      _avg: {
        marksObtained: true,
        maxMarks: true
      },
      _count: {
        examinationType: true
      }
    });

    // Calculate overall statistics
    const overallStats = await prisma.mark.aggregate({
      where,
      _avg: {
        marksObtained: true,
        maxMarks: true
      },
      _count: {
        marksId: true
      }
    });

    const subjectPerformance = subjectStats.map(stat => {
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
        totalRecords: stat._count.subjectId
      };
    });

    const examTypePerformance = examTypeStats.map(stat => {
      const avgPercentage = stat._avg.maxMarks > 0 
        ? Math.round((stat._avg.marksObtained / stat._avg.maxMarks) * 100)
        : 0;
      
      return {
        examinationType: stat.examinationType,
        averageMarks: Math.round(stat._avg.marksObtained || 0),
        averageMaxMarks: Math.round(stat._avg.maxMarks || 0),
        averagePercentage: avgPercentage,
        totalRecords: stat._count.examinationType
      };
    });

    const overallPercentage = overallStats._avg.maxMarks > 0 
      ? Math.round((overallStats._avg.marksObtained / overallStats._avg.maxMarks) * 100)
      : 0;

    res.json({
      gradeDistribution: gradeStats.map(stat => ({
        grade: stat.grade,
        count: stat._count.grade
      })),
      subjectPerformance,
      examTypePerformance,
      overall: {
        totalRecords: overallStats._count.marksId,
        averageMarks: Math.round(overallStats._avg.marksObtained || 0),
        averageMaxMarks: Math.round(overallStats._avg.maxMarks || 0),
        averagePercentage: overallPercentage
      }
    });

  } catch (error) {
    console.error('Get marks stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
