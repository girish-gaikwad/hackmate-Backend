const { cloudinary, deleteFile, getPublicIdFromUrl } = require('../config/cloudinary');
const logger = require('../utils/logger');

/**
 * File Upload Service - Handles file upload and management
 */
class FileUploadService {
  /**
   * Upload a single file to Cloudinary
   * @param {Object} file - Multer file object
   * @param {Object} options - Upload options
   */
  static async uploadFile(file, options = {}) {
    try {
      // If file is already uploaded by multer-cloudinary, return the URL
      if (file.path) {
        return {
          url: file.path,
          publicId: file.filename,
          format: file.format || file.mimetype,
          size: file.size,
        };
      }

      // Manual upload for buffer-based files
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || 'hackathon-app/uploads',
            resource_type: options.resourceType || 'auto',
            ...options,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error(`File upload error: ${error.message}`);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload profile picture
   * @param {Object} file - Multer file object
   * @param {string} userId - User ID
   */
  static async uploadProfilePicture(file, userId) {
    return this.uploadFile(file, {
      folder: 'hackathon-app/profiles',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
      ],
      public_id: `profile_${userId}_${Date.now()}`,
    });
  }

  /**
   * Upload resource file
   * @param {Object} file - Multer file object
   * @param {string} userId - User ID
   * @param {string} resourceType - Type of resource
   */
  static async uploadResourceFile(file, userId, resourceType) {
    const folders = {
      code: 'hackathon-app/resources/code',
      design: 'hackathon-app/resources/design',
      documentation: 'hackathon-app/resources/docs',
      tutorial: 'hackathon-app/resources/tutorials',
      other: 'hackathon-app/resources/other',
    };

    return this.uploadFile(file, {
      folder: folders[resourceType] || folders.other,
      resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
    });
  }

  /**
   * Upload message attachment
   * @param {Object} file - Multer file object
   * @param {string} senderId - Sender user ID
   */
  static async uploadMessageAttachment(file, senderId) {
    return this.uploadFile(file, {
      folder: 'hackathon-app/messages',
    });
  }

  /**
   * Delete file from Cloudinary
   * @param {string} fileUrl - File URL or public ID
   */
  static async deleteFile(fileUrl) {
    try {
      let publicId = fileUrl;

      // Extract public ID from URL if full URL is provided
      if (fileUrl.startsWith('http')) {
        publicId = getPublicIdFromUrl(fileUrl);
      }

      if (!publicId) {
        logger.warn('Could not extract public ID from URL');
        return false;
      }

      const result = await deleteFile(publicId);
      logger.info(`File deleted: ${publicId}`);
      return result;
    } catch (error) {
      logger.error(`File deletion error: ${error.message}`);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Delete multiple files
   * @param {Array} fileUrls - Array of file URLs
   */
  static async deleteMultipleFiles(fileUrls) {
    const results = [];

    for (const url of fileUrls) {
      try {
        await this.deleteFile(url);
        results.push({ url, success: true });
      } catch (error) {
        results.push({ url, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Generate signed URL for private files
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Options for signed URL
   */
  static generateSignedUrl(publicId, options = {}) {
    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + (options.expiresIn || 3600), // 1 hour default
      ...options,
    });

    return signedUrl;
  }

  /**
   * Optimize image URL
   * @param {string} url - Original Cloudinary URL
   * @param {Object} options - Transformation options
   */
  static optimizeImage(url, options = {}) {
    if (!url || !url.includes('cloudinary')) {
      return url;
    }

    // Add transformations to URL
    const transformations = [];

    if (options.width) {
      transformations.push(`w_${options.width}`);
    }
    if (options.height) {
      transformations.push(`h_${options.height}`);
    }
    if (options.crop) {
      transformations.push(`c_${options.crop}`);
    }
    if (options.quality) {
      transformations.push(`q_${options.quality}`);
    } else {
      transformations.push('q_auto');
    }
    transformations.push('f_auto');

    // Insert transformations into URL
    const transformString = transformations.join(',');
    return url.replace('/upload/', `/upload/${transformString}/`);
  }

  /**
   * Get file info from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   */
  static async getFileInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        url: result.secure_url,
        createdAt: result.created_at,
      };
    } catch (error) {
      logger.error(`Get file info error: ${error.message}`);
      throw new Error('Failed to get file info');
    }
  }
}

module.exports = FileUploadService;
