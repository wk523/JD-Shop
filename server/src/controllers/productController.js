const { query } = require('../config/db');

// Helper to create URL-friendly slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Get all products (Public & Admin search/filtering)
const getAllProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      category_slug,
      is_featured,
      min_price,
      max_price,
      badge,
      status,
      sort,
      page = 1,
      limit = 20
    } = req.query;

    let conditions = [];
    let params = [];

    // Filter by status (default to published for public queries)
    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    } else if (!req.user || req.user.user_type === 'customer') {
      conditions.push(`p.status = 'published'`);
      conditions.push(`(c.status = 'published' OR p.category_id IS NULL)`);
    }

    // Search query
    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    // Filter by Category ID
    if (category) {
      params.push(parseInt(category));
      conditions.push(`p.category_id = $${params.length}`);
    }

    // Filter by Category Slug
    if (category_slug) {
      params.push(category_slug);
      conditions.push(`c.slug = $${params.length}`);
    }

    // Filter by Featured
    if (is_featured === 'true' || is_featured === true) {
      conditions.push(`p.is_featured = true`);
    }

    // Filter by Min/Max Price
    if (min_price) {
      params.push(parseFloat(min_price));
      conditions.push(`p.price >= $${params.length}`);
    }
    if (max_price) {
      params.push(parseFloat(max_price));
      conditions.push(`p.price <= $${params.length}`);
    }

    // Filter by Badge
    if (badge) {
      params.push(badge);
      conditions.push(`p.badge = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Order By clause
    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort === 'top_sales' || sort === 'top_sale' || sort === 'bestseller') orderBy = 'ORDER BY COALESCE(p.total_sales, 0) DESC, p.reviews_count DESC';
    else if (sort === 'price_asc') orderBy = 'ORDER BY p.price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY p.price DESC';
    else if (sort === 'rating') orderBy = 'ORDER BY p.rating DESC';
    else if (sort === 'oldest') orderBy = 'ORDER BY p.created_at ASC';

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const countSql = `
      SELECT COUNT(p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;

    const dataSql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderBy}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    // Execute query (omitting limit and offset from count query)
    const countRes = await query(countSql, params.slice(0, params.length - 2));
    const totalCount = parseInt(countRes.rows[0].total || 0);

    const dataRes = await query(dataSql, params);

    // Fetch Active Promotion Campaigns
    const activePromosRes = await query(
      `SELECT pp.product_id, pp.sale_price, pp.discount_percentage, p.title as campaign_title
       FROM promotion_products pp
       JOIN promotions p ON pp.promotion_id = p.id
       WHERE p.status = 'active'
         AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
         AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)`
    );

    const promoMap = {};
    activePromosRes.rows.forEach(item => {
      promoMap[item.product_id] = item;
    });

    const products = dataRes.rows.map(p => {
      const activePromo = promoMap[p.id];
      if (activePromo) {
        let promoPrice = parseFloat(p.price);
        if (activePromo.sale_price) {
          promoPrice = parseFloat(activePromo.sale_price);
        } else if (activePromo.discount_percentage) {
          promoPrice = parseFloat((promoPrice * (1 - parseFloat(activePromo.discount_percentage) / 100)).toFixed(2));
        }
        return {
          ...p,
          price: promoPrice,
          old_price: parseFloat(p.price),
          badge: p.badge || 'SALE'
        };
      }
      return {
        ...p,
        old_price: null
      };
    });

    return res.json({
      success: true,
      count: products.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      products: products
    });
  } catch (err) {
    console.error('getAllProducts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve products.' });
  }
};

// Get Product by ID or Slug
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = !isNaN(id);

    const sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug, c.status as category_status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${isNum ? 'p.id = $1' : 'p.slug = $1'}
    `;

    const resProduct = await query(sql, [id]);

    if (resProduct.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = resProduct.rows[0];

    // Customer check: Hide product if product is draft OR if parent category is draft
    if (!req.user || req.user.user_type === 'customer') {
      if (product.status === 'draft' || (product.category_id && product.category_status === 'draft')) {
        return res.status(404).json({ success: false, message: 'Product is not available.' });
      }
    }

    // Fetch Related Products in same category
    let relatedProducts = [];
    if (product.category_id) {
      const relRes = await query(
        `SELECT p.*, c.name as category_name FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.category_id = $1 AND p.id != $2 AND p.status = 'published'
         LIMIT 4`,
        [product.category_id, product.id]
      );
      relatedProducts = relRes.rows;
    }

    // Fetch active promotions map
    const activePromosRes = await query(
      `SELECT pp.product_id, pp.sale_price, pp.discount_percentage
       FROM promotion_products pp
       JOIN promotions p ON pp.promotion_id = p.id
       WHERE p.status = 'active'
         AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
         AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)`
    );

    const promoMap = {};
    activePromosRes.rows.forEach(item => {
      promoMap[item.product_id] = item;
    });

    const mapPromo = (p) => {
      const activePromo = promoMap[p.id];
      if (activePromo) {
        let promoPrice = parseFloat(p.price);
        if (activePromo.sale_price) {
          promoPrice = parseFloat(activePromo.sale_price);
        } else if (activePromo.discount_percentage) {
          promoPrice = parseFloat((promoPrice * (1 - parseFloat(activePromo.discount_percentage) / 100)).toFixed(2));
        }
        return {
          ...p,
          price: promoPrice,
          old_price: parseFloat(p.price),
          badge: p.badge || 'SALE'
        };
      }
      return {
        ...p,
        old_price: null
      };
    };

    return res.json({
      success: true,
      product: mapPromo(product),
      relatedProducts: relatedProducts.map(mapPromo)
    });
  } catch (err) {
    console.error('getProductById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve product details.' });
  }
};

// Create Product (Admin/Staff)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      sku,
      category_id,
      images,
      badge,
      is_featured,
      status
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Product name and price are required.' });
    }

    const formattedSku = sku ? sku.trim().toUpperCase() : `JD-${Date.now().toString().slice(-6)}`;

    // Check SKU uniqueness
    if (formattedSku) {
      const skuCheck = await query(`SELECT id FROM products WHERE UPPER(sku) = $1`, [formattedSku]);
      if (skuCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: `SKU code "${formattedSku}" already exists. SKU must be unique.` });
      }
    }

    const baseSlug = slugify(name);
    let finalSlug = baseSlug;
    
    // Ensure slug uniqueness
    const slugCheck = await query(`SELECT id FROM products WHERE slug = $1`, [finalSlug]);
    if (slugCheck.rows.length > 0) {
      finalSlug = `${baseSlug}-${Date.now()}`;
    }

    const formattedImages = images ? (Array.isArray(images) ? JSON.stringify(images) : JSON.stringify([images])) : JSON.stringify([]);

    const insertRes = await query(
      `INSERT INTO products (
        name, slug, description, price, stock, sku,
        category_id, images, badge, is_featured, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name,
        finalSlug,
        description || '',
        parseFloat(price),
        parseInt(stock || 0),
        formattedSku,
        category_id ? parseInt(category_id) : null,
        formattedImages,
        badge || null,
        is_featured === true || is_featured === 'true',
        status || 'published'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: insertRes.rows[0]
    });
  } catch (err) {
    console.error('createProduct error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
};

// Update Product (Admin/Staff)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      stock,
      sku,
      category_id,
      images,
      badge,
      is_featured,
      status
    } = req.body;

    let formattedSku = undefined;
    if (sku !== undefined && sku !== null) {
      formattedSku = sku.trim().toUpperCase();
      if (formattedSku) {
        const skuCheck = await query(`SELECT id FROM products WHERE UPPER(sku) = $1 AND id != $2`, [formattedSku, id]);
        if (skuCheck.rows.length > 0) {
          return res.status(400).json({ success: false, message: `SKU code "${formattedSku}" already exists. SKU must be unique.` });
        }
      }
    }

    const formattedImages = images ? (Array.isArray(images) ? JSON.stringify(images) : JSON.stringify([images])) : undefined;

    const updateRes = await query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           sku = COALESCE($5, sku),
           category_id = COALESCE($6, category_id),
           images = COALESCE($7, images),
           badge = COALESCE($8, badge),
           is_featured = COALESCE($9, is_featured),
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        name,
        description,
        price ? parseFloat(price) : null,
        stock !== undefined ? parseInt(stock) : null,
        formattedSku,
        category_id ? parseInt(category_id) : null,
        formattedImages,
        badge,
        is_featured !== undefined ? (is_featured === true || is_featured === 'true') : null,
        status,
        id
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({
      success: true,
      message: 'Product updated successfully.',
      product: updateRes.rows[0]
    });
  } catch (err) {
    console.error('updateProduct error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

// Delete Product (Admin/Staff)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const delRes = await query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('deleteProduct error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
