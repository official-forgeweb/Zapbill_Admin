const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');
const { generateLicenseKey, generateLicenseSecret } = require('../lib/license');
const qrBridge = require('../lib/qrServerBridge');

const router = express.Router();

// GET /api/clients - List all clients
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, amc_status, plan_type, status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { business_name: { contains: search, mode: 'insensitive' } },
        { owner_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (amc_status) where.amc_status = amc_status;
    if (plan_type) where.plan_type = plan_type;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [clients, total] = await Promise.all([
      prisma.clients.findMany({
        where,
        include: {
          licenses: { select: { id: true, license_key: true, is_active: true } },
          devices: { select: { id: true, is_active: true, last_seen: true } },
          _count: { select: { client_features: true, amc_payments: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.clients.count({ where }),
    ]);

    // Auto-update AMC status based on dates
    const now = new Date();
    const updatedClients = clients.map(c => {
      if (c.amc_end_date && new Date(c.amc_end_date) < now && c.amc_status === 'active') {
        // Mark as expired in response (we'll batch update separately)
        return { ...c, amc_status: 'expired' };
      }
      return c;
    });

    res.json({ clients: updatedClients, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/clients/:id - Get single client details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await prisma.clients.findUnique({
      where: { id: req.params.id },
      include: {
        licenses: true,
        devices: true,
        client_features: {
          include: { feature: true },
        },
        amc_payments: { orderBy: { payment_date: 'desc' } },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get audit logs for this client
    const auditLogs = await prisma.audit_logs.findMany({
      where: { entity_type: 'client', entity_id: client.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    res.json({ client, auditLogs });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/clients - Create new client
router.post('/', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      business_name, owner_name, email, phone, address, city, state,
      gst_number, plan_type, amc_status, amc_start_date, amc_end_date,
      max_devices, notes, plan_id
    } = req.body;

    if (!business_name || !owner_name || !email || !plan_type) {
      return res.status(400).json({ error: 'Required fields: business_name, owner_name, email, plan_type' });
    }

    // Check duplicate email
    const existing = await prisma.clients.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A client with this email already exists' });
    }

    // If plan_id provided, get plan details
    let planFeatures = [];
    let planMaxDevices = max_devices || 1;
    if (plan_id) {
      const plan = await prisma.plans.findUnique({ where: { id: plan_id } });
      if (plan) {
        planFeatures = plan.features;
        planMaxDevices = plan.max_devices;
      }
    }

    // Generate license credentials
    const licenseKey = generateLicenseKey();
    const licenseSecretPlain = generateLicenseSecret();
    const licenseSecretHash = await bcrypt.hash(licenseSecretPlain, 12);

    // Create client + license in a transaction
    const client = await prisma.$transaction(async (tx) => {
      const newClient = await tx.clients.create({
        data: {
          business_name,
          owner_name,
          email,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          gst_number: gst_number || null,
          plan_type,
          amc_status: amc_status || 'not_applicable',
          amc_start_date: amc_start_date ? new Date(amc_start_date) : null,
          amc_end_date: amc_end_date ? new Date(amc_end_date) : null,
          max_devices: planMaxDevices,
          notes: notes || null,
        },
      });

      // Create primary license
      await tx.licenses.create({
        data: {
          client_id: newClient.id,
          license_key: licenseKey,
          license_secret: licenseSecretHash,
          is_primary: true,
        },
      });

      // Assign plan features
      if (planFeatures.length > 0) {
        const featureRecords = await tx.features.findMany({
          where: { feature_key: { in: planFeatures } },
        });

        for (const feature of featureRecords) {
          await tx.client_features.create({
            data: {
              client_id: newClient.id,
              feature_id: feature.id,
              is_enabled: true,
              granted_by: req.admin.id,
            },
          });
        }
      }

      return newClient;
    });

    // Audit log
    await logAudit({
      adminId: req.admin.id,
      action: 'CREATE_CLIENT',
      entityType: 'client',
      entityId: client.id,
      newData: { business_name, email, plan_type },
      ipAddress: req.ip,
    });

    // Return client with the plaintext credentials (shown ONCE)
    res.status(201).json({
      client,
      credentials: {
        license_key: licenseKey,
        license_secret: licenseSecretPlain,
        message: 'IMPORTANT: Save these credentials now. The secret will NOT be shown again.',
      },
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const oldClient = await prisma.clients.findUnique({ where: { id: req.params.id } });
    if (!oldClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const updateData = {};
    const fields = ['business_name', 'owner_name', 'email', 'phone', 'address', 'city',
      'state', 'gst_number', 'plan_type', 'amc_status', 'max_devices', 'status', 'notes'];

    fields.forEach(f => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });

    if (req.body.amc_start_date !== undefined) {
      updateData.amc_start_date = req.body.amc_start_date ? new Date(req.body.amc_start_date) : null;
    }
    if (req.body.amc_end_date !== undefined) {
      updateData.amc_end_date = req.body.amc_end_date ? new Date(req.body.amc_end_date) : null;
    }

    const client = await prisma.clients.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'UPDATE_CLIENT',
      entityType: 'client',
      entityId: client.id,
      oldData: oldClient,
      newData: updateData,
      ipAddress: req.ip,
    });

    res.json({ client });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// POST /api/clients/:id/suspend
router.post('/:id/suspend', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const client = await prisma.clients.update({
      where: { id: req.params.id },
      data: { status: 'suspended' },
    });

    // Notify QR Server to force logout / suspend on local POS
    await qrBridge.notifyAllClientDevices(prisma, client.id, (licenseKey, hardwareId) =>
      qrBridge.forceLogout(licenseKey, hardwareId, 'client_suspended')
    );

    await logAudit({
      adminId: req.admin.id,
      action: 'SUSPEND_CLIENT',
      entityType: 'client',
      entityId: client.id,
      ipAddress: req.ip,
    });

    res.json({ client, message: 'Client suspended successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suspend client' });
  }
});

// POST /api/clients/:id/activate
router.post('/:id/activate', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const client = await prisma.clients.update({
      where: { id: req.params.id },
      data: { status: 'active' },
    });

    // Notify QR Server that client is re-activated
    await qrBridge.notifyAllClientDevices(prisma, client.id, (licenseKey, hardwareId) =>
      qrBridge.activateClient(licenseKey, hardwareId)
    );

    await logAudit({
      adminId: req.admin.id,
      action: 'ACTIVATE_CLIENT',
      entityType: 'client',
      entityId: client.id,
      ipAddress: req.ip,
    });

    res.json({ client, message: 'Client activated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate client' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const client = await prisma.clients.findUnique({ where: { id: req.params.id } });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // IMPORTANT: Notify QR Server BEFORE deleting so we still have license/device info
    // This forces the local POS software to log out immediately
    await qrBridge.notifyAllClientDevices(prisma, req.params.id, (licenseKey, hardwareId) =>
      qrBridge.forceLogout(licenseKey, hardwareId, 'client_deleted')
    );

    await prisma.clients.delete({ where: { id: req.params.id } });

    await logAudit({
      adminId: req.admin.id,
      action: 'DELETE_CLIENT',
      entityType: 'client',
      entityId: req.params.id,
      oldData: client,
      ipAddress: req.ip,
    });

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// POST /api/clients/:id/features - Toggle features for a client
router.post('/:id/features', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { feature_id, is_enabled, is_trial, trial_days } = req.body;
    const clientId = req.params.id;

    const existing = await prisma.client_features.findUnique({
      where: { client_id_feature_id: { client_id: clientId, feature_id } },
    });

    if (existing) {
      const updateData = { is_enabled };
      if (is_trial) {
        updateData.is_trial = true;
        updateData.trial_start_date = new Date();
        updateData.trial_end_date = new Date(Date.now() + (trial_days || 7) * 24 * 60 * 60 * 1000);
      }
      if (!is_enabled) {
        updateData.revoked_at = new Date();
        updateData.revoked_by = req.admin.id;
      }

      const updated = await prisma.client_features.update({
        where: { id: existing.id },
        data: updateData,
        include: { feature: true },
      });

      await logAudit({
        adminId: req.admin.id,
        action: is_enabled ? 'ENABLE_FEATURE' : 'DISABLE_FEATURE',
        entityType: 'client_feature',
        entityId: updated.id,
        newData: { clientId, feature_id, is_enabled, is_trial },
        ipAddress: req.ip,
      });

      return res.json({ client_feature: updated });
    }

    // Create new assignment
    const cf = await prisma.client_features.create({
      data: {
        client_id: clientId,
        feature_id,
        is_enabled,
        is_trial: is_trial || false,
        trial_start_date: is_trial ? new Date() : null,
        trial_end_date: is_trial ? new Date(Date.now() + (trial_days || 7) * 24 * 60 * 60 * 1000) : null,
        granted_by: req.admin.id,
      },
      include: { feature: true },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'GRANT_FEATURE',
      entityType: 'client_feature',
      entityId: cf.id,
      newData: { clientId, feature_id, is_enabled, is_trial },
      ipAddress: req.ip,
    });

    res.status(201).json({ client_feature: cf });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// DELETE /api/clients/:id/features/:featureId - Remove a feature from client
router.delete('/:id/features/:featureId', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id: clientId, featureId } = req.params;

    const existing = await prisma.client_features.findUnique({
      where: { client_id_feature_id: { client_id: clientId, feature_id: featureId } },
      include: { feature: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Feature assignment not found' });
    }

    await prisma.client_features.delete({
      where: { id: existing.id },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'REMOVE_FEATURE',
      entityType: 'client_feature',
      entityId: existing.id,
      oldData: { clientId, feature_key: existing.feature?.feature_key, is_trial: existing.is_trial },
      ipAddress: req.ip,
    });

    res.json({ message: 'Feature removed successfully' });
  } catch (error) {
    console.error('Delete feature error:', error);
    res.status(500).json({ error: 'Failed to remove feature' });
  }
});

// POST /api/clients/:id/upgrade-plan - Upgrade client plan
router.post('/:id/upgrade-plan', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { plan_id } = req.body;
    const clientId = req.params.id;

    const plan = await prisma.plans.findUnique({ where: { id: plan_id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const oldClient = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!oldClient) return res.status(404).json({ error: 'Client not found' });

    await prisma.$transaction(async (tx) => {
      // Update client plan
      await tx.clients.update({
        where: { id: clientId },
        data: {
          plan_type: plan.plan_key,
          max_devices: plan.max_devices,
        },
      });

      // Sync features: add any new features from the plan that client doesn't have
      if (plan.features?.length > 0) {
        const featureRecords = await tx.features.findMany({
          where: { feature_key: { in: plan.features } },
        });

        for (const feature of featureRecords) {
          const existing = await tx.client_features.findUnique({
            where: { client_id_feature_id: { client_id: clientId, feature_id: feature.id } },
          });

          if (!existing) {
            await tx.client_features.create({
              data: {
                client_id: clientId,
                feature_id: feature.id,
                is_enabled: true,
                granted_by: req.admin.id,
              },
            });
          } else if (!existing.is_enabled) {
            // Re-enable if it was disabled
            await tx.client_features.update({
              where: { id: existing.id },
              data: { is_enabled: true, is_trial: false, revoked_at: null, revoked_by: null },
            });
          } else if (existing.is_trial) {
            // Convert trial to permanent
            await tx.client_features.update({
              where: { id: existing.id },
              data: { is_trial: false, trial_start_date: null, trial_end_date: null },
            });
          }
        }
      }
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'UPGRADE_PLAN',
      entityType: 'client',
      entityId: clientId,
      oldData: { plan_type: oldClient.plan_type },
      newData: { plan_type: plan.plan_key },
      ipAddress: req.ip,
    });

    // Return updated client
    const updatedClient = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        licenses: true,
        devices: true,
        client_features: { include: { feature: true } },
        amc_payments: { orderBy: { payment_date: 'desc' } },
      },
    });

    res.json({ client: updatedClient, message: `Plan upgraded to ${plan.plan_name}` });
  } catch (error) {
    console.error('Upgrade plan error:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

// POST /api/clients/create-trial - Create a trial/guest client with expiry
router.post('/create-trial', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      business_name, owner_name, email, phone, city, state,
      trial_days, features_to_grant, notes
    } = req.body;

    if (!business_name || !owner_name || !email || !trial_days) {
      return res.status(400).json({ error: 'Required: business_name, owner_name, email, trial_days' });
    }

    // Check duplicate
    const existing = await prisma.clients.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A client with this email already exists' });
    }

    const licenseKey = generateLicenseKey();
    const licenseSecretPlain = generateLicenseSecret();
    const licenseSecretHash = await bcrypt.hash(licenseSecretPlain, 12);
    const expiresAt = new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000);

    const client = await prisma.$transaction(async (tx) => {
      const newClient = await tx.clients.create({
        data: {
          business_name,
          owner_name,
          email,
          phone: phone || null,
          city: city || null,
          state: state || null,
          plan_type: 'trial',
          amc_status: 'not_applicable',
          status: 'active',
          max_devices: 1,
          notes: notes || `Trial client - expires ${expiresAt.toLocaleDateString('en-IN')}`,
        },
      });

      // Create license with expiry
      await tx.licenses.create({
        data: {
          client_id: newClient.id,
          license_key: licenseKey,
          license_secret: licenseSecretHash,
          is_primary: true,
          expires_at: expiresAt,
        },
      });

      // Assign features as trial
      if (features_to_grant?.length > 0) {
        const featureRecords = await tx.features.findMany({
          where: { id: { in: features_to_grant } },
        });

        for (const feature of featureRecords) {
          await tx.client_features.create({
            data: {
              client_id: newClient.id,
              feature_id: feature.id,
              is_enabled: true,
              is_trial: true,
              trial_start_date: new Date(),
              trial_end_date: expiresAt,
              granted_by: req.admin.id,
            },
          });
        }
      }

      return newClient;
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'CREATE_TRIAL_CLIENT',
      entityType: 'client',
      entityId: client.id,
      newData: { business_name, email, trial_days },
      ipAddress: req.ip,
    });

    res.status(201).json({
      client,
      credentials: {
        license_key: licenseKey,
        license_secret: licenseSecretPlain,
        expires_at: expiresAt.toISOString(),
        message: `Trial license valid for ${trial_days} days. Secret shown ONCE.`,
      },
    });
  } catch (error) {
    console.error('Create trial client error:', error);
    res.status(500).json({ error: 'Failed to create trial client' });
  }
});

// GET /api/clients/export/csv - Export clients to CSV
router.get('/export/csv', authenticate, async (req, res) => {
  try {
    const clients = await prisma.clients.findMany({
      orderBy: { created_at: 'desc' },
    });

    const headers = ['Business Name', 'Owner', 'Email', 'Phone', 'City', 'Plan', 'AMC Status', 'AMC End Date', 'Status', 'Created'];
    const rows = clients.map(c => [
      c.business_name, c.owner_name, c.email, c.phone || '', c.city || '',
      c.plan_type, c.amc_status, c.amc_end_date ? new Date(c.amc_end_date).toLocaleDateString() : '',
      c.status, new Date(c.created_at).toLocaleDateString()
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      csv += r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=clients_export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export clients' });
  }
});

// POST /api/clients/:id/licenses - Generate additional license for existing client
router.post('/:id/licenses', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const client = await prisma.clients.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { licenses: true }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (client.status !== 'active') {
      return res.status(400).json({ error: 'Client is not active' });
    }

    // Generate license credentials
    const licenseKey = generateLicenseKey();
    const licenseSecretPlain = generateLicenseSecret();
    const licenseSecretHash = await bcrypt.hash(licenseSecretPlain, 12);

    const newLicense = await prisma.licenses.create({
      data: {
        client_id: client.id,
        license_key: licenseKey,
        license_secret: licenseSecretHash,
        is_primary: client._count.licenses === 0,
      },
    });

    await logAudit({
      adminId: req.admin.id,
      action: 'ADD_LICENSE',
      entityType: 'client',
      entityId: client.id,
      newData: { license_key: licenseKey },
      ipAddress: req.ip,
    });

    res.status(201).json({
      license: newLicense,
      credentials: {
        license_key: licenseKey,
        license_secret: licenseSecretPlain,
        message: 'IMPORTANT: Save these credentials now. The secret will NOT be shown again.',
      },
    });
  } catch (error) {
    console.error('Generate additional license error:', error);
    res.status(500).json({ error: 'Failed to generate additional license' });
  }
});

module.exports = router;
