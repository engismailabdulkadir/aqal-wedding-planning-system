/**
 * Clears application records from the configured wedding_planning database only.
 * Does NOT drop the database, collections, or schema.
 * Preserves the Shuriye admin account (or recreates it if missing).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ override: true });

const REQUIRED_DB_NAME = 'wedding_planning';
const ADMIN_USERNAME = 'shuriye';
const ADMIN_DEFAULTS = {
  firstName: 'Shuriye',
  lastName: 'Admin',
  role: 'admin',
};

const CLEAR_ORDER = [
  'messages',
  'notifications',
  'payments',
  'bookinginvoices',
  'bookinghistories',
  'bookings',
  'orders',
  'weddingcartitems',
  'weddingselections',
  'appointments',
  'rentalbookings',
  'hallslotlocks',
  'hallbookings',
  'hallquotes',
  'hallslots',
  'halls',
  'venues',
  'weddingjoinrequests',
  'weddinginvites',
  'weddingmembers',
  'guests',
  'budgetitems',
  'tasks',
  'timelineevents',
  'invitations',
  'announcements',
  'weddinglistings',
  'vendorprofiles',
  'plannerprofiles',
  'customerprofiles',
  'conversations',
  'weddings',
];

function getDatabaseName(uri) {
  const withoutQuery = uri.split('?')[0];
  const segments = withoutQuery.split('/');
  const name = segments[segments.length - 1];
  return name || null;
}

function assertSafeTarget(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is not set.');
  }

  const dbName = getDatabaseName(uri);
  if (dbName !== REQUIRED_DB_NAME) {
    throw new Error(
      `Refusing to run: MONGO_URI must target "${REQUIRED_DB_NAME}" but resolved to "${dbName ?? '(none)'}".`,
    );
  }
}

async function ensureShuriyeAdmin(db) {
  const users = db.collection('users');
  const existing = await users.findOne({ username: ADMIN_USERNAME });

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          firstName: ADMIN_DEFAULTS.firstName,
          lastName: ADMIN_DEFAULTS.lastName,
          role: ADMIN_DEFAULTS.role,
          isActive: true,
        },
      },
    );
    return { action: 'preserved', id: existing._id };
  }

  const password = process.env.INITIAL_ADMIN_PASSWORD || 'Admin123!';
  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await users.insertOne({
    firstName: ADMIN_DEFAULTS.firstName,
    lastName: ADMIN_DEFAULTS.lastName,
    username: ADMIN_USERNAME,
    email: process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() || null,
    phone: '',
    password: hashedPassword,
    role: ADMIN_DEFAULTS.role,
    avatar: null,
    isActive: true,
    isVerified: false,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { action: 'created', id: result.insertedId, passwordUsed: !process.env.INITIAL_ADMIN_PASSWORD };
}

async function main() {
  const uri = process.env.MONGO_URI;
  assertSafeTarget(uri);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  if (db.databaseName !== REQUIRED_DB_NAME) {
    throw new Error(
      `Refusing to run: connected database is "${db.databaseName}", expected "${REQUIRED_DB_NAME}".`,
    );
  }

  console.log(`Target database: ${db.databaseName}`);
  console.log('Clearing application records (collections are kept)...');

  const summary = {};

  for (const collectionName of CLEAR_ORDER) {
    const exists = (await db.listCollections({ name: collectionName }).toArray()).length > 0;
    if (!exists) {
      summary[collectionName] = { deleted: 0, skipped: true };
      continue;
    }

    const result = await db.collection(collectionName).deleteMany({});
    summary[collectionName] = { deleted: result.deletedCount };
  }

  const userDeleteResult = await db.collection('users').deleteMany({
    username: { $ne: ADMIN_USERNAME },
  });
  summary.users = { deleted: userDeleteResult.deletedCount, kept: ADMIN_USERNAME };

  const adminResult = await ensureShuriyeAdmin(db);

  const roleCounts = await db
    .collection('users')
    .aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
    .toArray();

  console.log('\nDeletion summary:');
  for (const [name, info] of Object.entries(summary)) {
    if (info.skipped) {
      console.log(`  ${name}: (collection absent)`);
    } else if (info.kept) {
      console.log(`  ${name}: deleted ${info.deleted}, kept @${info.kept}`);
    } else {
      console.log(`  ${name}: deleted ${info.deleted}`);
    }
  }

  console.log(`\nAdmin account: ${adminResult.action} (${ADMIN_USERNAME})`);
  if (adminResult.passwordUsed) {
    console.log('  Created with default password Admin123! — change it after login.');
  }

  console.log('\nRemaining users by role:');
  for (const row of roleCounts) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  const verifyCounts = {
    weddings: await db.collection('weddings').countDocuments(),
    weddinglistings: await db.collection('weddinglistings').countDocuments(),
    bookings: await db.collection('bookings').countDocuments(),
    payments: await db.collection('payments').countDocuments(),
    guests: await db.collection('guests').countDocuments(),
    notifications: await db.collection('notifications').countDocuments(),
    users: await db.collection('users').countDocuments(),
    groom: await db.collection('users').countDocuments({ role: 'groom' }),
    bride: await db.collection('users').countDocuments({ role: 'bride' }),
    wedding_planner: await db.collection('users').countDocuments({ role: 'wedding_planner' }),
    vendor: await db.collection('users').countDocuments({ role: 'vendor' }),
    admin: await db.collection('users').countDocuments({ role: 'admin' }),
  };

  console.log('\nFinal counts:');
  console.log(JSON.stringify(verifyCounts, null, 2));
}

try {
  await main();
} catch (error) {
  console.error('Reset aborted:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
