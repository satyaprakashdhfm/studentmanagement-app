import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const FeeHistory = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState({});

  const handlePayment = async (fee) => {
    setPaymentLoading(prev => ({ ...prev, [fee.id]: true }));
    
    try {
      const paymentData = {
        amountPaid: fee.balance,
        paymentMethod: 'online'
      };

      const response = await apiService.recordPayment(fee.id, paymentData);
      
      if (response && response.fee) {
        // Update the fee in the state
        setFees(prevFees => 
          prevFees.map(f => 
            f.id === fee.id 
              ? { ...response.fee, id: response.fee.feeId } 
              : f
          )
        );
        
        // Show success message (you can add a toast notification here)
        alert('Payment successful! The fee has been paid.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(prev => ({ ...prev, [fee.id]: false }));
    }
  };

  useEffect(() => {
    const fetchFeeHistory = async () => {
      try {
        if (!user || user.role !== 'student') {
          setError('Student session not found. Please login.');
          return;
        }

        // Use username as studentId for students
        const studentId = user.username;
        console.log('Fetching fees for student:', studentId);
        const response = await apiService.getStudentFees(studentId);
        
        if (response.fees) {
          // Map the fees to include the feeId as id for easier handling
          const feesWithId = response.fees.map(fee => ({
            ...fee,
            id: fee.feeId
          }));
          setFees(feesWithId);
        } else {
          setError('Failed to fetch fee history');
        }
      } catch (error) {
        console.error('Error fetching fee history:', error);
        setError('Failed to load fee history');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchFeeHistory();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading fee history...
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
  
  // Calculate totals
  const totalDue = fees.reduce((sum, fee) => sum + Number(fee.amountDue || 0), 0);
  const totalPaid = fees.reduce((sum, fee) => sum + Number(fee.amountPaid || 0), 0);
  const totalBalance = fees.reduce((sum, fee) => sum + Number(fee.balance || 0), 0);

  return (
    <div className="content-card">
      <h2>Fee History</h2>
      
      {/* Fee Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>₹{totalDue.toLocaleString()}</div>
          <div style={{ color: '#7f8c8d' }}>Total Due</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#d5f4e6', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>₹{totalPaid.toLocaleString()}</div>
          <div style={{ color: '#27ae60' }}>Total Paid</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: totalBalance > 0 ? '#fadbd8' : '#d5f4e6', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: totalBalance > 0 ? '#e74c3c' : '#27ae60' }}>
            ₹{totalBalance.toLocaleString()}
          </div>
          <div style={{ color: totalBalance > 0 ? '#e74c3c' : '#27ae60' }}>Outstanding Balance</div>
        </div>
      </div>

      {/* Fee Records Table */}
      <div>
        <h3 style={{ marginBottom: '15px' }}>Payment History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fee Type</th>
              <th>Amount Due</th>
              <th>Amount Paid</th>
              <th>Payment Date</th>
              <th>Payment Method</th>
              <th>Balance</th>
              <th>Academic Year</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id}>
                <td>{fee.feeType}</td>
                <td>₹{Number(fee.amountDue || 0).toLocaleString()}</td>
                <td>₹{Number(fee.amountPaid || 0).toLocaleString()}</td>
                <td>{fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : 'N/A'}</td>
                <td>{fee.paymentMethod || 'N/A'}</td>
                <td style={{ color: fee.balance > 0 ? '#e74c3c' : '#27ae60' }}>
                  ₹{Number(fee.balance || 0).toLocaleString()}
                </td>
                <td>{fee.academicYear}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: fee.balance === 0 ? '#d5f4e6' : '#fadbd8',
                    color: fee.balance === 0 ? '#27ae60' : '#e74c3c'
                  }}>
                    {fee.balance === 0 ? 'PAID' : 'PENDING'}
                  </span>
                </td>
                <td>
                  {fee.balance > 0 ? (
                    <button
                      onClick={() => handlePayment(fee)}
                      disabled={paymentLoading[fee.id]}
                      style={{
                        backgroundColor: paymentLoading[fee.id] ? '#95a5a6' : '#27ae60',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: paymentLoading[fee.id] ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!paymentLoading[fee.id]) {
                          e.target.style.backgroundColor = '#219a52';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!paymentLoading[fee.id]) {
                          e.target.style.backgroundColor = '#27ae60';
                        }
                      }}
                    >
                      {paymentLoading[fee.id] ? 'Processing...' : `Pay ₹${Number(fee.balance || 0).toLocaleString()}`}
                    </button>
                  ) : (
                    <span style={{
                      color: '#27ae60',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      ✓ Paid
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Instructions */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Payment Instructions</h4>
        <ul style={{ color: '#555', lineHeight: '1.6' }}>
          <li>Click the "Pay" button next to any pending fee to make an online payment</li>
          <li>Payments are processed instantly and will reflect immediately in your account</li>
          <li>You will receive a confirmation after successful payment</li>
          <li>For any payment-related queries, contact the accounts department</li>
        </ul>
      </div>
    </div>
  );
};

export default FeeHistory;
