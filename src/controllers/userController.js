// controllers/userController.js
import User from "../models/UserModel.js";
import sendEmail from "../utils/sendEmail.js";
import { validationResult } from 'express-validator';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../utils/cloudinary.js';
import Service from "../models/Service.js";
// @desc    Get user profile (current logged-in user)
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isVerified: user.isVerified,
      promotedCategories: user.promotedCategories,
      activeSubscriptions: user.activeSubscriptions,
      usedServices: user.usedServices,
      role: user.role,
      createdAt: user.createdAt,
      password: !!user.password // Send a boolean indicating if a password is set
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

export const promoteUserToSubcategory = async (req, res, next) => {
    try {
         const { userId, subcategory, multiplier } = req.body;
        // Default to 1 if multiplier is not provided or invalid
        const promotionMultiplier = parseInt(multiplier, 10) || 1; 
        if (!userId || !subcategory) {
            res.status(400);
            throw new Error('User ID and subcategory are required.');
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        // Find all services in the subcategory to determine the usage limit
        const servicesInSubcategory = await Service.find({ subcategory: subcategory });
        if (servicesInSubcategory.length === 0) {
            res.status(404);
            throw new Error(`No services found for subcategory: '${subcategory}'`);
        }
        console.log(90)

        const usageLimit = servicesInSubcategory.length * promotionMultiplier;
        const now = new Date();
        const expiresAt = new Date(new Date().setMonth(now.getMonth() + 1));
        console.log(90)

        // Remove any pre-existing subscription for this subcategory to ensure a clean 1-month promotion
        user.activeSubscriptions = user.activeSubscriptions.filter(s => s.category !== subcategory);
        console.log(90)

        // Add the new promotional subscription
        user.activeSubscriptions.push({
            category: subcategory,
            planType: 'promotional',
            usageLimit: usageLimit,
            purchasedAt: now,
            expiresAt: expiresAt,
            isPromotion: true,
        });
        console.log(90)

        // Add to promotedCategories array for easier UI lookup
        if (!user.promotedCategories.includes(subcategory)) {
            user.promotedCategories.push(subcategory);
        }
        console.log(9)

        await user.save();
        console.log(90)

        res.status(200).json({
            success: true,
            message: `User ${user.name} promoted successfully for subcategory ${subcategory}.`,
            data: user,
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get all users (Admin)
// @route   GET /api/users/all
// @access  Private/Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single user by ID (Admin)
// @route   GET /api/users/:userId
// @access  Private/Admin
export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId).select('-password'); // Exclude password hash

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        // Return the full user object, including subscriptions, used services, etc.
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile, // Include mobile if exists
            isVerified: user.isVerified,
            promotedCategories: user.promotedCategories,
            activeSubscriptions: user.activeSubscriptions,
            usedServices: user.usedServices,
            role: user.role,
            createdAt: user.createdAt,
            password: !!user.password, // Indicate if a password is set (for Google sign-in users)
        });

    } catch (error) {
        next(error);
    }
};


// @desc    Update user profile (current logged-in user)
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    const errors = validationResult(req);
    const userId = req.user ? req.user._id : null;
   

    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized, no user ID provided.' });
        }

        const { name, email } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (name) user.name = name;
        if (email) user.email = email;

        const updatedUser = await user.save();

        res.status(200).json({
            success: true,
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isVerified: updatedUser.isVerified,
                
                promotedCategories: updatedUser.promotedCategories,
                activeSubscriptions: updatedUser.activeSubscriptions, // Ensure this is returned
                usedServices: updatedUser.usedServices,
                role: updatedUser.role,
                createdAt: updatedUser.createdAt,
                password: !!updatedUser.password // Boolean for password status
            }
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


// @desc    Promote/Demote users
export const promoteUserCategory = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!category) {
            res.status(400);
            throw new Error('Category is required');
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $addToSet: { promotedCategories: category } },
            { new: true, runValidators: true }
        );

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} promoted for category ${category}.`,
            data: user.promotedCategories,
        });

    } catch (error) {
        next(error);
    }
};

export const demoteUserCategory = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!category) {
            res.status(400);
            throw new Error('Category is required');
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $pull: { promotedCategories: category } },
            { new: true }
        );

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        res.status(200).json({
            success: true,
            message: `User ${user.name} demoted from category ${category}.`,
            data: user.promotedCategories,
        });

    } catch (error) {
        next(error);
    }
};

export const sendSubscriptionReminder = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        if (!user.activeSubscriptions || user.activeSubscriptions.length === 0) {
            res.status(400);
            throw new Error('This user does not have any active subscriptions.');
        }

        const sortedSubscriptions = user.activeSubscriptions.sort(
            (a, b) => a.expiresAt - b.expiresAt
        );
        const nextExpiringSub = sortedSubscriptions[0];
        
        const now = new Date();
        if (nextExpiringSub.expiresAt < now) {
             res.status(400);
             throw new Error(`This user's subscription for "${nextExpiringSub.category}" already expired on ${nextExpiringSub.expiresAt.toDateString()}.`);
        }

        const expiresInDays = Math.ceil((nextExpiringSub.expiresAt - now) / (1000 * 60 * 60 * 24));

        const subject = `Your Subscription for "${nextExpiringSub.category}" is Expiring Soon!`;
        const text = `Hi ${user.name},\n\n` +
                     `This is a friendly reminder that your ${nextExpiringSub.planType} subscription for the "${nextExpiringSub.category}" category is set to expire in ${expiresInDays} day(s) on ${nextExpiringSub.expiresAt.toDateString()}.\n\n` +
                     `To ensure uninterrupted access to our services, please renew your subscription at your earliest convenience.\n\n` +
                     `Thank you for being a valued member!\n` +
                     `The Team`;

        const html = `<p>Hi ${user.name},</p>` +
                     `<p>This is a friendly reminder that your <strong>${nextExpiringSub.planType}</strong> subscription for the <strong>"${nextExpiringSub.category}"</strong> category is set to expire in <strong>${expiresInDays} day(s)</strong> on ${nextExpiringSub.expiresAt.toDateString()}.</p>` +
                     `<p>To ensure uninterrupted access to our services, please renew your subscription at your earliest convenience.</p>` +
                     `<p>Thank you for being a valued member!<br>The Team</p>`;
        
        await sendEmail({
            to: user.email,
            subject: subject,
            text: text,
            html: html
        });

        res.status(200).json({
            success: true,
            message: `Subscription reminder for "${nextExpiringSub.category}" has been successfully sent to ${user.email}.`
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Extend a user's subscription (Admin)
 * @route   POST /api/users/admin/extend-subscription
 * @access  Private/Admin
 */
export const extendSubscription = async (req, res, next) => {
    try {
        const { userId, category, duration } = req.body;

        if (!userId || !category || !duration || typeof duration.value !== 'number' || !['months', 'days', 'years'].includes(duration.unit)) {
            res.status(400);
            throw new Error('User ID, category, and valid duration (value, unit) are required.');
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        const subIndex = user.activeSubscriptions.findIndex(s => s.category === category);
        if (subIndex === -1) {
            res.status(404);
            throw new Error('User does not have an active paid subscription for this category.');
        }

        const currentExpiry = user.activeSubscriptions[subIndex].expiresAt;
        const newExpiry = new Date(currentExpiry);

        if (duration.unit === 'months') {
            newExpiry.setMonth(newExpiry.getMonth() + duration.value);
        } else if (duration.unit === 'days') {
            newExpiry.setDate(newExpiry.getDate() + duration.value);
        } else if (duration.unit === 'years') {
            newExpiry.setFullYear(newExpiry.getFullYear() + duration.value);
        } else {
            res.status(400);
            throw new Error('Invalid duration unit specified. Must be "months", "days", or "years".');
        }
        // Ensure the new expiry date is not in the past
        if (newExpiry < currentExpiry) {
             res.status(400);
             throw new Error('New expiry date cannot be earlier than current expiry date. Ensure the extension duration is positive.');
        }


        user.activeSubscriptions[subIndex].expiresAt = newExpiry;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Subscription for ${category} extended successfully. New expiry: ${newExpiry.toDateString()}`,
            data: user.activeSubscriptions,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Revoke a user's subscription or promotion (Admin)
 * @route   POST /api/users/admin/revoke-subscription
 * @access  Private/Admin
 */
export const revokeSubscription = async (req, res, next) => {
    try {
        const { userId, category } = req.body;

        if (!userId || !category) {
            res.status(400);
            throw new Error('User ID and category are required.');
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    activeSubscriptions: { category: category }, // Pull from paid subscriptions
                    promotedCategories: category,                // Pull from promotional categories
                },
            },
            { new: true } // Return the updated document
        );

        res.status(200).json({
            success: true,
            message: `All access for category "${category}" has been revoked for user ${updatedUser.name}.`,
            data: {
                activeSubscriptions: updatedUser.activeSubscriptions,
                promotedCategories: updatedUser.promotedCategories,
            }
        });

    } catch (error) {
        next(error);
    }
};

export const subscribeToNewsletter = async (req, res) => {
  const { email } = req.body;

  // 1. Basic validation
  if (!email) {
    res.status(400);
    throw new Error('Email is required.');
  }

  // 2. Find the user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(200).json({
    message: 'Thank you for subscribing to our newsletter!',
    email,
  });
  }

  // 3. Check if already subscribed
  if (user.isSubscribedToNewsletter) {
    res.status(409);
    throw new Error('This email is already subscribed to our newsletter.');
  }

  // 4. Update only the newsletter subscription field
  await User.updateOne({ email }, { $set: { isSubscribedToNewsletter: true } });

  // 5. Send success response
  res.status(200).json({
    message: 'Thank you for subscribing to our newsletter!',
    email,
  });
};


// @desc    Update user avatar
// @route   PUT /api/users/profile/avatar
// @access  Private
export const updateUserAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    if (!req.file) {
      // --- FIX: Set status code before throwing error ---
      res.status(400); 
      throw new Error('No image file uploaded');
    }

    // If user already has an avatar, delete it from Cloudinary
    if (user.avatar) {
      const publicId = getPublicIdFromUrl(user.avatar);
      await deleteFromCloudinary(publicId);
    }

    // Upload new avatar to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'avatars');
    
    user.avatar = result.secure_url;
   
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};