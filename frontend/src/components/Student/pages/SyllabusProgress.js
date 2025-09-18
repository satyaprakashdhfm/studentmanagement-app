import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const SyllabusProgress = () => {
  const { user } = useAuth();
  const [syllabusData, setSyllabusData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState(new Set()); // Track which subjects are expanded

  useEffect(() => {
    const fetchSyllabusProgress = async () => {
      try {
        setLoading(true);
        
        if (!user || user.role !== 'student') {
          setError('Student session not found. Please login.');
          return;
        }

        // First get student data to find their classId
        const studentResponse = await apiService.getStudent(user.username);
        if (!studentResponse.success || !studentResponse.data.classId) {
          setError('Student class information not found.');
          return;
        }

        console.log('Fetching syllabus for class:', studentResponse.data.classId);
        // Fetch syllabus for student's class and grade subjects (backend handles filtering)
        const response = await apiService.getSyllabus({ classId: studentResponse.data.classId });
        
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

    if (user) {
      fetchSyllabusProgress();
    }
  }, [user]);

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
            transition: all 0.3s ease;
          }
          
          .progress-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.15);
          }
          
          .subject-header {
            transition: all 0.3s ease;
          }
          
          .subject-header:hover {
            background-color: #e8f6f3 !important;
            transform: translateY(-1px);
          }
          
          .unit-card {
            transition: all 0.3s ease;
          }
          
          .unit-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
        `}
      </style>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '24px',
        padding: '16px',
        background: 'linear-gradient(135deg, #a8e6cf 0%, #81c784 100%)',
        borderRadius: '12px',
        color: '#2e7d32'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          📚 My Syllabus Progress
        </h2>
      </div>
      
      {/* Overall Progress Summary */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          marginBottom: '16px', 
          color: '#4a6741',
          fontSize: '18px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Quick Overview
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          {Object.values(syllabusData).map(subjectData => {
            const totalUnits = subjectData.units.length;
            const completedUnits = subjectData.units.filter(unit => unit.completionStatus === 'completed').length;
            const inProgressUnits = subjectData.units.filter(unit => unit.completionStatus === 'in-progress').length;
            const overallPercentage = totalUnits > 0 ? 
              Math.round(subjectData.units.reduce((sum, unit) => {
                const subTopics = unit.subTopics || [];
                const completedSubTopics = unit.completedSubTopics || [];
                return sum + (subTopics.length > 0 ? 
                  Math.round((completedSubTopics.length / subTopics.length) * 100) : 
                  unit.completionPercentage);
              }, 0) / totalUnits) : 0;

            return (
              <div 
                key={subjectData.subjectCode}
                className="progress-card"
                style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '2px solid #e8f4f8',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '20px' }}>📖</span>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    color: '#4a6741'
                  }}>
                    {subjectData.subjectName}
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold', 
                  color: overallPercentage === 100 ? '#27ae60' : overallPercentage > 50 ? '#f39c12' : '#e74c3c',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}>
                  {overallPercentage}%
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px'
                  }}>
                    <span style={{ color: '#27ae60', fontSize: '14px' }}>✅</span>
                    <span style={{ fontSize: '12px', color: '#27ae60', fontWeight: '600' }}>
                      {completedUnits}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px'
                  }}>
                    <span style={{ color: '#f39c12', fontSize: '14px' }}>🔄</span>
                    <span style={{ fontSize: '12px', color: '#f39c12', fontWeight: '600' }}>
                      {inProgressUnits}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px'
                  }}>
                    <span style={{ color: '#95a5a6', fontSize: '14px' }}>⭕</span>
                    <span style={{ fontSize: '12px', color: '#95a5a6', fontWeight: '600' }}>
                      {totalUnits - completedUnits - inProgressUnits}
                    </span>
                  </div>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#ecf0f1',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${overallPercentage}%`,
                    height: '100%',
                    background: overallPercentage === 100 
                      ? 'linear-gradient(90deg, #27ae60, #2ecc71)'
                      : overallPercentage > 50 
                      ? 'linear-gradient(90deg, #f39c12, #e67e22)'
                      : 'linear-gradient(90deg, #e74c3c, #c0392b)',
                    borderRadius: '3px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                
                <div style={{ fontSize: '11px', color: '#81c784', marginTop: '8px', textAlign: 'center' }}>
                  {totalUnits} total units
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject-wise Detailed Progress */}
      <div>
        <h3 style={{ 
          marginBottom: '16px',
          color: '#4a6741',
          fontSize: '18px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📋 Detailed Progress
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.values(syllabusData).map(subjectData => (
            <div key={subjectData.subjectCode} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '2px solid #e8f4f8',
              boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
              overflow: 'hidden'
            }}>
              <div 
                className="subject-header"
                style={{ 
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #b3e5fc 0%, #81d4fa 100%)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#0277bd'
                }}
                onClick={() => toggleSubjectExpansion(subjectData.subjectCode)}
              >
                <h4 style={{ 
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📚 {subjectData.subjectName}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontSize: '12px',
                    backgroundColor: 'rgba(2,119,189,0.15)',
                    color: '#0277bd',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    {subjectData.units.length} units
                  </span>
                  <span style={{ fontSize: '16px', transition: 'transform 0.3s ease' }}>
                    {expandedSubjects.has(subjectData.subjectCode) ? '🔼' : '🔽'}
                  </span>
                </div>
              </div>
              
              {expandedSubjects.has(subjectData.subjectCode) && (
                <div style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {subjectData.units.map(unit => {
                      const subTopics = unit.subTopics || [];
                      const completedSubTopics = unit.completedSubTopics || [];
                      const subTopicProgress = subTopics.length > 0 ? 
                        Math.round((completedSubTopics.length / subTopics.length) * 100) : 
                        unit.completionPercentage;
                      
                      return (
                        <div 
                          key={unit.syllabusId}
                          className="unit-card"
                          style={{
                            padding: '16px',
                            backgroundColor: 'white',
                            border: '1px solid #e9ecef',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start', 
                            marginBottom: '12px' 
                          }}>
                            <div style={{ flex: 1 }}>
                              <h5 style={{ 
                                color: '#4a6741', 
                                marginBottom: '6px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                📖 {unit.unitName}
                              </h5>
                              
                              {subTopics.length > 0 && (
                                <div style={{ 
                                  fontSize: '11px', 
                                  color: '#81c784',
                                  marginBottom: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <span>🎯</span>
                                  <span>{completedSubTopics.length}/{subTopics.length} sub-topics completed</span>
                                </div>
                              )}
                              
                              {unit.completionStatus === 'in-progress' && (
                                <div style={{ fontSize: '12px', color: '#42a5f5', marginBottom: '6px' }}>
                                  🔄 <strong>Current Topic:</strong> {unit.currentTopic || unit.current_topic || 'In progress...'}
                                </div>
                              )}
                              
                              {unit.completionStatus === 'completed' && (
                                <div style={{ fontSize: '12px', color: '#66bb6a', marginBottom: '6px' }}>
                                  ✅ <strong>Unit Completed!</strong>
                                </div>
                              )}
                            </div>
                            
                            <div style={{ textAlign: 'right' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
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
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              marginBottom: '4px' 
                            }}>
                              <span style={{ fontSize: '12px', color: '#81c784', fontWeight: '600' }}>
                                📈 Progress
                              </span>
                              <span style={{ 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                color: subTopicProgress === 100 ? '#27ae60' : subTopicProgress > 50 ? '#f39c12' : '#e74c3c'
                              }}>
                                {subTopicProgress}%
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
                                width: `${subTopicProgress}%`,
                                height: '100%',
                                background: subTopicProgress === 100 
                                  ? 'linear-gradient(90deg, #27ae60, #2ecc71)'
                                  : subTopicProgress > 50 
                                  ? 'linear-gradient(90deg, #f39c12, #e67e22)'
                                  : 'linear-gradient(90deg, #e74c3c, #c0392b)',
                                transition: 'width 0.5s ease'
                              }}></div>
                            </div>
                          </div>
                          
                          {/* Sub-topics Display */}
                          {subTopics.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                              <h6 style={{ 
                                margin: '0 0 8px 0', 
                                fontSize: '11px', 
                                fontWeight: 'bold', 
                                color: '#66bb6a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                📝 Sub-Topics ({subTopics.length})
                              </h6>
                              <div style={{ 
                                display: 'grid', 
                                gap: '6px',
                                gridTemplateColumns: '1fr'
                              }}>
                                {subTopics.map((subTopic, index) => {
                                  const isCompleted = completedSubTopics.includes(subTopic);
                                  
                                  return (
                                    <div key={`${unit.syllabusId}-subtopic-${index}`} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '6px 10px',
                                      backgroundColor: isCompleted ? '#d4f6d4' : '#fff',
                                      border: `1px solid ${isCompleted ? '#c3e6cb' : '#e9ecef'}`,
                                      borderRadius: '6px',
                                      fontSize: '11px'
                                    }}>
                                      <span style={{ 
                                        marginRight: '8px',
                                        fontSize: '12px',
                                        color: isCompleted ? '#66bb6a' : '#90a4ae'
                                      }}>
                                        {isCompleted ? '✅' : '📄'}
                                      </span>
                                      <span style={{ 
                                        flex: 1,
                                        color: isCompleted ? '#2e7d32' : '#546e7a',
                                        fontWeight: isCompleted ? '600' : '400'
                                      }}>
                                        {subTopic}
                                      </span>
                                      <span style={{
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        color: isCompleted ? '#66bb6a' : '#ff8a65',
                                        padding: '2px 6px',
                                        backgroundColor: isCompleted ? '#e8f5e8' : '#fff3e0',
                                        borderRadius: '8px'
                                      }}>
                                        {isCompleted ? '100%' : '0%'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#90a4ae', 
                            marginTop: '8px',
                            textAlign: 'center',
                            fontStyle: 'italic'
                          }}>
                            Last updated: {unit.lastUpdated ? new Date(unit.lastUpdated).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SyllabusProgress;
