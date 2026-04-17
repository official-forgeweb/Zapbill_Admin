const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');
const { generateLicenseKey, generateLicenseSecret } = require('../lib/license');
const qrBridge = require('../lib/qrServerBridge');

const router = express.Router();

// GET /api/licenses - List all licenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, is_active, page = 1, limit = 20 } = req.query;
    const where = {};

    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where.OR = [
        { license_key: { contains: search, mode: 'insensitive' } },
        { client: { business_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [licenses, total] = await Promise.all([
      prisma.licenses.findMany({
        where,
        include: {
          client: { select: { id: true, business_name: true, email: true } },
          devices: { select: { id: true, device_name: true, is_active: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.licenses.count({ where }),
    ]);

    res.json({ licenses, total });
  } catch (error) {
    console.error('List licenses error:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// POST /api/licenses/:id/regenerate - Regenerate license credentials
router.post('/:id/regenerate', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const license = await prisma.licenses.findUnique({ where: { id: req.params.id } });
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    const newKey = generateLicenseKey();
    const newSecretPlain = generateLicenseSecret();
    const newSecretHash = await bcrypt.hash(newSecretPlain, 12);

    await prisma.licenses.update({
      where: { id: req.params.id },
      data: {
        license_key: newKey,
        license_secret: newSecretHash,
        device_id: null,
        device_name: null,
        activated_at: null,
      },
    });

    // Force logout from local POS since old credentials are now invalid
    if (license.device_id) {
      await qrBridge.forceLogout(license.license_key, license.device_id, 'license_regenerated');
    }

    await logAudit({
      adminId: req.admin.id,
      action: 'REGENERATE_LICENSE',
      entityType: 'license',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({
      credentials: {
        license_key: newKey,
        license_secret: newSecretPlain,
        message: 'IMPORTANT: Save these credentials now. The secret will NOT be shown again.',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate license' });
  }
});

// POST /api/licenses/:id/toggle - Activate/deactivate license
router.post('/:id/toggle', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const license = await prisma.licenses.findUnique({ where: { id: req.params.id } });
    if (!license) return res.status(404).json({ error: 'License not found' });

    const updated = await prisma.licenses.update({
      where: { id: req.params.id },
      data: { is_active: !license.is_active },
    });

    // If license was deactivated, force logout from local POS
    if (!updated.is_active && license.device_id) {
      await qrBridge.forceLogout(license.license_key, license.device_id, 'license_deactivated');
    }

    await logAudit({
      adminId: req.admin.id,
      action: updated.is_active ? 'ACTIVATE_LICENSE' : 'DEACTIVATE_LICENSE',
      entityType: 'license',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ license: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle license' });
  }
});

// POST /api/licenses/:id/unbind - Unbind device from license
router.post('/:id/unbind', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const updated = await prisma.licenses.update({
      where: { id: req.params.id },
      data: { device_id: null, device_name: null, activated_at: null },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'UNBIND_DEVICE',
      entityType: 'license',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ license: updated, message: 'Device unbound successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unbind device' });
  }
});

module.exports = router;
