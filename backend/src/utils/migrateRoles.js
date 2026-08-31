import User from '../models/User.js';
import WeddingMember from '../models/WeddingMember.js';
import { ROLES } from './roles.js';

export async function migrateUserRoles() {
  const plannerResult = await User.updateMany(
    { role: 'planner' },
    { $set: { role: ROLES.WEDDING_PLANNER } },
  );
  if (plannerResult.modifiedCount) {
    console.log(`Migrated ${plannerResult.modifiedCount} planner user(s) to wedding_planner`);
  }

  const customers = await User.find({ role: 'customer' }).select('_id');
  let groomCount = 0;
  let brideCount = 0;

  for (const user of customers) {
    const membership = await WeddingMember.findOne({ user: user._id })
      .sort({ updatedAt: -1 })
      .select('memberRole');
    const newRole = membership?.memberRole === 'bride' ? ROLES.BRIDE : ROLES.GROOM;
    await User.updateOne({ _id: user._id }, { $set: { role: newRole } });
    if (newRole === ROLES.BRIDE) brideCount += 1;
    else groomCount += 1;
  }

  if (groomCount || brideCount) {
    console.log(`Migrated customer roles: ${groomCount} groom, ${brideCount} bride`);
  }
}
