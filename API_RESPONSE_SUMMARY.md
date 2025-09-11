# Student Management System API Response Summary

## Authentication Routes (`/api/auth`)

### POST `/api/auth/login`
**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "email": "admin@school.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "active": true
  },
  "message": "Login successful"
}
```

### POST `/api/auth/register`
**Request:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```
**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "username": "newuser",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "active": true
  }
}
```

## User Management Routes (`/api/users`)

### GET `/api/users`
**Response (200):**
```json
{
  "users": [
    {
      "username": "admin",
      "email": "admin@school.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "active": true,
      "createdAt": "2025-09-11T15:20:34.581Z",
      "updatedAt": "2025-09-11T15:20:34.581Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

### GET `/api/users/{username}`
**Response (200):**
```json
{
  "username": "admin",
  "email": "admin@school.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "active": true,
  "lastLogin": "2025-09-11T17:45:23.123Z",
  "createdAt": "2025-09-11T15:20:34.581Z",
  "updatedAt": "2025-09-11T15:20:34.581Z"
}
```

## Student Routes (`/api/students`)

### GET `/api/students`
**Response (200):**
```json
{
  "students": [
    {
      "studentId": "STU242510002016",
      "name": "Reyansh Chatterjee",
      "email": "reyansh.chatterjee@example.com",
      "phone": "9876543210",
      "dateOfBirth": "2010-05-15T00:00:00.000Z",
      "fatherName": "Rajesh Chatterjee",
      "fatherOccupation": "Engineer",
      "motherName": "Priya Chatterjee",
      "motherOccupation": "Teacher",
      "parentContact": "9999888777",
      "classId": 242510002,
      "admissionDate": "2024-04-01T00:00:00.000Z",
      "status": "active",
      "class": {
        "classId": 242510002,
        "className": "10 Grade",
        "section": "B",
        "academicYear": "2024-2025"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

### GET `/api/students/grade/:gradeName`
**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "studentId": "242510002008",
      "name": "Shaurya Bhattacharya",
      "email": "shaurya.bhattacharya@example.com",
      "phone": "9876543210",
      "dateOfBirth": "2010-05-15T00:00:00.000Z",
      "fatherName": "Rajesh Bhattacharya",
      "fatherOccupation": "Engineer",
      "motherName": "Priya Bhattacharya",
      "motherOccupation": "Teacher",
      "parentContact": "9999888777",
      "classId": 242510002,
      "admissionDate": "2024-04-01T00:00:00.000Z",
      "status": "active",
      "class": {
        "classId": 242510002,
        "className": "10 Grade",
        "section": "B",
        "academicYear": "2024-2025"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 105,
    "pages": 3
  }
}
```

### POST `/api/students`
**Request:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "9876543210",
  "dateOfBirth": "2010-03-15",
  "fatherName": "Robert Smith",
  "fatherOccupation": "Doctor",
  "motherName": "Mary Smith",
  "motherOccupation": "Nurse",
  "parentContact": "9999777888",
  "classId": 242510001,
  "admissionDate": "2024-04-01",
  "status": "active"
}
```
**Response (201):**
```json
{
  "studentId": "STU1726077123456",
  "name": "John Smith",
  "email": "john.smith@example.com",
  "classId": 242510001,
  "status": "active",
  "createdAt": "2025-09-11T17:52:03.456Z"
}
```

## Teacher Routes (`/api/teachers`)

### GET `/api/teachers`
**Response (200):**
```json
{
  "teachers": [
    {
      "teacherId": "TCH242510001",
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@school.com",
      "phoneNumber": "9876543210",
      "qualification": "M.Sc. Mathematics, B.Ed.",
      "subjectsHandled": ["Mathematics", "Physics"],
      "classesAssigned": ["10A", "10B", "11A"],
      "classTeacherOf": "10A",
      "hireDate": "2020-06-01T00:00:00.000Z",
      "salary": "50000.00",
      "active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Class Routes (`/api/classes`)

### GET `/api/classes`
**Response (200):**
```json
{
  "classes": [
    {
      "classId": 242510001,
      "className": "10 Grade",
      "section": "A",
      "classTeacherId": "TCH242510001",
      "academicYear": "2024-2025",
      "maxStudents": 40,
      "classTeacher": {
        "teacherId": "TCH242510001",
        "name": "Dr. Sarah Johnson"
      },
      "_count": {
        "students": 35
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Subject Routes (`/api/subjects`)

### GET `/api/subjects`
**Response (200):**
```json
{
  "subjects": [
    {
      "subjectCode": "MATH10",
      "subjectName": "Mathematics",
      "classApplicable": "10",
      "maxMarksPerExam": 100,
      "isActive": true,
      "createdAt": "2025-09-11T15:20:34.581Z",
      "updatedAt": "2025-09-11T15:20:34.581Z"
    },
    {
      "subjectCode": "ENG10",
      "subjectName": "English",
      "classApplicable": "10",
      "maxMarksPerExam": 100,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "pages": 1
  }
}
```

## Attendance Routes (`/api/attendance`)

### GET `/api/attendance`
**Response (200):**
```json
{
  "attendance": [
    {
      "attendanceId": "1726077123456789",
      "studentId": "STU242510002016",
      "classId": 242510002,
      "date": "2025-09-11T00:00:00.000Z",
      "period": 1,
      "status": "present",
      "markedBy": "admin",
      "timestamp": "2025-09-11T09:00:00.000Z",
      "student": {
        "name": "Reyansh Chatterjee"
      },
      "class": {
        "className": "10 Grade",
        "section": "B"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Marks Routes (`/api/marks`)

### GET `/api/marks`
**Response (200):**
```json
{
  "marks": [
    {
      "marksId": "MRK1726077123456",
      "studentId": "STU242510002016",
      "classId": 242510002,
      "subjectCode": "MATH10",
      "examinationType": "Q1",
      "marksObtained": 85,
      "maxMarks": 100,
      "grade": "A",
      "entryDate": "2025-09-11T00:00:00.000Z",
      "teacherId": "TCH242510001",
      "student": {
        "name": "Reyansh Chatterjee"
      },
      "subject": {
        "subjectName": "Mathematics"
      },
      "teacher": {
        "name": "Dr. Sarah Johnson"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Fees Routes (`/api/fees`)

### GET `/api/fees`
**Response (200):**
```json
{
  "fees": [
    {
      "feeId": "STU242510002016_tuition_term1",
      "studentId": "STU242510002016",
      "classId": 242510002,
      "feeType": "tuition_term1",
      "amountDue": "15000.00",
      "amountPaid": "15000.00",
      "paymentDate": "2025-09-11T00:00:00.000Z",
      "paymentMethod": "cash",
      "balance": "0.00",
      "academicYear": "2024-2025",
      "student": {
        "name": "Reyansh Chatterjee"
      },
      "class": {
        "className": "10 Grade",
        "section": "B"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Syllabus Routes (`/api/syllabus`)

### GET `/api/syllabus`
**Response (200):**
```json
{
  "syllabus": [
    {
      "syllabusId": "SYL_MATH10_242510001_TCH242510001",
      "classId": 242510001,
      "subjectCode": "MATH10",
      "teacherId": "TCH242510001",
      "unitName": "Algebra",
      "completionStatus": "in_progress",
      "completionPercentage": 75,
      "currentTopic": "Quadratic Equations",
      "lastUpdated": "2025-09-11T15:30:00.000Z",
      "subject": {
        "subjectName": "Mathematics"
      },
      "teacher": {
        "name": "Dr. Sarah Johnson"
      },
      "class": {
        "className": "10 Grade",
        "section": "A"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Calendar Routes (`/api/calendar`)

### GET `/api/calendar`
**Response (200):**
```json
{
  "calendar": [
    {
      "calendarId": 1,
      "academicYear": "2024-2025",
      "startDate": "2024-04-01T00:00:00.000Z",
      "endDate": "2025-03-31T00:00:00.000Z",
      "holidays": [
        {
          "date": "2024-08-15",
          "name": "Independence Day",
          "type": "national"
        },
        {
          "date": "2024-10-02",
          "name": "Gandhi Jayanti",
          "type": "national"
        }
      ],
      "examinationDates": [
        {
          "examType": "Q1",
          "startDate": "2024-07-15",
          "endDate": "2024-07-25"
        },
        {
          "examType": "Half-Yearly",
          "startDate": "2024-10-15",
          "endDate": "2024-10-30"
        }
      ],
      "createdBy": "admin",
      "creator": {
        "firstName": "Admin",
        "lastName": "User"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

## Time Management Routes (`/api/timemanagement`)

### GET `/api/timemanagement/timeslots`
**Response (200):**
```json
[
  {
    "slotId": "SLOT1",
    "slotName": "Period 1",
    "startTime": "09:00:00",
    "endTime": "09:45:00",
    "slotOrder": 1,
    "isActive": true,
    "createdAt": "2025-09-11T15:20:34.581Z",
    "updatedAt": "2025-09-11T15:20:34.581Z"
  },
  {
    "slotId": "SLOT2",
    "slotName": "Period 2",
    "startTime": "09:45:00",
    "endTime": "10:30:00",
    "slotOrder": 2,
    "isActive": true
  }
]
```

### GET `/api/timemanagement/schedule/{classId}/{section}`
**Response (200):**
```json
{
  "schedule": [
    {
      "scheduleId": "1_SLOT1_242510001_MATH10",
      "classId": 242510001,
      "dayOfWeek": 1,
      "slotId": "SLOT1",
      "subjectCode": "MATH10",
      "teacherId": "TCH242510001",
      "academicYear": "2024-2025",
      "isActive": true,
      "timeSlot": {
        "slotName": "Period 1",
        "startTime": "09:00:00",
        "endTime": "09:45:00"
      },
      "subject": {
        "subjectName": "Mathematics"
      },
      "teacher": {
        "name": "Dr. Sarah Johnson"
      },
      "isException": false
    }
  ],
  "exceptions": [],
  "weekDates": {
    "1": "2025-09-08",
    "2": "2025-09-09",
    "3": "2025-09-10",
    "4": "2025-09-11",
    "5": "2025-09-12",
    "6": "2025-09-13",
    "7": "2025-09-14"
  }
}
```

### GET `/api/timemanagement/exceptions`
**Response (200):**
```json
[
  {
    "exceptionId": "EXC1726077123456",
    "classId": 242510001,
    "exceptionDate": "2025-09-15",
    "slotId": "SLOT1",
    "exceptionType": "exam",
    "title": "Mathematics Unit Test",
    "description": "Algebra unit test for Grade 10",
    "subjectCode": "MATH10",
    "teacherId": "TCH242510001",
    "academicYear": "2024-2025",
    "affectsAllClasses": false,
    "createdBy": "admin",
    "class": {
      "className": "10 Grade",
      "section": "A"
    },
    "timeSlot": {
      "slotName": "Period 1"
    },
    "subject": {
      "subjectName": "Mathematics"
    },
    "teacher": {
      "name": "Dr. Sarah Johnson"
    },
    "creator": {
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
]
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Invalid token"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

## Common Response Patterns

### Pagination Structure
```json
{
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

### Statistics Endpoints
Most entities have `/stats` endpoints that return:
```json
{
  "totalCount": 150,
  "activeCount": 145,
  "inactiveCount": 5,
  "recentCount": 12,
  "additionalMetrics": {}
}
```

### Filtering and Sorting
All GET endpoints support query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `search` - Search term
- `sortBy` - Field to sort by
- `sortOrder` - 'asc' or 'desc'
- Entity-specific filters (classId, academicYear, etc.)

## Authentication Requirements
All endpoints except `/api/auth/login` and `/api/auth/register` require:
```
Authorization: Bearer <JWT_TOKEN>
```

## Content-Type
All POST/PUT requests require:
```
Content-Type: application/json
```
