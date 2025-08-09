import mongoose from 'mongoose';
import slugify from 'slugify';

const blogSchema = new mongoose.Schema(
  {
    // Basic Blog Information
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
      maxlength: [300, 'Excerpt cannot exceed 300 characters']
    },
    content: {
      type: String,
      required: [true, 'Please provide blog content'],
    },
    author: {
      type: String,
      default: 'VerifyMyKyc Team',
    },
    category: {
      type: String,
      enum:  [
  "PAN",
  "CIN",
  "Financial & Business Checks",
  "Identity Verification",
  "Employment Verification",
  "Biometric & AI-Based Verification",
  "Profile & Database Lookup",
  "Legal & Compliance Checks",
  "Vehicle Verification"
],
      required: [true, 'Please provide a category'],
    },
    tags: [{
      type: String,
      trim: true
    }],
    
    // Images
    featuredImage: {
      public_id: String,
      url: String,
    },
    
    // SEO Fields
    metaTitle: String,
    metaDescription: String,
    
    // Publishing
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    publishedAt: {
      type: Date,
      default: null
    },
    readingTime: {
      type: Number, // in minutes
      default: 5
    }
  },
  {
    timestamps: true,
  }
);

// Middleware to create slug from title before saving
blogSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { 
      lower: true, 
      strict: true, 
      remove: /[*+~.()'"!:@]/g 
    });
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate reading time based on content length (average 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  
  next();
});

// Index for better query performance
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ publishedAt: -1 });

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;