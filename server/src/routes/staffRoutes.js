const express = require('express');
const router = express.Router();
const {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');
const { authenticateToken, requireAdmin, requirePermission } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', requirePermission('staff:manage'), getAllStaff);
router.post('/', requirePermission('staff:manage'), createStaff);
router.put('/:id', requirePermission('staff:manage'), updateStaff);
router.delete('/:id', requirePermission('staff:manage'), deleteStaff);

module.exports = router;
