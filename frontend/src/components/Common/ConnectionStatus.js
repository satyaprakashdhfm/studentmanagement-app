import React, { useState, useEffect } from 'react';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // DISABLED: Check backend health periodically (causing overload)
    // const checkBackendHealth = async () => {
    //   try {
    //     const response = await fetch('/api/health', { 
    //       method: 'GET',
    //       timeout: 5000 
    //     });
    //     const healthy = response.ok;
        
    //     if (backendHealthy !== healthy) {
    //       setBackendHealthy(healthy);
    //       setShowStatus(true);
    //       if (healthy) {
    //         setTimeout(() => setShowStatus(false), 3000);
    //       }
    //     }
    //   } catch (error) {
    //     if (backendHealthy) {
    //       setBackendHealthy(false);
    //       setShowStatus(true);
    //     }
    //   }
    // };

    // const healthCheckInterval = setInterval(checkBackendHealth, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // clearInterval(healthCheckInterval);
    };
  }, [backendHealthy]);

  if (!showStatus && isOnline && backendHealthy) {
    return null;
  }

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        message: 'No internet connection',
        color: '#ff4444',
        icon: '🌐'
      };
    }
    
    if (!backendHealthy) {
      return {
        message: 'Server connection issues',
        color: '#ff8800',
        icon: '⚠️'
      };
    }
    
    return {
      message: 'Connection restored',
      color: '#44ff44',
      icon: '✅'
    };
  };

  const status = getStatusInfo();

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: status.color,
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: 10000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span>{status.icon}</span>
      <span>{status.message}</span>
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default ConnectionStatus;
