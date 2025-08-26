import dotenv from 'dotenv';
// Load env vars
dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 5000;

import express from 'express';

import cors from 'cors';
import connectDB from './src/config/db.js';
import mainRouter from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorMiddleware.js';



// Connect to database
connectDB();

const app = express();

// Body parser
// app.use(express.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api', mainRouter);

// Use custom error handler
app.use(errorHandler);

export default app;

const server = app.listen(
  PORT,
  () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
