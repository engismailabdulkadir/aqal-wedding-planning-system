import { Router } from 'express';
import {
  createInvitation,
  deleteInvitation,
  getInvitation,
  listInvitations,
  previewInvitation,
  updateInvitation,
  updateInvitationTemplate,
} from '../controllers/invitationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/preview', previewInvitation);
router.patch('/template', updateInvitationTemplate);
router.route('/').get(listInvitations).post(createInvitation);
router.route('/:id').get(getInvitation).patch(updateInvitation).delete(deleteInvitation);
export default router;
