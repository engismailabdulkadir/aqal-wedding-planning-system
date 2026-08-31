import { Router } from 'express';
import { createAppointment, createRental } from '../controllers/availabilityController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/appointments', protect, requireRole('customer'), createAppointment);
router.post('/rentals', protect, requireRole('customer'), createRental);

export default router;
