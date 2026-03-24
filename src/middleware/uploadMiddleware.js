const multer = require('multer');
const path = require('path');
const { ApiError } = require('../utils');
const cloudinaryConfig = require('../config/cloudinary');

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only document files (pdf, doc, docx, txt, md) are allowed'), false);
  }
};

// File filter for any allowed file type
const anyFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/markdown',
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'File type not allowed'), false);
  }
};

// Local storage for development/fallback
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Create multer instances that routes can use
const uploadProfile = cloudinaryConfig.uploadProfilePicture || multer({ 
  storage: localStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
});

const uploadResource = cloudinaryConfig.uploadResource || multer({ 
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: anyFileFilter
});

const uploadMessageAttachment = cloudinaryConfig.uploadMessageAttachment || multer({ 
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: anyFileFilter
});

// Export upload middleware
module.exports = {
  uploadProfile,
  uploadResource,
  uploadMessageAttachment,
  
  // Pre-configured middleware (ready to use)
  uploadProfilePicture: uploadProfile.single('profilePicture'),
  uploadResourceFile: uploadResource.single('file'),
  uploadAttachment: uploadMessageAttachment.single('attachment'),
  
  // Multiple files upload
  uploadMultiple: (fieldName, maxCount = 5) => {
    return uploadResource.array(fieldName, maxCount);
  },
  
  // Handle multer errors
  handleUploadError: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('File size exceeds the limit'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(ApiError.badRequest('Too many files uploaded'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(ApiError.badRequest('Unexpected file field'));
      }
      return next(ApiError.badRequest(err.message));
    }
    if (err) {
      return next(err);
    }
    next();
  },
};
