import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import ComprehensiveAcademicYearForm from './ComprehensiveAcademicYearForm';

const AcademicYearManagement = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch academic years on component mount
  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const academicYearsData = await apiService.getAcademicYears();
      setAcademicYears(academicYearsData);
    } catch (error) {
      console.error('Error fetching academic years:', error);
      // Show empty state on error
      setAcademicYears([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFinancialYear = () => {
    setShowAddForm(true);
  };

  return (
    <div className="academic-year-management">
      <div className="page-header">
        <div className="header-left">
          <h1>📅 Academic Year Management</h1>
          <p>Manage academic years and setup comprehensive school data</p>
        </div>
        <div className="header-right">
          <button 
            className="btn btn-primary add-financial-year-btn"
            onClick={handleAddFinancialYear}
          >
            <span>➕</span> Add Financial Year
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading academic years...</p>
        </div>
      ) : (
        <div className="academic-years-grid">
          {academicYears.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No Academic Years Found</h3>
              <p>Get started by adding your first financial year</p>
              <button 
                className="btn btn-primary"
                onClick={handleAddFinancialYear}
              >
                Add Financial Year
              </button>
            </div>
          ) : (
            academicYears.map(year => (
              <div key={year.academicYearId} className="academic-year-card">
                <div className="card-header">
                  <h3>{year.academicYearDisplay}</h3>
                  {year.isCurrent && <span className="current-badge">Current</span>}
                  <span className={`status-badge ${year.status.toLowerCase()}`}>
                    {year.status}
                  </span>
                </div>
                <div className="card-body">
                  <div className="year-info">
                    <div className="info-item">
                      <label>Start Date:</label>
                      <span>{new Date(year.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="info-item">
                      <label>End Date:</label>
                      <span>{new Date(year.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="info-item">
                      <label>Year ID:</label>
                      <span>{year.academicYearId}</span>
                    </div>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn btn-secondary">View Details</button>
                  <button className="btn btn-outline">Edit</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Financial Year Form - Comprehensive */}
      {showAddForm && (
        <ComprehensiveAcademicYearForm 
          onClose={() => setShowAddForm(false)}
          onSuccess={() => { setShowAddForm(false); fetchAcademicYears(); }}
        />
      )}

      <style jsx>{`
        .academic-year-management {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .header-left h1 {
          margin: 0 0 10px 0;
          color: #2c3e50;
          font-size: 2.2em;
        }

        .header-left p {
          margin: 0;
          color: #7f8c8d;
          font-size: 1.1em;
        }

        .add-financial-year-btn {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1.1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }

        .add-financial-year-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }

        .add-financial-year-btn span {
          margin-right: 8px;
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .academic-years-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 25px;
        }

        .academic-year-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .academic-year-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .card-header {
          background: linear-gradient(135deg, #34495e, #2c3e50);
          color: white;
          padding: 20px;
          position: relative;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.4em;
        }

        .current-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: #27ae60;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: 600;
        }

        .status-badge {
          position: absolute;
          bottom: 15px;
          right: 15px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: 600;
        }

        .status-badge.active {
          background: #27ae60;
          color: white;
        }

        .status-badge.upcoming {
          background: #f39c12;
          color: white;
        }

        .status-badge.completed {
          background: #95a5a6;
          color: white;
        }

        .card-body {
          padding: 20px;
        }

        .year-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .info-item label {
          font-weight: 600;
          color: #34495e;
        }

        .info-item span {
          color: #7f8c8d;
        }

        .card-actions {
          padding: 15px 20px;
          background: #f8f9fa;
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-secondary {
          background: #95a5a6;
          color: white;
        }

        .btn-outline {
          background: transparent;
          color: #3498db;
          border: 2px solid #3498db;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          grid-column: 1 / -1;
        }

        .empty-icon {
          font-size: 4em;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          color: #34495e;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #7f8c8d;
          margin-bottom: 30px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          color: #2c3e50;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: #7f8c8d;
        }

        .modal-body {
          padding: 30px;
        }

        .coming-soon {
          text-align: center;
        }

        .coming-soon h3 {
          color: #3498db;
          margin-bottom: 20px;
        }

        .coming-soon ul {
          text-align: left;
          max-width: 300px;
          margin: 20px auto;
        }

        .coming-soon li {
          margin-bottom: 8px;
          color: #34495e;
        }
      `}</style>
    </div>
  );
};

export default AcademicYearManagement;
