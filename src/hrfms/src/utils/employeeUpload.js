const multer = require('multer');
const path = require('path');
const fs = require('fs');

const EMPLOYEE_UPLOAD_ROUTE = '/uploads/users';

// Ensure uploads directory exists for employee images
const uploadsDir = path.join(process.cwd(), 'uploads', 'users');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    if (file.fieldname === 'profile_img') {
      cb(null, `user-profile-${uniqueSuffix}${ext}`);
    } else {
      cb(null, `employee-document-${uniqueSuffix}${ext}`);
    }
  }
});

// File filter - allow profile images and document uploads (images + pdf)
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  const isImage = allowedImageTypes.test(ext) && allowedImageTypes.test(mimetype);
  if (file.fieldname === 'document_img') {
    const isPdf = ext === '.pdf' || mimetype === 'application/pdf';
    if (isImage || isPdf) {
      return cb(null, true);
    }
    return cb(new Error('Document uploads must be JPEG/PNG/WebP/GIF or PDF files.'));
  }

  if (file.fieldname === 'profile_img') {
    if (isImage) {
      return cb(null, true);
    }
    return cb(new Error('Profile photo must be a JPEG/PNG/WebP/GIF image.'));
  }

  cb(new Error('Unsupported file upload field.'));
};

// Multer configuration for employee images
const uploadEmployeeImages = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
}).fields([
  { name: 'profile_img', maxCount: 1 },
  { name: 'document_img', maxCount: 10 }
]);

const normalizeUploadValue = (value) => String(value || '').trim().replace(/\\/g, '/');

const buildEmployeeImagePath = (filename) => {
  const cleanedFilename = path.posix.basename(normalizeUploadValue(filename).split(/[?#]/)[0]);
  if (!cleanedFilename) {
    return null;
  }

  return `${EMPLOYEE_UPLOAD_ROUTE}/${cleanedFilename}`;
};

const normalizeEmployeeImagePath = (value) => {
  const normalizedValue = normalizeUploadValue(value);
  if (!normalizedValue) {
    return null;
  }

  // Match any valid /uploads/ path (employees, users, etc.) â€” preserve as-is
  const uploadPathMatch = normalizedValue.match(/\/uploads\/[^?#"'\s]+/i);
  if (uploadPathMatch) {
    const existingUploadPath = uploadPathMatch[0];
    const filename = path.posix.basename(existingUploadPath.split(/[?#]/)[0]);

    if (/^user-profile-/i.test(filename)) {
      return `/uploads/users/${filename}`;
    }

    return existingUploadPath;
  }

  return buildEmployeeImagePath(normalizedValue);
};

// Determine base URL from explicit value or environment defaults
const resolveBaseUrl = (overrideUrl) => {
  const fromEnv = process.env.BASE_URL || process.env.API_BASE_URL;
  const resolved = fromEnv || overrideUrl;

  if (resolved && resolved.trim()) {
    return resolved.replace(/\/+$/, '');
  }

  const fallbackPort = process.env.PORT || 3004;
  const fallback = process.env.NODE_ENV === 'production' ? '' : `http://localhost:${fallbackPort}`;
  return fallback.replace(/\/+$/, '');
};

// Helper functions to build stable employee upload paths.
const getEmployeeImagePath = (filename) => normalizeEmployeeImagePath(filename);

const getEmployeeImageUrl = (filename, baseUrlOverride) => {
  const relativePath = normalizeEmployeeImagePath(filename);
  if (!relativePath) return null;
  const baseUrl = resolveBaseUrl(baseUrlOverride);
  if (!baseUrl) {
    return relativePath;
  }
  return `${baseUrl}${relativePath}`;
};

// Helper function to extract filename from URL
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = normalizeUploadValue(url).split(/[?#]/)[0].split('/');
  return parts[parts.length - 1];
};

module.exports = {
  uploadEmployeeImages,
  getEmployeeImagePath,
  getEmployeeImageUrl,
  getFilenameFromUrl,
  normalizeEmployeeImagePath
};
