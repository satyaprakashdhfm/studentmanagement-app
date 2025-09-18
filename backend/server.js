const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const { errorLogger, requestTracker } = require('./middleware/errorLogger');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const userRoutes = require('./routes/users');
const teacherRoutes = require('./routes/teachers');
const classRoutes = require('./routes/classes');
const subjectRoutes = require('./routes/subjects');
const attendanceRoutes = require('./routes/attendance');
const markRoutes = require('./routes/marks');
const feeRoutes = require('./routes/fees');
const syllabusRoutes = require('./routes/syllabus');
const calendarRoutes = require('./routes/calendar');
const timeManagementRoutes = require('./routes/timemanagement');
const reactivationRoutes = require('./routes/reactivation');
const healthRoutes = require('./routes/health');

// Import database connection
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add request tracking middleware
app.use(requestTracker);

// Performance & Memory monitoring
let requestCount = 0;
let lastMemoryCheck = Date.now();

// Simplified Request logging with performance monitoring
app.use((req, res, next) => {
  req.startTime = Date.now();
  requestCount++;
  
  // Simple request log
  const authHeader = req.get('Authorization');
  const hasAuth = authHeader ? '🔑' : '🔓';
  console.log(`${hasAuth} ${req.method} ${req.originalUrl} (#${requestCount})`);

  // Memory check every 50 requests
  if (requestCount % 50 === 0) {
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    console.log(`📊 Memory: ${memMB}MB | Requests: ${requestCount} | Uptime: ${Math.round(process.uptime())}s`);
    
    // Warn if memory usage is high
    if (memMB > 500) {
      console.log(`⚠️  HIGH MEMORY USAGE: ${memMB}MB - Consider restarting`);
    }
  }

  // Capture response with simple logging
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Only log slow requests or errors
      if (duration > 1000) {
        console.log(`   🐌 SLOW: ${res.statusCode} (${duration}ms)`);
      } else if (duration > 100) {
        console.log(`   ⚡ ${res.statusCode} (${duration}ms)`);
      } else {
        console.log(`   ✅ ${res.statusCode} (${duration}ms)`);
      }
    } else {
      console.log(`   ❌ ${res.statusCode} (${duration}ms)`);
      // Log error details for debugging
      try {
        const errorData = typeof data === 'string' ? JSON.parse(data) : data;
        if (errorData?.error) {
          console.log(`   💥 Error: ${errorData.error}`);
        }
      } catch (e) {
        console.log(`   💥 Error: ${data}`);
      }
    }
    
    return originalSend.call(this, data);
  };

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Student Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Health check route (no authentication required)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/timemanagement', timeManagementRoutes);
app.use('/api/reactivation', reactivationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler - use our enhanced error logger
app.use(errorLogger);

// Test database connection and start server
testConnection()
  .then(() => {
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
