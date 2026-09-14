const express = require('express');
const router = express.Router();
const {
  getAllRoles,
  getAllPermissions,
  createRole,
  updateRolePermissions,
  deleteRole
} = require('../controllers/roleController');
const { authenticateToken, requireAdmin, requirePermission } = require('../middlewares/auth');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', requirePermission('roles:manage'), getAllRoles);
router.get('/permissions', requirePermission('roles:manage'), getAllPermissions);
router.post('/', requirePermission('roles:manage'), createRole);
router.put('/:id', requirePermission('roles:manage'), updateRolePermissions);
router.delete('/:id', requirePermission('roles:manage'), deleteRole);

module.exports = router;
