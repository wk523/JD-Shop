const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'jdshop_super_secret_jwt_key_2026';

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      role: user.role_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Customer Register
const customerRegister = async (req, res) => {
  try {
    const { name, email, password, phone, address, city, country } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    // Check if email already registered
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default customer role
    const roleRes = await query(`SELECT id FROM roles WHERE name = 'customer'`);
    const roleId = roleRes.rows.length > 0 ? roleRes.rows[0].id : null;

    const userRes = await query(
      `INSERT INTO users (name, email, password, phone, address, city, country, role_id, user_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'customer', 'active')
       RETURNING id, name, email, phone, address, city, country, user_type, status, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword, phone || null, address || null, city || null, country || null, roleId]
    );

    const user = { ...userRes.rows[0], role_name: 'customer' };
    const token = generateToken(user);

    const selectedState = req.body.state || req.body.city || '';

    // Auto-add shipping address to user_addresses list if address is provided
    if (address && address.trim()) {
      try {
        await query(
          `INSERT INTO user_addresses (user_id, title, recipient_name, phone, address_line1, city, state, country, is_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [
            user.id,
            'Home',
            name.trim(),
            phone || '',
            address.trim(),
            selectedState ? selectedState.trim() : (country === 'Singapore' ? 'Singapore' : ''),
            selectedState ? selectedState.trim() : (country === 'Singapore' ? 'Singapore' : ''),
            country ? country.trim() : 'Malaysia'
          ]
        );
      } catch (addrErr) {
        console.error('Failed to auto-add user address on register:', addrErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to JD Shop.',
      token,
      user
    });
  } catch (err) {
    console.error('Customer Register Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// Customer Login
const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const userRes = await query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    // Check status
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated.' });
    }

    // Verify hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    delete user.password;

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user
    });
  } catch (err) {
    console.error('Customer Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// Admin & Staff Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter admin credentials.' });
    }

    const userRes = await query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1 AND u.user_type IN ('admin', 'staff')`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    }

    const user = userRes.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Admin account is inactive.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    }

    // Fetch user permissions list
    const permsRes = await query(
      `SELECT p.name, p.module FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );

    const permissions = permsRes.rows;

    const token = generateToken(user);
    delete user.password;

    return res.json({
      success: true,
      message: 'Admin access granted.',
      token,
      user,
      permissions
    });
  } catch (err) {
    console.error('Admin Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during admin login.' });
  }
};

// Get current logged-in user profile
const getMe = async (req, res) => {
  try {
    const user = req.user;
    let permissions = [];

    if (user.user_type === 'admin' || user.user_type === 'staff') {
      const permsRes = await query(
        `SELECT p.name, p.module FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1`,
        [user.role_id]
      );
      permissions = permsRes.rows;
    }

    return res.json({
      success: true,
      user,
      permissions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, city, country, avatar } = req.body;
    const userId = req.user.id;

    const updatedRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           city = COALESCE($4, city),
           country = COALESCE($5, country),
           avatar = COALESCE($6, avatar),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, name, email, phone, address, city, country, avatar, user_type, status`,
      [name, phone, address, city, country, avatar, userId]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedRes.rows[0]
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    // Fetch user password hash
    const userRes = await query(`SELECT password FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hashedNewPassword, userId]);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
};

// Forgot Password Request (Sends Email)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please enter your email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userRes = await query(`SELECT id, name, email FROM users WHERE email = $1`, [cleanEmail]);

    if (userRes.rows.length === 0) {
      // Return success to avoid email enumeration security leak
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.'
      });
    }

    const user = userRes.rows[0];
    const crypto = require('crypto');
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(24).toString('hex');

    // Clean previous reset tokens for this user
    await query(`DELETE FROM password_resets WHERE email = $1`, [cleanEmail]);

    // Insert reset token (valid for 30 minutes)
    await query(
      `INSERT INTO password_resets (email, token, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '30 minutes')`,
      [cleanEmail, `${resetCode}:${resetToken}`]
    );

    const { sendPasswordResetEmail } = require('../services/emailService');
    await sendPasswordResetEmail({
      email: cleanEmail,
      name: user.name,
      resetCodeOrPassword: resetCode,
      resetToken,
      isAdminReset: false
    });

    return res.json({
      success: true,
      message: 'A 6-digit password reset code has been sent to your email.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process password reset request.' });
  }
};

// Reset Password with Code / Token
const resetPassword = async (req, res) => {
  try {
    const { email, code, token, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    let tokenCheck;
    if (token) {
      tokenCheck = await query(
        `SELECT * FROM password_resets WHERE token LIKE $1 AND expires_at > CURRENT_TIMESTAMP`,
        [`%:${token}`]
      );
    } else if (email && code) {
      tokenCheck = await query(
        `SELECT * FROM password_resets WHERE email = $1 AND token LIKE $2 AND expires_at > CURRENT_TIMESTAMP`,
        [email.toLowerCase().trim(), `${code}:%`]
      );
    } else {
      return res.status(400).json({ success: false, message: 'Please provide email and 6-digit verification code.' });
    }

    if (!tokenCheck || tokenCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset code. Please request a new one.' });
    }

    const resetRecord = tokenCheck.rows[0];
    const userEmail = resetRecord.email;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2`, [hashedPassword, userEmail]);

    // Delete token after successful reset
    await query(`DELETE FROM password_resets WHERE email = $1`, [userEmail]);

    return res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
};

module.exports = {
  customerRegister,
  customerLogin,
  adminLogin,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};


