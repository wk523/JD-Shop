const { pool, query } = require('../config/db');

// Get all roles with their assigned permissions
const getAllRoles = async (req, res) => {
  try {
    const rolesRes = await query(`
      SELECT r.*, COUNT(u.id)::int as user_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.id
      ORDER BY r.id ASC
    `);

    const roles = rolesRes.rows;

    // Fetch permissions for each role
    for (const r of roles) {
      const permsRes = await query(
        `SELECT p.id, p.name, p.module, p.description
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1`,
        [r.id]
      );
      r.permissions = permsRes.rows;
    }

    return res.json({
      success: true,
      roles
    });
  } catch (err) {
    console.error('getAllRoles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve roles.' });
  }
};

// Get all available system permissions grouped by module
const getAllPermissions = async (req, res) => {
  try {
    const permsRes = await query(`SELECT * FROM permissions ORDER BY module, id ASC`);

    const grouped = {};
    permsRes.rows.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });

    return res.json({
      success: true,
      permissions: permsRes.rows,
      groupedPermissions: grouped
    });
  } catch (err) {
    console.error('getAllPermissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve permissions list.' });
  }
};

// Create Role with Permissions
const createRole = async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, description, permission_ids } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required.' });
    }

    await client.query('BEGIN');

    const roleRes = await client.query(
      `INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *`,
      [name.toLowerCase().trim().replace(/\s+/g, '_'), description || '']
    );

    const role = roleRes.rows[0];

    if (permission_ids && Array.isArray(permission_ids) && permission_ids.length > 0) {
      for (const pId of permission_ids) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [role.id, parseInt(pId)]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Role created successfully.',
      role
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createRole error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create role.' });
  } finally {
    client.release();
  }
};

// Update Role and set assigned Permissions
const updateRolePermissions = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { name, description, permission_ids } = req.body;

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE roles
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name ? name.toLowerCase().trim().replace(/\s+/g, '_') : null, description, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    if (permission_ids && Array.isArray(permission_ids)) {
      // Clear old permissions for this role
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);

      for (const pId of permission_ids) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, parseInt(pId)]
        );
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Role permissions updated successfully.',
      role: updateRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateRolePermissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update role permissions.' });
  } finally {
    client.release();
  }
};

// Delete Role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const delRes = await query(`DELETE FROM roles WHERE id = $1 RETURNING id`, [id]);

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    return res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (err) {
    console.error('deleteRole error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete role.' });
  }
};

module.exports = {
  getAllRoles,
  getAllPermissions,
  createRole,
  updateRolePermissions,
  deleteRole
};
