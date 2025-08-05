
import multer from 'multer';

// Configure multer to use memory storage.
// This is efficient because it avoids saving the file to the local disk.
// The file is kept in memory as a buffer and can be sent directly to a cloud service like Cloudinary.
const storage = multer.memoryStorage();

// Create a filter to only accept image files.
// This prevents users from uploading other file types.
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // Set a file size limit (e.g., 5MB)
    fileSize: 1024 * 1024 * 5, 
  },
});

export default upload;