import express from 'express';
import { 
    getUserProfile, 
    getAllUsers, 
    promoteUserCategory,
    demoteUserCategory,
    sendSubscriptionReminder,
    updateUserProfile,
    getUserById,
    extendSubscription,
    revokeSubscription,
    subscribeToNewsletter,
    updateUserAvatar
} from '../controllers/userController.js';
import { check } from 'express-validator';
import { protect ,authorize} from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; 
const router = express.Router();

// User's own profile
router.get('/profile', protect, getUserProfile);
router.put(
    '/profile/avatar', // This is a more RESTful route path
    protect,
    upload.single('avatar'), 
    updateUserAvatar
);
router.put(
    '/profile',
    [
        check('name', 'Name is required').not().isEmpty(),
    ],
    protect,
    updateUserProfile
);



// General user management
router.route('/all').get(protect, authorize('admin'), getAllUsers);
router.route('/:userId/send-reminder').post(protect, authorize('admin'), sendSubscriptionReminder);

router.route('/:userId').get(protect, authorize('admin'), getUserById);

router.post('/newsletter-subscribe', subscribeToNewsletter);

// Manage promotional categories
router.route('/:userId/promote').post(protect, authorize('admin'), promoteUserCategory);
router.route('/:userId/demote').post(protect, authorize('admin'), demoteUserCategory);


// NEW ADMIN ROUTES FOR SUBSCRIPTION MANAGEMENT
router.route('/admin/extend-subscription').post(protect, authorize('admin'), extendSubscription);
router.route('/admin/revoke-subscription').post(protect, authorize('admin'), revokeSubscription);


export default router;