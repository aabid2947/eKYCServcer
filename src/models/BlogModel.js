import mongoose from 'mongoose';
import slugify from 'slugify';

// A reusable sub-schema for items with a title and description
const featureSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, trim: true },
});

const blogSchema = new mongoose.Schema(
  {
    // --- Fields for BlogLanding Card ---
    title: {
      type: String,
      required: [true, 'Please provide a blog title'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Please provide an excerpt'],
    },
    author: {
      type: String,
      default: 'VerifyMyKyc Team',
    },
    category: {
      type: String,
      enum: ['Technology', 'Security', 'Compliance', 'Global', 'Business', 'General'],
      required: [true, 'Please provide a category'],
    },
    mainImage: {
      public_id: String,
      url: String,
    },

    // --- Fields for the Detailed Blog Page ---

    // TrustHero Section
    heroSubtitle: String,
    heroTitle: String,
    heroDescription: String,
    heroImage1: { public_id: String, url: String },
    heroImage2: { public_id: String, url: String },

    // VerificationFeatures Section
    verificationTitle: String,
    verificationDescription: String,
    verificationFeatures: [featureSchema],

    // HowIdvWorks Section
    howItWorksTitle: String,
    howItWorksDescription: String,
    howItWorksImage: { public_id: String, url: String },
    howItWorksSteps: [featureSchema],

    // ProductBenefits Section
    benefitsSubtitle: String,
    benefitsTitle: String,
    benefitsDescription: String,
    productBenefits: [featureSchema],

    // TrustSection
    trustTitle: String,
    trustImage: { public_id: String, url: String },
    trustCard1: featureSchema,
    trustCard2: featureSchema,
    trustCard3: featureSchema,
  },
  {
    timestamps: true,
  }
);

// Middleware to create slug from title before saving
blogSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;