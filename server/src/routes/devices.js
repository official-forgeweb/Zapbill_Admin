const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const router = express.Router();

// GET /api/devices - List all devices
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, is_active, page = 1, limit = 20 } = req.query;
    const where = {};

    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where.OR = [
        { device_name: { contains: search, mode: 'insensitive' } },
        { hardware_id: { contains: search, mode: 'insensitive' } },
        { client: { business_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [devices, total] = await Promise.all([
      prisma.devices.findMany({
        where,
        include: {
          client: { select: { id: true, business_name: true, email: true } },
          license: { select: { id: true, license_key: true } },
        },
        orderBy: { registered_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.devices.count({ where }),
    ]);

    res.json({ devices, total });
  } catch (error) {
    console.error('List devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// POST /api/devices/:id/deactivate - Force deactivate a device
router.post('/:id/deactivate', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const device = await prisma.devices.update({
      where: { id: req.params.id },
      data: { is_active: false },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'DEACTIVATE_DEVICE',
      entityType: 'device',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ device, message: 'Device deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate device' });
  }
});

// POST /api/devices/:id/activate
router.post('/:id/activate', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const device = await prisma.devices.update({
      where: { id: req.params.id },
      data: { is_active: true },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'ACTIVATE_DEVICE',
      entityType: 'device',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ device, message: 'Device activated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate device' });
  }
});

module.exports = router;
