// controllers/userController.js
import User from "../models/UserModel.js";
import sendEmail from "../utils/sendEmail.js";
// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  // req.user is attached from authMiddleware.protect
  const user = await User.findById(req.user.id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      promotedCategories: user.promotedCategories, 
    });
  } else {
    res.status(404);
    throw new Error('User not found');
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

// @desc    Promote a user to a free service category (Admin)
// @route   POST /api/users/:userId/promote
// @access  Private/Admin
export const promoteUserCategory = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!category) {
            res.status(400);
            throw new Error('Category is required');
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $addToSet: { promotedCategories: category } }, // $addToSet prevents duplicates
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

// @desc    Demote a user from a free service category (Admin)
// @route   POST /api/users/:userId/demote
// @access  Private/Admin
export const demoteUserCategory = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!category) {
            res.status(400);
            throw new Error('Category is required');
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $pull: { promotedCategories: category } }, // $pull removes the item
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

/**
 * @desc    Send a subscription expiry reminder to a specific user
 * @route   POST /api/users/:userId/send-reminder
 * @access  Private/Admin
 */
export const sendSubscriptionReminder = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            res.status(404);
            throw new Error('User not found.');
        }

        // Check if the user has any active subscriptions
        if (!user.activeSubscriptions || user.activeSubscriptions.length === 0) {
            res.status(400);
            throw new Error('This user does not have any active subscriptions.');
        }

        // Find the subscription that will expire next
        const sortedSubscriptions = user.activeSubscriptions.sort(
            (a, b) => a.expiresAt - b.expiresAt
        );
        const nextExpiringSub = sortedSubscriptions[0];
        
        const now = new Date();
        // Check if the subscription has already expired
        if (nextExpiringSub.expiresAt < now) {
             res.status(400);
             throw new Error(`This user's subscription for "${nextExpiringSub.category}" already expired on ${nextExpiringSub.expiresAt.toDateString()}.`);
        }

        // Calculate the number of days remaining
        const expiresInDays = Math.ceil((nextExpiringSub.expiresAt - now) / (1000 * 60 * 60 * 24));

        // Prepare and send the email
        const subject = `Your Subscription for "${nextExpiringSub.category}" is Expiring Soon!`;
        
        const text = `Hi ${user.name},\n\n` +
                     `This is a friendly reminder that your ${nextExpiringSub.plan} subscription for the "${nextExpiringSub.category}" category is set to expire in ${expiresInDays} day(s) on ${nextExpiringSub.expiresAt.toDateString()}.\n\n` +
                     `To ensure uninterrupted access to our services, please renew your subscription at your earliest convenience.\n\n` +
                     `Thank you for being a valued member!\n` +
                     `The Team`;

        const html = `<p>Hi ${user.name},</p>` +
                     `<p>This is a friendly reminder that your <strong>${nextExpiringSub.plan}</strong> subscription for the <strong>"${nextExpiringSub.category}"</strong> category is set to expire in <strong>${expiresInDays} day(s)</strong> on ${nextExpiringSub.expiresAt.toDateString()}.</p>` +
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