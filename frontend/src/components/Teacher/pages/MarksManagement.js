import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const MarksManagement = () => {
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

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Get current teacher from localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const teacher = currentUser.teacher;
        
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
        
        if (teacherClasses.length > 0 && !selectedClass) {
          setSelectedClass(teacherClasses[0].classId);
        }

        // Fetch examination types from the database
        const examTypesResponse = await apiService.request('/marks/stats/overview');
        // Extract unique examination types from the stats or use a separate endpoint
        // For now, let's get examination types from marks data
        const marksResponse = await apiService.request('/marks?limit=1');
        if (marksResponse.marks && marksResponse.marks.length > 0) {
          // Get all unique examination types
          const allMarksResponse = await apiService.request('/marks?limit=1000');
          const uniqueExams = [...new Set(allMarksResponse.marks.map(m => m.examinationType))];
          setExaminationTypes(uniqueExams);
          
          if (uniqueExams.length > 0 && !selectedExam) {
            setSelectedExam(uniqueExams[0]);
          }
        } else {
          // Fallback to default types if no data
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

    fetchInitialData();
  }, []);

  // Fetch subjects and marks when class changes
  useEffect(() => {
    if (!selectedClass) return;

    const fetchClassData = async () => {
      try {
        setLoading(true);
        
        // Get current teacher
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const teacher = currentUser.teacher;
        
        if (!teacher) {
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
        
        // Get current teacher
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const teacher = currentUser.teacher;
        
        // Fetch marks for the selected class, subject, exam, and teacher
        const marksResponse = await apiService.request(
          `/marks?classId=${selectedClass}&subjectCode=${selectedSubject}&examinationType=${selectedExam}&teacherId=${teacher.teacherId}`
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
      <h2>Marks Management</h2>
      
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
    </div>
  );
};

export default MarksManagement;
