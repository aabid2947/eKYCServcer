// models/Service.js

import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide a field name'] },
  label: { type: String, required: [true, 'Please provide a user-friendly label'] },
  type: { type: String, required: [true, 'Please specify the field type'], enum: ['text', 'number', 'file', 'date', 'string', 'object', 'array'] },
  placeholder: { type: String, required: false },
}, { _id: false });


const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please provide a service name'], trim: true },
    service_key: { type: String, required: [true, 'Please provide a unique service key'], unique: true, trim: true },
    
    // Multiple services can belong to the same category.
    category: {
      type: String,
      required: [true, 'Please provide a Category'],
    },
    
    description: { type: String, required: [true, 'Please provide a service description'] },
    imageUrl: { type: String, required: false },
    price: { type: Number, required: [true, 'Please set a price for the service'], min: 0 },
    
    combo_price: {
      monthly: { type: Number, required: [true, 'Please set a monthly price'], min: 0 },
      yearly: { type: Number, required: [true, 'Please set a yearly price'], min: 0 },
    },

    is_active: { type: Boolean, default: true },
    globalUsageCount: { type: Number, default: 0 },
    endpoint: { type: String, required: [true, 'Please provide the API endpoint path'], trim: true },
    apiType: { type: String, required: [true, 'Please specify the API type'], enum: ['json', 'form'], default: 'json' },
    inputFields: { type: [FieldSchema], default: [] },
    outputFields: { type: [FieldSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', ServiceSchema);
export default Service;