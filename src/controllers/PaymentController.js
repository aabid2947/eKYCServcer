// Payment controller handling Razorpay integration, subscriptions and transactions
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Transaction from '../models/TransactionModel.js';
import Coupon from '../models/CouponModel.js';
import User from '../models/UserModel.js';
import PricingPlan from '../models/PricingModel.js'; // <-- IMPORT THE NEW PRICING MODEL

// Initialize Razorpay with API credentials
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Creates a new subscription order in Razorpay
// Endpoint: POST /api/payment/order
// Requires authentication
// Handles plan selection, coupon validation, and initial order creation
export const createSubscriptionOrder = async (req, res, next) => {
    try {
        // MODIFIED: 'category' is now 'planName', and 'plan' is 'planType' for clarity
        const { planName, planType, couponCode } = req.body;
        const user = await User.findById(req.user.id);

        if (!planName || !planType) {
            res.status(400);
            throw new Error('Plan name and plan type (monthly/yearly) are required.');
        }

        // MODIFIED: Logic to block re-purchase is removed to allow renewals.
        // The renewal logic is handled after payment verification or in the free plan section.

        // MODIFIED: Get plan pricing and limits from the database instead of a static object
        const pricingPlan = await PricingPlan.findOne({ name: planName });
        if (!pricingPlan) {
            res.status(404);
            throw new Error(`Pricing for plan '${planName}' not found.`);
        }

        const planDetails = pricingPlan[planType];
        if (!planDetails || typeof planDetails.price === 'undefined' || typeof planDetails.limitPerMonth === 'undefined') {
            res.status(404);
            throw new Error(`Pricing details for plan '${planName} - ${planType}' are incomplete.`);
        }

        const originalAmountInRupees = planDetails.price;
        const usageLimit = planDetails.limitPerMonth;

        let finalAmountInRupees = originalAmountInRupees;
        let discountValue = 0;
        let appliedCoupon = null;

        // Coupon logic - updated to check against planName
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon) {
                const isExpired = coupon.expiryDate && coupon.expiryDate < new Date();
                const isUsedUp = coupon.maxUses && coupon.timesUsed >= coupon.maxUses;
                const meetsMinAmount = originalAmountInRupees >= coupon.minAmount;
                // MODIFIED: Applicable categories now map to plan names
                const isApplicable = coupon.applicableCategories.length === 0 || coupon.applicableCategories.includes(planName);
                
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
            // UPDATED: Handle renewal for free plans
            const existingSubIndex = user.activeSubscriptions.findIndex(sub => 
                sub.category === planName && sub.expiresAt > now
            );

            if (existingSubIndex > -1) {
                // RENEW an existing subscription
                const existingSub = user.activeSubscriptions[existingSubIndex];
                const currentExpiresAt = new Date(existingSub.expiresAt);
                const newExpiresAt = planType === 'monthly'
                    ? new Date(currentExpiresAt.setMonth(currentExpiresAt.getMonth() + 1))
                    : new Date(currentExpiresAt.setFullYear(currentExpiresAt.getFullYear() + 1));
                
                user.activeSubscriptions[existingSubIndex].expiresAt = newExpiresAt;
                user.activeSubscriptions[existingSubIndex].usageLimit += usageLimit; // Add to existing limit
                user.activeSubscriptions[existingSubIndex].planType = planType;
            } else {
                // CREATE a new subscription
                const expiresAt = planType === 'monthly'
                    ? new Date(new Date().setMonth(now.getMonth() + 1))
                    : new Date(new Date().setFullYear(now.getFullYear() + 1));
                
                const newSubscription = {
                    category: planName,
                    planType: planType,
                    usageLimit: usageLimit,
                    expiresAt: expiresAt,
                    purchasedAt: now,
                };
                user.activeSubscriptions.push(newSubscription);
            }
            
            await user.save();

            // Optionally, create a transaction record for this free activation
            await Transaction.create({
                user: user._id,
                category: planName,
                plan: planType,
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
                message: 'Subscription activated or renewed successfully with a full discount.',
            });
        }
        
        const options = {
            amount: Math.round(finalAmountInRupees * 100), // Amount in paise for Razorpay
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await razorpay.orders.create(options);

        // Create a pending transaction
        const transaction = await Transaction.create({
            user: user.id,
            category: planName,
            plan: planType,
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
        transaction.status = 'completed';
        transaction.razorpay_payment_id = razorpay_payment_id;
        transaction.razorpay_signature = razorpay_signature;
        await transaction.save();

        // MODIFIED: Retrieve subscription plan details from the database
        const pricingPlan = await PricingPlan.findOne({ name: transaction.category });
        if (!pricingPlan) {
            throw new Error(`Could not find plan details for '${transaction.category}' during subscription activation.`);
        }
        const planDetails = pricingPlan[transaction.plan];
        if (!planDetails) {
            throw new Error(`Could not find plan type details for '${transaction.category} - ${transaction.plan}'`);
        }
        
        const user = await User.findById(transaction.user);
        const now = new Date();

        // UPDATED: Check for an existing active subscription to update it (renewal)
        const existingSubIndex = user.activeSubscriptions.findIndex(sub => 
            sub.category === transaction.category && sub.expiresAt > now
        );
        
        if (existingSubIndex > -1) {
            // RENEWAL: Update the existing subscription
            const existingSub = user.activeSubscriptions[existingSubIndex];
            const currentExpiresAt = new Date(existingSub.expiresAt);
            
            const newExpiresAt = transaction.plan === 'monthly'
                ? new Date(currentExpiresAt.setMonth(currentExpiresAt.getMonth() + 1))
                : new Date(currentExpiresAt.setFullYear(currentExpiresAt.getFullYear() + 1));
            
            user.activeSubscriptions[existingSubIndex].expiresAt = newExpiresAt;
            user.activeSubscriptions[existingSubIndex].usageLimit += planDetails.limitPerMonth; // Add new verifications to existing
            user.activeSubscriptions[existingSubIndex].planType = transaction.plan;
            user.activeSubscriptions[existingSubIndex].purchasedAt = now;
            
        } else {
            // NEW SUBSCRIPTION: Add a new subscription object to the array
            const expiresAt = transaction.plan === 'monthly'
                ? new Date(new Date().setMonth(now.getMonth() + 1))
                : new Date(new Date().setFullYear(now.getFullYear() + 1));

            const newSubscription = {
                category: transaction.category,
                planType: transaction.plan,
                razorpaySubscriptionId: razorpay_payment_id, // Use payment_id as a reference
                usageLimit: planDetails.limitPerMonth,
                purchasedAt: now,
                expiresAt: expiresAt,
            };
            user.activeSubscriptions.push(newSubscription);
        }

        await user.save(); // Save the updated user document

        // Update coupon usage count if discount was applied
        if (transaction.couponCode) {
            await Coupon.updateOne(
                { code: transaction.couponCode },
                { $inc: { timesUsed: 1 } }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Subscription activated or renewed successfully!',
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