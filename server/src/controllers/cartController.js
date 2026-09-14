const { query } = require('../config/db');

// Get User Cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartRes = await query(
      `SELECT c.id, c.product_id, c.quantity, c.created_at,
              p.name, p.slug, p.price, p.stock, p.images, p.badge
       FROM cart_items c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    // Fetch Active Promotion Campaigns
    const activePromosRes = await query(
      `SELECT pp.product_id, pp.sale_price, pp.discount_percentage
       FROM promotion_products pp
       JOIN promotions p ON pp.promotion_id = p.id
       WHERE p.status = 'active'
         AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
         AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)`
    );

    const promoMap = {};
    activePromosRes.rows.forEach(item => {
      promoMap[item.product_id] = item;
    });

    const items = cartRes.rows.map(item => {
      const imgArr = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
      let effectivePrice = parseFloat(item.price);
      let oldPrice = null;

      const activePromo = promoMap[item.product_id];
      if (activePromo) {
        let promoPrice = parseFloat(item.price);
        if (activePromo.sale_price) {
          promoPrice = parseFloat(activePromo.sale_price);
        } else if (activePromo.discount_percentage) {
          promoPrice = parseFloat((promoPrice * (1 - parseFloat(activePromo.discount_percentage) / 100)).toFixed(2));
        }
        oldPrice = parseFloat(item.price);
        effectivePrice = promoPrice;
      }

      return {
        ...item,
        price: effectivePrice,
        old_price: oldPrice,
        image: imgArr && imgArr.length > 0 ? imgArr[0] : ''
      };
    });

    return res.json({
      success: true,
      items
    });
  } catch (err) {
    console.error('getCart error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve cart.' });
  }
};

// Add to Cart / Increment Qty
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const prodCheck = await query(`SELECT id, name, stock FROM products WHERE id = $1`, [product_id]);
    if (prodCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const itemRes = await query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + $3
       RETURNING *`,
      [userId, product_id, parseInt(quantity)]
    );

    return res.json({
      success: true,
      message: 'Item added to cart.',
      cartItem: itemRes.rows[0]
    });
  } catch (err) {
    console.error('addToCart error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add item to cart.' });
  }
};

// Update Cart Item Quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      await query(`DELETE FROM cart_items WHERE id = $1 AND user_id = $2`, [id, userId]);
      return res.json({ success: true, message: 'Item removed from cart.' });
    }

    const updateRes = await query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [parseInt(quantity), id, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    return res.json({
      success: true,
      message: 'Cart updated.',
      cartItem: updateRes.rows[0]
    });
  } catch (err) {
    console.error('updateCartItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update cart item.' });
  }
};

// Remove single item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const delRes = await query(`DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    return res.json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    console.error('removeFromCart error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove item.' });
  }
};

// Clear all cart items
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    await query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    return res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
};

// Remove specific purchased items from cart
const removePurchasedItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_ids } = req.body;

    if (Array.isArray(product_ids) && product_ids.length > 0) {
      await query(`DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::int[])`, [userId, product_ids]);
    }

    return res.json({ success: true, message: 'Purchased items removed from cart.' });
  } catch (err) {
    console.error('removePurchasedItems error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove purchased items.' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  removePurchasedItems
};
