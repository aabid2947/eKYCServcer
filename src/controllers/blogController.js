import Blog from '../models/BlogModel.js';
import { v2 as cloudinary } from 'cloudinary';

// Ensure Cloudinary is configured (e.g., in a central config file)
// Make sure to set these environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to upload a file buffer to Cloudinary
const uploadImageToCloudinary = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'blog_assets', resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ public_id: result.public_id, url: result.secure_url });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper to process and upload a single image file from the request
const processImageUpload = async (file) => {
  if (!file) return null;
  return await uploadImageToCloudinary(file.buffer);
};

// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = async (req, res) => {
  try {
    const data = JSON.parse(req.body.blogData);
    const files = req.files;

    // Upload images to Cloudinary and add URLs to data
    if (files.mainImage) data.mainImage = await processImageUpload(files.mainImage[0]);
    if (files.heroImage1) data.heroImage1 = await processImageUpload(files.heroImage1[0]);
    if (files.heroImage2) data.heroImage2 = await processImageUpload(files.heroImage2[0]);
    if (files.howItWorksImage) data.howItWorksImage = await processImageUpload(files.howItWorksImage[0]);
    if (files.trustImage) data.trustImage = await processImageUpload(files.trustImage[0]);

    const blog = await Blog.create(data);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all blog posts (summary view)
// @route   GET /api/blogs
// @access  Public
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({})
      .select('title slug excerpt author category mainImage createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a single blog post by slug
// @route   GET /api/blogs/:slug
// @access  Public
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = async (req, res) => {
    try {
        const data = JSON.parse(req.body.blogData);
        const files = req.files;
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        // Helper to update an image
        const updateImage = async (fieldName, file) => {
            if (file) {
                // If there's an old image, delete it from Cloudinary
                if (blog[fieldName] && blog[fieldName].public_id) {
                    await cloudinary.uploader.destroy(blog[fieldName].public_id);
                }
                return await processImageUpload(file);
            }
            return blog[fieldName]; // Keep the old image if no new one is uploaded
        };
        
        // Process all potential image updates
        if (files.mainImage) data.mainImage = await updateImage('mainImage', files.mainImage[0]);
        if (files.heroImage1) data.heroImage1 = await updateImage('heroImage1', files.heroImage1[0]);
        if (files.heroImage2) data.heroImage2 = await updateImage('heroImage2', files.heroImage2[0]);
        if (files.howItWorksImage) data.howItWorksImage = await updateImage('howItWorksImage', files.howItWorksImage[0]);
        if (files.trustImage) data.trustImage = await updateImage('trustImage', files.trustImage[0]);

        const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, data, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, data: updatedBlog });
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};


// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Collect all public_ids of images to delete from Cloudinary
    const public_ids = [
        blog.mainImage?.public_id,
        blog.heroImage1?.public_id,
        blog.heroImage2?.public_id,
        blog.howItWorksImage?.public_id,
        blog.trustImage?.public_id,
    ].filter(Boolean); // Filter out any null/undefined values

    if (public_ids.length > 0) {
        await cloudinary.api.delete_resources(public_ids);
    }
    
    await blog.deleteOne();
    res.status(200).json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Server Error' });
  }
};