import { validationResult } from 'express-validator';
import * as authService from '../services/authService.js';

export const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
   
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const result = await authService.verifyUserEmail(req.params.token);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(401);
    next(error);
  }
};

export const login = async (req, res, next) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userData = await authService.loginUser(req.body);
    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
    next(error);
  }
};
