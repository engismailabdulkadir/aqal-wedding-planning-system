import { Router } from 'express';
import { listListings } from '../controllers/listingController.js';

const router = Router();
router.get('/listings', listListings);

export default router;
