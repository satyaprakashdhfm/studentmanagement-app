import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';

const FeeSummary = () => {
  const navigate = useNavigate();
  const { selectedAcademicYear, classes } = useAcademicYear();
  const [selectedFeeType, setSelectedFeeType] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [feeTypeOptions, setFeeTypeOptions] = useState([]);
  const [summaryData, setSummaryData] = useState({
    overall: { totalDue: 0, totalPaid: 0, totalBalance: 0, collectionPercentage: 0, totalRecords: 0 },
    paymentStatus: { paid: 0, partial: 0, unpaid: 0 },
    feeTypeCollection: [],
    classWiseStats: [],
    recentPayments: { amount: 0, count: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        setError('');
        const filters = { academicYear: selectedAcademicYear };
        if (selectedFeeType !== 'all') filters.feeType = selectedFeeType;
        if (selectedClassId !== 'all') filters.classId = selectedClassId;
        const stats = await apiService.getFeeStats(filters);
        setSummaryData(stats);
        // Update fee type options based on current stats
        if (Array.isArray(stats.feeTypeCollection)) {
          const types = stats.feeTypeCollection.map(f => f.feeType).filter(Boolean);
          setFeeTypeOptions(Array.from(new Set(types)));
        }
      } catch (error) {
        console.error('Error fetching fee summary data:', error);
        setError('Failed to load fee summary');
      } finally {
        setLoading(false);
      }
    };

    if (classes.length > 0) {
      fetchSummaryData();
    }
  }, [selectedAcademicYear, classes, selectedFeeType, selectedClassId]);

  const handleClassCardClick = (classId) => {
    navigate(`/admin/fees/${classId}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Build grade-wise aggregation from classWiseStats and classes list
  const gradeAggregates = useMemo(() => {
    const classMap = new Map(classes.map(c => [c.classId, c]));
    const byGrade = new Map();
    summaryData.classWiseStats.forEach(stat => {
      const cls = classMap.get(stat.classId);
      const grade = cls?.className || 'Unknown';
      const entry = byGrade.get(grade) || { grade, totalDue: 0, totalPaid: 0, sections: [] };
      entry.totalDue += stat.totalDue;
      entry.totalPaid += stat.totalPaid;
      entry.sections.push({ section: cls?.section || '-', percentage: stat.collectionPercentage });
      byGrade.set(grade, entry);
    });
    return Array.from(byGrade.values()).map(g => ({
      ...g,
      percentage: g.totalDue > 0 ? Math.round((g.totalPaid / g.totalDue) * 100) : 0
    }));
  }, [summaryData.classWiseStats, classes]);

  if (loading) {
    return (
      <div className="content-area">
        <div className="loading-container">
          <p>Loading fee summary...</p>
        </div>
      </div>
    );
  }

  const totalFees = summaryData.overall.totalDue;
  const collectedFees = summaryData.overall.totalPaid;
  const pendingFees = summaryData.overall.totalBalance;
  const collectionPercentage = summaryData.overall.collectionPercentage;

  

  return (
    <div className="content-area">
      <div className="content-header">
        <h2>Fee Management Overview</h2>
        <p>Academic Year: {selectedAcademicYear}</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card total">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>{formatCurrency(totalFees)}</h3>
            <p>Total Fees Due</p>
          </div>
        </div>

        <div className="summary-card collected">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>{formatCurrency(collectedFees)}</h3>
            <p>Collected ({collectionPercentage}%)</p>
          </div>
        </div>

        <div className="summary-card pending">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <h3>{formatCurrency(pendingFees)}</h3>
            <p>Pending Collection</p>
          </div>
        </div>

        <div className="summary-card recent">
          <div className="card-icon">🔄</div>
          <div className="card-content">
            <h3>{formatCurrency(summaryData.recentPayments.amount)}</h3>
            <p>Recent Payments (30 days)</p>
          </div>
        </div>
      </div>

      <div className="collection-progress">
        <h3>Overall Collection Progress</h3>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${collectionPercentage}%`,
                backgroundColor: collectionPercentage > 80 ? '#27ae60' : 
                               collectionPercentage > 60 ? '#f39c12' : '#e74c3c'
              }}
            ></div>
          </div>
          <span className="progress-text">{collectionPercentage}% Collected</span>
        </div>
      </div>

      <div className="status-breakdown">
        <div className="status-pill paid">Paid: {summaryData.paymentStatus.paid}</div>
        <div className="status-pill partial">Partial: {summaryData.paymentStatus.partial}</div>
        <div className="status-pill unpaid">Unpaid: {summaryData.paymentStatus.unpaid}</div>
      </div>

      <div className="filters-bar">
        <div className="filters">
          <div className="filter-item">
            <label>Fee Type</label>
            <select value={selectedFeeType} onChange={(e) => setSelectedFeeType(e.target.value)}>
              <option value="all">All types</option>
              {feeTypeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>Class</label>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              <option value="all">All classes</option>
              {classes
                .filter(c => c.academicYear === selectedAcademicYear)
                .map(c => (
                  <option key={c.classId} value={c.classId}>
                    {c.className} - {c.section}
                  </option>
                ))}
            </select>
          </div>
          <button className="btn btn-light" onClick={() => { setSelectedFeeType('all'); setSelectedClassId('all'); }}>Reset</button>
        </div>
      </div>

  <div className="grade-distribution">
        <h3>Collection by Grade</h3>
        <div className="grade-cards">
          {gradeAggregates.map(gradeData => (
            <div 
              key={gradeData.grade} 
              className="grade-card clickable"
              onClick={() => navigate(`/admin/fees/grade/${gradeData.grade}`)}
            >
              <div className="grade-header">
                <h4>Grade {gradeData.grade}</h4>
                <span className="grade-percentage">{gradeData.percentage}%</span>
              </div>
              <div className="grade-amounts">
                <div className="amount-row">
                  <span>Total Due:</span>
                  <span>{formatCurrency(gradeData.totalDue || 0)}</span>
                </div>
                <div className="amount-row">
                  <span>Collected:</span>
                  <span className="collected">{formatCurrency(gradeData.totalPaid || 0)}</span>
                </div>
                <div className="amount-row">
                  <span>Pending:</span>
                  <span className="pending">{formatCurrency((gradeData.totalDue || 0) - (gradeData.totalPaid || 0))}</span>
                </div>
              </div>
              <div className="sections-list">
                {gradeData.sections.map(section => (
                  <div key={section.section} className="section-info">
                    <span className="section-name">Section {section.section}</span>
                    <span className="section-percentage">{section.percentage}%</span>
                    <div className="mini-progress-bar">
                      <div 
                        className="mini-progress-fill"
                        style={{ 
                          width: `${section.percentage}%`,
                          backgroundColor: section.percentage > 80 ? '#27ae60' : 
                                         section.percentage > 60 ? '#f39c12' : '#e74c3c'
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
  <div className="class-distribution">
        <h3>Collection by Class</h3>
        <div className="class-cards">
          {summaryData.classWiseStats.map(cls => (
            <div key={cls.classId} className="class-card clickable" onClick={() => handleClassCardClick(cls.classId)}>
              <div className="class-header">
                <h4>{cls.className}</h4>
                <span className="class-percentage">{cls.collectionPercentage}%</span>
              </div>
              <div className="progress-bar small">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${cls.collectionPercentage}%`,
                    backgroundColor: cls.collectionPercentage > 80 ? '#27ae60' : 
                                   cls.collectionPercentage > 60 ? '#f39c12' : '#e74c3c'
                  }}
                ></div>
              </div>
              <div className="amount-row">
                <span>Due:</span>
                <span>{formatCurrency(cls.totalDue || 0)}</span>
              </div>
              <div className="amount-row">
                <span>Paid:</span>
                <span className="collected">{formatCurrency(cls.totalPaid || 0)}</span>
              </div>
              <div className="amount-row">
                <span>Pending:</span>
                <span className="pending">{formatCurrency((cls.totalDue || 0) - (cls.totalPaid || 0))}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
  <div className="fee-type-breakdown">
        <h3>Collection by Fee Type</h3>
        <div className="fee-type-cards">
          {summaryData.feeTypeCollection.map(feeType => (
            <div key={feeType.feeType} className="fee-type-card">
              <div className="fee-type-header">
                <h4>{feeType.feeType}</h4>
                <span className="fee-percentage">{feeType.collectionPercentage}%</span>
              </div>
              <div className="fee-amounts">
                <div className="amount-row">
                  <span>Due:</span>
                  <span>{formatCurrency(feeType.totalDue || 0)}</span>
                </div>
                <div className="amount-row">
                  <span>Paid:</span>
                  <span className="collected">{formatCurrency(feeType.totalPaid || 0)}</span>
                </div>
                <div className="amount-row">
                  <span>Pending:</span>
                  <span className="pending">{formatCurrency((feeType.totalDue || 0) - (feeType.totalPaid || 0))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .content-area {
          padding: 20px;
        }
        
        .content-header {
          margin-bottom: 30px;
        }
        .filters {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .filters-bar {
          display: flex;
          justify-content: flex-end;
          margin: 10px 0 20px 0;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-item label {
          font-size: 0.8em;
          color: #7f8c8d;
        }
        .filters select {
          min-width: 160px;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fff;
        }
        
        .content-header h2 {
          margin: 0 0 5px 0;
          color: #2c3e50;
        }
        
        .content-header p {
          margin: 0;
          color: #7f8c8d;
          font-size: 0.9em;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .summary-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
          transition: transform 0.2s;
        }
        
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .card-icon {
          font-size: 2em;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #ecf0f1;
        }
        
        .summary-card.collected .card-icon {
          background: #d5f4e6;
        }
        
        .summary-card.pending .card-icon {
          background: #fce4ec;
        }
        
        .summary-card.recent .card-icon {
          background: #e3f2fd;
        }
        
        .summary-card.total .card-icon {
          background: #fff3cd;
        }
        
        .card-content h3 {
          margin: 0 0 5px 0;
          font-size: 1.5em;
          color: #2c3e50;
        }
        
        .card-content p {
          margin: 0;
          color: #7f8c8d;
          font-size: 0.9em;
        }
        
        .collection-progress {
          margin-bottom: 40px;
        }
        
        .collection-progress h3 {
          margin-bottom: 15px;
          color: #2c3e50;
        }
        
        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .progress-bar {
          flex: 1;
          height: 12px;
          background: #ecf0f1;
          border-radius: 6px;
          overflow: hidden;
        }
  .progress-bar.small { height: 8px; margin: 6px 0 10px; }
        
        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          font-weight: bold;
          color: #2c3e50;
        }

        .status-breakdown {
          display: flex;
          gap: 10px;
          margin: 10px 0 30px 0;
        }

        .status-pill {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.85em;
          background: #ecf0f1;
          color: #2c3e50;
        }
        .status-pill.paid { background: #d5f4e6; }
        .status-pill.partial { background: #fff3cd; }
        .status-pill.unpaid { background: #f8d7da; }
        
        .grade-distribution h3,
        .fee-type-breakdown h3 {
          margin-bottom: 20px;
          color: #2c3e50;
        }
        
        .grade-cards,
  .fee-type-cards,
  .class-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .grade-card,
  .fee-type-card,
  .class-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        
  .grade-card.clickable,
  .class-card.clickable {
          cursor: pointer;
        }
        
        .grade-card:hover,
  .fee-type-card:hover,
  .class-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .grade-header,
  .fee-type-header,
  .class-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ecf0f1;
        }
        
        .grade-header h4,
  .fee-type-header h4,
  .class-header h4 {
          margin: 0;
          color: #2c3e50;
        }
        
        .grade-percentage,
  .fee-percentage,
  .class-percentage {
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 4px;
          background: #3498db;
          color: white;
          font-size: 0.9em;
        }
        
        .grade-amounts,
        .fee-amounts {
          margin-bottom: 15px;
        }
        
        .amount-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 0.9em;
        }
        
        .amount-row .collected {
          color: #27ae60;
          font-weight: bold;
        }
        
        .amount-row .pending {
          color: #e74c3c;
          font-weight: bold;
        }
        
        .sections-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .section-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .section-name {
          flex: 1;
          font-size: 0.8em;
          color: #7f8c8d;
        }
        
        .section-percentage {
          font-size: 0.8em;
          color: #2c3e50;
          min-width: 35px;
          text-align: right;
        }
        
        .mini-progress-bar {
          flex: 2;
          height: 4px;
          background: #ecf0f1;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .mini-progress-fill {
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

export default FeeSummary;
