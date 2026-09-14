const express = require('express');
const router = express.Router();
const {
  getSmtpSettings,
  updateSmtpSettings,
  testSmtpSettings,
  getStripeSettings,
  updateStripeSettings
} = require('../controllers/settingsController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// SMTP Settings routes
router.get('/smtp', authenticateToken, requireAdmin, getSmtpSettings);
router.put('/smtp', authenticateToken, requireAdmin, updateSmtpSettings);
router.post('/smtp/test', authenticateToken, requireAdmin, testSmtpSettings);

// Stripe Payment Settings routes
router.get('/stripe', authenticateToken, requireAdmin, getStripeSettings);
router.put('/stripe', authenticateToken, requireAdmin, updateStripeSettings);

module.exports = router;
