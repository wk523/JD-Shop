const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jdshop_super_secret_jwt_key_2026');
    
    // Fetch fresh user data with role
    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.address, u.city, u.country, u.avatar, u.user_type, u.status, u.role_id, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User profile no longer exists.' });
    }

    const user = userRes.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated or suspended.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Ensure user is an Admin or Staff member
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.user_type !== 'admin' && req.user.user_type !== 'staff')) {
    return res.status(403).json({ success: false, message: 'Access denied. Administrator or staff access required.' });
  }
  next();
};

// Check for explicit granular permissions
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Super Admin has full permission bypass
    if (req.user.role_name === 'super_admin') {
      return next();
    }

    if (!req.user.role_id) {
      return res.status(403).json({ success: false, message: 'Access denied. No role assigned.' });
    }

    try {
      const permRes = await query(
        `SELECT 1 FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1 AND p.name = $2`,
        [req.user.role_id, permissionName]
      );

      if (permRes.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires permission: ${permissionName}`
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to verify permission.' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission
};
