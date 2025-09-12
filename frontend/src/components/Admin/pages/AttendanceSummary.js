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

        // Fetch attendance statistics from backend with academic year filter
        const statsResponse = await apiService.getAttendanceStats({ academicYear: selectedAcademicYear });
        // Also fetch some records for additional calculations if needed
        const attendanceResponse = await apiService.getAttendanceWithLimit(10000);

        if (statsResponse && attendanceResponse.attendance) {
          const allRecords = attendanceResponse.attendance;
          const stats = statsResponse;

          // Filter records by current academic year classes
          const currentYearClassIds = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .map(cls => cls.classId);

          const currentYearRecords = allRecords.filter(record =>
            currentYearClassIds.includes(record.classId)
          );

          // Use backend statistics for accurate counts
          const totalRecords = stats.statusDistribution?.reduce((sum, stat) => sum + stat.count, 0) || currentYearRecords.length;
          const presentCount = stats.statusDistribution?.find(stat => stat.status === 'present')?.count || 
                              currentYearRecords.filter(r => r.status === 'present').length;
          const absentCount = totalRecords - presentCount;

          // Use backend class-wise stats for grade distribution
          const gradeDistribution = classes
            .filter(cls => cls.academicYear === selectedAcademicYear)
            .map(cls => {
              const classStats = stats.classWiseStats?.filter(stat => stat.classId === cls.classId) || [];
              const totalInClass = classStats.reduce((sum, stat) => sum + stat.count, 0);
              const presentInClass = classStats.find(stat => stat.status === 'present')?.count || 0;
              
              return {
                grade: cls.className,
                count: totalInClass || currentYearRecords.filter(r => r.classId === cls.classId).length,
                sections: [{
                  section: cls.section,
                  count: totalInClass || currentYearRecords.filter(r => r.classId === cls.classId).length,
                  maxStudents: cls.maxStudents || 40
                }]
              };
            });

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
      `}</style>
    </div>
  );
};

export default AttendanceSummary;
