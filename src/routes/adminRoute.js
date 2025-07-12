

import express from 'express';
import { check ,param,body} from 'express-validator';
import { register, login, getAdminDashboard } from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { createService,updateService,deleteService } from '../controllers/serviceManagement.js';
const router = express.Router();

// @route   POST /api/admin/register
// @desc    Register a new admin
// @access  Public (should be restricted in production)
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 8 or more characters').isLength({ min: 8 }),
  ],
  register
);

// @route   POST /api/admin/login
// @desc    Authenticate admin & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

// @route   GET /api/admin/dashboard
// @desc    Example protected route for admins
// @access  Private/Admin
router.get('/dashboard', protectAdmin, getAdminDashboard);

router.post(
  '/services',
  protectAdmin,
  [
    body('name', 'Service name is required').not().isEmpty().trim(),
    body('description', 'Description is required').not().isEmpty().trim(),
    body('imageUrl', 'A valid image URL is required').isURL(),
    body('price', 'Price must be a non-negative number').isFloat({ min: 0 }),
    body('discount.type').optional().isIn(['percentage', 'fixed']),
    body('discount.value').optional().isFloat({ min: 0 }),
  ],
  createService
);

// @route   PUT /api/admin/services/:serviceId
// @desc    Update a service
// @access  Private/Admin
router.put(
  '/services/:serviceId',
  protectAdmin,
  [
    param('serviceId').isMongoId().withMessage('Invalid Service ID'),
    // Validations for update are optional, but if provided, they should be valid
    body('name').optional().not().isEmpty().trim(),
    body('description').optional().not().isEmpty().trim(),
    body('imageUrl').optional().isURL(),
    body('price').optional().isFloat({ min: 0 }),
    body('discount').optional({ nullable: true }).isObject(),
    body('discount.type').optional().isIn(['percentage', 'fixed']),
    body('discount.value').optional().isFloat({ min: 0 }),
  ],
  updateService
);

// @route   DELETE /api/admin/services/:serviceId
// @desc    Delete a service
// @access  Private/Admin
router.delete(
  '/services/:serviceId',
  protectAdmin,
  [param('serviceId').isMongoId().withMessage('Invalid Service ID')],
  deleteService
);

export default router;