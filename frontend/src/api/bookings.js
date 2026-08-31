import api from '../services/api.js';

export function getBookings(weddingId) {
  return api.get('/bookings', { params: { weddingId } }).then((r) => r.data);
}

export function getBooking(id) {
  return api.get(`/bookings/${id}`).then((r) => r.data);
}

export function checkBookingAvailability(params, weddingId) {
  return api.get('/bookings/check-availability', {
    params: { ...params, weddingId },
  }).then((r) => r.data);
}

export function createBooking(data, weddingId) {
  return api.post('/bookings', { ...data, weddingId }).then((r) => r.data);
}

export function bookHall(data, weddingId) {
  return api.post('/bookings/hall', { ...data, weddingId }).then((r) => r.data);
}

export function cancelBooking(id) {
  return api.patch(`/bookings/${id}/cancel`).then((r) => r.data);
}

export function payBooking(id, data = {}) {
  return api.post(`/bookings/${id}/pay`, data).then((r) => r.data);
}
