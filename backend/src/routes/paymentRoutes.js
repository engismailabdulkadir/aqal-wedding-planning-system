import { Router } from 'express';
import {
  confirmTestPayment,
  createPayment,
  getPayment,
  getPaymentStatus,
  initiateWaafiPayment,
  listPayments,
} from '../controllers/paymentController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect, requireRole('groom', 'bride', 'customer'));
router.route('/').get(listPayments).post(createPayment);
router.post('/waafi/initiate', initiateWaafiPayment);
router.get('/:id/status', getPaymentStatus);
router.get('/:id', getPayment);
router.post('/:id/confirm-test', confirmTestPayment);

export default router;
