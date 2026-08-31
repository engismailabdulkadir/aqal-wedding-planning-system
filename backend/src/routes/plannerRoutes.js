import { Router } from 'express';
import {
  createPlannerTask,
  getAssignedWedding,
  getAssignedWeddings,
  getPlannerDashboard,
  updatePlannerTask,
} from '../controllers/plannerController.js';
import { getReport } from '../controllers/reportController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(protect, requireRole('planner'));
router.get('/dashboard', getPlannerDashboard);
router.get('/weddings', getAssignedWeddings);
router.get('/weddings/:id', validateObjectId(), getAssignedWedding);
router.post('/weddings/:id/tasks', validateObjectId(), createPlannerTask);
router.patch('/tasks/:taskId', updatePlannerTask);
router.get('/reports', getReport);

export default router;
