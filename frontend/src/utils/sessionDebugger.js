// Session Debugger Utility
// Add this to browser console to see all active sessions

export const debugSessions = () => {
  console.log('🔍 === SESSION DEBUGGER ===');
  
  const sessions = [];
  const keys = Object.keys(localStorage);
  
  // Find all user sessions
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
            role: parsedUser.role,
            hasToken: !!localStorage.getItem(key),
            userData: parsedUser
          });
        } catch (e) {
          console.error('Error parsing session data for:', username);
        }
      }
    }
  });
  
  console.log(`📊 Found ${sessions.length} stored sessions:`);
  sessions.forEach((session, index) => {
    console.log(`${index + 1}. ${session.role.toUpperCase()}: ${session.username} ${session.hasToken ? '✅' : '❌'}`);
  });
  
  // Current active session
  const currentUser = localStorage.getItem('currentUser');
  const currentToken = localStorage.getItem('authToken');
  
  if (currentUser && currentToken) {
    try {
      const userData = JSON.parse(currentUser);
      console.log(`🎯 Current Active Session: ${userData.role.toUpperCase()} - ${userData.username}`);
    } catch (e) {
      console.log('❌ Error parsing current user data');
    }
  } else {
    console.log('❌ No active session');
  }
  
  console.log('🔍 === END SESSION DEBUG ===');
  return sessions;
};

// Helper to clear all sessions (for testing)
export const clearAllSessions = () => {
  const keys = Object.keys(localStorage);
  let cleared = 0;
  
  keys.forEach(key => {
    if (key.startsWith('authToken_') || key.startsWith('currentUser_') || 
        key === 'authToken' || key === 'currentUser' || key === 'lastLoginRole') {
      localStorage.removeItem(key);
      cleared++;
    }
  });
  
  // Also clear sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.startsWith('authToken') || key.startsWith('currentUser') || key === 'currentUsername') {
      sessionStorage.removeItem(key);
      cleared++;
    }
  });
  
  console.log(`🧹 Cleared ${cleared} session-related items from localStorage and sessionStorage`);
};

// Auto-expose to window for easy console access
if (typeof window !== 'undefined') {
  window.debugSessions = debugSessions;
  window.clearAllSessions = clearAllSessions;
}
