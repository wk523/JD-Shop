const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { authenticateToken, requireAdmin, requirePermission } = require('../middlewares/auth');

// Public category routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin CRUD routes
router.post('/', authenticateToken, requireAdmin, requirePermission('categories:manage'), createCategory);
router.put('/:id', authenticateToken, requireAdmin, requirePermission('categories:manage'), updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, requirePermission('categories:manage'), deleteCategory);

module.exports = router;
