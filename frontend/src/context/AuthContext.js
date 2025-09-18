import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiServiceSingleton';

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

  // Helper functions for username-specific storage keys
  const getStorageKey = (baseKey, username) => {
    return username ? `${baseKey}_${username}` : baseKey;
  };

  // Generate a unique tab ID for this browser tab
  const getTabId = () => {
    let tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
      tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('tabId', tabId);
    }
    return tabId;
  };

  const getCurrentUsername = () => {
    // Try to get current user's username from state first
    if (user && user.username) {
      return user.username;
    }
    
    // Check this tab's session storage first
    const tabCurrentUser = sessionStorage.getItem('currentUser');
    if (tabCurrentUser) {
      try {
        const userData = JSON.parse(tabCurrentUser);
        return userData.username;
      } catch (e) {
        console.error('Error parsing tab user data:', e);
      }
    }
    
    return null;
  };

  const getAllStoredSessions = () => {
    const sessions = [];
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith('authToken_')) {
        const username = key.replace('authToken_', '');
        const userKey = `currentUser_${username}`;
        const userData = localStorage.getItem(userKey);
        
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            sessions.push({
              username: username,
              token: localStorage.getItem(key),
              user: parsedUser
            });
          } catch (e) {
            console.error('Error parsing session data for:', username);
          }
        }
      }
    });
    
    return sessions;
  };

  const logout = (specificUsername = null) => {
    const usernameToLogout = specificUsername || getCurrentUsername();
    if (usernameToLogout) {
      localStorage.removeItem(getStorageKey('authToken', usernameToLogout));
      localStorage.removeItem(getStorageKey('currentUser', usernameToLogout));
      console.log(`🔐 Logged out user: ${usernameToLogout}`);
    }
  };

  const logoutFromCurrentTab = () => {
    // Clear session storage (current tab only)
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUsername');
    
    // Clear API service token
    apiService.setCurrentToken(null);
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    console.log('🔐 User logged out from current tab');
  };

  const getLastLoginRole = () => {
    return localStorage.getItem('lastLoginRole') || 'admin';
  };

  const setLastLoginRole = (role) => {
    localStorage.setItem('lastLoginRole', role);
  };

  // Initialize auth state on app load
  useEffect(() => {
    // Prevent duplicate initialization
    if (window.authInitialized) {
      return;
    }
    window.authInitialized = true;
    
    // Set auth error handler in API service
    apiService.setAuthErrorHandler(() => {
      console.log('Auth error handler triggered, logging out');
      logoutFromCurrentTab();
    });

    const initializeAuth = async () => {
      try {
        // First check if there's a tab-specific session (sessionStorage)
        const tabToken = sessionStorage.getItem('authToken');
        const tabUser = sessionStorage.getItem('currentUser');

        if (tabToken && tabUser) {
          try {
            // DON'T validate token immediately - just use cached session
            const parsedUser = JSON.parse(tabUser);
            setUser(parsedUser);
            setIsAuthenticated(true);
            console.log(`🔐 Using cached tab session for user: ${parsedUser.username}`);
            return;
          } catch (error) {
            console.log('🔐 Tab session invalid, clearing...');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
          }
        }

        // If no general session, check all stored user sessions
        const storedSessions = getAllStoredSessions();
        let foundValidSession = false;

        for (const session of storedSessions) {
          try {
            // Set the token for API calls in sessionStorage (tab-specific)
            sessionStorage.setItem('authToken', session.token);
            sessionStorage.setItem('currentUser', JSON.stringify(session.user));
            sessionStorage.setItem('currentUsername', session.user.username);
            
            // DON'T validate - just use stored session
            setUser(session.user);
            setIsAuthenticated(true);
            console.log(`🔐 Restored cached session for user: ${session.user.username}`);
            foundValidSession = true;
            break;
          } catch (error) {
            console.log(`🔐 Session invalid for user: ${session.user.username}`);
            // Remove invalid session
            logout(session.user.username);
          }
        }

        if (!foundValidSession) {
          // Clean up any remaining invalid tokens
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('currentUser');
          sessionStorage.removeItem('currentUsername');
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
      console.log('🔐 Attempting login with credentials:', { username: credentials.username, role: credentials.role });
      
      // Clear any existing session first to prevent conflicts
      logoutFromCurrentTab();
      
      const response = await apiService.login(credentials);
      console.log('🔐 Login API response:', response);

      if (response.success) {
        const username = response.user.username;
        const userRole = response.user.role;
        
        // Store session data with username-specific keys in localStorage (persistent)
        localStorage.setItem(getStorageKey('authToken', username), response.token);
        localStorage.setItem(getStorageKey('currentUser', username), JSON.stringify(response.user));
        
        // Store current session in sessionStorage (tab-specific, won't affect other tabs)
        sessionStorage.setItem('authToken', response.token);
        sessionStorage.setItem('currentUser', JSON.stringify(response.user));
        sessionStorage.setItem('currentUsername', username);
        
        // Update API service token
        apiService.setCurrentToken(response.token);
        
        // Remember the role they logged in as
        setLastLoginRole(userRole);
        
        console.log(`🔐 ${userRole} user logged in: ${username}`);
        console.log('📊 Session Storage Keys:', {
          sessionToken: !!sessionStorage.getItem('authToken'),
          sessionUser: !!sessionStorage.getItem('currentUser'),
          persistentToken: !!localStorage.getItem(`authToken_${username}`),
          persistentUser: !!localStorage.getItem(`currentUser_${username}`)
        });
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
    logout: logoutFromCurrentTab,
    refreshToken,
    getLastLoginRole,
    setLastLoginRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;