import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Guest from '../models/Guest.js';
import { loadAccessibleWedding, assertWeddingAccess, requireStaffWeddingScope } from '../utils/weddingAccess.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';
import { isCoupleRole } from '../utils/roles.js';

const customerFields = ['firstName', 'lastName', 'phone', 'email', 'gender', 'group', 'category', 'side', 'plusOneAllowed', 'plusOneName', 'numberAttending', 'tableNumber', 'notes'];
const plannerFields = ['tableNumber', 'notes', 'group', 'numberAttending'];

function validateRequestBody(body, res) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400);
    throw new Error('Please provide valid guest details');
  }
  if (body.plusOneAllowed !== undefined && typeof body.plusOneAllowed !== 'boolean') {
    res.status(400);
    throw new Error('Plus one allowed must be true or false');
  }
}

function splitFullName(body) {
  if (!body.fullName || body.firstName) return body;
  const parts = String(body.fullName).trim().split(/\s+/);
  return { ...body, firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function summarizeGuests(guests) {
  return guests.reduce((summary, guest) => {
    summary.totalGuests += 1;
    summary.totalInvited += 1;
    const side = guest.side === 'partner1' ? 'bride' : guest.side === 'partner2' ? 'groom' : guest.side;
    if (side === 'bride') summary.brideGuests += 1;
    if (side === 'groom') summary.groomGuests += 1;
    if (side === 'shared') summary.sharedGuests += 1;
    summary.partner1Guests = summary.brideGuests;
    summary.partner2Guests = summary.groomGuests;
    if (guest.rsvpStatus === 'accepted') {
      summary.accepted += 1;
      summary.expectedAttendees += guest.numberAttending || 1;
    }
    if (guest.rsvpStatus === 'pending') summary.pending += 1;
    if (guest.rsvpStatus === 'declined') summary.declined += 1;
    if (guest.plusOneAllowed) summary.plusOnes += 1;
    if (guest.invitationStatus === 'not_sent') summary.invitationsNotSent += 1;
    if (guest.invitationStatus === 'sent') summary.invitationsSent += 1;
    if (guest.invitationStatus === 'viewed') summary.invitationsViewed += 1;
    return summary;
  }, {
    totalGuests: 0, totalInvited: 0, brideGuests: 0, groomGuests: 0, sharedGuests: 0,
    partner1Guests: 0, partner2Guests: 0, accepted: 0, pending: 0, declined: 0, plusOnes: 0, expectedAttendees: 0,
    invitationsNotSent: 0, invitationsSent: 0, invitationsViewed: 0,
  });
}

async function findAccessibleGuest(id, req, res) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid guest ID');
  }
  const guest = await Guest.findById(id);
  if (!guest) {
    res.status(404);
    throw new Error('Guest not found');
  }
  await assertWeddingAccess(req, res, guest.wedding);
  return guest;
}

export const getGuests = asyncHandler(async (req, res) => {
  requireStaffWeddingScope(req, res);
  const wedding = await loadAccessibleWedding(req, res, { required: false });
  if (!wedding) return res.json({ success: true, count: 0, wedding: null, summary: null, guests: [] });
  const filter = { wedding: wedding._id };
  if (req.query.search) {
    const q = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: q }, { lastName: q }, { email: q }, { phone: q }, { group: q }];
  }
  if (req.query.side && req.query.side !== 'all') filter.side = req.query.side === 'partner1' ? 'bride' : req.query.side === 'partner2' ? 'groom' : req.query.side;
  if (req.query.rsvp && req.query.rsvp !== 'all') filter.rsvpStatus = req.query.rsvp;
  const guests = await Guest.find(filter).sort({ createdAt: -1 });
  return res.json({
    success: true,
    count: guests.length,
    wedding: { _id: wedding._id, expectedGuests: wedding.expectedGuests },
    summary: summarizeGuests(await Guest.find({ wedding: wedding._id })),
    guests,
  });
});

export const createGuest = asyncHandler(async (req, res) => {
  if (!isCoupleRole(req.user.role) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the couple or an admin can add guests');
  }
  validateRequestBody(req.body, res);
  const body = splitFullName(req.body);
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  const guestData = { wedding: wedding._id, customer: wedding.customer };
  for (const field of customerFields) {
    if (body[field] !== undefined) guestData[field] = body[field];
  }
  const guest = await Guest.create(guestData);
  await syncWeddingTimelineSafe(wedding._id);
  res.status(201).json({ success: true, guest });
});

export const getGuest = asyncHandler(async (req, res) => {
  const guest = await findAccessibleGuest(req.params.id, req, res);
  res.json({ success: true, guest });
});

export const updateGuest = asyncHandler(async (req, res) => {
  validateRequestBody(req.body, res);
  const guest = await findAccessibleGuest(req.params.id, req, res);
  const fields = req.user.role === 'planner' ? plannerFields : customerFields;
  const body = splitFullName(req.body);
  for (const field of fields) {
    if (body[field] !== undefined) guest[field] = body[field];
  }
  await guest.save();
  res.json({ success: true, guest });
});

export const deleteGuest = asyncHandler(async (req, res) => {
  if (req.user.role === 'planner') {
    res.status(403);
    throw new Error('Planners cannot delete guests');
  }
  const guest = await findAccessibleGuest(req.params.id, req, res);
  const weddingId = guest.wedding;
  await guest.deleteOne();
  await syncWeddingTimelineSafe(weddingId);
  res.json({ success: true, message: 'Guest deleted successfully.' });
});
