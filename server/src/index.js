require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('./lib/prisma');
const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 ZapBill Admin Server running on port ${PORT}`);
});

module.exports = { app, prisma };
