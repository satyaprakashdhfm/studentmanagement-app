// Frontend logging utility for debugging and error tracking

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  // Create a log entry with metadata
  createLogEntry(level, message, data = null, error = null) {
    const entry = {
      id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      user: this.getCurrentUser()
    };

    // Add to memory (keep only last maxLogs entries)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    return entry;
  }

  // Get current user info from localStorage/context
  getCurrentUser() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          username: payload.username,
          role: payload.role
        };
      }
    } catch (e) {
      // Ignore token parsing errors
    }
    return null;
  }

  // Info level logging
  info(message, data = null) {
    const entry = this.createLogEntry('INFO', message, data);
    
    if (this.isDevelopment) {
      console.log(`ℹ️ [${entry.timestamp}] ${message}`, data || '');
    }
    
    return entry;
  }

  // Warning level logging
  warn(message, data = null) {
    const entry = this.createLogEntry('WARN', message, data);
    
    console.warn(`⚠️ [${entry.timestamp}] ${message}`, data || '');
    
    return entry;
  }

  // Error level logging
  error(message, error = null, data = null) {
    const entry = this.createLogEntry('ERROR', message, data, error);
    
    console.error(`🚨 [${entry.timestamp}] ${message}`);
    if (error) {
      console.error('Error details:', error);
    }
    if (data) {
      console.error('Additional data:', data);
    }
    
    return entry;
  }

  // Debug level logging (only in development)
  debug(message, data = null) {
    if (!this.isDevelopment) return null;
    
    const entry = this.createLogEntry('DEBUG', message, data);
    console.debug(`🔍 [${entry.timestamp}] ${message}`, data || '');
    
    return entry;
  }

  // API call logging
  apiCall(method, url, requestData = null, responseData = null, error = null, duration = null) {
    const message = `API ${method.toUpperCase()} ${url}`;
    const data = {
      method,
      url,
      requestData,
      responseData,
      duration,
      success: !error
    };

    if (error) {
      return this.error(`${message} - FAILED`, error, data);
    } else {
      return this.info(`${message} - SUCCESS`, data);
    }
  }

  // Component lifecycle logging
  componentLifecycle(componentName, lifecycle, data = null) {
    return this.debug(`Component ${componentName} - ${lifecycle}`, data);
  }

  // State change logging
  stateChange(componentName, stateName, oldValue, newValue) {
    return this.debug(`State Change in ${componentName}`, {
      stateName,
      oldValue,
      newValue
    });
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50, level = null) {
    let logs = this.logs.slice(-count);
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    return logs;
  }

  // Export logs for debugging
  exportLogs() {
    const logsData = {
      exportTime: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    };
    
    const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frontend-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    console.log('🧹 Frontend logs cleared');
  }
}

// Create singleton instance
const logger = new Logger();

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  logger.error('Unhandled JavaScript Error', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', event.reason, {
    promise: event.promise
  });
});

export default logger;
