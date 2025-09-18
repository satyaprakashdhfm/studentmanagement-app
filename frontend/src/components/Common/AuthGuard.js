import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AuthGuard = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // If user is authenticated but we need to validate the session
    if (isAuthenticated && user) {
      // Check if user has required role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.log('User does not have required role:', user.role, 'Required:', allowedRoles);
        logout();
        return;
      }

      // Check if user account is active
      if (user.active === false) {
        console.log('User account is deactivated');
        logout();
        return;
      }
    }
  }, [isAuthenticated, user, allowedRoles, logout]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        <div>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            🔐 Validating session...
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not authenticated, redirect to appropriate login page
  if (!isAuthenticated) {
    // Determine which login page to redirect to based on the current path
    let loginPath = '/login/admin'; // default fallback

    // Strategy: Check current path to determine which role's login page to show
    if (location.pathname.startsWith('/teacher')) {
      loginPath = '/login/teacher';
    } else if (location.pathname.startsWith('/student')) {
      loginPath = '/login/student';
    } else if (location.pathname.startsWith('/admin')) {
      loginPath = '/login/admin';
    }
    // For other paths, keep the default admin login

    console.log('🔐 Redirecting unauthenticated user to:', loginPath, 'from path:', location.pathname);
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If authenticated but wrong role, redirect to appropriate dashboard
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    let redirectPath = '/admin/dashboard'; // default

    switch (user.role) {
      case 'teacher':
        redirectPath = '/teacher/dashboard';
        break;
      case 'student':
        redirectPath = '/student/dashboard';
        break;
      case 'admin':
        redirectPath = '/admin/dashboard';
        break;
      default:
        redirectPath = '/login/admin';
    }

    return <Navigate to={redirectPath} replace />;
  }

  // All checks passed, render the protected content
  return children;
};

export default AuthGuard;