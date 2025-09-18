const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all academic years
router.get('/', async (req, res) => {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { academicYearId: 'desc' }
    });
    
    console.log(`📅 Fetched ${academicYears.length} academic years`);
    res.json({ academicYears });
  } catch (error) {
    console.error('❌ Error fetching academic years:', error);
    res.status(500).json({ error: 'Failed to fetch academic years' });
  }
});

// Create comprehensive academic year with all related data
router.post('/comprehensive', async (req, res) => {
  const transaction = await prisma.$transaction(async (tx) => {
    try {
      const {
        academicYear,
        classes,
        subjects,
        syllabus,
        holidays,
        examSchedule
      } = req.body;

      console.log('🚀 Starting comprehensive academic year creation...');

      // 1. Create Academic Year
      const newAcademicYear = await tx.academicYear.create({
        data: {
          academicYearId: academicYear.academicYearId,
          academicYearDisplay: academicYear.academicYearDisplay,
          startDate: new Date(academicYear.startDate),
          endDate: new Date(academicYear.endDate),
          status: academicYear.status || 'UPCOMING',
          isCurrent: academicYear.isCurrent || false,
          termStructure: academicYear.termStructure,
          holidays: holidays,
          examinationSchedule: examSchedule,
          createdBy: req.user?.username || 'admin'
        }
      });
      console.log(`✅ Created academic year: ${academicYear.academicYearDisplay}`);

      // 2. Create Classes with Sections
      const createdClasses = [];
      for (const classData of classes) {
        const newClass = await tx.class.create({
          data: {
            classId: classData.classId,
            className: classData.className,
            sectionName: classData.sectionName,
            academicYearId: academicYear.academicYearId,
            maxStudents: classData.maxStudents || 40,
            currentStudents: 0,
            roomAssignment: classData.roomAssignment,
            active: true,
            updatedBy: req.user?.username || 'admin'
          }
        });
        createdClasses.push(newClass);
      }
      console.log(`✅ Created ${createdClasses.length} classes`);

      // 3. Create Subjects
      const createdSubjects = [];
      for (const subjectData of subjects) {
        const newSubject = await tx.subject.create({
          data: {
            subjectCode: subjectData.subjectCode,
            subjectName: subjectData.subjectName,
            gradeLevel: subjectData.gradeLevel,
            academicYearId: academicYear.academicYearId,
            maxMarksPerExam: subjectData.maxMarksPerExam || 100,
            isActive: true,
            updatedBy: req.user?.username || 'admin'
          }
        });
        createdSubjects.push(newSubject);
      }
      console.log(`✅ Created ${createdSubjects.length} subjects`);

      // 4. Create Syllabus Entries
      const createdSyllabus = [];
      for (const syllabusData of syllabus) {
        const newSyllabus = await tx.syllabus.create({
          data: {
            syllabusId: syllabusData.syllabusId,
            academicYearId: academicYear.academicYearId,
            subjectCode: syllabusData.subjectCode,
            classId: syllabusData.classId,
            unitName: syllabusData.unitName,
            unitOrder: syllabusData.unitOrder,
            subTopics: syllabusData.subTopics,
            completionPercentage: 0,
            status: 'not-started',
            updatedBy: req.user?.username || 'admin'
          }
        });
        createdSyllabus.push(newSyllabus);
      }
      console.log(`✅ Created ${createdSyllabus.length} syllabus entries`);

      // 5. Create Class Standard Fees (basic fee structure)
      const createdFees = [];
      for (const classData of classes) {
        const basicFees = [
          { name: 'Tuition Fee - Term 1', amount: 15000 },
          { name: 'Tuition Fee - Term 2', amount: 15000 },
          { name: 'Tuition Fee - Term 3', amount: 15000 },
          { name: 'Books & Stationery', amount: 5000 },
          { name: 'Uniform Fee', amount: 3000 },
          { name: 'Transport Fee', amount: 8000 }
        ];

        for (const fee of basicFees) {
          const newFee = await tx.classStandardFee.create({
            data: {
              feeId: `${classData.classId}_${fee.name.replace(/\s+/g, '_').toLowerCase()}_${academicYear.academicYearId}`,
              classId: classData.classId,
              feeName: fee.name,
              amount: fee.amount,
              academicYearId: academicYear.academicYearId,
              createdBy: req.user?.username || 'admin',
              updatedBy: req.user?.username || 'admin'
            }
          });
          createdFees.push(newFee);
        }
      }
      console.log(`✅ Created ${createdFees.length} standard fee entries`);

      return {
        academicYear: newAcademicYear,
        classes: createdClasses,
        subjects: createdSubjects,
        syllabus: createdSyllabus,
        fees: createdFees,
        summary: {
          academicYearId: newAcademicYear.academicYearId,
          classesCreated: createdClasses.length,
          subjectsCreated: createdSubjects.length,
          syllabusEntriesCreated: createdSyllabus.length,
          feeEntriesCreated: createdFees.length
        }
      };

    } catch (error) {
      console.error('❌ Transaction error:', error);
      throw error;
    }
  });

  console.log('🎉 Comprehensive academic year creation completed successfully!');
  res.status(201).json({
    success: true,
    message: 'Academic year and all related data created successfully',
    data: transaction
  });
});

// Create simple academic year (original endpoint)
router.post('/', async (req, res) => {
  try {
    const {
      academicYearId,
      academicYearDisplay,
      startDate,
      endDate,
      status = 'UPCOMING',
      isCurrent = false,
      termStructure,
      holidays,
      examinationSchedule
    } = req.body;

    const newAcademicYear = await prisma.academicYear.create({
      data: {
        academicYearId,
        academicYearDisplay,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        isCurrent,
        termStructure,
        holidays,
        examinationSchedule,
        createdBy: req.user?.username || 'admin'
      }
    });

    console.log(`✅ Created academic year: ${academicYearDisplay}`);
    res.status(201).json({ academicYear: newAcademicYear });
  } catch (error) {
    console.error('❌ Error creating academic year:', error);
    res.status(500).json({ error: 'Failed to create academic year' });
  }
});

module.exports = router;
