// API service for communicating with the backend
const API_BASE_URL = 'http://localhost:8080/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Helper method for making API calls
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Students
  async getStudents() {
    return this.request('/students');
  }

  async getStudentsByClass(classId) {
    return this.request(`/students?classId=${classId}`);
  }

  async getStudent(studentId) {
    return this.request(`/students/${studentId}`);
  }

  async createStudent(studentData) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(studentId, studentData) {
    return this.request(`/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(studentId) {
    return this.request(`/students/${studentId}`, {
      method: 'DELETE',
    });
  }

  // Teachers
  async getTeachers() {
    return this.request('/teachers');
  }

  async getTeacher(teacherId) {
    return this.request(`/teachers/${teacherId}`);
  }

  async createTeacher(teacherData) {
    return this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    });
  }

  async updateTeacher(teacherId, teacherData) {
    return this.request(`/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData),
    });
  }

  async deleteTeacher(teacherId) {
    return this.request(`/teachers/${teacherId}`, {
      method: 'DELETE',
    });
  }

  // Classes
  async getClasses() {
    return this.request('/classes');
  }

  async getClass(classId) {
    return this.request(`/classes/${classId}`);
  }

  async createClass(classData) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  }

  async updateClass(classId, classData) {
    return this.request(`/classes/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    });
  }

  async deleteClass(classId) {
    return this.request(`/classes/${classId}`, {
      method: 'DELETE',
    });
  }

  // Subjects
  async getSubjects() {
    return this.request('/subjects');
  }

  async getSubject(subjectId) {
    return this.request(`/subjects/${subjectId}`);
  }

  async createSubject(subjectData) {
    return this.request('/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    });
  }

  async updateSubject(subjectId, subjectData) {
    return this.request(`/subjects/${subjectId}`, {
      method: 'PUT',
      body: JSON.stringify(subjectData),
    });
  }

  async deleteSubject(subjectId) {
    return this.request(`/subjects/${subjectId}`, {
      method: 'DELETE',
    });
  }

  // Attendance
  async getAttendance(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/attendance${queryParams ? `?${queryParams}` : ''}`);
  }

  async markAttendance(attendanceData) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async updateAttendance(attendanceId, attendanceData) {
    return this.request(`/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  async getStudentAttendance(studentId, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/attendance/student/${studentId}${queryParams ? `?${queryParams}` : ''}`);
  }

  // Marks
  async getMarks(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/marks${queryParams ? `?${queryParams}` : ''}`);
  }

  async addMarks(marksData) {
    return this.request('/marks', {
      method: 'POST',
      body: JSON.stringify(marksData),
    });
  }

  async updateMarks(marksId, marksData) {
    return this.request(`/marks/${marksId}`, {
      method: 'PUT',
      body: JSON.stringify(marksData),
    });
  }

  async getStudentMarks(studentId, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/marks/student/${studentId}${queryParams ? `?${queryParams}` : ''}`);
  }

  // Fees
  async getFees(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/fees${queryParams ? `?${queryParams}` : ''}`);
  }
  
  async getFeeStats(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/fees/stats/overview${queryParams ? `?${queryParams}` : ''}`);
  }
  
  async getFeesByClass(classId) {
    return this.request(`/fees?classId=${classId}`);
  }

  async addFee(feeData) {
    return this.request('/fees', {
      method: 'POST',
      body: JSON.stringify(feeData),
    });
  }

  async updateFee(feeId, feeData) {
    return this.request(`/fees/${feeId}`, {
      method: 'PUT',
      body: JSON.stringify(feeData),
    });
  }

  async getStudentFees(studentId) {
    return this.request(`/fees/student/${studentId}`);
  }

  async recordPayment(feeId, paymentData) {
    return this.request(`/fees/${feeId}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async recordPayment(feeId, paymentData) {
    return this.request(`/fees/${feeId}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updateFee(feeId, feeData) {
    return this.request(`/fees/${feeId}`, {
      method: 'PUT',
      body: JSON.stringify(feeData),
    });
  }

  // Syllabus
  async getSyllabus(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/syllabus${queryParams ? `?${queryParams}` : ''}`);
  }

  async createSyllabus(syllabusData) {
    return this.request('/syllabus', {
      method: 'POST',
      body: JSON.stringify(syllabusData),
    });
  }

  async updateSyllabus(syllabusId, syllabusData) {
    return this.request(`/syllabus/${syllabusId}`, {
      method: 'PUT',
      body: JSON.stringify(syllabusData),
    });
  }

  async updateSyllabusProgress(syllabusId, progressData) {
    return this.request(`/syllabus/${syllabusId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  }

  // Academic Calendar
  async getAcademicCalendar() {
    return this.request('/calendar');
  }

  async createAcademicCalendar(calendarData) {
    return this.request('/calendar', {
      method: 'POST',
      body: JSON.stringify(calendarData),
    });
  }

  async updateAcademicCalendar(calendarId, calendarData) {
    return this.request(`/calendar/${calendarId}`, {
      method: 'PUT',
      body: JSON.stringify(calendarData),
    });
  }
}

// Export a singleton instance
const apiService = new ApiService();
export default apiService;
