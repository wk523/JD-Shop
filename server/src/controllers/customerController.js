const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// GET all registered customers
const getAllCustomers = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.city, u.country, u.status, u.avatar, u.created_at,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.user_type = 'customer'
      GROUP BY u.id
      ORDER BY u.id DESC
    `);
    res.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customer list' });
  }
};

// GET customer by ID (with addresses & order history)
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await query(
      `SELECT id, name, email, phone, address, city, country, status, avatar, created_at, updated_at
       FROM users
       WHERE id = $1 AND user_type = 'customer'`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = userRes.rows[0];

    // Fetch customer's addresses
    const addressesRes = await query(
      `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC`,
      [id]
    );

    // Fetch customer's orders
    const ordersRes = await query(
      `SELECT id, order_number, total_amount, order_status, payment_status, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY id DESC`,
      [id]
    );

    res.json({
      success: true,
      customer: {
        ...customer,
        addresses: addressesRes.rows,
        orders: ordersRes.rows
      }
    });
  } catch (err) {
    console.error('Fetch customer detail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customer detail' });
  }
};

// CREATE new customer by Admin
const createCustomer = async (req, res) => {
  try {
    const { name, email, password, phone, city, country, status, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const roleRes = await query(`SELECT id FROM roles WHERE name = 'customer'`);
    const roleId = roleRes.rows.length > 0 ? roleRes.rows[0].id : null;

    const userRes = await query(
      `INSERT INTO users (name, email, password, phone, city, country, status, avatar, role_id, user_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'customer')
       RETURNING id, name, email, phone, city, country, status, avatar, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        phone || null,
        city || null,
        country || null,
        status || 'active',
        avatar || null,
        roleId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Customer account created successfully.',
      customer: userRes.rows[0]
    });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ success: false, message: 'Failed to create customer account.' });
  }
};

// UPDATE customer details by Admin
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, city, country, status, avatar } = req.body;

    const checkUser = await query(`SELECT id, password FROM users WHERE id = $1 AND user_type = 'customer'`, [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // If email is changing, check uniqueness
    if (email) {
      const emailCheck = await query(`SELECT id FROM users WHERE email = $1 AND id != $2`, [email.toLowerCase().trim(), id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Another user already uses this email.' });
      }
    }

    let hashedPassword = checkUser.rows[0].password;
    let passwordWasReset = false;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
      passwordWasReset = true;
    }

    const updatedRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           password = $3,
           phone = COALESCE($4, phone),
           city = COALESCE($5, city),
           country = COALESCE($6, country),
           status = COALESCE($7, status),
           avatar = COALESCE($8, avatar),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_type = 'customer'
       RETURNING id, name, email, phone, city, country, status, avatar, updated_at`,
      [
        name ? name.trim() : null,
        email ? email.toLowerCase().trim() : null,
        hashedPassword,
        phone !== undefined ? phone : null,
        city !== undefined ? city : null,
        country !== undefined ? country : null,
        status !== undefined ? status : null,
        avatar !== undefined ? avatar : null,
        id
      ]
    );

    const updatedCustomer = updatedRes.rows[0];

    // If password was reset by admin, notify customer via email
    if (passwordWasReset) {
      const { sendPasswordResetEmail } = require('../services/emailService');
      sendPasswordResetEmail({
        email: updatedCustomer.email,
        name: updatedCustomer.name,
        resetCodeOrPassword: password.trim(),
        isAdminReset: true
      }).catch(e => console.error('Admin password reset email error:', e));
    }

    res.json({
      success: true,
      message: passwordWasReset ? 'Customer details updated and new password sent via email.' : 'Customer updated successfully.',
      customer: updatedCustomer
    });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ success: false, message: 'Failed to update customer details.' });
  }
};

// DELETE customer by Admin
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const checkUser = await query(`SELECT id FROM users WHERE id = $1 AND user_type = 'customer'`, [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    await query(`DELETE FROM users WHERE id = $1`, [id]);

    res.json({ success: true, message: 'Customer account deleted successfully.' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete customer account.' });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
