const { query } = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    // 1. Total Revenue (sum of total_amount for non-cancelled orders)
    const revRes = await query(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
      WHERE order_status != 'cancelled'
    `);
    const totalRevenue = parseFloat(revRes.rows[0].total_revenue || 0);

    // 2. Total Orders Count
    const orderCountRes = await query(`SELECT COUNT(id)::int as total_orders FROM orders`);
    const totalOrders = orderCountRes.rows[0].total_orders;

    // 3. Total Published Products
    const prodCountRes = await query(`SELECT COUNT(id)::int as total_products FROM products WHERE status = 'published'`);
    const totalProducts = prodCountRes.rows[0].total_products;

    // 4. Total Customers Count
    const custCountRes = await query(`SELECT COUNT(id)::int as total_customers FROM users WHERE user_type = 'customer'`);
    const totalCustomers = custCountRes.rows[0].total_customers;

    // 5. Low Stock Products Alert (Stock <= 10)
    const lowStockRes = await query(`
      SELECT id, name, sku, stock, price, images
      FROM products
      WHERE stock <= 10 AND status = 'published'
      ORDER BY stock ASC
      LIMIT 6
    `);

    // 6. Recent 5 Orders
    const recentOrdersRes = await query(`
      SELECT id, order_number, customer_name, customer_email, total_amount, order_status, payment_status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // 7. Monthly Sales Chart Series (Last 6 Months)
    const monthlySalesRes = await query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month_label,
        DATE_TRUNC('month', created_at) as month_date,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(id)::int as order_count
      FROM orders
      WHERE order_status != 'cancelled'
      GROUP BY month_label, month_date
      ORDER BY month_date ASC
      LIMIT 6
    `);

    return res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
        lowStockProducts: lowStockRes.rows,
        recentOrders: recentOrdersRes.rows,
        monthlySales: monthlySalesRes.rows
      }
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to compute dashboard metrics.' });
  }
};

module.exports = {
  getDashboardStats
};
