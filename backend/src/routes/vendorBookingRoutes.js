import { Router } from 'express';
import { createListing, deactivateListing, getMyListings, updateListing } from '../controllers/listingController.js';
import { uploadListingImages } from '../controllers/listingImageController.js';
import { listingImageUploadMiddleware } from '../middleware/listingImageUploadMiddleware.js';
import { vendorPayments } from '../controllers/paymentController.js';
import { vendorOrders } from '../controllers/selectionController.js';
import { listVendorBookings, updateVendorBookingStatus } from '../controllers/bookingController.js';
import { createHall, createVenue, getMyVenues, updateHall, updateVenue, upsertHallSlots } from '../controllers/venueController.js';
import { listHallBookings } from '../controllers/hallBookingController.js';
import { listOrders, updateVendorOrder } from '../controllers/orderController.js';
import { listVendorTasks, updateVendorTask } from '../controllers/taskController.js';
import { getReport } from '../controllers/reportController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(protect, requireRole('vendor'));

/** Register before /listings/:id to avoid route shadowing */
router.post('/listings/upload-images', listingImageUploadMiddleware, uploadListingImages);

router.route('/listings').get(getMyListings).post(createListing);
router.patch('/listings/:id', updateListing);
router.delete('/listings/:id', deactivateListing);

router.get('/orders', listOrders);
router.get('/selections', vendorOrders);
router.patch('/orders/:id', validateObjectId(), updateVendorOrder);
router.get('/tasks', listVendorTasks);
router.patch('/tasks/:id', validateObjectId(), updateVendorTask);
router.get('/payments', vendorPayments);

router.get('/bookings', listVendorBookings);
router.patch('/bookings/:id/status', updateVendorBookingStatus);

router.get('/venues', getMyVenues);
router.post('/venues', createVenue);
router.patch('/venues/:id', validateObjectId(), updateVenue);
router.post('/venues/:id/halls', validateObjectId(), createHall);
router.patch('/halls/:id', validateObjectId(), updateHall);
router.put('/halls/:id/slots', validateObjectId(), upsertHallSlots);

router.get('/hall-bookings', listHallBookings);
router.get('/reports', getReport);

export default router;
