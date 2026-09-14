const fs = require('fs');
const path = require('path');

// Ensure logs directory exists in server/logs
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const paymentLogPath = path.join(logsDir, 'payment.log');

/**
 * Log a compact JSON line payment transaction to server/logs/payment.log
 * Saves storage and provides structured log format
 */
const logPaymentTransaction = (data = {}) => {
  try {
    const timestamp = new Date().toISOString();

    const formattedItems = (data.items || []).map(item => ({
      product_id: item.product_id || item.id || null,
      name: item.product_name || item.name || 'Product',
      quantity: parseInt(item.quantity || 1, 10),
      price: parseFloat(item.price || 0),
      total: parseFloat(item.total_price || (parseFloat(item.price || 0) * parseInt(item.quantity || 1, 10)))
    }));

    const logObject = {
      timestamp,
      status: (data.status || 'INFO').toUpperCase(),
      order_id: data.orderId || data.id || null,
      order_number: data.orderNumber || data.order_number || null,
      user_id: data.customer?.id || data.user_id || null,
      customer: {
        name: data.customer?.name || data.customer_name || 'Guest',
        email: data.customer?.email || data.customer_email || null,
        phone: data.customer?.phone || data.customer_phone || null
      },
      payment_method: data.paymentMethod || data.payment_method || 'Cash On Delivery',
      payment_status: data.paymentStatus || data.payment_status || 'pending',
      order_status: data.orderStatus || data.order_status || 'pending',
      items: formattedItems,
      subtotal: parseFloat(data.subtotal || 0),
      voucher_code: data.voucherCode || data.voucher_code || null,
      discount: parseFloat(data.discount || 0),
      shipping_fee: parseFloat(data.shippingFee ?? data.shipping_fee ?? 0),
      total_amount: parseFloat(data.totalAmount ?? data.total_amount ?? 0),
      details: data.details || data.message || ''
    };

    fs.appendFileSync(paymentLogPath, JSON.stringify(logObject) + '\n', 'utf8');
  } catch (err) {
    console.error('Failed to write to payment.log:', err);
  }
};

module.exports = {
  logPaymentTransaction
};
