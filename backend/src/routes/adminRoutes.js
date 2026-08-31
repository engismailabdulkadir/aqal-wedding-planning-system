import { Router } from 'express';
import {
  assignPlanner,
  createUser,
  deleteUser,
  getAdminBookings,
  getAdminDashboard,
  getAdminHallBookings,
  getAdminListings,
  getAdminOrders,
  getAdminPayments,
  getAdminSelections,
  getAdminVendor,
  getAdminVendors,
  getAdminWedding,
  getAdminWeddings,
  createAdminWedding,
  getCustomer,
  getCustomers,
  getPlanner,
  getPlanners,
  getUser,
  getUsers,
  updateAdminListing,
  updateAdminVendor,
  updateUser,
} from '../controllers/adminController.js';
import {
  cancelAdminUnifiedBooking,
  getAdminUnifiedBooking,
  listAdminUnifiedBookings,
  updateAdminUnifiedBookingStatus,
} from '../controllers/adminBookingsController.js';
import { refundPayment } from '../controllers/paymentController.js';
import { getReport } from '../controllers/reportController.js';
import {
  createAdminHall,
  createAdminVenue,
  getAdminVenue,
  linkAdminVenueVendor,
  listAdminVenues,
  updateAdminHall,
  updateAdminVenue,
} from '../controllers/adminVenueController.js';
import {
  archiveAdminNotification,
  createAnnouncement,
  getAdminNotification,
  listAdminNotifications,
  listAnnouncementRecipientsPreview,
  listAnnouncements,
  sendAdminNotification,
  updateAnnouncement,
} from '../controllers/adminNotificationsController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(protect, requireRole('admin'));

router.get('/dashboard', getAdminDashboard);

router.route('/users').get(getUsers).post(createUser);
router.route('/users/:id').get(validateObjectId(), getUser).patch(validateObjectId(), updateUser).delete(validateObjectId(), deleteUser);

router.get('/customers', getCustomers);
router.get('/customers/:id', validateObjectId(), getCustomer);

router.get('/planners', getPlanners);
router.get('/planners/:id', validateObjectId(), getPlanner);

router.get('/vendors', getAdminVendors);
router.get('/vendors/:id', validateObjectId(), getAdminVendor);
router.patch('/vendors/:id', validateObjectId(), updateAdminVendor);

router.get('/weddings', getAdminWeddings);
router.post('/weddings', createAdminWedding);
router.get('/weddings/:id', validateObjectId(), getAdminWedding);
router.patch('/weddings/:id/planner', validateObjectId(), assignPlanner);

router.get('/venues', listAdminVenues);
router.post('/venues', createAdminVenue);
router.get('/venues/:id', validateObjectId(), getAdminVenue);
router.patch('/venues/:id', validateObjectId(), updateAdminVenue);
router.patch('/venues/:id/vendor', validateObjectId(), linkAdminVenueVendor);
router.post('/venues/:id/halls', validateObjectId(), createAdminHall);
router.patch('/halls/:id', validateObjectId(), updateAdminHall);

router.get('/bookings', listAdminUnifiedBookings);
router.get('/bookings/:id', getAdminUnifiedBooking);
router.patch('/bookings/:id/status', updateAdminUnifiedBookingStatus);
router.patch('/bookings/:id/cancel', cancelAdminUnifiedBooking);
router.get('/legacy-bookings', getAdminBookings);
router.get('/hall-bookings', getAdminHallBookings);
router.get('/listings', getAdminListings);
router.patch('/listings/:id', validateObjectId(), updateAdminListing);
router.get('/selections', getAdminSelections);
router.get('/orders', getAdminOrders);
router.get('/payments', getAdminPayments);
router.post('/payments/:id/refund', validateObjectId(), refundPayment);
router.get('/reports', getReport);

router.get('/notification-recipients', listAnnouncementRecipientsPreview);
router.post('/notifications/send', sendAdminNotification);
router.get('/notifications', listAdminNotifications);
router.get('/notifications/:id', validateObjectId(), getAdminNotification);
router.patch('/notifications/:id/archive', validateObjectId(), archiveAdminNotification);

router.get('/announcements', listAnnouncements);
router.post('/announcements', createAnnouncement);
router.patch('/announcements/:id', validateObjectId(), updateAnnouncement);

export default router;
