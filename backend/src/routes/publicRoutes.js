import { Router } from 'express';
import { getVenue, listVenues } from '../controllers/venueController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.get('/venues', listVenues);
router.get('/venues/:id', validateObjectId(), getVenue);

export default router;
