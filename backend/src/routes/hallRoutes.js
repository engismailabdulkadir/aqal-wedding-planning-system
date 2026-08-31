import { Router } from 'express';
import { getHall, listHalls } from '../controllers/venueController.js';
import { getHallAvailability } from '../controllers/hallBookingController.js';

const router = Router();
router.get('/', listHalls);
router.get('/:id/availability', getHallAvailability);
router.get('/:id', getHall);

export default router;
