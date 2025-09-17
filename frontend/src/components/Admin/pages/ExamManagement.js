import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';
import './ExamManagement.css';

const ExamManagement = () => {
  const { selectedAcademicYear, classes } = useAcademicYear();
  const [loading, setLoading] = useState(false);
  
  // Exam scheduling state
  const [showExamModal, setShowExamModal] = useState(false);
  const [examType, setExamType] = useState(null); // '2_per_day' or '1_per_day'
  const [examForm, setExamForm] = useState({
    startDate: '',
    endDate: '',
    classId: 'all' // Default to 'all' for all classes
  });
  const [examSessions, setExamSessions] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [allUpcomingExams, setAllUpcomingExams] = useState([]); // Store all exams
  const [examFilter, setExamFilter] = useState('all'); // Filter for displaying exams
  const [editingExam, setEditingExam] = useState(null);

  // Fetch upcoming exams for all classes
  const fetchUpcomingExams = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching upcoming exams for all classes');
      
      const response = await apiService.get('/timemanagement/upcoming-exams/all');
      if (response && response.success) {
        console.log('📚 All upcoming exams received:', response.data);
        setAllUpcomingExams(response.data);
        filterExams(response.data, examFilter);
      } else {
        setAllUpcomingExams([]);
        setUpcomingExams([]);
      }
    } catch (error) {
      console.error('❌ Error fetching upcoming exams:', error);
      setAllUpcomingExams([]);
      setUpcomingExams([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter exams based on selected class
  const filterExams = (exams, filterClassId) => {
    if (filterClassId === 'all') {
      setUpcomingExams(exams);
    } else {
      const filtered = exams.filter(exam => exam.classId === filterClassId);
      setUpcomingExams(filtered);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterClassId) => {
    setExamFilter(filterClassId);
    filterExams(allUpcomingExams, filterClassId);
  };

  useEffect(() => {
    fetchUpcomingExams();
  }, [selectedAcademicYear]);

  // Exam scheduling functions
  const handleExamClick = (type) => {
    setExamType(type);
    setShowExamModal(true);
    setExamForm({
      startDate: '',
      endDate: '',
      classId: 'all' // Default to all classes
    });
    setExamSessions([]);
  };

  const generateExamSessions = () => {
    const startDate = new Date(examForm.startDate);
    const endDate = new Date(examForm.endDate);
    const sessions = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        const dateStr = d.toISOString().split('T')[0];
        
        if (examType === '2_per_day') {
          sessions.push({
            date: dateStr,
            session: 'morning',
            subjectCode: '',
            classId: examForm.classId
          });
          sessions.push({
            date: dateStr,
            session: 'afternoon', 
            subjectCode: '',
            classId: examForm.classId
          });
        } else {
          sessions.push({
            date: dateStr,
            session: 'full_day',
            subjectCode: '',
            classId: examForm.classId
          });
        }
      }
    }
    
    setExamSessions(sessions);
  };

  const handleExamFormSubmit = async () => {
    try {
      setLoading(true);
      
      // Filter out empty sessions
      const validSessions = examSessions.filter(session => session.subjectCode.trim() !== '');
      
      if (validSessions.length === 0) {
        alert('Please add at least one subject for the exam schedule.');
        return;
      }

      // If "All Classes" is selected, create sessions for each class
      let finalSessions = [];
      if (examForm.classId === 'all') {
        classes.forEach(cls => {
          validSessions.forEach(session => {
            finalSessions.push({
              ...session,
              classId: cls.classId
            });
          });
        });
      } else {
        finalSessions = validSessions;
      }

      console.log('💾 Saving exam schedule to database:', { examType, examSessions: finalSessions, academicYear: selectedAcademicYear });

      const response = await apiService.post('/timemanagement/exams', {
        examType,
        examSessions: finalSessions,
        academicYear: selectedAcademicYear
      });
      
      console.log('✅ Exam schedule saved successfully:', response);
      alert(`Exam schedule created successfully for ${examForm.classId === 'all' ? 'all classes' : 'selected class'}!`);
      
      // Reset form and close modal
      setShowExamModal(false);
      setExamType(null);
      setExamForm({ startDate: '', endDate: '', classId: 'all' });
      setExamSessions([]);
      
      // Refresh upcoming exams
      await fetchUpcomingExams();
      
    } catch (error) {
      console.error('❌ Error saving exam schedule:', error);
      alert('Error saving exam schedule: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam schedule?')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.delete(`/timemanagement/exam/${examId}`);
      alert('Exam schedule deleted successfully!');
      await fetchUpcomingExams();
    } catch (error) {
      console.error('❌ Error deleting exam:', error);
      alert('Error deleting exam: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const updateExamSession = (index, field, value) => {
    const updated = [...examSessions];
    updated[index][field] = value;
    setExamSessions(updated);
  };

  return (
    <div className="exam-management">
      <div className="exam-header">
        <h2>📚 Exam Management</h2>
        <p>Manage exam schedules for all classes in academic year {selectedAcademicYear}</p>
      </div>

      {/* Exam Creation Buttons */}
      <div className="exam-creation-section">
        <h3>Create New Exam Schedule</h3>
        <div className="exam-type-buttons">
          <button
            className="exam-type-btn two-per-day"
            onClick={() => handleExamClick('2_per_day')}
            disabled={loading}
          >
            <div className="btn-icon">📚</div>
            <div className="btn-text">
              <strong>2 Exams Per Day</strong>
              <small>Morning & Afternoon Sessions</small>
            </div>
          </button>
          
          <button
            className="exam-type-btn one-per-day"
            onClick={() => handleExamClick('1_per_day')}
            disabled={loading}
          >
            <div className="btn-icon">📖</div>
            <div className="btn-text">
              <strong>1 Exam Per Day</strong>
              <small>Full Day Session</small>
            </div>
          </button>
        </div>
      </div>

      {/* Upcoming Exams Table */}
      <div className="upcoming-exams-section">
        <div className="section-header">
          <h3>Upcoming Exams</h3>
          <div className="filter-container">
            <label htmlFor="exam-filter">Filter by Class:</label>
            <select
              id="exam-filter"
              value={examFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="filter-select"
            >
              <option value="all">🏫 All Classes</option>
              {classes.map(cls => (
                <option key={cls.classId} value={cls.classId}>
                  Grade {cls.className} - Section {cls.section}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading && <p>Loading...</p>}
        {upcomingExams.length > 0 ? (
          <div className="exams-table-container">
            <table className="exams-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Class</th>
                  <th>Session Type</th>
                  <th>Subjects</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingExams.map((exam, index) => (
                  <tr key={exam.id || index}>
                    <td>{new Date(exam.date).toLocaleDateString('en-GB')}</td>
                    <td>{new Date(exam.date).toLocaleDateString('en-US', { weekday: 'long' })}</td>
                    <td>{exam.className || 'N/A'}</td>
                    <td>
                      <span className={`session-badge ${exam.examSession}`}>
                        {exam.examSession === '2_per_day' ? '2 Per Day' : 
                         exam.examSession === '1_per_day' ? 'Full Day' : exam.examSession}
                      </span>
                    </td>
                    <td>
                      <div className="subjects-list">
                        {exam.examDetails && exam.examDetails.length > 0 ? 
                          exam.examDetails.map((detail, idx) => (
                            <span key={idx} className="subject-tag">
                              {detail.subjectCode}
                            </span>
                          )) : 'No subjects'
                        }
                      </div>
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteExam(exam.id)}
                        disabled={loading}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No upcoming exams scheduled.</p>
        )}
      </div>

      {/* Exam Scheduling Modal */}
      {showExamModal && (
        <div className="modal-overlay">
          <div className="modal-content exam-modal">
            <h3>
              {examType === '2_per_day' ? '📚 Schedule 2 Exams Per Day' : '📖 Schedule 1 Exam Per Day'}
            </h3>
            
            <div className="form-group">
              <label>Target Classes:</label>
              <select
                value={examForm.classId}
                onChange={(e) => setExamForm({...examForm, classId: e.target.value})}
              >
                <option value="all">🏫 All Classes</option>
                {classes.map(cls => (
                  <option key={cls.classId} value={cls.classId}>
                    Grade {cls.className} - Section {cls.section}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={examForm.startDate}
                  onChange={(e) => setExamForm({...examForm, startDate: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={examForm.endDate}
                  onChange={(e) => setExamForm({...examForm, endDate: e.target.value})}
                />
              </div>
            </div>

            {examForm.startDate && examForm.endDate && (
              <button
                className="generate-sessions-btn"
                onClick={generateExamSessions}
                disabled={loading}
              >
                Generate Exam Sessions
              </button>
            )}

            {examSessions.length > 0 && (
              <div className="exam-sessions">
                <h4>Exam Sessions</h4>
                <div className="sessions-container">
                  {examSessions.map((session, index) => (
                    <div key={index} className="session-item">
                      <div className="session-date">
                        {new Date(session.date).toLocaleDateString('en-GB')} - {session.session}
                      </div>
                      <input
                        type="text"
                        placeholder="Subject Code (e.g., MATH, ENG, SCI)"
                        value={session.subjectCode}
                        onChange={(e) => updateExamSession(index, 'subjectCode', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowExamModal(false);
                  setExamType(null);
                  setExamForm({ startDate: '', endDate: '', classId: 'all' });
                  setExamSessions([]);
                }}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={handleExamFormSubmit}
                disabled={loading || examSessions.length === 0}
              >
                {loading ? 'Saving...' : 'Save Exam Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;