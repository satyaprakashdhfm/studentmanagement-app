// Bulletproof API Service Singleton with connection monitoring
import logger from '../utils/logger';
import performanceMonitor from '../utils/performanceMonitor';
import { queueApiCall } from '../utils/sequentialLoader';

class RobustApiService {
  constructor() {
    if (RobustApiService.instance) {
      return RobustApiService.instance;
    }

    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
    this.authErrorHandler = null;
    this.currentToken = null;
    this.connectionHealthy = true;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.requestQueue = [];
    this.isProcessingQueue = false;

    // Bind methods to preserve context
    this.request = this.request.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
    this.processQueue = this.processQueue.bind(this);

    // Initialize connection monitoring
    this.initializeConnectionMonitoring();

    RobustApiService.instance = this;
    console.log('🔧 RobustApiService initialized');
  }

  // Initialize connection health monitoring (DISABLED FOR NOW)
  initializeConnectionMonitoring() {
    // DISABLED: Check connection health every 2 minutes (reduced from 30 seconds)
    // this.healthCheckInterval = setInterval(this.healthCheck, 120000);
    
    // Listen for online/offline events (only once per instance)
    if (!window.apiServiceListenersAdded) {
      window.addEventListener('online', () => {
        console.log('🌐 Network connection restored');
        this.connectionHealthy = true;
        this.retryCount = 0;
        this.processQueue();
      });

      window.addEventListener('offline', () => {
        console.log('🌐 Network connection lost');
        this.connectionHealthy = false;
      });

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
      
      window.apiServiceListenersAdded = true;
    }
  }

  // Health check to ensure backend connectivity
  async healthCheck() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (!this.connectionHealthy) {
          console.log('🌐 Backend connection restored');
          this.connectionHealthy = true;
          this.retryCount = 0;
          this.processQueue();
        }
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('🌐 Backend health check failed:', error.message);
      this.connectionHealthy = false;
    }
  }

  // Get current token with fallback mechanisms
  getCurrentToken() {
    // Try cache first
    if (this.currentToken) return this.currentToken;
    
    // Try sessionStorage (tab-specific)
    let token = sessionStorage.getItem('authToken');
    if (token) {
      this.currentToken = token;
      return token;
    }

    // Try localStorage as fallback
    const currentUsername = sessionStorage.getItem('currentUsername');
    if (currentUsername) {
      token = localStorage.getItem(`authToken_${currentUsername}`);
      if (token) {
        this.currentToken = token;
        sessionStorage.setItem('authToken', token);
        return token;
      }
    }

    return null;
  }

  // Set token with proper synchronization
  setCurrentToken(token) {
    this.currentToken = token;
    if (token) {
      sessionStorage.setItem('authToken', token);
    } else {
      sessionStorage.removeItem('authToken');
      this.currentToken = null;
    }
  }

  // Queue requests when connection is down
  queueRequest(endpoint, options) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        endpoint,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Clean old requests (older than 5 minutes)
      this.requestQueue = this.requestQueue.filter(
        req => Date.now() - req.timestamp < 300000
      );

      // Try to process queue
      this.processQueue();
    });
  }

  // Process queued requests
  async processQueue() {
    if (this.isProcessingQueue || !this.connectionHealthy || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 Processing ${this.requestQueue.length} queued requests`);

    while (this.requestQueue.length > 0 && this.connectionHealthy) {
      const queuedRequest = this.requestQueue.shift();
      try {
        const result = await this.executeRequest(queuedRequest.endpoint, queuedRequest.options);
        queuedRequest.resolve(result);
      } catch (error) {
        queuedRequest.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  // Execute actual HTTP request
  async executeRequest(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;
    const method = options.method || 'GET';
    const startTime = Date.now();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token
    const token = this.getCurrentToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.data = errorData;

        // Handle authentication errors
        if (response.status === 401 && this.authErrorHandler) {
          console.log('🔐 Authentication error detected, triggering logout');
          this.authErrorHandler();
        }

        // Log API error
        logger.apiCall(method, endpoint, 
          options.body ? JSON.parse(options.body) : null, 
          errorData, 
          error, 
          duration
        );

        throw error;
      }

      const responseData = await response.json();
      
      // Log successful API call
      logger.apiCall(method, endpoint, 
        options.body ? JSON.parse(options.body) : null, 
        responseData, 
        null, 
        duration
      );

      // Reset retry count on success
      this.retryCount = 0;
      this.connectionHealthy = true;

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Handle network errors
      if (error.name === 'AbortError') {
        error.message = 'Request timeout - please check your connection';
      }

      // Log network or parsing errors
      if (!error.status) {
        logger.apiCall(method, endpoint, 
          options.body ? JSON.parse(options.body) : null, 
          null, 
          error, 
          duration
        );
      }

      throw error;
    }
  }

  // Main request method with sequential loading
  async request(endpoint, options = {}) {
    // Track API call for performance monitoring
    performanceMonitor.trackApiCall();
    
    // Determine priority based on endpoint
    const priority = this.getRequestPriority(endpoint);
    
    // Queue the API call for sequential execution
    return queueApiCall(async () => {
      return this.executeRequest(endpoint, options);
    }, priority);
  }

  // Determine request priority
  getRequestPriority(endpoint) {
    // High priority for auth and critical data
    if (endpoint.includes('/auth/') || endpoint.includes('/profile')) {
      return 'high';
    }
    
    // Normal priority for everything else
    return 'normal';
  }

  // Direct request method (bypasses queue - use sparingly)
  async directRequest(endpoint, options = {}) {
    // Track API call for performance monitoring
    performanceMonitor.trackApiCall();
    
    // Check if we should queue the request
    if (!this.connectionHealthy && !navigator.onLine) {
      console.log('🔄 Queueing request due to connection issues:', endpoint);
      return this.queueRequest(endpoint, options);
    }

    try {
      return await this.executeRequest(endpoint, options);
    } catch (error) {
      // Retry logic for network errors
      if (this.retryCount < this.maxRetries && (!error.status || error.status >= 500)) {
        this.retryCount++;
        console.log(`🔄 Retrying request (${this.retryCount}/${this.maxRetries}):`, endpoint);
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, this.retryCount) * 1000));
        
        return this.request(endpoint, options);
      }

      // Mark connection as unhealthy for certain errors
      if (!error.status || error.status >= 500) {
        this.connectionHealthy = false;
      }

      throw error;
    }
  }

  // Set auth error handler
  setAuthErrorHandler(handler) {
    this.authErrorHandler = handler;
  }

  // Cleanup method
  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.requestQueue = [];
    console.log('🔧 RobustApiService cleaned up');
  }

  // Generic HTTP methods
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Authentication methods
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getUserProfile() {
    return this.request('/auth/profile');
  }

  // All other API methods (copy from original api.js)
  async getUsers() { return this.request('/users'); }
  async getStudents() { return this.request('/students'); }
  async getTeachers() { return this.request('/teachers'); }
  async getTeacher(teacherId) { return this.request(`/teachers/${teacherId}`); }
  async getClasses() { return this.request('/classes'); }
  async getSubjects() { return this.request('/subjects'); }
  // ... (add all other methods as needed)
}

// Create and export singleton instance
const robustApiService = new RobustApiService();
export default robustApiService;
