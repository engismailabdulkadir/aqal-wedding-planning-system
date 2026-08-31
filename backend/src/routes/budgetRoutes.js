import { Router } from 'express';
import { createBudgetItem, deleteBudgetItem, getBudget, updateBudgetItem } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/', getBudget);
router.post('/', createBudgetItem);
router.patch('/:id', updateBudgetItem);
router.delete('/:id', deleteBudgetItem);

export default router;
