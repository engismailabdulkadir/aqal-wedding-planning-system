import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Hall from '../models/Hall.js';
import Wedding from '../models/Wedding.js';
import WeddingMember from '../models/WeddingMember.js';
import { ensureDefaultTimeline } from '../utils/defaultTimeline.js';
import { applyHallChange, currentHallBooking } from '../utils/hallReplacement.js';
import { resolveWeddingForCustomerEdit } from '../utils/ownedWedding.js';
import {
  findAccessibleWeddings,
} from '../utils/weddingMembership.js';
import {
  analyzeWeddingUpdateImpact,
  blockingUpdateError,
  dateKey,
} from '../utils/weddingImpact.js';
import { isCoupleRole, normalizeUserRole, ROLES } from '../utils/roles.js';

const editableFields = [
  'weddingName', 'partner1Name', 'partner2Name', 'weddingDate',
  'venue', 'city', 'estimatedBudget', 'expectedGuests', 'description',
];

const weddingPopulate = [
  { path: 'planner', select: 'firstName lastName email phone' },
  { path: 'selectedVenue', select: 'name city' },
  { path: 'selectedHall', select: 'hallName capacity minimumCapacity' },
];

function requireCouple(req, res) {
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Only Groom or Bride accounts can manage a wedding profile');
  }
}

function validateWeddingDate(value, res, { allowPast = false } = {}) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    res.status(400);
    throw new Error('Please provide a valid wedding date');
  }
  if (!allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      res.status(400);
      throw new Error('Wedding date cannot be in the past');
    }
  }
}

function buildWeddingName(groomName, brideName, explicitName) {
  const provided = String(explicitName || '').trim();
  if (provided) return provided.slice(0, 120);
  const groom = String(groomName || '').trim();
  const bride = String(brideName || '').trim();
  if (!groom || !bride) return '';
  return `${groom} & ${bride} Wedding`.slice(0, 120);
}

export const createWedding = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  validateWeddingDate(req.body.weddingDate, res);

  const partner1Name = String(req.body.partner1Name || '').trim();
  const partner2Name = String(req.body.partner2Name || '').trim();
  if (!partner1Name) { res.status(400); throw new Error('Groom name is required'); }
  if (!partner2Name) { res.status(400); throw new Error('Bride name is required'); }

  const city = String(req.body.city || '').trim();
  if (!city) { res.status(400); throw new Error('City is required'); }

  const estimatedBudget = Number(req.body.estimatedBudget);
  if (!Number.isFinite(estimatedBudget) || estimatedBudget < 0) {
    res.status(400);
    throw new Error('Estimated budget must be a number of 0 or more');
  }

  const expectedGuests = Number(req.body.expectedGuests);
  if (!Number.isInteger(expectedGuests) || expectedGuests < 0) {
    res.status(400);
    throw new Error('Expected guests must be a whole number of 0 or more');
  }

  const weddingName = buildWeddingName(partner1Name, partner2Name, req.body.weddingName);
  if (!weddingName) { res.status(400); throw new Error('Wedding name could not be generated'); }

  const creatorRole = normalizeUserRole(req.user.role) === ROLES.BRIDE ? 'bride' : 'groom';
  if (req.body.creatorRole && ['groom', 'bride'].includes(String(req.body.creatorRole).toLowerCase())) {
    const requested = String(req.body.creatorRole).trim().toLowerCase();
    if (requested !== creatorRole) {
      res.status(400);
      throw new Error(`Your account role is ${creatorRole}. You cannot create as ${requested}.`);
    }
  }

  const weddingData = {
    customer: req.user._id,
    weddingName,
    partner1Name,
    partner2Name,
    weddingDate: req.body.weddingDate,
    city,
    estimatedBudget,
    expectedGuests,
    description: String(req.body.description || '').trim(),
    groom: creatorRole === 'groom' ? req.user._id : null,
    bride: creatorRole === 'bride' ? req.user._id : null,
  };
  if (req.body.venue !== undefined) weddingData.venue = req.body.venue;

  const wedding = await Wedding.create(weddingData);
  await WeddingMember.create({
    wedding: wedding._id,
    user: req.user._id,
    memberRole: creatorRole,
    status: 'accepted',
    invitedBy: req.user._id,
  });
  await ensureDefaultTimeline(wedding, req.user._id);
  const populated = await Wedding.findById(wedding._id).populate(weddingPopulate);
  return res.status(201).json({
    success: true,
    wedding: populated,
    message: 'Wedding created. Generate a partner invite code from your wedding dashboard.',
  });
});

export const getMyWedding = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const selectedId = req.headers['x-wedding-id'];
  const weddings = await findAccessibleWeddings(req.user._id, weddingPopulate);
  const wedding = selectedId && mongoose.isValidObjectId(selectedId)
    ? weddings.find((item) => String(item._id) === String(selectedId))
    : weddings[0];
  res.json({ success: true, wedding: wedding || null });
});

export const getMyWeddings = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const weddings = await findAccessibleWeddings(req.user._id, weddingPopulate);
  const memberships = await WeddingMember.find({
    user: req.user._id,
    status: { $in: ['accepted', 'pending'] },
  }).select('wedding memberRole status');

  const membershipMap = new Map(memberships.map((m) => [String(m.wedding), m]));
  const enriched = weddings.map((wedding) => {
    const membership = membershipMap.get(String(wedding._id));
    return {
      ...wedding.toObject(),
      membershipRole: membership?.memberRole || null,
      membershipStatus: membership?.status || null,
      isOwner: wedding.customer.equals(req.user._id),
      inviteCode: wedding.customer.equals(req.user._id) ? wedding.inviteCode : undefined,
    };
  });

  res.json({ success: true, count: enriched.length, weddings: enriched });
});

export const getWedding = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400); throw new Error('Invalid wedding ID'); }
  const wedding = await Wedding.findById(req.params.id).populate(weddingPopulate);
  if (!wedding) { res.status(404); throw new Error('Wedding not found'); }
  const membership = await WeddingMember.findOne({ wedding: wedding._id, user: req.user._id });
  const canAccess = wedding.customer.equals(req.user._id) || membership?.status === 'accepted';
  if (!canAccess) { res.status(404); throw new Error('Wedding not found'); }

  res.json({
    success: true,
    wedding: {
      ...wedding.toObject(),
      membershipRole: membership?.memberRole || null,
      membershipStatus: membership?.status || null,
      isOwner: wedding.customer.equals(req.user._id),
      inviteCode: wedding.customer.equals(req.user._id) ? wedding.inviteCode : undefined,
    },
  });
});

export const updateWedding = asyncHandler(async (req, res) => {
  const wedding = await resolveWeddingForCustomerEdit(req, res, { weddingId: req.params.id });

  const previous = wedding.toObject();
  const updates = {};
  for (const field of editableFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (updates.weddingDate !== undefined) {
    validateWeddingDate(updates.weddingDate, res);
  }

  const warnings = await analyzeWeddingUpdateImpact(wedding, updates, previous);
  blockingUpdateError(warnings);

  const dateChanged = updates.weddingDate !== undefined && dateKey(updates.weddingDate) !== dateKey(previous.weddingDate);
  const rescheduleWarning = warnings.find((item) => item.code === 'DATE_RESCHEDULE_REQUIRED');
  if (dateChanged && rescheduleWarning && req.body.confirmReschedule !== true) {
    const err = new Error('Review and confirm this date change before it is saved.');
    err.statusCode = 409;
    err.code = 'DATE_RESCHEDULE_REQUIRED';
    err.details = rescheduleWarning.details;
    throw err;
  }

  if (dateChanged && rescheduleWarning && req.body.confirmReschedule === true) {
    const booking = await currentHallBooking(wedding._id);
    if (booking) {
      const hall = await Hall.findById(booking.hall._id || booking.hall).populate('venue', 'name city');
      await applyHallChange({
        wedding,
        customerId: wedding.customer,
        currentBooking: booking,
        hall,
        date: dateKey(updates.weddingDate),
        slotType: booking.slotType,
        allowOverBudget: true,
      });
    }
  }

  for (const [field, value] of Object.entries(updates)) {
    wedding[field] = value;
  }
  await wedding.save();

  const populated = await Wedding.findById(wedding._id).populate(weddingPopulate);
  const remainingWarnings = warnings.filter((item) => item.code !== 'DATE_RESCHEDULE_REQUIRED');

  res.json({
    success: true,
    wedding: populated,
    warnings: remainingWarnings,
    message: 'Wedding details updated successfully.',
  });
});

export const deleteWedding = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid wedding ID');
  }

  const wedding = await Wedding.findById(req.params.id);
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }
  if (!wedding.customer.equals(req.user._id)) {
    res.status(403);
    throw new Error('Only the wedding creator can delete this wedding');
  }

  await wedding.deleteOne();
  res.json({ success: true, message: 'Wedding deleted successfully' });
});
