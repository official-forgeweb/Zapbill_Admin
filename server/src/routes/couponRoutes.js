const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticate, requireRole } = require('../middleware/auth');

// Make sure admin is authenticated for all these routes
router.use(authenticate);

// Generate new coupon
router.post('/generate', requireRole('super_admin', 'admin'), couponController.generateCoupon);

// List all coupons
router.get('/', requireRole('super_admin', 'admin', 'support'), couponController.listCoupons);

// Get specific coupon details
router.get('/:licenseKey', requireRole('super_admin', 'admin', 'support'), couponController.getCouponDetails);

// Revoke a coupon
router.post('/:licenseKey/revoke', requireRole('super_admin', 'admin'), couponController.revokeCoupon);

module.exports = router;
