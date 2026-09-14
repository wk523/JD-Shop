const { query } = require('../config/db');

// Helper to recalculate and update product average rating and count
const updateProductRatingMetrics = async (productId) => {
  try {
    const res = await query(
      `SELECT COUNT(*) as count, COALESCE(AVG(rating), 5.0) as avg_rating
       FROM product_reviews
       WHERE product_id = $1`,
      [productId]
    );

    const count = parseInt(res.rows[0].count || 0, 10);
    const avgRating = count > 0 ? parseFloat(res.rows[0].avg_rating).toFixed(1) : 5.0;

    await query(
      `UPDATE products
       SET rating = $1, reviews_count = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [avgRating, count, productId]
    );
  } catch (err) {
    console.error('Failed to update product rating metrics:', err);
  }
};

// 1. Submit or Update Product Review (Customer)
const createOrUpdateReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id, product_id, rating, comment, images } = req.body;

    if (!order_id || !product_id || !rating) {
      return res.status(400).json({ success: false, message: 'Order ID, Product ID, and rating (1-5) are required.' });
    }

    const numericRating = parseInt(rating, 10);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    // Check if order exists, belongs to user, and is delivered
    const orderRes = await query(
      `SELECT id, order_status FROM orders WHERE id = $1 AND user_id = $2`,
      [order_id, userId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found or does not belong to you.' });
    }

    const order = orderRes.rows[0];
    if (order.order_status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'You can only rate products for delivered orders.' });
    }

    // Verify product is in order_items
    const itemRes = await query(
      `SELECT id FROM order_items WHERE order_id = $1 AND product_id = $2`,
      [order_id, product_id]
    );

    if (itemRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'This product was not found in the specified order.' });
    }

    // Check if user already submitted a review for this order item
    const existingReviewRes = await query(
      `SELECT id FROM product_reviews WHERE order_id = $1 AND product_id = $2 AND user_id = $3`,
      [order_id, product_id, userId]
    );

    if (existingReviewRes.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already submitted a review for this product. Reviews cannot be edited once submitted.' });
    }

    const formattedImages = JSON.stringify(Array.isArray(images) ? images : []);

    const reviewRes = await query(
      `INSERT INTO product_reviews (order_id, product_id, user_id, rating, comment, images, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP)
       RETURNING *`,
      [order_id, product_id, userId, numericRating, comment || '', formattedImages]
    );

    // Recalculate product rating metrics
    await updateProductRatingMetrics(product_id);

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your product review has been submitted successfully.',
      review: reviewRes.rows[0]
    });
  } catch (err) {
    console.error('Error submitting product review:', err);
    return res.status(500).json({ success: false, message: 'Internal server error while submitting review.' });
  }
};

// 2. Get Public Reviews for a Product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviewsRes = await query(
      `SELECT pr.id, pr.order_id, pr.product_id, pr.rating, pr.comment, pr.images, pr.created_at,
              u.name as user_name, u.avatar as user_avatar
       FROM product_reviews pr
       LEFT JOIN users u ON pr.user_id = u.id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC`,
      [productId]
    );

    return res.json({
      success: true,
      reviews: reviewsRes.rows
    });
  } catch (err) {
    console.error('Error fetching product reviews:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching reviews.' });
  }
};

// 3. Get Current Customer's Submitted Reviews
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviewsRes = await query(
      `SELECT pr.*, p.name as product_name, p.images as product_images
       FROM product_reviews pr
       JOIN products p ON pr.product_id = p.id
       WHERE pr.user_id = $1
       ORDER BY pr.created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      reviews: reviewsRes.rows
    });
  } catch (err) {
    console.error('Error fetching user reviews:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching your reviews.' });
  }
};

// 4. Get Admin Reviews List (With filtering & search)
const getAdminReviews = async (req, res) => {
  try {
    const { search = '', rating = '' } = req.query;

    let queryStr = `
      SELECT pr.id, pr.order_id, pr.product_id, pr.user_id, pr.rating, pr.comment, pr.images, pr.created_at,
             u.name as customer_name, u.email as customer_email, u.avatar as customer_avatar, u.phone as customer_phone,
             p.name as product_name, p.images as product_images, p.price as product_price, c.name as product_category,
             o.order_number, o.created_at as order_created_at, o.order_status, o.total_amount as order_total_amount,
             o.payment_method, o.payment_status, o.shipping_address, o.shipping_city, o.shipping_country
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN products p ON pr.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN orders o ON pr.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (p.name ILIKE $${params.length} OR u.name ILIKE $${params.length} OR o.order_number ILIKE $${params.length} OR pr.comment ILIKE $${params.length})`;
    }

    if (rating) {
      params.push(parseInt(rating, 10));
      queryStr += ` AND pr.rating = $${params.length}`;
    }

    queryStr += ` ORDER BY pr.created_at DESC`;

    const reviewsRes = await query(queryStr, params);

    return res.json({
      success: true,
      reviews: reviewsRes.rows
    });
  } catch (err) {
    console.error('Error fetching admin reviews:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching admin reviews.' });
  }
};

// 5. Admin Delete Review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const findRes = await query(`SELECT product_id FROM product_reviews WHERE id = $1`, [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const productId = findRes.rows[0].product_id;

    await query(`DELETE FROM product_reviews WHERE id = $1`, [id]);

    await updateProductRatingMetrics(productId);

    return res.json({
      success: true,
      message: 'Review deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting review:', err);
    return res.status(500).json({ success: false, message: 'Internal server error deleting review.' });
  }
};

module.exports = {
  createOrUpdateReview,
  getProductReviews,
  getUserReviews,
  getAdminReviews,
  deleteReview
};
