import { Router } from 'express';
import { createWedding, deleteWedding, getMyWedding, getMyWeddings, getWedding, updateWedding } from '../controllers/weddingController.js';
import { getWeddingManagement, getWeddingOverview } from '../controllers/weddingManagementController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(protect);
router.post('/', createWedding);
router.get('/', getMyWeddings);
router.get('/my-wedding', getMyWedding);
router.get('/:id/overview', validateObjectId(), getWeddingOverview);
router.get('/:id/management', validateObjectId(), getWeddingManagement);
router.get('/:id', validateObjectId(), getWedding);
router.put('/:id', validateObjectId(), updateWedding);
router.patch('/:id', validateObjectId(), updateWedding);
router.delete('/:id', validateObjectId(), deleteWedding);

export default router;
