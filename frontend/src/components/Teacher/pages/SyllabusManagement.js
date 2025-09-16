import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const SyllabusManagement = () => {
  const [syllabusData, setSyllabusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClasses, setExpandedClasses] = useState(new Set()); // Track which classes are expanded

  useEffect(() => {
    const fetchSyllabusData = async () => {
      try {
        setLoading(true);
        
        // Get current teacher from localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const teacher = currentUser.teacher;
        
        if (!teacher) {
          setError('Teacher information not found. Please login again.');
          return;
        }
        
        // Fetch all syllabus for teacher's assigned classes and subjects (backend handles authorization)
        const response = await apiService.request('/syllabus?all=true');
        if (response.syllabus) {
          // Group syllabus by subject, then by class within each subject
          const groupedSyllabus = response.syllabus.reduce((acc, item) => {
            const subjectCode = item.subjectCode;
            const classId = item.classId;
            
            if (!acc[subjectCode]) {
              acc[subjectCode] = {
                subjectName: item.subject?.subjectName || subjectCode,
                subjectCode: subjectCode,
                classes: {}
              };
            }
            
            if (!acc[subjectCode].classes[classId]) {
              acc[subjectCode].classes[classId] = {
                className: item.class?.className || `Class ${classId}`,
                section: item.class?.section || '',
                academicYear: item.class?.academicYear || '',
                units: []
              };
            }
            
            acc[subjectCode].classes[classId].units.push(item);
            
            return acc;
          }, {});
          
          // Sort units within each class by unit number
          Object.values(groupedSyllabus).forEach(subjectData => {
            Object.values(subjectData.classes).forEach(classData => {
              classData.units.sort((a, b) => {
                // Extract numbers from unit names like "Unit 1", "Unit 2", etc.
                const aMatch = a.unitName.match(/(\d+)/);
                const bMatch = b.unitName.match(/(\d+)/);
                const aNum = aMatch ? parseInt(aMatch[1]) : 0;
                const bNum = bMatch ? parseInt(bMatch[1]) : 0;
                return aNum - bNum;
              });
            });
          });
          
          console.log('Grouped syllabus by subject:', groupedSyllabus);
          setSyllabusData(groupedSyllabus);
        }
        
      } catch (err) {
        console.error('Error fetching syllabus:', err);
        setError('Failed to load syllabus data');
      } finally {
        setLoading(false);
      }
    };

    fetchSyllabusData();
  }, []);

  const toggleClassExpansion = (subjectCode, classId) => {
    const key = `${subjectCode}-${classId}`;
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleCompletionToggle = async (syllabusId) => {
    try {
      // Find the unit in the new grouped data structure (subject-first)
      let currentUnit = null;
      let classId = null;
      let subjectCode = null;

      for (const [sCode, subjectData] of Object.entries(syllabusData)) {
        for (const [cId, classData] of Object.entries(subjectData.classes)) {
          const unit = classData.units.find(u => u.syllabusId === syllabusId);
          if (unit) {
            currentUnit = unit;
            classId = cId;
            subjectCode = sCode;
            break;
          }
        }
        if (currentUnit) break;
      }

      if (!currentUnit) {
        alert('Unit not found');
        return;
      }

      const newStatus = currentUnit.completionStatus === 'completed' ? 'in_progress' : 'completed';
      const newPercentage = newStatus === 'completed' ? 100 : Math.max(50, currentUnit.completionPercentage);

      // Update local state immediately for better UX
      setSyllabusData(prev => {
        const updated = { ...prev };
        if (updated[subjectCode] && updated[subjectCode].classes[classId]) {
          updated[subjectCode].classes[classId].units = updated[subjectCode].classes[classId].units.map(unit =>
            unit.syllabusId === syllabusId ? {
              ...unit,
              completionStatus: newStatus,
              completionPercentage: newPercentage
            } : unit
          );
        }
        return updated;
      });

      // Call the update API
      const response = await apiService.request(`/syllabus/${syllabusId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completionStatus: newStatus,
          completionPercentage: newPercentage
        })
      });

      if (!response) {
        throw new Error('Failed to update syllabus');
      }

    } catch (err) {
      console.error('Error updating syllabus:', err);
      alert('Failed to update syllabus');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#27ae60';
      case 'in_progress': return '#f39c12';
      default: return '#7f8c8d';
    }
  };

  const handleSubTopicToggle = async (syllabusId, subTopicName) => {
    try {
      // Call the sub-topic toggle API
      const response = await apiService.request(`/syllabus/${syllabusId}/subtopic`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subTopicName: subTopicName
        })
      });

      if (response && response.syllabus) {
        // Update local state with the new syllabus data
        setSyllabusData(prev => {
          const updated = { ...prev };
          
          // Find and update the specific unit
          Object.keys(updated).forEach(subjectCode => {
            Object.keys(updated[subjectCode].classes).forEach(classId => {
              updated[subjectCode].classes[classId].units = updated[subjectCode].classes[classId].units.map(unit =>
                unit.syllabusId === syllabusId ? {
                  ...unit,
                  completedSubTopics: response.syllabus.completedSubTopics,
                  completionPercentage: response.syllabus.completionPercentage,
                  completionStatus: response.syllabus.completionStatus
                } : unit
              );
            });
          });
          
          return updated;
        });

        console.log(`Sub-topic "${subTopicName}" ${response.newStatus === 'completed' ? 'completed' : 'marked as pending'}`);
      }

    } catch (err) {
      console.error('Error toggling sub-topic:', err);
      alert('Failed to update sub-topic. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="content-card">
        <h2>Syllabus Management</h2>
        <p>Loading syllabus data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <h2>Syllabus Management</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="content-card">
      <h2>Syllabus Management</h2>
      
      {/* Overall Summary */}
      {Object.keys(syllabusData).length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#2c3e50', color: 'white', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: 'white' }}>Overall Teaching Progress</h3>
          {(() => {
            const allUnits = Object.values(syllabusData).flatMap(subjectData => 
              Object.values(subjectData.classes).flatMap(classData => classData.units)
            );
            const totalUnits = allUnits.length;
            const completedUnits = allUnits.filter(unit => unit.completionStatus === 'completed').length;
            const inProgressUnits = allUnits.filter(unit => unit.completionStatus === 'in_progress').length;
            const notStartedUnits = allUnits.filter(unit => unit.completionStatus === 'not-started').length;
            const overallAverage = totalUnits > 0 ? allUnits.reduce((sum, unit) => sum + unit.completionPercentage, 0) / totalUnits : 0;
            
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    Total Progress: <strong>{completedUnits}/{totalUnits}</strong> units across all subjects
                  </div>
                  <div style={{ fontSize: '16px' }}>
                    <span style={{ color: '#27ae60', marginRight: '15px' }}>
                      ✓ {completedUnits} completed
                    </span>
                    <span style={{ color: '#f39c12', marginRight: '15px' }}>
                      ⟳ {inProgressUnits} in progress
                    </span>
                    <span style={{ color: '#e74c3c' }}>
                      ○ {notStartedUnits} not started
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Overall Completion Rate</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{overallAverage.toFixed(1)}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '15px',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: '7px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${overallAverage}%`,
                    height: '100%',
                    backgroundColor: overallAverage === 100 ? '#27ae60' : overallAverage > 50 ? '#f39c12' : '#e74c3c',
                    borderRadius: '7px',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </>
            );
          })()}
        </div>
      )}
      
      {Object.keys(syllabusData).length === 0 ? (
        <p>No syllabus data found.</p>
      ) : (
        Object.entries(syllabusData).map(([subjectCode, subjectData]) => (
          <div key={subjectCode} style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ marginBottom: '20px', color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '10px' }}>
              📚 {subjectData.subjectName} ({subjectCode})
            </h3>
            
            {/* Subject Summary */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              {(() => {
                const allSubjectUnits = Object.values(subjectData.classes).flatMap(classData => classData.units);
                const totalUnits = allSubjectUnits.length;
                const completedUnits = allSubjectUnits.filter(unit => unit.completionStatus === 'completed').length;
                const inProgressUnits = allSubjectUnits.filter(unit => unit.completionStatus === 'in_progress').length;
                const notStartedUnits = allSubjectUnits.filter(unit => unit.completionStatus === 'not-started').length;
                const subjectAverage = totalUnits > 0 ? allSubjectUnits.reduce((sum, unit) => sum + unit.completionPercentage, 0) / totalUnits : 0;
                
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        Subject Progress: <strong>{completedUnits}/{totalUnits}</strong> units across {Object.keys(subjectData.classes).length} classes
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        <span style={{ color: '#27ae60', marginRight: '10px' }}>
                          ✓ {completedUnits}
                        </span>
                        <span style={{ color: '#f39c12', marginRight: '10px' }}>
                          ⟳ {inProgressUnits}
                        </span>
                        <span style={{ color: '#e74c3c' }}>
                          ○ {notStartedUnits}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Subject Completion Rate</span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{subjectAverage.toFixed(1)}%</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '10px',
                      backgroundColor: '#ecf0f1',
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${subjectAverage}%`,
                        height: '100%',
                        backgroundColor: subjectAverage === 100 ? '#27ae60' : subjectAverage > 50 ? '#f39c12' : '#e74c3c',
                        borderRadius: '5px',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* Classes within this subject */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(subjectData.classes).map(([classId, classData]) => {
                const totalUnits = classData.units.length;
                const completedUnits = classData.units.filter(unit => unit.completionStatus === 'completed').length;
                const inProgressUnits = classData.units.filter(unit => unit.completionStatus === 'in_progress').length;
                const notStartedUnits = classData.units.filter(unit => unit.completionStatus === 'not-started').length;
                const classAverage = totalUnits > 0 ? classData.units.reduce((sum, unit) => sum + unit.completionPercentage, 0) / totalUnits : 0;
                const isExpanded = expandedClasses.has(`${subjectCode}-${classId}`);
                
                return (
                  <div key={classId} style={{ 
                    border: '1px solid #e8f4f8', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ 
                        margin: 0, 
                        color: '#2c3e50', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        letterSpacing: '0.3px'
                      }}>
                        📚 {classData.className} {classData.section}
                      </h3>
                      <button 
                        onClick={() => toggleClassExpansion(subjectCode, classId)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: isExpanded ? '#e74c3c' : '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                      >
                        {isExpanded ? '🔼 Hide Details' : '🔽 View Details'}
                      </button>
                    </div>
                    
                    {/* Stats Cards */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                      gap: '10px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
                          📊 Units Progress
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
                          {completedUnits}/{totalUnits}
                        </div>
                      </div>
                      
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
                          🎯 Overall Progress
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: classAverage === 100 ? '#27ae60' : classAverage > 50 ? '#f39c12' : '#e74c3c' }}>
                          {classAverage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Indicators */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginBottom: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        backgroundColor: '#d4edda',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        border: '1px solid #c3e6cb'
                      }}>
                        <span style={{ fontSize: '12px' }}>✅</span>
                        <span style={{ color: '#155724', fontWeight: '600', fontSize: '11px' }}>
                          {completedUnits}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        backgroundColor: '#fff3cd',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        border: '1px solid #ffeaa7'
                      }}>
                        <span style={{ fontSize: '12px' }}>🔄</span>
                        <span style={{ color: '#856404', fontWeight: '600', fontSize: '11px' }}>
                          {inProgressUnits}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        backgroundColor: '#f8d7da',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        border: '1px solid #f5c6cb'
                      }}>
                        <span style={{ fontSize: '12px' }}>⭕</span>
                        <span style={{ color: '#721c24', fontWeight: '600', fontSize: '11px' }}>
                          {notStartedUnits}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '4px' 
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2c3e50' }}>
                          📈 Progress
                        </span>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 'bold',
                          color: classAverage === 100 ? '#27ae60' : classAverage > 50 ? '#f39c12' : '#e74c3c'
                        }}>
                          {classAverage.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#ecf0f1',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{
                          width: `${classAverage}%`,
                          height: '100%',
                          background: classAverage === 100 
                            ? 'linear-gradient(45deg, #27ae60, #2ecc71)' 
                            : classAverage > 50 
                            ? 'linear-gradient(45deg, #f39c12, #e67e22)' 
                            : 'linear-gradient(45deg, #e74c3c, #c0392b)',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }}></div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ 
                        marginTop: '16px', 
                        borderTop: '1px solid #e8f4f8', 
                        paddingTop: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 12px 0', 
                          color: '#2c3e50', 
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          📋 Unit Details
                        </h4>
                        
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px'
                        }}>
                          {classData.units.map(unit => {
                            const subTopics = unit.subTopics || [];
                            const completedSubTopics = unit.completedSubTopics || [];
                            const subTopicProgress = subTopics.length > 0 ? Math.round((completedSubTopics.length / subTopics.length) * 100) : 0;
                            
                            return (
                              <div key={unit.syllabusId} style={{
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                padding: '12px',
                                border: '1px solid #e9ecef',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                {/* Unit Header */}
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  marginBottom: '10px',
                                  paddingBottom: '10px',
                                  borderBottom: '1px solid #e9ecef'
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <h5 style={{ 
                                      margin: '0 0 4px 0', 
                                      fontSize: '13px', 
                                      fontWeight: 'bold', 
                                      color: '#2c3e50',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      📖 {unit.unitName}
                                    </h5>
                                    {subTopics.length > 0 && (
                                      <div style={{ 
                                        fontSize: '11px', 
                                        color: '#6c757d',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        <span>🎯</span>
                                        <span>{completedSubTopics.length}/{subTopics.length} sub-topics</span>
                                        <span style={{
                                          backgroundColor: subTopicProgress === 100 ? '#d4edda' : subTopicProgress > 0 ? '#fff3cd' : '#f8d7da',
                                          color: subTopicProgress === 100 ? '#155724' : subTopicProgress > 0 ? '#856404' : '#721c24',
                                          padding: '2px 4px',
                                          borderRadius: '8px',
                                          fontSize: '10px',
                                          fontWeight: 'bold'
                                        }}>
                                          {subTopicProgress}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                      color: getStatusColor(unit.completionStatus), 
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      textTransform: 'capitalize',
                                      padding: '3px 6px',
                                      backgroundColor: unit.completionStatus === 'completed' ? '#d4edda' : 
                                                     unit.completionStatus === 'in_progress' ? '#fff3cd' : '#f8d7da',
                                      borderRadius: '10px'
                                    }}>
                                      {unit.completionStatus === 'completed' ? '✅' : 
                                       unit.completionStatus === 'in_progress' ? '🔄' : '⭕'} {unit.completionStatus.replace(/[-_]/g, ' ')}
                                    </span>
                                    
                                    <button 
                                      onClick={() => handleCompletionToggle(unit.syllabusId)}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '10px',
                                        backgroundColor: '#3498db',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#2980b9';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = '#3498db';
                                      }}
                                    >
                                      Toggle
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Sub-topics */}
                                {subTopics.length > 0 && (
                                  <div style={{ marginTop: '10px' }}>
                                    <h6 style={{ 
                                      margin: '0 0 6px 0', 
                                      fontSize: '11px', 
                                      fontWeight: 'bold', 
                                      color: '#495057',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      📝 Sub-Topics ({subTopics.length})
                                    </h6>
                                    <div style={{ 
                                      display: 'grid', 
                                      gap: '6px'
                                    }}>
                                      {subTopics.map((subTopic, index) => {
                                        const isCompleted = completedSubTopics.includes(subTopic);
                                        const unitFullyCompleted = unit.completionStatus === 'completed' && subTopicProgress === 100;
                                        
                                        return (
                                          <div key={`${unit.syllabusId}-subtopic-${index}`} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '6px 8px',
                                            backgroundColor: isCompleted ? '#d4f6d4' : '#fff',
                                            border: `1px solid ${isCompleted ? '#c3e6cb' : '#e9ecef'}`,
                                            borderRadius: '4px',
                                            transition: 'all 0.3s ease'
                                          }}>
                                            <div style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '6px',
                                              flex: 1
                                            }}>
                                              <span style={{ 
                                                fontSize: '12px',
                                                color: isCompleted ? '#27ae60' : '#6c757d'
                                              }}>
                                                {isCompleted ? '✅' : '📄'}
                                              </span>
                                              <span style={{ 
                                                fontSize: '11px',
                                                color: isCompleted ? '#155724' : '#495057',
                                                fontWeight: isCompleted ? '600' : '400'
                                              }}>
                                                {subTopic}
                                              </span>
                                            </div>
                                            
                                            <div style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '6px'
                                            }}>
                                              <span style={{
                                                fontSize: '9px',
                                                fontWeight: 'bold',
                                                color: isCompleted ? '#27ae60' : '#e74c3c',
                                                padding: '2px 4px',
                                                backgroundColor: isCompleted ? '#d4edda' : '#f8d7da',
                                                borderRadius: '6px'
                                              }}>
                                                {isCompleted ? '100%' : '0%'}
                                              </span>
                                              
                                              {unitFullyCompleted ? (
                                                <span style={{
                                                  padding: '3px 6px',
                                                  fontSize: '9px',
                                                  backgroundColor: '#6c757d',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '8px',
                                                  cursor: 'not-allowed',
                                                  fontWeight: '500'
                                                }}>
                                                  Complete
                                                </span>
                                              ) : (
                                                <button 
                                                  onClick={() => handleSubTopicToggle(unit.syllabusId, subTopic)}
                                                  style={{
                                                    padding: '3px 6px',
                                                    fontSize: '9px',
                                                    backgroundColor: isCompleted ? '#e74c3c' : '#27ae60',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: '500',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                    transition: 'all 0.2s ease'
                                                  }}
                                                >
                                                  {isCompleted ? 'Undo' : 'Done'}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SyllabusManagement;
