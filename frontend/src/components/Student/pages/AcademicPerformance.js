import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const AcademicPerformance = () => {
  const [selectedExam, setSelectedExam] = useState('');
  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [examinationTypes, setExaminationTypes] = useState([]);
  const [sortKey, setSortKey] = useState('percentage');
  const [sortOrder, setSortOrder] = useState('desc');
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

        const studentId = currentUser.student.studentId;
        
        // Fetch student marks and subjects
        const [marksResponse, subjectsResponse] = await Promise.all([
          apiService.getStudentMarks(studentId),
          apiService.getSubjects()
        ]);

        if (marksResponse.marks) {
          setMarks(marksResponse.marks);
          
          // Extract unique examination types from marks data
          const uniqueExams = [...new Set(marksResponse.marks.map(m => m.examinationType))];
          setExaminationTypes(uniqueExams);
          
          // Set default selected exam
          if (uniqueExams.length > 0 && !selectedExam) {
            setSelectedExam(uniqueExams[0]);
          }
        } else {
          // Fallback if no marks data
          setExaminationTypes(['FA1', 'FA2', 'SA1', 'SA2']);
          setSelectedExam('FA1');
        }
        
        if (subjectsResponse.subjects) {
          setSubjects(subjectsResponse.subjects);
        }

      } catch (error) {
        console.error('Error fetching academic data:', error);
        setError('Failed to load academic performance data');
        // Fallback on error
        setExaminationTypes(['FA1', 'FA2', 'SA1', 'SA2']);
        setSelectedExam('FA1');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Get marks for selected examination
  const examMarks = marks.filter(mark => mark.examinationType === selectedExam);

  // Compute a sorted copy according to sortKey/order
  const sortedExamMarks = [...examMarks].sort((a, b) => {
    const getPercentage = (m) => (m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0);
    if (sortKey === 'percentage') {
      return sortOrder === 'asc' ? getPercentage(a) - getPercentage(b) : getPercentage(b) - getPercentage(a);
    }
    if (sortKey === 'marksObtained') {
      return sortOrder === 'asc' ? a.marksObtained - b.marksObtained : b.marksObtained - a.marksObtained;
    }
    return 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const exportCSV = () => {
    if (!examMarks || examMarks.length === 0) return;
    const header = ['Subject', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade'];
    const rows = examMarks.map(m => {
      const subject = subjects.find(s => s.subjectCode === m.subjectCode);
      const percentage = m.maxMarks > 0 ? ((m.marksObtained / m.maxMarks) * 100).toFixed(1) : '0.0';
      return [subject?.subjectName || m.subjectCode, m.marksObtained, m.maxMarks, `${percentage}%`, m.grade || 'N/A'];
    });
    const csvContent = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExam || 'exam'}_marks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📊 Academic Performance</h2>
        <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
          View your marks and grades across all subjects
        </div>
      </div>
      
      {/* Examination Type Selector */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>📝 Select Examination Type:</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #dfe6e9' }}>
            {examinationTypes.map(examType => (
              <option key={examType} value={examType}>{examType}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button onClick={exportCSV} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: '#2ecc71', color: 'white', cursor: 'pointer' }}>Export CSV</button>
          </div>
        </div>
      </div>

      {/* Selected Exam Results */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          📈 {selectedExam} Examination Results
        </h3>
        {examMarks.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>📚 Subject</th>
                  <th onClick={() => toggleSort('marksObtained')} style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer' }}>Marks Obtained {sortKey === 'marksObtained' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Max Marks</th>
                  <th onClick={() => toggleSort('percentage')} style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer' }}>Percentage {sortKey === 'percentage' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {sortedExamMarks.map((mark) => {
                  const subject = subjects.find(s => s.subjectCode === mark.subjectCode);
                  const percentage = mark.maxMarks > 0 ? ((mark.marksObtained / mark.maxMarks) * 100).toFixed(1) : 0;
                  
                  return (
                    <tr key={mark.marksId} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>
                        {subject?.subjectName || mark.subjectCode}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#27ae60' }}>
                        {mark.marksObtained}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        {mark.maxMarks}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>
                        <span style={{
                          color: percentage >= 75 ? '#27ae60' : percentage >= 60 ? '#f39c12' : '#e74c3c',
                          fontSize: '14px'
                        }}>
                          {percentage}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: getGradeColor(mark.grade) + '20',
                          color: getGradeColor(mark.grade),
                          display: 'inline-block',
                          minWidth: '40px'
                        }}>
                          {mark.grade || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#7f8c8d',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📝</div>
            <div style={{ fontSize: '18px', marginBottom: '5px' }}>No Results Available</div>
            <div>No marks found for {selectedExam} examination</div>
          </div>
        )}
      </div>

      {/* Overall Performance Summary */}
      <div style={{ marginTop: '40px' }}>
        <h3 style={{ marginBottom: '20px', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          📊 Overall Performance Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {overallPerformance.map((performance) => (
            <div 
              key={performance.examType}
              style={{
                padding: '25px',
                backgroundColor: '#fff',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
                {performance.examType}
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: performance.percentage >= 75 ? '#27ae60' : performance.percentage >= 60 ? '#f39c12' : '#e74c3c',
                marginBottom: '8px' 
              }}>
                {performance.percentage}%
              </div>
              <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>
                {performance.totalMarks}/{performance.maxMarks} marks
              </div>
              <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                {performance.subjects} subject{performance.subjects !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Insights */}
      <div style={{ marginTop: '40px', padding: '30px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
        <h4 style={{ color: '#2c3e50', marginBottom: '15px', textAlign: 'center' }}>🎯 Performance Insights</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>📈</div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Track your progress</div>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>Monitor improvement over time</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>🎓</div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Subject-wise analysis</div>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>Identify strengths & weaknesses</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>📊</div>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>Grade distribution</div>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>Visual performance metrics</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicPerformance;
