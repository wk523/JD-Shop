const { query } = require('../config/db');
const { sendTestEmail } = require('../services/emailService');

// GET current SMTP Settings
const getSmtpSettings = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1`);
    
    if (result.rows.length === 0) {
      // Fallback default
      return res.json({
        success: true,
        settings: {
          smtp_host: 'sandbox.smtp.mailtrap.io',
          smtp_port: 2525,
          smtp_user: 'e216f3f32c57a6',
          smtp_pass: '2ea6a6f6f20a60',
          smtp_secure: false,
          smtp_from_name: 'JD Shop',
          smtp_from_email: 'from@example.com'
        }
      });
    }

    res.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('Get SMTP settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch SMTP settings.' });
  }
};

// UPDATE SMTP Settings
const updateSmtpSettings = async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_name, smtp_from_email } = req.body;

    if (!smtp_host || !smtp_port) {
      return res.status(400).json({ success: false, message: 'SMTP host and port are required.' });
    }

    const check = await query(`SELECT id FROM smtp_settings ORDER BY id DESC LIMIT 1`);

    let result;
    if (check.rows.length > 0) {
      const existingId = check.rows[0].id;
      result = await query(
        `UPDATE smtp_settings
         SET smtp_host = $1,
             smtp_port = $2,
             smtp_user = $3,
             smtp_pass = $4,
             smtp_secure = $5,
             smtp_from_name = $6,
             smtp_from_email = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          smtp_host.trim(),
          parseInt(smtp_port, 10),
          smtp_user ? smtp_user.trim() : '',
          smtp_pass ? smtp_pass.trim() : '',
          Boolean(smtp_secure),
          smtp_from_name ? smtp_from_name.trim() : 'JD Shop',
          smtp_from_email ? smtp_from_email.trim() : 'from@example.com',
          existingId
        ]
      );
    } else {
      result = await query(
        `INSERT INTO smtp_settings (smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_name, smtp_from_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          smtp_host.trim(),
          parseInt(smtp_port, 10),
          smtp_user ? smtp_user.trim() : '',
          smtp_pass ? smtp_pass.trim() : '',
          Boolean(smtp_secure),
          smtp_from_name ? smtp_from_name.trim() : 'JD Shop',
          smtp_from_email ? smtp_from_email.trim() : 'from@example.com'
        ]
      );
    }

    res.json({
      success: true,
      message: 'SMTP settings updated successfully!',
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('Update SMTP settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to save SMTP settings.' });
  }
};

// TEST SMTP Connection & Send Test Email
const testSmtpSettings = async (req, res) => {
  try {
    const { targetEmail } = req.body;
    const emailToUse = targetEmail || 'to@example.com';

    const testRes = await sendTestEmail(emailToUse);

    if (testRes.success) {
      return res.json({
        success: true,
        message: `Test email sent successfully to ${emailToUse}! Message ID: ${testRes.messageId}`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `SMTP Test Failed: ${testRes.error}`
      });
    }
  } catch (err) {
    console.error('Test SMTP connection error:', err);
    res.status(500).json({ success: false, message: 'Server error during SMTP test.' });
  }
};

// Helper to get active Stripe Keys (DB first, fallback to process.env)
const getStripeKeys = async () => {
  try {
    const res = await query(`SELECT * FROM stripe_settings ORDER BY id DESC LIMIT 1`);
    if (res.rows.length > 0 && res.rows[0].stripe_secret_key) {
      return {
        secretKey: res.rows[0].stripe_secret_key,
        publishableKey: res.rows[0].stripe_publishable_key
      };
    }
  } catch (err) {
    console.error('Error fetching Stripe settings from DB:', err.message);
  }
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  };
};

// GET Stripe Settings
const getStripeSettings = async (req, res) => {
  try {
    const keys = await getStripeKeys();
    res.json({
      success: true,
      settings: {
        stripe_secret_key: keys.secretKey,
        stripe_publishable_key: keys.publishableKey
      }
    });
  } catch (err) {
    console.error('Get Stripe settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch Stripe settings.' });
  }
};

// UPDATE Stripe Settings
const updateStripeSettings = async (req, res) => {
  try {
    const { stripe_secret_key, stripe_publishable_key } = req.body;

    if (!stripe_secret_key || !stripe_publishable_key) {
      return res.status(400).json({ success: false, message: 'Both Stripe Secret Key and Publishable Key are required.' });
    }

    const check = await query(`SELECT id FROM stripe_settings ORDER BY id DESC LIMIT 1`);

    let result;
    if (check.rows.length > 0) {
      result = await query(
        `UPDATE stripe_settings
         SET stripe_secret_key = $1,
             stripe_publishable_key = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [stripe_secret_key.trim(), stripe_publishable_key.trim(), check.rows[0].id]
      );
    } else {
      result = await query(
        `INSERT INTO stripe_settings (stripe_secret_key, stripe_publishable_key)
         VALUES ($1, $2)
         RETURNING *`,
        [stripe_secret_key.trim(), stripe_publishable_key.trim()]
      );
    }

    res.json({
      success: true,
      message: 'Stripe API keys updated and saved successfully!',
      settings: result.rows[0]
    });
  } catch (err) {
    console.error('Update Stripe settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to save Stripe API keys.' });
  }
};

module.exports = {
  getSmtpSettings,
  updateSmtpSettings,
  testSmtpSettings,
  getStripeKeys,
  getStripeSettings,
  updateStripeSettings
};
