// models/UserModel.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SubscriptionSchema = new mongoose.Schema({
  category: { // The category this subscription unlocks, e.g., "Professional"
    type: String,
    required: true,
  },
  planType: { 
    type: String,
    required: true,
    enum: ['monthly', 'yearly'],
  },
  razorpaySubscriptionId: { // To track the subscription in your payment gateway
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values but unique if present
  },
  usageLimit: { // The number of verifications included in the plan
    type: Number,
    required: true,
  },
   
  usageCount: { // Starts at 0 and increments with each use
    type: Number,
    default: 0,
  },
  purchasedAt: {
    type: Date,
    default: Date.now,
  },
  
  expiresAt: {
    type: Date,
    required: true,
  }
}, { _id: false });

const UsedServiceSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  serviceName: {
    type: String,
    required: true,
  },
  usageCount: {
    type: Number,
    required: true,
    default: 0,
  },
}, { _id: false });

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
     avatar: {
      type: String, // This will store the Cloudinary URL
      default: '',
    },
    mobile: {
      type: String,
      unique: true,
      sparse: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
      isSubscribedToNewsletter: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    promotedCategories: {
      type: [String], // For free-tier access granted by admins
      default: [],
    },
    activeSubscriptions: { // This holds the array of paid plans
      type: [SubscriptionSchema],
      default: [],
    },
    emailOtp: String,
    emailOtpExpires: Date,
    mobileOtp: String,
    mobileOtpExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    usedServices: [UsedServiceSchema],
  },
  { timestamps: true }
);


// Middleware to ensure either email or mobile is provided
UserSchema.pre('save', function (next) {
  if (this.googleId) return next();
  if (!this.email && !this.mobile) {
    return next(new Error('Either email or mobile number is required.'));
  }
  next();
});

// Middleware to ensure password is provided for standard email registration
UserSchema.pre('save', function (next) {
  if (this.googleId || this.isModified('password')) return next();
  if (this.email && !this.password && this.isNew) {
    return next(new Error('Password is required for email registration.'));
  }
  next();
});

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getEmailOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailOtp = otp;
  this.emailOtpExpires = Date.now() + 10 * 60 * 1000;
  return otp;
};

UserSchema.methods.getMobileOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.mobileOtp = otp;
  this.mobileOtpExpires = Date.now() + 10 * 60 * 1000;
  return otp;
};

UserSchema.methods.getPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', UserSchema);
export default User;