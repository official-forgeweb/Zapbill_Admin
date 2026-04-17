const prisma = require('./prisma');

/**
 * Log an admin action to the audit_logs table
 */
async function logAudit({ adminId, action, entityType, entityId, oldData, newData, ipAddress }) {
  try {
    await prisma.audit_logs.create({
      data: {
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId || '',
        old_data: oldData ? JSON.stringify(oldData) : null,
        new_data: newData ? JSON.stringify(newData) : null,
        ip_address: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

module.exports = { logAudit };
