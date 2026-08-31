import mongoose from 'mongoose';
import { env } from './env.js';
import { migrateUsersWithoutUsername } from '../utils/weddingAccess.js';
import { migrateWeddingMembership } from '../utils/weddingMembership.js';
import { migrateUserRoles } from '../utils/migrateRoles.js';
import { tryNormalizePhone } from '../utils/phone.js';

async function migrateUserUniqueIndexes(connection) {
  const users = connection.connection.collection('users');
  const indexes = await users.indexes();

  const legacyEmailIndex = indexes.find((index) => index.name === 'email_1');
  if (legacyEmailIndex) {
    await users.dropIndex('email_1');
    console.log('Removed legacy unique email index that blocked blank emails');
  }

  const phoneNormIndex = indexes.find((index) => index.name === 'phoneNormalized_1_partial_unique' || index.name === 'phoneNormalized_1');
  if (phoneNormIndex) {
    await users.dropIndex(phoneNormIndex.name);
    console.log(`Temporarily dropped ${phoneNormIndex.name} for phoneNormalized backfill`);
  }

  const blankEmailResult = await users.updateMany(
    { $or: [{ email: null }, { email: '' }] },
    { $unset: { email: '' } },
  );
  if (blankEmailResult.modifiedCount) {
    console.log(`Unset blank email on ${blankEmailResult.modifiedCount} user(s)`);
  }

  const phoneDocs = await users.find({ phone: { $type: 'string', $ne: '' } }).project({ phone: 1 }).toArray();
  let phoneUpdates = 0;
  for (const doc of phoneDocs) {
    const normalized = tryNormalizePhone(doc.phone);
    if (normalized) {
      const result = await users.updateOne({ _id: doc._id }, { $set: { phoneNormalized: normalized } });
      phoneUpdates += result.modifiedCount;
    } else {
      await users.updateOne({ _id: doc._id }, { $unset: { phoneNormalized: '' } });
    }
  }
  if (phoneUpdates) {
    console.log(`Backfilled phoneNormalized for ${phoneUpdates} user(s)`);
  }

  // Resolve duplicate phoneNormalized values before creating the unique index
  const phoneGroups = await users.aggregate([
    { $match: { phoneNormalized: { $type: 'string' } } },
    { $group: { _id: '$phoneNormalized', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();
  for (const group of phoneGroups) {
    const keep = group.ids[0];
    await users.updateMany(
      { _id: { $in: group.ids.slice(1) } },
      { $unset: { phoneNormalized: '' } },
    );
    console.log(`Resolved duplicate phoneNormalized ${group._id}; kept user ${keep}`);
  }

  const blankPhoneNorm = await users.updateMany(
    { $or: [{ phoneNormalized: null }, { phoneNormalized: '' }] },
    { $unset: { phoneNormalized: '' } },
  );
  if (blankPhoneNorm.modifiedCount) {
    console.log(`Cleared empty phoneNormalized on ${blankPhoneNorm.modifiedCount} user(s)`);
  }

  await users.createIndex(
    { phoneNormalized: 1 },
    {
      unique: true,
      name: 'phoneNormalized_1_partial_unique',
      partialFilterExpression: { phoneNormalized: { $type: 'string' } },
    },
  );

  const currentIndexes = await users.indexes();
  if (!currentIndexes.some((index) => index.name === 'email_1_partial_unique')) {
    await users.createIndex(
      { email: 1 },
      {
        unique: true,
        name: 'email_1_partial_unique',
        partialFilterExpression: { email: { $type: 'string' } },
      },
    );
  }
}

export async function connectDatabase() {
  const connection = await mongoose.connect(env.mongoUri, {
    dbName: 'wedding_planning',
  });
  console.log(`MongoDB connected successfully: ${connection.connection.host}/${connection.connection.name}`);
  const weddingCollection = connection.connection.collection('weddings');
  const indexes = await weddingCollection.indexes();
  const legacyCustomerIndex = indexes.find((index) => index.unique && Object.keys(index.key).length === 1 && index.key.customer === 1);
  if (legacyCustomerIndex) {
    await weddingCollection.dropIndex(legacyCustomerIndex.name);
    console.log('Removed legacy one-wedding-per-customer database index');
  }
  const budgetCollection = connection.connection.collection('budgetitems');
  const budgetIndexes = await budgetCollection.indexes();
  const legacySelectionIndex = budgetIndexes.find((index) => index.name === 'selection_1' && !index.partialFilterExpression);
  if (legacySelectionIndex) {
    await budgetCollection.dropIndex('selection_1');
    console.log('Removed unique budget selection index that blocked unlinked items');
  }
  const unsetResult = await budgetCollection.updateMany({ selection: null }, { $unset: { selection: '' } });
  if (unsetResult.modifiedCount) {
    console.log(`Cleared ${unsetResult.modifiedCount} unlinked budget items with null selection`);
  }
  await migrateUsersWithoutUsername();
  await migrateUserRoles();
  await migrateWeddingMembership();
  await migrateUserUniqueIndexes(connection);
  await migrateUserAccountStatus(connection);
  return connection;
}

async function migrateUserAccountStatus(connection) {
  const users = connection.connection.collection('users');
  const missing = await users.updateMany(
    { accountStatus: { $exists: false } },
    [
      {
        $set: {
          accountStatus: {
            $cond: [{ $eq: ['$isActive', true] }, 'active', 'blocked'],
          },
        },
      },
    ],
  );
  if (missing.modifiedCount) {
    console.log(`Backfilled accountStatus for ${missing.modifiedCount} user(s)`);
  }
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}
