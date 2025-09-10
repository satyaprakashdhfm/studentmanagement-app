import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';

const AttendanceSummary = () => {
  const navigate = useNavigate();
  const { selectedAcademicYear, classes } = useAcademicYear();
  const [summaryData, setSummaryData] = useState({
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    gradeDistribution: [],
    recentRecords: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);

        // Fetch all attendance records
        const attendanceResponse = await apiService.getAttendance();

        if (attendanceResponse.attendance) {
          const allRecords = attendanceResponse.attendance;

          // Filter records by current academic year classes
          const currentYearClassIds = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .map(cls => cls.classId);

          const currentYearRecords = allRecords.filter(record =>
            currentYearClassIds.includes(record.classId)
          );

          // Calculate summary statistics
          const totalRecords = currentYearRecords.length;
          const presentCount = currentYearRecords.filter(r => r.status === 'present').length;
          const absentCount = totalRecords - presentCount;

          // Grade distribution
          const gradeDistribution = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .reduce((acc, cls) => {
              const recordsInClass = currentYearRecords.filter(r => r.classId === cls.classId).length;
              const existing = acc.find(item => item.grade === cls.className);

              if (existing) {
                existing.count += recordsInClass;
                existing.sections.push({
                  section: cls.section,
                  count: recordsInClass,
                  maxStudents: cls.maxStudents || 40
                });
              } else {
                acc.push({
                  grade: cls.className,
                  count: recordsInClass,
                  sections: [{
                    section: cls.section,
                    count: recordsInClass,
                    maxStudents: cls.maxStudents || 40
                  }]
                });
              }
              return acc;
            }, []);

          // Recent records (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentRecords = currentYearRecords.filter(record =>
            new Date(record.date) >= sevenDaysAgo
          ).length;

          setSummaryData({
            totalRecords,
            presentCount,
            absentCount,
            gradeDistribution,
            recentRecords
          });
        }
      } catch (error) {
        console.error('Error fetching attendance summary:', error);
      } finally {
        setLoading(false);
      }
    };

    if (classes.length > 0) {
      fetchSummaryData();
    }
  }, [selectedAcademicYear, classes]);

  const handleGradeClick = (grade) => {
    navigate(`/admin/attendance/grade/${grade}`);
  };

  if (loading) {
    return (
      <div className="content-area">
        <div className="loading-container">
          <p>Loading attendance summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <h2>Attendance Management Overview</h2>
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

        <div className="summary-card present">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>{summaryData.presentCount}</h3>
            <p>Present</p>
          </div>
        </div>

        <div className="summary-card absent">
          <div className="card-icon">❌</div>
          <div className="card-content">
            <h3>{summaryData.absentCount}</h3>
            <p>Absent</p>
          </div>
        </div>

        <div className="summary-card recent">
          <div className="card-icon">🆕</div>
          <div className="card-content">
            <h3>{summaryData.recentRecords}</h3>
            <p>Recent Records (7 days)</p>
          </div>
        </div>
      </div>

      <div className="grade-distribution">
        <h3>Attendance by Grade</h3>
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
              <div className="sections-list">
                {gradeData.sections.map(section => (
                  <div key={section.section} className="section-info">
                    <span className="section-name">Section {section.section}</span>
                    <span className="section-count">
                      {section.count} records
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

        .summary-card.present {
          border-left: 4px solid #27ae60;
        }

        .summary-card.absent {
          border-left: 4px solid #e74c3c;
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

export default AttendanceSummary;
