const express = require('express');
const router = express.Router();
const {
  createOrUpdateReview,
  getProductReviews,
  getUserReviews,
  getAdminReviews,
  deleteReview
} = require('../controllers/reviewController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Public route: Fetch product reviews
router.get('/product/:productId', getProductReviews);

// Customer protected routes
router.post('/', authenticateToken, createOrUpdateReview);
router.get('/my-reviews', authenticateToken, getUserReviews);

// Admin protected routes
router.get('/admin', authenticateToken, requireAdmin, getAdminReviews);
router.delete('/admin/:id', authenticateToken, requireAdmin, deleteReview);

module.exports = router;
