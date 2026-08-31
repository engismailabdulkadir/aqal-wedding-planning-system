import { Router } from 'express';
import {
  acceptInvitation,
  acceptJoinRequest,
  createPartnerInvite,
  getMyMembership,
  listJoinRequests,
  listWeddingMembers,
  rejectJoinRequest,
  requestJoinWedding,
  verifyInviteCode,
} from '../controllers/weddingMemberController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.use(protect);

router.get('/verify', verifyInviteCode);
router.post('/verify', verifyInviteCode);
router.get('/my', getMyMembership);
router.post('/invite', createPartnerInvite);
router.post('/join', acceptInvitation);
router.post('/join-request', acceptInvitation);
router.post('/accept-invitation', acceptInvitation);
router.get('/requests', listJoinRequests);
router.post('/:id/accept', validateObjectId(), acceptJoinRequest);
router.post('/:id/reject', validateObjectId(), rejectJoinRequest);
router.get('/wedding/:weddingId', validateObjectId('weddingId'), listWeddingMembers);

export default router;
