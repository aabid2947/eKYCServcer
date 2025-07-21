import express from 'express';
import { getUserProfile,getAllUsers } from '../controllers/userController.js';
import { protect ,authorize} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.route('/all').get(protect, authorize('admin'), getAllUsers);
export default router;
