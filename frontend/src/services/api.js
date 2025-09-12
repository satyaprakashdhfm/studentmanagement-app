// API service for communicating with the backend
import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Helper method for making API calls with enhanced logging
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const startTime = Date.now();
    
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

    // Log API call start
    logger.debug(`API Call Started: ${method} ${endpoint}`, {
      url,
      headers: config.headers,
      body: options.body ? JSON.parse(options.body) : null
    });

    try {
      const response = await fetch(url, config);
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.data = errorData;
        
        // Log API error
        logger.apiCall(method, endpoint, 
          options.body ? JSON.parse(options.body) : null, 
          errorData, 
          error, 
          duration
        );
        
        throw error;
      }

      const responseData = await response.json();
      
      // Log successful API call
      logger.apiCall(method, endpoint, 
        options.body ? JSON.parse(options.body) : null, 
        responseData, 
        null, 
        duration
      );

      return responseData;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log network or parsing errors
      if (!error.status) {
        logger.apiCall(method, endpoint, 
          options.body ? JSON.parse(options.body) : null, 
          null, 
          error, 
          duration
        );
      }
      
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

  async getUser(username) {
    return this.request(`/users/${username}`);
  }

  async updateUser(username, userData) {
    return this.request(`/users/${username}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(username) {
    return this.request(`/users/${username}`, {
      method: 'DELETE',
    });
  }

  async activateUser(username) {
    return this.request(`/users/${username}/activate`, {
      method: 'PUT',
    });
  }

  // Students
  async getStudents() {
    return this.request('/students');
  }

  async getStudentsByClass(classId) {
    return this.request(`/students?classId=${classId}&limit=1000`);
  }

  async getStudentsByGrade(gradeName) {
    return this.request(`/students/grade/${encodeURIComponent(gradeName)}?limit=1000`);
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

  async getSubject(subjectCode) {
    return this.request(`/subjects/${subjectCode}`);
  }

  async createSubject(subjectData) {
    return this.request('/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    });
  }

  async updateSubject(subjectCode, subjectData) {
    return this.request(`/subjects/${subjectCode}`, {
      method: 'PUT',
      body: JSON.stringify(subjectData),
    });
  }

  async deleteSubject(subjectCode) {
    return this.request(`/subjects/${subjectCode}`, {
      method: 'DELETE',
    });
  }

  // Attendance
  async getAttendance() {
    return this.request('/attendance');
  }

  async getAttendanceWithLimit(limit = 1000) {
    return this.request(`/attendance?limit=${limit}`);
  }

  async getAttendanceByClass(classId) {
    return this.request(`/attendance?classId=${classId}`);
  }

  async addAttendance(attendanceData) {
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

  async getAttendanceStats(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/attendance/stats/overview${queryParams ? `?${queryParams}` : ''}`);
  }

  // Marks
  async getMarks() {
    return this.request('/marks?limit=10000');
  }

  async getMarksByClass(classId) {
    return this.request(`/marks?classId=${classId}`);
  }

  async getMarksByStudent(studentId) {
    return this.request(`/marks?studentId=${studentId}`);
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

  async deleteMarks(marksId) {
    return this.request(`/marks/${marksId}`, {
      method: 'DELETE',
    });
  }

  async getStudentMarks(studentId, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/marks/student/${studentId}${queryParams ? `?${queryParams}` : ''}`);
  }

  async getMarksStats(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/marks/stats/overview${queryParams ? `?${queryParams}` : ''}`);
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

  // Time Management
  async getTimeSlots() {
    return this.request('/timemanagement/timeslots');
  }

  async getClassSchedule(classId, section, academicYear = '2024-2025', startDate = null) {
    let url = `/timemanagement/schedule/${classId}/${section}?academicYear=${academicYear}`;
    if (startDate) {
      url += `&startDate=${startDate}`;
    }
    return this.request(url);
  }

  async createScheduleEntry(scheduleData) {
    return this.request('/timemanagement/schedule', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async updateScheduleEntry(scheduleData) {
    return this.request('/timemanagement/schedule', {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
  }

  async deleteScheduleEntry(scheduleId) {
    return this.request(`/timemanagement/schedule/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  async getEvents(academicYear = '2024-2025') {
    return this.request(`/timemanagement/exceptions?academicYear=${academicYear}`);
  }
}

// Export a singleton instance
const apiService = new ApiService();
export default apiService;

export const getClasses = async () => {
    try {
        const response = await fetch('/api/classes');
        if (!response.ok) {
            throw new Error('Failed to fetch classes');
        }
        return await response.json();
    } catch (error) {
        console.error('Error in getClasses API:', error);
        throw error;
    }
};
