const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - Dashboard stats
router.get('/', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Auto-expire AMCs
    await prisma.clients.updateMany({
      where: {
        amc_status: 'active',
        amc_end_date: { lt: now },
      },
      data: { amc_status: 'expired' },
    });

    const [
      totalClients,
      activeClients,
      activeAmcs,
      expiringAmcs,
      expiredAmcs,
      totalDevices,
      activeDevices,
      amcPaymentsThisMonth,
      recentClients,
      recentActivity,
    ] = await Promise.all([
      prisma.clients.count(),
      prisma.clients.count({ where: { status: 'active' } }),
      prisma.clients.count({ where: { amc_status: 'active' } }),
      prisma.clients.count({
        where: {
          amc_status: 'active',
          amc_end_date: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.clients.count({ where: { amc_status: 'expired' } }),
      prisma.devices.count(),
      prisma.devices.count({ where: { is_active: true } }),
      prisma.amc_payments.findMany({
        where: {
          payment_date: { gte: thisMonthStart, lte: thisMonthEnd },
        },
      }),
      prisma.clients.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true, business_name: true, owner_name: true, plan_type: true,
          amc_status: true, created_at: true,
        },
      }),
      prisma.audit_logs.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    // Revenue calculation
    const amcRevenueThisMonth = amcPaymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

    // Get plan distribution
    const planDistribution = await prisma.clients.groupBy({
      by: ['plan_type'],
      _count: { plan_type: true },
    });

    // AMC status distribution
    const amcDistribution = await prisma.clients.groupBy({
      by: ['amc_status'],
      _count: { amc_status: true },
    });

    // Monthly revenue for chart (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const payments = await prisma.amc_payments.aggregate({
        where: { payment_date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      });
      monthlyRevenue.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: payments._sum.amount || 0,
      });
    }

    // Enrich activity with admin names
    const adminIds = [...new Set(recentActivity.map(a => a.admin_id))];
    const admins = await prisma.admins.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true },
    });
    const adminMap = Object.fromEntries(admins.map(a => [a.id, a.name]));

    const enrichedActivity = recentActivity.map(a => ({
      ...a,
      admin_name: adminMap[a.admin_id] || 'Unknown',
    }));

    res.json({
      stats: {
        totalClients,
        activeClients,
        activeAmcs,
        expiringAmcs,
        expiredAmcs,
        totalDevices,
        activeDevices,
        amcRevenueThisMonth,
      },
      planDistribution: planDistribution.map(p => ({
        name: p.plan_type,
        count: p._count.plan_type,
      })),
      amcDistribution: amcDistribution.map(a => ({
        name: a.amc_status,
        count: a._count.amc_status,
      })),
      monthlyRevenue,
      recentClients,
      recentActivity: enrichedActivity,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
