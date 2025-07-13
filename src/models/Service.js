// models/Service.js

import mongoose from 'mongoose';

const DiscountSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['percentage', 'fixed'],
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
      trim: true,
    },
    // --- NEW REQUIRED & UNIQUE FIELD ---
    service_key: {
      type: String,
      required: [true, 'Please provide a unique service key'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a service description'],
    },
    imageUrl: {
      type: String,
      required: [false, 'Please provide an image URL for the service'],
    },
    price: {
      type: Number,
      required: [true, 'Please set a price for the service'],
      min: 0,
    },
    // --- NEW FIELD TO CONTROL VISIBILITY ---
    is_active: {
      type: Boolean,
      default: true,
    },
    globalUsageCount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: DiscountSchema,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', ServiceSchema);
export default Service;