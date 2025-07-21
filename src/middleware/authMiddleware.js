// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';

// Middleware to protect routes by verifying the token
export const protect = async (req, res, next) => {
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];


      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token using the unified User model
      // We exclude the password field from being attached to the request object
      req.user = await User.findById(decoded.id).select('-password');
    

      if (!req.user) {
        console.error("User Not Found")
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      
      return next();

    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Middleware to authorize based on user role
export const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user is attached from the 'protect' middleware
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403); // Forbidden
      return next(new Error(`User role '${req.user.role}' is not authorized to access this route.`));
    }
    next();
  };
};