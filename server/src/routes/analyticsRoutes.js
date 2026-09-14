const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/analyticsController');
const { authenticateToken, requireAdmin, requirePermission } = require('../middlewares/auth');

router.get('/dashboard', authenticateToken, requireAdmin, requirePermission('analytics:read'), getDashboardStats);

module.exports = router;
