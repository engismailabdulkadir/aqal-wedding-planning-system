import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LISTING_UPLOAD_DIR = path.join(__dirname, '../../uploads/listings');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_LISTING_IMAGES = 5;

function ensureUploadDir() {
  fs.mkdirSync(LISTING_UPLOAD_DIR, { recursive: true });
}

function safeFilename(mimetype) {
  const ext = EXT_BY_MIME[mimetype] || '.jpg';
  return `listing-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      ensureUploadDir();
      cb(null, LISTING_UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename(_req, file, cb) {
    cb(null, safeFilename(file.mimetype));
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error('Only JPG, PNG and WebP images are allowed.'));
    return;
  }
  cb(null, true);
}

export const listingImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_LISTING_IMAGE_BYTES, files: MAX_LISTING_IMAGES },
});

export function publicListingImagePath(filename) {
  const base = path.basename(String(filename || ''));
  if (!base || base.includes('..') || base.includes('/') || base.includes('\\')) return null;
  return `/uploads/listings/${base}`;
}
