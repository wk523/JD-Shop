const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');

router.use(authenticateToken);

router.get('/', getAddresses);
router.post('/', createAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.put('/:id/set-default', setDefaultAddress);

module.exports = router;
