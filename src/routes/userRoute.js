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
    updateUserAvatar,
    promoteUserToSubcategory 
} from '../controllers/userController.js';
import { check } from 'express-validator';
import { protect ,authorize} from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; 
const router = express.Router();

// User's  profile
router.get('/profile', protect, getUserProfile);
router.put(
    '/profile/avatar', 
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
router.route('/admin/promote-subcategory').post(protect, authorize('admin'), promoteUserToSubcategory)

//  ADMIN ROUTES FOR SUBSCRIPTION MANAGEMENT
router.route('/admin/extend-subscription').post(protect, authorize('admin'), extendSubscription);
router.route('/admin/revoke-subscription').post(protect, authorize('admin'), revokeSubscription);


export default router;