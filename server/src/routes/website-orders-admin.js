const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');

// Get overview of all clients with website orders
router.get('/overview', authenticate, async (req, res) => {
  try {
    const configs = await prisma.website_order_configs.findMany({
      include: {
        client: {
          select: { id: true, business_name: true }
        }
      }
    });

    const now = new Date();
    const tenMinsAgo = new Date(now.getTime() - 10 * 60000);

    const overview = await Promise.all(configs.map(async (config) => {
      const pendingOrders = await prisma.website_pending_orders.count({
        where: { client_id: config.client_id, status: 'pending' }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dbTodayStats = await prisma.website_order_daily_stats.findUnique({
        where: { client_id_date: { client_id: config.client_id, date: today } }
      });

      let status = 'disabled';
      if (config.is_enabled) {
        if (!config.last_poll_at) status = 'never_polled';
        else if (config.last_poll_at < tenMinsAgo) status = 'offline';
        else status = 'online';
      }

      return {
        id: config.client_id,
        business_name: config.client.business_name,
        status: status,
        last_poll_at: config.last_poll_at,
        pending_count: pendingOrders,
        orders_today: dbTodayStats?.orders_received || 0,
        revenue_today: dbTodayStats?.total_amount || 0,
        is_enabled: config.is_enabled
      };
    }));

    res.json(overview);
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get config for a specific client
router.get('/clients/:clientId', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Step 1: Check if the feature is granted in client_features
    const feature = await prisma.features.findUnique({ where: { feature_key: 'website_orders' } });
    let featureGranted = false;
    if (feature) {
      const clientFeature = await prisma.client_features.findUnique({
        where: { client_id_feature_id: { client_id: clientId, feature_id: feature.id } }
      });
      featureGranted = clientFeature?.is_enabled === true;
    }

    if (!featureGranted) {
      // Feature not in their plan / not granted
      return res.json({ enabled: false, feature_exists: false });
    }

    // Step 2: Check if website_order_configs record exists (means it's been activated)
    const config = await prisma.website_order_configs.findUnique({
      where: { client_id: clientId }
    });

    if (!config) {
      // Feature is granted but not yet activated (no credentials generated)
      return res.json({ enabled: false, feature_exists: true });
    }

    const pendingCount = await prisma.website_pending_orders.count({
      where: { client_id: clientId, status: 'pending' }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await prisma.website_order_daily_stats.findUnique({
      where: { client_id_date: { client_id: clientId, date: today } }
    });

    res.json({
      enabled: config.is_enabled,
      feature_exists: true,
      config: {
        api_key: config.api_key,
        restaurant_id: config.restaurant_id,
        polling_interval_seconds: config.polling_interval_seconds,
        order_timeout_minutes: config.order_timeout_minutes,
        max_orders_per_day: config.max_orders_per_day,
        order_prefix: config.order_prefix,
        last_poll_at: config.last_poll_at,
        menu_item_count: config.menu_item_count,
        active_coupon_count: config.active_coupon_count,
        last_menu_sync_at: config.last_menu_sync_at,
        last_coupon_sync_at: config.last_coupon_sync_at,
      },
      stats: {
        pendingCount,
        todayStats: todayStats || { orders_received: 0, orders_accepted: 0, orders_rejected: 0, total_amount: 0 }
      }
    });

  } catch (error) {
    console.error('Error fetching client WO config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enable website orders for a client
router.post('/clients/:clientId/enable', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { polling_interval, timeout, max_orders, prefix } = req.body;

    const feature = await prisma.features.findUnique({ where: { feature_key: 'website_orders' } });
    if (!feature) return res.status(404).json({ error: 'website_orders feature not found in system' });

    const clientFeature = await prisma.client_features.findUnique({
      where: { client_id_feature_id: { client_id: clientId, feature_id: feature.id } }
    });

    if (!clientFeature || !clientFeature.is_enabled) {
      return res.status(400).json({ error: 'Client does not have website_orders feature granted' });
    }

    const apiKey = 'woa_pk_' + crypto.randomBytes(16).toString('hex');
    const apiSecret = 'woa_sk_' + crypto.randomBytes(24).toString('hex');
    const apiSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');
    const restaurantId = 'rest_' + crypto.randomBytes(8).toString('hex');

    const config = await prisma.website_order_configs.upsert({
      where: { client_id: clientId },
      create: {
        client_id: clientId,
        api_key: apiKey,
        api_secret_hash: apiSecretHash,
        restaurant_id: restaurantId,
        is_enabled: true,
        polling_interval_seconds: polling_interval || 10,
        order_timeout_minutes: timeout || 30,
        max_orders_per_day: max_orders || 500,
        order_prefix: prefix || 'WEB-'
      },
      update: {
        api_key: apiKey,
        api_secret_hash: apiSecretHash,
        restaurant_id: restaurantId,
        is_enabled: true,
        polling_interval_seconds: polling_interval || 10,
        order_timeout_minutes: timeout || 30,
        max_orders_per_day: max_orders || 500,
        order_prefix: prefix || 'WEB-'
      }
    });

    res.json({
      success: true,
      credentials: {
        api_key: apiKey,
        api_secret: apiSecret, // ONLY SHOWN ONCE
        restaurant_id: restaurantId
      }
    });
  } catch (error) {
    console.error('Error enabling website orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regenerate credentials
router.post('/clients/:clientId/regenerate-credentials', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;

    const apiKey = 'woa_pk_' + crypto.randomBytes(16).toString('hex');
    const apiSecret = 'woa_sk_' + crypto.randomBytes(24).toString('hex');
    const apiSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');

    await prisma.website_order_configs.update({
      where: { client_id: clientId },
      data: {
        api_key: apiKey,
        api_secret_hash: apiSecretHash
      }
    });

    res.json({
      success: true,
      credentials: {
        api_key: apiKey,
        api_secret: apiSecret // ONLY SHOWN ONCE
      }
    });
  } catch (error) {
    console.error('Error regenerating credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable website orders
router.post('/clients/:clientId/disable', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    await prisma.website_order_configs.update({
      where: { client_id: clientId },
      data: { is_enabled: false }
    });

    // Optionally reject all pending orders
    await prisma.website_pending_orders.updateMany({
      where: { client_id: clientId, status: 'pending' },
      data: { 
        status: 'rejected', 
        rejected_at: new Date(), 
        reject_reason: 'Feature disabled by Admin' 
      }
    });

    res.json({ success: true, message: 'Website orders disabled' });
  } catch (error) {
    console.error('Error disabling website orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test order
router.post('/clients/:clientId/test-order', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const config = await prisma.website_order_configs.findUnique({
      where: { client_id: clientId }
    });

    if (!config || !config.is_enabled) {
      return res.status(400).json({ error: 'Website orders not enabled' });
    }

    const orderId = `${config.order_prefix}TEST-${Math.floor(Math.random() * 1000)}`;

    const orderData = {
      customer: { name: 'Test Customer', phone: '+91 9999999999' },
      order_type: 'pickup',
      items: [{ item_name: 'Test Item', quantity: 1, unit_price: 100 }],
      subtotal: 100,
      grand_total: 100
    };

    const newOrder = await prisma.website_pending_orders.create({
      data: {
        client_id: clientId,
        order_id: orderId,
        order_data: orderData,
        status: 'pending',
        expires_at: new Date(Date.now() + config.order_timeout_minutes * 60000)
      }
    });

    res.json({ success: true, order_id: orderId });
  } catch (error) {
    console.error('Error sending test order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settings update
router.post('/clients/:clientId/settings', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { polling_interval_seconds, order_timeout_minutes, max_orders_per_day, order_prefix } = req.body;

    await prisma.website_order_configs.update({
      where: { client_id: clientId },
      data: {
        polling_interval_seconds: Number(polling_interval_seconds),
        order_timeout_minutes: Number(order_timeout_minutes),
        max_orders_per_day: Number(max_orders_per_day),
        order_prefix
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Detailed stats
router.get('/clients/:clientId/stats', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 30);
    daysAgo.setHours(0, 0, 0, 0);

    const stats = await prisma.website_order_daily_stats.findMany({
      where: { 
        client_id: clientId,
        date: { gte: daysAgo }
      },
      orderBy: { date: 'desc' }
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
