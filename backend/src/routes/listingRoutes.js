import { Router } from 'express';
import { getListing, listListings } from '../controllers/listingController.js';
import { getListingAvailability } from '../controllers/availabilityController.js';

const router = Router();
router.get('/', listListings);
router.get('/:id/availability', getListingAvailability);
router.get('/:id', getListing);

export default router;
