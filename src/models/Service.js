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

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // This is the price for the entire category "combo"
  combo_price: {
    type: Number,
    required: true,
    min: 0,
  }
}, { _id: false });

// --- NEW SUB-DOCUMENT FOR DEFINING DYNAMIC FIELDS ---
const FieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a field name (e.g., "pan_number")'],
  },
  label: {
    type: String,
    required: [true, 'Please provide a user-friendly label (e.g., "PAN Number")'],
  },
  type: {
    type: String,
    required: [true, 'Please specify the field type'],
    enum: ['text', 'number', 'file', 'date', 'string', 'object', 'array'], // Added more types for output
  },
  placeholder: {
    type: String,
    required: false,
  },
}, { _id: false });


const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
      trim: true,
    },
    service_key: {
      type: String,
      required: [true, 'Please provide a unique service key'],
      unique: true,
      trim: true,
    },
    category:{
      type: String,
      required: [true, 'Please provide a Category'],
      unique: true
    },
    description: {
      type: String,
      required: [true, 'Please provide a service description'],
    },
    imageUrl: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: [true, 'Please set a price for the service'],
      min: 0,
    },
     combo_price: {
      type: Number,
      required: [true, 'Please set a combo price for the category'],
      min: 0,
    },

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
    // --- NEW DYNAMIC FIELDS ---
    endpoint: {
      type: String,
      required: [true, 'Please provide the API endpoint path for this service'],
      trim: true,
    },
    apiType: {
      type: String,
      required: [true, 'Please specify the API type'],
      enum: ['json', 'form'],
      default: 'json',
    },
    inputFields: {
      type: [FieldSchema],
      default: [],
    },
    outputFields: {
      type: [FieldSchema],
      default: [],
    }
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', ServiceSchema);
export default Service;