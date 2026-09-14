const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// Get all staff members & admins
const getAllStaff = async (req, res) => {
  try {
    const sql = `
      SELECT u.id, u.name, u.email, u.phone, u.status, u.user_type, u.role_id, u.created_at, u.updated_at,
             r.name as role_name, r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.user_type IN ('admin', 'staff')
      ORDER BY u.created_at DESC
    `;

    const resStaff = await query(sql);

    return res.json({
      success: true,
      count: resStaff.rows.length,
      staff: resStaff.rows
    });
  } catch (err) {
    console.error('getAllStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve staff members.' });
  }
};

// Create new Staff / Admin
const createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, role_id, status } = req.body;

    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertRes = await query(
      `INSERT INTO users (name, email, password, phone, role_id, user_type, status)
       VALUES ($1, $2, $3, $4, $5, 'staff', $6)
       RETURNING id, name, email, phone, role_id, user_type, status, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword, phone || null, parseInt(role_id), status || 'active']
    );

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      staff: insertRes.rows[0]
    });
  } catch (err) {
    console.error('createStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create staff member.' });
  }
};

// Update Staff / Admin
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role_id, status, password } = req.body;

    let passHash = undefined;
    if (password && password.trim() !== '') {
      passHash = await bcrypt.hash(password, 10);
    }

    const updateRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           role_id = COALESCE($3, role_id),
           status = COALESCE($4, status),
           password = COALESCE($5, password),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_type IN ('admin', 'staff')
       RETURNING id, name, email, phone, role_id, user_type, status, updated_at`,
      [name, phone, role_id ? parseInt(role_id) : null, status, passHash, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    return res.json({
      success: true,
      message: 'Staff updated successfully.',
      staff: updateRes.rows[0]
    });
  } catch (err) {
    console.error('updateStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update staff member.' });
  }
};

// Delete Staff
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self deletion
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own logged-in account.' });
    }

    const delRes = await query(
      `DELETE FROM users WHERE id = $1 AND user_type IN ('admin', 'staff') RETURNING id`,
      [id]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    return res.json({ success: true, message: 'Staff member removed successfully.' });
  } catch (err) {
    console.error('deleteStaff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete staff member.' });
  }
};

module.exports = {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff
};
