const { query } = require('../config/db');

/**
 * Create a single notification for a specific user.
 * @param {Object} param0 
 * @param {number} param0.userId
 * @param {string} param0.title
 * @param {string} param0.message
 * @param {string} [param0.type='general'] - 'order', 'refund', 'promo', 'general'
 * @param {string|number} [param0.referenceId=null]
 */
const createNotification = async ({ userId, title, message, type = 'general', referenceId = null }) => {
  try {
    if (!userId) return null;

    const res = await query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, title, message, type, referenceId ? String(referenceId) : null]
    );

    return res.rows[0];
  } catch (err) {
    console.error('❌ Notification creation failed:', err.message);
    return null;
  }
};

/**
 * Create notification for all registered customer users (e.g. for new promotions).
 * @param {Object} param0 
 * @param {string} param0.title
 * @param {string} param0.message
 * @param {string} [param0.type='promo']
 * @param {string|number} [param0.referenceId=null]
 */
const createNotificationForCustomers = async ({ title, message, type = 'promo', referenceId = null }) => {
  try {
    const customersRes = await query(`SELECT id FROM users WHERE user_type = 'customer' AND status = 'active'`);
    const customers = customersRes.rows;

    if (customers.length === 0) return 0;

    const values = [];
    const valuePlaceholders = customers.map((c, idx) => {
      const baseIdx = idx * 5;
      values.push(c.id, title, message, type, referenceId ? String(referenceId) : null);
      return `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, false, CURRENT_TIMESTAMP)`;
    }).join(', ');

    const sql = `INSERT INTO notifications (user_id, title, message, type, reference_id, is_read, created_at) VALUES ${valuePlaceholders}`;
    await query(sql, values);

    console.log(`📢 Notification broadcast to ${customers.length} customers: "${title}"`);
    return customers.length;
  } catch (err) {
    console.error('❌ Notification broadcast failed:', err.message);
    return 0;
  }
};

module.exports = {
  createNotification,
  createNotificationForCustomers
};
