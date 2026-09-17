const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { logPaymentTransaction } = require('../utils/paymentLogger');

const { getStripeKeys } = require('../controllers/settingsController');

// GET Stripe Publishable Config Key
router.get('/config', async (req, res) => {
  try {
    const keys = await getStripeKeys();
    res.json({
      success: true,
      publishableKey: keys.publishableKey
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve Stripe configuration.' });
  }
});

// POST Create Stripe Payment Intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'myr', order_number } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    const keys = await getStripeKeys();
    const stripe = Stripe(keys.secretKey);

    const amountInSubunits = Math.round(parseFloat(amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSubunits,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      description: `JD Shop Order ${order_number || ''}`.trim()
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('Stripe Payment Intent Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to initialize Stripe payment.'
    });
  }
});

// POST Confirm Stripe Payment Intent & Update Order
router.post('/confirm-intent', async (req, res) => {
  try {
    const { paymentIntentId, order_id } = req.body;
    const { query } = require('../config/db');

    const keys = await getStripeKeys();
    const stripe = Stripe(keys.secretKey);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const targetOrderId = order_id || paymentIntent.metadata?.order_id;

      if (targetOrderId) {
        // Mark order as PAID & Processing
        const updateRes = await query(
          `UPDATE orders SET payment_status = 'paid', order_status = 'processing', stripe_payment_intent = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
          [paymentIntentId, targetOrderId]
        );

        if (updateRes.rows.length > 0) {
          const order = updateRes.rows[0];

          // Deduct stock for order items & fetch for logging
          const itemsRes = await query(`SELECT product_id, product_name, price, quantity, total_price FROM order_items WHERE order_id = $1`, [targetOrderId]);
          for (const item of itemsRes.rows) {
            await query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [item.quantity, item.product_id]);
          }

          // Clear ONLY purchased items from DB cart for user upon payment confirmation
          if (order.user_id && itemsRes.rows.length > 0) {
            const purchasedProdIds = itemsRes.rows.map(item => item.product_id).filter(Boolean);
            if (purchasedProdIds.length > 0) {
              await query(`DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::int[])`, [order.user_id, purchasedProdIds]);
            }
          }

          // Log transaction
          logPaymentTransaction({
            status: 'SUCCESS',
            orderNumber: order.order_number,
            orderId: order.id,
            customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone, id: order.user_id },
            items: itemsRes.rows,
            subtotal: order.subtotal,
            voucherCode: order.voucher_code,
            discount: order.discount,
            shippingFee: order.shipping_fee,
            totalAmount: order.total_amount,
            paymentMethod: order.payment_method,
            paymentStatus: 'paid',
            orderStatus: 'processing',
            details: `Stripe Payment Intent (${paymentIntentId}) confirmed successfully. Payment status: PAID. Stock updated.`
          });

          // Send Combined Payment Success & Order Receipt Email asynchronously
          const { sendPaymentSuccessEmail } = require('../services/emailService');
          sendPaymentSuccessEmail(order, itemsRes.rows).catch(e => console.error('Stripe payment success email error:', e));

          // Trigger in-app notification for confirmed Stripe order placement
          if (order.user_id) {
            const { createNotification } = require('../services/notificationService');
            createNotification({
              userId: order.user_id,
              title: 'Order Placed Successfully',
              message: `Your order #${order.order_number} for RM ${parseFloat(order.total_amount).toFixed(2)} has been placed!`,
              type: 'order',
              referenceId: order.id
            }).catch(e => console.error('Stripe order notification error:', e));
          }

          return res.json({
            success: true,
            message: 'Payment confirmed successfully!',
            order
          });
        }
      }
    }

    logPaymentTransaction({
      status: 'FAILED',
      orderId: order_id,
      paymentStatus: 'failed',
      details: `Stripe Payment Intent (${paymentIntentId}) status: ${paymentIntent.status}`
    });

    return res.status(400).json({
      success: false,
      message: `Payment status is ${paymentIntent.status}`
    });
  } catch (err) {
    console.error('Confirm Intent Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm payment intent.'
    });
  }
});

// POST Create Stripe Checkout Session (Redirect Flow)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customer_email, cancel_url, success_url, grandTotal, order_id, order_number } = req.body;

    console.log('[STRIPE SESSION INIT]', { order_id, order_number, customer_email, grandTotal });

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required for checkout session.' });
    }

    // Calculate exact final total payable (including voucher discount & shipping)
    const finalPayableAmount = parseFloat(grandTotal || 0);
    const itemSummaryStr = items.map(item => `${item.name || item.product_name || 'Item'} (x${item.quantity || 1})`).join(', ');

    const lineItems = [
      {
        price_data: {
          currency: 'myr',
          product_data: {
            name: `Order Payment (${order_number || 'JD Shop'})`,
            description: itemSummaryStr
          },
          unit_amount: Math.round(finalPayableAmount * 100)
        },
        quantity: 1
      }
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer_email || undefined,
      success_url: success_url || `http://localhost:3000/orders?session_id={CHECKOUT_SESSION_ID}&order_id=${order_id || ''}&stripe_success=true`,
      cancel_url: cancel_url || `http://localhost:3000/checkout?canceled=true&order_id=${order_id || ''}`,
      metadata: {
        order_id: String(order_id || ''),
        order_number: String(order_number || '')
      }
    });

    console.log('[STRIPE SESSION SUCCESS]', session.id, session.url);

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
  } catch (err) {
    console.error('Stripe Checkout Session Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to initialize Stripe Hosted Checkout Session.'
    });
  }
});

// GET Verify Stripe Checkout Session Outcome & Update Order
router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { order_id } = req.query;
    const { query } = require('../config/db');

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const targetOrderId = order_id || session.metadata?.order_id;

    if (session.payment_status === 'paid' && targetOrderId) {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      // Payment Successful -> Mark order as PAID & Processing
      const updateRes = await query(
        `UPDATE orders SET payment_status = 'paid', order_status = 'processing', stripe_payment_intent = $1, stripe_session_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
        [paymentIntentId || null, sessionId, targetOrderId]
      );

      if (updateRes.rows.length > 0) {
        const order = updateRes.rows[0];

        // Deduct stock for order items & fetch for logging
        const itemsRes = await query(`SELECT product_id, product_name, price, quantity, total_price FROM order_items WHERE order_id = $1`, [targetOrderId]);
        for (const item of itemsRes.rows) {
          await query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [item.quantity, item.product_id]);
        }

        // Clear ONLY purchased items from DB cart for user upon payment confirmation
        if (order.user_id && itemsRes.rows.length > 0) {
          const purchasedProdIds = itemsRes.rows.map(item => item.product_id).filter(Boolean);
          if (purchasedProdIds.length > 0) {
            await query(`DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::int[])`, [order.user_id, purchasedProdIds]);
          }
        }

        logPaymentTransaction({
          status: 'SUCCESS',
          orderNumber: order.order_number,
          orderId: order.id,
          customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone, id: order.user_id },
          items: itemsRes.rows,
          subtotal: order.subtotal,
          voucherCode: order.voucher_code,
          discount: order.discount,
          shippingFee: order.shipping_fee,
          totalAmount: order.total_amount,
          paymentMethod: order.payment_method,
          paymentStatus: 'paid',
          orderStatus: 'processing',
          details: `Stripe Checkout Session (${session.id}) completed successfully. Payment status: PAID. Stock updated.`
        });
      }
    } else if (targetOrderId) {
      // Payment Failed / Unpaid -> Delete pending order record so it does NOT stay in DB
      console.log('[VERIFY SESSION FAILED] Cleaning up unpaid order record:', targetOrderId);

      logPaymentTransaction({
        status: 'FAILED',
        orderId: targetOrderId,
        paymentStatus: 'failed',
        orderStatus: 'cancelled',
        details: `Stripe Checkout Session (${session.id}) payment status: ${session.payment_status}. Pending order removed.`
      });

      await query(`DELETE FROM order_items WHERE order_id = $1`, [targetOrderId]);
      await query(`DELETE FROM orders WHERE id = $1`, [targetOrderId]);
    }

    res.json({
      success: true,
      payment_status: session.payment_status,
      status: session.status,
      order_id: targetOrderId,
      customer_email: session.customer_details?.email
    });
  } catch (err) {
    console.error('Verify Session Error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify session.' });
  }
});

module.exports = router;
