import express from 'express';
import authRoutes from './authRoute.js';
import userRoutes from './userRoute.js';
import gridLineRoutes from './gridLinesRoute.js'
import serviceRoutes from './servicesRoute.js';
import adminRoutes from './adminRoute.js'
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/grid-line',gridLineRoutes)
router.use('/services', serviceRoutes); 
router.use('/admin',adminRoutes)

export default router;
