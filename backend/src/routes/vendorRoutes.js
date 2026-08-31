import { Router } from 'express';
import { getMyVendorProfile, getVendor, listVendors, upsertMyVendorProfile } from '../controllers/vendorController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.get('/', protect, listVendors);
router.get('/me/profile', protect, getMyVendorProfile);
router.put('/me/profile', protect, upsertMyVendorProfile);
router.get('/:id', protect, getVendor);
export default router;
