import express from 'express';
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Define the fields for multer to handle multiple, named file uploads
const blogImageFields = [
  { name: 'mainImage', maxCount: 1 },
  { name: 'heroImage1', maxCount: 1 },
  { name: 'heroImage2', maxCount: 1 },
  { name: 'howItWorksImage', maxCount: 1 },
  { name: 'trustImage', maxCount: 1 },
];

// Public routes
router.get('/', getAllBlogs);
router.get('/:slug', getBlogBySlug);

// Admin-only routes
router.post('/', protect, authorize('admin'), upload.fields(blogImageFields), createBlog);
router.put('/:id', protect, authorize('admin'), upload.fields(blogImageFields), updateBlog);
router.delete('/:id', protect, authorize('admin'), deleteBlog);

export default router;