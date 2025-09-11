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

// Enhanced Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const auth = req.get('Authorization') ? 'Bearer ***' : 'No Auth';
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`\n🌐 [${timestamp}] ${method} ${url}`);
  console.log(`   📱 User-Agent: ${userAgent.substring(0, 50)}...`);
  console.log(`   🔑 Auth: ${auth}`);
  console.log(`   🌍 IP: ${ip}`);
  
  if (Object.keys(req.body).length > 0) {
    console.log(`   📦 Body:`, JSON.stringify(req.body, null, 2));
  }

  if (Object.keys(req.query).length > 0) {
    console.log(`   🔍 Query:`, JSON.stringify(req.query, null, 2));
  }

  // Capture response with detailed logging
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`   ✅ Response: ${res.statusCode} ${res.statusMessage}`);
      
      // Log response data structure for debugging
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsedData && typeof parsedData === 'object') {
          const keys = Object.keys(parsedData);
          console.log(`   📊 Response Keys: [${keys.join(', ')}]`);
          
          if (parsedData.data && Array.isArray(parsedData.data)) {
            console.log(`   📈 Data Array Length: ${parsedData.data.length}`);
          }
          
          if (parsedData.pagination) {
            console.log(`   📄 Pagination: page ${parsedData.pagination.page}/${parsedData.pagination.pages}, total: ${parsedData.pagination.total}`);
          }
        }
      } catch (e) {
        console.log(`   📊 Response Size: ${data ? data.length : 0} chars`);
      }
    } else if (res.statusCode >= 400) {
      console.log(`   ❌ Error Response: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   💥 Error Data:`, data);
    }
    
    console.log(`   ⏱️  Duration: ${duration}ms\n`);
    return originalSend.call(this, data);
  };
  
  req.startTime = Date.now();
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
