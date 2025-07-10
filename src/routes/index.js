import express from 'express';
import authRoutes from './authRoute.js';
import userRoutes from './userRoute.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
