import express from 'express';

import cors from 'cors';
import connectDB from './config/db.js';
import mainRouter from './routes/index.js';
import { errorHandler } from './middleware/errorMiddleware.js';



// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api', mainRouter);

// Use custom error handler
app.use(errorHandler);

export default app;
