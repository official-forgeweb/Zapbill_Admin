const axios = require('axios');

/**
 * QR Server Bridge - Communicates with the local FlashBill POS QR Server
 * to push admin commands (force logout, AMC updates, suspend, etc.)
 * 
 * The QR Server runs on http://192.168.65.229:3000 and is the gateway
 * to the local POS software running on localhost:5173
 */

const QR_SERVER_URL = process.env.QR_SERVER_URL || 'http://192.168.65.229:3000';
const QR_SERVER_TIMEOUT = parseInt(process.env.QR_SERVER_TIMEOUT) || 10000;

const qrServerApi = axios.create({
  baseURL: QR_SERVER_URL,
  timeout: QR_SERVER_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Source': 'flashbill-admin-panel',
  },
});

/**
 * Send a command to the QR Server to be picked up by the local POS
 * @param {string} command - Command type (force_logout, update_amc, suspend, activate, etc.)
 * @param {object} payload - Data to send
 * @returns {Promise<object>} Response from QR Server
 */
async function sendCommand(command, payload = {}) {
  try {
    console.log(`📡 Sending command to QR Server: ${command}`, JSON.stringify(payload).substring(0, 200));
    
    const response = await qrServerApi.post('/api/admin/command', {
      command,
      payload,
      timestamp: new Date().toISOString(),
      source: 'admin_panel',
    });
    
    console.log(`✅ QR Server responded:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ QR Server command failed (${command}):`, error.message);
    // Don't throw - the admin action should still succeed even if QR server is unreachable
    return { success: false, error: error.message };
  }
}

/**
 * Force logout a client's POS software
 * Called when admin deletes or suspends a client
 */
async function forceLogout(licenseKey, hardwareId, reason = 'admin_action') {
  return sendCommand('force_logout', {
    license_key: licenseKey,
    hardware_id: hardwareId,
    reason,
    message: getLogoutMessage(reason),
  });
}

/**
 * Push updated AMC status to the local POS
 */
async function updateAmcStatus(licenseKey, hardwareId, amcData) {
  return sendCommand('update_amc', {
    license_key: licenseKey,
    hardware_id: hardwareId,
    amc_status: amcData.amc_status,
    amc_start_date: amcData.amc_start_date,
    amc_end_date: amcData.amc_end_date,
    amc_days_remaining: amcData.amc_days_remaining || 0,
  });
}

/**
 * Push suspension notice to local POS
 */
async function suspendClient(licenseKey, hardwareId) {
  return sendCommand('suspend', {
    license_key: licenseKey,
    hardware_id: hardwareId,
    message: 'Your account has been suspended by the administrator. Contact support for assistance.',
  });
}

/**
 * Push activation notice to local POS (re-enable after suspension)
 */
async function activateClient(licenseKey, hardwareId) {
  return sendCommand('activate', {
    license_key: licenseKey,
    hardware_id: hardwareId,
    message: 'Your account has been re-activated.',
  });
}

/**
 * Push feature update to local POS
 */
async function updateFeatures(licenseKey, hardwareId, features) {
  return sendCommand('update_features', {
    license_key: licenseKey,
    hardware_id: hardwareId,
    features,
  });
}

/**
 * Notify all devices of a client about an admin action
 * Looks up all licenses+devices for the client and sends command to each
 */
async function notifyAllClientDevices(prisma, clientId, commandFn) {
  try {
    const licenses = await prisma.licenses.findMany({
      where: { client_id: clientId },
      select: { license_key: true, device_id: true },
    });

    const results = [];
    for (const lic of licenses) {
      if (lic.device_id) {
        const result = await commandFn(lic.license_key, lic.device_id);
        results.push(result);
      }
    }
    return results;
  } catch (error) {
    console.error('Error notifying client devices:', error.message);
    return [];
  }
}

function getLogoutMessage(reason) {
  switch (reason) {
    case 'client_deleted':
      return 'Your license has been revoked. The software will now close. Please contact support.';
    case 'client_suspended':
      return 'Your account has been suspended by the administrator. Please contact support.';
    case 'license_deactivated':
      return 'Your license has been deactivated. Please contact support.';
    case 'license_regenerated':
      return 'Your license credentials have been regenerated. Please re-activate with new credentials.';
    default:
      return 'An administrative action requires you to log out. Please contact support.';
  }
}

/**
 * Check if the QR Server is reachable
 */
async function checkConnection() {
  try {
    const response = await qrServerApi.get('/api/health', { timeout: 5000 });
    return { connected: true, data: response.data };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

module.exports = {
  sendCommand,
  forceLogout,
  updateAmcStatus,
  suspendClient,
  activateClient,
  updateFeatures,
  notifyAllClientDevices,
  checkConnection,
  QR_SERVER_URL,
};
