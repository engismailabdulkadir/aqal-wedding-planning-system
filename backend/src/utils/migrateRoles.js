import User from '../models/User.js';
import WeddingMember from '../models/WeddingMember.js';
import { ROLES } from './roles.js';


// ============================================================
// ROLE MIGRATION
// ============================================================

// Function-kan waxaa loo isticmaalaa haddii system-kii hore
// uu lahaa roles magacyadoodu ka duwan yihiin kuwa hadda.
export async function migrateUserRoles() {

  // ----------------------------------------------------------
  // PLANNER -> WEDDING PLANNER
  // ----------------------------------------------------------

  // User kasta oo role-kiisu yahay planner
  // waxaa loo beddelayaa wedding_planner.
  const plannerResult = await User.updateMany(
    { role: 'planner' },
    {
      $set: {
        role: ROLES.WEDDING_PLANNER,
      },
    }
  );


  // Haddii users la beddelay
  if (plannerResult.modifiedCount) {

    console.log(
      `Migrated ${plannerResult.modifiedCount} planner user(s) to wedding_planner`
    );
  }


  // ----------------------------------------------------------
  // CUSTOMER -> GROOM / BRIDE
  // ----------------------------------------------------------

  // Soo hel users-kii hore ee customer ahaa
  const customers = await User
    .find({ role: 'customer' })
    .select('_id');


  let groomCount = 0;
  let brideCount = 0;


  // User kasta role cusub u samee
  for (const user of customers) {

    // WeddingMember ka raadi user-kan
    const membership = await WeddingMember
      .findOne({
        user: user._id,
      })
      .sort({
        updatedAt: -1,
      })
      .select('memberRole');


    // Haddii memberRole bride yahay -> bride
    // haddii kale -> groom
    const newRole =
      membership?.memberRole === 'bride'
        ? ROLES.BRIDE
        : ROLES.GROOM;


    // Database-ka role-ka ku update garee
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          role: newRole,
        },
      }
    );


    // Tirada Bride/Groom count garee
    if (newRole === ROLES.BRIDE) {
      brideCount += 1;
    } else {
      groomCount += 1;
    }
  }


  // Haddii migration la sameeyay
  if (groomCount || brideCount) {

    console.log(
      `Migrated customer roles: ${groomCount} groom, ${brideCount} bride`
    );
  }
}