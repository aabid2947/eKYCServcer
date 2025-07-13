
import { validationResult } from 'express-validator';
import * as adminAuthService from '../services/adminAuthService.js';

export const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const adminData = await adminAuthService.registerAdmin(req.body);
    res.status(201).json({ success: true, data: adminData });
  } catch (error) {
    // Let the central error handler manage the response
    res.status(400);
    next(error);
  }
};

export const login = async (req, res, next) => {
  console.log(req)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const loginData = await adminAuthService.loginAdmin(req.body);
    res.status(200).json({ success: true, data: loginData });
  } catch (error) {
    // Set status code for failed login attempts
    res.status(401);
    next(error);
  }
};

// Example of a protected admin-only endpoint
export const getAdminDashboard = async (req, res) => {
    // The req.admin object is attached by the protectAdmin middleware
    res.status(200).json({
        success: true,
        message: `Welcome to the admin dashboard, ${req.admin.name}`,
    });
};