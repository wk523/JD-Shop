const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { createNotificationForCustomers } = require('../services/notificationService');

const mapPromotionProduct = (item) => {
  let normalPrice = parseFloat(item.normal_price || item.price || 0);
  if (isNaN(normalPrice)) normalPrice = 0;

  let finalPrice = normalPrice;
  let oldPrice = null;

  const salePriceNum = item.sale_price !== null && item.sale_price !== '' ? parseFloat(item.sale_price) : NaN;
  const discountPctNum = item.discount_percentage !== null && item.discount_percentage !== '' ? parseFloat(item.discount_percentage) : NaN;

  if (!isNaN(salePriceNum) && salePriceNum > 0) {
    finalPrice = salePriceNum;
    oldPrice = normalPrice;
  } else if (!isNaN(discountPctNum) && discountPctNum > 0) {
    finalPrice = parseFloat((normalPrice * (1 - discountPctNum / 100)).toFixed(2));
    oldPrice = normalPrice;
  }

  return {
    ...item,
    price: isNaN(finalPrice) ? normalPrice : finalPrice,
    old_price: isNaN(oldPrice) ? null : oldPrice
  };
};

// GET all promotions with included products
router.get('/', async (req, res) => {
  try {
    const promoRes = await query('SELECT * FROM promotions ORDER BY id DESC');
    const promotions = promoRes.rows;

    for (const p of promotions) {
      const itemsRes = await query(
        `SELECT pp.product_id, pp.sale_price, pp.discount_percentage,
                prod.id, prod.name, prod.description, prod.price as normal_price, prod.price, prod.images, prod.rating, prod.reviews_count, prod.stock, prod.badge, cat.name as category_name
         FROM promotion_products pp
         JOIN products prod ON pp.product_id = prod.id
         LEFT JOIN categories cat ON prod.category_id = cat.id
         WHERE pp.promotion_id = $1`,
        [p.id]
      );

      p.products = itemsRes.rows.map(mapPromotionProduct);
    }

    res.json({ success: true, promotions });
  } catch (err) {
    console.error('Fetch promotions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch promotions' });
  }
});

// GET active promotion for customer storefront products
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const activeRes = await query(
      `SELECT pp.product_id, pp.sale_price, pp.discount_percentage, p.title as campaign_title
       FROM promotion_products pp
       JOIN promotions p ON pp.promotion_id = p.id
       WHERE p.status = 'active'
         AND (p.start_date IS NULL OR p.start_date <= $1)
         AND (p.end_date IS NULL OR p.end_date >= $1)`,
      [now]
    );

    const activePromos = {};
    activeRes.rows.forEach(item => {
      activePromos[item.product_id] = item;
    });

    res.json({ success: true, activePromos });
  } catch (err) {
    console.error('Fetch active promos error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active promotions' });
  }
});

// GET single promotion details with all included products
router.get('/:id', async (req, res) => {
  try {
    const promoId = parseInt(req.params.id, 10);
    if (isNaN(promoId)) {
      return res.status(400).json({ success: false, message: 'Invalid promotion campaign ID.' });
    }

    const promoRes = await query('SELECT * FROM promotions WHERE id = $1', [promoId]);
    if (promoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Promotion campaign not found.' });
    }

    const promotion = promoRes.rows[0];
    const itemsRes = await query(
      `SELECT pp.product_id, pp.sale_price, pp.discount_percentage,
              prod.id, prod.name, prod.description, prod.price as normal_price, prod.price, prod.images, prod.rating, prod.reviews_count, prod.stock, prod.badge, cat.name as category_name
       FROM promotion_products pp
       JOIN products prod ON pp.product_id = prod.id
       LEFT JOIN categories cat ON prod.category_id = cat.id
       WHERE pp.promotion_id = $1`,
      [promotion.id]
    );

    promotion.products = itemsRes.rows.map(mapPromotionProduct);

    res.json({ success: true, promotion });
  } catch (err) {
    console.error('Fetch single promotion error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch promotion campaign.' });
  }
});

const checkProductPromotionConflicts = async ({ currentPromoId = null, products = [], start_date, end_date, status = 'active' }) => {
  if (status !== 'active' || !products || !Array.isArray(products) || products.length === 0) {
    return { hasConflict: false };
  }

  const productIds = products.map(p => parseInt(p.product_id)).filter(id => !isNaN(id));
  if (productIds.length === 0) {
    return { hasConflict: false };
  }

  const sDate = start_date ? new Date(start_date) : new Date();
  const eDate = end_date ? new Date(end_date) : null;

  const conflictRes = await query(
    `SELECT pp.product_id, prod.name as product_name, p.id as promotion_id, p.title as promotion_title, p.start_date, p.end_date
     FROM promotion_products pp
     JOIN promotions p ON pp.promotion_id = p.id
     JOIN products prod ON pp.product_id = prod.id
     WHERE pp.product_id = ANY($1::int[])
       AND p.status = 'active'
       AND ($2::int IS NULL OR p.id != $2::int)
       AND (p.start_date IS NULL OR $4::timestamp IS NULL OR p.start_date <= $4::timestamp)
       AND (p.end_date IS NULL OR $3::timestamp IS NULL OR p.end_date >= $3::timestamp)`,
    [productIds, currentPromoId ? parseInt(currentPromoId, 10) : null, sDate, eDate]
  );

  if (conflictRes.rows.length > 0) {
    const conflicts = conflictRes.rows;
    if (conflicts.length === 1) {
      const c = conflicts[0];
      const startStr = c.start_date ? new Date(c.start_date).toLocaleDateString() : 'Immediate';
      const endStr = c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Ongoing';
      return {
        hasConflict: true,
        conflicts,
        message: `Product "${c.product_name}" is already included in active promotion campaign "${c.promotion_title}" (${startStr} — ${endStr}) during this period. A product cannot have multiple active promo prices at the same time.`
      };
    } else {
      const names = Array.from(new Set(conflicts.map(c => c.product_name)));
      const titles = Array.from(new Set(conflicts.map(c => c.promotion_title)));
      return {
        hasConflict: true,
        conflicts,
        message: `The following product(s) are already included in active promotion campaign(s) [${titles.join(', ')}]: ${names.join(', ')}. Only after an existing campaign ends can a product be added to a new campaign.`
      };
    }
  }

  return { hasConflict: false };
};

// POST create promotion campaign
router.post('/', async (req, res) => {
  try {
    const { title, banner_image, start_date, end_date, status, products } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Campaign title is required.' });
    }

    // Check for overlapping active promotion campaign conflicts
    const conflictCheck = await checkProductPromotionConflicts({
      currentPromoId: null,
      products,
      start_date,
      end_date,
      status: status || 'active'
    });

    if (conflictCheck.hasConflict) {
      return res.status(400).json({
        success: false,
        message: conflictCheck.message,
        conflicts: conflictCheck.conflicts
      });
    }

    const promoRes = await query(
      `INSERT INTO promotions (title, banner_image, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title.trim(), banner_image || '', start_date || new Date(), end_date || null, status || 'active']
    );

    const promotion = promoRes.rows[0];

    // Insert selected products if provided
    if (products && Array.isArray(products) && products.length > 0) {
      for (const prod of products) {
        await query(
          `INSERT INTO promotion_products (promotion_id, product_id, sale_price, discount_percentage)
           VALUES ($1, $2, $3, $4)`,
          [promotion.id, prod.product_id, prod.sale_price || null, prod.discount_percentage || null]
        );
      }
    }

    // Trigger notification to all active customers if campaign is active
    if (promotion.status === 'active') {
      createNotificationForCustomers({
        title: `🔥 New Promotion: ${promotion.title}`,
        message: `Check out our new campaign "${promotion.title}" for special discounts and exclusive deals!`,
        type: 'promo',
        referenceId: promotion.id
      }).catch(e => console.error('Promo notification broadcast error:', e));
    }

    res.json({ success: true, promotion, message: 'Promotion campaign created successfully!' });
  } catch (err) {
    console.error('Create promotion error:', err);
    res.status(500).json({ success: false, message: 'Failed to create promotion' });
  }
});

// PUT update promotion campaign
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, banner_image, start_date, end_date, status, products } = req.body;

    // Check for overlapping active promotion campaign conflicts
    const conflictCheck = await checkProductPromotionConflicts({
      currentPromoId: id,
      products,
      start_date,
      end_date,
      status: status || 'active'
    });

    if (conflictCheck.hasConflict) {
      return res.status(400).json({
        success: false,
        message: conflictCheck.message,
        conflicts: conflictCheck.conflicts
      });
    }

    const promoRes = await query(
      `UPDATE promotions
       SET title = $1, banner_image = $2, start_date = $3, end_date = $4, status = $5
       WHERE id = $6
       RETURNING *`,
      [title, banner_image, start_date || new Date(), end_date || null, status, id]
    );

    if (promoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Promotion not found.' });
    }

    // Re-populate promotion products
    await query('DELETE FROM promotion_products WHERE promotion_id = $1', [id]);

    if (products && Array.isArray(products) && products.length > 0) {
      for (const prod of products) {
        await query(
          `INSERT INTO promotion_products (promotion_id, product_id, sale_price, discount_percentage)
           VALUES ($1, $2, $3, $4)`,
          [id, prod.product_id, prod.sale_price || null, prod.discount_percentage || null]
        );
      }
    }

    res.json({ success: true, promotion: promoRes.rows[0], message: 'Promotion updated successfully!' });
  } catch (err) {
    console.error('Update promotion error:', err);
    res.status(500).json({ success: false, message: 'Failed to update promotion' });
  }
});

// DELETE promotion
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM promotions WHERE id = $1', [id]);
    res.json({ success: true, message: 'Promotion deleted successfully.' });
  } catch (err) {
    console.error('Delete promotion error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete promotion' });
  }
});

module.exports = router;
