const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { authenticateToken, requireAdmin, requirePermission } = require('../middlewares/auth');

// Public catalog routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Admin / Staff CRUD routes
router.post('/', authenticateToken, requireAdmin, requirePermission('products:create'), createProduct);
router.put('/:id', authenticateToken, requireAdmin, requirePermission('products:update'), updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, requirePermission('products:delete'), deleteProduct);

module.exports = router;
