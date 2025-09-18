import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const FeeInquiry = () => {
  const { user } = useAuth();
  
  // Helper function to format fee types for display
  const formatFeeType = (feeType) => {
    const typeMap = {
      'tuition_term1': 'Tuition Term 1',
      'tuition_term2': 'Tuition Term 2',
      'tuition_term3': 'Tuition Term 3',
      'bus_fee': 'Bus Fee',
      'books_fee': 'Books Fee',
      'dress_fee': 'Dress Fee'
    };
    return typeMap[feeType] || feeType;
  };

  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeeType, setFilterFeeType] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [teacherClasses, setTeacherClasses] = useState([]);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        setLoading(true);
        
        if (!user || user.role !== 'teacher') {
          setError('Teacher session not found. Please login.');
          setLoading(false);
          return;
        }

        const teacherId = user.username;
        console.log('Fetching fee inquiry for teacher:', teacherId);
        
        const teacher = await apiService.getTeacher(teacherId);
        console.log('Teacher data:', teacher);
        
        if (!teacher) {
          setError('Teacher information not found. Please login again.');
          return;
        }
        
        // Handle different field name formats
        let classTeacherOf = teacher.classTeacherOf || teacher.class_teacher_of;
        if (!classTeacherOf) {
          setError('No classes assigned to this teacher as class teacher.');
          return;
        }
        
        // Parse classTeacherOf string to get class IDs
        // Format: "Class 242508002, Class 242510002"
        const classMatches = classTeacherOf.match(/Class (\d+)/g);
        if (!classMatches || classMatches.length === 0) {
          setError('No classes found for this teacher.');
          return;
        }
        
        const classIds = classMatches.map(match => match.replace('Class ', ''));
        console.log('Class IDs for teacher:', classIds);
        
        // Store teacher classes for filtering
        setTeacherClasses(classIds);
        
        // Fetch all fees for the teacher's classes (backend handles authorization)
        const response = await apiService.request('/fees?all=true');
        if (response.fees) {
          // Add classId to each fee record for filtering (from the fee record itself)
          const feesWithClassId = response.fees.map(fee => ({
            ...fee,
            classId: fee.classId
          }));
          setFees(feesWithClassId);
        }
        
      } catch (err) {
        console.error('Error fetching fees:', err);
        setError('Failed to load fee data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchFees();
    }
  }, [user]);

  // Group fees by class and calculate summaries
  const classSummaries = teacherClasses.reduce((acc, classId) => {
    const classFees = fees.filter(fee => fee.classId === parseInt(classId));
    const filteredClassFees = classFees.filter(fee => {
      if (filterStatus === 'paid' && fee.balance !== 0) return false;
      if (filterStatus === 'pending' && fee.balance === 0) return false;
      if (filterFeeType !== 'all' && fee.feeType !== filterFeeType) return false;
      return true;
    });

    if (filteredClassFees.length > 0) {
      const totalStudents = new Set(filteredClassFees.map(fee => fee.studentId)).size;
      const totalFees = filteredClassFees.length;
      const paidFees = filteredClassFees.filter(fee => (fee.balance || 0) === 0).length;
      const pendingFees = filteredClassFees.filter(fee => (fee.balance || 0) > 0).length;
      const totalAmountDue = filteredClassFees.reduce((sum, fee) => sum + (parseFloat(fee.amountDue || fee.amount_due || 0)), 0);
      const totalAmountPaid = filteredClassFees.reduce((sum, fee) => sum + (parseFloat(fee.amountPaid || fee.amount_paid || 0)), 0);
      const totalBalance = filteredClassFees.reduce((sum, fee) => sum + (parseFloat(fee.balance || 0)), 0);

      acc.push({
        classId: parseInt(classId),
        className: `Class ${classId}`,
        totalStudents,
        totalFees,
        paidFees,
        pendingFees,
        totalAmountDue,
        totalAmountPaid,
        totalBalance
      });
    }

    return acc;
  }, []);

  // Calculate overall filtered summary statistics
  const filteredFees = fees.filter(fee => {
    if (filterStatus === 'paid' && fee.balance !== 0) return false;
    if (filterStatus === 'pending' && fee.balance === 0) return false;
    if (filterFeeType !== 'all' && fee.feeType !== filterFeeType) return false;
    if (filterClass !== 'all' && fee.classId !== parseInt(filterClass)) return false;
    return true;
  });

  // Calculate filtered summary statistics correctly
  const filteredTotalStudents = new Set(filteredFees.map(fee => fee.studentId)).size;
  const filteredTotalFees = filteredFees.length;
  const filteredPaidFees = filteredFees.filter(fee => (fee.balance || 0) === 0).length;
  const filteredPendingFees = filteredFees.filter(fee => (fee.balance || 0) > 0).length;
  const filteredTotalAmountDue = filteredFees.reduce((sum, fee) => sum + (parseFloat(fee.amountDue || fee.amount_due || 0)), 0);
  const filteredTotalAmountPaid = filteredFees.reduce((sum, fee) => sum + (parseFloat(fee.amountPaid || fee.amount_paid || 0)), 0);
  const filteredTotalBalance = filteredFees.reduce((sum, fee) => sum + (parseFloat(fee.balance || 0)), 0);

  if (loading) {
    return (
      <div className="content-card">
        <h2>Fee Inquiry</h2>
        <p>Loading fee data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <h2>Fee Inquiry</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="content-card">
      <h2>Fee Inquiry</h2>
      
      {/* Class-wise Summary Sections */}
      {classSummaries.map(summary => (
        <div key={summary.classId} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Fee Summary - {summary.className} {filterStatus !== 'all' || filterFeeType !== 'all' ? '(Filtered)' : ''}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px' }}>
            <div>
              <strong>Total Students:</strong> {summary.totalStudents}
            </div>
            <div>
              <strong>Total Fee Records:</strong> {summary.totalFees}
            </div>
            <div style={{ color: '#27ae60' }}>
              <strong>Paid Fees:</strong> {summary.paidFees}
            </div>
            <div style={{ color: '#e74c3c' }}>
              <strong>Pending Fees:</strong> {summary.pendingFees}
            </div>
            <div>
              <strong>Total Amount Due:</strong> ₹{summary.totalAmountDue.toLocaleString()}
            </div>
            <div>
              <strong>Total Amount Paid:</strong> ₹{summary.totalAmountPaid.toLocaleString()}
            </div>
            <div style={{ color: summary.totalBalance > 0 ? '#e74c3c' : '#27ae60' }}>
              <strong>Outstanding Balance:</strong> ₹{summary.totalBalance.toLocaleString()}
            </div>
          </div>
        </div>
      ))}

      {/* Overall Summary Section */}
      {(filterStatus !== 'all' || filterFeeType !== 'all' || filterClass !== 'all') && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f4f8', borderRadius: '8px', border: '2px solid #3498db' }}>
          <h3>Overall Fee Summary (Filtered)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px' }}>
            <div>
              <strong>Total Students:</strong> {filteredTotalStudents}
            </div>
            <div>
              <strong>Total Fee Records:</strong> {filteredTotalFees}
            </div>
            <div style={{ color: '#27ae60' }}>
              <strong>Paid Fees:</strong> {filteredPaidFees}
            </div>
            <div style={{ color: '#e74c3c' }}>
              <strong>Pending Fees:</strong> {filteredPendingFees}
            </div>
            <div>
              <strong>Total Amount Due:</strong> ₹{filteredTotalAmountDue.toLocaleString()}
            </div>
            <div>
              <strong>Total Amount Paid:</strong> ₹{filteredTotalAmountPaid.toLocaleString()}
            </div>
            <div style={{ color: filteredTotalBalance > 0 ? '#e74c3c' : '#27ae60' }}>
              <strong>Outstanding Balance:</strong> ₹{filteredTotalBalance.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4>Filters</h4>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Payment Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fee Type:</label>
            <select 
              value={filterFeeType} 
              onChange={(e) => setFilterFeeType(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="all">All Types</option>
              <option value="tuition_term1">Tuition Term 1</option>
              <option value="tuition_term2">Tuition Term 2</option>
              <option value="tuition_term3">Tuition Term 3</option>
              <option value="bus_fee">Bus Fee</option>
              <option value="books_fee">Books Fee</option>
              <option value="dress_fee">Dress Fee</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Class:</label>
            <select 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="all">All Classes</option>
              {teacherClasses.map(classId => (
                <option key={classId} value={classId}>{classId}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button 
              onClick={() => {
                setFilterStatus('all');
                setFilterFeeType('all');
                setFilterClass('all');
              }}
              style={{ 
                padding: '6px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                backgroundColor: '#f8f9fa',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Class</th>
            <th>Fee Type</th>
            <th>Amount Due</th>
            <th>Amount Paid</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredFees.map(fee => (
            <tr key={fee.feeId || fee.fee_id}>
              <td>{fee.student?.name || 'N/A'}</td>
              <td>{fee.class ? `${fee.class.className} ${fee.class.section}` : fee.classId || 'N/A'}</td>
              <td>{formatFeeType(fee.feeType || fee.fee_type)}</td>
              <td>₹{(fee.amountDue || fee.amount_due || 0).toLocaleString()}</td>
              <td>₹{(fee.amountPaid || fee.amount_paid || 0).toLocaleString()}</td>
              <td style={{ color: (fee.balance || 0) > 0 ? '#e74c3c' : '#27ae60' }}>
                ₹{(fee.balance || 0).toLocaleString()}
              </td>
              <td>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: (fee.balance || 0) === 0 ? '#d5f4e6' : '#fadbd8',
                  color: (fee.balance || 0) === 0 ? '#27ae60' : '#e74c3c'
                }}>
                  {(fee.balance || 0) === 0 ? 'PAID' : 'PENDING'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {filteredFees.length === 0 && (
        <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No fee records match the selected filters.
        </p>
      )}
    </div>
  );
};

export default FeeInquiry;
