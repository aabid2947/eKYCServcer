import { validationResult } from 'express-validator';
import * as authService from '../services/authService.js';



export const verifyEmailOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const result = await authService.verifyEmailWithOtp(req.body);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const result = await authService.forgotPassword(req.body.email);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { token } = req.body;
        const { password } = req.body;
        console.log(req.body);
        const result = await authService.resetPassword(token, password);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


//  EXISTING CONTROLLERS 

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const userData = await authService.loginUser(req.body);
    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const googleSignIn = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { token } = req.body;
        const userData = await authService.loginWithGoogle(token);
        res.status(200).json({ success: true, data: userData });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

export const registerWithMobile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const result = await authService.registerUserWithMobile(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const loginWithMobile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const result = await authService.loginUserWithMobile(req.body);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

export const verifyOtp = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const userData = await authService.verifyOtpAndLogin(req.body);
        res.status(200).json({ success: true, data: userData });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

