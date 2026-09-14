const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// GET all vouchers (Admin)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM vouchers ORDER BY id DESC');
    res.json({ success: true, vouchers: result.rows });
  } catch (err) {
    console.error('Fetch vouchers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch vouchers' });
  }
});

// GET used vouchers for a specific user
router.get('/user-used/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT DISTINCT UPPER(voucher_code) as code FROM orders WHERE user_id = $1 AND voucher_code IS NOT NULL AND payment_status != 'cancelled'`,
      [userId]
    );
    const usedCodes = result.rows.map(r => r.code);
    res.json({ success: true, usedCodes });
  } catch (err) {
    console.error('Fetch user used vouchers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user used vouchers.' });
  }
});

// POST validate voucher code (Customer)
router.post('/validate', async (req, res) => {
  try {
    const { code, cartTotal, userId } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Voucher code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Single-use per customer check
    if (userId) {
      const usedCheck = await query(
        `SELECT id FROM orders WHERE user_id = $1 AND UPPER(voucher_code) = UPPER($2) AND payment_status != 'cancelled'`,
        [userId, cleanCode]
      );
      if (usedCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          alreadyUsed: true,
          message: `You have used voucher code "${cleanCode}". Each voucher can only be used once per customer.`
        });
      }
    }

    const result = await query('SELECT * FROM vouchers WHERE UPPER(code) = UPPER($1)', [cleanCode]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid voucher code.' });
    }

    const voucher = result.rows[0];

    if (voucher.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This voucher is currently inactive or disabled.' });
    }

    if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
      return res.status(400).json({ success: false, message: 'This voucher code has expired.' });
    }

    if (voucher.usage_limit && voucher.times_used >= voucher.usage_limit) {
      return res.status(400).json({ success: false, message: 'This voucher limit has been reached.' });
    }

    const subtotal = parseFloat(cartTotal || 0);
    const minSpend = parseFloat(voucher.min_spend || 0);

    if (subtotal < minSpend) {
      return res.status(400).json({
        success: false,
        message: `Minimum spend of RM${minSpend.toFixed(2)} is required to use code ${voucher.code}.`
      });
    }

    let discountAmount = 0;
    if (voucher.discount_type === 'percentage') {
      discountAmount = (subtotal * parseFloat(voucher.discount_value)) / 100;
    } else {
      discountAmount = parseFloat(voucher.discount_value);
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    res.json({
      success: true,
      message: 'Voucher applied successfully!',
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        min_spend: parseFloat(voucher.min_spend || 0),
        expiry_date: voucher.expiry_date,
        discountAmount: parseFloat(discountAmount.toFixed(2))
      }
    });
  } catch (err) {
    console.error('Validate voucher error:', err);
    res.status(500).json({ success: false, message: 'Failed to validate voucher.' });
  }
});

// POST create voucher (Admin)
router.post('/', async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_spend, expiry_date, usage_limit, status } = req.body;
    if (!code || !discount_value) {
      return res.status(400).json({ success: false, message: 'Code and Discount Value are required.' });
    }

    const result = await query(
      `INSERT INTO vouchers (code, discount_type, discount_value, min_spend, expiry_date, usage_limit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code.toUpperCase().trim(), discount_type || 'percentage', discount_value, min_spend || 0, expiry_date || null, usage_limit || 100, status || 'active']
    );

    res.json({ success: true, voucher: result.rows[0], message: 'Voucher created successfully!' });
  } catch (err) {
    console.error('Create voucher error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Voucher code already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create voucher.' });
  }
});

// PUT update voucher (Admin)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discount_type, discount_value, min_spend, expiry_date, usage_limit, status } = req.body;

    const result = await query(
      `UPDATE vouchers
       SET code = $1, discount_type = $2, discount_value = $3, min_spend = $4, expiry_date = $5, usage_limit = $6, status = $7
       WHERE id = $8
       RETURNING *`,
      [code.toUpperCase().trim(), discount_type, discount_value, min_spend, expiry_date || null, usage_limit, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Voucher not found.' });
    }

    res.json({ success: true, voucher: result.rows[0], message: 'Voucher updated successfully!' });
  } catch (err) {
    console.error('Update voucher error:', err);
    res.status(500).json({ success: false, message: 'Failed to update voucher.' });
  }
});

// DELETE voucher (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM vouchers WHERE id = $1', [id]);
    res.json({ success: true, message: 'Voucher deleted successfully.' });
  } catch (err) {
    console.error('Delete voucher error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete voucher.' });
  }
});

module.exports = router;
