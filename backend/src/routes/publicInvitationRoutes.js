import { Router } from 'express';
import { publicInvitation, submitRsvp } from '../controllers/invitationController.js';
import { getVenue, listVenues } from '../controllers/venueController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.get('/venues', listVenues);
router.get('/venues/:id', validateObjectId(), getVenue);
router.get('/invitations/:token', publicInvitation);
router.post('/rsvp/:token', submitRsvp);

export default router;
