import express from 'express';
import authRoutes from './authRoute.js';
import userRoutes from './userRoute.js';
import serviceRoutes from './serviceRoute.js'; 
import verificationRoutes from './verificationRoute.js';
import adminRoutes from './adminRoute.js';
import transactionRoutes from './transactionRoute.js'
import  reviewRouter  from './reviewRoute.js';
import paymentRoutes from './PaymentRoute.js';
import couponRoutes from './couponRoute.js'; 
import pricingRoutes from './pricingRoute.js'; 
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// For fetching the list of available services
router.use('/services', serviceRoutes);

// For managing coupons
router.use('/coupons', couponRoutes); // <-- USE NEW ROUTE

//For transaction 
router.use('/transactions', transactionRoutes)

// For review
router.use('/reviews', reviewRouter);
// For submitting a verification request for ANY service
router.use('/verification', verificationRoutes);

router.use('/pricing', pricingRoutes); 
router.use('/payment', paymentRoutes);

export default router;