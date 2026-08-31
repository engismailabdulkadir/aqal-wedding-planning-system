import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Wedding from '../models/Wedding.js';
import WeddingInvite from '../models/WeddingInvite.js';
import WeddingJoinRequest from '../models/WeddingJoinRequest.js';
import WeddingMember from '../models/WeddingMember.js';
import { assertWeddingOwner } from '../utils/ownedWedding.js';
import { generateWeddingInviteCode, normalizeInviteCode } from '../utils/inviteCode.js';
import { canAccessWeddingAsCustomer, isWeddingOwner } from '../utils/weddingMembership.js';
import {
  coupleRoleLabel,
  isCoupleRole,
  oppositeCoupleRole,
} from '../utils/roles.js';
import { isValidEmail } from '../utils/validation.js';
import {
  acceptPartnerInvitation,
  formatInvitationResponse,
  roleSlotTaken,
  validateWeddingInvitation,
} from '../utils/weddingInvitationService.js';

const memberPopulate = [
  { path: 'user', select: 'firstName lastName username email phone role' },
  { path: 'invitedBy', select: 'firstName lastName username' },
];

const joinRequestPopulate = [
  { path: 'requester', select: 'firstName lastName username email phone role' },
  { path: 'invitation', select: 'code intendedRole invitedEmail expiresAt status' },
  { path: 'acceptedBy', select: 'firstName lastName username' },
];

function requireCouple(req, res) {
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Only Groom or Bride accounts can manage wedding membership');
  }
}

function readInviteCodeFromRequest(req) {
  return normalizeInviteCode(
    req.body?.invite_code || req.body?.inviteCode || req.body?.code || req.query?.code || '',
  );
}

function readClientWeddingId(req) {
  return req.body?.wedding_id || req.body?.weddingId || req.headers['x-wedding-id'] || null;
}

export const getMyMembership = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const membership = await WeddingMember.findOne({
    user: req.user._id,
    status: 'accepted',
  })
    .populate(memberPopulate)
    .sort({ updatedAt: -1 });

  const pendingJoinRequest = await WeddingJoinRequest.findOne({
    requester: req.user._id,
    status: 'pending',
  })
    .populate(joinRequestPopulate)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    membership,
    pendingJoinRequest,
  });
});

export const createPartnerInvite = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const weddingId = req.body.weddingId || req.headers['x-wedding-id'];
  if (!weddingId || !mongoose.isValidObjectId(weddingId)) {
    res.status(400);
    throw new Error('Wedding ID is required');
  }

  await assertWeddingOwner(req, res, weddingId);

  const partnerEmail = String(req.body.partnerEmail || req.body.invitedEmail || '').trim().toLowerCase();
  if (partnerEmail && !isValidEmail(partnerEmail)) {
    res.status(400);
    throw new Error('A valid partner email is required');
  }

  const intendedRole = oppositeCoupleRole(req.user.role);
  if (!intendedRole) {
    res.status(400);
    throw new Error('Could not determine partner role');
  }

  if (await roleSlotTaken(weddingId, intendedRole)) {
    res.status(409);
    throw new Error(`This wedding already has a ${coupleRoleLabel(intendedRole)}.`);
  }

  await WeddingInvite.updateMany(
    { wedding: weddingId, intendedRole, status: 'pending' },
    { $set: { status: 'revoked' } },
  );

  let code = generateWeddingInviteCode();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const exists = await WeddingInvite.exists({ code });
    if (!exists) break;
    code = generateWeddingInviteCode();
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const invite = await WeddingInvite.create({
    wedding: weddingId,
    code,
    invitedEmail: partnerEmail,
    intendedRole,
    invitedBy: req.user._id,
    expiresAt,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    invite: {
      _id: invite._id,
      invitation_id: invite._id,
      code: invite.code,
      invite_code: invite.code,
      invitedEmail: invite.invitedEmail,
      intendedRole: invite.intendedRole,
      expiresAt: invite.expiresAt,
      status: invite.status,
    },
    message: `Invite code ${code} created for ${coupleRoleLabel(intendedRole)} (${partnerEmail}).`,
  });
});

export const verifyInviteCode = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const inviteCode = readInviteCodeFromRequest(req);
  const clientWeddingId = readClientWeddingId(req);

  const { invite, wedding } = await validateWeddingInvitation(
    inviteCode,
    req.user,
    res,
    { rejectClientWeddingId: clientWeddingId || undefined },
  );

  res.json({
    success: true,
    valid: true,
    message: 'Wedding found.',
    ...formatInvitationResponse(invite, wedding),
  });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const inviteCode = readInviteCodeFromRequest(req);
  const clientWeddingId = readClientWeddingId(req);

  if (clientWeddingId && !inviteCode) {
    res.status(400);
    throw new Error('Invite code is required. Wedding ID cannot be used to join.');
  }

  const { invite, wedding } = await validateWeddingInvitation(
    inviteCode,
    req.user,
    res,
    { rejectClientWeddingId: clientWeddingId || undefined },
  );

  let membership;
  try {
    membership = await acceptPartnerInvitation(invite, wedding, req.user);
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409);
      throw new Error('You are already a member of this wedding');
    }
    throw error;
  }

  const populated = await WeddingMember.findById(membership._id).populate(memberPopulate);
  const refreshedWedding = await Wedding.findById(wedding._id);

  res.status(200).json({
    success: true,
    membership: populated,
    invitation_id: invite._id,
    wedding: formatInvitationResponse(invite, refreshedWedding).wedding,
    message: 'You have joined the wedding successfully.',
  });
});

/** @deprecated Use acceptInvitation — kept as alias for older clients */
export const requestJoinWedding = acceptInvitation;

export const listJoinRequests = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const weddingId = req.query.weddingId || req.headers['x-wedding-id'];
  if (!weddingId || !mongoose.isValidObjectId(weddingId)) {
    res.status(400);
    throw new Error('Wedding ID is required');
  }
  await assertWeddingOwner(req, res, weddingId);

  const requests = await WeddingJoinRequest.find({
    wedding: weddingId,
    status: 'pending',
    requester: { $ne: req.user._id },
  })
    .populate(joinRequestPopulate)
    .sort({ createdAt: -1 });

  res.json({ success: true, count: requests.length, requests });
});

export const acceptJoinRequest = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid join request ID');
  }

  const joinRequest = await WeddingJoinRequest.findById(req.params.id).populate(joinRequestPopulate);
  if (!joinRequest) {
    res.status(404);
    throw new Error('Join request not found');
  }
  if (joinRequest.status !== 'pending') {
    res.status(409);
    throw new Error('This join request is no longer pending');
  }

  await assertWeddingOwner(req, res, joinRequest.wedding);

  const invite = await WeddingInvite.findById(joinRequest.invitation);
  if (!invite) {
    res.status(404);
    throw new Error('Invitation not found for this join request');
  }

  if (String(invite.wedding) !== String(joinRequest.wedding)) {
    res.status(400);
    throw new Error('Invitation does not belong to this wedding');
  }

  if (invite.status === 'accepted') {
    res.status(409);
    throw new Error('This invitation has already been used.');
  }

  if (invite.status !== 'pending') {
    res.status(409);
    throw new Error('This invitation is no longer active');
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    invite.status = 'expired';
    await invite.save();
    res.status(409);
    throw new Error('This invitation has expired');
  }

  if (invite.intendedRole !== joinRequest.requestedRole) {
    res.status(400);
    throw new Error('Join request role does not match invitation');
  }

  const acceptedMember = await WeddingMember.findOne({
    wedding: joinRequest.wedding,
    user: joinRequest.requester,
    status: 'accepted',
  });
  if (acceptedMember) {
    res.status(409);
    throw new Error('Requester is already a member of this wedding');
  }

  if (await roleSlotTaken(joinRequest.wedding, joinRequest.requestedRole, {
    excludeJoinRequestId: joinRequest._id,
  })) {
    res.status(409);
    throw new Error(`This wedding already has a ${coupleRoleLabel(joinRequest.requestedRole)}.`);
  }

  let membership;
  try {
    membership = await WeddingMember.create({
      wedding: joinRequest.wedding,
      user: joinRequest.requester,
      memberRole: joinRequest.requestedRole,
      status: 'accepted',
      invitedBy: invite.invitedBy,
    });

    joinRequest.status = 'accepted';
    joinRequest.acceptedBy = req.user._id;
    joinRequest.acceptedAt = new Date();
    await joinRequest.save();

    invite.status = 'accepted';
    invite.acceptedBy = joinRequest.requester;
    invite.acceptedAt = new Date();
    await invite.save();
  } catch (error) {
    if (membership?._id) {
      await WeddingMember.deleteOne({ _id: membership._id });
    }
    if (error?.code === 11000) {
      res.status(409);
      throw new Error('Requester is already a member of this wedding');
    }
    throw error;
  }

  const populated = await WeddingMember.findById(membership._id).populate(memberPopulate);
  res.json({
    success: true,
    membership: populated,
    joinRequest,
    message: 'Partner joined the wedding successfully.',
  });
});

export const rejectJoinRequest = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid join request ID');
  }

  const joinRequest = await WeddingJoinRequest.findById(req.params.id).populate(joinRequestPopulate);
  if (!joinRequest) {
    res.status(404);
    throw new Error('Join request not found');
  }
  if (joinRequest.status !== 'pending') {
    res.status(409);
    throw new Error('This join request is no longer pending');
  }

  await assertWeddingOwner(req, res, joinRequest.wedding);

  joinRequest.status = 'rejected';
  await joinRequest.save();

  res.json({
    success: true,
    joinRequest,
    message: 'Join request rejected.',
  });
});

export const listWeddingMembers = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const weddingId = req.params.weddingId;
  if (!mongoose.isValidObjectId(weddingId)) {
    res.status(400);
    throw new Error('Invalid wedding ID');
  }
  if (!await canAccessWeddingAsCustomer(req.user._id, weddingId)) {
    res.status(404);
    throw new Error('Wedding not found');
  }

  const members = await WeddingMember.find({
    wedding: weddingId,
    status: 'accepted',
  })
    .populate(memberPopulate)
    .sort({ createdAt: 1 });

  const wedding = await Wedding.findById(weddingId).select('weddingName customer');
  const isOwner = await isWeddingOwner(req.user._id, weddingId);

  const activeInvite = isOwner
    ? await WeddingInvite.findOne({ wedding: weddingId, status: 'pending' }).sort({ createdAt: -1 })
    : null;

  res.json({
    success: true,
    members,
    inviteCode: activeInvite?.code,
    partnerInvite: activeInvite
      ? {
          _id: activeInvite._id,
          invitation_id: activeInvite._id,
          code: activeInvite.code,
          invite_code: activeInvite.code,
          invitedEmail: activeInvite.invitedEmail,
          intendedRole: activeInvite.intendedRole,
          expiresAt: activeInvite.expiresAt,
        }
      : null,
    weddingName: wedding?.weddingName,
  });
});
