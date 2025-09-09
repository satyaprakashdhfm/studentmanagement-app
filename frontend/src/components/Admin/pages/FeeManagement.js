import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import './FeeManagement.css';

const FeeManagement = () => {
  const { classId, grade } = useParams();
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFee, setSelectedFee] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentAmount: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0]
  });

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

  const handleFeeClick = (fee) => {
    setSelectedFee(fee);
    setEditMode(false);
    setShowFeeModal(true);
  };

  const handleEditFee = (fee) => {
    setSelectedFee(fee);
    setEditMode(true);
    setShowFeeModal(true);
  };

  const handleRecordPayment = (fee) => {
    setSelectedFee(fee);
    setPaymentData({
      paymentAmount: fee.balance || '',
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
    setShowFeeModal(false);
    setShowPaymentModal(false);
    setSelectedFee(null);
    setEditMode(false);
    setPaymentData({
      paymentAmount: '',
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleUpdateFee = async () => {
    try {
      const response = await apiService.updateFee(selectedFee.feeId, {
        feeType: selectedFee.feeType,
        amountDue: selectedFee.amountDue,
        academicYear: selectedFee.academicYear
      });
      if (response.fee) {
        setFees(fees.map(f => f.feeId === selectedFee.feeId ? response.fee : f));
        handleCloseModal();
        alert('Fee record updated successfully');
      }
    } catch (error) {
      console.error('Error updating fee:', error);
      alert('Failed to update fee record');
    }
  };

  const handleSubmitPayment = async () => {
    try {
      const response = await apiService.recordPayment(selectedFee.feeId, paymentData);
      if (response.fee) {
        setFees(fees.map(f => f.feeId === selectedFee.feeId ? response.fee : f));
        handleCloseModal();
        alert('Payment recorded successfully');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getPaymentStatus = (fee) => {
    const balance = Number(fee.balance || 0);
    const paid = Number(fee.amountPaid || 0);
    
    if (balance === 0) return 'paid';
    if (paid > 0) return 'partial';
    return 'unpaid';
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
        <div className="header-actions">
          <div className="academic-year-info">
            <span>Academic Year: {selectedAcademicYear}</span>
          </div>
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Fee Type</th>
              <th>Due Amount</th>
              <th>Paid Amount</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(fee => (
              <tr key={fee.feeId}>
                <td>{fee.student?.name || 'N/A'}</td>
                <td>{fee.class ? `${fee.class.className} ${fee.class.section}` : 'N/A'}</td>
                <td>{fee.feeType}</td>
                <td>{formatCurrency(fee.amountDue)}</td>
                <td>{formatCurrency(fee.amountPaid)}</td>
                <td style={{ color: fee.balance > 0 ? '#e74c3c' : '#27ae60' }}>
                  {formatCurrency(fee.balance)}
                </td>
                <td>
                  <span className={`status ${getPaymentStatus(fee)}`}>
                    {getPaymentStatus(fee).toUpperCase()}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn-info btn-sm" 
                    onClick={() => handleFeeClick(fee)}
                    style={{ marginRight: '5px' }}
                  >
                    View
                  </button>
                  {fee.balance > 0 && (
                    <button 
                      className="btn btn-warning btn-sm" 
                      onClick={() => handleRecordPayment(fee)}
                    >
                      Pay
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {fees.length === 0 && (
          <div className="no-fees">
            No fee records found for this class
          </div>
        )}
      </div>

      {/* Fee Details Modal */}
      {showFeeModal && selectedFee && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Fee Record' : 'Fee Details'}</h3>
              <div className="modal-actions">
                {!editMode && (
                  <>
                    <button className="btn btn-warning btn-sm" onClick={() => setEditMode(true)}>
                      Edit
                    </button>
                    {selectedFee.balance > 0 && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleRecordPayment(selectedFee)}>
                        Record Payment
                      </button>
                    )}
                  </>
                )}
                <button className="btn btn-light btn-sm" onClick={handleCloseModal}>
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body">
              {editMode ? (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Fee Type</label>
                    <select
                      value={selectedFee.feeType}
                      onChange={(e) => setSelectedFee({...selectedFee, feeType: e.target.value})}
                    >
                      <option value="Tuition Fee">Tuition Fee</option>
                      <option value="Transport Fee">Transport Fee</option>
                      <option value="Activity Fee">Activity Fee</option>
                      <option value="Library Fee">Library Fee</option>
                      <option value="Exam Fee">Exam Fee</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount Due</label>
                    <input
                      type="number"
                      value={selectedFee.amountDue}
                      onChange={(e) => setSelectedFee({...selectedFee, amountDue: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Academic Year</label>
                    <input
                      type="text"
                      value={selectedFee.academicYear}
                      onChange={(e) => setSelectedFee({...selectedFee, academicYear: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="details-grid">
                  <div className="detail-item">
                    <strong>Student:</strong> {selectedFee.student?.name || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Class:</strong> {selectedFee.class ? `${selectedFee.class.className} ${selectedFee.class.section}` : 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Fee Type:</strong> {selectedFee.feeType}
                  </div>
                  <div className="detail-item">
                    <strong>Amount Due:</strong> {formatCurrency(selectedFee.amountDue)}
                  </div>
                  <div className="detail-item">
                    <strong>Amount Paid:</strong> {formatCurrency(selectedFee.amountPaid)}
                  </div>
                  <div className="detail-item">
                    <strong>Balance:</strong> 
                    <span style={{ color: selectedFee.balance > 0 ? '#e74c3c' : '#27ae60', marginLeft: '8px' }}>
                      {formatCurrency(selectedFee.balance)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Academic Year:</strong> {selectedFee.academicYear}
                  </div>
                  <div className="detail-item">
                    <strong>Payment Status:</strong>
                    <span className={`status ${getPaymentStatus(selectedFee)}`} style={{ marginLeft: '8px' }}>
                      {getPaymentStatus(selectedFee).toUpperCase()}
                    </span>
                  </div>
                  {selectedFee.paymentDate && (
                    <div className="detail-item">
                      <strong>Last Payment Date:</strong> {new Date(selectedFee.paymentDate).toLocaleDateString()}
                    </div>
                  )}
                  {selectedFee.paymentMethod && (
                    <div className="detail-item">
                      <strong>Payment Method:</strong> {selectedFee.paymentMethod}
                    </div>
                  )}
                </div>
              )}
            </div>
            {editMode && (
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleUpdateFee}>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedFee && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button className="btn btn-light btn-sm" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid" style={{ marginBottom: '20px' }}>
                <div className="detail-item">
                  <strong>Student:</strong> {selectedFee.student?.name}
                </div>
                <div className="detail-item">
                  <strong>Fee Type:</strong> {selectedFee.feeType}
                </div>
                <div className="detail-item">
                  <strong>Outstanding Balance:</strong> {formatCurrency(selectedFee.balance)}
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Payment Amount *</label>
                  <input
                    type="number"
                    value={paymentData.paymentAmount}
                    onChange={(e) => setPaymentData({...paymentData, paymentAmount: e.target.value})}
                    max={selectedFee.balance}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitPayment}
                disabled={!paymentData.paymentAmount || parseFloat(paymentData.paymentAmount) <= 0}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .class-header {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .academic-year-info {
          background-color: #3498db;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};

export default FeeManagement;
