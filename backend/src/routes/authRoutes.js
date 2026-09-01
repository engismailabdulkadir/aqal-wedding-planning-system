import { Router } from 'express';

import {
  changePassword,
  getCurrentUser,
  login,
  logout,
  register,
  updateProfile,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';


// Router-ka authentication-ka
const router = Router();


// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// Register / Sign Up
// Qof aan login ahayn ayaa isticmaali kara.
router.post('/register', register);


// Login
// Username/email + password ayaa lagu login gareynayaa.
router.post('/login', login);


// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// Logout
// protect ayaa marka hore hubinaya JWT token-ka.
router.post('/logout', protect, logout);


// Soo hel user-ka hadda login-ka ku jira
router.get('/me', protect, getCurrentUser);


// Update profile-ka user-ka
router.patch('/me', protect, updateProfile);


// Change password
// User-ku waa inuu marka hore login yahay.
router.patch('/password', protect, changePassword);


// Auth routes-ka export garee
export default router;