import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const AcademicPerformance = () => {
  const [selectedExam, setSelectedExam] = useState('FA1');
  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.student) {
          setError('Student data not found');
          return;
        }

        const studentId = currentUser.student.id;
        
        // Fetch student marks and subjects
        const [marksResponse, subjectsResponse] = await Promise.all([
          apiService.getStudentMarks(studentId),
          apiService.getSubjects()
        ]);

        if (marksResponse.marks) {
          setMarks(marksResponse.marks);
        }
        
        if (subjectsResponse.subjects) {
          setSubjects(subjectsResponse.subjects);
        }

      } catch (error) {
        console.error('Error fetching academic data:', error);
        setError('Failed to load academic performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Get marks for selected examination
  const examMarks = marks.filter(mark => mark.examinationType === selectedExam);
  
  // Calculate overall performance
  const calculateOverallPerformance = () => {
    const allMarks = marks.reduce((acc, mark) => {
      if (!acc[mark.examinationType]) {
        acc[mark.examinationType] = [];
      }
      acc[mark.examinationType].push(mark);
      return acc;
    }, {});

    return Object.keys(allMarks).map(examType => {
      const examMarks = allMarks[examType];
      const totalMarks = examMarks.reduce((sum, mark) => sum + mark.marksObtained, 0);
      const maxMarks = examMarks.reduce((sum, mark) => sum + mark.maxMarks, 0);
      const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(1) : 0;
      
      return {
        examType,
        totalMarks,
        maxMarks,
        percentage,
        subjects: examMarks.length
      };
    });
  };

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading academic performance...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px', color: '#e74c3c' }}>
          {error}
        </div>
      </div>
    );
  }

  const overallPerformance = calculateOverallPerformance();
  const examinationTypes = ['FA1', 'FA2', 'SA1', 'SA2']; // Define available exam types

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return '#27ae60';
      case 'B+': return '#f39c12';
      case 'B': return '#e67e22';
      case 'C': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  return (
    <div className="content-card">
      <h2>Academic Performance</h2>
      
      {/* Examination Type Selector */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Select Examination:</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {examinationTypes.map(examType => (
            <button
              key={examType}
              className={`btn ${selectedExam === examType ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedExam(examType)}
              style={{
                backgroundColor: selectedExam === examType ? '#3498db' : '#ecf0f1',
                color: selectedExam === examType ? 'white' : '#2c3e50',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              {examType}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Exam Results */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>{selectedExam} Results</h3>
        {examMarks.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Marks Obtained</th>
                <th>Max Marks</th>
                <th>Percentage</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {examMarks.map((mark) => {
                const subject = subjects.find(s => s.subjectId === mark.subjectId);
                const percentage = ((mark.marksObtained / mark.maxMarks) * 100).toFixed(1);
                
                return (
                  <tr key={mark.id}>
                    <td>{subject?.subjectName || 'N/A'}</td>
                    <td>{mark.marksObtained}</td>
                    <td>{mark.maxMarks}</td>
                    <td>{percentage}%</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: getGradeColor(mark.grade) + '20',
                        color: getGradeColor(mark.grade)
                      }}>
                        {mark.grade || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            No results available for {selectedExam}
          </div>
        )}
      </div>

      {/* Overall Performance Summary */}
      <div>
        <h3 style={{ marginBottom: '15px' }}>Overall Performance Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {overallPerformance.map((performance) => (
            <div 
              key={performance.examType}
              style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #dee2e6'
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
                {performance.examType}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db', marginBottom: '5px' }}>
                {performance.percentage}%
              </div>
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                {performance.totalMarks}/{performance.maxMarks} marks
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>
                {performance.subjects} subjects
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div style={{ marginTop: '30px', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
        <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Performance Chart</h4>
        <p style={{ color: '#7f8c8d' }}>
          📊 Performance visualization chart will be implemented here
          <br />
          (Line chart showing progress across different examinations)
        </p>
      </div>
    </div>
  );
};

export default AcademicPerformance;
