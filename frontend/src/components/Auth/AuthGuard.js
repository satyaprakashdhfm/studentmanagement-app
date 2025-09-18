import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AuthGuard = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        <div>🔄 Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('🔐 AuthGuard: User not authenticated, redirecting to login');
    return <Navigate to="/login/admin" replace />;
  }

  // Check if user role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log(`🔐 AuthGuard: User role '${user.role}' not allowed, redirecting to appropriate login`);
    
    // Redirect to appropriate login based on user role
    const roleLoginMap = {
      'admin': '/login/admin',
      'teacher': '/login/teacher', 
      'student': '/login/student'
    };
    
    const redirectPath = roleLoginMap[user.role] || '/login/admin';
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and has correct role
  console.log(`🔐 AuthGuard: Access granted for ${user.role} user: ${user.username}`);
  return children;
};

export default AuthGuard;
