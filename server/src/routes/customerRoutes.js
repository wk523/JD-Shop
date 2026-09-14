const express = require('express');
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// All customer management endpoints require Admin/Staff authentication
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
