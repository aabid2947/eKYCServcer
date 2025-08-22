// import express from 'express';
// import { check } from 'express-validator';
// import { register, login, getAdminDashboard ,getAllAdmin} from '../controllers/adminController.js';
// import { protect, authorize } from '../middleware/authMiddleware.js'; // Import new middleware

// const router = express.Router();

// // Public route for an admin to log in. The controller handles the role check.
// router.post(
//   '/login',
//   [
//     check('email', 'Please include a valid email').isEmail(),
//     check('password', 'Password is required').exists(),
//   ],
//   login
// );

// // This route to create new admins is now protected and can only be accessed by existing admins.
// router.post(
//   '/register',
//   protect, // First, ensure user is logged in
//   authorize('admin'), // Then, ensure user has 'admin' role
//   [
//     check('name', 'Name is required').not().isEmpty(),
//     check('email', 'Please include a valid email').isEmail(),
//     check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
//   ],
//   register
// );
// router.get(
//   '/all',
//   protect, // First, ensure user is logged in
//   authorize('admin'), // Then, ensure user has 'admin' role
//   getAllAdmin
// );


// // Protected and Authorized admin dashboard route
// router.get('/dashboard', protect, authorize('admin'), getAdminDashboard);

// export default router