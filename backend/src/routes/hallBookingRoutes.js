import { Router } from 'express';
import {
  cancelHallBooking,
  confirmHallBooking,
  getHallBooking,
  holdHallBooking,
  listHallBookings,
  replaceHallBooking,
} from '../controllers/hallBookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(protect);
router.get('/', listHallBookings);
router.post('/hold', holdHallBooking);
router.post('/confirm', confirmHallBooking);
router.post('/replace', replaceHallBooking);
router.get('/:id', validateObjectId(), getHallBooking);
router.patch('/:id/cancel', validateObjectId(), cancelHallBooking);

export default router;
