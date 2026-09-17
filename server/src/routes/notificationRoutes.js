const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');

// All notification endpoints require user authentication
router.get('/', authenticateToken, getUserNotifications);
router.put('/read-all', authenticateToken, markAllAsRead);
router.put('/:id/read', authenticateToken, markAsRead);
router.delete('/clear-all', authenticateToken, clearAllNotifications);
router.delete('/:id', authenticateToken, deleteNotification);

module.exports = router;
