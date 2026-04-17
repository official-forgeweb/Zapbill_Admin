const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const router = express.Router();

// GET /api/features - List all features
router.get('/', authenticate, async (req, res) => {
  try {
    const features = await prisma.features.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { client_features: true } },
      },
    });
    res.json({ features });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// POST /api/features - Create feature
router.post('/', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      feature_key, feature_name, description, version,
      is_free, monthly_price, yearly_price,
      plugin_filename, plugin_hash, plugin_size,
      depends_on
    } = req.body;

    if (!feature_key || !feature_name) {
      return res.status(400).json({ error: 'feature_key and feature_name are required' });
    }

    const feature = await prisma.features.create({
      data: {
        feature_key,
        feature_name,
        description: description || null,
        version: version || '1.0.0',
        is_free: is_free || false,
        monthly_price: monthly_price || 0,
        yearly_price: yearly_price || 0,
        plugin_filename: plugin_filename || null,
        plugin_hash: plugin_hash || null,
        plugin_size: plugin_size || null,
        depends_on: depends_on || [],
      },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'CREATE_FEATURE',
      entityType: 'feature',
      entityId: feature.id,
      newData: feature,
      ipAddress: req.ip,
    });

    res.status(201).json({ feature });
  } catch (error) {
    console.error('Create feature error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Feature key already exists' });
    }
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

// PUT /api/features/:id - Update feature
router.put('/:id', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const old = await prisma.features.findUnique({ where: { id: req.params.id } });
    if (!old) return res.status(404).json({ error: 'Feature not found' });

    const feature = await prisma.features.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'UPDATE_FEATURE',
      entityType: 'feature',
      entityId: feature.id,
      oldData: old,
      newData: req.body,
      ipAddress: req.ip,
    });

    res.json({ feature });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// DELETE /api/features/:id
router.delete('/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await prisma.features.delete({ where: { id: req.params.id } });

    await logAudit({
      adminId: req.admin.id,
      action: 'DELETE_FEATURE',
      entityType: 'feature',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ message: 'Feature deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

module.exports = router;
