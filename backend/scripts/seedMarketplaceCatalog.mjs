/**
 * Seed marketplace catalog: 4 halls + groom/bride packages + cakes.
 * Run: node scripts/seedMarketplaceCatalog.mjs
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import WeddingListing from '../src/models/WeddingListing.js';

const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding_planning';
const PASSWORD = 'SeedPass123!';

const GROOM_PACKAGES = [
  { name: 'Classic Black Groom Package', price: 250, color: 'Black', image: '/assets/groom/classic-black.jpg', includes: ['Black Suit', 'White Shirt', 'Black Shoes', 'Belt', 'Watch', 'Tie'] },
  { name: 'Navy Blue Groom Package', price: 280, color: 'Navy Blue', image: '/assets/groom/navy-blue.jpg', includes: ['Navy Suit', 'White Shirt', 'Brown/Black Shoes', 'Belt', 'Watch', 'Tie'] },
  { name: 'Modern Grey Groom Package', price: 300, color: 'Grey', image: '/assets/groom/modern-grey.jpg', includes: ['Grey Suit', 'White Shirt', 'Shoes', 'Belt', 'Watch', 'Tie'] },
  { name: 'Cream Luxury Groom Package', price: 350, color: 'Cream', image: '/assets/groom/cream-luxury.jpg', includes: ['Cream Suit', 'Shirt', 'Premium Shoes', 'Belt', 'Watch', 'Tie/Bow Tie'] },
  { name: 'Premium White Groom Package', price: 450, color: 'White', image: '/assets/groom/premium-white.jpg', includes: ['Premium White Suit', 'Premium White Shirt', 'Premium Shoes', 'Belt', 'Watch', 'Tie/Bow Tie', 'Groom Accessories'] },
];

const BRIDE_PACKAGES = [
  { name: 'Classic Bride Package', price: 300, image: '/assets/bride/classic-bride.jpg', includes: ['Wedding Dress', 'Veil', 'Shoes'] },
  { name: 'Elegant Bride Package', price: 450, image: '/assets/bride/elegant-bride.jpg', includes: ['Wedding Dress', 'Veil', 'Shoes', 'Jewelry'] },
  { name: 'Traditional Somali Bride Package', price: 350, image: '/assets/bride/traditional-bride.jpg', includes: ['Traditional Dirac', 'Traditional accessories', 'Shoes', 'Hijab'] },
  { name: 'Luxury Bride Package', price: 650, image: '/assets/bride/luxury-bride.jpg', includes: ['Premium Wedding Dress', 'Veil', 'Shoes', 'Jewelry', 'Accessories'] },
  { name: 'Royal Bride Full Package', price: 900, image: '/assets/bride/royal-bride.jpg', includes: ['Premium Bridal Dress', 'Premium Veil', 'Shoes', 'Jewelry', 'Bride Accessories', 'Traditional Outfit'] },
];

const CAKES = [
  { name: 'Classic Wedding Cake', price: 120, image: '/assets/cakes/classic-cake.jpg' },
  { name: 'Elegant Two-Tier Wedding Cake', price: 180, image: '/assets/cakes/two-tier.jpg' },
  { name: 'Luxury Three-Tier Wedding Cake', price: 250, image: '/assets/cakes/three-tier.jpg' },
  { name: 'Premium Floral Wedding Cake', price: 350, image: '/assets/cakes/floral-cake.jpg' },
  { name: 'Royal Wedding Cake', price: 500, image: '/assets/cakes/royal-cake.jpg' },
];

async function upsertVendor(email, businessName, category) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName: businessName.split(' ')[0],
      lastName: 'Vendor',
      username: email.split('@')[0],
      email,
      phone: `+25261${String(Date.now()).slice(-7)}`,
      password: PASSWORD,
      role: 'vendor',
      isActive: true,
      isVerified: true,
    });
  }
  let profile = await VendorProfile.findOne({ user: user._id });
  if (!profile) {
    profile = await VendorProfile.create({
      user: user._id,
      businessName,
      category,
      city: 'Mogadishu',
      verificationStatus: 'approved',
      verified: true,
      active: true,
    });
  } else {
    profile.verificationStatus = 'approved';
    profile.verified = true;
    profile.active = true;
    await profile.save();
  }
  return { user, profile };
}

async function upsertListing(vendor, profile, data) {
  const existing = await WeddingListing.findOne({ vendor: vendor._id, name: data.name });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return WeddingListing.create({ ...data, vendor: vendor._id, vendorProfile: profile._id });
}

async function main() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB');

  // Hall/Venue listings are created manually by vendors — never auto-seed halls.
  console.log('Skipped hall seeding (vendors create halls via My Listings).');

  const groomVendor = await upsertVendor('groom.style@seed.test', 'Gentleman Fit Mogadishu', 'groom attire');
  for (const pkg of GROOM_PACKAGES) {
    await upsertListing(groomVendor.user, groomVendor.profile, {
      name: pkg.name,
      category: 'groom_package',
      listingType: 'product',
      description: `${pkg.color} groom package including ${pkg.includes.join(', ')}.`,
      price: pkg.price,
      city: 'Mogadishu',
      images: [pkg.image],
      available: true,
      active: true,
      status: 'active',
      availabilityType: 'inventory',
      quantity: 50,
      metadata: { suitColor: pkg.color, packageIncludes: pkg.includes, listingKind: 'groom_package' },
      features: pkg.includes,
    });
    console.log(`Groom: ${pkg.name}`);
  }

  const brideVendor = await upsertVendor('bridal.noor@seed.test', 'Noor Bridal Atelier', 'wedding dress');
  for (const pkg of BRIDE_PACKAGES) {
    await upsertListing(brideVendor.user, brideVendor.profile, {
      name: pkg.name,
      category: 'bride_package',
      listingType: 'product',
      description: `Bride package including ${pkg.includes.join(', ')}.`,
      price: pkg.price,
      city: 'Mogadishu',
      images: [pkg.image],
      available: true,
      active: true,
      status: 'active',
      availabilityType: 'inventory',
      quantity: 50,
      metadata: { packageIncludes: pkg.includes, listingKind: 'bride_package' },
      features: pkg.includes,
    });
    console.log(`Bride: ${pkg.name}`);
  }

  const cakeVendor = await upsertVendor('cakes.celebration@seed.test', 'Celebration Cakes Studio', 'wedding cake');
  for (const cake of CAKES) {
    await upsertListing(cakeVendor.user, cakeVendor.profile, {
      name: cake.name,
      category: 'cake',
      listingType: 'product',
      description: 'Handcrafted wedding cake for your celebration.',
      price: cake.price,
      city: 'Mogadishu',
      images: [cake.image],
      available: true,
      active: true,
      status: 'active',
      availabilityType: 'inventory',
      quantity: 30,
      metadata: { listingKind: 'cake' },
    });
    console.log(`Cake: ${cake.name}`);
  }

  console.log('Marketplace catalog seed complete.');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
