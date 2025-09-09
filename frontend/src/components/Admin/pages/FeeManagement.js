import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';

const FeeManagement = () => {
  const { classId, grade } = useParams();
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Use the academic year context
  const { selectedAcademicYear, classes } = useAcademicYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Filter classes by selected academic year
        const filteredByYear = classes.filter(cls => cls.academicYear === selectedAcademicYear);
        
        // If classId is provided, find the matching class
        if (classId && !grade) {
          const selectedClass = filteredByYear.find(cls => cls.classId === parseInt(classId));
          if (selectedClass) {
            setSelectedClass(selectedClass);
          }
        }
        
        // If grade is provided, filter classes for that grade and academic year
        if (grade) {
          const classesForGrade = filteredByYear.filter(cls => cls.className === grade);
          setFilteredClasses(classesForGrade);
        }

        // Fetch fees
        const response = classId && !grade
          ? await apiService.getFeesByClass(classId)
          : await apiService.getFees();
            
        console.log('🏦 Fees response:', response);
        if (response.fees) {
          setFees(response.fees);
        } else {
          setError(response.message || 'Failed to fetch fees');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load fee information');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if classes are available
    if (classes.length > 0) {
      fetchData();
    }
  }, [classId, grade, classes, selectedAcademicYear]);

  // Handle clicking on a class section box
  const handleClassClick = (classId) => {
    navigate(`/admin/fees/${classId}`);
  };

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading fee information...
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

  // Group classes by grade level (8th, 9th, 10th)
  const classGroups = classes.reduce((groups, cls) => {
    const grade = cls.className; // e.g., "8th"
    if (!groups[grade]) {
      groups[grade] = [];
    }
    groups[grade].push(cls);
    return groups;
  }, {});

  // If a specific grade is selected
  if (grade && filteredClasses.length > 0) {
    return (
      <div className="content-card">
        <div className="class-management-header">
          <h2>Fee Management: Grade {grade}</h2>
          <button className="btn btn-primary" onClick={() => navigate('/admin/fees')}>
            Back to All Classes
          </button>
        </div>
        
        <div className="class-boxes">
          {filteredClasses.map(cls => (
            <div 
              key={cls.classId} 
              className="class-box"
              onClick={() => handleClassClick(cls.classId)}
            >
              <h4>{cls.className} {cls.section}</h4>
              <div className="class-info">
                <p>Academic Year: {cls.academicYear}</p>
                <p>Max Students: {cls.maxStudents}</p>
              </div>
            </div>
          ))}
        </div>
        
        <style jsx>{`
          .class-management-header {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .class-boxes {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          .class-box {
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            width: 250px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .class-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          .class-box h4 {
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #3498db;
          }
          .class-info {
            font-size: 0.9em;
            color: #7f8c8d;
          }
          .class-info p {
            margin-bottom: 5px;
          }
        `}</style>
      </div>
    );
  }

  // If no class is selected, show the class selection UI
  if (!selectedClass && !classId) {
    return (
      <div className="content-card">
        <div className="class-management-header">
          <h2>Fee Management</h2>
          <p>Select a class to manage fees</p>
        </div>
        
        {Object.keys(classGroups).map(grade => (
          <div key={grade} className="grade-section">
            <h3>Grade {grade}</h3>
            <div className="class-boxes">
              {classGroups[grade].map(cls => (
                <div 
                  key={cls.classId} 
                  className="class-box"
                  onClick={() => handleClassClick(cls.classId)}
                >
                  <h4>{cls.className} {cls.section}</h4>
                  <div className="class-info">
                    <p>Academic Year: {cls.academicYear}</p>
                    <p>Max Students: {cls.maxStudents}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <style jsx>{`
          .class-management-header {
            margin-bottom: 20px;
          }
          .grade-section {
            margin-bottom: 25px;
          }
          .grade-section h3 {
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }
          .class-boxes {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          .class-box {
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            width: 250px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .class-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          .class-box h4 {
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #3498db;
          }
          .class-info {
            font-size: 0.9em;
            color: #7f8c8d;
          }
          .class-info p {
            margin-bottom: 5px;
          }
        `}</style>
      </div>
    );
  }

  // If a class is selected, show the fee management interface for that class
  return (
    <div className="content-card">
      <div className="class-header">
        <h2>Fee Management: {selectedClass ? `${selectedClass.className} ${selectedClass.section}` : 'All Classes'}</h2>
        {selectedClass && (
          <button className="btn btn-primary" onClick={() => navigate('/admin/fees')}>
            Back to All Classes
          </button>
        )}
      </div>
      
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Class</th>
            <th>Fee Type</th>
            <th>Due</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(fee => (
            <tr key={fee.id}>
              <td>{fee.student?.name || 'N/A'}</td>
              <td>{fee.class ? `${fee.class.className} ${fee.class.section}` : 'N/A'}</td>
              <td>{fee.feeType}</td>
              <td>₹{fee.amountDue ? Number(fee.amountDue).toLocaleString() : '0'}</td>
              <td>₹{fee.amountPaid ? Number(fee.amountPaid).toLocaleString() : '0'}</td>
              <td style={{ color: fee.balance > 0 ? '#e74c3c' : '#27ae60' }}>₹{fee.balance ? Number(fee.balance).toLocaleString() : '0'}</td>
              <td>
                <button className="btn btn-warning" onClick={() => alert('Edit fee coming soon')}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .class-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default FeeManagement;
