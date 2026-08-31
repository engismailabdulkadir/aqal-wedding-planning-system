import XLSX from 'xlsx';

const MAX_IMPORT_ROWS = 1000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const COLUMN_ALIASES = {
  fullName: ['full name', 'fullname', 'name', 'guest name'],
  phone: ['phone', 'phone number', 'mobile', 'telephone'],
  email: ['email', 'e-mail'],
  gender: ['gender', 'sex'],
  category: ['category', 'group type'],
  plusOnes: ['plus ones', 'plus_ones', 'plusones', 'plus one'],
  rsvpStatus: ['rsvp status', 'rsvp_status', 'rsvp', 'status'],
  side: ['side', 'party'],
  notes: ['notes', 'note', 'comments'],
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function mapHeaders(row) {
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const header = normalizeHeader(key);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(header) || header === field) {
        mapped[field] = value;
      }
    }
  }
  return mapped;
}

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function normalizeRsvp(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['attending', 'confirmed', 'accepted', 'yes'].includes(raw)) return 'accepted';
  if (['declined', 'not_attending', 'not attending', 'no'].includes(raw)) return 'declined';
  return 'pending';
}

function normalizeSide(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'shared';
  if (raw === 'both') return 'shared';
  if (raw === 'bride' || raw === 'groom' || raw === 'shared') return raw;
  return 'shared';
}

function normalizeCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  const allowed = ['family', 'friend', 'relative', 'colleague', 'vip', 'other'];
  return allowed.includes(raw) ? raw : 'other';
}

function normalizeGender(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'female' || raw === 'f') return 'female';
  if (raw === 'male' || raw === 'm') return 'male';
  if (raw === 'other') return 'other';
  return 'unspecified';
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

function guestIdentityKey(guest) {
  const phone = normalizePhone(guest.phone);
  const email = String(guest.email || '').trim().toLowerCase();
  const name = `${guest.firstName} ${guest.lastName}`.trim().toLowerCase();
  return `${name}::${phone}::${email}`;
}

export function buildGuestTemplateBuffer() {
  const rows = [
    {
      'Full Name': 'Farhia Jama',
      Phone: '+252611234567',
      Email: 'farhia@example.com',
      Gender: 'Female',
      Category: 'Family',
      'Plus Ones': 0,
      'RSVP Status': 'pending',
      Side: 'bride',
      Notes: 'Table 1',
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Guests');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function parseGuestWorkbook(buffer) {
  if (buffer.length > MAX_FILE_BYTES) {
    const err = new Error('Excel file must be 5 MB or smaller');
    err.statusCode = 400;
    throw err;
  }
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rawRows.length > MAX_IMPORT_ROWS) {
    const err = new Error(`Maximum ${MAX_IMPORT_ROWS} guests per import`);
    err.statusCode = 400;
    throw err;
  }
  return rawRows;
}

export function previewGuestImport(rawRows, existingGuests) {
  const existingKeys = new Set(existingGuests.map((guest) => guestIdentityKey(guest)));
  const previewKeys = new Set();

  const valid = [];
  const duplicates = [];
  const errors = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const mapped = mapHeaders(row);
    const fullName = String(mapped.fullName || '').trim();
    if (!fullName) {
      errors.push({ row: rowNumber, message: `Row ${rowNumber}: Full Name is required.` });
      return;
    }

    const { firstName, lastName } = splitName(fullName);
    const phone = normalizePhone(mapped.phone);
    const email = String(mapped.email || '').trim().toLowerCase();
    const plusOnes = Number(mapped.plusOnes || 0);
    const numberAttending = Number.isFinite(plusOnes) && plusOnes >= 0 ? plusOnes + 1 : 1;

    const guest = {
      firstName,
      lastName,
      phone,
      email,
      gender: normalizeGender(mapped.gender),
      category: normalizeCategory(mapped.category),
      side: normalizeSide(mapped.side),
      rsvpStatus: normalizeRsvp(mapped.rsvpStatus),
      plusOneAllowed: plusOnes > 0,
      plusOneName: plusOnes > 0 ? `${plusOnes} guest(s)` : '',
      numberAttending,
      notes: String(mapped.notes || '').trim(),
    };

    const key = guestIdentityKey(guest);
    if (existingKeys.has(key) || previewKeys.has(key)) {
      duplicates.push({
        row: rowNumber,
        guest,
        message: `Row ${rowNumber}: ${firstName} ${lastName} — Already exists in your guest list.`,
      });
      return;
    }

    previewKeys.add(key);
    valid.push({ row: rowNumber, guest });
  });

  return {
    totalRows: rawRows.length,
    validCount: valid.length,
    duplicateCount: duplicates.length,
    errorCount: errors.length,
    valid,
    duplicates,
    errors,
    previewRows: valid.slice(0, 10).map((item) => item.guest),
  };
}

export function guestsFromPreview(validItems) {
  return validItems.map((item) => item.guest);
}
