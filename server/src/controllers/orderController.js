const { pool, query } = require('../config/db');
const { logPaymentTransaction } = require('../utils/paymentLogger');
const { sendOrderReceiptEmail, sendPaymentSuccessEmail, sendRefundSuccessEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const Stripe = require('stripe');

const { getStripeKeys } = require('./settingsController');

// Helper function to issue automated refund through Stripe API
const executeStripeGatewayRefund = async (order, allowManualFallback = false) => {
  const method = (order.payment_method || '').toLowerCase();
  const isStripeOrder = method.includes('stripe') || method.includes('card') || Boolean(order.stripe_payment_intent) || Boolean(order.stripe_session_id);

  if (!isStripeOrder) {
    return { success: true, stripeRefundId: null, isManual: true, message: 'Non-gateway order approved for manual refund.' };
  }

  const keys = await getStripeKeys();
  const stripe = Stripe(keys.secretKey);

  let paymentIntentId = order.stripe_payment_intent;

  // Level 1: Check Stripe Checkout Session
  if (!paymentIntentId && order.stripe_session_id) {
    try {
      const sessionObj = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (sessionObj.payment_intent) {
        paymentIntentId = typeof sessionObj.payment_intent === 'string' ? sessionObj.payment_intent : sessionObj.payment_intent.id;
      }
    } catch (err) {
      console.warn('[STRIPE RETRIEVE SESSION WARN]', err.message);
    }
  }

  // Level 2: Search PaymentIntents using metadata or order number
  if (!paymentIntentId) {
    try {
      const searchRes = await stripe.paymentIntents.search({
        query: `metadata['order_number']:'${order.order_number}' OR metadata['order_id']:'${order.id}'`
      });
      if (searchRes.data && searchRes.data.length > 0) {
        paymentIntentId = searchRes.data[0].id;
      }
    } catch (err) {
      console.warn('[STRIPE SEARCH PI WARN]', err.message);
    }
  }

  // Level 3: List recent Stripe Checkout Sessions and match order_number / order_id / email
  if (!paymentIntentId) {
    try {
      const recentSessions = await stripe.checkout.sessions.list({ limit: 50 });
      const matchedSession = recentSessions.data.find(s => 
        s.metadata?.order_number === order.order_number ||
        s.metadata?.order_id === String(order.id) ||
        (s.customer_details?.email && s.customer_details.email.toLowerCase() === (order.customer_email || '').toLowerCase())
      );
      if (matchedSession && matchedSession.payment_intent) {
        paymentIntentId = typeof matchedSession.payment_intent === 'string' ? matchedSession.payment_intent : matchedSession.payment_intent.id;
      }
    } catch (err) {
      console.warn('[STRIPE LIST SESSIONS WARN]', err.message);
    }
  }

  // Level 4: List recent PaymentIntents and match description / metadata
  if (!paymentIntentId) {
    try {
      const recentIntents = await stripe.paymentIntents.list({ limit: 50 });
      const matchedIntent = recentIntents.data.find(pi => 
        (pi.description && pi.description.includes(order.order_number)) ||
        pi.metadata?.order_number === order.order_number ||
        pi.metadata?.order_id === String(order.id)
      );
      if (matchedIntent) {
        paymentIntentId = matchedIntent.id;
      }
    } catch (err) {
      console.warn('[STRIPE LIST INTENTS WARN]', err.message);
    }
  }

  // If paymentIntentId found, save it back to DB for future reference
  if (paymentIntentId) {
    try {
      await query(`UPDATE orders SET stripe_payment_intent = $1 WHERE id = $2`, [paymentIntentId, order.id]);
    } catch (dbErr) {
      console.warn('[DB UPDATE INTENT WARN]', dbErr.message);
    }
  }

  if (!paymentIntentId) {
    if (allowManualFallback) {
      return {
        success: true,
        isManual: true,
        stripeRefundId: null,
        message: 'No Stripe transaction ID found. Order approved as Manual / Offline Refund.'
      };
    }

    return {
      success: false,
      canForceManual: true,
      message: `Gateway Refund Failed: No active Stripe transaction record found for order ${order.order_number}. If this order was paid offline or via test credentials, click "Approve as Manual Refund".`
    };
  }

  // Execute Stripe Refund API
  try {
    const refundAmountInSubunits = Math.round(parseFloat(order.total_amount || 0) * 100);
    const stripeRefund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmountInSubunits,
      reason: 'requested_by_customer'
    });

    console.log('✅ [STRIPE GATEWAY REFUND SUCCESSFUL]', stripeRefund.id, stripeRefund.status);
    return {
      success: true,
      stripeRefundId: stripeRefund.id,
      status: stripeRefund.status
    };
  } catch (stripeErr) {
    console.error('❌ [STRIPE GATEWAY REFUND ERROR]', stripeErr);
    if (allowManualFallback) {
      return {
        success: true,
        isManual: true,
        stripeRefundId: null,
        message: `Stripe API error (${stripeErr.message}). Approved as Manual Refund.`
      };
    }
    return {
      success: false,
      canForceManual: true,
      message: `Gateway Refund Failed: ${stripeErr.message || 'Stripe API error'}. You can choose "Approve as Manual Refund" if needed.`
    };
  }
};

// Create Order (Customer Checkout)
const createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_country,
      shipping_postal_code,
      items,
      payment_method,
      notes
    } = req.body;

    if (!customer_name || !customer_email || !shipping_address || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer details, shipping address, and items are required.' });
    }

    const userId = req.user ? req.user.id : null;

    await client.query('BEGIN');

    let subtotal = 0;
    const validatedItems = [];

    // Verify each product, check stock, and calculate subtotal
    for (const item of items) {
      const prodRes = await client.query(
        `SELECT id, name, price, stock, images FROM products WHERE id = $1 FOR UPDATE`,
        [item.product_id]
      );

      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product ID ${item.product_id} no longer exists.` });
      }

      const prod = prodRes.rows[0];
      const qty = parseInt(item.quantity || 1);

      if (prod.stock < qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${prod.name}". Only ${prod.stock} left.`
        });
      }

      // Check for active promotion campaign for product
      const activePromosRes = await client.query(
        `SELECT pp.sale_price, pp.discount_percentage
         FROM promotion_products pp
         JOIN promotions p ON pp.promotion_id = p.id
         WHERE pp.product_id = $1
           AND p.status = 'active'
           AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
           AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)
         LIMIT 1`,
        [item.product_id]
      );

      let itemPrice = parseFloat(prod.price);
      if (activePromosRes.rows.length > 0) {
        const promo = activePromosRes.rows[0];
        if (promo.sale_price) {
          itemPrice = parseFloat(promo.sale_price);
        } else if (promo.discount_percentage) {
          itemPrice = parseFloat((itemPrice * (1 - parseFloat(promo.discount_percentage) / 100)).toFixed(2));
        }
      }

      const itemTotal = itemPrice * qty;
      subtotal += itemTotal;

      const imgArr = typeof prod.images === 'string' ? JSON.parse(prod.images) : (prod.images || []);
      const primaryImg = imgArr.length > 0 ? imgArr[0] : '';

      validatedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        product_image: primaryImg,
        price: itemPrice,
        quantity: qty,
        total_price: itemTotal
      });
    }

    const discountVal = parseFloat(req.body.discount || 0);
    const shippingFee = subtotal > 100 ? 0.00 : 7.00;
    const grandTotal = Math.max(0, subtotal - discountVal + shippingFee);
    const orderNumber = `JD-${Math.floor(100000 + Math.random() * 900000)}`;

    const initialPaymentStatus = req.body.payment_status || (payment_method === 'Credit / Debit Card' ? 'paid' : 'pending');
    const initialOrderStatus = req.body.order_status || (initialPaymentStatus === 'paid' ? 'processing' : 'pending');

    const voucherCode = req.body.voucher_code || (req.body.appliedVoucher ? req.body.appliedVoucher.code : null);

    // Create order record
    const orderRes = await client.query(
      `INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_country, shipping_postal_code,
        subtotal, shipping_fee, discount, voucher_code, total_amount, payment_method, payment_status, order_status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        orderNumber,
        userId,
        customer_name,
        customer_email,
        customer_phone || null,
        shipping_address,
        shipping_city || null,
        shipping_country || null,
        shipping_postal_code || null,
        subtotal,
        shippingFee,
        discountVal,
        voucherCode || null,
        grandTotal,
        payment_method || 'Cash On Delivery',
        initialPaymentStatus,
        initialOrderStatus,
        notes || null
      ]
    );

    const order = orderRes.rows[0];
    const isInstantFinal = initialPaymentStatus === 'paid' || payment_method === 'Cash On Delivery';

    // Insert order items & deduct product stock if instant/COD
    for (const vItem of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, vItem.product_id, vItem.product_name, vItem.product_image, vItem.price, vItem.quantity, vItem.total_price]
      );

      if (isInstantFinal) {
        await client.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [vItem.quantity, vItem.product_id]
        );
      }
    }

    // Clear ONLY purchased items from DB cart if order is instantly final (COD or pre-paid)
    if (userId && isInstantFinal && validatedItems.length > 0) {
      const purchasedProdIds = validatedItems.map(item => item.product_id).filter(Boolean);
      if (purchasedProdIds.length > 0) {
        await client.query(
          `DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::int[])`,
          [userId, purchasedProdIds]
        );
      }
    }
    // Auto-save shipping address to user's address book if logged in and not already saved
    if (userId && shipping_address && shipping_address.trim()) {
      try {
        const existingAddr = await client.query(
          `SELECT id FROM user_addresses WHERE user_id = $1 AND LOWER(address_line1) = LOWER($2)`,
          [userId, shipping_address.trim()]
        );
        if (existingAddr.rows.length === 0) {
          const addrCount = await client.query(
            `SELECT count(*) FROM user_addresses WHERE user_id = $1`,
            [userId]
          );
          const isFirst = parseInt(addrCount.rows[0].count, 10) === 0;
          const selectedState = req.body.shipping_state || shipping_city || '';
          await client.query(
            `INSERT INTO user_addresses (user_id, title, recipient_name, phone, address_line1, city, state, country, postal_code, is_default)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              userId,
              'Shipping Address',
              customer_name.trim(),
              customer_phone ? customer_phone.trim() : '',
              shipping_address.trim(),
              selectedState ? selectedState.trim() : (shipping_country === 'Singapore' ? 'Singapore' : ''),
              selectedState ? selectedState.trim() : (shipping_country === 'Singapore' ? 'Singapore' : ''),
              shipping_country ? shipping_country.trim() : 'Malaysia',
              shipping_postal_code ? shipping_postal_code.trim() : null,
              isFirst
            ]
          );
        }
      } catch (addrErr) {
        console.error('Failed to auto-add shipping address to user_addresses:', addrErr);
      }
    }

    await client.query('COMMIT');

    // Trigger in-app notification ONLY for instant/paid orders (e.g. COD or pre-paid)
    // Online payments (Stripe) will trigger notification upon payment confirmation in /payment/confirm-intent
    if (userId && isInstantFinal) {
      createNotification({
        userId,
        title: 'Order Placed Successfully',
        message: `Your order #${order.order_number} for RM ${parseFloat(order.total_amount).toFixed(2)} has been placed!`,
        type: 'order',
        referenceId: order.id
      }).catch(e => console.error('Order notification error:', e));
    }

    // Log payment transaction to server/logs/payment.log
    logPaymentTransaction({
      status: order.payment_status === 'paid' ? 'SUCCESS' : 'PENDING',
      orderNumber: order.order_number,
      orderId: order.id,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        id: userId
      },
      items: validatedItems,
      subtotal: order.subtotal,
      voucherCode: order.voucher_code,
      discount: order.discount,
      shippingFee: order.shipping_fee,
      totalAmount: order.total_amount,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      details: `Order created via ${order.payment_method}. Initial status: ${order.payment_status}`
    });

    // Send Email based on payment method:
    // - Cash on Delivery (COD): Send Order Receipt email immediately upon placement.
    // - Credit Card / Online: Do NOT send receipt yet (payment might fail). Upon payment success, send 1 combined receipt & payment email.
    const isCod = (order.payment_method || '').toLowerCase().includes('cash');

    if (isCod) {
      sendOrderReceiptEmail(order, validatedItems).catch(e => console.error('COD order receipt email error:', e));
    } else if (order.payment_status === 'paid') {
      sendPaymentSuccessEmail(order, validatedItems).catch(e => console.error('Payment success email error:', e));
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully! Thank you for shopping with JD Shop.',
      order,
      items: validatedItems
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to place order.' });
  } finally {
    client.release();
  }
};

// Get orders for current logged-in customer
const getCustomerOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const ordersRes = await query(
      `SELECT o.*, 
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'product_image', oi.product_image,
            'price', oi.price,
            'quantity', oi.quantity,
            'total_price', oi.total_price
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      count: ordersRes.rows.length,
      orders: ordersRes.rows
    });
  } catch (err) {
    console.error('getCustomerOrders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
};

// Get single order details
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = !isNaN(id);

    const orderRes = await query(
      `SELECT * FROM orders WHERE ${isNum ? 'id = $1' : 'order_number = $1'}`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orderRes.rows[0];

    // Check ownership if user is customer
    if (req.user && req.user.user_type === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to this order.' });
    }

    const itemsRes = await query(`SELECT * FROM order_items WHERE order_id = $1`, [order.id]);
    const refundReqRes = await query(`SELECT * FROM refund_requests WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`, [order.id]);

    return res.json({
      success: true,
      order,
      items: itemsRes.rows,
      refundRequest: refundReqRes.rows[0] || null
    });
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order.' });
  }
};

// Admin: Get all orders with search & status filter
const getAllOrdersAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search, payment_status, date_range } = req.query;

    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      if (status === 'refund_requested') {
        conditions.push(`o.refund_status = 'requested'`);
      } else {
        params.push(status);
        conditions.push(`o.order_status = $${params.length}`);
      }
    }

    if (payment_status && payment_status !== 'all') {
      params.push(payment_status);
      conditions.push(`o.payment_status = $${params.length}`);
    }

    if (date_range && date_range !== 'all') {
      if (date_range === 'today') {
        conditions.push(`o.created_at >= CURRENT_DATE`);
      } else if (date_range === '7days') {
        conditions.push(`o.created_at >= CURRENT_DATE - INTERVAL '7 days'`);
      } else if (date_range === '30days') {
        conditions.push(`o.created_at >= CURRENT_DATE - INTERVAL '30 days'`);
      } else if (date_range === 'this_month') {
        conditions.push(`o.created_at >= DATE_TRUNC('month', CURRENT_DATE)`);
      }
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_email ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const countSql = `SELECT COUNT(id) as total FROM orders o ${whereClause}`;
    const countRes = await query(countSql, params.slice(0, params.length - 2));
    const totalCount = parseInt(countRes.rows[0].total || 0);

    const dataSql = `
      SELECT o.*, COUNT(oi.id)::int as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const dataRes = await query(dataSql, params);

    return res.json({
      success: true,
      count: dataRes.rows.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      orders: dataRes.rows
    });
  } catch (err) {
    console.error('getAllOrdersAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin orders.' });
  }
};

// Admin: Update order status & payment status
const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status, force_manual } = req.body;

    if (!order_status && !payment_status) {
      return res.status(400).json({ success: false, message: 'Please provide status update.' });
    }

    const existingRes = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const existingOrder = existingRes.rows[0];
    if (existingOrder.order_status === 'delivered' && order_status && order_status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Order is already delivered and its status cannot be changed.' });
    }
    if (existingOrder.order_status === 'cancelled' && order_status && order_status !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled and its status cannot be changed.' });
    }

    const finalPaymentStatus = payment_status || existingOrder.payment_status;
    let finalOrderStatus = order_status || existingOrder.order_status;

    // Auto update to cancelled if order is refunded and not delivered
    if (finalPaymentStatus === 'refunded' && existingOrder.order_status !== 'delivered') {
      finalOrderStatus = 'cancelled';
    }

    // Execute Stripe gateway refund if admin changes payment status to 'refunded'
    if (payment_status === 'refunded' && existingOrder.payment_status !== 'refunded') {
      const gatewayRes = await executeStripeGatewayRefund(existingOrder, Boolean(force_manual));
      if (!gatewayRes.success) {
        return res.status(400).json({
          success: false,
          canForceManual: gatewayRes.canForceManual || false,
          message: gatewayRes.message
        });
      }
    }

    const updateRes = await query(
      `UPDATE orders
       SET order_status = $1,
           payment_status = COALESCE($2, payment_status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [finalOrderStatus, payment_status, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const updatedOrder = updateRes.rows[0];

    // Trigger notification on order status update
    if (updatedOrder.user_id) {
      const statusMsg = order_status 
        ? `Your order #${updatedOrder.order_number} status was updated to "${updatedOrder.order_status.toUpperCase()}".`
        : `Your order #${updatedOrder.order_number} payment status was updated to "${updatedOrder.payment_status.toUpperCase()}".`;

      createNotification({
        userId: updatedOrder.user_id,
        title: `Order #${updatedOrder.order_number} Updated`,
        message: statusMsg,
        type: 'order',
        referenceId: updatedOrder.id
      }).catch(e => console.error('Order status notification error:', e));
    }

    // Trigger emails on status transitions
    if (payment_status === 'paid' && existingOrder.payment_status !== 'paid') {
      sendPaymentSuccessEmail(updatedOrder).catch(e => console.error('Payment success email error:', e));
    }
    if (payment_status === 'refunded' && existingOrder.payment_status !== 'refunded') {
      sendRefundSuccessEmail(updatedOrder).catch(e => console.error('Refund success email error:', e));
    }

    return res.json({
      success: true,
      message: 'Order status updated successfully.',
      order: updatedOrder
    });
  } catch (err) {
    console.error('updateOrderStatusAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
};

// Admin: Delete / Cancel order
const deleteOrderAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM notifications WHERE reference_id = $1 AND type = 'order'`, [String(id)]);
    await query(`DELETE FROM order_items WHERE order_id = $1`, [id]);
    const delRes = await query(`DELETE FROM orders WHERE id = $1 RETURNING id`, [id]);

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, message: 'Order deleted successfully.' });
  } catch (err) {
    console.error('deleteOrderAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete order.' });
  }
};

// Customer / Gateway: Rollback Failed or Cancelled Order
const cancelFailedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    console.log('[ORDER ROLLBACK] Deleting failed order record & notifications:', id);
    await query(`DELETE FROM notifications WHERE reference_id = $1 AND type = 'order'`, [String(id)]);
    await query(`DELETE FROM order_items WHERE order_id = $1`, [id]);
    const delRes = await query(`DELETE FROM orders WHERE id = $1 RETURNING id`, [id]);

    return res.json({
      success: true,
      message: 'Failed order deleted successfully.',
      deletedId: delRes.rows[0]?.id || id
    });
  } catch (err) {
    console.error('cancelFailedOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
};

// Customer: Request Refund for an Order
const requestRefundCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason, comment, images } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please select a reason for your refund request.' });
    }

    const orderRes = await query(`SELECT * FROM orders WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found or does not belong to you.' });
    }

    const order = orderRes.rows[0];

    if (order.refund_status === 'requested') {
      return res.status(400).json({ success: false, message: 'You have already submitted a refund request for this order.' });
    }
    if (order.refund_status === 'approved' || order.payment_status === 'refunded') {
      return res.status(400).json({ success: false, message: 'This order has already been refunded.' });
    }

    // Check if user has already rated/reviewed any product in this order
    const reviewCheck = await query(`SELECT id FROM product_reviews WHERE order_id = $1 LIMIT 1`, [id]);
    if (reviewCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund request cannot be submitted because you have already submitted product review(s) for this order.'
      });
    }

    const formattedImages = JSON.stringify(Array.isArray(images) ? images : []);
    const amount = parseFloat(order.total_amount || 0);

    const refundRes = await query(
      `INSERT INTO refund_requests (order_id, user_id, reason, comment, amount, images, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, userId, reason, comment || '', amount, formattedImages]
    );

    await query(`UPDATE orders SET refund_status = 'requested', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    return res.status(200).json({
      success: true,
      message: 'Your refund request has been submitted successfully and is pending review.',
      refundRequest: refundRes.rows[0]
    });
  } catch (err) {
    console.error('requestRefundCustomer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit refund request.' });
  }
};

// Admin: Fetch all refund requests
const getRefundRequestsAdmin = async (req, res) => {
  try {
    const { status = '' } = req.query;

    let queryStr = `
      SELECT rr.*, o.order_number, o.total_amount as order_total_amount, o.order_status, o.payment_status,
             u.name as customer_name, u.email as customer_email, u.phone as customer_phone
      FROM refund_requests rr
      JOIN orders o ON rr.order_id = o.id
      LEFT JOIN users u ON rr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      queryStr += ` AND rr.status = $${params.length}`;
    }

    queryStr += ` ORDER BY rr.created_at DESC`;

    const refundsRes = await query(queryStr, params);

    return res.json({
      success: true,
      refunds: refundsRes.rows
    });
  } catch (err) {
    console.error('getRefundRequestsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch refund requests.' });
  }
};

// Admin: Process (Approve / Reject) Refund Request
const processRefundAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, admin_note, force_manual } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be approve or reject.' });
    }

    const refundRes = await query(`SELECT * FROM refund_requests WHERE id = $1`, [id]);
    if (refundRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Refund request not found.' });
    }

    const refundReq = refundRes.rows[0];

    const orderRes = await query(`SELECT * FROM orders WHERE id = $1`, [refundReq.order_id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orderRes.rows[0];

    if (action === 'approve') {
      // Execute Stripe gateway refund BEFORE marking DB as refunded
      const gatewayRes = await executeStripeGatewayRefund(order, Boolean(force_manual));
      if (!gatewayRes.success) {
        return res.status(400).json({
          success: false,
          canForceManual: gatewayRes.canForceManual || false,
          message: gatewayRes.message
        });
      }

      const noteText = admin_note || (gatewayRes.isManual ? 'Refund approved manually (Offline/Legacy order).' : 'Refund approved and executed via payment gateway.');
      const newOrderStatus = order.order_status === 'delivered' ? order.order_status : 'cancelled';

      await query(
        `UPDATE refund_requests SET status = 'approved', admin_note = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [noteText, id]
      );
      await query(
        `UPDATE orders SET payment_status = 'refunded', refund_status = 'approved', order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newOrderStatus, refundReq.order_id]
      );

      logPaymentTransaction({
        status: 'SUCCESS',
        orderNumber: order.order_number,
        orderId: order.id,
        customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone, id: order.user_id },
        subtotal: order.subtotal,
        discount: order.discount,
        shippingFee: order.shipping_fee,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: 'refunded',
        orderStatus: order.order_status,
        details: `Refund approved (${gatewayRes.isManual ? 'Manual/Offline' : 'Stripe Gateway'}). Stripe Refund ID: ${gatewayRes.stripeRefundId || 'N/A'}`
      });

      // Send Refund Success Email asynchronously
      sendRefundSuccessEmail(order, { amount: refundReq.amount, reason: refundReq.reason, admin_note: noteText })
        .catch(e => console.error('Refund success email error:', e));

      // Trigger notification for refund approval
      if (refundReq.user_id) {
        createNotification({
          userId: refundReq.user_id,
          title: 'Refund Request Approved',
          message: `Your refund request of RM ${parseFloat(refundReq.amount).toFixed(2)} for order #${order.order_number} has been approved.`,
          type: 'refund',
          referenceId: order.id
        }).catch(e => console.error('Refund approval notification error:', e));
      }

      return res.json({
        success: true,
        message: gatewayRes.isManual
          ? 'Refund approved successfully as Manual / Offline refund.'
          : 'Refund approved and successfully executed through payment gateway (Stripe).',
        stripeRefundId: gatewayRes.stripeRefundId,
        isManual: gatewayRes.isManual || false
      });
    } else {
      await query(
        `UPDATE refund_requests SET status = 'rejected', admin_note = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [admin_note || 'Refund request rejected by admin.', id]
      );
      await query(
        `UPDATE orders SET refund_status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [refundReq.order_id]
      );

      // Trigger notification for refund rejection
      if (refundReq.user_id) {
        createNotification({
          userId: refundReq.user_id,
          title: 'Refund Request Rejected',
          message: `Your refund request for order #${order.order_number} was rejected. Note: ${admin_note || 'Rejected by administrator.'}`,
          type: 'refund',
          referenceId: order.id
        }).catch(e => console.error('Refund rejection notification error:', e));
      }

      return res.json({
        success: true,
        message: 'Refund request rejected successfully.'
      });
    }
  } catch (err) {
    console.error('processRefundAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process refund request.' });
  }
};

module.exports = {
  createOrder,
  getCustomerOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  deleteOrderAdmin,
  cancelFailedOrder,
  requestRefundCustomer,
  getRefundRequestsAdmin,
  processRefundAdmin
};
