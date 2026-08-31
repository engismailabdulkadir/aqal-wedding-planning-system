import { Router } from 'express';
import { getHall, getVenue, listVenues } from '../controllers/venueController.js';
import { getHallAvailability, getVenueAvailability } from '../controllers/hallBookingController.js';

const router = Router();
router.get('/', listVenues);
router.get('/:id/availability', getVenueAvailability);
router.get('/:id', getVenue);

export default router;
