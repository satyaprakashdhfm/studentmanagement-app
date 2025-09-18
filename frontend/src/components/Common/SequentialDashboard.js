import React, { useState, useEffect } from 'react';
import { getLoaderStatus } from '../../utils/sequentialLoader';

const SequentialDashboard = ({ children, loadingMessage = "Loading dashboard..." }) => {
  const [loaderStatus, setLoaderStatus] = useState({ queueSize: 0, isProcessing: false });
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    // Monitor loader status
    const statusInterval = setInterval(() => {
      const status = getLoaderStatus();
      setLoaderStatus(status);
      
      // Show loader if queue has items or is processing
      setShowLoader(status.queueSize > 0 || status.isProcessing);
    }, 500);

    return () => clearInterval(statusInterval);
  }, []);

  if (showLoader) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        gap: '20px'
      }}>
        <div style={{
          fontSize: '24px',
          animation: 'spin 1s linear infinite'
        }}>
          🔄
        </div>
        <div style={{ fontSize: '18px', color: '#666' }}>
          {loadingMessage}
        </div>
        <div style={{ fontSize: '14px', color: '#999' }}>
          {loaderStatus.isProcessing ? 
            `Processing API calls... (${loaderStatus.queueSize} in queue)` : 
            `${loaderStatus.queueSize} API calls queued`
          }
        </div>
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return children;
};

export default SequentialDashboard;
