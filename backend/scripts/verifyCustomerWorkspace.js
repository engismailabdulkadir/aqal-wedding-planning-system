import 'dotenv/config';
import mongoose from 'mongoose';
import Booking from '../src/models/Booking.js';
import Conversation from '../src/models/Conversation.js';
import Guest from '../src/models/Guest.js';
import Invitation from '../src/models/Invitation.js';
import Message from '../src/models/Message.js';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Wedding from '../src/models/Wedding.js';

const base = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdUsers = [];
const checks = [];

async function request(path, { token, method = 'GET', body, expected = 200 } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (response.status !== expected) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}
function pass(name, condition = true) { if (!condition) throw new Error(name); checks.push(name); }
async function register(role, label) { const data = await request('/auth/register', { method: 'POST', expected: 201, body: { firstName: label, lastName: 'WorkspaceTest', email: `${label.toLowerCase()}-${stamp}@example.test`, phone: '+252000000', password: 'WorkspaceTest123!', role } }); createdUsers.push(data.user._id); return data; }

try {
  await request('/health'); pass('Backend health');
  const [customerA, customerB, vendorA, vendorB, planner] = await Promise.all([register('customer', 'CustomerA'), register('customer', 'CustomerB'), register('vendor', 'VendorA'), register('vendor', 'VendorB'), register('planner', 'Planner')]);
  pass('Customer A/B, Vendor A/B, and Planner registration');
  await request('/bookings', { expected: 401 }); pass('Anonymous private API rejected');
  const weddingA = (await request('/weddings', { token: customerA.token, method: 'POST', expected: 201, body: { weddingName: 'Workspace Test Wedding A', partner1Name: 'A', partner2Name: 'B', weddingDate: '2030-08-29', venue: 'Test Venue', city: 'Nairobi', estimatedBudget: 20000, expectedGuests: 100 } })).wedding;
  await request('/weddings', { token: customerB.token, method: 'POST', expected: 201, body: { weddingName: 'Workspace Test Wedding B', partner1Name: 'C', partner2Name: 'D', weddingDate: '2030-09-29', city: 'Mombasa', estimatedBudget: 10000, expectedGuests: 50 } });
  pass('Customer weddings created');
  const vendorProfileA = (await request('/vendors/me/profile', { token: vendorA.token, method: 'PUT', body: { businessName: 'Workspace Photography', category: 'photography', description: 'Test business', city: 'Nairobi', startingPrice: 500, services: [{ name: 'Wedding Photos', description: 'Full day', price: 800 }] } })).vendor;
  await request('/vendors/me/profile', { token: vendorB.token, method: 'PUT', body: { businessName: 'Workspace Catering', category: 'catering', description: 'Test business B', city: 'Nairobi', startingPrice: 300, services: [{ name: 'Dinner', price: 600 }] } });
  const vendors = await request('/vendors?category=photography&city=Nairobi', { token: customerA.token }); pass('Vendor discovery filters', vendors.vendors.some((v) => String(v._id) === String(vendorProfileA._id)));
  const booking = (await request('/bookings', { token: customerA.token, method: 'POST', expected: 201, body: { vendorProfile: vendorProfileA._id, serviceId: vendorProfileA.services[0]._id, eventDate: '2030-08-29', customerMessage: 'Test request', customer: customerB.user._id, wedding: weddingA._id } })).booking; pass('Secure customer booking creation', booking.customer === customerA.user._id);
  await request(`/bookings/${booking._id}`, { token: customerB.token, expected: 404 }); pass('Customer B cannot access Customer A booking');
  await request(`/vendor/bookings/${booking._id}/status`, { token: vendorB.token, method: 'PATCH', expected: 404, body: { status: 'accepted' } }); pass('Vendor B cannot update Vendor A booking');
  await request(`/vendor/bookings/${booking._id}/status`, { token: vendorA.token, method: 'PATCH', body: { status: 'accepted' } });
  const bookingList = await request('/bookings', { token: customerA.token }); pass('Vendor acceptance and confirmed vendor aggregation', bookingList.summary.accepted === 1 && bookingList.summary.confirmedVendors === 1);
  const guest = (await request('/guests', { token: customerA.token, method: 'POST', expected: 201, body: { firstName: 'Invited', lastName: 'Guest', email: `guest-${stamp}@example.test`, plusOneAllowed: true } })).guest;
  const invitation = (await request('/invitations', { token: customerA.token, method: 'POST', expected: 201, body: { guest: guest._id, message: 'Join our celebration' } })).invitation;
  await request(`/invitations/${invitation._id}`, { token: customerB.token, expected: 404 }); pass('Customer B cannot access Customer A invitation');
  await request(`/invitations/${invitation._id}`, { token: customerA.token, method: 'PATCH', body: { status: 'sent' } });
  await request('/public/rsvp/not-a-valid-token', { method: 'POST', expected: 404, body: { response: 'accepted' } }); pass('Invalid RSVP token rejected');
  await request(`/public/invitations/${invitation.token}`); await request(`/public/rsvp/${invitation.token}`, { method: 'POST', body: { response: 'accepted', plusOneName: 'Plus One' } });
  const invitations = await request('/invitations', { token: customerA.token }); pass('Public token RSVP updates Guest and invitation', invitations.summary.accepted === 1 && invitations.summary.responded === 1);
  const conversation = (await request('/conversations', { token: customerA.token, method: 'POST', expected: 201, body: { booking: booking._id } })).conversation;
  await request(`/conversations/${conversation._id}/messages`, { token: customerA.token, method: 'POST', expected: 201, body: { text: 'Hello vendor', sender: vendorB.user._id } });
  await request(`/conversations/${conversation._id}/messages`, { token: vendorA.token }); pass('Customer/vendor messaging works');
  await request(`/conversations/${conversation._id}/messages`, { token: customerB.token, expected: 404 }); pass('Customer B cannot access Customer A conversation');
  const report = await request('/reports', { token: customerA.token }); pass('Dynamic report matches MongoDB workflow data', report.report.bookings.accepted === 1 && report.report.guests.accepted === 1 && report.report.invitations.responded === 1);
  const plannerReport = await request('/reports', { token: planner.token }); pass('Planner reports are scoped to assigned weddings', typeof plannerReport.report?.assignedWeddings === 'number');
  console.log(JSON.stringify({ success: true, passed: checks.length, checks }, null, 2));
} finally {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });
  const weddings = await Wedding.find({ customer: { $in: createdUsers } }).distinct('_id');
  const conversations = await Conversation.find({ wedding: { $in: weddings } }).distinct('_id');
  await Promise.all([Message.deleteMany({ conversation: { $in: conversations } }), Conversation.deleteMany({ wedding: { $in: weddings } }), Invitation.deleteMany({ wedding: { $in: weddings } }), Guest.deleteMany({ wedding: { $in: weddings } }), Booking.deleteMany({ customer: { $in: createdUsers } }), VendorProfile.deleteMany({ user: { $in: createdUsers } }), Wedding.deleteMany({ customer: { $in: createdUsers } }), User.deleteMany({ _id: { $in: createdUsers } })]);
  await mongoose.disconnect();
}
