const crypto = require('crypto');

/**
 * Generate a unique License Key
 * Format: ZB-XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey() {
    const uniqueId = crypto.randomBytes(8).toString('hex').toUpperCase();
    const chunks = uniqueId.match(/.{1,4}/g);
    return 'ZB-' + chunks.join('-');
}

/**
 * Generate a cryptographically random Secret Key
 */
function generateSecretKey() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a Coupon ID
 * Format: CPN-{YEAR}-{RANDOM}
 */
function generateCouponId() {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `CPN-${year}-${random}`;
}

/**
 * Sign a payload using the SOFTWARE_SECRET
 */
function signPayload(payloadJson, softwareSecret) {
    if (!softwareSecret) {
        throw new Error('SOFTWARE_SECRET is not configured');
    }
    return crypto
        .createHmac('sha256', softwareSecret)
        .update(payloadJson)
        .digest('hex');
}

/**
 * Encrypt the payload using a key derived from License Key, Secret Key, and Software Secret
 */
function encryptPayload(payloadJson, licenseKey, secretKey, softwareSecret) {
    if (!softwareSecret) {
        throw new Error('SOFTWARE_SECRET is not configured');
    }

    // Trim all inputs to prevent key derivation mismatches from stray whitespace
    licenseKey = (licenseKey || '').trim();
    secretKey = (secretKey || '').trim();
    softwareSecret = (softwareSecret || '').trim();

    // Encryption key derived from all three keys
    const encryptionKey = crypto.pbkdf2Sync(
        licenseKey + secretKey + softwareSecret,
        licenseKey,  // salt
        100000,      // iterations
        32,          // key length
        'sha256'
    );

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

    let encrypted = cipher.update(payloadJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
    ]).toString('base64');
}

module.exports = {
    generateLicenseKey,
    generateSecretKey,
    generateCouponId,
    signPayload,
    encryptPayload
};
