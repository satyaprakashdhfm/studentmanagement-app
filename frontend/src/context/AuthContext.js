import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Initialize auth state on app load
  useEffect(() => {
    // Set auth error handler in API service
    apiService.setAuthErrorHandler(() => {
      console.log('Auth error handler triggered, logging out');
      logout();
    });

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const currentUser = localStorage.getItem('currentUser');

        if (token && currentUser) {
          const userData = JSON.parse(currentUser);

          // Validate token by making a test API call
          try {
            await apiService.getUserProfile();
            setUser(userData);
            setIsAuthenticated(true);
          } catch (error) {
            // Token is invalid, clear session
            console.log('Token validation failed:', error.message);
            logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);

      if (response.success) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const refreshToken = async () => {
    try {
      // This would typically call a refresh token endpoint
      // For now, we'll just validate the current token
      const response = await apiService.getUserProfile();
      return { success: true };
    } catch (error) {
      logout();
      return { success: false, message: 'Session expired. Please login again.' };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;