// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
import User from "../models/UserModel.js";
export const getUserProfile = async (req, res, next) => {
  // req.user is attached from authMiddleware.protect
  const user = req.user;

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};