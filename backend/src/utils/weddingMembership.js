import Wedding from '../models/Wedding.js';
import WeddingMember from '../models/WeddingMember.js';

export async function isAcceptedWeddingMember(userId, weddingId) {
  if (!userId || !weddingId) return false;
  return Boolean(await WeddingMember.exists({
    wedding: weddingId,
    user: userId,
    status: 'accepted',
  }));
}

export async function isWeddingOwner(userId, weddingId) {
  if (!userId || !weddingId) return false;
  return Boolean(await Wedding.exists({ _id: weddingId, customer: userId }));
}

export async function canAccessWeddingAsCustomer(userId, weddingId) {
  if (!userId || !weddingId) return false;
  if (await isWeddingOwner(userId, weddingId)) return true;
  return await isAcceptedWeddingMember(userId, weddingId);
}

export async function findAccessibleWeddingIds(userId) {
  const owned = await Wedding.find({ customer: userId }).select('_id');
  const memberships = await WeddingMember.find({ user: userId, status: 'accepted' }).select('wedding');
  const ids = new Set([
    ...owned.map((w) => String(w._id)),
    ...memberships.map((m) => String(m.wedding)),
  ]);
  return [...ids];
}

export async function findAccessibleWeddings(userId, populate = []) {
  const ids = await findAccessibleWeddingIds(userId);
  if (!ids.length) return [];
  let query = Wedding.find({ _id: { $in: ids } }).sort({ createdAt: -1 });
  if (populate.length) query = query.populate(populate);
  return query;
}

export async function getMembershipForUser(userId, weddingId) {
  return WeddingMember.findOne({ wedding: weddingId, user: userId });
}

export async function migrateWeddingMembership() {
  const weddings = await Wedding.find({}).select('_id customer inviteCode');
  let inviteUpdates = 0;
  let memberUpdates = 0;

  for (const wedding of weddings) {
    if (!wedding.inviteCode) {
      const { generateInviteCode } = await import('./inviteCode.js');
      let inviteCode = generateInviteCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const exists = await Wedding.exists({ inviteCode, _id: { $ne: wedding._id } });
        if (!exists) break;
        inviteCode = generateInviteCode();
      }
      wedding.inviteCode = inviteCode;
      await wedding.save();
      inviteUpdates += 1;
    }

    const existingMember = await WeddingMember.exists({ wedding: wedding._id, user: wedding.customer });
    if (!existingMember) {
      await WeddingMember.create({
        wedding: wedding._id,
        user: wedding.customer,
        memberRole: 'groom',
        status: 'accepted',
        invitedBy: wedding.customer,
      });
      memberUpdates += 1;
    }
  }

  if (inviteUpdates) console.log(`Backfilled invite codes for ${inviteUpdates} wedding(s)`);
  if (memberUpdates) console.log(`Backfilled wedding membership for ${memberUpdates} wedding(s)`);
}
