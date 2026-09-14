const nodemailer = require('nodemailer');
const { query } = require('../config/db');

/**
 * Fetch current SMTP configuration from database
 */
const getSmtpConfig = async () => {
  try {
    const res = await query(`SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1`);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    console.error('Error fetching SMTP config from DB:', err.message);
  }

  // Fallback defaults if DB record not found
  return {
    smtp_host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
    smtp_port: parseInt(process.env.SMTP_PORT || '2525', 10),
    smtp_user: process.env.SMTP_USER || 'e216f3f32c57a6',
    smtp_pass: process.env.SMTP_PASS || '2ea6a6f6f20a60',
    smtp_secure: process.env.SMTP_SECURE === 'true',
    smtp_from_name: process.env.SMTP_FROM_NAME || 'JD Shop',
    smtp_from_email: process.env.SMTP_FROM_EMAIL || 'from@example.com',
  };
};

/**
 * Dynamically create Nodemailer transport based on latest DB settings
 */
const createTransporter = async () => {
  const config = await getSmtpConfig();
  
  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port, 10),
    secure: Boolean(config.smtp_secure),
    auth: (config.smtp_user && config.smtp_pass) ? {
      user: config.smtp_user,
      pass: config.smtp_pass
    } : undefined
  });

  const fromString = `"${config.smtp_from_name || 'JD Shop'}" <${config.smtp_from_email || 'from@example.com'}>`;

  return { transporter, fromString, config };
};

/**
 * Standard Reusable Email Master Layout Template
 * Guarantees unified header, footer, typography, colors, padding, and layout across ALL emails.
 */
const renderMasterTemplate = ({ title, subtitle, badgeText, badgeBg = '#4F46E5', contentHtml, ctaUrl, ctaText }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f9;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
    }
    .header {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      padding: 32px 30px;
      text-align: center;
    }
    .logo-text {
      color: #38BDF8;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
    }
    .sub-logo {
      color: #94A3B8;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 1px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .body {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
      background-color: ${badgeBg};
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }
    .subtitle {
      font-size: 15px;
      color: #64748b;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 24px 0;
      border: none;
    }
    .card-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #4F46E5;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 15px;
      text-decoration: none;
      border-radius: 8px;
      text-align: center;
      margin-top: 16px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .item-table th {
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      padding: 10px 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .item-table td {
      padding: 12px 8px;
      font-size: 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1 class="logo-text">JD SHOP</h1>
        <div class="sub-logo">Premium Online Shopping</div>
      </div>

      <!-- Content Body -->
      <div class="body">
        ${badgeText ? `<div class="badge">${badgeText}</div>` : ''}
        <h2 class="title">${title}</h2>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
        
        ${contentHtml}

        ${ctaUrl && ctaText ? `
          <div style="text-align: center; margin-top: 28px;">
            <a href="${ctaUrl}" class="btn" target="_blank">${ctaText}</a>
          </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">
          &copy; ${new Date().getFullYear()} <strong>JD Shop</strong>. All rights reserved.<br/>
          If you have any questions, please contact customer support at support@jdshop.com.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 1. Send Order Receipt Email
 */
const sendOrderReceiptEmail = async (order, items = []) => {
  try {
    const { transporter, fromString } = await createTransporter();

    const itemsRowsHtml = items.map(item => `
      <tr>
        <td style="font-weight: 600;">${item.product_name || item.name}</td>
        <td style="text-align: center;">x${item.quantity}</td>
        <td style="text-align: right; font-weight: 600;">RM ${parseFloat(item.price).toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">RM ${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
    const shipping = parseFloat(order.shipping_fee || 0).toFixed(2);
    const discount = parseFloat(order.discount || 0).toFixed(2);
    const total = parseFloat(order.total_amount || 0).toFixed(2);

    const bodyHtml = `
      <p style="font-size: 15px; color: #334155; margin-bottom: 20px;">
        Hi <strong>${order.customer_name}</strong>,<br/>
        Thank you for your order! We have received your purchase and are preparing it for shipment.
      </p>

      <div class="card-box">
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #64748b;">Order Number:</span>
          <strong style="color: #0f172a;">#${order.order_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #64748b;">Payment Method:</span>
          <strong style="color: #4F46E5;">${order.payment_method || 'Cash On Delivery'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <span style="color: #64748b;">Shipping Address:</span>
          <span style="color: #334155; text-align: right; max-width: 250px;">${order.shipping_address}, ${order.shipping_city || ''} ${order.shipping_country || ''}</span>
        </div>
      </div>

      <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 12px;">Order Items</h3>
      <table class="item-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 20px; border-top: 2px solid #e2e8f0; pt-3;">
        <table style="width: 100%; font-size: 14px; color: #475569;">
          <tr>
            <td style="padding: 6px 0;">Subtotal:</td>
            <td style="text-align: right; font-weight: 600;">RM ${subtotal}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;">Shipping Fee:</td>
            <td style="text-align: right; font-weight: 600;">RM ${shipping}</td>
          </tr>
          ${parseFloat(discount) > 0 ? `
          <tr>
            <td style="padding: 6px 0; color: #16a34a;">Discount Voucher:</td>
            <td style="text-align: right; font-weight: 600; color: #16a34a;">-RM ${discount}</td>
          </tr>
          ` : ''}
          <tr style="font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px solid #cbd5e1;">
            <td style="padding: 12px 0;">Grand Total:</td>
            <td style="text-align: right; color: #4F46E5;">RM ${total}</td>
          </tr>
        </table>
      </div>
    `;

    const html = renderMasterTemplate({
      title: `Order Confirmation #${order.order_number}`,
      subtitle: `Thank you for your purchase. Here is your receipt.`,
      badgeText: `Order #${order.order_number}`,
      badgeBg: '#10B981',
      contentHtml: bodyHtml
    });

    const info = await transporter.sendMail({
      from: fromString,
      to: order.customer_email,
      subject: `[JD Shop] Order Confirmation & Receipt #${order.order_number}`,
      html
    });

    console.log(`✉️ Order receipt email sent to ${order.customer_email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send Order Receipt Email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 2. Send Password Reset Email (User Self Reset or Admin Reset)
 */
const sendPasswordResetEmail = async ({ email, name, resetCodeOrPassword, isAdminReset = false, resetToken = null }) => {
  try {
    const { transporter, fromString } = await createTransporter();

    let bodyHtml = '';
    let title = '';
    let subtitle = '';

    if (isAdminReset) {
      title = 'Your Password Has Been Reset by Administrator';
      subtitle = `An administrator has updated your login credentials for JD Shop.`;
      bodyHtml = `
        <p style="font-size: 15px; color: #334155;">
          Hello <strong>${name || 'User'}</strong>,<br/>
          Your account password has been reset by an administrator. Please use the temporary credentials below to log into your account:
        </p>
        <div class="card-box" style="text-align: center; background-color: #EEF2FF; border-color: #C7D2FE;">
          <div style="font-size: 13px; color: #4338CA; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">New Temporary Password</div>
          <div style="font-size: 24px; font-weight: 800; color: #312E81; letter-spacing: 2px;">${resetCodeOrPassword}</div>
        </div>
        <p style="font-size: 14px; color: #64748b; margin-top: 16px;">
          For security reasons, we strongly recommend changing your password after logging in from your Profile settings page.
        </p>
      `;
    } else {
      title = 'Password Reset Request';
      subtitle = `We received a request to reset your password.`;
      
      const resetLink = resetToken ? `http://localhost:3000/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}` : null;

      bodyHtml = `
        <p style="font-size: 15px; color: #334155;">
          Hello <strong>${name || 'Customer'}</strong>,<br/>
          We received a request to reset the password for your account associated with <strong>${email}</strong>.
        </p>

        <div class="card-box" style="text-align: center; background-color: #EEF2FF; border-color: #C7D2FE;">
          <div style="font-size: 13px; color: #4338CA; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your Security Verification Code</div>
          <div style="font-size: 28px; font-weight: 800; color: #312E81; letter-spacing: 4px;">${resetCodeOrPassword}</div>
          <div style="font-size: 12px; color: #6366F1; margin-top: 6px;">This code is valid for 30 minutes.</div>
        </div>

        ${resetLink ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${resetLink}" class="btn" target="_blank">Reset Password Now</a>
          </div>
        ` : ''}

        <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      `;
    }

    const html = renderMasterTemplate({
      title,
      subtitle,
      badgeText: isAdminReset ? 'Admin Password Update' : 'Security Alert',
      badgeBg: isAdminReset ? '#8B5CF6' : '#F59E0B',
      contentHtml: bodyHtml
    });

    const info = await transporter.sendMail({
      from: fromString,
      to: email,
      subject: `[JD Shop] ${isAdminReset ? 'Notice: Your Password Has Been Reset' : 'Password Reset Security Code'}`,
      html
    });

    console.log(`✉️ Password reset email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send Password Reset Email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 3. Send Payment Successful & Combined Order Receipt Email
 */
const sendPaymentSuccessEmail = async (order, items = null) => {
  try {
    const { transporter, fromString } = await createTransporter();

    let orderItems = items;
    if (!orderItems || orderItems.length === 0) {
      try {
        const itemRes = await query(`SELECT * FROM order_items WHERE order_id = $1`, [order.id]);
        orderItems = itemRes.rows;
      } catch (e) {
        orderItems = [];
      }
    }

    const itemsRowsHtml = (orderItems || []).map(item => `
      <tr>
        <td style="font-weight: 600;">${item.product_name || item.name}</td>
        <td style="text-align: center;">x${item.quantity}</td>
        <td style="text-align: right; font-weight: 600;">RM ${parseFloat(item.price).toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">RM ${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
    const shipping = parseFloat(order.shipping_fee || 0).toFixed(2);
    const discount = parseFloat(order.discount || 0).toFixed(2);
    const total = parseFloat(order.total_amount || 0).toFixed(2);

    const bodyHtml = `
      <p style="font-size: 15px; color: #334155; margin-bottom: 20px;">
        Hi <strong>${order.customer_name}</strong>,<br/>
        We are pleased to inform you that your payment for order <strong>#${order.order_number}</strong> has been successfully processed! Your order details and official payment receipt are attached below.
      </p>

      <div class="card-box" style="background-color: #ECFDF5; border-color: #A7F3D0;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #065F46;">Order Number:</span>
          <strong style="color: #064E3B;">#${order.order_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #065F46;">Payment Method:</span>
          <strong style="color: #064E3B;">${order.payment_method || 'Credit / Debit Card (Stripe)'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #065F46;">Amount Paid:</span>
          <strong style="color: #059669; font-size: 16px;">RM ${total}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #065F46;">Payment Status:</span>
          <strong style="color: #059669; text-transform: uppercase;">PAID & VERIFIED</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <span style="color: #065F46;">Shipping Address:</span>
          <span style="color: #064E3B; text-align: right; max-width: 250px;">${order.shipping_address}, ${order.shipping_city || ''} ${order.shipping_country || ''}</span>
        </div>
      </div>

      ${itemsRowsHtml ? `
      <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 12px;">Order Items</h3>
      <table class="item-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 20px; border-top: 2px solid #e2e8f0; pt-3;">
        <table style="width: 100%; font-size: 14px; color: #475569;">
          <tr>
            <td style="padding: 6px 0;">Subtotal:</td>
            <td style="text-align: right; font-weight: 600;">RM ${subtotal}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;">Shipping Fee:</td>
            <td style="text-align: right; font-weight: 600;">RM ${shipping}</td>
          </tr>
          ${parseFloat(discount) > 0 ? `
          <tr>
            <td style="padding: 6px 0; color: #16a34a;">Discount Voucher:</td>
            <td style="text-align: right; font-weight: 600; color: #16a34a;">-RM ${discount}</td>
          </tr>
          ` : ''}
          <tr style="font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px solid #cbd5e1;">
            <td style="padding: 12px 0;">Grand Total Paid:</td>
            <td style="text-align: right; color: #059669;">RM ${total}</td>
          </tr>
        </table>
      </div>
      ` : ''}

      <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
        Your order is now being processed by our warehouse team and will be dispatched shortly.
      </p>
    `;

    const html = renderMasterTemplate({
      title: `Payment Received & Receipt #${order.order_number}`,
      subtitle: `Your payment was completed successfully.`,
      badgeText: `Payment Successful`,
      badgeBg: '#10B981',
      contentHtml: bodyHtml
    });

    const info = await transporter.sendMail({
      from: fromString,
      to: order.customer_email,
      subject: `[JD Shop] Payment Confirmation & Receipt #${order.order_number}`,
      html
    });

    console.log(`✉️ Payment success & order receipt email sent to ${order.customer_email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send Payment Success Email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 4. Send Refund Successful Email
 */
const sendRefundSuccessEmail = async (order, refundRequest = {}) => {
  try {
    const { transporter, fromString } = await createTransporter();

    const refundAmount = refundRequest.amount ? parseFloat(refundRequest.amount).toFixed(2) : parseFloat(order.total_amount).toFixed(2);

    const bodyHtml = `
      <p style="font-size: 15px; color: #334155;">
        Hi <strong>${order.customer_name}</strong>,<br/>
        This email confirms that your refund request for order <strong>#${order.order_number}</strong> has been processed successfully.
      </p>

      <div class="card-box" style="background-color: #FEF3C7; border-color: #FDE68A;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #92400E;">Order Number:</span>
          <strong style="color: #78350F;">#${order.order_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #92400E;">Refund Amount:</span>
          <strong style="color: #D97706; font-size: 18px;">RM ${refundAmount}</strong>
        </div>
        ${refundRequest.reason ? `
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <span style="color: #92400E;">Reason:</span>
          <span style="color: #78350F;">${refundRequest.reason}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <span style="color: #92400E;">Refund Status:</span>
          <strong style="color: #D97706; text-transform: uppercase;">REFUND COMPLETED</strong>
        </div>
      </div>

      ${refundRequest.admin_note ? `
        <div style="margin-top: 16px; padding: 12px 16px; background-color: #F8FAFC; border-left: 4px solid #F59E0B; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Note from Support Team:</div>
          <div style="font-size: 14px; color: #334155; margin-top: 4px;">"${refundRequest.admin_note}"</div>
        </div>
      ` : ''}

      <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
        Depending on your bank or card issuer, the refunded funds should appear in your statement within 3 to 7 business days.
      </p>
    `;

    const html = renderMasterTemplate({
      title: `Refund Processed - Order #${order.order_number}`,
      subtitle: `Your refund of RM ${refundAmount} has been approved and processed.`,
      badgeText: `Refund Approved`,
      badgeBg: '#F59E0B',
      contentHtml: bodyHtml
    });

    const info = await transporter.sendMail({
      from: fromString,
      to: order.customer_email,
      subject: `[JD Shop] Refund Confirmation - Order #${order.order_number}`,
      html
    });

    console.log(`✉️ Refund success email sent to ${order.customer_email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send Refund Success Email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 5. Send Test Email (From Admin Panel SMTP Settings)
 */
const sendTestEmail = async (targetEmail) => {
  try {
    const { transporter, fromString, config } = await createTransporter();

    const bodyHtml = `
      <p style="font-size: 15px; color: #334155;">
        Congratulations! Your SMTP email connection for <strong>JD Shop</strong> is properly configured and working.
      </p>

      <div class="card-box" style="background-color: #F0FDF4; border-color: #BBF7D0;">
        <div style="font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; margin-bottom: 10px;">Active SMTP Configuration</div>
        <table style="width: 100%; font-size: 13px; color: #14532D;">
          <tr>
            <td style="padding: 4px 0;"><strong>Host:</strong></td>
            <td>${config.smtp_host}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Port:</strong></td>
            <td>${config.smtp_port}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>From Name:</strong></td>
            <td>${config.smtp_from_name}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>From Address:</strong></td>
            <td>${config.smtp_from_email}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #64748b;">
        You will now receive notifications for customer orders, password resets, payment confirmations, and refunds directly to your mail inbox!
      </p>
    `;

    const html = renderMasterTemplate({
      title: 'SMTP Connection Test Successful!',
      subtitle: 'Your email server settings are fully operational.',
      badgeText: 'System Test Passed',
      badgeBg: '#10B981',
      contentHtml: bodyHtml
    });

    const info = await transporter.sendMail({
      from: fromString,
      to: targetEmail,
      subject: `[JD Shop Admin] SMTP Connection Test Email`,
      html
    });

    return { success: true, messageId: info.messageId, message: 'Test email delivered successfully!' };
  } catch (err) {
    console.error('❌ Failed to send SMTP Test Email:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  getSmtpConfig,
  sendOrderReceiptEmail,
  sendPasswordResetEmail,
  sendPaymentSuccessEmail,
  sendRefundSuccessEmail,
  sendTestEmail
};
