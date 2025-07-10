import express from 'express';
import { getUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// This route is protected
router.get('/profile', protect, getUserProfile);

export default router;
