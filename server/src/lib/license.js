const crypto = require('crypto');

/**
 * Generate a license key like: ZB-XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `ZB-${segments.join('-')}`;
}

/**
 * Generate a license secret (plain text, will be hashed before storing)
 */
function generateLicenseSecret() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateLicenseKey, generateLicenseSecret };
