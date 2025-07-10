
import mongoose from 'mongoose';

// A sub-schema for discounts to provide structure and flexibility.
const DiscountSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Discount type is required (e.g., "percentage" or "fixed")'],
      enum: ['percentage', 'fixed'],
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
  },
  { _id: false }
);

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a service description'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Please provide an image URL for the service'],
    },
    price: {
      type: Number,
      required: [true, 'Please set a price for the service'],
      min: [0, 'Price cannot be negative'],
    },
    globalUsageCount: {
      type: Number,
      default: 0,
    },
    // --- NEW OPTIONAL FIELD ---
    discount: {
      type: DiscountSchema,
      required: false, // This makes the entire discount object optional
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', ServiceSchema);
export default Service;