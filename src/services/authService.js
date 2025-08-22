// services/authService.js

import User from '../models/UserModel.js';
import sendEmail from '../utils/sendEmail.js';
import sendSms from '../utils/sendSms.js';
import crypto from 'crypto';
import generateToken from '../utils/generateToken.js';
import { verifyFirebaseToken } from '../utils/firebaseAdmin.js';




export const registerUser = async (userData) => {
  
    const { name, email, password } = userData;
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
        throw new Error('User with this email already exists and is verified.');
    }
    if (user && !user.isVerified) {
    } else {
        user = await User.create({ name, email, password, role: 'user' });
    }
    const otp = user.getEmailOtp();
    await user.save();
    try {
        await sendEmail({
            to: user.email,
            subject: 'Email Verification OTP',
            text: `Your One-Time Password (OTP) for email verification is: ${otp}\nThis OTP is valid for 10 minutes.`,
            html: `<p>Your One-Time Password (OTP) for email verification is: <b>${otp}</b></p><p>This OTP is valid for 10 minutes.</p>`
        });
        return { message: `An OTP has been sent to ${user.email}. Please verify your email.` };
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('User registered, but failed to send verification OTP.');
    }
};

//   VERIFY EMAIL WITH OTP 
export const verifyEmailWithOtp = async (verificationData) => {
    const { email, otp } = verificationData;

    const user = await User.findOne({
        email,
        emailOtp: otp,
        emailOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
        throw new Error('Invalid or expired OTP. Please request a new one.');
    }

    user.isVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    const token = generateToken(user._id, user.role);

    // Return the full user object along with the token
    const userObject = user.toObject();
    delete userObject.password; // Ensure password hash is not sent

    return {
        ...userObject, // Spread all fields from the user object
        token,
        message: 'Email verified successfully.'
    };
};

//  forgot/reset password 
export const forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        return { message: 'If a user with that email exists, a password reset link has been sent.' };
    }
    const resetToken = user.getPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    try {
        await sendEmail({ to: user.email, subject: 'Password Reset Request', text: message, html: `<p>You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>` });
        return { message: 'If a user with that email exists, a password reset link has been sent.' };
    } catch (error) {
        console.error(error);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new Error('Email could not be sent');
    }
};

export const resetPassword = async (token, password) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
    if (!user) {
        throw new Error('Invalid or expired password reset token.');
    }
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return { message: 'Password has been reset successfully.' };
};

//  LOGIN WITH GOOGLE 
export const loginWithGoogle = async (token) => {
    const firebaseUser = await verifyFirebaseToken(token);
    if (!firebaseUser) throw new Error('Invalid or expired Google sign-in token');
    
    let user = await User.findOne({ email: firebaseUser.email });
    if (user) {
        if (!user.googleId) {
            user.googleId = firebaseUser.uid;
            await user.save();
        }
    } else {
        user = await User.create({
            googleId: firebaseUser.uid,
            name: firebaseUser.name,
            email: firebaseUser.email,
            isVerified: firebaseUser.email_verified,
            role: 'user',
        });
    }

    const jwtToken = generateToken(user._id, user.role);
    
    // Return the full user object
    const userObject = user.toObject();
    delete userObject.password;

    return { ...userObject, token: jwtToken };
};

 
export const registerUserWithMobile = async (userData) => {
   
    const { name, mobile } = userData;
    const userExists = await User.findOne({ mobile });
    if (userExists) throw new Error('User with this mobile number already exists');
    const user = new User({ name, mobile, role: 'user' });
    const otp = user.getMobileOtp();
    await user.save();
    try {
        await sendSms(mobile, `Your OTP for registration is: ${otp}`);
        return { message: `OTP sent to ${mobile}` };
    } catch (error) {
        console.error('SMS sending failed:', error);
        throw new Error('User registered, but failed to send OTP.');
    }
};

export const loginUserWithMobile = async (loginData) => {
    const { mobile } = loginData;
    const user = await User.findOne({ mobile });
    if (!user) throw new Error('User with this mobile number not found');
    const otp = user.getMobileOtp();
    await user.save();
    try {
        await sendSms(mobile, `Your OTP for login is: ${otp}`);
        return { message: `OTP sent to ${mobile}` };
    } catch (error) {
        console.error('SMS sending failed:', error);
        throw new Error('Failed to send OTP. Please try again.');
    }
};

//  VERIFY OTP AND LOGIN (MOBILE) 
export const verifyOtpAndLogin = async (verificationData) => {
    const { mobile, otp } = verificationData;
    const user = await User.findOne({
        mobile,
        mobileOtp: otp,
        mobileOtpExpires: { $gt: Date.now() },
    });

    if (!user) throw new Error('Invalid or expired OTP');
    
    user.isVerified = true;
    user.mobileOtp = undefined;
    user.mobileOtpExpires = undefined;
    await user.save();

    const token = generateToken(user._id, user.role);

    //Return the full user object
    const userObject = user.toObject();
    delete userObject.password;

    return { ...userObject, token };
};

export const loginUser = async (loginData) => {
    const { email, password } = loginData;

    // Use .select('+password') to include the password field for comparison
    const user = await User.findOne({ email }).select('+password');
    console.log(user)

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // if (!user.isVerified) {
    //     throw new Error('Please verify your email before logging in.');
    // }
    if(!user.password){
        // Remove user from database if no password is set
        await User.findByIdAndDelete(user._id);
        throw new Error('Account removed due to incomplete setup. Please register again.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = generateToken(user._id, user.role);

    //  Return the full user object but remove the password before sending
    const userObject = user.toObject();
    delete userObject.password; // Crucial step to remove the hashed password

    return { ...userObject, token };
};
