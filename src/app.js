const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");

const sharedAuthRoutes = require("./auth/routes/login.routes.js");
const rootRoutes = require("./routes/root.routes.js");
const batchcodeApp = require("./batchcode/app.cjs");
const leadToOrderRoutes = require("./lead-to-order/routes/index.js");
const o2dRoutes = require("./o2d/routes/index.js");

const corsOriginsEnv = process.env.CORS_ORIGINS;
const corsOrigins = corsOriginsEnv
  ? corsOriginsEnv.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["*"];

// Log CORS configuration on startup
console.log('🔒 CORS Configuration:', {
  enabled: true,
  allowedOrigins: corsOrigins.includes("*") ? "ALL (*)" : corsOrigins,
  credentials: true
});

// CORS configuration - simplified and explicit
const corsOptions = corsOrigins.includes("*")
  ? { 
      origin: true, // Allow all origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      preflightContinue: false,
      optionsSuccessStatus: 200 // Some browsers expect 200 for OPTIONS
    }
  : { 
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, curl)
        if (!origin) {
          return callback(null, true);
        }
        // Check if origin is in allowed list
        if (corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS: Origin ${origin} not allowed. Allowed origins: ${corsOrigins.join(', ')}`);
          callback(null, false); // Return false instead of error to allow CORS middleware to handle it
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      preflightContinue: false,
      optionsSuccessStatus: 200 // Some browsers expect 200 for OPTIONS
    };

const apiRouter = express.Router();
apiRouter.use("/o2d", o2dRoutes);
apiRouter.use("/lead-to-order", leadToOrderRoutes);
apiRouter.use("/batchcode", batchcodeApp);
apiRouter.use("/auth", sharedAuthRoutes);

const app = express();
app.set("trust proxy", 1);

// CORS must be applied FIRST, before any other middleware
app.use(cors(corsOptions));

// Configure helmet to work with CORS (must come after CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to ensure CORS headers are set on all responses
app.use((req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json to ensure CORS headers are set
  res.json = function(data) {
    const origin = req.headers.origin;
    if (origin) {
      const isAllowed = corsOrigins.includes("*") || corsOrigins.includes(origin);
      if (isAllowed && !res.getHeader('Access-Control-Allow-Origin')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    } else if (corsOrigins.includes("*") && !res.getHeader('Access-Control-Allow-Origin')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    return originalJson(data);
  };
  
  next();
});

// Serve uploaded images from /uploads path (MUST be before /api routes)
// This allows images to be accessible at /uploads/... directly
const uploadsPath = path.join(process.cwd(), "uploads");
console.log('📁 Static uploads path:', uploadsPath);
app.use("/uploads", express.static(uploadsPath, {
  dotfiles: 'ignore',
  etag: true,
  lastModified: true,
  maxAge: '1d'
}));

app.use("/api", apiRouter);

// Root routes (non-/api routes)
app.use("/", rootRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler - MUST be last middleware
// This ensures CORS headers are always sent, even on errors
app.use((err, req, res, next) => {
  // Log the error
  console.error('❌ Error:', err.message);
  if (err.stack) {
    console.error('Stack:', err.stack);
  }
  
  // Ensure CORS headers are ALWAYS set, even on errors
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = corsOrigins.includes("*") || corsOrigins.includes(origin);
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    }
  } else if (corsOrigins.includes("*")) {
    // If allowing all origins and no origin header, set wildcard
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Send error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
