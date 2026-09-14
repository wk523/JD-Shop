const express = require('express');
const router = express.Router();
const {
  createOrder,
  getCustomerOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  deleteOrderAdmin,
  cancelFailedOrder,
  requestRefundCustomer,
  getRefundRequestsAdmin,
  processRefundAdmin
} = require('../controllers/orderController');
const { authenticateToken, requireAdmin, requirePermission } = require('../middlewares/auth');

// Optional auth for guest/customer checkout
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateToken(req, res, next);
  }
  next();
};

// Customer routes
router.post('/', optionalAuth, createOrder);
router.get('/my-orders', authenticateToken, getCustomerOrders);
router.post('/:id/request-refund', authenticateToken, requestRefundCustomer);
router.delete('/cancel-failed-order/:id', optionalAuth, cancelFailedOrder);

// Admin routes
router.get('/admin/refunds', authenticateToken, requireAdmin, requirePermission('orders:read'), getRefundRequestsAdmin);
router.put('/admin/refunds/:id', authenticateToken, requireAdmin, requirePermission('orders:manage'), processRefundAdmin);
router.get('/admin/all', authenticateToken, requireAdmin, requirePermission('orders:read'), getAllOrdersAdmin);
router.put('/admin/:id/status', authenticateToken, requireAdmin, requirePermission('orders:manage'), updateOrderStatusAdmin);
router.delete('/admin/:id', authenticateToken, requireAdmin, requirePermission('orders:manage'), deleteOrderAdmin);

// Order Details
router.get('/:id', optionalAuth, getOrderById);

module.exports = router;
