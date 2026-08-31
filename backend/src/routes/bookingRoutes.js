import { Router } from 'express';
import {
  cancelBooking,
  checkBookingAvailability,
  createBooking,
  createHallBooking,
  getBooking,
  listBookings,
  payBooking,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/check-availability', checkBookingAvailability);
router.post('/hall', createHallBooking);
router.route('/').get(listBookings).post(createBooking);
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancelBooking);
router.post('/:id/pay', payBooking);

export default router;
