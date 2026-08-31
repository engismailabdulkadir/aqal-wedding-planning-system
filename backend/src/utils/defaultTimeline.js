import TimelineEvent from '../models/TimelineEvent.js';

function daysBefore(weddingDate, days) {
  const date = new Date(weddingDate);
  date.setDate(date.getDate() - days);
  return date;
}

export function defaultTimelineItems(wedding) {
  const date = wedding.weddingDate;
  return [
    { key: 'book_hall', title: 'Book Hall', description: 'Reserve venue hall, date, and time slot.', dueDate: daysBefore(date, 180), sortOrder: 1 },
    { key: 'choose_bride_dress', title: 'Choose Bride Dress', description: 'Select wedding dress rental or purchase.', dueDate: daysBefore(date, 120), sortOrder: 2 },
    { key: 'choose_groom_suit', title: 'Choose Groom Suit', description: 'Select groom attire.', dueDate: daysBefore(date, 120), sortOrder: 3 },
    { key: 'confirm_catering', title: 'Confirm Catering', description: 'Lock catering package and guest count.', dueDate: daysBefore(date, 90), sortOrder: 4 },
    { key: 'confirm_photographer', title: 'Confirm Photographer', description: 'Confirm photography and videography coverage.', dueDate: daysBefore(date, 75), sortOrder: 5 },
    { key: 'send_invitations', title: 'Send Invitations', description: 'Send digital invitations and track RSVP.', dueDate: daysBefore(date, 45), sortOrder: 6 },
    { key: 'final_guest_count', title: 'Final Guest Count', description: 'Confirm attendees with vendors.', dueDate: daysBefore(date, 14), sortOrder: 7 },
    { key: 'final_payment', title: 'Final Payment', description: 'Clear remaining balances.', dueDate: daysBefore(date, 7), sortOrder: 8 },
    { key: 'wedding_day', title: 'Wedding Day', description: 'Wedding ceremony and reception.', dueDate: date, sortOrder: 9 },
  ];
}

export async function ensureDefaultTimeline(wedding, createdBy = null) {
  const items = defaultTimelineItems(wedding);
  const existing = await TimelineEvent.find({ wedding: wedding._id });
  if (!existing.length) {
    await TimelineEvent.insertMany(items.map((item) => ({ ...item, wedding: wedding._id, createdBy })));
    return;
  }
  for (const item of items) {
    const match = existing.find((event) => event.key === item.key || event.title === item.title);
    if (!match) {
      await TimelineEvent.create({ ...item, wedding: wedding._id, createdBy });
    } else if (!match.key) {
      match.key = item.key;
      await match.save();
    }
  }
}
