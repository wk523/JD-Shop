const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Ensure logs directory exists in project folder (server/logs)
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log File Streams (Appends HTTP requests & errors to files inside project)
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

const logEvent = (message, isError = false) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  if (isError) {
    errorLogStream.write(logLine);
  } else {
    accessLogStream.write(logLine);
  }
};

const initSchemaAndSeed = require('./config/initDb');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const staffRoutes = require('./routes/staffRoutes');
const roleRoutes = require('./routes/roleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const cartRoutes = require('./routes/cartRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const customerRoutes = require('./routes/customerRoutes');
const addressRoutes = require('./routes/addressRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Terminal output logging
app.use(morgan('combined', { stream: accessLogStream })); // File log outputting to server/logs/access.log

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'JD Shop REST API',
    database: process.env.DB_NAME || 'jdshop',
    timestamp: new Date()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  logEvent(`ERROR: ${req.method} ${req.url} - ${err.stack}`, true);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Bootstrap DB and Start Server
const startServer = async () => {
  try {
    await initSchemaAndSeed();
    app.listen(PORT, () => {
      const startMsg = `🚀 JD Shop Backend Server running on port ${PORT} | Database: ${process.env.DB_NAME || 'jdshop'}`;
      console.log(`===================================================`);
      console.log(startMsg);
      console.log(`📝 Log files saved in: server/logs/access.log & server/logs/error.log`);
      console.log(`===================================================`);
      logEvent(`SERVER STARTED: ${startMsg}`);
    });
  } catch (err) {
    console.error('Failed to start backend server:', err);
    logEvent(`SERVER START FAILED: ${err.message}`, true);
    process.exit(1);
  }
};

startServer();
