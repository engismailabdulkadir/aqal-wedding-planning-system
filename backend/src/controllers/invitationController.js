import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Guest from '../models/Guest.js';
import Hall from '../models/Hall.js';
import Invitation from '../models/Invitation.js';
import Venue from '../models/Venue.js';
import { loadAccessibleWedding } from '../utils/weddingAccess.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';

const invitationSelect = '+token';

async function invitationSnapshot(wedding) {
  const [venue, hall] = await Promise.all([
    wedding.selectedVenue ? Venue.findById(wedding.selectedVenue).select('name city address location') : null,
    wedding.selectedHall ? Hall.findById(wedding.selectedHall).select('hallName') : null,
  ]);
  return {
    brideName: wedding.partner1Name,
    groomName: wedding.partner2Name,
    weddingDate: wedding.weddingDate,
    time: wedding.ceremonyTime || '',
    venue: venue?.name || wedding.venue || '',
    hall: hall?.hallName || '',
    location: venue?.address || venue?.location || wedding.city || '',
    message: wedding.invitationMessage || 'Please join us as we celebrate our wedding.',
    design: wedding.invitationDesign || 'classic',
  };
}

export const listInvitations = asyncHandler(async (req, res) => {
  const wedding = await loadAccessibleWedding(req, res);
  const [invitations, guests, template] = await Promise.all([
    Invitation.find({ wedding: wedding._id }).select(invitationSelect).populate('guest').sort({ createdAt: -1 }),
    Guest.find({ wedding: wedding._id }).sort({ firstName: 1 }),
    invitationSnapshot(wedding),
  ]);
  res.json({
    success: true,
    invitations,
    guests,
    template,
    summary: {
      total: invitations.length,
      draft: invitations.filter((i) => i.status === 'draft').length,
      sent: invitations.filter((i) => ['sent', 'opened', 'responded'].includes(i.status)).length,
      responded: invitations.filter((i) => i.status === 'responded').length,
      accepted: guests.filter((g) => g.rsvpStatus === 'accepted').length,
      pending: guests.filter((g) => g.rsvpStatus === 'pending').length,
      declined: guests.filter((g) => g.rsvpStatus === 'declined').length,
    },
  });
});

export const previewInvitation = asyncHandler(async (req, res) => {
  const wedding = await loadAccessibleWedding(req, res);
  res.json({ success: true, preview: await invitationSnapshot(wedding) });
});

export const updateInvitationTemplate = asyncHandler(async (req, res) => {
  if (!['customer', 'admin'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Only the couple can edit the invitation design');
  }
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  if (req.body.ceremonyTime !== undefined) wedding.ceremonyTime = req.body.ceremonyTime;
  if (req.body.invitationMessage !== undefined) wedding.invitationMessage = req.body.invitationMessage;
  if (req.body.invitationDesign !== undefined) wedding.invitationDesign = req.body.invitationDesign;
  await wedding.save();
  res.json({ success: true, preview: await invitationSnapshot(wedding) });
});

export const createInvitation = asyncHandler(async (req, res) => {
  if (req.user.role === 'planner') {
    res.status(403);
    throw new Error('Planners cannot create invitations');
  }
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  if (!mongoose.isValidObjectId(req.body.guest)) {
    res.status(400);
    throw new Error('Invalid guest');
  }
  const guest = await Guest.findOne({ _id: req.body.guest, wedding: wedding._id });
  if (!guest) {
    res.status(404);
    throw new Error('Guest not found');
  }
  if (await Invitation.exists({ guest: guest._id })) {
    res.status(409);
    throw new Error('This guest already has an invitation');
  }
  const snapshot = await invitationSnapshot(wedding);
  const invitation = await Invitation.create({
    wedding: wedding._id,
    guest: guest._id,
    token: crypto.randomBytes(32).toString('hex'),
    message: req.body.message || snapshot.message,
    design: req.body.design || snapshot.design,
    ...snapshot,
    message: req.body.message || snapshot.message,
  });
  const result = await Invitation.findById(invitation._id).select(invitationSelect).populate('guest');
  res.status(201).json({ success: true, invitation: result });
});

export const getInvitation = asyncHandler(async (req, res) => {
  const wedding = await loadAccessibleWedding(req, res);
  const invitation = mongoose.isValidObjectId(req.params.id)
    ? await Invitation.findOne({ _id: req.params.id, wedding: wedding._id }).select(invitationSelect).populate('guest')
    : null;
  if (!invitation) {
    res.status(404);
    throw new Error('Invitation not found');
  }
  res.json({ success: true, invitation });
});

export const updateInvitation = asyncHandler(async (req, res) => {
  const wedding = await loadAccessibleWedding(req, res, { write: req.user.role !== 'planner' });
  const invitation = mongoose.isValidObjectId(req.params.id)
    ? await Invitation.findOne({ _id: req.params.id, wedding: wedding._id }).select(invitationSelect)
    : null;
  if (!invitation) {
    res.status(404);
    throw new Error('Invitation not found');
  }
  if (req.body.message !== undefined) invitation.message = req.body.message;
  if (req.body.design !== undefined) invitation.design = req.body.design;
  if (req.body.status === 'sent' && invitation.status === 'draft') {
    invitation.status = 'sent';
    invitation.sentAt = new Date();
    await Guest.updateOne({ _id: invitation.guest }, { invitationStatus: 'sent' });
  }
  await invitation.save();
  await syncWeddingTimelineSafe(invitation.wedding);
  res.json({ success: true, invitation });
});

export const deleteInvitation = asyncHandler(async (req, res) => {
  if (req.user.role === 'planner') {
    res.status(403);
    throw new Error('Planners cannot delete invitations');
  }
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  const invitation = mongoose.isValidObjectId(req.params.id)
    ? await Invitation.findOne({ _id: req.params.id, wedding: wedding._id })
    : null;
  if (!invitation) {
    res.status(404);
    throw new Error('Invitation not found');
  }
  if (invitation.status === 'responded') {
    res.status(409);
    throw new Error('A responded invitation cannot be deleted');
  }
  await invitation.deleteOne();
  await Guest.updateOne({ _id: invitation.guest }, { invitationStatus: 'not_sent' });
  await syncWeddingTimelineSafe(wedding._id);
  res.json({ success: true });
});

export const publicInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({ token: req.params.token }).select('+token').populate('guest').populate('wedding', 'weddingName partner1Name partner2Name weddingDate venue city ceremonyTime invitationDesign selectedVenue selectedHall');
  if (!invitation) {
    res.status(404);
    throw new Error('Invitation not found or expired');
  }
  if (invitation.status === 'sent') {
    invitation.status = 'opened';
    await invitation.save();
    await Guest.updateOne(
      { _id: invitation.guest, invitationStatus: { $in: ['sent', 'not_sent'] } },
      { invitationStatus: 'viewed' },
    );
    await syncWeddingTimelineSafe(invitation.wedding);
  }
  res.json({
    success: true,
    invitation: {
      status: invitation.status,
      message: invitation.message,
      design: invitation.design,
      brideName: invitation.brideName || invitation.wedding?.partner1Name,
      groomName: invitation.groomName || invitation.wedding?.partner2Name,
      weddingDate: invitation.weddingDate || invitation.wedding?.weddingDate,
      time: invitation.time || invitation.wedding?.ceremonyTime,
      venue: invitation.venue || invitation.wedding?.venue,
      hall: invitation.hall,
      location: invitation.location || invitation.wedding?.city,
      guest: invitation.guest,
      wedding: invitation.wedding,
    },
  });
});

export const submitRsvp = asyncHandler(async (req, res) => {
  if (!['accepted', 'declined'].includes(req.body.response)) {
    res.status(400);
    throw new Error('Response must be accepted or declined');
  }
  const invitation = await Invitation.findOne({ token: req.params.token }).select('+token');
  if (!invitation) {
    res.status(404);
    throw new Error('Invitation not found or expired');
  }
  const guest = await Guest.findOne({ _id: invitation.guest, wedding: invitation.wedding });
  if (!guest) {
    res.status(404);
    throw new Error('Guest not found');
  }
  guest.rsvpStatus = req.body.response;
  guest.plusOneName = guest.plusOneAllowed && req.body.response === 'accepted' ? String(req.body.plusOneName || '').trim() : '';
  guest.numberAttending = req.body.response === 'declined' ? 0 : Number(req.body.numberAttending || (guest.plusOneName ? 2 : 1));
  await guest.save();
  invitation.status = 'responded';
  invitation.respondedAt = new Date();
  await invitation.save();
  await syncWeddingTimelineSafe(invitation.wedding);
  res.json({ success: true, rsvpStatus: guest.rsvpStatus, numberAttending: guest.numberAttending });
});
