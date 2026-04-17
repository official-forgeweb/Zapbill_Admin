const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');
const qrBridge = require('../lib/qrServerBridge');

const router = express.Router();

// GET /api/amc/payments - List all AMC payments
router.get('/payments', authenticate, async (req, res) => {
  try {
    const { client_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (client_id) where.client_id = client_id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      prisma.amc_payments.findMany({
        where,
        include: {
          client: { select: { id: true, business_name: true, email: true } },
        },
        orderBy: { payment_date: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.amc_payments.count({ where }),
    ]);

    res.json({ payments, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AMC payments' });
  }
});

// POST /api/amc/payments - Record AMC payment
router.post('/payments', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      client_id, amount, payment_date, payment_proof,
      period_start, period_end, payment_mode, transaction_id, notes
    } = req.body;

    if (!client_id || !amount || !period_start || !period_end || !payment_mode) {
      return res.status(400).json({ error: 'Required: client_id, amount, period_start, period_end, payment_mode' });
    }

    const payment = await prisma.$transaction(async (tx) => {
      // Create payment record
      const p = await tx.amc_payments.create({
        data: {
          client_id,
          amount: parseFloat(amount),
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          payment_proof: payment_proof || null,
          period_start: new Date(period_start),
          period_end: new Date(period_end),
          payment_mode,
          transaction_id: transaction_id || null,
          notes: notes || null,
          received_by: req.admin.id,
        },
      });

      // Update client AMC status
      await tx.clients.update({
        where: { id: client_id },
        data: {
          amc_status: 'active',
          amc_start_date: new Date(period_start),
          amc_end_date: new Date(period_end),
        },
      });

      return p;
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'RECORD_AMC_PAYMENT',
      entityType: 'amc_payment',
      entityId: payment.id,
      newData: { client_id, amount, period_start, period_end },
      ipAddress: req.ip,
    });

    // Push updated AMC info to QR Server so local POS gets correct AMC dates immediately
    const now = new Date();
    const amcEndDate = new Date(period_end);
    const amcDaysRemaining = Math.ceil((amcEndDate - now) / (1000 * 60 * 60 * 24));

    await qrBridge.notifyAllClientDevices(prisma, client_id, (licenseKey, hardwareId) =>
      qrBridge.updateAmcStatus(licenseKey, hardwareId, {
        amc_status: 'active',
        amc_start_date: new Date(period_start).toISOString(),
        amc_end_date: amcEndDate.toISOString(),
        amc_days_remaining: amcDaysRemaining,
      })
    );

    res.status(201).json({ payment, message: 'AMC payment recorded and client status updated' });
  } catch (error) {
    console.error('Record AMC payment error:', error);
    res.status(500).json({ error: 'Failed to record AMC payment' });
  }
});

// GET /api/amc/expiring - Clients with AMC expiring soon
router.get('/expiring', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const expiring = await prisma.clients.findMany({
      where: {
        amc_status: 'active',
        amc_end_date: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      orderBy: { amc_end_date: 'asc' },
    });

    res.json({ clients: expiring });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expiring AMCs' });
  }
});

// GET /api/amc/expired - Clients with expired AMC
router.get('/expired', authenticate, async (req, res) => {
  try {
    const now = new Date();

    // Also update any that should be expired
    await prisma.clients.updateMany({
      where: {
        amc_status: 'active',
        amc_end_date: { lt: now },
      },
      data: { amc_status: 'expired' },
    });

    const expired = await prisma.clients.findMany({
      where: { amc_status: 'expired' },
      orderBy: { amc_end_date: 'desc' },
    });

    res.json({ clients: expired });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expired AMCs' });
  }
});

// GET /api/amc/report - AMC collection report
router.get('/report', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;
    const where = {};

    if (year && month) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.payment_date = { gte: start, lte: end };
    } else if (year) {
      const start = new Date(parseInt(year), 0, 1);
      const end = new Date(parseInt(year), 11, 31, 23, 59, 59);
      where.payment_date = { gte: start, lte: end };
    }

    const payments = await prisma.amc_payments.findMany({
      where,
      include: {
        client: { select: { business_name: true, email: true } },
      },
      orderBy: { payment_date: 'desc' },
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({ payments, totalAmount, count: payments.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate AMC report' });
  }
});

module.exports = router;
