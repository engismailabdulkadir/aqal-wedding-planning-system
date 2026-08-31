/**
 * Remove test users created by integration scripts (couple/groom/bride flows).
 * Does not touch real gmail accounts or allowlisted users.
 */
import User from '../../src/models/User.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import VendorProfile from '../../src/models/VendorProfile.js';
import Wedding from '../../src/models/Wedding.js';
import WeddingMember from '../../src/models/WeddingMember.js';
import WeddingJoinRequest from '../../src/models/WeddingJoinRequest.js';
import WeddingCartItem from '../../src/models/WeddingCartItem.js';
import WeddingSelection from '../../src/models/WeddingSelection.js';
import Guest from '../../src/models/Guest.js';
import Invitation from '../../src/models/Invitation.js';
import Task from '../../src/models/Task.js';
import TimelineEvent from '../../src/models/TimelineEvent.js';
import BudgetItem from '../../src/models/BudgetItem.js';
import Booking from '../../src/models/Booking.js';
import BookingInvoice from '../../src/models/BookingInvoice.js';
import BookingHistory from '../../src/models/BookingHistory.js';
import Payment from '../../src/models/Payment.js';
import Order from '../../src/models/Order.js';
import Notification from '../../src/models/Notification.js';
import WeddingListing from '../../src/models/WeddingListing.js';

export async function deleteScriptTestUsers(userIds = []) {
  const ids = userIds.filter(Boolean);
  if (!ids.length) return { users: 0 };

  const weddings = await Wedding.find({
    $or: [
      { customer: { $in: ids } },
      { groom: { $in: ids } },
      { bride: { $in: ids } },
    ],
  }).select('_id').lean();
  const weddingIds = weddings.map((w) => w._id);

  const weddingFilter = { wedding: { $in: weddingIds } };
  await Guest.deleteMany(weddingFilter);
  await Invitation.deleteMany(weddingFilter);
  await Task.deleteMany(weddingFilter);
  await TimelineEvent.deleteMany(weddingFilter);
  await BudgetItem.deleteMany(weddingFilter);
  await WeddingCartItem.deleteMany(weddingFilter);
  await WeddingSelection.deleteMany({ $or: [weddingFilter, { customer: { $in: ids } }] });
  await WeddingJoinRequest.deleteMany(weddingFilter);
  await WeddingMember.deleteMany({ $or: [weddingFilter, { user: { $in: ids } }] });

  const bookings = await Booking.find({
    $or: [{ customer: { $in: ids } }, { wedding: { $in: weddingIds } }],
  }).select('_id invoice').lean();
  const bookingIds = bookings.map((b) => b._id);
  const invoiceIds = bookings.map((b) => b.invoice).filter(Boolean);

  await BookingHistory.deleteMany({ booking: { $in: bookingIds } });
  await Payment.deleteMany({ $or: [{ customer: { $in: ids } }, { booking: { $in: bookingIds } }] });
  await BookingInvoice.deleteMany({
    $or: [{ _id: { $in: invoiceIds } }, { booking: { $in: bookingIds } }, { customer: { $in: ids } }],
  });
  await Booking.deleteMany({ $or: [{ _id: { $in: bookingIds } }, { customer: { $in: ids } }] });
  await Order.deleteMany({ customer: { $in: ids } });
  await Notification.deleteMany({
    $or: [{ user: { $in: ids } }, { sentBy: { $in: ids } }, weddingFilter],
  });
  await Wedding.deleteMany({ _id: { $in: weddingIds } });

  await CustomerProfile.deleteMany({ user: { $in: ids } });
  await VendorProfile.deleteMany({ user: { $in: ids } });
  await WeddingListing.deleteMany({ vendor: { $in: ids } });
  const users = await User.deleteMany({ _id: { $in: ids } });

  return { users: users.deletedCount, weddings: weddingIds.length, bookings: bookingIds.length };
}
