import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const MarksManagement = () => {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExam, setSelectedExam] = useState('FA1');
  
  const examinationTypes = ['FA1', 'FA2', 'SA1', 'SA2'];

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        const response = await apiService.getMarks();
        console.log('Marks API response:', response);
        
        // The marks API returns { marks: [...], pagination: {...} }
        if (response.marks) {
          setMarks(response.marks);
        } else {
          setError('Failed to load marks data');
        }
      } catch (err) {
        console.error('Error fetching marks:', err);
        setError('Failed to load marks data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, []);

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

  const examMarks = marks.filter(m => m.examinationType === selectedExam);

  return (
    <div className="content-card">
      <h2>Marks Management</h2>
      <div style={{ marginBottom: '20px' }}>
        <label>Select Examination: </label>
        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
          {examinationTypes.map(ex => <option key={ex} value={ex}>{ex}</option>)}
        </select>
      </div>

      {examMarks.length === 0 ? (
        <p>No marks found for {selectedExam} examination.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Subject</th>
              <th>Marks Obtained</th>
              <th>Max Marks</th>
              <th>Grade</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {examMarks.map(mark => (
              <tr key={mark.marksId}>
                <td>{mark.student?.name || 'N/A'}</td>
                <td>{mark.subject?.subjectName || 'N/A'}</td>
                <td>
                  <input 
                    type="number" 
                    defaultValue={mark.marksObtained} 
                    onBlur={e => handleMarkChange(mark.marksId, parseInt(e.target.value))}
                    style={{ width: '70px' }}
                    min="0"
                    max={mark.maxMarks}
                  />
                </td>
                <td>{mark.maxMarks}</td>
                <td>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: mark.grade === 'A' ? '#d5f4e6' : 
                                   mark.grade === 'B' ? '#e8f5e8' :
                                   mark.grade === 'C' ? '#fff3cd' :
                                   mark.grade === 'D' ? '#f8d7da' : '#f8d7da',
                    color: mark.grade === 'A' ? '#27ae60' : 
                           mark.grade === 'B' ? '#2e8b57' :
                           mark.grade === 'C' ? '#856404' :
                           mark.grade === 'D' ? '#721c24' : '#721c24'
                  }}>
                    {mark.grade}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn-success" 
                    onClick={() => alert('Marks saved!')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Save
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

export default MarksManagement;
