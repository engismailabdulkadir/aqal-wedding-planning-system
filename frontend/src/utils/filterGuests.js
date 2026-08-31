export function filterGuests(guests, { search = '', category = 'all', side = 'all' }) {
  const term = search.trim().toLowerCase();
  return guests.filter((guest) => {
    const matchesSearch = !term || [guest.firstName, guest.lastName, guest.phone, guest.email].some((value) => value?.toLowerCase().includes(term));
    return matchesSearch && (category === 'all' || guest.category === category) && (side === 'all' || guest.side === side);
  });
}
