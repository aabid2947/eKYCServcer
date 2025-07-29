import express from 'express';
import { 
    getUserProfile, 
    getAllUsers, 
    promoteUserCategory,
    demoteUserCategory,
    sendSubscriptionReminder
} from '../controllers/userController.js';
import { protect ,authorize} from '../middleware/authMiddleware.js';

const router = express.Router();

// User's own profile
router.get('/profile', protect, getUserProfile);

// Admin routes for user management
router.route('/all').get( getAllUsers);

// Admin routes for managing user promotions
router.route('/:userId/promote').post(protect, authorize('admin'), promoteUserCategory);
router.route('/:userId/demote').post(protect, authorize('admin'), demoteUserCategory);

router.route('/:userId/send-reminder').post(protect, sendSubscriptionReminder);

export default router;