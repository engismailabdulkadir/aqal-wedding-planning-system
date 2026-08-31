import { Router } from 'express';
import {
  acceptHallQuote,
  cancelHallQuote,
  getHallQuote,
  listHallQuotes,
  rejectHallQuote,
  requestHallQuote,
  submitHallQuote,
} from '../controllers/hallQuoteController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.use(protect);

router.get('/', requireRole('customer', 'vendor', 'admin'), listHallQuotes);
router.post('/request', requireRole('customer'), requestHallQuote);
router.get('/:id', requireRole('customer', 'vendor', 'admin'), validateObjectId(), getHallQuote);
router.patch('/:id/submit', requireRole('vendor', 'admin'), validateObjectId(), submitHallQuote);
router.post('/:id/accept', requireRole('customer'), validateObjectId(), acceptHallQuote);
router.post('/:id/reject', requireRole('customer'), validateObjectId(), rejectHallQuote);
router.post('/:id/cancel', requireRole('customer', 'vendor', 'admin'), validateObjectId(), cancelHallQuote);

export default router;
