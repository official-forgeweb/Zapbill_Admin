const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const env = require('../config/env');
const { generateLicenseKey, generateSecretKey, generateCouponId, signPayload, encryptPayload } = require('../utils/couponCrypto');

const generateCoupon = async (req, res) => {
    try {
        const { client_id, client_name, email, phone, coupon_type, plan_type, features, trial_features, validity_days, max_devices, notes, price } = req.body;

        const licenseKey = generateLicenseKey();
        const secretKey = generateSecretKey();
        const couponId = generateCouponId();

        const payload = {
            coupon_id: couponId,
            license_key: licenseKey,
            client_name: client_name,
            plan: plan_type,
            features: features,
            trial_features: trial_features || null,
            validity_days: parseInt(validity_days),
            max_devices: parseInt(max_devices) || 1,
            issued_at: new Date().toISOString(),
            issued_by: req.admin.email,
            version: '1.0'
        };

        // Sign the payload FIRST, then embed signature INTO the payload before encrypting
        const signature = signPayload(JSON.stringify(payload), env.softwareSecret);
        payload.signature = signature; // Embed signature inside payload
        
        // === DEBUG LOGGING ===
        // Removed
        // === END DEBUG ===
        
        // Now encrypt the payload (which includes the signature)
        const encrypted = encryptPayload(JSON.stringify(payload), licenseKey, secretKey, env.softwareSecret);
        const secretHash = await bcrypt.hash(secretKey, 12);

        // Generate a SINGLE combined activation code (bundles everything into one string)
        const combinedData = JSON.stringify({
            l: licenseKey,
            s: secretKey,
            p: encrypted
        });
        const combinedActivationCode = Buffer.from(combinedData).toString('base64');

        const newCoupon = await prisma.coupons.create({
            data: {
                coupon_id: couponId,
                license_key: licenseKey,
                secret_key_hash: secretHash,
                client_id: client_id || null,
                client_name: client_name,
                issued_to_email: email || null,
                issued_to_phone: phone || null,
                coupon_type: coupon_type || 'plan',
                plan_type: plan_type,
                features: features,
                trial_features: trial_features || null,
                validity_days: parseInt(validity_days),
                max_devices: parseInt(max_devices) || 1,
                price: parseFloat(price) || 0,
                encrypted_payload: encrypted,
                payload_signature: signature,
                notes: notes,
                created_by: req.admin.id,
                status: 'issued'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Coupon generated successfully',
            credentials: {
                license_key: licenseKey,
                secret_key: secretKey
            },
            coupon: {
                id: newCoupon.id,
                coupon_id: newCoupon.coupon_id,
                client_name: newCoupon.client_name,
                plan_type: newCoupon.plan_type,
                validity_days: newCoupon.validity_days,
                max_devices: newCoupon.max_devices,
                price: newCoupon.price
            },
            activation_payload: encrypted,
            // Single combined code for foolproof activation
            combined_activation_code: combinedActivationCode
        });
    } catch (error) {
        console.error('Error generating coupon:', error);
        res.status(500).json({ error: 'Failed to generate coupon' });
    }
};

const listCoupons = async (req, res) => {
    try {
        const { status, plan, search } = req.query;
        let where = {};
        
        if (status) where.status = status;
        if (plan) where.plan_type = plan;
        if (search) {
            where.OR = [
                { license_key: { contains: search, mode: 'insensitive' } },
                { client_name: { contains: search, mode: 'insensitive' } },
                { coupon_id: { contains: search, mode: 'insensitive' } }
            ];
        }

        const coupons = await prisma.coupons.findMany({
            where,
            orderBy: { created_at: 'desc' },
            include: {
                activations: true
            }
        });

        const stats = {
            total_issued: await prisma.coupons.count(),
            active: await prisma.coupons.count({ where: { status: 'activated' } }),
            expired: await prisma.coupons.count({ where: { status: 'expired' } }),
            revoked: await prisma.coupons.count({ where: { status: 'revoked' } }),
            trial: await prisma.coupons.count({ where: { coupon_type: 'trial' } })
        };

        res.json({ coupons, stats });
    } catch (error) {
        console.error('Error listing coupons:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
};

const getCouponDetails = async (req, res) => {
    try {
        const { licenseKey } = req.params;
        const coupon = await prisma.coupons.findUnique({
            where: { license_key: licenseKey },
            include: { activations: true }
        });

        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        
        // Remove sensitive hash
        const { secret_key_hash, ...safeData } = coupon;
        res.json(safeData);
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({ error: 'Failed to find coupon' });
    }
};

const revokeCoupon = async (req, res) => {
    try {
        const { licenseKey } = req.params;
        const { reason } = req.body;

        await prisma.coupons.update({
            where: { license_key: licenseKey },
            data: {
                status: 'revoked',
                revoked_at: new Date(),
                revoked_by: req.admin.id,
                revoke_reason: reason
            }
        });

        // Also deactivate all related active deployments
        await prisma.coupon_activations.updateMany({
            where: { license_key: licenseKey, is_active: true },
            data: {
                is_active: false,
                deactivated_at: new Date(),
                deactivation_reason: 'Coupon explicitly revoked by admin'
            }
        });

        res.json({ success: true, message: 'Coupon revoked' });
    } catch (error) {
        console.error('Error revoking coupon:', error);
        res.status(500).json({ error: 'Failed to revoke coupon' });
    }
};

module.exports = {
    generateCoupon,
    listCoupons,
    getCouponDetails,
    revokeCoupon
};
