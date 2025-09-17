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
  const [expandedStudents, setExpandedStudents] = useState({});
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

        // Fetch all fees for the class (no pagination)
        const response = classId && !grade
          ? await apiService.getFeesByClass(classId, 1, 50, true) // all = true
          : await apiService.getFees(1, 50, {}, true); // all = true
            
        console.log('🏦 Fees response:', response);
        console.log('🏦 Total fees received:', response.fees?.length);
        console.log('🏦 Sample fee types:', response.fees?.slice(0, 10).map(f => ({ 
          feeType: f.feeType, 
          studentName: f.student?.name 
        })));
        
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
  }, [classId, grade, classes, selectedAcademicYear]); // Removed currentPage dependency

  // Group fees by student
  const groupFeesByStudent = () => {
    const grouped = {};
    console.log('Raw fees data:', fees.slice(0, 2)); // Debug: check first 2 fees
    
    // Debug: Check for Aryan Mitra specifically
    const aryanFees = fees.filter(fee => 
      fee.student?.name?.toLowerCase().includes('aryan mitra') ||
      fee.studentId === '242510001014'
    );
    console.log('Aryan Mitra fees found:', aryanFees.length, aryanFees.map(f => ({
      feeId: f.feeId,
      feeType: f.feeType,
      studentName: f.student?.name,
      studentId: f.studentId
    })));
    
    // Deduplicate fees first by feeId
    const uniqueFees = fees.filter((fee, index, self) => 
      index === self.findIndex(f => f.feeId === fee.feeId)
    );
    
    // Debug: Check Aryan after deduplication
    const aryanUniqueFees = uniqueFees.filter(fee => 
      fee.student?.name?.toLowerCase().includes('aryan mitra') ||
      fee.studentId === '242510001014'
    );
    console.log('Aryan Mitra unique fees:', aryanUniqueFees.length, aryanUniqueFees.map(f => ({
      feeId: f.feeId,
      feeType: f.feeType
    })));
    
    console.log(`Deduplication: ${fees.length} fees reduced to ${uniqueFees.length} unique fees`);
    
    uniqueFees.forEach((fee, index) => {
      // Try multiple possible student ID fields
      const studentKey = String(
        fee.student?.studentId || 
        fee.student?.id || 
        fee.student?.student_id ||
        fee.studentId ||
        fee.student_id ||
        `student_${index}` // fallback
      );
      
      console.log('Processing fee:', {
        feeId: fee.feeId,
        studentFromFee: fee.student,
        studentId: fee.studentId,
        calculatedKey: studentKey
      });
      
      if (!grouped[studentKey]) {
        grouped[studentKey] = {
          student: fee.student,
          class: fee.class,
          fees: [],
          totalDue: 0,
          totalPaid: 0,
          totalBalance: 0
        };
      }
      grouped[studentKey].fees.push(fee);
      grouped[studentKey].totalDue += parseFloat(fee.amountDue || 0);
      grouped[studentKey].totalPaid += parseFloat(fee.amountPaid || 0);
      grouped[studentKey].totalBalance += parseFloat(fee.balance || 0);
    });
    const result = Object.values(grouped);
    console.log('Final grouped result:', result.map(g => ({ 
      studentId: g.student?.studentId, 
      name: g.student?.name,
      feeCount: g.fees.length 
    })));
    return result;
  };

  // Toggle student expansion
  const toggleStudentExpansion = (studentId) => {
    console.log('Toggling student:', studentId, 'Current expanded:', expandedStudents);
    setExpandedStudents(prev => ({
      ...prev,
      [String(studentId)]: !prev[String(studentId)]
    }));
  };

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
        alert('Fee record updated successfully');
      }
    } catch (error) {
      console.error('Error updating fee record:', error);
      alert('Failed to update fee record');
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
              className={`class-box ${!cls.active ? 'deactivated' : ''}`}
              onClick={() => handleClassClick(cls.classId)}
            >
              <h4>
                {cls.className} {cls.section}
                {!cls.active && <span className="deactivated-badge">DEACTIVATED</span>}
              </h4>
              <div className="class-info">
                <p>Academic Year: {cls.academicYear}</p>
                <p>Max Students: {cls.maxStudents}</p>
                {!cls.active && (
                  <p className="inactive-notice">⚠️ This class is deactivated but fees are still viewable</p>
                )}
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
          .class-box.deactivated {
            background-color: #f8f9fa;
            border: 2px dashed #dc3545;
            opacity: 0.8;
          }
          .class-box.deactivated:hover {
            transform: none;
            box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
          }
          .class-box h4 {
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #3498db;
          }
          .class-box.deactivated h4 {
            color: #dc3545;
          }
          .deactivated-badge {
            font-size: 0.7em;
            background: #dc3545;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            margin-left: 8px;
          }
          .inactive-notice {
            color: #dc3545;
            font-size: 0.85em;
            font-style: italic;
            margin-top: 8px;
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
              <th>Total Due</th>
              <th>Total Paid</th>
              <th>Total Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupFeesByStudent().map((studentGroup, index) => {
              // Try multiple possible student ID fields
              const studentId = String(
                studentGroup.student?.studentId || 
                studentGroup.student?.id || 
                studentGroup.student?.student_id ||
                index // fallback to index if no ID found
              );
              
              const isExpanded = expandedStudents[studentId] || false;
              const overallStatus = studentGroup.totalBalance === 0 ? 'PAID' : 
                                   studentGroup.totalPaid === 0 ? 'PENDING' : 'PARTIAL';
              
              console.log('Rendering student:', {
                index,
                studentId,
                name: studentGroup.student?.name,
                isExpanded,
                expandedStudents,
                fullStudent: studentGroup.student
              });
              
              return (
                <React.Fragment key={studentId}>
                  {/* Student Summary Row */}
                  <tr className="student-summary-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <strong>{studentGroup.student?.name || 'N/A'}</strong>
                      </div>
                    </td>
                    <td><strong>{studentGroup.class ? `${studentGroup.class.className} ${studentGroup.class.section}` : 'N/A'}</strong></td>
                    <td><strong>{formatCurrency(studentGroup.totalDue)}</strong></td>
                    <td><strong>{formatCurrency(studentGroup.totalPaid)}</strong></td>
                    <td style={{ color: studentGroup.totalBalance > 0 ? '#e74c3c' : '#27ae60' }}>
                      <strong>{formatCurrency(studentGroup.totalBalance)}</strong>
                    </td>
                    <td>
                      <span className={`status ${overallStatus.toLowerCase()}`}>
                        <strong>{overallStatus}</strong>
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-info btn-sm" 
                        onClick={() => toggleStudentExpansion(studentId)}
                      >
                        {isExpanded ? 'Collapse' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Individual Fee Rows (shown when expanded) */}
                  {isExpanded && studentGroup.fees.map(fee => (
                    <tr key={fee.feeId} className="fee-detail-row">
                      <td style={{ paddingLeft: '30px' }}>{fee.feeType}</td>
                      <td>-</td>
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
                            Update Record
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {groupFeesByStudent().length === 0 && (
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
                        Edit Fee
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
                  <div className="detail-item">
                    <strong>Created:</strong> {new Date(selectedFee.createdAt).toLocaleString()}
                  </div>
                  <div className="detail-item">
                    <strong>Last Updated:</strong> {new Date(selectedFee.updatedAt).toLocaleString()}
                  </div>
                  {selectedFee.updatedBy && (
                    <div className="detail-item">
                      <strong>Updated By:</strong> 
                      <span style={{ color: '#3498db', fontWeight: 'bold', marginLeft: '8px' }}>
                        {selectedFee.updatedByUser ? 
                          `${selectedFee.updatedByUser.firstName || ''} ${selectedFee.updatedByUser.lastName || ''}`.trim() || selectedFee.updatedByUser.username :
                          selectedFee.updatedBy
                        } ({selectedFee.updatedBy})
                      </span>
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

      {/* Update Record Modal */}
      {showPaymentModal && selectedFee && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Fee Record</h3>
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
                  <label>Amount to Record *</label>
                  <input
                    type="number"
                    value={paymentData.paymentAmount}
                    onChange={(e) => setPaymentData({...paymentData, paymentAmount: e.target.value})}
                    max={selectedFee.balance}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Transaction Method</label>
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
                  <label>Transaction Date</label>
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
                Update Fee Record
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
