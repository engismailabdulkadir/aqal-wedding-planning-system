import 'dotenv/config';
import mongoose from 'mongoose';
import Hall from '../src/models/Hall.js';
import HallSlot, { QUOTE_HALL_SLOTS } from '../src/models/HallSlot.js';
import Venue from '../src/models/Venue.js';
import WeddingListing from '../src/models/WeddingListing.js';

const VERIFIED_AT = new Date('2026-08-30T00:00:00.000Z');

const IMG = {
  ballroom: 'https://images.unsplash.com/photo-1519167758481-83f29da8c2b0?auto=format&fit=crop&w=1400&q=80',
  ceremony: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
  tables: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80',
  aisle: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80',
  reception: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
  lobby: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80',
  luxury: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
  banquet: 'https://images.unsplash.com/photo-1478144592103-25e649eb43f2?auto=format&fit=crop&w=1400&q=80',
  chandeliers: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1400&q=80',
  dinner: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80',
  lounge: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80',
};

const LISTING_IMAGES = {
  bride_dress: 'https://images.unsplash.com/photo-1515372039744-b8f0229ddc70?auto=format&fit=crop&w=900&q=80',
  bride_shoes: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80',
  accessories: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
  bridal_salon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
  makeup: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80',
  bouquet: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
  flowers: 'https://images.unsplash.com/photo-1468327768560-75b95a3bf480?auto=format&fit=crop&w=900&q=80',
  groom_attire: 'https://images.unsplash.com/photo-1594938291221-94d09e0c32e3?auto=format&fit=crop&w=900&q=80',
  decoration: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
  catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80',
  photography: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
  videography: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
  cake: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=900&q=80',
  transportation: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
};

function empty(value) {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function fillEmpty(doc, fields) {
  let changed = false;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (empty(doc[key])) {
      doc[key] = value;
      changed = true;
    }
  }
  return changed;
}

const CATALOG = [
  {
    slug: 'bera-bandir-hotel',
    match: { name: 'Bera Bandir Hotel' },
    preserveVendor: true,
    featured: true,
    featuredOrder: 2,
    verified: true,
    ownershipStatus: 'claimed',
    priceStatus: 'slot',
    data: {
      name: 'Bera Bandir Hotel',
      description: 'Independent banquet halls at Bera Bandir Hotel in Hodan. Booking one hall never blocks the others.',
      city: 'Mogadishu',
      district: 'Hodan',
      address: 'Maka Al Mukarama Road',
      location: 'Hodan, Mogadishu',
      coverImage: IMG.ballroom,
      galleryImages: [IMG.ballroom, IMG.tables, IMG.reception],
      images: [IMG.ballroom],
      imageSource: 'placeholder',
      imageIsPlaceholder: true,
      imageCredit: 'Unsplash generic venue photograph',
      amenities: ['Parking', 'Air Conditioning', 'Stage', 'Sound System', 'Security', 'Catering'],
      parking: true,
      airConditioning: true,
      stage: true,
      soundSystem: true,
      security: true,
      catering: true,
      capacityMin: 180,
      capacityMax: 400,
      status: 'active',
      externallySourced: false,
    },
    halls: [],
  },
  {
    slug: 'the-villas-event-hall',
    featured: true,
    featuredOrder: 1,
    data: {
      name: 'The Villas Event Hall',
      description: 'Event hall inside The Villas compound near Aden Adde International Airport. Marketed for weddings, conferences, and community celebrations, with catering from the on-site restaurant and coffee shop.',
      city: 'Mogadishu',
      district: 'Airport Area',
      address: 'Near Aden Adde International Airport',
      location: 'Airport Area, Mogadishu — about 3 minutes from Aden Adde International Airport',
      phone: '+252 61 1249004',
      amenities: ['Parking', 'Security', 'Catering', 'Sound System'],
      parking: true,
      security: true,
      catering: true,
      soundSystem: true,
      capacityMin: 300,
      capacityMax: 400,
      coverImage: IMG.ceremony,
      galleryImages: [IMG.ceremony, IMG.tables, IMG.aisle],
      images: [IMG.ceremony],
      sourceUrl: 'https://thevillas.place/Event-Hall',
      sourceName: 'The Villas',
    },
    halls: [
      {
        hallName: 'Event Hall',
        capacity: 400,
        minimumCapacity: 300,
        description: 'Flexible seating for 300–400 guests in banquet or theater-style layouts.',
        facilities: ['Banquet seating', 'Theater seating', 'Catering', 'A/V setup', 'Parking', 'Security'],
        parking: true,
        security: true,
        airConditioning: true,
        stage: true,
      },
    ],
  },
  {
    slug: 'peace-hotel',
    featured: true,
    featuredOrder: 3,
    data: {
      name: 'Peace Hotel',
      description: 'Peace Hotels conference and events venue in Mogadishu, with banquet and VIP rooms used for receptions, meetings, and celebrations. Peace Hotel 1 sits just outside Mogadishu International Airport.',
      city: 'Mogadishu',
      district: 'Airport Area',
      address: 'Near Mogadishu International Airport',
      location: 'Airport Area, Mogadishu',
      phone: '+252 619 494 973',
      email: 'reservations@peacebusinessgroup.com',
      amenities: ['Parking', 'Sound System', 'Catering', 'Air Conditioning'],
      parking: true,
      soundSystem: true,
      catering: true,
      airConditioning: true,
      capacityMin: 220,
      capacityMax: 330,
      coverImage: IMG.hotel,
      galleryImages: [IMG.hotel, IMG.banquet, IMG.lobby],
      images: [IMG.hotel],
      sourceUrl: 'https://www.peacehotelsom.com/meeting-conferences',
      sourceName: 'Peace Hotels',
    },
    halls: [
      {
        hallName: 'Daallo Banquet Hall',
        capacity: 220,
        description: 'Banquet hall listed at 18m × 7m. Reception capacity 220; theatre 200.',
        facilities: ['Reception layout', 'Theatre layout', 'Audio-visual equipment', 'Parking'],
        parking: true,
        airConditioning: true,
        stage: true,
      },
      {
        hallName: 'Gezira VIP Room',
        capacity: 330,
        description: 'VIP event room listed at 18m × 10m. Reception capacity 330; theatre 290.',
        facilities: ['Reception layout', 'Theatre layout', 'VIP setup', 'Audio-visual equipment'],
        parking: true,
        airConditioning: true,
        stage: true,
      },
    ],
  },
  {
    slug: 'airport-hotel-conference',
    featured: true,
    featuredOrder: 4,
    data: {
      name: 'Airport Hotel & Conference',
      description: 'Conference and banquet facilities of more than 6,000 sq ft near Mogadishu International Airport. Hall A is the grand hall and can be subdivided; the hotel also markets banquet setups.',
      city: 'Mogadishu',
      district: 'Airport Area',
      address: 'Mogadishu International Airport zone',
      location: 'Airport Area, Mogadishu',
      amenities: ['Sound System', 'Air Conditioning', 'Catering'],
      soundSystem: true,
      airConditioning: true,
      catering: true,
      capacityMin: 500,
      capacityMax: 500,
      coverImage: IMG.luxury,
      galleryImages: [IMG.luxury, IMG.tables, IMG.lobby],
      images: [IMG.luxury],
      sourceUrl: 'https://ahmogadishu.com/conference/',
      sourceName: 'Airport Hotel',
    },
    halls: [
      {
        hallName: 'Hall A',
        capacity: 500,
        description: 'Grand hall with large windows, divisible into three sections, up to 500 guests in one sitting. Also described as suitable for banquet setups.',
        facilities: ['Natural lighting', 'Audio visual equipment', 'Divisible space', 'Pre-function space'],
        airConditioning: true,
        stage: true,
      },
    ],
  },
  {
    slug: 'afrik-hotel',
    featured: true,
    featuredOrder: 5,
    data: {
      name: 'Afrik Hotel',
      description: 'Hotel Afrik in Waberi markets decorated indoor and outdoor event halls for weddings, meetings, and private celebrations near KM4 and Airport Road. Published hall capacities are not listed.',
      city: 'Mogadishu',
      district: 'Waberi',
      address: 'KM4, Airport Road, Waberi District',
      location: 'KM4, Airport Road, Waberi, Mogadishu',
      phone: '+252 619 884 444',
      amenities: ['Catering'],
      catering: true,
      coverImage: IMG.reception,
      galleryImages: [IMG.reception, IMG.dinner, IMG.aisle],
      images: [IMG.reception],
      sourceUrl: 'https://afrikhotel.so/venues/',
      sourceName: 'Afrik Hotel',
    },
    halls: [],
  },
  {
    slug: 'the-palms-hotel',
    featured: true,
    featuredOrder: 6,
    data: {
      name: 'The Palms Hotel',
      description: 'Hotel inside Aden Adde International Airport with conference halls that support theatre, classroom, and banquet layouts, plus on-site catering.',
      city: 'Mogadishu',
      district: 'Airport Area',
      address: 'Inside Aden Adde International Airport (AAIA)',
      location: 'Aden Adde International Airport, Mogadishu',
      phone: '+252 61 8400610',
      email: 'info@thepalmshotel.so',
      amenities: ['Air Conditioning', 'Sound System', 'Security', 'Catering'],
      airConditioning: true,
      soundSystem: true,
      security: true,
      catering: true,
      capacityMin: 30,
      capacityMax: 100,
      coverImage: IMG.lounge,
      galleryImages: [IMG.lounge, IMG.lobby, IMG.tables],
      images: [IMG.lounge],
      sourceUrl: 'https://thepalmshotel.so/our-services/',
      sourceName: 'The Palms Hotel',
    },
    halls: [
      {
        hallName: 'Large Conference Hall',
        capacity: 100,
        description: 'Up to 100 guests with theatre, classroom, or banquet configurations and audio-visual systems.',
        facilities: ['Projector', 'Microphones', 'Lighting', 'Banquet layout'],
        airConditioning: true,
        stage: true,
      },
      {
        hallName: 'Medium Hall',
        capacity: 30,
        description: 'Meeting and workshop hall for up to 30 guests.',
        facilities: ['Audio-visual equipment', 'Flexible seating'],
        airConditioning: true,
      },
    ],
  },
  {
    slug: 'city-star-hotel',
    featured: true,
    featuredOrder: 7,
    data: {
      name: 'City Star Hotel',
      description: 'Mogadishu hotel listing a conference and event hall plus wedding catering through its restaurant. Hall capacity is not published; the restaurant is listed as 60 seats.',
      city: 'Mogadishu',
      district: '',
      address: 'Mogadishu',
      location: 'Mogadishu',
      amenities: ['Security', 'Catering'],
      security: true,
      catering: true,
      coverImage: IMG.chandeliers,
      galleryImages: [IMG.chandeliers, IMG.dinner],
      images: [IMG.chandeliers],
      sourceUrl: 'https://citystarhotel.so/',
      sourceName: 'City Star Hotel',
    },
    halls: [],
  },
  {
    slug: 'karmel-restaurant-halls',
    featured: true,
    featuredOrder: 8,
    data: {
      name: 'Karmel Restaurant Event Halls',
      description: 'Karmel Hotel and Restaurant on Digfeer Road in Hodan, near Shaafi Hospital. The business advertises modern halls for weddings, nikkah, meetings, graduations, and seminars. Hall capacities are not published.',
      city: 'Mogadishu',
      district: 'Hodan',
      address: 'Digfeer Road, near Shaafi Hospital, Hodan',
      location: 'Digfeer Road, Hodan, Mogadishu',
      phone: '+252 619888877',
      amenities: ['Catering'],
      catering: true,
      coverImage: IMG.dinner,
      galleryImages: [IMG.dinner, IMG.tables],
      images: [IMG.dinner],
      sourceUrl: 'https://karmelrestaurant.blogspot.com/2019/01/the-best-place-and-restaurant-in.html',
      sourceName: 'Karmel Restaurant',
    },
    halls: [],
  },
  {
    slug: 'shamo-hotel',
    featured: false,
    featuredOrder: 20,
    data: {
      name: 'Shamo Hotel',
      description: 'Shamo Hotel, about two kilometres from Aden Adde International Airport, advertises a wedding and conference hall for parties, weddings, and meetings. Published guest capacity for the hall is not listed.',
      city: 'Mogadishu',
      district: 'Airport Area',
      address: 'About 2 km from Aden Adde International Airport',
      location: 'Airport Area, Mogadishu',
      amenities: ['Catering'],
      catering: true,
      coverImage: IMG.banquet,
      galleryImages: [IMG.banquet, IMG.lobby],
      images: [IMG.banquet],
      sourceUrl: 'https://theshamogroup.com/shamohotel.html',
      sourceName: 'SHAMO Group',
    },
    halls: [],
  },
  {
    slug: 'vero-restaurant-event-hall',
    featured: false,
    featuredOrder: 21,
    data: {
      name: 'Vero Restaurant Event Hall',
      description: 'Vero Restaurant in Hodan (Lenin Road / Abdiqasim, Goley Tower) advertises an event and nikkah hall alongside its restaurant. Published hall capacity and wedding-hall pricing are not listed on the official site.',
      city: 'Mogadishu',
      district: 'Hodan',
      address: 'Lenin Road / Abdiqasim, Goley Tower, Hodan',
      location: 'Hodan, Mogadishu',
      phone: '+252 61 1548777',
      amenities: ['Catering'],
      catering: true,
      coverImage: IMG.aisle,
      galleryImages: [IMG.aisle, IMG.dinner],
      images: [IMG.aisle],
      sourceUrl: 'https://verorestaurant.com/about-us/',
      sourceName: 'Vero Restaurant',
    },
    halls: [],
  },
];

async function upsertVenue(entry) {
  const existing = await Venue.findOne({
    $or: [{ slug: entry.slug }, entry.match || { name: entry.data.name }],
  });
  const shared = {
    slug: entry.slug,
    city: 'Mogadishu',
    imageSource: 'placeholder',
    imageIsPlaceholder: true,
    imageCredit: 'Unsplash generic venue photograph — not an official photo of this venue',
    priceStatus: entry.priceStatus || 'quote_required',
    externallySourced: !entry.preserveVendor,
    sourceVerifiedAt: VERIFIED_AT,
    ...entry.data,
  };

  if (!existing) {
    const venue = await Venue.create({
      ...shared,
      vendor: null,
      vendorProfile: null,
      ownershipStatus: entry.ownershipStatus || 'unclaimed',
      featured: Boolean(entry.featured),
      featuredOrder: entry.featuredOrder ?? 100,
      verified: entry.verified !== false,
      status: 'active',
    });
    return { venue, created: true };
  }

  const firstImport = empty(existing.slug);
  fillEmpty(existing, shared);
  existing.slug = entry.slug;
  if (firstImport) {
    existing.featured = Boolean(entry.featured);
    existing.featuredOrder = entry.featuredOrder ?? existing.featuredOrder ?? 100;
    existing.verified = entry.verified !== false;
    if (entry.priceStatus) existing.priceStatus = entry.priceStatus;
  }
  if (!entry.preserveVendor && empty(existing.vendor)) {
    existing.ownershipStatus = 'unclaimed';
  }
  if (existing.priceStatus == null) existing.priceStatus = entry.priceStatus || 'quote_required';
  if (existing.slug === 'airport-hotel-conference' && existing.capacityMin === 20 && existing.externallySourced) {
    existing.capacityMin = 500;
    existing.capacityMax = 500;
  }
  await existing.save();
  return { venue: existing, created: false };
}

async function upsertHalls(venue, halls) {
  for (const spec of halls) {
    let hall = await Hall.findOne({ venue: venue._id, hallName: spec.hallName });
    if (!hall) {
      hall = await Hall.create({
        venue: venue._id,
        vendor: venue.vendor || null,
        status: 'active',
        priceStatus: 'quote_required',
        airConditioning: spec.airConditioning ?? true,
        stage: spec.stage ?? false,
        parking: spec.parking ?? false,
        security: spec.security ?? false,
        ...spec,
      });
    }
    const slotCount = await HallSlot.countDocuments({ hall: hall._id });
    if (!slotCount) {
      await HallSlot.insertMany(QUOTE_HALL_SLOTS.map((slot) => ({
        ...slot,
        hall: hall._id,
        vendor: venue.vendor || null,
      })));
    }
  }
}

await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });

try {
  const summary = [];
  for (const entry of CATALOG) {
    const { venue, created } = await upsertVenue(entry);
    await upsertHalls(venue, entry.halls || []);
    summary.push(`${created ? 'created' : 'updated'} ${venue.name} (${venue.slug})`);
  }

  const listings = await WeddingListing.find({ $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] });
  let listingImages = 0;
  for (const listing of listings) {
    const image = LISTING_IMAGES[listing.category];
    if (!image) continue;
    listing.images = [image];
    await listing.save();
    listingImages += 1;
  }

  console.log('Mogadishu venue catalogue');
  summary.forEach((line) => console.log(` - ${line}`));
  console.log(`Listing placeholder images added: ${listingImages}`);
  console.log('Existing hall bookings were not deleted.');
} finally {
  await mongoose.disconnect();
}
