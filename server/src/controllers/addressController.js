const { query } = require('../config/db');

// Get all addresses for logged-in user
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC`,
      [userId]
    );
    res.json({ success: true, addresses: result.rows });
  } catch (err) {
    console.error('Fetch addresses error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user addresses' });
  }
};

// Create new address
const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default } = req.body;

    if (!recipient_name || !phone || !address_line1 || !city || !country) {
      return res.status(400).json({ success: false, message: 'Recipient name, phone, address line 1, city, and country are required.' });
    }

    // Check if this is the user's first address
    const existing = await query(`SELECT count(*) FROM user_addresses WHERE user_id = $1`, [userId]);
    const isFirstAddress = parseInt(existing.rows[0].count, 10) === 0;
    const makeDefault = is_default || isFirstAddress;

    if (makeDefault) {
      await query(`UPDATE user_addresses SET is_default = false WHERE user_id = $1`, [userId]);
    }

    const result = await query(
      `INSERT INTO user_addresses (user_id, title, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        title || 'Home',
        recipient_name.trim(),
        phone.trim(),
        address_line1.trim(),
        address_line2 ? address_line2.trim() : null,
        city.trim(),
        state ? state.trim() : null,
        postal_code ? postal_code.trim() : null,
        country.trim(),
        makeDefault
      ]
    );

    res.status(201).json({ success: true, message: 'Address created successfully', address: result.rows[0] });
  } catch (err) {
    console.error('Create address error:', err);
    res.status(500).json({ success: false, message: 'Failed to create address' });
  }
};

// Update existing address
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default } = req.body;

    // Verify ownership
    const checkOwner = await query(`SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (checkOwner.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized' });
    }

    if (is_default) {
      await query(`UPDATE user_addresses SET is_default = false WHERE user_id = $1`, [userId]);
    }

    const result = await query(
      `UPDATE user_addresses
       SET title = COALESCE($1, title),
           recipient_name = COALESCE($2, recipient_name),
           phone = COALESCE($3, phone),
           address_line1 = COALESCE($4, address_line1),
           address_line2 = COALESCE($5, address_line2),
           city = COALESCE($6, city),
           state = COALESCE($7, state),
           postal_code = COALESCE($8, postal_code),
           country = COALESCE($9, country),
           is_default = COALESCE($10, is_default),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [title, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default, id, userId]
    );

    res.json({ success: true, message: 'Address updated successfully', address: result.rows[0] });
  } catch (err) {
    console.error('Update address error:', err);
    res.status(500).json({ success: false, message: 'Failed to update address' });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const checkAddr = await query(`SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (checkAddr.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized' });
    }

    const wasDefault = checkAddr.rows[0].is_default;
    await query(`DELETE FROM user_addresses WHERE id = $1 AND user_id = $2`, [id, userId]);

    // If deleted address was default, promote the next available address as default
    if (wasDefault) {
      const nextAddr = await query(
        `SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (nextAddr.rows.length > 0) {
        await query(`UPDATE user_addresses SET is_default = true WHERE id = $1`, [nextAddr.rows[0].id]);
      }
    }x``

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Delete address error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
};

// Set specific address as default
const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const checkAddr = await query(`SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (checkAddr.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized' });
    }

    await query(`UPDATE user_addresses SET is_default = false WHERE user_id = $1`, [userId]);
    await query(`UPDATE user_addresses SET is_default = true WHERE id = $1 AND user_id = $2`, [id, userId]);

    res.json({ success: true, message: 'Default address updated successfully' });
  } catch (err) {
    console.error('Set default address error:', err);
    res.status(500).json({ success: false, message: 'Failed to set default address' });
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
