// controllers/PaymentController.js

import Razorpay from 'razorpay';
import crypto from 'crypto';
import Service from '../models/Service.js';
import Transaction from '../models/TransactionModel.js';
import Coupon from '../models/CouponModel.js';
import User from '../models/UserModel.js';

// Initialize Razorpay client
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create a Razorpay Order for a CATEGORY SUBSCRIPTION.
 * @route   POST /api/payment/order
 * @access  Private
 */
export const createSubscriptionOrder = async (req, res, next) => {
    try {
        const { category, plan, couponCode } = req.body;
        const user = await User.findById(req.user.id);

        if (!category || !plan) {
            res.status(400);
            throw new Error('Category and plan are required.');
        }

        // --- FIX 1: Use optional chaining (?.) for a safe check ---
        // This will work even if user.promotedCategories is undefined.
        if (user.promotedCategories?.includes(category)) {
            res.status(400);
            throw new Error(`You are already subscribed to the ${category} category.`);
        }

        const serviceForPricing = await Service.findOne({ category });
        if (!serviceForPricing || !serviceForPricing.combo_price) {
            res.status(404);
            throw new Error(`Pricing for category '${category}' not found.`);
        }

        const originalAmount = serviceForPricing.combo_price[plan];
        if (typeof originalAmount !== 'number') {
             res.status(400);
             throw new Error(`Invalid plan '${plan}' for the selected category.`);
        }

        let finalAmount = originalAmount;
        let discountValue = 0;
        let appliedCoupon = null;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon) {
                const isExpired = coupon.expiryDate && coupon.expiryDate < new Date();
                const isUsedUp = coupon.maxUses && coupon.timesUsed >= coupon.maxUses;
                const meetsMinAmount = originalAmount >= coupon.minAmount;
                const isApplicable = coupon.applicableCategories.length === 0 || coupon.applicableCategories.includes(category);

                if (!isExpired && !isUsedUp && meetsMinAmount && isApplicable) {
                    appliedCoupon = coupon;
                    discountValue = (coupon.discount.type === 'fixed')
                        ? coupon.discount.value
                        : (originalAmount * coupon.discount.value) / 100;
                    finalAmount = Math.max(0, originalAmount - discountValue);
                }
            }
        }

        if (finalAmount <= 0) {
            await Transaction.create({
                user: user._id,
                category: category,
                plan: plan,
                status: 'completed',
                amount: 0,
                originalAmount: originalAmount,
                discountApplied: originalAmount,
                couponCode: appliedCoupon ? appliedCoupon.code : 'PROMOTIONAL_FREE',
            });

            if (!user.promotedCategories) {
                user.promotedCategories = [];
            }
            user.promotedCategories.push(category);
            await user.save();
            
            if (appliedCoupon) {
                appliedCoupon.timesUsed += 1;
                await appliedCoupon.save();
            }

            return res.status(200).json({
                success: true,
                paymentSkipped: true,
                message: 'Subscription activated successfully with a full discount.',
            });
        }

        const options = {
            amount: Math.round(finalAmount * 100),
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await razorpay.orders.create(options);

        const transaction = await Transaction.create({
            user: user.id,
            category: category,
            plan: plan,
            status: 'pending',
            amount: finalAmount,
            originalAmount: originalAmount,
            discountApplied: discountValue,
            couponCode: appliedCoupon ? appliedCoupon.code : undefined,
            razorpay_order_id: order.id,
        });

        res.status(201).json({
            success: true,
            paymentSkipped: false,
            order,
            key_id: process.env.RAZORPAY_KEY_ID,
            transactionId: transaction._id,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify subscription payment and activate the subscription
 * @route   POST /api/payment/verify
 * @access  Private
 */
export const verifySubscriptionPayment = async (req, res, next) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        transactionId,
    } = req.body;

    try {
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            res.status(404);
            throw new Error('Transaction not found.');
        }

        if (transaction.status !== 'pending') {
             res.status(400);
             throw new Error(`This transaction has already been processed with status: ${transaction.status}.`);
        }

        const hmac_body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(hmac_body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            transaction.status = 'failed';
            transaction.metadata = { reason: 'Payment verification failed: Signature mismatch.' };
            await transaction.save();
            res.status(400);
            throw new Error('Payment verification failed. Invalid signature.');
        }

        // --- PAYMENT IS VERIFIED ---

        // 1. Update Transaction to 'completed'
        transaction.status = 'completed';
        transaction.razorpay_payment_id = razorpay_payment_id;
        transaction.razorpay_signature = razorpay_signature;
        await transaction.save();

        // --- THIS IS THE FIX ---
        // Create a proper subscription object that matches the UserModel schema

        // 2. Calculate the expiry date based on the plan
        const now = new Date();
        const expiresAt = new Date();
        if (transaction.plan === 'monthly') {
            expiresAt.setMonth(now.getMonth() + 1);
        } else if (transaction.plan === 'yearly') {
            expiresAt.setFullYear(now.getFullYear() + 1);
        } else {
            // Default fallback to 30 days if plan is somehow invalid
            expiresAt.setDate(now.getDate() + 30);
        }

        // 3. Construct the new subscription object
        const newSubscription = {
            category: transaction.category,
            plan: transaction.plan,
            purchasedAt: now,
            expiresAt: expiresAt,
        };

        // 4. Update the User document with BOTH the subscription object and the promoted category
        await User.findByIdAndUpdate(transaction.user, {
            $addToSet: { promotedCategories: transaction.category }, // For quick access control
            $push: { activeSubscriptions: newSubscription }      // For tracking expiry and details
        });

        // 5. Increment Coupon Usage Count (this part was already correct)
        if (transaction.couponCode) {
            await Coupon.updateOne(
                { code: transaction.couponCode },
                { $inc: { timesUsed: 1 } }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Subscription activated successfully!',
        });

    } catch (error) {
        const t = await Transaction.findById(transactionId);
        if(t && t.status === 'pending') {
            t.status = 'failed';
            t.metadata = { reason: 'Subscription activation failed after payment.', error: error.message };
            await t.save();
        }
        next(error);
    }
};