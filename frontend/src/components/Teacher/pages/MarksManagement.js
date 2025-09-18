import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const MarksManagement = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [marks, setMarks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [examinationTypes, setExaminationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  // New state for marks entry modal
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);
  const [newExamDetails, setNewExamDetails] = useState({
    examType: '',
    maxMarks: 100,
    examDate: new Date().toISOString().split('T')[0]
  });
  const [studentMarks, setStudentMarks] = useState({});

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        if (!user || user.role !== 'teacher') {
          setError('Teacher session not found. Please login.');
          setLoading(false);
          return;
        }

        // Use username as teacherId and fetch teacher data
        const teacherId = user.username;
        console.log('Fetching marks management for teacher:', teacherId);
        
        const teacher = await apiService.getTeacher(teacherId);
        if (!teacher || !teacher.classesAssigned || teacher.classesAssigned.length === 0) {
          setError('Teacher classes not found. Please login again.');
          return;
        }
        
        // Filter classes to only those assigned to the teacher
        const allClassesResponse = await apiService.getClasses();
        const teacherClasses = allClassesResponse.classes.filter(cls => 
          teacher.classesAssigned.includes(cls.classId.toString())
        );
        setClasses(teacherClasses);
        setError(''); // Clear any previous errors
        
        if (teacherClasses.length > 0 && !selectedClass) {
          setSelectedClass(teacherClasses[0].classId);
        }

        // Fetch examination types from marks data
        try {
          console.log('Fetching marks data for examination types...');
          const marksResponse = await apiService.request('/marks?limit=100');
          console.log('Marks response:', marksResponse);
          
          if (marksResponse.marks && marksResponse.marks.length > 0) {
            // Get all unique examination types
            const uniqueExams = [...new Set(marksResponse.marks.map(m => m.examinationType))];
            console.log('Found examination types:', uniqueExams);
            setExaminationTypes(uniqueExams);
            setSelectedExam(uniqueExams[0] || 'FA1');
          } else {
            console.log('No marks data found, using default examination types');
            // Fallback to default types if no data
            setExaminationTypes(['FA1', 'FA2', 'SA1', 'SA2']);
            setSelectedExam('FA1');
          }
        } catch (marksError) {
          console.error('Error fetching marks data:', marksError);
          // Fallback to default types on error
          setExaminationTypes(['FA1', 'FA2', 'SA1', 'SA2']);
          setSelectedExam('FA1');
        }
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load data');
        // Fallback to default types on error
        setExaminationTypes(['FA1', 'FA2', 'SA1', 'SA2']);
        setSelectedExam('FA1');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInitialData();
    }
  }, [user]);

  // Fetch subjects and marks when class changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchClassData = async () => {
      try {
        setLoading(true);
        
        if (!user || user.role !== 'teacher') {
          setError('Teacher session not found. Please login.');
          setLoading(false);
          return;
        }
        
        const teacherId = user.username;
        
        if (!teacherId) {
          setError('Teacher information not found. Please login again.');
          return;
        }
        
        // Get subjects taught by this teacher in the selected class
        const scheduleResponse = await apiService.request(
          `/timemanagement/class-schedule/${selectedClass}/2024-2025`
        );
        
        // Filter schedule by current teacher and extract unique subjects
        const teacherSchedules = (scheduleResponse.data || []).filter(s => 
          s.teacherId === teacher.teacherId
        );
        
        const uniqueSubjects = [...new Set(
          teacherSchedules.map(s => s.subjectCode)
        )];
        
        // Get subject details
        const allSubjectsResponse = await apiService.getSubjects();
        const teacherSubjects = allSubjectsResponse.subjects.filter(sub => 
          uniqueSubjects.includes(sub.subjectCode)
        );
        
        setSubjects(teacherSubjects);
        
        if (teacherSubjects.length > 0 && !selectedSubject) {
          setSelectedSubject(teacherSubjects[0].subjectCode);
        }
        
      } catch (error) {
        console.error('Error fetching class data:', error);
        setError('Failed to load class data');
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [selectedClass]);

  // Fetch marks when class, subject, or exam changes
  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;

    const fetchMarksData = async () => {
      try {
        setLoading(true);
        
        if (!user || user.role !== 'teacher') {
          setError('Teacher session not found. Please login.');
          setLoading(false);
          return;
        }
        
        const teacherId = user.username;
        
        // Fetch marks for the selected class, subject, exam, and teacher
        const marksResponse = await apiService.request(
          `/marks?classId=${selectedClass}&subjectCode=${selectedSubject}&examinationType=${selectedExam}&teacherId=${teacherId}`
        );
        
        console.log('Marks API response:', marksResponse);
        setMarks(marksResponse.marks || []);
        
      } catch (error) {
        console.error('Error fetching marks:', error);
        setError('Failed to load marks data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarksData();
  }, [selectedClass, selectedSubject, selectedExam]);

  const handleMarkChange = async (markId, newMarks) => {
    try {
      console.log(`Updating mark ${markId} to ${newMarks}`);
      // In a real implementation, you'd call the update API
      // const response = await apiService.put(`/api/marks/${markId}`, { marksObtained: newMarks });
      // For now, just update local state
      setMarks(prevMarks => 
        prevMarks.map(mark => 
          mark.marksId === markId 
            ? { ...mark, marksObtained: newMarks, grade: calculateGrade(newMarks, mark.maxMarks) }
            : mark
        )
      );
    } catch (err) {
      console.error('Error updating marks:', err);
      alert('Failed to update marks');
    }
  };

  const calculateGrade = (obtained, max) => {
    const percentage = (obtained / max) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const handleSubmitMarks = async () => {
    try {
      // Validate exam details
      if (!newExamDetails.examType.trim()) {
        alert('Please enter an examination type.');
        return;
      }
      
      if (newExamDetails.maxMarks <= 0) {
        alert('Please enter a valid maximum marks value.');
        return;
      }
      
      if (!user || user.role !== 'teacher') {
        alert('Teacher session not found. Please login.');
        return;
      }
      
      const teacherId = user.username;
      
      if (!teacherId) {
        alert('Teacher information not found. Please login again.');
        return;
      }
      
      // Prepare marks data for submission - separate common fields from individual records
      const markRecords = [];
      
      Object.entries(studentMarks).forEach(([studentId, markData]) => {
        if (markData.marksObtained && markData.marksObtained.trim() !== '') {
          const marksObtained = parseFloat(markData.marksObtained);
          
          // Validate marks value
          if (isNaN(marksObtained) || marksObtained < 0 || marksObtained > newExamDetails.maxMarks) {
            throw new Error(`Invalid marks for student ${studentId}: ${markData.marksObtained}`);
          }
          
          markRecords.push({
            studentId: studentId,
            marksObtained: marksObtained,
            grade: null, // Let the backend calculate the grade
            remarks: markData.remarks || null
          });
        }
      });
      
      if (markRecords.length === 0) {
        alert('Please enter marks for at least one student.');
        return;
      }
      
      // Prepare bulk submission data
      const bulkData = {
        markRecords: markRecords,
        classId: selectedClass,
        subjectCode: selectedSubject,
        examinationType: newExamDetails.examType,
        maxMarks: newExamDetails.maxMarks,
        teacherId: teacher.teacherId,
        entryDate: newExamDetails.examDate
      };
      
      // Confirm submission
      const confirmMessage = `Submit marks for ${markRecords.length} student(s)?\n\nExam: ${newExamDetails.examType}\nMax Marks: ${newExamDetails.maxMarks}\nClass: ${classes.find(c => c.classId == selectedClass)?.className} ${classes.find(c => c.classId == selectedClass)?.section}\nSubject: ${subjects.find(s => s.subjectCode === selectedSubject)?.subjectName}`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // Submit marks to the bulk endpoint
      console.log('Submitting marks to bulk endpoint:', bulkData);
      
      const response = await apiService.request('/marks/bulk', {
        method: 'POST',
        body: JSON.stringify(bulkData)
      });
      
      console.log('Marks submission response:', response);
      
      if (response.success) {
        // Show success message
        alert(`✅ SUCCESS!\n\n${markRecords.length} student marks have been saved successfully!\n\nExam: ${newExamDetails.examType}\nClass: ${classes.find(c => c.classId == selectedClass)?.className} ${classes.find(c => c.classId == selectedClass)?.section}\nSubject: ${subjects.find(s => s.subjectCode === selectedSubject)?.subjectName}`);
        
        // Close modal
        setShowMarksModal(false);
        
        // Set selectedExam to the new exam type to show the results
        setSelectedExam(newExamDetails.examType);
        
        // Force refresh the page to ensure all data is updated
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
      } else {
        alert('❌ Failed to submit marks. Please try again.');
      }
      
    } catch (error) {
      console.error('Error submitting marks:', error);
      alert(`Error submitting marks: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMarkNewExam = async () => {
    try {
      // Fetch students for the selected class
      const studentsResponse = await apiService.request(`/students?classId=${selectedClass}`);
      const students = studentsResponse.data || [];
      
      if (students.length === 0) {
        alert('No students found in the selected class.');
        return;
      }
      
      // Reset modal state
      setModalStudents(students);
      setNewExamDetails({
        examType: '',
        maxMarks: 100,
        examDate: new Date().toISOString().split('T')[0]
      });
      
      // Initialize student marks with empty values
      const initialMarks = {};
      students.forEach(student => {
        initialMarks[student.studentId] = {
          marksObtained: '',
          remarks: ''
        };
      });
      setStudentMarks(initialMarks);
      
      // Show the modal
      setShowMarksModal(true);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Failed to load students for marks entry.');
    }
  };

  if (loading) {
    return (
      <div className="content-card">
        <h2>Marks Management</h2>
        <p>Loading marks data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <h2>Marks Management</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="content-card">
        <h2>Marks Management</h2>
        <p>Loading marks data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <h2>Marks Management</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="content-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Marks Management</h2>
        
        {/* Mark New Exam Marks Button - Right aligned */}
        {selectedClass && selectedSubject && (
          <button 
            className="btn btn-primary"
            style={{ 
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: '6px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={() => handleMarkNewExam()}
          >
            📝 Mark New Exam Marks
          </button>
        )}
      </div>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label>Select Class: </label>
          <select 
            value={selectedClass} 
            onChange={e => {
              setSelectedClass(e.target.value);
              setSelectedSubject(''); // Reset subject when class changes
            }}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="">Select Class</option>
            {classes.map(cls => (
              <option key={cls.classId} value={cls.classId}>
                Class {cls.className} {cls.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Select Subject: </label>
          <select 
            value={selectedSubject} 
            onChange={e => setSelectedSubject(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
            disabled={!selectedClass}
          >
            <option value="">Select Subject</option>
            {subjects.map(sub => (
              <option key={sub.subjectCode} value={sub.subjectCode}>
                {sub.subjectName} ({sub.subjectCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Select Examination: </label>
          <select 
            value={selectedExam} 
            onChange={e => setSelectedExam(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="">Select Examination</option>
            {examinationTypes.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClass || !selectedSubject ? (
        <p>Please select a class and subject to view marks.</p>
      ) : marks.length === 0 ? (
        <p>No marks found for {selectedExam || 'selected examination'} in the selected class and subject.</p>
      ) : (
        <div>
          <h3>Class {classes.find(c => c.classId == selectedClass)?.className} {classes.find(c => c.classId == selectedClass)?.section} - {subjects.find(s => s.subjectCode === selectedSubject)?.subjectName} ({selectedExam})</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Marks Obtained</th>
                <th>Max Marks</th>
                <th>Grade</th>
                <th>Entry Date</th>
              </tr>
            </thead>
            <tbody>
              {marks.map(mark => (
                <tr key={mark.marksId}>
                  <td>{mark.student.name}</td>
                  <td>{mark.marksObtained}</td>
                  <td>{mark.maxMarks}</td>
                  <td>{mark.grade}</td>
                  <td>{new Date(mark.entryDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full-Screen Marks Entry Modal */}
      {showMarksModal && (
        <div className="marks-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="marks-modal-content" style={{
            backgroundColor: 'white',
            width: '95%',
            height: '95%',
            borderRadius: '8px',
            padding: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #eee',
              paddingBottom: '15px',
              marginBottom: '20px'
            }}>
              <div>
                <h2>Enter Examination Marks</h2>
                <p style={{ margin: '5px 0', color: '#666' }}>
                  Class: {classes.find(c => c.classId == selectedClass)?.className} {classes.find(c => c.classId == selectedClass)?.section} | 
                  Subject: {subjects.find(s => s.subjectCode === selectedSubject)?.subjectName}
                </p>
              </div>
              <button 
                onClick={() => setShowMarksModal(false)}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* Exam Details Form - Compact */}
            <div className="exam-details-form" style={{
              display: 'flex',
              gap: '15px',
              marginBottom: '15px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              alignItems: 'end'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>
                  Examination Type:
                </label>
                <input
                  type="text"
                  value={newExamDetails.examType}
                  onChange={(e) => setNewExamDetails(prev => ({ ...prev, examType: e.target.value }))}
                  placeholder="e.g., Mid Term, Final Exam"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ flex: '0 0 100px' }}>
                <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>
                  Max Marks:
                </label>
                <input
                  type="number"
                  value={newExamDetails.maxMarks}
                  onChange={(e) => setNewExamDetails(prev => ({ ...prev, maxMarks: parseInt(e.target.value) || 0 }))}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ flex: '0 0 120px' }}>
                <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>
                  Exam Date:
                </label>
                <input
                  type="date"
                  value={newExamDetails.examDate}
                  onChange={(e) => setNewExamDetails(prev => ({ ...prev, examDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Students List with Mark Entry - Enhanced */}
            <div className="students-marks-container" style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                Student Marks Entry ({modalStudents.length} students) | 
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                  {Object.values(studentMarks).filter(mark => mark && mark.marksObtained && mark.marksObtained.toString().trim() !== '').length} entered
                </span>
              </h3>
              
              <div className="students-marks-list" style={{
                flex: 1,
                overflowY: 'auto',
                border: '2px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
                    <tr>
                      <th style={{ 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #dee2e6', 
                        textAlign: 'left',
                        width: '80px',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>Roll No</th>
                      <th style={{ 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #dee2e6', 
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>Student Name</th>
                      <th style={{ 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #dee2e6', 
                        textAlign: 'center', 
                        width: '120px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        backgroundColor: '#e3f2fd'
                      }}>Marks Obtained</th>
                      <th style={{ 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #dee2e6', 
                        textAlign: 'left', 
                        width: '180px',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalStudents.map((student, index) => (
                      <tr key={student.studentId} style={{ 
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
                      }}>
                        <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: '500' }}>
                          {student.rollNumber || student.studentId.slice(-3)}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <div style={{ fontWeight: '500' }}>
                            {student.firstName} {student.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            ID: {student.studentId}
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', backgroundColor: '#f8f9ff' }}>
                          <input
                            type="number"
                            value={studentMarks[student.studentId]?.marksObtained || ''}
                            onChange={(e) => setStudentMarks(prev => ({
                              ...prev,
                              [student.studentId]: {
                                ...prev[student.studentId],
                                marksObtained: e.target.value
                              }
                            }))}
                            min="0"
                            max={newExamDetails.maxMarks}
                            placeholder="0"
                            style={{
                              width: '90px',
                              padding: '10px 8px',
                              border: '2px solid #ddd',
                              borderRadius: '6px',
                              textAlign: 'center',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              backgroundColor: '#fff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#007bff'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                          />
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            / {newExamDetails.maxMarks}
                          </div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            value={studentMarks[student.studentId]?.remarks || ''}
                            onChange={(e) => setStudentMarks(prev => ({
                              ...prev,
                              [student.studentId]: {
                                ...prev[student.studentId],
                                remarks: e.target.value
                              }
                            }))}
                            placeholder="Optional remarks"
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer with Action Buttons - Improved */}
            <div className="modal-footer" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '2px solid #eee',
              paddingTop: '15px',
              marginTop: '15px',
              backgroundColor: '#f8f9fa',
              margin: '15px -20px -20px -20px',
              padding: '15px 20px'
            }}>
              <div style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>
                <span style={{ color: '#007bff' }}>Total Students: {modalStudents.length}</span> | 
                <span style={{ color: '#28a745', marginLeft: '8px' }}>
                  Marks Entered: {Object.values(studentMarks).filter(mark => mark && mark.marksObtained && mark.marksObtained.toString().trim() !== '').length}
                </span>
                {Object.values(studentMarks).filter(mark => mark && mark.marksObtained && mark.marksObtained.toString().trim() !== '').length > 0 && (
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    ({Math.round((Object.values(studentMarks).filter(mark => mark && mark.marksObtained && mark.marksObtained.toString().trim() !== '').length / modalStudents.length) * 100)}% complete)
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowMarksModal(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitMarks}
                  disabled={!newExamDetails.examType.trim() || newExamDetails.maxMarks <= 0 || Object.values(studentMarks).filter(mark => mark && mark.marksObtained && mark.marksObtained.toString().trim() !== '').length === 0}
                  style={{
                    backgroundColor: (newExamDetails.examType.trim() && newExamDetails.maxMarks > 0 && Object.values(studentMarks).filter(mark => mark && mark.marksObtained && mark.marksObtained.toString().trim() !== '').length > 0) ? '#28a745' : '#cccccc',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: (newExamDetails.examType.trim() && newExamDetails.maxMarks > 0 && Object.values(studentMarks).filter(mark => mark && mark.marksObtained && mark.marksObtained.toString().trim() !== '').length > 0) ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  💾 Save All Marks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksManagement;
