import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const SyllabusManagement = () => {
  const [syllabusData, setSyllabusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSyllabusData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getSyllabus();
        console.log('Syllabus API response:', response);
        
        // The syllabus API returns { syllabus: [...], pagination: {...} }
        if (response.syllabus) {
          setSyllabusData(response.syllabus);
        } else {
          setError('Failed to load syllabus data');
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

  const handleCompletionToggle = async (syllabusId) => {
    try {
      const currentUnit = syllabusData.find(unit => unit.syllabusId === syllabusId);
      const newStatus = currentUnit.completionStatus === 'completed' ? 'in_progress' : 'completed';
      const newPercentage = newStatus === 'completed' ? 100 : 60;

      // Update local state immediately for better UX
      setSyllabusData(prev => prev.map(unit => unit.syllabusId === syllabusId ? {
        ...unit,
        completionStatus: newStatus,
        completionPercentage: newPercentage
      } : unit));

      // In a real implementation, you'd call the update API
      console.log(`Updating syllabus ${syllabusId} to ${newStatus}`);
      // const response = await apiService.put(`/api/syllabus/${syllabusId}`, { 
      //   completionStatus: newStatus, 
      //   completionPercentage: newPercentage 
      // });
      
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
      {syllabusData.length === 0 ? (
        <p>No syllabus data found.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Completion %</th>
              <th>Current Topic</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {syllabusData.map(unit => (
              <tr key={unit.syllabusId}>
                <td>{unit.subject?.subjectName || 'N/A'}</td>
                <td>{unit.unitName}</td>
                <td style={{ color: getStatusColor(unit.completionStatus) }}>
                  {unit.completionStatus.replace('_', ' ').toUpperCase()}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '100px',
                      height: '8px',
                      backgroundColor: '#eee',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${unit.completionPercentage}%`,
                        height: '100%',
                        backgroundColor: getStatusColor(unit.completionStatus),
                        borderRadius: '4px'
                      }}></div>
                    </div>
                    <span>{unit.completionPercentage}%</span>
                  </div>
                </td>
                <td>{unit.currentTopic || 'N/A'}</td>
                <td>
                  <button 
                    onClick={() => handleCompletionToggle(unit.syllabusId)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: '#f39c12',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Toggle Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SyllabusManagement;
