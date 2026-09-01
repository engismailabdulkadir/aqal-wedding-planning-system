import api from './api.js';

// ================================
// ADMIN DASHBOARD
// ================================

// Hel xogta dashboard-ka Admin
export const getAdminDashboard = () =>
  api
    .get('/admin/dashboard')
    .then((r) => r.data);

// ================================
// ADMIN USERS
// ================================

// Hel users-ka oo dhan
export const getAdminUsers = (params) =>
  api
    .get('/admin/users', { params })
    .then((r) => r.data);

// Samee user cusub adigoo Admin ah
export const createAdminUser = (data) =>
  api
    .post('/admin/users', data)
    .then((r) => r.data);

// Cusboonaysii user
export const updateAdminUser = (id, data) =>
  api
    .patch(`/admin/users/${id}`, data)
    .then((r) => r.data);

// Tirtir user
export const deleteAdminUser = (id) =>
  api
    .delete(`/admin/users/${id}`)
    .then((r) => r.data);

// ================================
// ADMIN CUSTOMERS
// ================================

// Hel customers
export const getAdminCustomers = (params) =>
  api
    .get('/admin/customers', { params })
    .then((r) => r.data);

// Hel customer gaar ah
export const getAdminCustomer = (id) =>
  api
    .get(`/admin/customers/${id}`)
    .then((r) => r.data);

// ================================
// ADMIN PLANNERS
// ================================

// Hel wedding planners
export const getAdminPlanners = (params) =>
  api
    .get('/admin/planners', { params })
    .then((r) => r.data);

// Hel planner gaar ah
export const getAdminPlanner = (id) =>
  api
    .get(`/admin/planners/${id}`)
    .then((r) => r.data);

// ================================
// ADMIN WEDDINGS
// ================================

// Hel weddings oo dhan
export const getAdminWeddings = () =>
  api
    .get('/admin/weddings')
    .then((r) => r.data);

// Samee wedding cusub
export const createAdminWedding = (data) =>
  api
    .post('/admin/weddings', data)
    .then((r) => r.data);

// Assign planner wedding
export const assignPlanner = (id, planner) =>
  api
    .patch(`/admin/weddings/${id}/planner`, {
      planner,
    })
    .then((r) => r.data);

// ================================
// ADMIN VENDORS
// ================================

// Hel vendors
export const getAdminVendors = (params) =>
  api
    .get('/admin/vendors', { params })
    .then((r) => r.data);

// Hel vendor gaar ah
export const getAdminVendor = (id) =>
  api
    .get(`/admin/vendors/${id}`)
    .then((r) => r.data);

// Cusboonaysii vendor
export const updateAdminVendor = (id, data) =>
  api
    .patch(`/admin/vendors/${id}`, data)
    .then((r) => r.data);

// ================================
// ADMIN BOOKINGS
// ================================

// Hel bookings
export const getAdminBookings = (params) =>
  api
    .get('/admin/bookings', { params })
    .then((r) => r.data);

// Hel booking gaar ah
export const getAdminBooking = (id) =>
  api
    .get(
      `/admin/bookings/${encodeURIComponent(id)}`
    )
    .then((r) => r.data);

// Cusboonaysii booking status
export const updateAdminBookingStatus = (
  id,
  status
) =>
  api
    .patch(
      `/admin/bookings/${encodeURIComponent(id)}/status`,
      { status }
    )
    .then((r) => r.data);

// Cancel booking
export const cancelAdminBooking = (id) =>
  api
    .patch(
      `/admin/bookings/${encodeURIComponent(id)}/cancel`
    )
    .then((r) => r.data);

// ================================
// ADMIN PAYMENTS
// ================================

// Hel payments
export const getAdminPayments = () =>
  api
    .get('/admin/payments')
    .then((r) => r.data);

// ================================
// ADMIN SELECTIONS
// ================================

// Hel selections
export const getAdminSelections = () =>
  api
    .get('/admin/selections')
    .then((r) => r.data);

// ================================
// ADMIN WEDDING DETAILS
// ================================

// Hel wedding gaar ah
export const getAdminWedding = (id) =>
  api
    .get(`/admin/weddings/${id}`)
    .then((r) => r.data);

// ================================
// ADMIN ORDERS
// ================================

// Hel orders
export const getAdminOrders = () =>
  api
    .get('/admin/orders')
    .then((r) => r.data);

// ================================
// ADMIN HALL BOOKINGS
// ================================

// Hel hall bookings
export const getAdminHallBookings = () =>
  api
    .get('/admin/hall-bookings')
    .then((r) => r.data);

// ================================
// PLANNER
// ================================

// Hel wedding-ka planner-ka loo assigned gareeyay
export const getAssignedWedding = (id) =>
  api
    .get(`/planner/weddings/${id}`)
    .then((r) => r.data);

// ================================
// ADMIN VENUES
// ================================

// Hel venues
export const getAdminVenues = (params) =>
  api
    .get('/admin/venues', { params })
    .then((r) => r.data);

// Hel venue gaar ah
export const getAdminVenue = (id) =>
  api
    .get(`/admin/venues/${id}`)
    .then((r) => r.data);

// Samee venue cusub
export const createAdminVenue = (data) =>
  api
    .post('/admin/venues', data)
    .then((r) => r.data);

// Cusboonaysii venue
export const updateAdminVenue = (id, data) =>
  api
    .patch(`/admin/venues/${id}`, data)
    .then((r) => r.data);

// Ku xiro vendor venue
export const linkAdminVenueVendor = (
  id,
  vendor
) =>
  api
    .patch(
      `/admin/venues/${id}/vendor`,
      { vendor }
    )
    .then((r) => r.data);

// ================================
// ADMIN HALLS
// ================================

// Samee hall cusub oo venue hoostiisa ah
export const createAdminHall = (
  id,
  data
) =>
  api
    .post(
      `/admin/venues/${id}/halls`,
      data
    )
    .then((r) => r.data);

// Cusboonaysii hall
export const updateAdminHall = (
  id,
  data
) =>
  api
    .patch(
      `/admin/halls/${id}`,
      data
    )
    .then((r) => r.data);

// ================================
// ADMIN LISTINGS
// ================================

// Hel listings oo dhan
export const getAdminListings = () =>
  api
    .get('/admin/listings')
    .then((r) => r.data);

// Cusboonaysii listing
export const updateAdminListing = (
  id,
  data
) =>
  api
    .patch(
      `/admin/listings/${id}`,
      data
    )
    .then((r) => r.data);