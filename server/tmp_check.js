const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const env = require('./src/config/env');

async function check() {
    const coupon = await prisma.coupons.findFirst({
        orderBy: { created_at: 'desc' }
    });
    
    if (!coupon) {
        console.log('No coupons found');
        return;
    }
    
    console.log('Latest Coupon ID:', coupon.coupon_id);
    console.log('License Key:', coupon.license_key);
    // Note: secret_key is hashed, so we only have it in terminal output if we printed it.
    console.log('Payload Signature:', coupon.payload_signature);
    console.log('Encrypted Payload Length:', coupon.encrypted_payload.length);
    console.log('Encrypted Payload First 40 chars:', coupon.encrypted_payload.substring(0, 40));
    console.log('Software Secret from env:', env.softwareSecret);
    
    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
