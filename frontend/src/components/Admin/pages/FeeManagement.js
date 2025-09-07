import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const FeeManagement = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const response = await apiService.getFees();
        console.log('🏦 Fees response:', response);
        if (response.fees) {
          setFees(response.fees);
        } else {
          setError(response.message || 'Failed to fetch fees');
        }
      } catch (error) {
        console.error('Error fetching fees:', error);
        setError('Failed to load fee information');
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, []);

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

  return (
    <div className="content-card">
      <h2>Fee Management</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Class</th>
            <th>Fee Type</th>
            <th>Due</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(fee => (
            <tr key={fee.id}>
              <td>{fee.student?.name || 'N/A'}</td>
              <td>{fee.class ? `${fee.class.className} ${fee.class.section}` : 'N/A'}</td>
              <td>{fee.feeType}</td>
              <td>₹{fee.amountDue ? Number(fee.amountDue).toLocaleString() : '0'}</td>
              <td>₹{fee.amountPaid ? Number(fee.amountPaid).toLocaleString() : '0'}</td>
              <td style={{ color: fee.balance > 0 ? '#e74c3c' : '#27ae60' }}>₹{fee.balance ? Number(fee.balance).toLocaleString() : '0'}</td>
              <td>
                <button className="btn btn-warning" onClick={() => alert('Edit fee coming soon')}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FeeManagement;
