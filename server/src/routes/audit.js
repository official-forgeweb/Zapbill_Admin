const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit - List audit logs
router.get('/', authenticate, async (req, res) => {
  try {
    const { admin_id, action, entity_type, page = 1, limit = 50, start_date, end_date } = req.query;
    const where = {};

    if (admin_id) where.admin_id = admin_id;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entity_type) where.entity_type = entity_type;
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at.gte = new Date(start_date);
      if (end_date) where.created_at.lte = new Date(end_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.audit_logs.count({ where }),
    ]);

    // Enrich with admin names
    const adminIds = [...new Set(logs.map(l => l.admin_id))];
    const admins = await prisma.admins.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true, email: true },
    });
    const adminMap = Object.fromEntries(admins.map(a => [a.id, a]));

    const enrichedLogs = logs.map(l => ({
      ...l,
      admin: adminMap[l.admin_id] || { name: 'Unknown', email: '' },
      old_data: l.old_data ? JSON.parse(l.old_data) : null,
      new_data: l.new_data ? JSON.parse(l.new_data) : null,
    }));

    res.json({ logs: enrichedLogs, total });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
