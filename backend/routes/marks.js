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
      subjectCode,
      teacherId,
      examinationType,
      page = 1, 
      limit = 50 
    } = req.query;
    
        // Get user info from token
    const user = req.user;
    
    // Build where clause
    const where = {};
    
    // Add filters
    if (studentId) {
      where.studentId = studentId;
    }
    
    if (classId) {
      where.classId = parseInt(classId);
      
      // If classId is provided but no specific subjectCode, filter by class grade
      if (!subjectCode) {
        // Get the class details to determine the grade
        const classDetails = await prisma.class.findUnique({
          where: { classId: parseInt(classId) },
          select: { className: true }
        });
        
        if (classDetails) {
          // Extract grade from className (e.g., "8 A" -> "8")
          const grade = classDetails.className.split(' ')[0];
          
          // Filter subjects that start with the grade prefix (e.g., "8_")
          where.subjectCode = {
            startsWith: `${grade}_`
          };
          
          console.log(`🎯 Filtering marks for class ${classId}, grade ${grade}, subject pattern: ${grade}_*`);
        }
      }
    }
    
    if (subjectCode) {
      where.subjectCode = subjectCode;
    }
    
    if (teacherId) {
      where.teacherId = teacherId;
    }
    
    if (examinationType) {
      where.examinationType = examinationType;
    }

    // Calculate pagination info for reference
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // For class-specific queries, show ALL records without pagination
    // Also disable pagination for general queries when high limit is requested
    const shouldPaginate = !classId && limitNum <= 1000;
    
    // Get marks records with conditional pagination
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
      ...(shouldPaginate && { skip, take: limitNum })
    });

    // Get total count
    const total = await prisma.mark.count({ where });

    // Format marks records for JSON serialization
    const formattedMarks = marks.map(record => {
      return {
        ...record,
        entryDate: record.entryDate.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };
    });

    res.json({
      marks: formattedMarks,
      pagination: {
        page: pageNum,
        total: total,
        pages: shouldPaginate ? Math.ceil(total / limitNum) : 1,
        showingAll: !shouldPaginate
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
    const { subjectCode, examinationType, page = 1, limit = 50 } = req.query;
    
    // Get student's class to determine grade for subject filtering
    const student = await prisma.student.findUnique({
      where: { studentId: studentId },
      select: { classId: true }
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const classData = await prisma.class.findUnique({
      where: { classId: student.classId },
      select: { className: true }
    });
    
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Extract grade from class name (e.g., "8 Grade" -> "8")
    const grade = classData.className.split(' ')[0];
    
    // Build where clause
    const where = {
      studentId: studentId
    };
    
    if (subjectCode) {
      where.subjectCode = subjectCode;
    } else {
      where.subjectCode = { startsWith: `${grade}_` };
    }
    
    if (examinationType) {
      where.examinationType = examinationType;
    }

    // For student-specific queries, show ALL records without pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get marks without pagination for student view
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
        }
      },
      orderBy: [
        { entryDate: 'desc' }
      ]
    });

    // Get total count
    const total = await prisma.mark.count({ where });

    // Format marks records for JSON serialization
    const formattedMarks = marks.map(record => {
      return {
        ...record,
        entryDate: record.entryDate.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };
    });

    res.json({
      marks: formattedMarks,
      pagination: {
        page: 1,
        limit: total,
        total: total,
        pages: 1,
        showingAll: true
      }
    });

  } catch (error) {
    console.error('Get student marks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/marks/:id - Get mark by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const markId = req.params.id;

    const mark = await prisma.mark.findUnique({
      where: { marksId: markId },
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

// POST /api/marks - Create new mark
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      subjectCode, 
      teacherId, 
      examinationType, 
      marksObtained, 
      maxMarks, 
      entryDate 
    } = req.body;

    // Validate required fields

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { studentId }
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
      where: { subjectCode }
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

    // Calculate grade if not provided
    const percentage = (marksObtained / maxMarks) * 100;
    let grade;
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C+';
    else if (percentage >= 40) grade = 'C';
    else if (percentage >= 33) grade = 'D';
    else grade = 'F';

    // Check for duplicate mark entry
    const existingMark = await prisma.mark.findFirst({
      where: {
        studentId,
        classId: parseInt(classId),
        subjectCode,
        examinationType
      }
    });

    if (existingMark) {
      return res.status(409).json({ 
        error: 'Mark already exists for this student, class, subject, and examination type' 
      });
    }

    // Generate marks ID using consistent pattern: studentId_subjectCode_examinationType
    const marksId = `${studentId}_${subjectCode}_${examinationType}`;

    // Create mark record
    const newMark = await prisma.mark.create({
      data: {
        marksId,
        studentId,
        classId: parseInt(classId),
        subjectCode,
        teacherId,
        examinationType,
        marksObtained: parseInt(marksObtained),
        maxMarks: parseInt(maxMarks),
        grade,
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
            subjectName: true
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
    const { markRecords, classId, subjectCode, examinationType, maxMarks, teacherId, entryDate } = req.body;

    if (!markRecords || !Array.isArray(markRecords) || markRecords.length === 0) {
      return res.status(400).json({ error: 'Mark records array is required' });
    }

    // Validate common fields

    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId }
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
      where: { subjectCode }
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
            studentId,
            classId: parseInt(classId),
            subjectCode,
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
            else if (percentage >= 33) calculatedGrade = 'D';
            else calculatedGrade = 'F';
          }

          // Generate marksId using pattern: studentId_subjectCode_examinationType
          const marksId = `${studentId}_${subjectCode}_${examinationType}`;

          const newMark = await prisma.mark.create({
            data: {
              marksId,
              studentId,
              classId: parseInt(classId),
              subjectCode,
              teacherId,
              examinationType,
              marksObtained: parseInt(marksObtained),
              maxMarks: parseInt(maxMarks),
              grade: calculatedGrade,
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
            marksId: newMark.marksId, // Keep as string
            studentId: Number(newMark.studentId),
            teacherId: Number(newMark.teacherId)
          });
        }
      }

      return createdRecords;
    });

    res.status(201).json({
      success: true,
      marks: result,
      message: `${result.length} mark records created successfully`
    });

  } catch (error) {
    console.error('Bulk create marks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/marks/:id - Update mark
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const markId = req.params.id;
    const { marksObtained, maxMarks, grade, examinationType } = req.body;

    // Check if mark exists

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
      else if (percentage >= 33) calculatedGrade = 'D';
      else calculatedGrade = 'F';
    }

    // Update mark record
    const updatedMark = await prisma.mark.update({
      where: { marksId: markId },
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
            subjectName: true
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

// DELETE /api/marks/:id - Delete mark
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const markId = req.params.id;

    // Check if mark exists

    // Delete mark
    await prisma.mark.delete({
      where: { marksId: markId }
    });

    res.json({ message: 'Mark deleted successfully' });

  } catch (error) {
    console.error('Delete mark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/marks/stats/overview - Get marks statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { classId, subjectId, examinationType, academicYear } = req.query;

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

    // Add academic year filtering by joining with Class table
    if (academicYear) {
      where.class = {
        academicYear: academicYear
      };
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
      by: ['subjectCode'],
      where,
      _avg: {
        marksObtained: true,
        maxMarks: true
      },
      _count: {
        subjectCode: true
      }
    });

    // Get subject details for performance stats
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
        totalRecords: stat._count.subjectCode
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
