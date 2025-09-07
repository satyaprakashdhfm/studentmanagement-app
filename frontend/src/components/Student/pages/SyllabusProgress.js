import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const SyllabusProgress = () => {
  const [syllabus, setSyllabus] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSyllabusProgress = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.student) {
          setError('Student data not found');
          return;
        }

        const classId = currentUser.student.classId;
        
        // Fetch syllabus and subjects
        const [syllabusResponse, subjectsResponse] = await Promise.all([
          apiService.getSyllabus({ classId }),
          apiService.getSubjects()
        ]);

        if (syllabusResponse.syllabus) {
          setSyllabus(syllabusResponse.syllabus);
        }
        
        if (subjectsResponse.subjects) {
          setSubjects(subjectsResponse.subjects);
        }

      } catch (error) {
        console.error('Error fetching syllabus data:', error);
        setError('Failed to load syllabus progress');
      } finally {
        setLoading(false);
      }
    };

    fetchSyllabusProgress();
  }, []);

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading syllabus progress...
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
  
  // Group syllabus by subject
  const syllabusGrouped = syllabus.reduce((acc, syl) => {
    const subject = subjects.find(s => s.subjectId === syl.subjectId);
    const subjectName = subject?.subjectName || 'Unknown Subject';
    
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(syl);
    return acc;
  }, {});

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#27ae60';
      case 'in_progress': return '#f39c12';
      case 'not_started': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  return (
    <div className="content-card">
      <h2>Syllabus Progress</h2>
      
      {/* Overall Progress Summary */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Overall Progress Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {Object.keys(syllabusGrouped).map(subjectName => {
            const subjectUnits = syllabusGrouped[subjectName];
            const totalUnits = subjectUnits.length;
            const completedUnits = subjectUnits.filter(unit => unit.completion_status === 'completed').length;
            const inProgressUnits = subjectUnits.filter(unit => unit.completion_status === 'in_progress').length;
            const overallPercentage = totalUnits > 0 ? 
              Math.round(subjectUnits.reduce((sum, unit) => sum + unit.completionPercentage, 0) / totalUnits) : 0;

            return (
              <div 
                key={subjectName}
                style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
                  {subjectName}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db', marginBottom: '10px' }}>
                  {overallPercentage}%
                </div>
                <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>
                  {completedUnits} completed, {inProgressUnits} in progress
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  Total units: {totalUnits}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject-wise Detailed Progress */}
      <div>
        <h3 style={{ marginBottom: '15px' }}>Subject-wise Progress</h3>
        {Object.keys(syllabusGrouped).map(subjectName => (
          <div key={subjectName} style={{ marginBottom: '30px' }}>
            <h4 style={{ 
              color: '#2c3e50', 
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: '#ecf0f1',
              borderRadius: '5px'
            }}>
              📚 {subjectName}
            </h4>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              {syllabusGrouped[subjectName].map(unit => (
                <div 
                  key={unit.syllabusId}
                  style={{
                    padding: '20px',
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h5 style={{ color: '#2c3e50', marginBottom: '5px' }}>
                        {unit.unit_name}
                      </h5>
                      <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                        Current Topic: <strong>{unit.currentTopic}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: getStatusColor(unit.completion_status) + '20',
                        color: getStatusColor(unit.completion_status)
                      }}>
                        {getStatusText(unit.completion_status)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '14px', color: '#555' }}>Progress</span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c3e50' }}>
                        {unit.completion_percentage}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#ecf0f1',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${unit.completion_percentage}%`,
                        height: '100%',
                        backgroundColor: getStatusColor(unit.completion_status),
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    Last updated: {unit.last_updated}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Topics */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>📅 Upcoming Topics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {syllabus
            .filter(unit => unit.completion_status === 'in_progress')
            .map(unit => {
              const subject = subjects.find(s => s.subject_id === unit.subject_id);
              return (
                <div key={unit.syllabus_id} style={{
                  padding: '15px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #bee5eb'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
                    {subject?.subject_name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#555' }}>
                    {unit.unit_name} - {unit.current_topic}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default SyllabusProgress;
