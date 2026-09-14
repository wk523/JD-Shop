const express = require('express');
const router = express.Router();
const {
  customerRegister,
  customerLogin,
  adminLogin,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

// Customer Auth
router.post('/customer/register', customerRegister);
router.post('/customer/login', customerLogin);

// Forgot & Reset Password
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin / Staff Auth
router.post('/admin/login', adminLogin);

// Protected Auth Routes
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
