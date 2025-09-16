import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const SyllabusProgress = () => {
  const [syllabusData, setSyllabusData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState(new Set()); // Track which subjects are expanded

  useEffect(() => {
    const fetchSyllabusProgress = async () => {
      try {
        setLoading(true);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.student) {
          setError('Student data not found');
          return;
        }

        // Fetch syllabus for student's class and grade subjects (backend handles filtering)
        const response = await apiService.getSyllabus({ classId: currentUser.student.classId });
        
        if (response.syllabus) {
          // Group syllabus by subject (since student is in one class)
          const groupedSyllabus = response.syllabus.reduce((acc, item) => {
            const subjectCode = item.subjectCode;
            
            if (!acc[subjectCode]) {
              acc[subjectCode] = {
                subjectName: item.subject?.subjectName || subjectCode,
                subjectCode: subjectCode,
                units: []
              };
            }
            
            acc[subjectCode].units.push(item);
            
            return acc;
          }, {});
          
          // Sort units within each subject by unit name
          Object.values(groupedSyllabus).forEach(subjectData => {
            subjectData.units.sort((a, b) => {
              // Extract numbers from unit names like "Unit 1", "Unit 2", etc.
              const aMatch = a.unitName.match(/(\d+)/);
              const bMatch = b.unitName.match(/(\d+)/);
              const aNum = aMatch ? parseInt(aMatch[1]) : 0;
              const bNum = bMatch ? parseInt(bMatch[1]) : 0;
              return aNum - bNum;
            });
          });
          
          setSyllabusData(groupedSyllabus);
        }
        
      } catch (err) {
        console.error('Error fetching syllabus:', err);
        setError('Failed to load syllabus progress');
      } finally {
        setLoading(false);
      }
    };

    fetchSyllabusProgress();
  }, []);

  const toggleSubjectExpansion = (subjectCode) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectCode)) {
        newSet.delete(subjectCode);
      } else {
        newSet.add(subjectCode);
      }
      return newSet;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#27ae60';
      case 'in-progress': return '#f39c12';
      case 'not-started': return '#95a5a6';
      default: return '#7f8c8d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'not-started': return 'Not Started';
      default: return 'Unknown';
    }
  };

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

  return (
    <div className="content-card">
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          .progress-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          
          .progress-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          .subject-header {
            transition: background-color 0.2s ease;
          }
          
          .subject-header:hover {
            background-color: #d5dbdb !important;
          }
        `}
      </style>
      
      <h2 style={{ marginBottom: '30px', color: '#2c3e50' }}>📚 Syllabus Progress</h2>
      
      {/* Overall Progress Summary */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Overall Progress Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {Object.values(syllabusData).map(subjectData => {
            const totalUnits = subjectData.units.length;
            const completedUnits = subjectData.units.filter(unit => unit.completionStatus === 'completed').length;
            const inProgressUnits = subjectData.units.filter(unit => unit.completionStatus === 'in-progress').length;
            const overallPercentage = totalUnits > 0 ? 
              Math.round(subjectData.units.reduce((sum, unit) => sum + unit.completionPercentage, 0) / totalUnits) : 0;

            return (
              <div 
                key={subjectData.subjectCode}
                className="progress-card"
                style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e1e8ed',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
                  {subjectData.subjectName}
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
        {Object.values(syllabusData).map(subjectData => (
          <div key={subjectData.subjectCode} style={{ marginBottom: '20px' }}>
            <div 
              className="subject-header"
              style={{ 
                padding: '15px',
                backgroundColor: '#ecf0f1',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: expandedSubjects.has(subjectData.subjectCode) ? '15px' : '0'
              }}
              onClick={() => toggleSubjectExpansion(subjectData.subjectCode)}
            >
              <h4 style={{ color: '#2c3e50', margin: 0 }}>
                📚 {subjectData.subjectName}
              </h4>
              <span style={{ fontSize: '18px' }}>
                {expandedSubjects.has(subjectData.subjectCode) ? '▼' : '▶'}
              </span>
            </div>
            
            {expandedSubjects.has(subjectData.subjectCode) && (
              <div style={{ marginTop: '15px', display: 'grid', gap: '15px' }}>
                {subjectData.units.map(unit => (
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
                      <div style={{ flex: 1 }}>
                        <h5 style={{ color: '#2c3e50', marginBottom: '5px' }}>
                          {unit.unitName}
                        </h5>
                        {unit.completionStatus === 'in-progress' && (
                          <div style={{ fontSize: '14px', color: '#2980b9', marginBottom: '5px' }}>
                            🎯 <strong>Current Topic:</strong> {unit.currentTopic || unit.current_topic || 'Topic not specified'}
                          </div>
                        )}
                        {unit.completionStatus === 'completed' && (
                          <div style={{ fontSize: '14px', color: '#27ae60', marginBottom: '5px' }}>
                            ✅ <strong>Unit Completed</strong>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: getStatusColor(unit.completionStatus) + '20',
                          color: getStatusColor(unit.completionStatus),
                          border: `1px solid ${getStatusColor(unit.completionStatus)}40`
                        }}>
                          {getStatusText(unit.completionStatus)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px', color: '#555' }}>Progress</span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c3e50' }}>
                          {unit.completionPercentage}%
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
                          width: `${unit.completionPercentage}%`,
                          height: '100%',
                          backgroundColor: getStatusColor(unit.completionStatus),
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      Last updated: {unit.lastUpdated ? new Date(unit.lastUpdated).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SyllabusProgress;
