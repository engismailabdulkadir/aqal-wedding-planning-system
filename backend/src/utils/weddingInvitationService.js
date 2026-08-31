import Wedding from '../models/Wedding.js';
import WeddingInvite from '../models/WeddingInvite.js';
import WeddingJoinRequest from '../models/WeddingJoinRequest.js';
import WeddingMember from '../models/WeddingMember.js';
import { normalizeInviteCode } from './inviteCode.js';
import { coupleRoleLabel, normalizeUserRole } from './roles.js';

export async function roleSlotTaken(weddingId, memberRole, { excludeMemberId, excludeJoinRequestId } = {}) {
  const memberQuery = {
    wedding: weddingId,
    memberRole,
    status: 'accepted',
  };
  if (excludeMemberId) memberQuery._id = { $ne: excludeMemberId };
  if (await WeddingMember.exists(memberQuery)) return true;

  const joinQuery = {
    wedding: weddingId,
    requestedRole: memberRole,
    status: 'pending',
  };
  if (excludeJoinRequestId) joinQuery._id = { $ne: excludeJoinRequestId };
  return Boolean(await WeddingJoinRequest.exists(joinQuery));
}

/**
 * Authoritative invitation validation. Wedding ID is ALWAYS derived from the invite record.
 * @param {string} code - invite code entered by user
 * @param {object|null} user - authenticated user (required for join validation)
 * @param {object} res - express response for status codes
 * @param {{ rejectClientWeddingId?: string }} options
 */
export async function validateWeddingInvitation(code, user, res, options = {}) {
  const inviteCode = normalizeInviteCode(code);
  if (!inviteCode) {
    res.status(400);
    throw new Error('Invite code is required');
  }

  const invite = await WeddingInvite.findOne({ code: inviteCode });
  if (!invite) {
    res.status(404);
    throw new Error('Invalid invitation code');
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

  const wedding = await Wedding.findById(invite.wedding);
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }

  if (options.rejectClientWeddingId) {
    const clientWeddingId = String(options.rejectClientWeddingId);
    if (clientWeddingId !== String(invite.wedding)) {
      res.status(400);
      throw new Error('Invite code does not belong to the specified wedding');
    }
  }

  if (user) {
    const userRole = normalizeUserRole(user.role);
    if (userRole !== invite.intendedRole) {
      res.status(403);
      throw new Error(`This invitation is for the ${coupleRoleLabel(invite.intendedRole)}.`);
    }

    if (invite.invitedEmail && user.email) {
      const userEmail = String(user.email).trim().toLowerCase();
      if (userEmail !== invite.invitedEmail) {
        res.status(403);
        throw new Error(`This invitation was sent to ${invite.invitedEmail}.`);
      }
    }

    if (wedding.customer.equals(user._id)) {
      res.status(400);
      throw new Error('You already created this wedding');
    }

    const acceptedMember = await WeddingMember.findOne({
      wedding: wedding._id,
      user: user._id,
      status: 'accepted',
    });
    if (acceptedMember) {
      res.status(409);
      throw new Error('You are already a member of this wedding');
    }

    if (await roleSlotTaken(wedding._id, invite.intendedRole)) {
      res.status(409);
      throw new Error(`This wedding already has a ${coupleRoleLabel(invite.intendedRole)}.`);
    }
  }

  return { invite, wedding };
}

export function formatInvitationWedding(wedding) {
  return {
    _id: wedding._id,
    weddingName: wedding.weddingName,
    partner1Name: wedding.partner1Name,
    partner2Name: wedding.partner2Name,
    weddingDate: wedding.weddingDate,
    city: wedding.city,
  };
}

export function formatInvitationResponse(invite, wedding) {
  return {
    invitation_id: invite._id,
    invite_code: invite.code,
    intendedRole: invite.intendedRole,
    invitedEmail: invite.invitedEmail,
    expiresAt: invite.expiresAt,
    wedding: formatInvitationWedding(wedding),
  };
}

/** Direct invitation acceptance — adds partner to wedding immediately. */
export async function acceptPartnerInvitation(invite, wedding, user) {
  const membership = await WeddingMember.create({
    wedding: wedding._id,
    user: user._id,
    memberRole: invite.intendedRole,
    status: 'accepted',
    invitedBy: invite.invitedBy,
  });

  if (invite.intendedRole === 'groom') {
    wedding.groom = user._id;
  } else {
    wedding.bride = user._id;
  }
  await wedding.save();

  invite.status = 'accepted';
  invite.acceptedBy = user._id;
  invite.acceptedAt = new Date();
  await invite.save();

  return membership;
}
