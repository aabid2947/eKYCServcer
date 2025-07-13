import express from 'express';
import authRoutes from './authRoute.js';
import userRoutes from './userRoute.js';
import serviceRoutes from './serviceRoute.js'; // For listing services
import verificationRoutes from './verificationRoute.js'; // For performing verifications
import adminRoutes from './adminRoute.js';

const router = express.Router();

// Group routes by functionality
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// --- UPDATED ROUTES FOR THE NEW FLOW ---
// For fetching the list of available services
router.use('/services', serviceRoutes);

// For submitting a verification request for ANY service
router.use('/verification', verificationRoutes);

export default router;