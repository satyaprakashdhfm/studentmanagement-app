const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  try {
    // Hash passwords for different user types
    const adminPassword = await bcrypt.hash('admin123', 10);
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);
    
    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@school.com' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@school.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        active: true
      }
    });

    console.log('✅ Created admin user:', { id: Number(adminUser.id), username: adminUser.username });

    // Create academic calendar
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    
    const calendar = await prisma.academicCalendar.upsert({
      where: { calendarId: 1 },
      update: {},
      create: {
        academicYear: academicYear,
        startDate: new Date(`${currentYear}-04-01`),
        endDate: new Date(`${currentYear + 1}-03-31`),
        holidays: [
          { name: 'Summer Break', startDate: '2024-05-15', endDate: '2024-06-15' },
          { name: 'Independence Day', startDate: '2024-08-15', endDate: '2024-08-15' },
          { name: 'Winter Break', startDate: '2024-12-20', endDate: '2025-01-05' }
        ],
        examinationDates: [
          { name: 'Mid Term', startDate: '2024-09-15', endDate: '2024-09-25' },
          { name: 'Final Exams', startDate: '2025-02-15', endDate: '2025-02-28' }
        ],
        createdBy: adminUser.id
      }
    });

    console.log('✅ Created academic calendar for:', academicYear);

    // Create subjects
    const subjects = [
      { subjectId: 101, subjectName: 'Mathematics', subjectCode: 'MATH101', classApplicable: '8th-10th', maxMarksPerExam: 100 },
      { subjectId: 102, subjectName: 'Physics', subjectCode: 'PHY102', classApplicable: '9th-10th', maxMarksPerExam: 100 },
      { subjectId: 103, subjectName: 'Chemistry', subjectCode: 'CHEM103', classApplicable: '9th-10th', maxMarksPerExam: 100 },
      { subjectId: 104, subjectName: 'Biology', subjectCode: 'BIO104', classApplicable: '9th-10th', maxMarksPerExam: 100 },
      { subjectId: 105, subjectName: 'English', subjectCode: 'ENG105', classApplicable: '6th-10th', maxMarksPerExam: 100 },
      { subjectId: 106, subjectName: 'Hindi', subjectCode: 'HIN106', classApplicable: '6th-10th', maxMarksPerExam: 100 },
      { subjectId: 107, subjectName: 'Social Science', subjectCode: 'SS107', classApplicable: '6th-10th', maxMarksPerExam: 100 }
    ];

    for (const subject of subjects) {
      await prisma.subject.upsert({
        where: { subjectId: subject.subjectId },
        update: {},
        create: subject
      });
    }

    console.log('✅ Created subjects');

    // Create teacher users and teachers
    const teacherData = [
      {
        username: 'teacher1',
        email: 'math.teacher@school.com',
        password: teacherPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'teacher',
        teacherInfo: {
          name: 'Sarah Johnson',
          email: 'math.teacher@school.com',
          phoneNumber: '+1234567890',
          qualification: 'M.Sc Mathematics, B.Ed',
          subjectsHandled: ['Mathematics'],
          classesAssigned: ['8th A', '9th A', '10th A'],
          classTeacherOf: '9th A',
          hireDate: new Date('2020-06-01'),
          salary: 50000
        }
      },
      {
        username: 'teacher2',
        email: 'physics.teacher@school.com',
        password: teacherPassword,
        firstName: 'John',
        lastName: 'Smith',
        role: 'teacher',
        teacherInfo: {
          name: 'John Smith',
          email: 'physics.teacher@school.com',
          phoneNumber: '+1234567891',
          qualification: 'M.Sc Physics, B.Ed',
          subjectsHandled: ['Physics'],
          classesAssigned: ['9th A', '10th A'],
          classTeacherOf: '10th A',
          hireDate: new Date('2019-07-01'),
          salary: 52000
        }
      },
      {
        username: 'teacher3',
        email: 'english.teacher@school.com',
        password: teacherPassword,
        firstName: 'Emily',
        lastName: 'Davis',
        role: 'teacher',
        teacherInfo: {
          name: 'Emily Davis',
          email: 'english.teacher@school.com',
          phoneNumber: '+1234567892',
          qualification: 'M.A English Literature, B.Ed',
          subjectsHandled: ['English'],
          classesAssigned: ['8th A', '9th A', '10th A'],
          classTeacherOf: null,
          hireDate: new Date('2021-05-01'),
          salary: 48000
        }
      }
    ];

    for (const teacher of teacherData) {
      const { teacherInfo, ...userData } = teacher;
      
      // Create user
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: userData
      });

      // Create teacher
      await prisma.teacher.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          ...teacherInfo
        }
      });
    }

    console.log('✅ Created teachers');

    // Create classes
    const classes = [
      { classId: 801, className: '8th', section: 'A', academicYear: academicYear, maxStudents: 40 },
      { classId: 901, className: '9th', section: 'A', academicYear: academicYear, maxStudents: 40 },
      { classId: 1001, className: '10th', section: 'A', academicYear: academicYear, maxStudents: 40 }
    ];

    for (const classData of classes) {
      await prisma.class.upsert({
        where: { classId: classData.classId },
        update: {},
        create: classData
      });
    }

    console.log('✅ Created classes');

    // Create student users and students
    const studentData = [
      {
        username: 'student1',
        email: 'john.doe@school.com',
        password: studentPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
        studentInfo: {
          name: 'John Doe',
          address: '123 Main St, City, State',
          email: 'john.doe@school.com',
          phone: '+1234567893',
          dateOfBirth: new Date('2008-05-15'),
          parentName: 'Robert Doe',
          parentContact: '+1234567894',
          classId: 901,
          section: 'A',
          admissionDate: new Date('2023-04-01'),
          status: 'active'
        }
      },
      {
        username: 'student2',
        email: 'jane.smith@school.com',
        password: studentPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'student',
        studentInfo: {
          name: 'Jane Smith',
          address: '456 Oak Ave, City, State',
          email: 'jane.smith@school.com',
          phone: '+1234567895',
          dateOfBirth: new Date('2007-08-22'),
          parentName: 'Mary Smith',
          parentContact: '+1234567896',
          classId: 1001,
          section: 'A',
          admissionDate: new Date('2022-04-01'),
          status: 'active'
        }
      },
      {
        username: 'student3',
        email: 'mike.wilson@school.com',
        password: studentPassword,
        firstName: 'Mike',
        lastName: 'Wilson',
        role: 'student',
        studentInfo: {
          name: 'Mike Wilson',
          address: '789 Pine St, City, State',
          email: 'mike.wilson@school.com',
          phone: '+1234567897',
          dateOfBirth: new Date('2009-03-10'),
          parentName: 'David Wilson',
          parentContact: '+1234567898',
          classId: 801,
          section: 'A',
          admissionDate: new Date('2024-04-01'),
          status: 'active'
        }
      }
    ];

    for (const student of studentData) {
      const { studentInfo, ...userData } = student;
      
      // Create user
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: userData
      });

      // Create student
      await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          ...studentInfo
        }
      });
    }

    console.log('✅ Created students');

    // Create sample attendance records
    const students = await prisma.student.findMany();
    const teachers = await prisma.teacher.findMany();
    
    for (const student of students) {
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
          await prisma.attendance.create({
            data: {
              studentId: student.id,
              classId: student.classId,
              date: date,
              period: Math.floor(Math.random() * 6) + 1,
              status: Math.random() > 0.1 ? 'present' : 'absent',
              markedBy: teachers[Math.floor(Math.random() * teachers.length)].id
            }
          });
        }
      }
    }

    console.log('✅ Created attendance records');

    // Create sample marks
    const examTypes = ['FA1', 'FA2', 'SA1', 'SA2'];
    
    for (const student of students) {
      for (const examType of examTypes) {
        for (const subject of subjects) {
          const maxMarks = subject.maxMarksPerExam;
          const marksObtained = Math.floor(Math.random() * 30) + 70; // 70-100 range
          const percentage = (marksObtained / maxMarks) * 100;
          
          let grade = 'F';
          if (percentage >= 90) grade = 'A';
          else if (percentage >= 80) grade = 'B';
          else if (percentage >= 70) grade = 'C';
          else if (percentage >= 60) grade = 'D';
          
          await prisma.mark.create({
            data: {
              studentId: student.id,
              classId: student.classId,
              subjectId: subject.subjectId,
              examinationType: examType,
              marksObtained: marksObtained,
              maxMarks: maxMarks,
              grade: grade,
              teacherId: teachers[Math.floor(Math.random() * teachers.length)].id,
              entryDate: new Date()
            }
          });
        }
      }
    }

    console.log('✅ Created marks records');

    // Create sample fee records
    const feeTypes = ['Tuition Fee', 'Transport Fee', 'Activity Fee', 'Library Fee'];
    
    for (const student of students) {
      for (const feeType of feeTypes) {
        const amountDue = Math.floor(Math.random() * 5000) + 10000; // 10000-15000 range
        const amountPaid = Math.floor(amountDue * (Math.random() * 0.5 + 0.5)); // 50-100% paid
        const balance = amountDue - amountPaid;
        
        await prisma.fee.create({
          data: {
            studentId: student.id,
            classId: student.classId,
            feeType: feeType,
            amountDue: amountDue,
            amountPaid: amountPaid,
            paymentDate: balance === 0 ? new Date() : null,
            paymentMethod: balance === 0 ? 'Online' : null,
            balance: balance,
            academicYear: academicYear
          }
        });
      }
    }

    console.log('✅ Created fee records');

    // Create sample syllabus records
    const syllabusUnits = [
      'Number Systems', 'Algebra', 'Geometry', 'Statistics',
      'Motion and Force', 'Light and Sound', 'Electricity',
      'Grammar', 'Literature', 'Writing Skills'
    ];
    
    for (const subject of subjects.slice(0, 3)) { // Only for first 3 subjects
      for (let i = 0; i < 4; i++) {
        const unitName = syllabusUnits[Math.floor(Math.random() * syllabusUnits.length)];
        const completionPercentage = Math.floor(Math.random() * 100);
        
        let status = 'not_started';
        if (completionPercentage === 100) status = 'completed';
        else if (completionPercentage > 0) status = 'in_progress';
        
        await prisma.syllabus.create({
          data: {
            classId: 901, // 9th A class
            subjectId: subject.subjectId,
            unitName: `${unitName} - Unit ${i + 1}`,
            completionStatus: status,
            completionPercentage: completionPercentage,
            currentTopic: status === 'in_progress' ? `Topic ${Math.floor(Math.random() * 5) + 1}` : null,
            teacherId: teachers[0].id,
            lastUpdated: new Date()
          }
        });
      }
    }

    console.log('✅ Created syllabus records');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin user: admin@school.com (password: admin123)');
    console.log('- Teachers: 3 created with different subjects');
    console.log('- Students: 3 created across different classes');
    console.log('- Classes: 8th A, 9th A, 10th A');
    console.log('- Subjects: 7 subjects created');
    console.log('- Sample data: Attendance, Marks, Fees, Syllabus records');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
