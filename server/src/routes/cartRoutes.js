const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  removePurchasedItems
} = require('../controllers/cartController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', getCart);
router.post('/', addToCart);
router.post('/remove-items', removePurchasedItems);
router.put('/:id', updateCartItem);
router.delete('/clear', clearCart);
router.delete('/:id', removeFromCart);

module.exports = router;
