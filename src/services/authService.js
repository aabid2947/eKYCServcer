// services/authService.js
import User from '../models/UserModel.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import generateToken from '../utils/generateToken.js';

export const registerUser = async (userData) => {
  
    const { name, email, password } = userData;

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error('User already exists');
    }

    const user = await User.create({ name, email, password, role: 'user' });

    await user.save();
    
    return {
      message: 'User registered successfully. Please proceed to login.'
    }
};

export const verifyUserEmail = async (token) => {
    const emailVerificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    const user = await User.findOne({
        emailVerificationToken,
        emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
        throw new Error('Invalid or expired token');
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return { message: 'Email verified successfully.' };
};

export const loginUser = async (loginData) => {
    const { email, password } = loginData;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = generateToken(user._id, user.role);

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, 
        token,
    };
};