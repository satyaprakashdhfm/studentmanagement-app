import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const FeeInquiry = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        setLoading(true);
        const response = await apiService.getFees();
        console.log('Fees API response:', response);
        
        // The fees API returns { fees: [...], pagination: {...} }
        if (response.fees) {
          setFees(response.fees);
        } else {
          setError('Failed to load fee data');
        }
      } catch (err) {
        console.error('Error fetching fees:', err);
        setError('Failed to load fee data');
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, []);

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
          {fees.map(fee => (
            <tr key={fee.feeId}>
              <td>{fee.student?.name || 'N/A'}</td>
              <td>{fee.class ? `${fee.class.className} ${fee.class.section}` : 'N/A'}</td>
              <td>{fee.feeType}</td>
              <td>₹{fee.amountDue.toLocaleString()}</td>
              <td>₹{fee.amountPaid.toLocaleString()}</td>
              <td style={{ color: fee.balance > 0 ? '#e74c3c' : '#27ae60' }}>
                ₹{fee.balance.toLocaleString()}
              </td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FeeInquiry;
