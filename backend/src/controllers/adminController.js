import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import CustomerProfile from '../models/CustomerProfile.js';
import PlannerProfile from '../models/PlannerProfile.js';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import Wedding from '../models/Wedding.js';
import WeddingListing from '../models/WeddingListing.js';
import WeddingSelection from '../models/WeddingSelection.js';
import Payment from '../models/Payment.js';
import Guest from '../models/Guest.js';
import Task from '../models/Task.js';
import Invitation from '../models/Invitation.js';
import Order from '../models/Order.js';
import HallBooking from '../models/HallBooking.js';
import Conversation from '../models/Conversation.js';
import { notify, notifyAdmins } from '../utils/notify.js';
import { computeWeddingBudget } from '../utils/budgetTotals.js';
import { ensureDefaultTimeline } from '../utils/defaultTimeline.js';
import { computeOverviewFromRecords, syncWeddingTimeline, withTimelineDisplay } from '../utils/workspaceOverview.js';
import {
  COUPLE_ROLES,
  isCoupleRole,
  isWeddingPlannerRole,
  ROLES as SYSTEM_ROLES,
} from '../utils/roles.js';
import {
  assertEmailAvailable,
  assertPhoneAvailable,
  assertUsernameAvailable,
} from '../utils/userUniqueness.js';
import { createHttpError } from '../utils/httpErrors.js';
import {
  assertPhoneRequired,
  assertValidPersonName,
  isValidPassword,
} from '../utils/validation.js';
import {
  ACCOUNT_STATUSES,
  assertValidAccountStatus,
  isProtectedAdminUser,
  resolveAccountStatus,
} from '../utils/userAccountStatus.js';

const ROLES = ['admin', 'groom', 'bride', 'wedding_planner', 'vendor'];
const publicFields = 'firstName lastName username email phone role accountStatus isActive isVerified createdAt updatedAt lastLogin';

function serializeUser(user) {
  const object = user.toObject ? user.toObject() : user;
  const accountStatus = resolveAccountStatus(object);
  return { ...object, accountStatus, isActive: accountStatus === 'active' };
}

async function assertCanChangeAccountStatus(targetUser, nextStatus, actingUser) {
  if (!ACCOUNT_STATUSES.includes(nextStatus)) {
    throw createHttpError('Status must be active, inactive, or blocked', { statusCode: 400, field: 'accountStatus' });
  }

  if (isProtectedAdminUser(targetUser) && nextStatus !== 'active') {
    throw createHttpError('The main administrator account cannot be deactivated or blocked.', { statusCode: 403 });
  }

  if (actingUser && targetUser._id.equals(actingUser._id) && nextStatus !== 'active') {
    const activeAdminCount = await User.countDocuments({ role: 'admin', accountStatus: 'active' });
    if (activeAdminCount <= 1) {
      throw createHttpError(
        'You cannot deactivate or block your account while you are the only active administrator.',
        { statusCode: 403 },
      );
    }
  }
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthlySeries(items, dateField = 'createdAt') {
  const map = {};
  for (const item of items) {
    const key = monthKey(item[dateField]);
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const now = new Date();
  const [
    totalUsers,
    totalCustomers,
    totalPlanners,
    totalVendors,
    totalWeddings,
    upcomingWeddings,
    completedWeddings,
    totalServices,
    totalBookings,
    totalOrders,
    pendingOrders,
    confirmedOrders,
    totalPayments,
    pendingPayments,
    completedPayments,
    revenueAgg,
    weddings,
    payments,
    bookings,
    listings,
    selections,
    customerUsers,
    vendorUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $in: COUPLE_ROLES } }),
    User.countDocuments({ role: { $in: ['wedding_planner', 'planner'] } }),
    User.countDocuments({ role: 'vendor' }),
    Wedding.countDocuments(),
    Wedding.countDocuments({ weddingDate: { $gte: now }, status: { $in: ['planning', 'confirmed'] } }),
    Wedding.countDocuments({ status: 'completed' }),
    WeddingListing.countDocuments(),
    Booking.countDocuments(),
    WeddingSelection.countDocuments(),
    WeddingSelection.countDocuments({ status: 'pending_payment' }),
    WeddingSelection.countDocuments({ status: { $in: ['paid', 'fulfilled'] } }),
    Payment.countDocuments(),
    Payment.countDocuments({ status: { $in: ['pending', 'processing'] } }),
    Payment.countDocuments({ status: 'paid' }),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Wedding.find().select('createdAt weddingDate status').lean(),
    Payment.find({ status: 'paid' }).select('amount paidAt createdAt').lean(),
    Booking.find().select('createdAt').lean(),
    WeddingListing.find().select('category').lean(),
    WeddingSelection.find().select('status').lean(),
    User.find({ role: { $in: COUPLE_ROLES } }).select('createdAt').lean(),
    User.find({ role: 'vendor' }).select('createdAt').lean(),
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;

  const weddingsByStatus = ['planning', 'confirmed', 'completed', 'cancelled'].map((status) => ({
    status,
    count: weddings.filter((w) => w.status === status).length,
  }));

  const servicesByCategory = {};
  for (const listing of listings) {
    servicesByCategory[listing.category] = (servicesByCategory[listing.category] || 0) + 1;
  }

  const ordersByStatus = ['selected', 'pending_payment', 'paid', 'cancelled', 'fulfilled'].map((status) => ({
    status,
    count: selections.filter((s) => s.status === status).length,
  }));

  const revenueByMonth = buildMonthlySeries(
    payments.map((p) => ({ createdAt: p.paidAt || p.createdAt })),
  );

  res.json({
    success: true,
    summary: {
      totalUsers,
      totalCustomers,
      totalPlanners,
      totalVendors,
      totalWeddings,
      upcomingWeddings,
      completedWeddings,
      totalServices,
      totalBookings,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      totalPayments,
      pendingPayments,
      completedPayments,
      totalRevenue,
      activeBookings: await Booking.countDocuments({ status: { $in: ['pending', 'accepted'] } }),
    },
    charts: {
      weddingsByMonth: buildMonthlySeries(weddings),
      revenueByMonth,
      bookingsByMonth: buildMonthlySeries(bookings),
      servicesByCategory: Object.entries(servicesByCategory).map(([category, count]) => ({ category, count })),
      ordersByStatus,
      weddingsByStatus,
      customerGrowth: buildMonthlySeries(customerUsers),
      vendorGrowth: buildMonthlySeries(vendorUsers),
    },
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) {
    if (!ROLES.includes(req.query.role)) {
      res.status(400);
      throw new Error('Invalid role filter');
    }
    filter.role = req.query.role;
  }
  if (req.query.status) {
    const status = String(req.query.status).toLowerCase();
    if (!ACCOUNT_STATUSES.includes(status)) {
      res.status(400);
      throw new Error('Invalid status filter');
    }
    filter.accountStatus = status;
  }
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const q = new RegExp(escaped, 'i');
    filter.$or = [{ firstName: q }, { lastName: q }, { email: q }, { username: q }, { phone: q }];
  }
  const users = await User.find(filter).select(publicFields).sort({ createdAt: -1 });
  const [total, active, inactive, blocked] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ accountStatus: 'active' }),
    User.countDocuments({ accountStatus: 'inactive' }),
    User.countDocuments({ accountStatus: 'blocked' }),
  ]);
  res.json({
    success: true,
    count: users.length,
    users: users.map((user) => serializeUser(user)),
    summary: { total, active, inactive, blocked },
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(publicFields);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ success: true, user: serializeUser(user) });
});

export const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, phone, password, role, accountStatus } = req.body;
  if (!ROLES.includes(role)) {
    res.status(400);
    throw createHttpError('Role must be admin, groom, bride, wedding_planner, or vendor', { statusCode: 400, field: 'role' });
  }

  assertValidPersonName(firstName, 'First name');
  assertValidPersonName(lastName, 'Last name');

  if (!isValidPassword(password)) {
    throw createHttpError('Password must be at least 4 characters.', {
      statusCode: 400,
      code: 'INVALID_PASSWORD',
      field: 'password',
    });
  }

  const normalizedUsername = await assertUsernameAvailable(username);
  const normalizedEmail = await assertEmailAvailable(email);
  const phoneData = await assertPhoneAvailable(phone, { required: isCoupleRole(role) });

  const nextStatus = accountStatus ? String(accountStatus).toLowerCase() : 'active';
  const statusError = assertValidAccountStatus(nextStatus);
  if (statusError) {
    throw createHttpError(statusError, { statusCode: 400, field: 'accountStatus' });
  }

  const userPayload = {
    firstName,
    lastName,
    username: normalizedUsername,
    phone: phoneData.phone,
    password,
    role,
    accountStatus: nextStatus,
    isActive: nextStatus === 'active',
  };
  if (normalizedEmail) userPayload.email = normalizedEmail;

  const user = await User.create(userPayload);

  if (isCoupleRole(role)) await CustomerProfile.create({ user: user._id });
  else if (isWeddingPlannerRole(role)) await PlannerProfile.create({ user: user._id });
  else if (role === 'vendor') {
    await VendorProfile.create({
      user: user._id,
      businessName: `${firstName} ${lastName}`,
      category: 'other',
      city: 'Pending',
      verificationStatus: 'pending',
    });
  }

  res.status(201).json({ success: true, user: serializeUser(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.body.firstName !== undefined) {
    assertValidPersonName(req.body.firstName, 'First name');
    user.firstName = req.body.firstName;
  }
  if (req.body.lastName !== undefined) {
    assertValidPersonName(req.body.lastName, 'Last name');
    user.lastName = req.body.lastName;
  }
  if (req.body.isActive !== undefined && req.body.accountStatus === undefined) {
    const legacyStatus = req.body.isActive ? 'active' : 'blocked';
    await assertCanChangeAccountStatus(user, legacyStatus, req.user);
    user.accountStatus = legacyStatus;
    user.isActive = req.body.isActive;
  }

  if (req.body.accountStatus !== undefined) {
    const nextStatus = String(req.body.accountStatus).toLowerCase();
    const statusError = assertValidAccountStatus(nextStatus);
    if (statusError) {
      throw createHttpError(statusError, { statusCode: 400, field: 'accountStatus' });
    }
    await assertCanChangeAccountStatus(user, nextStatus, req.user);
    user.accountStatus = nextStatus;
    user.isActive = nextStatus === 'active';
  }

  if (req.body.username !== undefined) {
    user.username = await assertUsernameAvailable(req.body.username, user._id);
  }

  if (req.body.email !== undefined) {
    const normalizedEmail = await assertEmailAvailable(req.body.email, user._id);
    if (normalizedEmail) user.email = normalizedEmail;
    else {
      user.email = undefined;
      if (user._doc) delete user._doc.email;
      user.markModified('email');
    }
  }

  if (req.body.phone !== undefined) {
    const roleForPhone = req.body.role || user.role;
    const phoneData = await assertPhoneAvailable(req.body.phone, {
      required: isCoupleRole(roleForPhone),
      excludeUserId: user._id,
    });
    user.phone = phoneData.phone;
  }

  if (req.body.password) {
    if (!isValidPassword(req.body.password)) {
      throw createHttpError('Password must be at least 4 characters.', {
        statusCode: 400,
        code: 'INVALID_PASSWORD',
        field: 'password',
      });
    }
    user.password = req.body.password;
  }

  if (req.body.role !== undefined) {
    if (!ROLES.includes(req.body.role)) {
      throw createHttpError('Invalid role', { statusCode: 400, field: 'role' });
    }
    user.role = req.body.role;
  }

  if (isCoupleRole(user.role)) assertPhoneRequired(user.phone);

  await user.save();

  if (!user.email) {
    await User.collection.updateOne({ _id: user._id }, { $unset: { email: '' } });
  }
  if (!user.phoneNormalized) {
    await User.collection.updateOne({ _id: user._id }, { $unset: { phoneNormalized: '' } });
  }

  res.json({ success: true, user: serializeUser(user) });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (isProtectedAdminUser(user)) {
    res.status(403);
    throw new Error('The main administrator account cannot be deleted.');
  }
  if (user._id.equals(req.user._id)) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }
  await Promise.all([
    CustomerProfile.deleteOne({ user: user._id }),
    PlannerProfile.deleteOne({ user: user._id }),
    VendorProfile.deleteOne({ user: user._id }),
  ]);
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted successfully' });
});

export const getCustomers = asyncHandler(async (req, res) => {
  const filter = { role: { $in: COUPLE_ROLES } };
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const q = new RegExp(escaped, 'i');
    filter.$or = [{ firstName: q }, { lastName: q }, { email: q }, { username: q }];
  }
  const customers = await User.find(filter).select(publicFields).sort({ createdAt: -1 });
  const profiles = await CustomerProfile.find({ user: { $in: customers.map((c) => c._id) } });
  const profileMap = Object.fromEntries(profiles.map((p) => [String(p.user), p]));
  const weddingCounts = await Wedding.aggregate([
    { $match: { customer: { $in: customers.map((c) => c._id) } } },
    { $group: { _id: '$customer', count: { $sum: 1 } } },
  ]);
  const weddingMap = Object.fromEntries(weddingCounts.map((w) => [String(w._id), w.count]));

  res.json({
    success: true,
    count: customers.length,
    customers: customers.map((c) => ({
      ...c.toObject(),
      profile: profileMap[String(c._id)] || null,
      weddingCount: weddingMap[String(c._id)] || 0,
    })),
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: { $in: COUPLE_ROLES } }).select(publicFields);
  if (!user) {
    res.status(404);
    throw new Error('Customer not found');
  }
  const [profile, weddings] = await Promise.all([
    CustomerProfile.findOne({ user: user._id }),
    Wedding.find({ customer: user._id }).populate('planner', 'firstName lastName email').populate('selectedVenue', 'name').populate('selectedHall', 'hallName').sort({ createdAt: -1 }),
  ]);
  const weddingIds = weddings.map((w) => w._id);
  const [selections, guests, tasks, invitations, payments, orders] = await Promise.all([
    WeddingSelection.find({ customer: user._id }).sort({ createdAt: -1 }),
    Guest.find({ wedding: { $in: weddingIds } }),
    Task.find({ wedding: { $in: weddingIds } }),
    Invitation.find({ wedding: { $in: weddingIds } }).populate('guest', 'firstName lastName'),
    Payment.find({ customer: user._id }).sort({ createdAt: -1 }),
    Order.find({ customer: user._id }).sort({ createdAt: -1 }),
  ]);
  const budgets = await Promise.all(weddings.map(async (wedding) => {
    const computed = await computeWeddingBudget(wedding);
    return {
      weddingId: wedding._id,
      weddingName: wedding.weddingName,
      totalBudget: computed.totalBudget,
      totalPlannedCost: computed.totalPlannedCost,
      totalPaid: computed.totalPaid,
      outstandingPayments: computed.outstandingPayments,
      remainingBudget: computed.remainingBudget,
    };
  }));
  res.json({ success: true, customer: user, profile, weddings, selections, guests, tasks, invitations, payments, orders, budgets });
});

export const getPlanners = asyncHandler(async (req, res) => {
  const filter = { role: { $in: ['wedding_planner', 'planner'] } };
  if (req.query.search) {
    const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const q = new RegExp(escaped, 'i');
    filter.$or = [{ firstName: q }, { lastName: q }, { email: q }, { username: q }];
  }
  const planners = await User.find(filter).select(publicFields).sort({ createdAt: -1 });
  const profiles = await PlannerProfile.find({ user: { $in: planners.map((p) => p._id) } });
  const profileMap = Object.fromEntries(profiles.map((p) => [String(p.user), p]));
  const assignmentCounts = await Wedding.aggregate([
    { $match: { planner: { $in: planners.map((p) => p._id) } } },
    { $group: { _id: '$planner', count: { $sum: 1 } } },
  ]);
  const assignmentMap = Object.fromEntries(assignmentCounts.map((a) => [String(a._id), a.count]));

  res.json({
    success: true,
    count: planners.length,
    planners: planners.map((p) => ({
      ...p.toObject(),
      profile: profileMap[String(p._id)] || null,
      assignedWeddings: assignmentMap[String(p._id)] || 0,
    })),
  });
});

export const getPlanner = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: { $in: ['wedding_planner', 'planner'] } }).select(publicFields);
  if (!user) {
    res.status(404);
    throw new Error('Planner not found');
  }
  const [profile, weddings] = await Promise.all([
    PlannerProfile.findOne({ user: user._id }),
    Wedding.find({ planner: user._id }).populate('customer', 'firstName lastName email').sort({ weddingDate: 1 }),
  ]);
  res.json({ success: true, planner: user, profile, weddings });
});

export const createAdminWedding = asyncHandler(async (req, res) => {
  const customer = mongoose.isValidObjectId(req.body.customer)
    ? await User.findOne({ _id: req.body.customer, role: { $in: COUPLE_ROLES }, isActive: true })
    : null;
  if (!customer) {
    res.status(400);
    throw new Error('Select a valid active customer');
  }
  if (!req.body.weddingName || !req.body.partner1Name || !req.body.partner2Name) {
    res.status(400);
    throw new Error('Wedding name and both partner names are required');
  }
  const weddingDate = new Date(req.body.weddingDate);
  if (!req.body.weddingDate || Number.isNaN(weddingDate.getTime())) {
    res.status(400);
    throw new Error('Please provide a valid wedding date');
  }
  const weddingData = {
    customer: customer._id,
    weddingName: req.body.weddingName,
    partner1Name: req.body.partner1Name,
    partner2Name: req.body.partner2Name,
    weddingDate,
    city: req.body.city || 'Unspecified',
    estimatedBudget: Number(req.body.estimatedBudget || 0),
    expectedGuests: Number(req.body.expectedGuests || 0),
    description: req.body.description || req.body.notes || '',
  };
  if (req.body.planner) {
    const planner = await User.findOne({ _id: req.body.planner, role: { $in: ['wedding_planner', 'planner'] }, isActive: true });
    if (!planner) {
      res.status(400);
      throw new Error('Select a valid active planner');
    }
    weddingData.planner = planner._id;
  }
  const wedding = await Wedding.create(weddingData);
  await ensureDefaultTimeline(wedding, req.user._id);
  await notify(customer._id, {
    title: 'Wedding created',
    message: `${wedding.weddingName} was created for you.`,
    type: 'wedding_created',
    link: '/weddings',
    wedding: wedding._id,
  });
  if (wedding.planner) {
    await notify(wedding.planner, {
      title: 'Wedding assigned',
      message: `${wedding.weddingName} was assigned to you.`,
      type: 'wedding_assigned',
      link: `/planner/weddings/${wedding._id}`,
      wedding: wedding._id,
    });
  }
  const populated = await Wedding.findById(wedding._id)
    .populate('customer', 'firstName lastName email')
    .populate('planner', 'firstName lastName email');
  res.status(201).json({
    success: true,
    wedding: populated,
    message: 'Wedding created for the selected customer.',
  });
});

export const getAdminWeddings = asyncHandler(async (_req, res) => {
  const weddings = await Wedding.find()
    .populate('customer', 'firstName lastName email')
    .populate('planner', 'firstName lastName email')
    .sort({ createdAt: -1 });
  const planners = await User.find({ role: { $in: ['wedding_planner', 'planner'] }, isActive: true }).select('firstName lastName email');
  res.json({ success: true, count: weddings.length, weddings, planners });
});

export const assignPlanner = asyncHandler(async (req, res) => {
  const wedding = await Wedding.findById(req.params.id);
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }
  const previousPlannerId = wedding.planner ? String(wedding.planner) : null;
  let nextPlanner = null;
  if (req.body.planner === null || req.body.planner === '') {
    wedding.planner = null;
  } else {
    nextPlanner = await User.findOne({ _id: req.body.planner, role: 'planner', isActive: true });
    if (!nextPlanner) {
      res.status(400);
      throw new Error('Select a valid active planner');
    }
    wedding.planner = nextPlanner._id;
  }
  await wedding.save();
  await wedding.populate('planner', 'firstName lastName email phone');
  if (previousPlannerId && previousPlannerId !== String(wedding.planner?._id || '')) {
    await notify(previousPlannerId, {
      title: 'Wedding reassigned',
      message: `${wedding.weddingName} is no longer assigned to you. Existing tasks and messages were kept.`,
      type: 'wedding_unassigned',
      link: '/planner/dashboard',
      wedding: wedding._id,
    });
  }
  if (wedding.planner) {
    await notify(wedding.customer, {
      title: 'Planner assigned',
      message: `${wedding.planner.firstName} ${wedding.planner.lastName} is now coordinating your wedding.`,
      type: 'planner_assigned',
      link: '/workspace',
      wedding: wedding._id,
    });
    if (String(wedding.planner._id) !== previousPlannerId) {
      await notify(wedding.planner._id, {
        title: 'Wedding assigned',
        message: `${wedding.weddingName} was assigned to you.`,
        type: 'wedding_assigned',
        link: `/planner/weddings/${wedding._id}`,
        wedding: wedding._id,
      });
    }
  }
  res.json({
    success: true,
    wedding,
    message: wedding.planner ? 'Planner assigned successfully.' : 'Planner removed. Wedding history was preserved.',
  });
});

export const getAdminVendors = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.verificationStatus = req.query.status;
  const vendors = await VendorProfile.find(filter)
    .populate('user', 'firstName lastName email isActive')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: vendors.length, vendors });
});

export const getAdminVendor = asyncHandler(async (req, res) => {
  const vendor = await VendorProfile.findById(req.params.id).populate('user', 'firstName lastName email isActive');
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }
  const [listings, orders, payments, hallBookings] = await Promise.all([
    WeddingListing.find({ vendor: vendor.user._id }),
    Order.find({ vendor: vendor.user._id }).populate('wedding', 'weddingName').sort({ createdAt: -1 }),
    Payment.find({ vendor: vendor.user._id }).sort({ createdAt: -1 }),
    HallBooking.find({ vendor: vendor.user._id }).populate('hall', 'hallName').sort({ createdAt: -1 }),
  ]);
  res.json({ success: true, vendor, listings, orders, payments, hallBookings });
});

export const updateAdminVendor = asyncHandler(async (req, res) => {
  const vendor = await VendorProfile.findById(req.params.id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }
  const editable = ['businessName', 'ownerName', 'category', 'description', 'phone', 'email', 'city', 'district', 'address', 'location', 'active', 'verificationStatus'];
  for (const field of editable) {
    if (req.body[field] !== undefined) vendor[field] = req.body[field];
  }
  if (req.body.verificationStatus !== undefined) {
    vendor.verified = req.body.verificationStatus === 'approved';
  }
  await vendor.save();
  res.json({ success: true, vendor });
});

export const getAdminBookings = asyncHandler(async (_req, res) => {
  const bookings = await Booking.find()
    .populate('customer', 'firstName lastName email')
    .populate('vendor', 'firstName lastName email')
    .populate('wedding', 'weddingName weddingDate')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: bookings.length, bookings });
});

export const getAdminListings = asyncHandler(async (_req, res) => {
  const listings = await WeddingListing.find()
    .populate('vendorProfile', 'businessName')
    .populate('vendor', 'firstName lastName email')
    .sort({ createdAt: -1 });
  res.json({ success: true, listings });
});

export const updateAdminListing = asyncHandler(async (req, res) => {
  const listing = await WeddingListing.findById(req.params.id);
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }
  if (req.body.active !== undefined) listing.active = Boolean(req.body.active);
  if (req.body.available !== undefined) listing.available = Boolean(req.body.available);
  await listing.save();
  res.json({ success: true, listing });
});

export const getAdminSelections = asyncHandler(async (_req, res) => {
  const selections = await WeddingSelection.find()
    .populate('customer', 'firstName lastName email')
    .populate('wedding', 'weddingName')
    .populate('vendor', 'firstName lastName')
    .sort({ createdAt: -1 });
  res.json({ success: true, selections });
});

export const getAdminPayments = asyncHandler(async (_req, res) => {
  const payments = await Payment.find()
    .populate('customer', 'firstName lastName email')
    .populate('wedding', 'weddingName')
    .populate('vendor', 'firstName lastName')
    .populate('selection', 'itemName category')
    .populate('order', 'itemName amount paymentStatus')
    .sort({ createdAt: -1 });
  res.json({ success: true, payments });
});

export const getAdminWedding = asyncHandler(async (req, res) => {
  const wedding = await Wedding.findById(req.params.id)
    .populate('customer', 'firstName lastName email phone')
    .populate('planner', 'firstName lastName email phone')
    .populate('selectedVenue')
    .populate('selectedHall');
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }
  const timelineEvents = withTimelineDisplay(await syncWeddingTimeline(wedding._id));
  const [selections, budget, guests, tasks, invitations, orders, payments, hallBookings, conversations, planners] = await Promise.all([
    WeddingSelection.find({ wedding: wedding._id }).populate('vendor', 'firstName lastName'),
    computeWeddingBudget(wedding),
    Guest.find({ wedding: wedding._id }),
    Task.find({ wedding: wedding._id }).populate('assignedTo', 'firstName lastName role').populate('createdBy', 'firstName lastName role'),
    Invitation.find({ wedding: wedding._id }).populate('guest', 'firstName lastName rsvpStatus invitationStatus'),
    Order.find({ wedding: wedding._id }).populate('vendor', 'firstName lastName'),
    Payment.find({ wedding: wedding._id }).select('-providerPayload'),
    HallBooking.find({ wedding: wedding._id }).populate('venue', 'name').populate('hall', 'hallName').populate('vendor', 'firstName lastName'),
    Conversation.find({ wedding: wedding._id }).populate('participants', 'firstName lastName role'),
    User.find({ role: 'planner', isActive: true }).select('firstName lastName email'),
  ]);
  const overview = computeOverviewFromRecords({
    wedding,
    budget,
    halls: hallBookings,
    orders,
    guests,
    tasks,
    events: timelineEvents,
    invitations,
    selections,
  });
  const BRIDE = ['bride_dress', 'bride_shoes', 'accessories', 'bridal_salon', 'makeup', 'hair', 'bouquet'];
  const GROOM = ['groom_attire', 'groom_shoes', 'groom_salon'];
  res.json({
    success: true,
    wedding,
    overview,
    planners,
    selections,
    bride: selections.filter((item) => BRIDE.includes(item.category) && !['cancelled', 'rejected'].includes(item.status)),
    groom: selections.filter((item) => GROOM.includes(item.category) && !['cancelled', 'rejected'].includes(item.status)),
    budget,
    guests,
    tasks,
    invitations,
    invitationSummary: {
      total: invitations.length,
      draft: invitations.filter((item) => item.status === 'draft').length,
      sent: invitations.filter((item) => ['sent', 'opened', 'responded'].includes(item.status)).length,
      accepted: guests.filter((item) => item.rsvpStatus === 'accepted').length,
      pending: guests.filter((item) => item.rsvpStatus === 'pending').length,
      declined: guests.filter((item) => item.rsvpStatus === 'declined').length,
    },
    orders,
    payments,
    hallBookings,
    conversations,
    timeline: timelineEvents,
  });
});

export const getAdminOrders = asyncHandler(async (_req, res) => {
  const orders = await Order.find()
    .populate('customer', 'firstName lastName email')
    .populate('vendor', 'firstName lastName')
    .populate('wedding', 'weddingName')
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

export const getAdminHallBookings = asyncHandler(async (_req, res) => {
  const bookings = await HallBooking.find()
    .populate('customer', 'firstName lastName email')
    .populate('vendor', 'firstName lastName')
    .populate('venue', 'name')
    .populate('hall', 'hallName')
    .populate('wedding', 'weddingName')
    .sort({ createdAt: -1 });
  res.json({ success: true, bookings });
});

