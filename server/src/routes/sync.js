const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

const router = express.Router();

// POST /api/sync/activate - First-time activation
router.post('/activate', async (req, res) => {
  try {
    const { license_key, license_secret, hardware_id, device_name, os_info } = req.body;

    if (!license_key || !license_secret || !hardware_id) {
      return res.status(400).json({ error: 'license_key, license_secret, and hardware_id are required' });
    }

    // Find license
    const license = await prisma.licenses.findUnique({
      where: { license_key },
      include: {
        client: {
          include: {
            client_features: {
              where: { is_enabled: true },
              include: { feature: true },
            },
          },
        },
      },
    });

    if (!license) {
      return res.status(404).json({ error: 'Invalid license key' });
    }

    if (!license.is_active) {
      return res.status(403).json({ error: 'License has been deactivated. Contact support.' });
    }

    // Verify secret
    const validSecret = await bcrypt.compare(license_secret, license.license_secret);
    if (!validSecret) {
      return res.status(401).json({ error: 'Invalid license credentials' });
    }

    // Check if already activated on another device
    if (license.device_id && license.device_id !== hardware_id) {
      return res.status(409).json({
        error: 'License already activated on another device. Contact support to transfer.',
      });
    }

    // Check device limit
    const client = license.client;
    if (client.status !== 'active') {
      return res.status(403).json({ error: 'Client account is ' + client.status });
    }

    const existingDeviceCount = await prisma.devices.count({
      where: { client_id: client.id, is_active: true },
    });

    if (!license.device_id && existingDeviceCount >= client.max_devices) {
      return res.status(403).json({
        error: `Device limit reached (${client.max_devices}). Contact support for additional devices.`,
      });
    }

    // Activate license on this device
    await prisma.licenses.update({
      where: { id: license.id },
      data: {
        device_id: hardware_id,
        device_name: device_name || null,
        activated_at: new Date(),
      },
    });

    // Register device if new
    const existingDevice = await prisma.devices.findUnique({
      where: { hardware_id },
    });

    if (!existingDevice) {
      await prisma.devices.create({
        data: {
          client_id: client.id,
          license_id: license.id,
          hardware_id,
          device_name: device_name || null,
          os_info: os_info || null,
          is_primary: existingDeviceCount === 0,
          is_paid: existingDeviceCount === 0, // first device is included
          last_seen: new Date(),
        },
      });
    } else {
      await prisma.devices.update({
        where: { hardware_id },
        data: { last_seen: new Date(), is_active: true },
      });
    }

    // Determine AMC status
    const now = new Date();
    const amcActive = client.amc_end_date && new Date(client.amc_end_date) > now;
    const amcDaysRemaining = amcActive
      ? Math.ceil((new Date(client.amc_end_date) - now) / (1000 * 60 * 60 * 24))
      : 0;

    // Filter out expired trials
    const enabledFeatures = client.client_features
      .filter(cf => {
        if (cf.is_trial && cf.trial_end_date && new Date(cf.trial_end_date) < now) {
          return false;
        }
        return cf.is_enabled;
      })
      .map(cf => cf.feature.feature_key);

    const messages = [];
    if (!amcActive && client.amc_status !== 'not_applicable') {
      messages.push({
        type: 'error',
        title: 'AMC Expired',
        message: 'Your AMC has expired. Cloud sync, email reports, and feature updates are disabled. Renew AMC to restore.',
      });
    } else if (amcDaysRemaining > 0 && amcDaysRemaining <= 30) {
      messages.push({
        type: 'warning',
        title: 'AMC Expiring Soon',
        message: `Your AMC expires in ${amcDaysRemaining} days. Renew to keep cloud features.`,
      });
    }

    res.json({
      status: 'activated',
      license: {
        valid: true,
        plan_type: client.plan_type,
        amc_status: amcActive ? 'active' : client.amc_status,
        amc_end_date: client.amc_end_date,
        amc_days_remaining: amcDaysRemaining,
      },
      features: enabledFeatures,
      messages,
    });
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ error: 'Activation failed' });
  }
});

// POST /api/sync/heartbeat - Periodic sync
router.post('/heartbeat', async (req, res) => {
  try {
    const { license_key, hardware_id } = req.body;

    if (!license_key || !hardware_id) {
      return res.status(400).json({ error: 'license_key and hardware_id are required' });
    }

    const license = await prisma.licenses.findUnique({
      where: { license_key },
      include: {
        client: {
          include: {
            client_features: {
              where: { is_enabled: true },
              include: { feature: true },
            },
          },
        },
      },
    });

    if (!license || license.device_id !== hardware_id) {
      return res.status(401).json({ status: 'error', error: 'Invalid license or device mismatch' });
    }

    if (!license.is_active) {
      return res.status(403).json({ status: 'error', error: 'License deactivated' });
    }

    // Update last seen
    await prisma.devices.updateMany({
      where: { hardware_id },
      data: { last_seen: new Date() },
    });

    const client = license.client;
    const now = new Date();
    const amcActive = client.amc_end_date && new Date(client.amc_end_date) > now;
    const amcDaysRemaining = amcActive
      ? Math.ceil((new Date(client.amc_end_date) - now) / (1000 * 60 * 60 * 24))
      : 0;

    // Auto-expire trials
    const enabledFeatures = client.client_features
      .filter(cf => {
        if (cf.is_trial && cf.trial_end_date && new Date(cf.trial_end_date) < now) {
          return false;
        }
        return cf.is_enabled;
      })
      .map(cf => cf.feature.feature_key);

    const messages = [];
    if (!amcActive && client.amc_status !== 'not_applicable') {
      messages.push({
        type: 'error',
        title: 'AMC Expired',
        message: 'Your AMC has expired. Cloud features are disabled. Contact support to renew.',
      });
    } else if (amcDaysRemaining > 0 && amcDaysRemaining <= 30) {
      messages.push({
        type: 'warning',
        title: 'AMC Expiring Soon',
        message: `Your AMC expires in ${amcDaysRemaining} days. Renew to keep cloud features.`,
      });
    }

    if (client.status === 'suspended') {
      messages.push({
        type: 'error',
        title: 'Account Suspended',
        message: 'Your account has been suspended. Contact support.',
      });
    }

    res.json({
      status: 'ok',
      license: {
        valid: license.is_active && client.status === 'active',
        plan_type: client.plan_type,
        amc_status: amcActive ? 'active' : client.amc_status,
        amc_end_date: client.amc_end_date,
        amc_days_remaining: amcDaysRemaining,
      },
      features: enabledFeatures,
      messages,
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ status: 'error', error: 'Heartbeat failed' });
  }
});

module.exports = router;
