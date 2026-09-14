const { query } = require('../config/db');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Get All Categories (with product count)
const getAllCategories = async (req, res) => {
  try {
    const { status, all } = req.query;
    let whereClause = '';
    let params = [];

    if (status) {
      params.push(status);
      whereClause = `WHERE c.status = $1`;
    } else if (all !== 'true') {
      whereClause = `WHERE c.status = 'published'`;
    }

    const sql = `
      SELECT c.*, COUNT(p.id)::int as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'published'
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const resCat = await query(sql, params);

    return res.json({
      success: true,
      count: resCat.rows.length,
      categories: resCat.rows
    });
  } catch (err) {
    console.error('getAllCategories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve categories.' });
  }
};

// Get Category by ID or Slug
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = !isNaN(id);

    const sql = `SELECT * FROM categories WHERE ${isNum ? 'id = $1' : 'slug = $1'}`;
    const resCat = await query(sql, [id]);

    if (resCat.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const category = resCat.rows[0];

    // Fetch products under this category
    const prodsRes = await query(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = $1 AND p.status = 'published'`,
      [category.id]
    );

    return res.json({
      success: true,
      category,
      products: prodsRes.rows
    });
  } catch (err) {
    console.error('getCategoryById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve category details.' });
  }
};

// Create Category (Admin/Staff)
const createCategory = async (req, res) => {
  try {
    const { name, description, image, parent_id, status } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const baseSlug = slugify(name);
    let finalSlug = baseSlug;

    const slugCheck = await query(`SELECT id FROM categories WHERE slug = $1`, [finalSlug]);
    if (slugCheck.rows.length > 0) {
      finalSlug = `${baseSlug}-${Date.now()}`;
    }

    const insertRes = await query(
      `INSERT INTO categories (name, slug, description, image, parent_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        finalSlug,
        description || '',
        image || '',
        parent_id ? parseInt(parent_id) : null,
        status || 'active'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: insertRes.rows[0]
    });
  } catch (err) {
    console.error('createCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
};

// Update Category (Admin/Staff)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, parent_id, status } = req.body;

    const updateRes = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           image = COALESCE($3, image),
           parent_id = COALESCE($4, parent_id),
           status = COALESCE($5, status)
       WHERE id = $6
       RETURNING *`,
      [name, description, image, parent_id ? parseInt(parent_id) : null, status, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      category: updateRes.rows[0]
    });
  } catch (err) {
    console.error('updateCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
};

// Delete Category (Admin/Staff)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const delRes = await query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
