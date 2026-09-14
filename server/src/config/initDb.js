const bcrypt = require('bcryptjs');
const { ensureDatabaseExists, pool, query } = require('./db');

const initSchemaAndSeed = async () => {
  try {
    console.log('🚀 Checking & initializing PostgreSQL database for JD Shop...');
    await ensureDatabaseExists();

    // 1. Roles Table
    await query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Permissions Table
    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        module VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Role Permissions Join Table
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `);

    // 4. Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        role_id INT REFERENCES roles(id) ON DELETE SET NULL,
        user_type VARCHAR(20) NOT NULL DEFAULT 'customer',
        status VARCHAR(20) DEFAULT 'active',
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Categories Table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        image TEXT,
        parent_id INT REFERENCES categories(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'published',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration updates for Status
    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';`);
    await query(`UPDATE categories SET status = 'published' WHERE status IS NULL OR status = 'active';`);

    // 6. Products Table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        sku VARCHAR(100),
        category_id INT REFERENCES categories(id) ON DELETE SET NULL,
        images JSONB DEFAULT '[]'::jsonb,
        badge VARCHAR(50),
        rating NUMERIC(2, 1) DEFAULT 5.0,
        reviews_count INT DEFAULT 0,
        total_sales INT DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'published',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sales INT DEFAULT 0;`);

    // 7. Orders Table
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_email VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(30),
        shipping_address TEXT NOT NULL,
        shipping_city VARCHAR(100),
        shipping_country VARCHAR(100),
        shipping_postal_code VARCHAR(20),
        subtotal NUMERIC(10, 2) NOT NULL,
        shipping_fee NUMERIC(10, 2) DEFAULT 0.00,
        discount NUMERIC(10, 2) DEFAULT 0.00,
        voucher_code VARCHAR(50),
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Cash On Delivery',
        payment_status VARCHAR(20) DEFAULT 'pending',
        order_status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50);`);
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(30) DEFAULT 'none';`);
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(255);`);
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);`);

    // Refund Requests Table
    await query(`
      CREATE TABLE IF NOT EXISTS refund_requests (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        reason VARCHAR(255) NOT NULL,
        comment TEXT,
        amount NUMERIC(10, 2) NOT NULL,
        images JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(30) DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Order Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        product_image TEXT,
        price NUMERIC(10, 2) NOT NULL,
        quantity INT NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL
      );
    `);

    // 9. Cart Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );
    `);

    // 10. Vouchers Table
    await query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
        discount_value NUMERIC(10, 2) NOT NULL,
        min_spend NUMERIC(10, 2) DEFAULT 0.00,
        expiry_date TIMESTAMP,
        usage_limit INT DEFAULT 100,
        times_used INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Promotions Table
    await query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        discount_percentage NUMERIC(5, 2) DEFAULT 10.00,
        banner_image TEXT,
        status VARCHAR(20) DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`ALTER TABLE promotions ADD COLUMN IF NOT EXISTS banner_image TEXT;`);
    await query(`ALTER TABLE promotions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await query(`ALTER TABLE promotions ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;`);

    // 12. Promotion Products Table
    await query(`
      CREATE TABLE IF NOT EXISTS promotion_products (
        id SERIAL PRIMARY KEY,
        promotion_id INT REFERENCES promotions(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        sale_price NUMERIC(10, 2),
        discount_percentage NUMERIC(5, 2),
        UNIQUE(promotion_id, product_id)
      );
    `);

    // 13. User Addresses Table
    await query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(50) DEFAULT 'Home',
        recipient_name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) NOT NULL DEFAULT 'Malaysia',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Product Reviews Table
    await query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        images JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, product_id, user_id)
      );
    `);

    // 15. SMTP Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id SERIAL PRIMARY KEY,
        smtp_host VARCHAR(255) NOT NULL,
        smtp_port INT NOT NULL DEFAULT 2525,
        smtp_user VARCHAR(255),
        smtp_pass VARCHAR(255),
        smtp_secure BOOLEAN DEFAULT false,
        smtp_from_name VARCHAR(150) DEFAULT 'JD Shop',
        smtp_from_email VARCHAR(150) DEFAULT 'from@example.com',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 16. Password Resets Table
    await query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default SMTP settings if empty
    const smtpCheck = await query(`SELECT id FROM smtp_settings LIMIT 1`);
    if (smtpCheck.rows.length === 0) {
      await query(`
        INSERT INTO smtp_settings (smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_name, smtp_from_email)
        VALUES ('sandbox.smtp.mailtrap.io', 2525, 'e216f3f32c57a6', '2ea6a6f6f20a60', false, 'JD Shop', 'from@example.com')
      `);
    }

    // 17. Stripe Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS stripe_settings (
        id SERIAL PRIMARY KEY,
        stripe_secret_key VARCHAR(255) NOT NULL,
        stripe_publishable_key VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default Stripe settings if empty
    const stripeCheck = await query(`SELECT id FROM stripe_settings LIMIT 1`);
    if (stripeCheck.rows.length === 0) {
      await query(`
        INSERT INTO stripe_settings (stripe_secret_key, stripe_publishable_key)
        VALUES (
          process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
          process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
        )
      `);
    }

    console.log('✅ Database schema tables created successfully.');

    // --- SEED INITIAL VOUCHERS & PROMOTIONS ---
    const vouchersData = [
      { code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, min_spend: 50, usage_limit: 500, status: 'active' },
      { code: 'MEGA99', discount_type: 'fixed', discount_value: 15, min_spend: 100, usage_limit: 200, status: 'active' },
      { code: 'VIP20', discount_type: 'percentage', discount_value: 20, min_spend: 150, usage_limit: 100, status: 'active' }
    ];

    for (const v of vouchersData) {
      await query(
        `INSERT INTO vouchers (code, discount_type, discount_value, min_spend, usage_limit, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [v.code, v.discount_type, v.discount_value, v.min_spend, v.usage_limit, v.status]
      );
    }

    const promotionsData = [
      { title: '9-9 Super Shopping Day', discount_percentage: 15, status: 'active' },
      { title: 'Mid-Year Flash Deals', discount_percentage: 20, status: 'active' }
    ];

    for (const p of promotionsData) {
      await query(
        `INSERT INTO promotions (title, discount_percentage, status)
         SELECT $1::varchar, $2::numeric, $3::varchar
         WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE title = $1::varchar)`,
        [p.title, p.discount_percentage, p.status]
      );
    }

    // --- SEED INITIAL DATA ---

    // A. Seed Roles
    const rolesData = [
      { name: 'super_admin', description: 'Full access to all system modules and settings' },
      { name: 'admin', description: 'Administrative access for store operations' },
      { name: 'manager', description: 'Can manage products, categories, and orders' },
      { name: 'staff', description: 'Order fulfillment and inventory support' },
      { name: 'customer', description: 'Registered store shopper' }
    ];

    for (const r of rolesData) {
      await query(
        `INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [r.name, r.description]
      );
    }

    // Get Role IDs
    const rolesRes = await query(`SELECT id, name FROM roles`);
    const roleMap = {};
    rolesRes.rows.forEach(r => { roleMap[r.name] = r.id; });

    // B. Seed Permissions
    const permissionsData = [
      { name: 'products:read', module: 'products', description: 'View products list and details' },
      { name: 'products:create', module: 'products', description: 'Add new products' },
      { name: 'products:update', module: 'products', description: 'Edit existing products' },
      { name: 'products:delete', module: 'products', description: 'Remove products' },
      
      { name: 'categories:read', module: 'categories', description: 'View product categories' },
      { name: 'categories:manage', module: 'categories', description: 'Create, edit, and delete categories' },
      
      { name: 'orders:read', module: 'orders', description: 'View customer orders' },
      { name: 'orders:manage', module: 'orders', description: 'Update order status and fulfillment' },

      { name: 'staff:manage', module: 'staff', description: 'Create and manage staff accounts' },
      { name: 'roles:manage', module: 'roles', description: 'Manage roles and security permissions' },
      { name: 'customers:read', module: 'customers', description: 'View registered customer details' },
      { name: 'analytics:read', module: 'analytics', description: 'View sales performance and reports' }
    ];

    for (const p of permissionsData) {
      await query(
        `INSERT INTO permissions (name, module, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [p.name, p.module, p.description]
      );
    }

    // Assign All Permissions to super_admin and admin
    const permsRes = await query(`SELECT id FROM permissions`);
    const superAdminRoleId = roleMap['super_admin'];
    const adminRoleId = roleMap['admin'];
    const managerRoleId = roleMap['manager'];

    for (const perm of permsRes.rows) {
      await query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [superAdminRoleId, perm.id]
      );
      await query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [adminRoleId, perm.id]
      );
    }

    // Assign Manager Permissions (products, categories, orders, analytics)
    const managerPerms = await query(`SELECT id FROM permissions WHERE module IN ('products', 'categories', 'orders', 'analytics')`);
    for (const perm of managerPerms.rows) {
      await query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [managerRoleId, perm.id]
      );
    }

    // C. Seed Users (Hashed Passwords)
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const staffPasswordHash = await bcrypt.hash('staff123', 10);
    const customerPasswordHash = await bcrypt.hash('customer123', 10);

    // 1. Super Admin User
    await query(
      `INSERT INTO users (name, email, password, phone, role_id, user_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      ['JD Admin', 'admin@jdshop.com', adminPasswordHash, '+1 800-555-0199', superAdminRoleId, 'admin', 'active']
    );

    // 2. Staff User
    await query(
      `INSERT INTO users (name, email, password, phone, role_id, user_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      ['Sarah Jenkins (Staff)', 'staff@jdshop.com', staffPasswordHash, '+1 800-555-0211', roleMap['staff'], 'staff', 'active']
    );

    // 3. Customer User
    await query(
      `INSERT INTO users (name, email, password, phone, address, city, country, role_id, user_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
      ['John Customer', 'customer@jdshop.com', customerPasswordHash, '+1 555-0144', '123 Main Street, Suite 400', 'New York', 'United States', roleMap['customer'], 'customer', 'active']
    );

    // Seed Sample Customer Address
    const johnRes = await query(`SELECT id FROM users WHERE email = 'customer@jdshop.com'`);
    if (johnRes.rows.length > 0) {
      const johnId = johnRes.rows[0].id;
      const addrCheck = await query(`SELECT id FROM user_addresses WHERE user_id = $1`, [johnId]);
      if (addrCheck.rows.length === 0) {
        await query(
          `INSERT INTO user_addresses (user_id, title, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [johnId, 'Home', 'John Customer', '+1 555-0144', '123 Main Street, Suite 400', 'Downtown', 'New York', 'NY', '10001', 'United States', true]
        );
      }
    }

    // D. Seed Categories
    const categoriesData = [
      { name: 'Fashion & Apparel', slug: 'fashion', description: 'Trendy clothing, shirts, jackets and dresses', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80' },
      { name: 'Footwear & Shoes', slug: 'footwear', description: 'Sneakers, formal shoes, boots and sandals', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80' },
      { name: 'Luxury Watches', slug: 'watches', description: 'Classic timepieces, smartwatches and luxury watch bands', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80' },
      { name: 'Beauty & Skincare', slug: 'beauty', description: 'Premium cosmetics, skincare serums and fragrances', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80' },
      { name: 'Electronics & Tech', slug: 'electronics', description: 'Headphones, laptops, smartphones and accessories', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
      { name: 'Home & Living', slug: 'home-living', description: 'Modern home decor, lighting, gifts and cookware', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80' }
    ];

    for (const c of categoriesData) {
      await query(
        `INSERT INTO categories (name, slug, description, image) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING`,
        [c.name, c.slug, c.description, c.image]
      );
    }

    const catRes = await query(`SELECT id, slug FROM categories`);
    const catMap = {};
    catRes.rows.forEach(c => { catMap[c.slug] = c.id; });

    // E. Seed Products
    const productsData = [
      {
        name: 'Wireless Noise-Canceling Headphones',
        slug: 'wireless-noise-canceling-headphones',
        description: 'Immersive sound experience with active noise cancellation, 30-hour battery life, and ultra-soft memory foam ear cushions.',
        price: 199.99,
        stock: 45,
        sku: 'JD-HEAD-001',
        category_id: catMap['electronics'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80']),
        badge: 'SALE',
        rating: 4.8,
        reviews_count: 124,
        is_featured: true
      },
      {
        name: 'Classic Automatic Chronograph Watch',
        slug: 'classic-automatic-chronograph-watch',
        description: 'Premium stainless steel case with sapphire crystal glass, genuine leather strap, and 50m water resistance.',
        price: 349.00,
        stock: 18,
        sku: 'JD-WATCH-002',
        category_id: catMap['watches'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80']),
        badge: 'HOT',
        rating: 4.9,
        reviews_count: 89,
        is_featured: true
      },
      {
        name: 'Urban Runner Performance Sneakers',
        slug: 'urban-runner-performance-sneakers',
        description: 'Lightweight breathable mesh upper with high-rebound cushioning for maximum comfort during intense workouts or casual walks.',
        price: 119.50,
        stock: 60,
        sku: 'JD-SHOE-003',
        category_id: catMap['footwear'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80']),
        badge: 'NEW',
        rating: 4.7,
        reviews_count: 56,
        is_featured: true
      },
      {
        name: 'Hydrating Botanical Facial Serum',
        slug: 'hydrating-botanical-facial-serum',
        description: 'Enriched with Hyaluronic Acid, Niacinamide and organic botanical extracts to nourish, plump and brighten tired skin.',
        price: 48.00,
        stock: 120,
        sku: 'JD-BEAUTY-004',
        category_id: catMap['beauty'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80']),
        badge: 'ORGANIC',
        rating: 4.9,
        reviews_count: 210,
        is_featured: true
      },
      {
        name: 'Designer Italian Leather Jacket',
        slug: 'designer-italian-leather-jacket',
        description: 'Crafted from 100% genuine full-grain Italian lambskin leather with custom silver-toned hardware and silk interior lining.',
        price: 299.99,
        stock: 12,
        sku: 'JD-FASH-005',
        category_id: catMap['fashion'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80']),
        badge: 'HOT',
        rating: 4.8,
        reviews_count: 42,
        is_featured: true
      },
      {
        name: 'Minimalist Nordic Ceramic Table Lamp',
        slug: 'nordic-ceramic-table-lamp',
        description: 'Soft warm LED glow with touch-dimmable controls, handcrafted ceramic body and natural linen lampshade.',
        price: 85.00,
        stock: 25,
        sku: 'JD-HOME-006',
        category_id: catMap['home-living'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80']),
        badge: 'NEW',
        rating: 4.6,
        reviews_count: 31,
        is_featured: false
      },
      {
        name: 'Smart Fitness Tracker Watch V2',
        slug: 'smart-fitness-tracker-watch-v2',
        description: 'Tracks heart rate, SpO2, sleep patterns, 20+ sports modes, 14-day battery life and water resistance up to 50 meters.',
        price: 89.99,
        stock: 5, // Low stock demo!
        sku: 'JD-WATCH-007',
        category_id: catMap['watches'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1510017803434-a899398421b3?auto=format&fit=crop&w=800&q=80']),
        badge: 'SALE',
        rating: 4.5,
        reviews_count: 78,
        is_featured: false
      },
      {
        name: 'Luxury Velvet Evening Clutch Bag',
        slug: 'luxury-velvet-evening-clutch-bag',
        description: 'Handcrafted velvet clutch with gold chain shoulder strap, secure magnetic closure, and multiple card slots.',
        price: 75.00,
        stock: 30,
        sku: 'JD-FASH-008',
        category_id: catMap['fashion'],
        images: JSON.stringify(['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80']),
        badge: 'NEW',
        rating: 4.9,
        reviews_count: 19,
        is_featured: false
      }
    ];

    for (const p of productsData) {
      await query(
        `INSERT INTO products 
          (name, slug, description, price, stock, sku, category_id, images, badge, rating, reviews_count, is_featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (slug) DO NOTHING`,
        [p.name, p.slug, p.description, p.price, p.stock, p.sku, p.category_id, p.images, p.badge, p.rating, p.reviews_count, p.is_featured]
      );
    }

    // F. Seed Sample Order
    const customerRes = await query(`SELECT id FROM users WHERE email = 'customer@jdshop.com'`);
    if (customerRes.rows.length > 0) {
      const custId = customerRes.rows[0].id;

      const orderCheck = await query(`SELECT id FROM orders WHERE order_number = 'JD-100881'`);
      if (orderCheck.rows.length === 0) {
        const prodRes = await query(`SELECT id, name, price, images FROM products LIMIT 2`);
        if (prodRes.rows.length >= 2) {
          const item1 = prodRes.rows[0];
          const item2 = prodRes.rows[1];
          const item1Images = typeof item1.images === 'string' ? JSON.parse(item1.images) : item1.images;
          const item2Images = typeof item2.images === 'string' ? JSON.parse(item2.images) : item2.images;

          const total = parseFloat(item1.price) * 1 + parseFloat(item2.price) * 2;

          const orderRes = await query(
            `INSERT INTO orders (
              order_number, user_id, customer_name, customer_email, customer_phone,
              shipping_address, shipping_city, shipping_country, shipping_postal_code,
              subtotal, shipping_fee, discount, total_amount, payment_method, payment_status, order_status, notes
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING id`,
            [
              'JD-100881', custId, 'John Customer', 'customer@jdshop.com', '+1 555-0144',
              '123 Main Street, Suite 400', 'New York', 'United States', '10001',
              total, 0.00, 0.00, total, 'Cash On Delivery', 'pending', 'processing', 'Please deliver after 2 PM'
            ]
          );

          const orderId = orderRes.rows[0].id;

          await query(
            `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [orderId, item1.id, item1.name, item1Images[0], item1.price, 1, item1.price]
          );

          await query(
            `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [orderId, item2.id, item2.name, item2Images[0], item2.price, 2, parseFloat(item2.price) * 2]
          );
        }
      }
    }

    // G. Seed Default Vouchers
    const vouchersSeed = [
      { code: 'WELCOME10', discount_type: 'percentage', discount_value: 10.00, min_spend: 50.00, expiry_days: 7 },
      { code: 'MEGA99', discount_type: 'fixed', discount_value: 15.00, min_spend: 100.00, expiry_hours: 34 },
      { code: 'FLASH50', discount_type: 'fixed', discount_value: 50.00, min_spend: 200.00, expiry_hours: 10 }
    ];

    for (const v of vouchersSeed) {
      const intervalSql = v.expiry_days ? `${v.expiry_days} days` : `${v.expiry_hours} hours`;
      await query(
        `INSERT INTO vouchers (code, discount_type, discount_value, min_spend, expiry_date, usage_limit, status)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '${intervalSql}', 100, 'active')
         ON CONFLICT (code) DO NOTHING`,
        [v.code, v.discount_type, v.discount_value, v.min_spend]
      );
    }

    // Set default expiry_date for any existing vouchers without an expiration date
    await query(`UPDATE vouchers SET expiry_date = CURRENT_TIMESTAMP + INTERVAL '7 days' WHERE expiry_date IS NULL`);

    console.log('🎉 Database initialization & seed complete!');
  } catch (err) {
    console.error('❌ Error during database initialization:', err);
    throw err;
  }
};

if (require.main === module) {
  initSchemaAndSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initSchemaAndSeed;
