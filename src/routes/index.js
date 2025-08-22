import express from 'express';
import authRoutes from './authRoute.js';
import userRoutes from './userRoute.js';
import serviceRoutes from './serviceRoute.js'; 
import verificationRoutes from './verificationRoute.js';
// import adminRoutes from './adminRoute.js';
import transactionRoutes from './transactionRoute.js'
import  reviewRouter  from './reviewRoute.js';
import paymentRoutes from './PaymentRoute.js';
import couponRoutes from './couponRoute.js'; 
import pricingRoutes from './pricingRoute.js'; 
import blogRoutes from './blogRoute.js';
import nodemailer from 'nodemailer';
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
// router.use('/admin', adminRoutes);

// For fetching the list of available services
router.use('/services', serviceRoutes);

// For managing coupons
router.use('/coupons', couponRoutes); 

 const sendEmailController = async (req, res) => {
  const { name, email, subject, message } = req.body;
//   console.log(req.body)

  // 1. Basic Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).send({
      success: false,
      message: 'Please provide all required fields.',
    });
  }

  try {
    // 2. Configure Nodemailer Transporter
    // IMPORTANT: Use environment variables to store your email and password
    res.status(200).send({
      success: true,
      message: 'Your message has been sent successfully!',
    });
    return
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail address (e.g., from .env file)
        pass: process.env.EMAIL_PASS, // Your Gmail App Password (e.g., from .env file)
      },
    });

    // 3. Define Email Options
    const mailOptions = {
      from: `"${name}" <${email}>`, // Display sender's name and email
      to: 'verifymykyc@gmail.com',      // The recipient's email address
      subject: `Contact Form Submission: ${subject}`,
      html: `
        <h2>New Message from Your Website Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    };

    // 4. Send the Email
    await transporter.sendMail(mailOptions);

    res.status(200).send({
      success: true,
      message: 'Your message has been sent successfully!',
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send({
      success: false,
      message: 'There was an error sending your message. Please try again later.',
    });
  }
};
router.post('/send-email', sendEmailController);

//For transaction 
router.use('/transactions', transactionRoutes)

// For review
router.use('/reviews', reviewRouter);
// For submitting a verification request for ANY service
router.use('/verification', verificationRoutes);

router.use('/pricing', pricingRoutes); 
router.use('/payment', paymentRoutes);

router.use('/blogs',blogRoutes)

export default router;