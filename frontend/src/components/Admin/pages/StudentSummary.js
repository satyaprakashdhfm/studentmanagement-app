import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';

const StudentSummary = () => {
  const navigate = useNavigate();
  const { selectedAcademicYear, classes } = useAcademicYear();
  const [summaryData, setSummaryData] = useState({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    gradeDistribution: [],
    recentEnrollments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        
        // Fetch all students
        const studentsResponse = await apiService.getStudents();
        
        if (studentsResponse.success) {
          const allStudents = studentsResponse.data;
          
          // Filter students by current academic year classes
          const currentYearClassIds = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .map(cls => cls.classId);
          
          const currentYearStudents = allStudents.filter(student => 
            currentYearClassIds.includes(student.classId)
          );

          // Calculate summary statistics
          const totalStudents = currentYearStudents.length;
          const activeStudents = currentYearStudents.filter(s => s.status === 'active').length;
          const inactiveStudents = totalStudents - activeStudents;

          // Grade distribution
          const gradeDistribution = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .reduce((acc, cls) => {
              const studentsInClass = currentYearStudents.filter(s => s.classId === cls.classId).length;
              const existing = acc.find(item => item.grade === cls.className);
              
              if (existing) {
                existing.count += studentsInClass;
                existing.sections.push({
                  section: cls.section,
                  count: studentsInClass,
                  maxStudents: cls.maxStudents || 40
                });
              } else {
                acc.push({
                  grade: cls.className,
                  count: studentsInClass,
                  sections: [{
                    section: cls.section,
                    count: studentsInClass,
                    maxStudents: cls.maxStudents || 40
                  }]
                });
              }
              return acc;
            }, []);

          // Recent enrollments (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentEnrollments = currentYearStudents.filter(student => 
            new Date(student.admissionDate) >= thirtyDaysAgo
          ).length;

          setSummaryData({
            totalStudents,
            activeStudents,
            inactiveStudents,
            gradeDistribution,
            recentEnrollments
          });
        }
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (classes.length > 0) {
      fetchSummaryData();
    }
  }, [selectedAcademicYear, classes]);

  const handleGradeClick = (grade) => {
    navigate(`/admin/students/grade/${grade}`);
  };

  if (loading) {
    return (
      <div className="content-area">
        <div className="loading-container">
          <p>Loading student summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <h2>Student Management Overview</h2>
        <p>Academic Year: {selectedAcademicYear}</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>{summaryData.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>

        <div className="summary-card active">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>{summaryData.activeStudents}</h3>
            <p>Active Students</p>
          </div>
        </div>

        <div className="summary-card inactive">
          <div className="card-icon">⏸️</div>
          <div className="card-content">
            <h3>{summaryData.inactiveStudents}</h3>
            <p>Inactive Students</p>
          </div>
        </div>

        <div className="summary-card recent">
          <div className="card-icon">🆕</div>
          <div className="card-content">
            <h3>{summaryData.recentEnrollments}</h3>
            <p>New Enrollments (30 days)</p>
          </div>
        </div>
      </div>

      <div className="grade-distribution">
        <h3>Students by Grade</h3>
        <div className="grade-cards">
          {summaryData.gradeDistribution.map(gradeData => (
            <div 
              key={gradeData.grade} 
              className="grade-card clickable"
              onClick={() => handleGradeClick(gradeData.grade)}
            >
              <div className="grade-header">
                <h4>Grade {gradeData.grade}</h4>
                <span className="grade-total">{gradeData.count} students</span>
              </div>
              <div className="sections-list">
                {gradeData.sections.map(section => (
                  <div key={section.section} className="section-info">
                    <span className="section-name">Section {section.section}</span>
                    <span className="section-count">
                      {section.count}/{section.maxStudents}
                    </span>
                    <div className="capacity-bar">
                      <div 
                        className="capacity-fill"
                        style={{ 
                          width: `${(section.count / section.maxStudents) * 100}%`,
                          backgroundColor: section.count / section.maxStudents > 0.9 ? '#e74c3c' : 
                                         section.count / section.maxStudents > 0.7 ? '#f39c12' : '#27ae60'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .content-area {
          padding: 20px;
          background: #f8f9fa;
          min-height: calc(100vh - 60px);
        }
        
        .content-header {
          margin-bottom: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }
        
        .content-header h2 {
          margin: 0 0 8px 0;
          font-size: 2.2em;
          font-weight: 600;
        }
        
        .content-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1em;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin-bottom: 40px;
        }
        
        .summary-card {
          background: linear-gradient(145deg, #ffffff, #f0f0f0);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s ease;
          border: 1px solid #e8e8e8;
          position: relative;
          overflow: hidden;
        }
        
        .summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .summary-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }
        
        .card-icon {
          font-size: 2.5em;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .summary-card.active .card-icon {
          background: linear-gradient(135deg, #56c596, #3dd5f3);
          box-shadow: 0 8px 20px rgba(86, 197, 150, 0.3);
        }
        
        .summary-card.inactive .card-icon {
          background: linear-gradient(135deg, #ffa726, #ff7043);
          box-shadow: 0 8px 20px rgba(255, 167, 38, 0.3);
        }
        
        .summary-card.recent .card-icon {
          background: linear-gradient(135deg, #ab47bc, #8e24aa);
          box-shadow: 0 8px 20px rgba(171, 71, 188, 0.3);
        }
        
        .card-content h3 {
          margin: 0 0 8px 0;
          font-size: 2em;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .card-content p {
          margin: 0;
          color: #6c757d;
          font-size: 1em;
          font-weight: 500;
        }
        
        .grade-distribution h3 {
          margin-bottom: 20px;
          color: #2c3e50;
        }
        
        .grade-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .grade-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        
        .grade-card.clickable {
          cursor: pointer;
        }
        
        .grade-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .grade-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ecf0f1;
        }
        
        .grade-header h4 {
          margin: 0;
          color: #2c3e50;
        }
        
        .grade-total {
          color: #3498db;
          font-weight: bold;
        }
        
        .sections-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .section-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .section-name {
          flex: 1;
          font-size: 0.9em;
          color: #7f8c8d;
        }
        
        .section-count {
          font-size: 0.8em;
          color: #2c3e50;
          min-width: 60px;
        }
        
        .capacity-bar {
          flex: 2;
          height: 6px;
          background: #ecf0f1;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .capacity-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }
      `}</style>
    </div>
  );
};

export default StudentSummary;
