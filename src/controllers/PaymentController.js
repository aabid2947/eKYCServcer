// Payment controller handling Razorpay integration, subscriptions and transactions
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Transaction from '../models/TransactionModel.js';
import Coupon from '../models/CouponModel.js';
import User from '../models/UserModel.js';

// Initialize Razorpay with API credentials
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Subscription plans configuration
// Prices stored in paise (1 INR = 100 paise)
// Monthly plans have base limits, yearly plans have 12x the monthly limit
const PLAN_CONFIG = {
    Personal: {
        monthly: { price: 499900, limit: 25 },
        yearly: { price: 3849900, limit: 300 }, // 25 * 12
    },
    Professional: {
        monthly: { price: 1899900, limit: 100 },
        yearly: { price: 14629900, limit: 1200 }, // 100 * 12
    },
    Enterprise: {
        monthly: { price: 8999900, limit: 500 },
        yearly: { price: 69299900, limit: 6000 }, // 500 * 12
    }
};

// Creates a new subscription order in Razorpay
// Endpoint: POST /api/payment/order
// Requires authentication
// Handles plan selection, coupon validation, and initial order creation
export const createSubscriptionOrder = async (req, res, next) => {
    try {
        // 'plan' is the type ('monthly' or 'yearly'), 'category' is the name ('Personal', 'Professional')
        const { category, plan, couponCode } = req.body;
        const user = await User.findById(req.user.id);

        if (!category || !plan) {
            res.status(400);
            throw new Error('Category and plan type (monthly/yearly) are required.');
        }

        // Check if user already has an active subscription for this category
        const hasActiveSubscription = user.activeSubscriptions.some(sub => 
            sub.category === category && sub.expiresAt > new Date()
        );

        if (hasActiveSubscription) {
            res.status(400);
            throw new Error(`You already have an active subscription for the ${category} plan.`);
        }

        // Get plan pricing and limits from configuration
        const planDetails = PLAN_CONFIG[category]?.[plan];
        if (!planDetails) {
            res.status(404);
            throw new Error(`Pricing for plan '${category} - ${plan}' not found.`);
        }
        // Convert amount from paise to rupees for coupon calculation
        const originalAmountInRupees = planDetails.price / 100;

        let finalAmountInRupees = originalAmountInRupees;
        let discountValue = 0;
        let appliedCoupon = null;

        // Coupon logic - This was well-written and remains unchanged.
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon) {
                const isExpired = coupon.expiryDate && coupon.expiryDate < new Date();
                const isUsedUp = coupon.maxUses && coupon.timesUsed >= coupon.maxUses;
                const meetsMinAmount = originalAmountInRupees >= coupon.minAmount;
                const isApplicable = coupon.applicableCategories.length === 0 || coupon.applicableCategories.includes(category);
                
                if (!isExpired && !isUsedUp && meetsMinAmount && isApplicable) {
                    appliedCoupon = coupon;
                    discountValue = (coupon.discount.type === 'fixed')
                        ? coupon.discount.value
                        : (originalAmountInRupees * coupon.discount.value) / 100;
                    finalAmountInRupees = Math.max(0, originalAmountInRupees - discountValue);
                }
            }
        }
        
        // Handle cases where the final amount is zero (100% discount)
        if (finalAmountInRupees <= 0) {
            const now = new Date();
            const expiresAt = plan === 'monthly'
                ? new Date(new Date().setMonth(now.getMonth() + 1))
                : new Date(new Date().setFullYear(now.getFullYear() + 1));
            
            const newSubscription = {
                category: category,
                planType: plan,
                usageLimit: planDetails.limit,
                expiresAt: expiresAt,
            };

            user.activeSubscriptions.push(newSubscription);
            await user.save();

            // Optionally, create a transaction record for this free activation
            await Transaction.create({
                user: user._id,
                category: category,
                plan: plan,
                status: 'completed',
                amount: 0,
                originalAmount: originalAmountInRupees,
                discountApplied: originalAmountInRupees,
                couponCode: appliedCoupon ? appliedCoupon.code : 'PROMOTIONAL_FREE',
            });

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
            amount: Math.round(finalAmountInRupees * 100), // Amount in paise
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await razorpay.orders.create(options);

        // Create a pending transaction
        const transaction = await Transaction.create({
            user: user.id,
            category: category,
            plan: plan,
            status: 'pending',
            amount: finalAmountInRupees,
            originalAmount: originalAmountInRupees,
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

// Verifies Razorpay payment and activates user subscription
// Endpoint: POST /api/payment/verify
// Requires authentication
// Handles signature verification, subscription activation, and coupon processing
export const verifySubscriptionPayment = async (req, res, next) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        transactionId,
    } = req.body;

    let transaction;
    try {
        transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            res.status(404);
            throw new Error('Transaction not found.');
        }

        if (transaction.status !== 'pending') {
             res.status(400);
             throw new Error(`This transaction has already been processed with status: ${transaction.status}.`);
        }
        
        // Verify the payment signature
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

        // Payment signature verified successfully

        // Mark transaction as completed and store payment details
        transaction.status = 'completed';
        transaction.razorpay_payment_id = razorpay_payment_id;
        transaction.razorpay_signature = razorpay_signature;
        await transaction.save();

        // Retrieve subscription plan details from config
        const planDetails = PLAN_CONFIG[transaction.category]?.[transaction.plan];
        if (!planDetails) {
            // Safety check to prevent invalid subscriptions
            throw new Error('Could not find plan details during subscription activation.');
        }

        // Set subscription expiry based on plan type (monthly/yearly)
        const now = new Date();
        const expiresAt = transaction.plan === 'monthly'
            ? new Date(new Date().setMonth(now.getMonth() + 1))
            : new Date(new Date().setFullYear(now.getFullYear() + 1));

        // Create new subscription record with plan details and limits
        const newSubscription = {
            category: transaction.category,
            planType: transaction.plan,
            razorpaySubscriptionId: razorpay_payment_id, // Use payment_id as a reference
            usageLimit: planDetails.limit,
            purchasedAt: now,
            expiresAt: expiresAt,
        };

        // Add new subscription to user's active subscriptions list
        await User.findByIdAndUpdate(transaction.user, {
            $push: { activeSubscriptions: newSubscription }
        });

        // Update coupon usage count if discount was applied
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
        // If an error occurs after payment, mark the transaction as failed for manual review
        if(transaction && transaction.status === 'pending') {
            transaction.status = 'failed';
            transaction.metadata = { reason: 'Subscription activation failed after payment.', error: error.message };
            await transaction.save();
        }
        next(error);
    }
};