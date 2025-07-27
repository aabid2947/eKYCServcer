import Razorpay from 'razorpay';
import crypto from 'crypto';
import Service from '../models/Service.js';
import Transaction from '../models/TransactionModel.js';
import * as gridlines from '../services/gridLinesService.js';
import FormData from 'form-data';


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create Razorpay Order and initial pending transaction
 * @route   POST /api/payment/order
 * @access  Private
 */
// export const createPaymentOrder = async (req, res, next) => {
//     try {
//         const { serviceId } = req.body;
//         const user = req.user;

//         if (!serviceId) {
//             res.status(400);
//             throw new Error('Service ID is required');
//         }

//         const service = await Service.findById(serviceId);
//         if (!service || !service.is_active) {
//             res.status(404);
//             throw new Error('Service not found or is inactive.');
//         }

//         if (!service.price || service.price <= 0) {
//             res.status(400);
//             throw new Error('This is not a paid service. Use the verification endpoint.');
//         }

//         const options = {
//             amount: service.price * 100, // amount in the smallest currency unit (paise)
//             currency: "INR",
//             receipt: `receipt_order_${new Date().getTime()}`
//         };
        
//         const order = await razorpay.orders.create(options);

//         // Create a pending transaction record to be updated after payment verification
//         const transaction = await Transaction.create({
//             user: user.id,
//             service: serviceId,
//             status: 'pending',
//             amount: service.price,
//             razorpay_order_id: order.id
//         });

//         res.status(201).json({
//             success: true,
//             order,
//             key_id: process.env.RAZORPAY_KEY_ID, // Send key_id to frontend
//             transactionId: transaction._id // Send our internal transaction ID
//         });

//     } catch (error) {
//         next(error);
//     }
// };
export const createPaymentOrder = async (req, res, next) => {
    try {
        // 1. Accept serviceId and the input payload
        const { serviceId, payload } = req.body;
        const user = req.user;

        if (!serviceId) {
            res.status(400);
            throw new Error('Service ID is required');
        }
        
        // ... (rest of the service finding logic remains the same)
        const service = await Service.findById(serviceId);
        if (!service || !service.is_active) {
            res.status(404);
            throw new Error('Service not found or is inactive.');
        }

        const options = {
            amount: service.price * 100,
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`
        };
        
        const order = await razorpay.orders.create(options);

        // 2. Create the pending transaction and store the input payload in metadata
        const transaction = await Transaction.create({
            user: user.id,
            service: serviceId,
            status: 'pending',
            amount: service.price,
            razorpay_order_id: order.id,
            metadata: { 
                inputPayload: payload // Store the payload
            }
        });

        res.status(201).json({
            success: true,
            order,
            key_id: process.env.RAZORPAY_KEY_ID,
            transactionId: transaction._id
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify payment signature and execute the service
 * @route   POST /api/payment/verify
 * @access  Private
 */
export const verifyPaymentAndExecuteService = async (req, res, next) => {
    // The user's form input 'payload' is no longer received here.
    // We only need the details to find and verify the transaction.
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        transactionId, 
        serviceKey
    } = req.body;

    // Use a variable to hold the transaction for the catch block
    let transaction; 

    try {
        // 1. Find the associated pending transaction using the ID from the /order step
        transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            res.status(404);
            throw new Error('Transaction not found. Please initiate the payment again.');
        }

        if (transaction.status !== 'pending') {
            res.status(400);
            throw new Error(`This transaction has already been processed with status: ${transaction.status}.`);
        }
        
        // 2. IMPORTANT: Verify the payment signature to ensure authenticity
        const hmac_body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(hmac_body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            transaction.status = 'failed';
            transaction.metadata.reason = 'Payment verification failed: Signature mismatch.';
            await transaction.save();
            res.status(400);
            throw new Error('Payment verification failed. Invalid signature.');
        }

        // 3. Signature is valid. Payment is authentic. Now, find the service.
        const service = await Service.findOne({ service_key: serviceKey });
        if (!service) {
            throw new Error(`Service with key '${serviceKey}' not found.`);
        }

        // 4. Retrieve the user's input payload stored earlier in the transaction's metadata
        const payload = transaction.metadata.inputPayload;
        if (!payload) {
            throw new Error('Service input data was not found for this transaction.');
        }
        
        // 5. Update transaction with payment details.
        transaction.razorpay_payment_id = razorpay_payment_id;
        transaction.razorpay_signature = razorpay_signature;

        let result;

        // 6. Execute the third-party service call using the retrieved payload
        // NOTE: This flow does not support file uploads as `req.files` will be empty.
        if (service.apiType === 'form') {
           // This block will now only work if the form data doesn't contain files.
           // The original implementation is required for actual file uploads.
           const formData = new FormData();
           const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;

           if (parsedPayload) {
               for (const key in parsedPayload) {
                   formData.append(key, parsedPayload[key]);
               }
           }
           result = await gridlines.callFormApi(service.endpoint, formData);

        } else { // For 'json' apiType
            result = await gridlines.callJsonApi(service.endpoint, payload);
        }

        // 7. Service executed successfully. Finalize our transaction.
        transaction.status = 'completed';
        // Overwrite the metadata to store the result of the API call
        transaction.metadata = {
            responseCode: result.code,
            message: result.message,
        };
        await transaction.save();

        res.status(200).json({
            success: true,
            message: 'Payment successful and service executed.',
            data: result,
            outputFields: service.outputFields,
        });

    } catch (error) {
        // If any error occurs after payment verification, we mark the transaction as 'failed' for review.
        if (transaction && transaction.status === 'pending') {
            transaction.status = 'failed';
            transaction.metadata = { 
                ...transaction.metadata, 
                reason: 'Service execution failed after successful payment.', 
                error: error.message 
            };
            await transaction.save();
        }
        next(error);
    }
};