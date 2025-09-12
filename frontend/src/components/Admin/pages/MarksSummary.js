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
    recentRecords: 0,
    examTypeDistribution: [],
    topPerformingClasses: [],
    lowPerformingStudents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);

        // Fetch marks statistics from backend with academic year filter
        const statsResponse = await apiService.getMarksStats({ academicYear: selectedAcademicYear });
        // Also fetch all marks records for additional calculations
        const marksResponse = await apiService.getMarks();

        if (statsResponse && marksResponse.marks) {
          const allRecords = marksResponse.marks;
          const stats = statsResponse;

          // Filter records by current academic year classes
          const currentYearClassIds = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .map(cls => cls.classId);

          const currentYearRecords = allRecords.filter(record =>
            currentYearClassIds.includes(record.classId)
          );

          // Use backend statistics for accurate counts (now filtered by academic year)
          const totalRecords = stats.overall?.totalRecords || currentYearRecords.length;
          const averageScore = stats.overall?.averagePercentage || 0;

          // Get unique subjects from current year records
          const subjectCount = new Set(currentYearRecords.map(record => record.subjectCode)).size;

          // Use backend grade distribution (now filtered by academic year)
          const gradeDistribution = stats.gradeDistribution?.map(gradeStat => {
            // Find class information for this grade
            const classInfo = classes.find(cls => cls.className === gradeStat.grade && cls.academicYear === selectedAcademicYear);
            const recordsInClass = currentYearRecords.filter(r => r.grade === gradeStat.grade).length;

            // Calculate actual average for this grade from current year records
            const gradeRecords = currentYearRecords.filter(r => r.grade === gradeStat.grade);
            const gradeAverage = gradeRecords.length > 0
              ? Math.round(gradeRecords.reduce((sum, r) => sum + ((r.marksObtained || 0) / (r.maxMarks || 1) * 100), 0) / gradeRecords.length)
              : 0;

            return {
              grade: gradeStat.grade,
              count: gradeStat.count,
              averageMarks: gradeAverage,
              sections: classInfo ? [{
                section: classInfo.section,
                count: recordsInClass,
                averageMarks: gradeAverage,
                maxStudents: classInfo.maxStudents
              }] : []
            };
          }) || [];          // Recent records (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentRecords = currentYearRecords.filter(record =>
            new Date(record.entryDate) >= thirtyDaysAgo
          ).length;

          // Use backend exam type distribution (now filtered by academic year)
          const examTypeDistribution = stats.examTypePerformance?.map(examStat => ({
            type: examStat.examinationType,
            count: examStat.totalRecords,
            averageMarks: examStat.averagePercentage
          })) || [];

          // Top performing classes (by grade-specific average marks)
          const topPerformingClasses = gradeDistribution
            .sort((a, b) => b.averageMarks - a.averageMarks)
            .slice(0, 3);

          // Students with marks below 40% (failing) - calculate from current year records
          const lowPerformingStudents = currentYearRecords.filter(record => {
            const percentage = record.maxMarks > 0 ? (record.marksObtained / record.maxMarks) * 100 : 0;
            return percentage < 40;
          }).length;

          setSummaryData({
            totalRecords,
            averageScore,
            gradeDistribution,
            subjectCount,
            recentRecords,
            examTypeDistribution: examTypeDistribution.map(item => ({
              type: item.examinationType || item.type,
              count: item.totalRecords || item.count,
              averageMarks: item.averagePercentage || item.averageMarks
            })),
            topPerformingClasses,
            lowPerformingStudents
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

        <div className="summary-card failing">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <h3>{summaryData.lowPerformingStudents}</h3>
            <p>Below 40% (Need Attention)</p>
          </div>
        </div>
      </div>

      <div className="exam-type-section">
        <h3>Performance by Exam Type</h3>
        <div className="exam-type-cards">
          {summaryData.examTypeDistribution.map(examData => (
            <div key={examData.type} className="exam-type-card">
              <div className="exam-type-header">
                <h4>{examData.type}</h4>
                <span className="exam-count">{examData.count} records</span>
              </div>
              <div className="exam-average">
                <span className="average-value">{examData.averageMarks}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="top-performers-section">
        <h3>Top Performing Classes</h3>
        <div className="top-performers-cards">
          {summaryData.topPerformingClasses.map((classData, index) => (
            <div key={classData.grade} className="top-performer-card">
              <div className="rank-badge">{index + 1}</div>
              <div className="class-info">
                <h4>Grade {classData.grade}</h4>
                <p>{classData.count} records</p>
                <div className="performance-score">{classData.averageMarks}%</div>
              </div>
            </div>
          ))}
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
                    <div className="capacity-bar">
                      <div
                        className="capacity-fill"
                        style={{
                          width: `${Math.min((section.count / (section.maxStudents || 40)) * 100, 100)}%`,
                          backgroundColor: (section.count / (section.maxStudents || 40)) > 0.9 ? '#e74c3c' :
                                         (section.count / (section.maxStudents || 40)) > 0.7 ? '#f39c12' : '#27ae60'
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

        .summary-card.failing {
          border-left: 4px solid #e74c3c;
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
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px 20px 12px;
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

        .capacity-bar {
          position: absolute;
          bottom: 8px;
          left: 12px;
          right: 12px;
          height: 4px;
          background: #ecf0f1;
          border-radius: 2px;
          overflow: hidden;
        }

        .capacity-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }

        .exam-type-section,
        .top-performers-section {
          margin-bottom: 40px;
        }

        .exam-type-section h3,
        .top-performers-section h3 {
          margin-bottom: 20px;
          color: #2c3e50;
          font-size: 1.5rem;
        }

        .exam-type-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .exam-type-card {
          background: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .exam-type-header {
          margin-bottom: 10px;
        }

        .exam-type-header h4 {
          margin: 0 0 5px 0;
          color: #2c3e50;
          font-size: 1rem;
        }

        .exam-count {
          background: #ecf0f1;
          color: #2c3e50;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .exam-average .average-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #27ae60;
        }

        .top-performers-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }

        .top-performer-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 15px;
          position: relative;
          overflow: hidden;
        }

        .top-performer-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #f39c12, #e67e22);
        }

        .rank-badge {
          background: linear-gradient(135deg, #f39c12, #e67e22);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .class-info h4 {
          margin: 0 0 5px 0;
          color: #2c3e50;
          font-size: 1.1rem;
        }

        .class-info p {
          margin: 0 0 10px 0;
          color: #7f8c8d;
          font-size: 0.9rem;
        }

        .performance-score {
          font-size: 1.3rem;
          font-weight: bold;
          color: #27ae60;
        }
      `}</style>
    </div>
  );
};

export default MarksSummary;
