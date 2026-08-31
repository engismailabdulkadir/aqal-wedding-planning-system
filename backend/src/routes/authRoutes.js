import { Router } from 'express';
import { changePassword, getCurrentUser, login, logout, register, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getCurrentUser);
router.patch('/me', protect, updateProfile);
router.patch('/password', protect, changePassword);

export default router;
