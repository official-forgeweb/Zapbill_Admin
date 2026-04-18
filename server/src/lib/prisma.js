const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const config = require('../config/env');

const pool = new Pool({ 
  connectionString: config.databaseUrl,
  min: 2,
  max: 10,
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

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('✅ Database connected successfully');
      return;
    } catch (err) {
      console.error(`⚠️ Database connection failed. Retrying in ${delay / 1000}s... (${i + 1}/${retries})`);
      if (i === retries - 1) {
        console.error('❌ Could not connect to database after maximum retries');
        // Do not necessarily exit here, let Prisma or Express handle errors
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

connectWithRetry();

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
