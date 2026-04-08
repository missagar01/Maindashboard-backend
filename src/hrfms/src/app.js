const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const employeeRoutes = require('./routes/employeeRoutes');
const requestRoutes = require('./routes/requestRoutes');
const ticketBookRoutes = require('./routes/ticketBookRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const planeVisitorRoutes = require('./routes/planeVisitorRoutes');
const gatePassRoutes = require('./routes/gatePassRoutes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Honor proxy headers so req.protocol/req.get('host') reflect the client-facing address
app.set('trust proxy', true);

// ⚡ PERFORMANCE: Response compression (70-85% size reduction)
app.use(compression({
  level: 6,              // Good balance between speed and compression
  threshold: 1024,       // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;      // Skip if client doesn't want compression
    }
    return compression.filter(req, res);
  }
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));
app.use(express.urlencoded({ extended: true }));

// JSON parsing hack for text/plain bodies (Postman support)
app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    const trimmedBody = req.body.trim();
    if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
      try {
        req.body = JSON.parse(req.body);
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
      }
    }
  }
  return next();
});

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve static files (uploaded images)
const uploadsPath = path.join(process.cwd(), 'uploads');
const resolveLegacyUploadAlias = (requestPath) => {
  const normalizedRequestPath = String(requestPath || '')
    .split('?')[0]
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!normalizedRequestPath) {
    return null;
  }

  const segments = normalizedRequestPath.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const folder = String(segments[0] || '').toLowerCase();
  const filename = path.posix.basename(segments[segments.length - 1] || '');

  if (!filename) {
    return null;
  }

  if (folder === 'employees' && /^user-profile-/i.test(filename)) {
    const aliasedFilePath = path.join(uploadsPath, 'users', filename);
    return fs.existsSync(aliasedFilePath) ? aliasedFilePath : null;
  }

  if (folder === 'users' && /^employee-profile-/i.test(filename)) {
    const aliasedFilePath = path.join(uploadsPath, 'employees', filename);
    return fs.existsSync(aliasedFilePath) ? aliasedFilePath : null;
  }

  return null;
};

app.use('/uploads', (req, res, next) => {
  const aliasedFilePath = resolveLegacyUploadAlias(req.path);
  if (!aliasedFilePath) {
    return next();
  }

  return res.sendFile(aliasedFilePath);
});

app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/employees', employeeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tickets', ticketBookRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/plant-visitors', planeVisitorRoutes);
app.use('/api/gatepasses', gatePassRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
