import multer from 'multer';
import { listingImageUpload } from '../utils/listingImageStorage.js';

/** Multer wrapper — maps errors to API-friendly messages. */
export function listingImageUploadMiddleware(req, res, next) {
  listingImageUpload.array('images', 5)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400);
        err.message = 'Each image must be smaller than 5 MB.';
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400);
        err.message = 'Maximum 5 images allowed per upload.';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400);
        err.message = 'Invalid upload field. Use images.';
      }
    }
    if (!res.statusCode || res.statusCode < 400) res.status(400);
    next(err);
  });
}
