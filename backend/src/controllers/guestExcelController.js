import asyncHandler from 'express-async-handler';
import multer from 'multer';
import Guest from '../models/Guest.js';
import { loadAccessibleWedding } from '../utils/weddingAccess.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';
import { isCoupleRole } from '../utils/roles.js';
import {
  buildGuestTemplateBuffer,
  guestsFromPreview,
  parseGuestWorkbook,
  previewGuestImport,
} from '../utils/guestExcelService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .xlsx and .xls files are supported'), ok);
  },
});

function requireCoupleOrAdmin(req, res) {
  if (!isCoupleRole(req.user.role) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the couple or an admin can manage guest imports');
  }
}

export const downloadGuestTemplate = asyncHandler(async (_req, res) => {
  const buffer = buildGuestTemplateBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="guest_template.xlsx"');
  res.send(buffer);
});

export const previewGuestExcel = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    requireCoupleOrAdmin(req, res);
    if (!req.file?.buffer) {
      res.status(400);
      throw new Error('Excel file is required');
    }
    const wedding = await loadAccessibleWedding(req, res, { write: true });
    const rawRows = parseGuestWorkbook(req.file.buffer);
    const existingGuests = await Guest.find({ wedding: wedding._id });
    const preview = previewGuestImport(rawRows, existingGuests);
    res.json({ success: true, preview });
  }),
];

export const importGuestExcel = asyncHandler(async (req, res) => {
  requireCoupleOrAdmin(req, res);
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  const guests = Array.isArray(req.body.guests) ? req.body.guests : guestsFromPreview(req.body.valid || []);

  if (!guests.length) {
    res.status(400);
    throw new Error('No valid guests to import');
  }
  if (guests.length > 1000) {
    res.status(400);
    throw new Error('Maximum 1000 guests per import');
  }

  const payload = guests.map((guest) => ({
    wedding: wedding._id,
    customer: wedding.customer,
    firstName: guest.firstName,
    lastName: guest.lastName || '',
    phone: guest.phone || '',
    email: guest.email || '',
    gender: guest.gender || 'unspecified',
    category: guest.category || 'other',
    side: guest.side || 'shared',
    rsvpStatus: guest.rsvpStatus || 'pending',
    plusOneAllowed: Boolean(guest.plusOneAllowed),
    plusOneName: guest.plusOneName || '',
    numberAttending: guest.numberAttending || 1,
    notes: guest.notes || '',
  }));

  const inserted = await Guest.insertMany(payload);
  await syncWeddingTimelineSafe(wedding._id);

  res.status(201).json({
    success: true,
    imported: inserted.length,
    guests: inserted,
    message: `${inserted.length} guest(s) imported successfully.`,
  });
});
