import { Router } from 'express';
import { createAppointment, createRental, getListingAvailability } from '../controllers/availabilityController.js';
import { getOrder, listOrders, updateVendorOrder } from '../controllers/orderController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

export const availabilityRouter = Router();
availabilityRouter.get('/listings/:id/availability', getListingAvailability);
availabilityRouter.post('/appointments', protect, requireRole('customer'), createAppointment);
availabilityRouter.post('/rentals', protect, requireRole('customer'), createRental);

export const orderRouter = Router();
orderRouter.use(protect);
orderRouter.get('/', listOrders);
orderRouter.get('/:id', validateObjectId(), getOrder);

export const vendorOrderRouter = Router();
vendorOrderRouter.patch('/orders/:id', protect, requireRole('vendor'), validateObjectId(), updateVendorOrder);

export default orderRouter;
