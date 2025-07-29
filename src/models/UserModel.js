import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SubscriptionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  plan: {
    type: String,
    required: true,
    enum: ['monthly', 'yearly'],
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
      type: [String], // e.g., ["PAN_VERIFICATION", "BANK_VERIFICATION"]
      default: [],
    },
    activeSubscriptions: {
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

// Match entered password to hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and set email verification OTP
UserSchema.methods.getEmailOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.emailOtp = otp;
  this.emailOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Generate and set mobile verification OTP
UserSchema.methods.getMobileOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.mobileOtp = otp;
  this.mobileOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Generate and hash password reset token
UserSchema.methods.getPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire time to 15 minutes
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000;

  return resetToken;
};


const User = mongoose.model('User', UserSchema);
export default User;