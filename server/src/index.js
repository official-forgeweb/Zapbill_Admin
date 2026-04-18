require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const prisma = require('./lib/prisma');

const app = express();

console.log('--- Server Starting ---');
console.log('Node Env:', process.env.NODE_ENV);
console.log('Vercel Env:', process.env.VERCEL);
console.log('DB URL Present:', !!process.env.DATABASE_URL);
console.log('JWT Secret Present:', !!process.env.JWT_SECRET);
console.log('-----------------------');

// Trust proxy for rate limiting behind Railway/Render
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const origin = req.headers.origin || 'no-origin';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`${timestamp} | ${req.method} | ${req.originalUrl} | IP: ${req.ip} | Origin: ${origin} | ${res.statusCode} | ${duration}ms`);
  });
  next();
});

// Advanced CORS setup
const allowedOrigins = config.allowedOrigins;
const allowedHeaders = [
  'Content-Type', 'Authorization', 'X-License-Key', 'X-License-Secret', 
  'X-Hardware-ID', 'X-API-Key', 'X-Restaurant-ID', 'X-App-Version', 'X-Timestamp'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests with no origin (ZapBill Electron app, server-to-server)
      return callback(null, true);
    }
    
    // Allow if exact match or if subdomain of zapbill.com
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.zapbill.com') ||
                      origin === 'https://admin.zapbill.com'; 

    if (isAllowed) {
      return callback(null, true);
    }
    // Block unknown origins
    console.warn(`Blocked request from unknown origin: ${origin}`);
    callback(new Error('Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: allowedHeaders,
  optionsSuccessStatus: 204
}));

app.options(/.*/, cors());

// Rate Limiting Config
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const activationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many activation attempts, please try again after an hour.' }
});

const heartbeatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 50
});

const pollLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 20
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10
});

// Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/ping', (req, res) => {
  res.status(200).json({ pong: true, server_time: new Date().toISOString() });
});

// Apply Rate Limits before routing
app.use('/api/', generalLimiter);
app.use('/api/sync/activate', activationLimiter);
app.use('/api/sync/heartbeat', heartbeatLimiter);
app.use('/api/v1/wo/internal/poll', pollLimiter); // or just /v1/wo/internal/poll
app.use('/v1/wo/internal/poll', pollLimiter); // Added for fallback based on route structure
app.use('/api/admin/login', adminLoginLimiter);

// Routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const licenseRoutes = require('./routes/licenses');
const deviceRoutes = require('./routes/devices');
const featureRoutes = require('./routes/features');
const planRoutes = require('./routes/plans');
const amcRoutes = require('./routes/amc');
const auditRoutes = require('./routes/audit');
const dashboardRoutes = require('./routes/dashboard');
const syncRoutes = require('./routes/sync');
const woAdminRoutes = require('./routes/website-orders-admin');
const woApiRoutes = require('./routes/website-orders-api');

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/amc', amcRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/website-orders', woAdminRoutes);
app.use('/v1/wo', woApiRoutes);

// Fallback for not found
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.message !== 'Origin not allowed') {
    console.error(`[ERROR] ${new Date().toISOString()} | ${req.method} ${req.url} -`, err);
  }

  // Handle known errors
  if (err.message === 'Origin not allowed') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (err.name === 'UnauthorizedError' || err.message.includes('expired')) {
    return res.status(401).json({ error: 'Session expired, please login again' });
  }

  if (err.message.includes('Invalid license')) {
    return res.status(401).json({ error: 'Invalid license' });
  }

  if (err.statusCode === 429) {
    return res.status(429).json({ error: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: 'Validation error', details: err.message });
  }

  // Generic 500 for unhandled errors
  res.status(500).json({ 
    error: 'Internal server error', 
    message: config.nodeEnv === 'production' ? 'An unexpected error occurred' : err.message 
  });
});

const PORT = config.port;

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 ZapBill Admin Server running on port ${PORT}`);
  });

  // Graceful Shutdown
  function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    const forceShutdown = setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);

    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await prisma.$disconnect();
        console.log('Database connections closed.');
      } catch (dbErr) {
        console.error('Error closing DB connection', dbErr);
      }
      clearTimeout(forceShutdown);
      console.log('Server shutting down gracefully');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Export the Express API for Vercel serverless execution
module.exports = app;
