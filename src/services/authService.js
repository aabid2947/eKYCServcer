import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import generateToken from '../utils/generateToken.js';

export const registerUser = async (userData) => {
    console.log(userData)
    const { name, email, password } = userData;

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error('User already exists');
    }

    const user = await User.create({ name, email, password });

    // Create verification token
    //   const verificationToken = user.getEmailVerificationToken();
    //   await user.save({ validateBeforeSave: false });

    // Create verification URL
    //   const verificationUrl = `${process.env.CLIENT_URL}/verifyemail/${verificationToken}`;
    //   const message = `Please verify your email by clicking on the following link: \n\n ${verificationUrl}`;
    await user.save();
    // try {
    //     await sendEmail({
    //         email: user.email,
    //         subject: 'Email Verification',
    //         message,
    //     });
    //     return {
    //         message: `An email has been sent to ${user.email} with further instructions.`,
    //     };
    // } catch (err) {
    //     console.error(err);
    //     user.emailVerificationToken = undefined;
    //     user.emailVerificationExpires = undefined;
    //     await user.save({ validateBeforeSave: false });
    //     throw new Error('Email could not be sent');
    // }
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

    if (!user.isVerified) {
        throw new Error('Please verify your email to log in');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = generateToken(user._id);

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
    };
};
