const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const config = require('../config/env');

const pool = new Pool({ 
  connectionString: config.databaseUrl,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  if (config.nodeEnv === 'development') {
    // console.log('✅ Database connected successfully (Pool)');
  }
});

pool.on('error', (err) => {
  console.error('❌ Database disconnected with error:', err.message);
});

// Removed manual connection check since Serverless environments (Vercel) should rely on Prisma's internal lazy-connection handling on first query.

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
