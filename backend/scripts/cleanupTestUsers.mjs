/**
 * Remove development/test/demo users and their related data only.
 * Preserves real manually registered accounts (gmail.com, explicit allowlist).
 *
 * Run dry run:  node scripts/cleanupTestUsers.mjs --dry-run
 * Run live:     node scripts/cleanupTestUsers.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import CustomerProfile from '../src/models/CustomerProfile.js';
import PlannerProfile from '../src/models/PlannerProfile.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Wedding from '../src/models/Wedding.js';
import WeddingMember from '../src/models/WeddingMember.js';
import WeddingJoinRequest from '../src/models/WeddingJoinRequest.js';
import WeddingCartItem from '../src/models/WeddingCartItem.js';
import WeddingSelection from '../src/models/WeddingSelection.js';
import Guest from '../src/models/Guest.js';
import Invitation from '../src/models/Invitation.js';
import Task from '../src/models/Task.js';
import TimelineEvent from '../src/models/TimelineEvent.js';
import BudgetItem from '../src/models/BudgetItem.js';
import Booking from '../src/models/Booking.js';
import BookingInvoice from '../src/models/BookingInvoice.js';
import BookingHistory from '../src/models/BookingHistory.js';
import Payment from '../src/models/Payment.js';
import Order from '../src/models/Order.js';
import Notification from '../src/models/Notification.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import Appointment from '../src/models/Appointment.js';

dotenv.config({ override: true });

const REQUIRED_DB = 'wedding_planning';
const dryRun = process.argv.includes('--dry-run');

/** Never delete these usernames (real accounts). */
const PRESERVE_USERNAMES = new Set([
  'shuriye',
  'naima',
  'abdi1',
  'vender',
  'ismail',
  'ismaill',
  'maria1',
]);

const TEST_USERNAME_PREFIXES = [
  'groom_hall_',
  'couple_groom_',
  'couple_bride_',
  'notif_groom_',
  'real_book_',
  'test_',
  'demo_',
  'hall_img_',
  'mkt_',
  'img_persist_',
];

const TEST_NAME_MARKERS = [
  'test groom',
  'test bride',
  'test vendor',
  'test couple',
  'notiftest',
  'notify test',
  'groom notiftest',
  'ahmed couple',
  'amina couple',
];

function getDatabaseName(uri) {
  const segments = (uri || '').split('?')[0].split('/');
  return segments[segments.length - 1] || null;
}

function isTestEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!e) return false;
  if (e.endsWith('@example.com') || e.endsWith('@couple.test')) return true;
  if (e.endsWith('@seed.test') || e.endsWith('@test.local')) return true;
  const local = e.split('@')[0];
  return TEST_USERNAME_PREFIXES.some((prefix) => local.startsWith(prefix));
}

function isTestUsername(username) {
  const u = String(username || '').toLowerCase().trim();
  if (!u) return false;
  return TEST_USERNAME_PREFIXES.some((prefix) => u.startsWith(prefix));
}

function isTestDisplayName(firstName, lastName) {
  const name = `${firstName || ''} ${lastName || ''}`.trim().toLowerCase();
  return TEST_NAME_MARKERS.some((marker) => name.includes(marker));
}

function classifyUser(user) {
  const username = String(user.username || '').toLowerCase();
  if (PRESERVE_USERNAMES.has(username)) {
    return 'preserve';
  }
  if (user.role === 'admin' && username === 'shuriye') {
    return 'preserve';
  }
  if (isTestUsername(username)) return 'test';
  if (isTestEmail(user.email)) return 'test';
  if (isTestDisplayName(user.firstName, user.lastName)) return 'test';
  // Real email domains → preserve unless username/email already flagged
  if (user.email && /@(gmail|yahoo|hotmail|outlook)\./i.test(user.email)) {
    return 'preserve';
  }
  return 'uncertain';
}

function weddingTouchesTestUser(wedding, testUserIdSet) {
  const ids = [
    wedding.customer,
    wedding.groom,
    wedding.bride,
    wedding.planner,
  ].filter(Boolean).map(String);
  return ids.some((id) => testUserIdSet.has(id));
}

function weddingTouchesPreservedUser(wedding, preserveUserIdSet) {
  const ids = [
    wedding.customer,
    wedding.groom,
    wedding.bride,
  ].filter(Boolean).map(String);
  return ids.some((id) => preserveUserIdSet.has(id));
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (getDatabaseName(uri) !== REQUIRED_DB) {
    throw new Error(`Refusing: database must be ${REQUIRED_DB}`);
  }

  await mongoose.connect(uri);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE DELETE'}\n`);

  const allUsers = await User.find().lean();
  const testUsers = [];
  const preservedUsers = [];
  const uncertainUsers = [];

  for (const user of allUsers) {
    const category = classifyUser(user);
    if (category === 'test') testUsers.push(user);
    else if (category === 'preserve') preservedUsers.push(user);
    else uncertainUsers.push(user);
  }

  console.log('=== A. CONFIRMED TEST/DEMO (delete) ===');
  testUsers.forEach((u) => {
    console.log(`  - ${u.firstName} ${u.lastName} | ${u.username} | ${u.email || '(no email)'} | ${u.role}`);
  });
  console.log(`  Total: ${testUsers.length}\n`);

  console.log('=== B. REAL / PRESERVED ===');
  preservedUsers.forEach((u) => {
    console.log(`  + ${u.firstName} ${u.lastName} | ${u.username} | ${u.email || '(no email)'} | ${u.role}`);
  });
  console.log(`  Total: ${preservedUsers.length}\n`);

  if (uncertainUsers.length) {
    console.log('=== UNCERTAIN (preserved — not auto-deleted) ===');
    uncertainUsers.forEach((u) => {
      console.log(`  ? ${u.firstName} ${u.lastName} | ${u.username} | ${u.email || '(no email)'} | ${u.role}`);
    });
    console.log(`  Total: ${uncertainUsers.length}\n`);
  }

  const testUserIds = testUsers.map((u) => u._id);
  const testUserIdSet = new Set(testUserIds.map(String));
  const preserveUserIdSet = new Set(
    [...preservedUsers, ...uncertainUsers].map((u) => String(u._id)),
  );

  const allWeddings = await Wedding.find().lean();
  const existingUserIdSet = new Set(allUsers.map((u) => String(u._id)));

  const weddingsToDelete = allWeddings.filter((w) => {
    if (weddingTouchesTestUser(w, testUserIdSet)) {
      if (weddingTouchesPreservedUser(w, preserveUserIdSet)) {
        console.warn(
          `SKIP wedding "${w.weddingName}" — touches both test and preserved users; manual review needed`,
        );
        return false;
      }
      return true;
    }
    return false;
  });

  const danglingWeddings = allWeddings.filter((w) => {
    if (weddingsToDelete.some((x) => String(x._id) === String(w._id))) return false;
    if (weddingTouchesPreservedUser(w, preserveUserIdSet)) return false;
    const refs = [w.customer, w.groom, w.bride].filter(Boolean).map(String);
    if (!refs.length) return true;
    return refs.some((id) => !existingUserIdSet.has(id));
  });

  const weddingIdsToDelete = [
    ...weddingsToDelete.map((w) => w._id),
    ...danglingWeddings.map((w) => w._id),
  ];

  console.log(`Weddings to delete: ${weddingIdsToDelete.length}`);
  weddingsToDelete.forEach((w) => console.log(`  - ${w.weddingName}`));
  danglingWeddings.forEach((w) => console.log(`  - [orphan/dangling] ${w.weddingName}`));

  if (dryRun) {
    console.log('\nDry run complete. No records deleted.');
    await mongoose.disconnect();
    return;
  }

  const weddingIdFilter = { wedding: { $in: weddingIdsToDelete } };
  const testUserFilter = { $in: testUserIds };

  const deleted = {};

  deleted.guests = (await Guest.deleteMany(weddingIdFilter)).deletedCount;
  deleted.invitations = (await Invitation.deleteMany(weddingIdFilter)).deletedCount;
  deleted.tasks = (await Task.deleteMany(weddingIdFilter)).deletedCount;
  deleted.timeline = (await TimelineEvent.deleteMany(weddingIdFilter)).deletedCount;
  deleted.budgetItems = (await BudgetItem.deleteMany(weddingIdFilter)).deletedCount;
  deleted.cartItems = (await WeddingCartItem.deleteMany(weddingIdFilter)).deletedCount;
  deleted.selections = (await WeddingSelection.deleteMany({
    $or: [weddingIdFilter, { customer: testUserFilter }],
  })).deletedCount;
  deleted.joinRequests = (await WeddingJoinRequest.deleteMany(weddingIdFilter)).deletedCount;
  deleted.weddingMembers = (await WeddingMember.deleteMany({
    $or: [weddingIdFilter, { user: testUserFilter }],
  })).deletedCount;

  const testBookings = await Booking.find({
    $or: [
      { customer: testUserFilter },
      { wedding: { $in: weddingIdsToDelete } },
    ],
  }).select('_id invoice').lean();
  const testBookingIds = testBookings.map((b) => b._id);
  const testInvoiceIds = testBookings.map((b) => b.invoice).filter(Boolean);

  deleted.bookingHistory = (await BookingHistory.deleteMany({
    booking: { $in: testBookingIds },
  })).deletedCount;
  deleted.payments = (await Payment.deleteMany({
    $or: [
      { customer: testUserFilter },
      { booking: { $in: testBookingIds } },
    ],
  })).deletedCount;
  deleted.invoices = (await BookingInvoice.deleteMany({
    $or: [
      { _id: { $in: testInvoiceIds } },
      { booking: { $in: testBookingIds } },
      { customer: testUserFilter },
    ],
  })).deletedCount;
  deleted.bookings = (await Booking.deleteMany({
    $or: [
      { _id: { $in: testBookingIds } },
      { customer: testUserFilter },
    ],
  })).deletedCount;
  deleted.orders = (await Order.deleteMany({ customer: testUserFilter })).deletedCount;
  deleted.appointments = (await Appointment.deleteMany({
    $or: [{ customer: testUserFilter }, weddingIdFilter],
  })).deletedCount;

  const conversations = await Conversation.find({
    $or: [{ participants: testUserFilter }, weddingIdFilter],
  }).select('_id').lean();
  const conversationIds = conversations.map((c) => c._id);
  deleted.messages = (await Message.deleteMany({ conversation: { $in: conversationIds } })).deletedCount;
  deleted.conversations = (await Conversation.deleteMany({ _id: { $in: conversationIds } })).deletedCount;

  deleted.notifications = (await Notification.deleteMany({
    $or: [
      { user: testUserFilter },
      { sentBy: testUserFilter },
      weddingIdFilter,
    ],
  })).deletedCount;

  deleted.weddings = (await Wedding.deleteMany({ _id: { $in: weddingIdsToDelete } })).deletedCount;

  deleted.customerProfiles = (await CustomerProfile.deleteMany({ user: testUserFilter })).deletedCount;
  deleted.plannerProfiles = (await PlannerProfile.deleteMany({ user: testUserFilter })).deletedCount;
  // Never delete vendor profiles for test users that aren't vendors; test users are groom/bride

  deleted.users = (await User.deleteMany({ _id: testUserFilter })).deletedCount;

  console.log('\n=== Deletion summary ===');
  Object.entries(deleted).forEach(([key, count]) => console.log(`  ${key}: ${count}`));

  const remaining = await User.find().select('firstName lastName username email role accountStatus').sort({ username: 1 }).lean();
  console.log('\n=== Remaining users ===');
  remaining.forEach((u) => {
    console.log(`  ${u.firstName} ${u.lastName} | ${u.username} | ${u.role} | ${u.accountStatus || 'active'}`);
  });
  console.log(`\nFinal user count: ${remaining.length}`);
  console.log(`Active: ${remaining.filter((u) => u.accountStatus === 'active' || u.isActive).length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
