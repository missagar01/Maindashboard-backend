const multer = require('multer');
const path = require('path');
const fs = require('fs');

const GATEPASS_UPLOAD_ROUTE = '/uploads/gatepasses';
const uploadsDir = path.join(process.cwd(), 'uploads', 'gatepasses');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const normalizeUploadValue = (value) => String(value || '').trim().replace(/\\/g, '/');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `gatepass-photo-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();
  const isImage = allowedTypes.test(ext) && allowedTypes.test(mimetype);

  if (isImage) {
    return cb(null, true);
  }

  return cb(new Error('Gatepass photo must be a JPEG/PNG/WebP/GIF image.'));
};

const uploadGatePassPhoto = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter
}).single('employee_photo');

const buildGatePassImagePath = (filename) => {
  const cleanedFilename = path.posix.basename(normalizeUploadValue(filename).split(/[?#]/)[0]);
  if (!cleanedFilename) {
    return null;
  }

  return `${GATEPASS_UPLOAD_ROUTE}/${cleanedFilename}`;
};

const normalizeGatePassImagePath = (value) => {
  const normalizedValue = normalizeUploadValue(value);
  if (!normalizedValue) {
    return null;
  }

  const uploadPathMatch = normalizedValue.match(/\/uploads\/gatepasses\/[^?#"'\s]+/i);
  if (uploadPathMatch) {
    return uploadPathMatch[0];
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const parsedUrl = new URL(normalizedValue);
      return normalizeGatePassImagePath(parsedUrl.pathname);
    } catch (_error) {
      return null;
    }
  }

  return buildGatePassImagePath(normalizedValue);
};

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

const getGatePassImageUrl = (filename, baseUrlOverride) => {
  const relativePath = normalizeGatePassImagePath(filename);
  if (!relativePath) {
    return null;
  }

  const baseUrl = resolveBaseUrl(baseUrlOverride);
  if (!baseUrl) {
    return relativePath;
  }

  return `${baseUrl}${relativePath}`;
};

const normalizeGatePassImageUrl = (value, baseUrlOverride) => {
  const normalizedValue = normalizeUploadValue(value);
  if (!normalizedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue;
  }

  return getGatePassImageUrl(normalizedValue, baseUrlOverride);
};

module.exports = {
  uploadGatePassPhoto,
  getGatePassImageUrl,
  normalizeGatePassImagePath,
  normalizeGatePassImageUrl
};
