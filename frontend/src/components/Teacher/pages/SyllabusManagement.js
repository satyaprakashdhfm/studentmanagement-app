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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {Object.entries(subjectData.classes).map(([classId, classData]) => {
                const totalUnits = classData.units.length;
                const completedUnits = classData.units.filter(unit => unit.completionStatus === 'completed').length;
                const inProgressUnits = classData.units.filter(unit => unit.completionStatus === 'in_progress').length;
                const notStartedUnits = classData.units.filter(unit => unit.completionStatus === 'not-started').length;
                const classAverage = totalUnits > 0 ? classData.units.reduce((sum, unit) => sum + unit.completionPercentage, 0) / totalUnits : 0;
                const isExpanded = expandedClasses.has(`${subjectCode}-${classId}`);
                
                return (
                  <div key={classId} style={{ border: '1px solid #bdc3c7', borderRadius: '6px', padding: '15px', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, color: '#34495e' }}>
                        {classData.className} {classData.section}
                      </h4>
                      <button 
                        onClick={() => toggleClassExpansion(subjectCode, classId)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: isExpanded ? '#e74c3c' : '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                    
                    <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                      <div>Units: <strong>{completedUnits}/{totalUnits}</strong></div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <span style={{ color: '#27ae60' }}>✓ {completedUnits}</span>
                        <span style={{ color: '#f39c12' }}>⟳ {inProgressUnits}</span>
                        <span style={{ color: '#e74c3c' }}>○ {notStartedUnits}</span>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Progress</span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{classAverage.toFixed(1)}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#ecf0f1',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${classAverage}%`,
                          height: '100%',
                          backgroundColor: classAverage === 100 ? '#27ae60' : classAverage > 50 ? '#f39c12' : '#e74c3c',
                          borderRadius: '4px'
                        }}></div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ marginTop: '15px', borderTop: '1px solid #ecf0f1', paddingTop: '15px' }}>
                        <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th>Unit</th>
                              <th>Status</th>
                              <th>%</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classData.units.map(unit => {
                              const subTopics = unit.subTopics || [];
                              const completedSubTopics = unit.completedSubTopics || [];
                              const subTopicProgress = subTopics.length > 0 ? Math.round((completedSubTopics.length / subTopics.length) * 100) : 0;
                              
                              return (
                                <React.Fragment key={unit.syllabusId}>
                                  <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                                    <td style={{ fontSize: '12px', fontWeight: 'bold', padding: '8px' }}>
                                      {unit.unitName}
                                      {subTopics.length > 0 && (
                                        <div style={{ fontSize: '10px', color: '#7f8c8d', marginTop: '2px' }}>
                                          {completedSubTopics.length}/{subTopics.length} sub-topics completed
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ color: getStatusColor(unit.completionStatus), fontSize: '11px', padding: '8px' }}>
                                      {unit.completionStatus.replace(/[-_]/g, ' ')}
                                    </td>
                                    <td style={{ fontSize: '11px', fontWeight: 'bold', padding: '8px' }}>{subTopicProgress}%</td>
                                    <td style={{ padding: '8px' }}>
                                      <button 
                                        onClick={() => handleCompletionToggle(unit.syllabusId)}
                                        style={{
                                          padding: '3px 8px',
                                          fontSize: '10px',
                                          backgroundColor: '#f39c12',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '3px',
                                          cursor: 'pointer',
                                          marginRight: '5px'
                                        }}
                                      >
                                        Toggle Unit
                                      </button>
                                    </td>
                                  </tr>
                                  {subTopics.length > 0 && subTopics.map((subTopic, index) => {
                                    const isCompleted = completedSubTopics.includes(subTopic);
                                    return (
                                      <tr key={`${unit.syllabusId}-subtopic-${index}`} style={{ backgroundColor: '#f8f9fa' }}>
                                        <td style={{ fontSize: '10px', paddingLeft: '20px', color: '#6c757d' }}>
                                          └ {subTopic}
                                        </td>
                                        <td style={{ 
                                          fontSize: '9px', 
                                          color: isCompleted ? '#27ae60' : '#e74c3c',
                                          fontWeight: 'bold'
                                        }}>
                                          {isCompleted ? '✓ Completed' : '○ Pending'}
                                        </td>
                                        <td style={{ fontSize: '9px', color: '#6c757d' }}>
                                          {isCompleted ? '100%' : '0%'}
                                        </td>
                                        <td>
                                          <button 
                                            onClick={() => handleSubTopicToggle(unit.syllabusId, subTopic)}
                                            style={{
                                              padding: '2px 6px',
                                              fontSize: '9px',
                                              backgroundColor: isCompleted ? '#e74c3c' : '#27ae60',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '2px',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {isCompleted ? 'Mark Pending' : 'Mark Done'}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
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
