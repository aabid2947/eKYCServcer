import express from 'express';
import { check } from 'express-validator';
import { 
    register, 
    login, 
    registerWithMobile,
    loginWithMobile,
    verifyOtp,
    googleSignIn,
    verifyEmailOtp,
    forgotPassword,
    resetPassword,
    simpleRegister
} from '../controllers/authController.js';

const router = express.Router();




router.post(
    '/verify-email-otp',
    [
        check('email', 'Please include a valid email').isEmail(),
        check('otp', 'OTP must be a 6-digit number').isLength({ min: 6, max: 6 }).isNumeric(),
    ],
    verifyEmailOtp
);

router.post(
    '/forgot-password',
    [
        check('email', 'Please include a valid email').isEmail(),
    ],
    forgotPassword
);

router.put(
    '/reset-password', 
    [
        check('token', 'Reset token is required').not().isEmpty(),
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    ],
    resetPassword
);



router.post(
    '/google-signin',
    [
        check('token', 'Google auth token is required').not().isEmpty(),
    ],
    googleSignIn
);

router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  register
);


router.post(
  '/simple-register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  simpleRegister
);
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

router.post(
    '/register-mobile',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
    ],
    registerWithMobile
);

router.post(
    '/login-mobile',
    [
        check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
    ],
    loginWithMobile
);

router.post(
    '/verify-otp', 
    [
        check('mobile', 'Please include a valid 10-digit mobile number').isMobilePhone('en-IN'),
        check('otp', 'OTP must be a 6-digit number').isLength({ min: 6, max: 6 }).isNumeric(),
    ],
    verifyOtp
);


export default router;
