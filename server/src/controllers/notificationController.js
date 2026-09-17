const { query } = require('../config/db');

// GET /api/notifications - Get paginated list of user's notifications + unread count
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [userId];

    let typeClause = '';
    if (type && type !== 'all') {
      params.push(type);
      typeClause = ` AND type = $${params.length}`;
    }

    // Get unread count
    const unreadRes = await query(
      `SELECT COUNT(*)::int as unread_count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    const unreadCount = unreadRes.rows[0]?.unread_count || 0;

    // Get total count
    const totalCountRes = await query(
      `SELECT COUNT(*)::int as total FROM notifications WHERE user_id = $1 ${typeClause}`,
      params
    );
    const total = totalCountRes.rows[0]?.total || 0;

    // Get items
    params.push(parseInt(limit));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const dataSql = `
      SELECT * FROM notifications
      WHERE user_id = $1 ${typeClause}
      ORDER BY created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const dataRes = await query(dataSql, params);

    return res.json({
      success: true,
      unreadCount,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      notifications: dataRes.rows
    });
  } catch (err) {
    console.error('getUserNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

// PUT /api/notifications/:id/read - Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const updateRes = await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({
      success: true,
      message: 'Notification marked as read.',
      notification: updateRes.rows[0]
    });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

// PUT /api/notifications/read-all - Mark all notifications as read for current user
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
};

// DELETE /api/notifications/:id - Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const delRes = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } catch (err) {
    console.error('deleteNotification error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
};

// DELETE /api/notifications/clear-all - Clear all notifications for user
const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);

    return res.json({
      success: true,
      message: 'All notifications cleared.'
    });
  } catch (err) {
    console.error('clearAllNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear notifications.' });
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
};
