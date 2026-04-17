const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const router = express.Router();

// GET /api/plans - List all plans
router.get('/', authenticate, async (req, res) => {
  try {
    const plans = await prisma.plans.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /api/plans - Create plan
router.post('/', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      plan_key, plan_name, description,
      one_time_price, amc_price_per_year,
      max_devices, features
    } = req.body;

    if (!plan_key || !plan_name) {
      return res.status(400).json({ error: 'plan_key and plan_name are required' });
    }

    const plan = await prisma.plans.create({
      data: {
        plan_key,
        plan_name,
        description: description || null,
        one_time_price: one_time_price || 0,
        amc_price_per_year: amc_price_per_year || 0,
        max_devices: max_devices || 1,
        features: features || [],
      },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'CREATE_PLAN',
      entityType: 'plan',
      entityId: plan.id,
      newData: plan,
      ipAddress: req.ip,
    });

    res.status(201).json({ plan });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Plan key already exists' });
    }
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// PUT /api/plans/:id - Update plan
router.put('/:id', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const old = await prisma.plans.findUnique({ where: { id: req.params.id } });
    if (!old) return res.status(404).json({ error: 'Plan not found' });

    const plan = await prisma.plans.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'UPDATE_PLAN',
      entityType: 'plan',
      entityId: plan.id,
      oldData: old,
      newData: req.body,
      ipAddress: req.ip,
    });

    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// DELETE /api/plans/:id
router.delete('/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await prisma.plans.delete({ where: { id: req.params.id } });

    await logAudit({
      adminId: req.admin.id,
      action: 'DELETE_PLAN',
      entityType: 'plan',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

module.exports = router;
