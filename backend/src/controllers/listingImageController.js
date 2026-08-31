import asyncHandler from 'express-async-handler';
import {
  MAX_LISTING_IMAGES,
  publicListingImagePath,
} from '../utils/listingImageStorage.js';

export const uploadListingImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (process.env.NODE_ENV !== 'production') {
    console.log('[listing-upload] files:', files.length, files.map((f) => ({
      name: f.originalname,
      mime: f.mimetype,
      size: f.size,
    })));
  }
  if (!files.length) {
    res.status(400);
    throw new Error('No image file provided.');
  }
  if (files.length > MAX_LISTING_IMAGES) {
    res.status(400);
    throw new Error(`Maximum ${MAX_LISTING_IMAGES} images allowed per upload.`);
  }

  const images = files.map((file) => {
    const path = publicListingImagePath(file.filename);
    return {
      filename: file.filename,
      path,
      url: path,
    };
  });

  const paths = images.map((img) => img.path).filter(Boolean);

  res.status(201).json({
    success: true,
    paths,
    images,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('[listing-upload] saved:', paths);
  }
});
