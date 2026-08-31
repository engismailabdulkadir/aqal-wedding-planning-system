import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Venue from '../src/models/Venue.js';
import Hall from '../src/models/Hall.js';
import HallSlot, { DEFAULT_HALL_SLOTS } from '../src/models/HallSlot.js';
import WeddingListing from '../src/models/WeddingListing.js';
import PlannerProfile from '../src/models/PlannerProfile.js';

const PASSWORD = 'SeedPass123!';
const SEED_EMAILS = [
  'venue.bera@seed.test',
  'atelier.noor@seed.test',
  'gentleman.fit@seed.test',
  'celebration.studio@seed.test',
  'planner.seed@seed.test',
];

async function upsertUser({ firstName, lastName, email, role }) {
  const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '_').slice(0, 24);
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password: PASSWORD,
      role,
      isActive: true,
      isVerified: true,
    });
  } else if (!user.username) {
    user.username = username;
    await user.save();
  }
  return user;
}

async function upsertVendor(user, profile) {
  const existing = await VendorProfile.findOne({ user: user._id });
  if (existing) {
    Object.assign(existing, profile, { verificationStatus: 'approved', verified: true, active: true });
    await existing.save();
    return existing;
  }
  return VendorProfile.create({
    user: user._id,
    verificationStatus: 'approved',
    verified: true,
    active: true,
    ...profile,
  });
}

async function upsertListing(vendor, vendorProfile, data) {
  const existing = await WeddingListing.findOne({ vendor: vendor._id, name: data.name });
  if (existing) {
    Object.assign(existing, data, { active: true, available: true, status: 'active' });
    await existing.save();
    return existing;
  }
  return WeddingListing.create({ vendor: vendor._id, vendorProfile: vendorProfile._id, ...data });
}

await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });

try {
  const beraUser = await upsertUser({ firstName: 'Bera', lastName: 'Bandir', email: 'venue.bera@seed.test', role: 'vendor' });
  const noorUser = await upsertUser({ firstName: 'Noor', lastName: 'Atelier', email: 'atelier.noor@seed.test', role: 'vendor' });
  const gentlemanUser = await upsertUser({ firstName: 'Adam', lastName: 'Fit', email: 'gentleman.fit@seed.test', role: 'vendor' });
  const studioUser = await upsertUser({ firstName: 'Lina', lastName: 'Studio', email: 'celebration.studio@seed.test', role: 'vendor' });
  const plannerUser = await upsertUser({ firstName: 'Sara', lastName: 'Planner', email: 'planner.seed@seed.test', role: 'planner' });

  if (!await PlannerProfile.exists({ user: plannerUser._id })) {
    await PlannerProfile.create({ user: plannerUser._id, title: 'Lead Wedding Planner', city: 'Mogadishu', experienceYears: 8, isAvailable: true });
  }

  const beraProfile = await upsertVendor(beraUser, {
    businessName: 'Bera Bandir Hotel',
    ownerName: 'Bera Bandir',
    category: 'venue',
    description: 'A landmark wedding hotel with three independent banquet halls.',
    city: 'Mogadishu',
    district: 'Hodan',
    address: 'Maka Al Mukarama Road',
    location: 'Hodan, Mogadishu',
    phone: '+252 61 7000001',
    email: 'events@berabandir.test',
  });
  const noorProfile = await upsertVendor(noorUser, {
    businessName: 'Atelier Noor',
    ownerName: 'Noor Atelier',
    category: 'wedding dress',
    description: 'Bridal couture, salon, makeup, and bouquets.',
    city: 'Mogadishu',
    phone: '+252 61 7000002',
    email: 'hello@ateliernoor.test',
  });
  const gentlemanProfile = await upsertVendor(gentlemanUser, {
    businessName: 'Gentleman Fit',
    ownerName: 'Adam Fit',
    category: 'groom attire',
    description: 'Groom suiting, shoes, and wedding transport.',
    city: 'Mogadishu',
    phone: '+252 61 7000003',
    email: 'hello@gentlemanfit.test',
  });
  const studioProfile = await upsertVendor(studioUser, {
    businessName: 'Celebration Studio',
    ownerName: 'Lina Studio',
    category: 'other',
    description: 'Flowers, decoration, catering, photography, videography, and cake.',
    city: 'Mogadishu',
    phone: '+252 61 7000004',
    email: 'book@celebrationstudio.test',
  });

  let venue = await Venue.findOne({ name: 'Bera Bandir Hotel', vendor: beraUser._id });
  if (!venue) {
    venue = await Venue.create({
      name: 'Bera Bandir Hotel',
      vendor: beraUser._id,
      vendorProfile: beraProfile._id,
      description: 'Three independent halls. Booking one hall never blocks the others.',
      city: 'Mogadishu',
      district: 'Hodan',
      address: 'Maka Al Mukarama Road',
      location: 'Hodan, Mogadishu',
      phone: '+252 61 7000001',
      email: 'events@berabandir.test',
      images: ['https://images.unsplash.com/photo-1519167758481-83f29da8c2b0?w=1200'],
      status: 'active',
    });
  }

  const hallSpecs = [
    { hallName: 'Hall A', capacity: 400, minimumCapacity: 80, parking: true, maleSection: true, femaleSection: true, kitchen: true, security: true },
    { hallName: 'Hall B', capacity: 280, minimumCapacity: 60, parking: true, maleSection: true, femaleSection: true, stage: true },
    { hallName: 'Hall C', capacity: 180, minimumCapacity: 40, parking: true, airConditioning: true, stage: true },
  ];
  for (const spec of hallSpecs) {
    let hall = await Hall.findOne({ venue: venue._id, hallName: spec.hallName });
    if (!hall) {
      hall = await Hall.create({
        venue: venue._id,
        vendor: beraUser._id,
        description: `${spec.hallName} at Bera Bandir Hotel`,
        facilities: ['Sound system', 'Lighting', 'Bridal suite'],
        status: 'active',
        ...spec,
      });
    }
    const slotCount = await HallSlot.countDocuments({ hall: hall._id });
    if (!slotCount) {
      await HallSlot.insertMany(DEFAULT_HALL_SLOTS.map((slot) => ({ ...slot, hall: hall._id, vendor: beraUser._id })));
    }
  }

  const listings = [
    [noorUser, noorProfile, {
      name: 'Pearl A-Line Wedding Dress',
      category: 'bride_dress',
      listingType: 'product',
      description: 'Ivory A-line gown with pearl beadwork.',
      price: 450,
      city: 'Mogadishu',
      availabilityType: 'rental_period',
      quantity: 1,
      metadata: { size: 'M', style: 'A-line', color: 'ivory', rentalOrPurchase: 'rental', rentalPrice: 450, purchasePrice: 1800 },
    }],
    [noorUser, noorProfile, {
      name: 'Silk Bridal Shoes',
      category: 'bride_shoes',
      listingType: 'product',
      description: 'Ivory silk heels.',
      price: 80,
      city: 'Mogadishu',
      availabilityType: 'inventory',
      quantity: 4,
      metadata: { rentalOrPurchase: 'purchase', purchasePrice: 80 },
    }],
    [noorUser, noorProfile, {
      name: 'Crystal Hair Vine',
      category: 'accessories',
      listingType: 'product',
      description: 'Bridal hair vine and earrings set.',
      price: 60,
      city: 'Mogadishu',
      availabilityType: 'inventory',
      quantity: 6,
    }],
    [noorUser, noorProfile, {
      name: 'Bridal Makeup Session',
      category: 'makeup',
      listingType: 'service',
      description: 'Full bridal makeup with trial optional.',
      price: 120,
      city: 'Mogadishu',
      availabilityType: 'appointment',
      metadata: { durationMinutes: 60, workingHours: { start: '08:00', end: '18:00' }, defaultResource: 'makeup-1' },
    }],
    [noorUser, noorProfile, {
      name: 'Bridal Hair Styling',
      category: 'hair',
      listingType: 'service',
      description: 'Updo or soft waves.',
      price: 90,
      city: 'Mogadishu',
      availabilityType: 'appointment',
      metadata: { durationMinutes: 60, workingHours: { start: '08:00', end: '18:00' }, defaultResource: 'hair-1' },
    }],
    [noorUser, noorProfile, {
      name: 'Bride Package — Salon',
      category: 'bridal_salon',
      listingType: 'service',
      description: 'Hair, makeup, and dressing assistance.',
      price: 220,
      city: 'Mogadishu',
      availabilityType: 'appointment',
      metadata: { durationMinutes: 120, workingHours: { start: '08:00', end: '18:00' }, defaultResource: 'salon-1' },
    }],
    [noorUser, noorProfile, {
      name: 'Classic White Bouquet',
      category: 'bouquet',
      listingType: 'product',
      description: 'White rose and peony bride bouquet.',
      price: 75,
      city: 'Mogadishu',
      availabilityType: 'none',
      metadata: { flowerType: 'rose', package: 'classic' },
    }],
    [gentlemanUser, gentlemanProfile, {
      name: 'Navy Three-Piece Suit',
      category: 'groom_attire',
      listingType: 'product',
      description: 'Slim navy suit with waistcoat.',
      price: 220,
      city: 'Mogadishu',
      availabilityType: 'rental_period',
      quantity: 2,
      metadata: { suitType: 'three-piece', size: 'L', color: 'navy', rentalOrPurchase: 'rental', rentalPrice: 220, purchasePrice: 900 },
    }],
    [gentlemanUser, gentlemanProfile, {
      name: 'Oxford Groom Shoes',
      category: 'groom_shoes',
      listingType: 'product',
      description: 'Black leather oxfords.',
      price: 70,
      city: 'Mogadishu',
      availabilityType: 'inventory',
      quantity: 5,
      metadata: { rentalOrPurchase: 'purchase' },
    }],
    [gentlemanUser, gentlemanProfile, {
      name: 'Groom Salon Grooming',
      category: 'groom_salon',
      listingType: 'service',
      description: 'Haircut, beard, and grooming.',
      price: 55,
      city: 'Mogadishu',
      availabilityType: 'appointment',
      metadata: { durationMinutes: 45, workingHours: { start: '09:00', end: '17:00' } },
    }],
    [gentlemanUser, gentlemanProfile, {
      name: 'Wedding Car — White Sedan',
      category: 'transportation',
      listingType: 'service',
      description: 'Decorated sedan with driver, 6 hours.',
      price: 180,
      city: 'Mogadishu',
      availabilityType: 'rental_period',
      quantity: 1,
      metadata: { vehicleType: 'sedan', hours: 6 },
    }],
    [studioUser, studioProfile, {
      name: 'Garden Stage Flowers',
      category: 'flowers',
      listingType: 'service',
      description: 'Stage, table, and entrance florals.',
      price: 650,
      city: 'Mogadishu',
      availabilityType: 'date',
      metadata: { package: 'garden', flowerType: 'mixed' },
    }],
    [studioUser, studioProfile, {
      name: 'Gold Theme Decoration',
      category: 'decoration',
      listingType: 'service',
      description: 'Stage, tables, entrance, and lighting.',
      price: 1200,
      city: 'Mogadishu',
      availabilityType: 'date',
      metadata: { theme: 'gold', stage: true, lighting: true },
    }],
    [studioUser, studioProfile, {
      name: 'Coastal Buffet Catering',
      category: 'catering',
      listingType: 'service',
      description: 'Buffet menu with drinks, dessert, and service staff.',
      price: 18,
      city: 'Mogadishu',
      availabilityType: 'capacity',
      metadata: { pricePerPerson: 18, minimumGuests: 50, maximumGuests: 500, drinks: true, dessert: true, serviceStaff: true },
    }],
    [studioUser, studioProfile, {
      name: 'Full Day Photography',
      category: 'photography',
      listingType: 'service',
      description: 'Two photographers, album, and editing.',
      price: 900,
      city: 'Mogadishu',
      availabilityType: 'date',
      metadata: { photographers: 2, hours: 10, album: true, drone: true },
    }],
    [studioUser, studioProfile, {
      name: 'Cinematic Videography',
      category: 'videography',
      listingType: 'service',
      description: 'Highlight film and full ceremony edit.',
      price: 1100,
      city: 'Mogadishu',
      availabilityType: 'date',
      metadata: { hours: 10, cameras: 2, drone: true, highlightVideo: true },
    }],
    [studioUser, studioProfile, {
      name: 'Three-Tier Vanilla Cake',
      category: 'cake',
      listingType: 'product',
      description: 'Vanilla sponge, floral finish, 80 servings.',
      price: 160,
      city: 'Mogadishu',
      availabilityType: 'none',
      metadata: { flavor: 'vanilla', layers: 3, servings: 80, customization: true },
    }],
  ];

  for (const [user, profile, data] of listings) {
    await upsertListing(user, profile, data);
  }

  console.log('Seed complete.');
  console.log('Venue vendor: venue.bera@seed.test / SeedPass123!');
  console.log('Planner: planner.seed@seed.test / SeedPass123!');
  console.log(`Bera Bandir Hotel id: ${venue._id}`);
} finally {
  await mongoose.disconnect();
}
