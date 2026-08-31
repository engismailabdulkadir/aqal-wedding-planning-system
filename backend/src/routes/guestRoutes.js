import { Router } from 'express';
import { createGuest, deleteGuest, getGuest, getGuests, updateGuest } from '../controllers/guestController.js';
import {
  downloadGuestTemplate,
  importGuestExcel,
  previewGuestExcel,
} from '../controllers/guestExcelController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/template/download', downloadGuestTemplate);
router.post('/import/preview', previewGuestExcel);
router.post('/import', importGuestExcel);
router.get('/', getGuests);
router.post('/', createGuest);
router.get('/:id', getGuest);
router.patch('/:id', updateGuest);
router.delete('/:id', deleteGuest);

export default router;
