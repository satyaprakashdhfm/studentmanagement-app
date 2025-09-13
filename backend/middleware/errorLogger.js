const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced error logging middleware
const errorLogger = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Detailed error information
  const errorInfo = {
    errorId,
    timestamp,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user ? { username: req.user.username, role: req.user.role } : null,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode || 500
    }
  };

  // Console logging with colors and emojis
  console.error(`\n🚨 [ERROR ${errorId}] ${timestamp}`);
  console.error(`   🔴 ${err.name}: ${err.message}`);
  console.error(`   📍 ${req.method} ${req.url}`);
  console.error(`   👤 User: ${req.user ? `${req.user.username} (${req.user.role})` : 'Anonymous'}`);
  console.error(`   🌍 IP: ${req.ip || req.connection.remoteAddress}`);
  
  if (err.code) {
    console.error(`   🏷️  Error Code: ${err.code}`);
  }
  
  if (Object.keys(req.body).length > 0) {
    console.error(`   📦 Request Body:`, JSON.stringify(req.body, null, 2));
  }
  
  if (Object.keys(req.query).length > 0) {
    console.error(`   🔍 Query Params:`, JSON.stringify(req.query, null, 2));
  }
  
  console.error(`   📚 Stack Trace:`);
  console.error(err.stack);
  console.error(`\n`);

  // File logging
  const logFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
  const logEntry = JSON.stringify(errorInfo, null, 2) + '\n\n';
  
  fs.appendFile(logFile, logEntry, (writeErr) => {
    if (writeErr) {
      console.error('Failed to write to error log file:', writeErr);
    }
  });

  // Database errors - specific handling
  if (err.code && err.code.startsWith('P')) {
    console.error(`   🗄️  Prisma Error Code: ${err.code}`);
    console.error(`   📝 Prisma Meta:`, err.meta);
  }

  // Send appropriate error response
  if (!res.headersSent) {
    const statusCode = err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(statusCode).json({
      success: false,
      error: isDevelopment ? err.message : 'Internal server error',
      errorId: errorId,
      ...(isDevelopment && { stack: err.stack, details: err })
    });
  }

  next();
};

// Request tracking middleware for debugging
const requestTracker = (req, res, next) => {
  const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;

  // Track request start time
  req.startTime = Date.now();

  // Log all API requests with detailed information
  const timestamp = new Date().toISOString();
  console.log(`\n🌐 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`   📱 User-Agent: ${req.get('User-Agent')?.substring(0, 50)}...`);
  console.log(`   🔑 Auth: ${req.headers.authorization ? 'Bearer ***' : 'None'}`);
  console.log(`   🌍 IP: ${req.ip || req.connection.remoteAddress}`);

  // Log query parameters as JSON
  if (Object.keys(req.query).length > 0) {
    console.log(`   🔍 Query:`, JSON.stringify(req.query, null, 2));
  }

  // Log request body for POST/PUT/PATCH (but limit size)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    const bodyStr = JSON.stringify(req.body, null, 2);
    if (bodyStr.length > 500) {
      console.log(`   � Body: ${bodyStr.substring(0, 500)}... (truncated)`);
    } else {
      console.log(`   📦 Body:`, bodyStr);
    }
  }

  // Override res.json to track response data
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - req.startTime;

    console.log(`   ✅ Response: ${res.statusCode} ${res.statusMessage || ''}`);

    // Log response data
    if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      console.log(`   � Response Keys: [${keys.join(', ')}]`);

      // Show pagination info if present
      if (data.pagination) {
        const { page, limit, total, pages } = data.pagination;
        console.log(`   📄 Pagination: page ${page}/${pages}, total: ${total}`);
      }

      // Show response JSON (first 10 lines or limited size)
      const responseStr = JSON.stringify(data, null, 2);
      const lines = responseStr.split('\n');
      const previewLines = lines.slice(0, 10);

      if (lines.length > 10) {
        console.log(`   � Response JSON (first 10 lines):`);
        previewLines.forEach(line => console.log(`      ${line}`));
        console.log(`      ... (${lines.length - 10} more lines)`);
      } else if (responseStr.length > 1000) {
        console.log(`   📄 Response JSON (truncated): ${responseStr.substring(0, 1000)}...`);
      } else {
        console.log(`   📄 Response JSON:`, responseStr);
      }
    }

    console.log(`   ⏱️  Duration: ${duration}ms\n`);

    return originalJson.call(this, data);
  };

  next();
};

module.exports = { errorLogger, requestTracker };
