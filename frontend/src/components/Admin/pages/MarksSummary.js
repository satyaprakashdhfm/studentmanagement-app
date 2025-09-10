import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';

const MarksSummary = () => {
  const navigate = useNavigate();
  const { selectedAcademicYear, classes } = useAcademicYear();
  const [summaryData, setSummaryData] = useState({
    totalRecords: 0,
    averageScore: 0,
    gradeDistribution: [],
    subjectCount: 0,
    recentRecords: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);

        // Fetch all marks records
        const marksResponse = await apiService.getMarks();

        if (marksResponse.marks) {
          const allRecords = marksResponse.marks;

          // Filter records by current academic year classes
          const currentYearClassIds = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .map(cls => cls.classId);

          const currentYearRecords = allRecords.filter(record =>
            currentYearClassIds.includes(record.classId)
          );

          // Calculate summary statistics
          const totalRecords = currentYearRecords.length;
          const averageScore = totalRecords > 0
            ? Math.round(currentYearRecords.reduce((sum, record) => sum + (record.marks || 0), 0) / totalRecords)
            : 0;

          // Get unique subjects
          const subjectCount = new Set(currentYearRecords.map(record => record.subjectId)).size;

          // Grade distribution
          const gradeDistribution = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .reduce((acc, cls) => {
              const recordsInClass = currentYearRecords.filter(r => r.classId === cls.classId).length;
              const avgMarksInClass = recordsInClass > 0
                ? Math.round(currentYearRecords
                    .filter(r => r.classId === cls.classId)
                    .reduce((sum, r) => sum + (r.marks || 0), 0) / recordsInClass)
                : 0;

              const existing = acc.find(item => item.grade === cls.className);

              if (existing) {
                existing.count += recordsInClass;
                existing.averageMarks = Math.round((existing.averageMarks + avgMarksInClass) / 2);
                existing.sections.push({
                  section: cls.section,
                  count: recordsInClass,
                  averageMarks: avgMarksInClass
                });
              } else {
                acc.push({
                  grade: cls.className,
                  count: recordsInClass,
                  averageMarks: avgMarksInClass,
                  sections: [{
                    section: cls.section,
                    count: recordsInClass,
                    averageMarks: avgMarksInClass
                  }]
                });
              }
              return acc;
            }, []);

          // Recent records (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentRecords = currentYearRecords.filter(record =>
            new Date(record.examDate) >= thirtyDaysAgo
          ).length;

          setSummaryData({
            totalRecords,
            averageScore,
            gradeDistribution,
            subjectCount,
            recentRecords
          });
        }
      } catch (error) {
        console.error('Error fetching marks summary:', error);
      } finally {
        setLoading(false);
      }
    };

    if (classes.length > 0) {
      fetchSummaryData();
    }
  }, [selectedAcademicYear, classes]);

  const handleGradeClick = (grade) => {
    navigate(`/admin/marks/grade/${grade}`);
  };

  if (loading) {
    return (
      <div className="content-area">
        <div className="loading-container">
          <p>Loading marks summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <h2>Marks Management Overview</h2>
        <p>Academic Year: {selectedAcademicYear}</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>{summaryData.totalRecords}</h3>
            <p>Total Records</p>
          </div>
        </div>

        <div className="summary-card average">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <h3>{summaryData.averageScore}%</h3>
            <p>Average Score</p>
          </div>
        </div>

        <div className="summary-card subjects">
          <div className="card-icon">📚</div>
          <div className="card-content">
            <h3>{summaryData.subjectCount}</h3>
            <p>Subjects</p>
          </div>
        </div>

        <div className="summary-card recent">
          <div className="card-icon">🆕</div>
          <div className="card-content">
            <h3>{summaryData.recentRecords}</h3>
            <p>Recent Records (30 days)</p>
          </div>
        </div>
      </div>

      <div className="grade-distribution">
        <h3>Marks by Grade</h3>
        <div className="grade-cards">
          {summaryData.gradeDistribution.map(gradeData => (
            <div
              key={gradeData.grade}
              className="grade-card clickable"
              onClick={() => handleGradeClick(gradeData.grade)}
            >
              <div className="grade-header">
                <h4>Grade {gradeData.grade}</h4>
                <span className="grade-total">{gradeData.count} records</span>
              </div>
              <div className="grade-average">
                <span className="average-label">Average: </span>
                <span className="average-value">{gradeData.averageMarks}%</span>
              </div>
              <div className="sections-list">
                {gradeData.sections.map(section => (
                  <div key={section.section} className="section-info">
                    <span className="section-name">Section {section.section}</span>
                    <span className="section-count">
                      {section.count} records • Avg: {section.averageMarks}%
                    </span>
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
          padding: 20px;
          border-radius: 10px;
          color: white;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .summary-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .summary-card.average {
          border-left: 4px solid #27ae60;
        }

        .summary-card.subjects {
          border-left: 4px solid #f39c12;
        }

        .summary-card.recent {
          border-left: 4px solid #3498db;
        }

        .card-icon {
          font-size: 2rem;
        }

        .card-content h3 {
          margin: 0;
          font-size: 2rem;
          font-weight: bold;
          color: #2c3e50;
        }

        .card-content p {
          margin: 5px 0 0 0;
          color: #7f8c8d;
          font-weight: 500;
        }

        .grade-distribution h3 {
          margin-bottom: 20px;
          color: #2c3e50;
          font-size: 1.5rem;
        }

        .grade-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .grade-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .grade-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        .grade-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #ecf0f1;
        }

        .grade-header h4 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.2rem;
        }

        .grade-total {
          background: #3498db;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .grade-average {
          margin-bottom: 15px;
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .average-label {
          font-weight: 500;
          color: #2c3e50;
        }

        .average-value {
          font-weight: bold;
          color: #27ae60;
          font-size: 1.1rem;
        }

        .sections-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .section-name {
          font-weight: 500;
          color: #2c3e50;
        }

        .section-count {
          color: #7f8c8d;
          font-weight: 500;
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

export default MarksSummary;
