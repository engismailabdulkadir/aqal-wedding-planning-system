export function validateHallCapacity(wedding, hall) {
  const expectedGuests = Number(wedding.expectedGuests || 0);
  const capacity = Number(hall.capacity || 0);
  const minimumCapacity = Number(hall.minimumCapacity || 0);

  if (expectedGuests > capacity) {
    const err = new Error(`${hall.hallName} supports a maximum of ${capacity} guests.`);
    err.statusCode = 422;
    err.code = 'HALL_CAPACITY_EXCEEDED';
    err.details = {
      expectedGuests,
      hallCapacity: capacity,
      hallName: hall.hallName,
      hallId: hall._id,
      minimumCapacity: minimumCapacity || null,
    };
    throw err;
  }

  if (minimumCapacity > 0 && expectedGuests < minimumCapacity) {
    const err = new Error(`${hall.hallName} requires at least ${minimumCapacity} guests.`);
    err.statusCode = 422;
    err.code = 'HALL_CAPACITY_BELOW_MINIMUM';
    err.details = {
      expectedGuests,
      hallCapacity: capacity,
      hallName: hall.hallName,
      hallId: hall._id,
      minimumCapacity,
    };
    throw err;
  }
}

export function hallCapacityStatus(expectedGuests, hall) {
  const guests = Number(expectedGuests || 0);
  const capacity = Number(hall.capacity || 0);
  const minimum = Number(hall.minimumCapacity || 0);
  if (!guests || !capacity) return { suitable: true, issue: null };
  if (guests > capacity) return { suitable: false, issue: 'too_small' };
  if (minimum > 0 && guests < minimum) return { suitable: false, issue: 'below_minimum' };
  return { suitable: true, issue: null };
}

export function buildHallRecommendations(halls, expectedGuests, { budget } = {}) {
  const guests = Number(expectedGuests || 0);
  if (!guests) return [];

  return halls
    .filter((hall) => guests <= Number(hall.capacity || 0))
    .map((hall) => {
      const slots = hall.slots || {};
      const availableSlots = Object.values(slots).filter((slot) => slot?.available);
      const lowestPrice = availableSlots.length
        ? Math.min(...availableSlots.map((slot) => Number(slot.price || 0)))
        : null;
      return {
        hallId: hall.hallId,
        hallName: hall.hallName,
        capacity: hall.capacity,
        availableSlotCount: availableSlots.length,
        lowestAvailablePrice: lowestPrice,
        withinBudget: budget == null || lowestPrice == null || lowestPrice <= Number(budget),
      };
    })
    .filter((hall) => hall.availableSlotCount > 0)
    .sort((a, b) => {
      if (a.withinBudget !== b.withinBudget) return a.withinBudget ? -1 : 1;
      return Number(a.capacity) - Number(b.capacity);
    })
    .slice(0, 3);
}
