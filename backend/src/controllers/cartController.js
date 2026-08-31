import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import WeddingCartItem from '../models/WeddingCartItem.js';
import WeddingListing from '../models/WeddingListing.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';
import { bookingOwnerFromUserRole, isCoupleRole } from '../utils/roles.js';
import { notify } from '../utils/notify.js';
import {
  assertHallCapacity,
  assertHallSlotAvailable,
  getHallBookedSlots,
  isVenueListing,
  priceForSlot,
  slotAvailabilityFromBooked,
} from '../utils/hallSlotAvailability.js';

function requireCouple(req, res) {
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Groom or Bride access required');
  }
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

const itemPopulate = [
  { path: 'listing', select: 'name category images price metadata city location availabilityType' },
  { path: 'addedBy', select: 'firstName lastName username role' },
  { path: 'vendorProfile', select: 'businessName' },
];

export const getHallSlotAvailability = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const listingId = req.query.listingId;
  const date = req.query.date;
  if (!mongoose.isValidObjectId(listingId) || !date) {
    res.status(400);
    throw new Error('Listing ID and date are required');
  }
  const listing = await WeddingListing.findOne({ _id: listingId, active: true });
  if (!listing || !isVenueListing(listing)) {
    res.status(404);
    throw new Error('Hall listing not found');
  }
  const booked = await getHallBookedSlots(listing._id, date);
  const slots = slotAvailabilityFromBooked(booked);
  const prices = {
    morning: priceForSlot(listing, 'morning'),
    evening: priceForSlot(listing, 'evening'),
    full_day: priceForSlot(listing, 'full_day'),
  };
  res.json({ success: true, date, slots, prices, booked });
});

export const listCartItems = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res, { required: false });
  if (!wedding) {
    return res.json({ success: true, items: [], summary: { count: 0, total: 0 } });
  }
  const items = await WeddingCartItem.find({ wedding: wedding._id })
    .populate(itemPopulate)
    .sort({ createdAt: 1 });
  const total = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
  res.json({
    success: true,
    wedding: { _id: wedding._id, weddingName: wedding.weddingName },
    items,
    summary: { count: items.length, total },
  });
});

export const addCartItem = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  if (req.body.weddingId && String(req.body.weddingId) !== String(wedding._id)) {
    res.status(400);
    throw new Error('Wedding ID does not match your shared wedding');
  }

  const listing = mongoose.isValidObjectId(req.body.listingId || req.body.listing)
    ? await WeddingListing.findOne({
      _id: req.body.listingId || req.body.listing,
      active: true,
      available: true,
      status: { $ne: 'archived' },
    }).populate('vendorProfile', 'businessName')
    : null;
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found or unavailable');
  }

  let quantity = Number(req.body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    res.status(400);
    throw new Error('Quantity must be between 1 and 100');
  }

  let bookingDate = req.body.bookingDate || req.body.eventDate || null;
  let timeSlot = req.body.timeSlot || null;
  let unitPrice = roundMoney(Number(listing.discountPrice ?? listing.price));

  if (isVenueListing(listing)) {
    if (!bookingDate || !timeSlot) {
      res.status(400);
      throw new Error('Hall bookings require date and time slot (morning, evening, or full_day)');
    }
    if (!['morning', 'evening', 'full_day'].includes(timeSlot)) {
      res.status(400);
      throw new Error('Invalid time slot');
    }
    await assertHallSlotAvailable(listing, bookingDate, timeSlot, res);
    await assertHallCapacity(listing, wedding, res);
    unitPrice = roundMoney(priceForSlot(listing, timeSlot));
    quantity = 1;
  } else if (listing.availabilityType === 'date' || listing.availabilityType === 'slot') {
    bookingDate = bookingDate || wedding.weddingDate;
  } else {
    bookingDate = bookingDate || wedding.weddingDate || new Date();
  }

  const subtotal = roundMoney(unitPrice * quantity);
  const item = await WeddingCartItem.create({
    wedding: wedding._id,
    listing: listing._id,
    vendor: listing.vendor,
    vendorProfile: listing.vendorProfile._id || listing.vendorProfile,
    addedBy: req.user._id,
    category: listing.category,
    itemName: listing.name,
    bookingDate,
    timeSlot,
    quantity,
    unitPrice,
    subtotal,
    image: listing.images?.[0] || '',
    vendorName: listing.vendorProfile?.businessName || '',
    notes: String(req.body.notes || '').trim(),
  });

  const populated = await WeddingCartItem.findById(item._id).populate(itemPopulate);
  res.status(201).json({ success: true, item: populated });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  const item = mongoose.isValidObjectId(req.params.id)
    ? await WeddingCartItem.findOne({ _id: req.params.id, wedding: wedding._id })
    : null;
  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }

  const listing = await WeddingListing.findById(item.listing);
  if (!listing) {
    res.status(404);
    throw new Error('Listing no longer available');
  }

  if (req.body.quantity !== undefined) {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      res.status(400);
      throw new Error('Invalid quantity');
    }
    item.quantity = quantity;
    item.subtotal = roundMoney(item.unitPrice * quantity);
  }

  if (req.body.bookingDate) item.bookingDate = req.body.bookingDate;
  if (req.body.timeSlot) {
    if (isVenueListing(listing)) {
      await assertHallSlotAvailable(listing, item.bookingDate, req.body.timeSlot, res);
      item.timeSlot = req.body.timeSlot;
      item.unitPrice = roundMoney(priceForSlot(listing, req.body.timeSlot));
      item.subtotal = roundMoney(item.unitPrice * item.quantity);
    }
  }

  await item.save();
  const populated = await WeddingCartItem.findById(item._id).populate(itemPopulate);
  res.json({ success: true, item: populated });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  const item = mongoose.isValidObjectId(req.params.id)
    ? await WeddingCartItem.findOne({ _id: req.params.id, wedding: wedding._id })
    : null;
  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }
  await item.deleteOne();
  res.json({ success: true, message: 'Item removed from cart' });
});

export const checkoutCart = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  const items = await WeddingCartItem.find({ wedding: wedding._id }).populate('listing');
  if (!items.length) {
    res.status(400);
    throw new Error('Your wedding cart is empty');
  }

  const bookings = [];
  const bookingOwner = bookingOwnerFromUserRole(req.user.role);

  for (const item of items) {
    const listing = item.listing;
    if (!listing || !listing.active) {
      res.status(409);
      throw new Error(`${item.itemName} is no longer available`);
    }

    if (isVenueListing(listing)) {
      await assertHallSlotAvailable(listing, item.bookingDate, item.timeSlot, res);
      await assertHallCapacity(listing, wedding, res);
      const freshPrice = roundMoney(priceForSlot(listing, item.timeSlot));
      if (freshPrice !== item.unitPrice) {
        res.status(409);
        throw new Error(`Price changed for ${listing.name}. Remove and add again.`);
      }
    } else {
      const freshPrice = roundMoney(Number(listing.discountPrice ?? listing.price));
      if (freshPrice !== item.unitPrice) {
        res.status(409);
        throw new Error(`Price changed for ${listing.name}. Remove and add again.`);
      }
    }

    const amount = roundMoney(item.subtotal);
    const booking = await Booking.create({
      wedding: wedding._id,
      customer: req.user._id,
      vendor: item.vendor,
      vendorProfile: item.vendorProfile,
      listing: listing._id,
      serviceName: item.itemName,
      eventDate: item.bookingDate || wedding.weddingDate,
      timeSlot: item.timeSlot,
      quantity: item.quantity,
      amount,
      customerMessage: item.notes,
      status: 'pending',
      isPaid: false,
      bookingOwner,
      bookedBy: item.addedBy,
    });
    bookings.push(booking);

    await notify(item.vendor, {
      title: 'New Booking Request',
      message: `New request for ${item.itemName}.`,
      type: 'booking_created',
      link: '/vendor/bookings',
      wedding: wedding._id,
    }).catch(() => {});
  }

  await WeddingCartItem.deleteMany({ wedding: wedding._id });

  res.status(201).json({
    success: true,
    bookings,
    count: bookings.length,
    message: 'Booking requests submitted! Waiting for vendor confirmation.',
  });
});
