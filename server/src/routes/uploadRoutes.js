const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base Upload Directory
const baseUploadDir = path.join(__dirname, '../../uploads');

// Allowed subfolders
const ALLOWED_FOLDERS = ['avatars', 'products', 'banners', 'categories', 'reviews', 'refunds', 'general'];

// Helper to get and sanitize target subfolder
const getTargetFolder = (req) => {
  let folder = req.params.folder || req.query.folder || req.body?.folder || req.body?.type || 'general';
  folder = String(folder).toLowerCase().trim();
  return ALLOWED_FOLDERS.includes(folder) ? folder : 'general';
};

// Storage Configuration with Dynamic Subdirectory Destination
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = getTargetFolder(req);
    const targetDir = path.join(baseUploadDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File Filter (Images only)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Handle File Uploads Middleware Logic
const handleUpload = (req, res) => {
  const uploadHandler = upload.array('images', 10);

  uploadHandler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const folder = getTargetFolder(req);
    const host = req.get('host');
    const protocol = req.protocol;

    const urls = req.files.map(file => {
      return `${protocol}://${host}/uploads/${folder}/${file.filename}`;
    });

    res.json({
      success: true,
      message: 'File(s) uploaded successfully',
      folder: folder,
      urls: urls,
      url: urls[0]
    });
  });
};

// POST /api/upload (supports ?folder=avatars / products / banners / categories)
router.post('/', handleUpload);

// POST /api/upload/:folder (supports /api/upload/avatars, /api/upload/products, etc.)
router.post('/:folder', handleUpload);

module.exports = router;
