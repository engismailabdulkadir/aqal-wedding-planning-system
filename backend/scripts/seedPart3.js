import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import PlannerProfile from '../src/models/PlannerProfile.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Wedding from '../src/models/Wedding.js';
import Guest from '../src/models/Guest.js';
import Task from '../src/models/Task.js';
import { ensureDefaultTimeline } from '../src/utils/defaultTimeline.js';

const PASSWORD = 'SeedPass123!';

async function upsertUser(data) {
  const username = data.username || data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '_').slice(0, 24);
  let user = await User.findOne({ email: data.email });
  if (!user) {
    user = await User.create({
      ...data,
      username,
      password: PASSWORD,
      isActive: true,
      isVerified: true,
    });
  } else if (!user.username) {
    user.username = username;
    await user.save();
  }
  return user;
}

await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });
try {
  const admin = await upsertUser({ firstName: 'Amina', lastName: 'Admin', email: 'admin@seed.test', role: 'admin' });
  const customerA = await upsertUser({ firstName: 'Layla', lastName: 'Hassan', email: 'customer.a@seed.test', phone: '0618827482', role: 'customer' });
  const customerB = await upsertUser({ firstName: 'Nur', lastName: 'Omar', email: 'customer.b@seed.test', phone: '0617000001', role: 'customer' });
  const plannerB = await upsertUser({ firstName: 'Hana', lastName: 'Coordinator', email: 'planner.two@seed.test', role: 'planner' });
  const florist = await upsertUser({ firstName: 'Iman', lastName: 'Blooms', email: 'florist.bloom@seed.test', role: 'vendor' });

  if (!await PlannerProfile.exists({ user: plannerB._id })) {
    await PlannerProfile.create({ user: plannerB._id, title: 'Associate Planner', city: 'Mogadishu', experienceYears: 4, isAvailable: true });
  }
  if (!await VendorProfile.exists({ user: florist._id })) {
    await VendorProfile.create({
      user: florist._id,
      businessName: 'Bloom & Branch',
      ownerName: 'Iman Blooms',
      category: 'florist',
      city: 'Mogadishu',
      verificationStatus: 'approved',
      verified: true,
      active: true,
    });
  }

  const plannerA = await User.findOne({ email: 'planner.seed@seed.test' });
  let wedding = await Wedding.findOne({ customer: customerA._id });
  if (!wedding) {
    wedding = await Wedding.create({
      customer: customerA._id,
      weddingName: 'Layla & Yusuf',
      partner1Name: 'Layla',
      partner2Name: 'Yusuf',
      weddingDate: '2031-09-20',
      city: 'Mogadishu',
      estimatedBudget: 12000,
      expectedGuests: 180,
      planner: plannerA?._id || null,
    });
    await ensureDefaultTimeline(wedding, customerA._id);
  }
  if (!await Guest.countDocuments({ wedding: wedding._id })) {
    await Guest.insertMany([
      { wedding: wedding._id, customer: customerA._id, firstName: 'Aisha', lastName: 'Farah', side: 'bride', category: 'family', rsvpStatus: 'accepted', numberAttending: 2 },
      { wedding: wedding._id, customer: customerA._id, firstName: 'Mohamed', lastName: 'Ali', side: 'groom', category: 'friend', rsvpStatus: 'pending' },
      { wedding: wedding._id, customer: customerA._id, firstName: 'Samira', lastName: 'Nur', side: 'shared', category: 'colleague', rsvpStatus: 'declined', numberAttending: 0 },
    ]);
  }
  if (!await Task.countDocuments({ wedding: wedding._id })) {
    await Task.create({ wedding: wedding._id, title: 'Confirm florist delivery', priority: 'high', status: 'todo', createdBy: customerA._id, dueDate: '2031-09-10' });
  }

  console.log('Part 3 seed complete.');
  console.log('Admin: admin@seed.test / SeedPass123!');
  console.log('Customers: customer.a@seed.test, customer.b@seed.test / SeedPass123!');
  console.log('Planners: planner.seed@seed.test, planner.two@seed.test / SeedPass123!');
  console.log(`Admin id: ${admin._id}`);
} finally {
  await mongoose.disconnect();
}
