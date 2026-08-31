import { Router } from 'express';
import { createTimelineEvent, deleteTimelineEvent, listTimeline, updateTimelineEvent } from '../controllers/timelineController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(protect);
router.route('/').get(listTimeline).post(createTimelineEvent);
router.route('/:id').patch(validateObjectId(), updateTimelineEvent).delete(validateObjectId(), deleteTimelineEvent);
export default router;
