const Resource = require('../models/Resource');
const Bookmark = require('../models/Bookmark');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { SearchService, FileUploadService, AnalyticsService } = require('../services');

/**
 * @desc    Get all resources
 * @route   GET /api/v1/resources
 * @access  Public
 */
const getResources = asyncHandler(async (req, res) => {
  const {
    query,
    type,
    category,
    tags,
    difficulty,
    author,
    minVotes,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',')) : undefined;

  const result = await SearchService.searchResources({
    query,
    type,
    category,
    tags: tagsArray,
    difficulty,
    author,
    minVotes: minVotes ? parseInt(minVotes) : undefined,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Resources retrieved successfully')
  );
});

/**
 * @desc    Get single resource
 * @route   GET /api/v1/resources/:id
 * @access  Public
 */
const getResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id)
    .populate('author', 'firstName lastName profilePicture college')
    .populate('comments.user', 'firstName lastName profilePicture');

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  // Increment view count
  resource.viewCount = (resource.viewCount || 0) + 1;
  await resource.save();

  // Log view activity if user is authenticated
  if (req.user) {
    await AnalyticsService.logActivity({
      user: req.user._id,
      action: 'view',
      entityType: 'resource',
      entityId: resource._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  res.json(
    new ApiResponse(200, { resource }, 'Resource retrieved successfully')
  );
});

/**
 * @desc    Create resource
 * @route   POST /api/v1/resources
 * @access  Private
 */
const createResource = asyncHandler(async (req, res) => {
  const { title, description, type, category, url, tags, difficulty, content } = req.body;

  const resourceData = {
    title,
    description,
    type,
    category,
    url,
    tags,
    difficulty,
    content,
    author: req.user._id,
  };

  // Handle file upload if present
  if (req.file) {
    const uploadResult = await FileUploadService.uploadResourceFile(
      req.file,
      req.user._id,
      type
    );
    resourceData.fileUrl = uploadResult.url;
  }

  const resource = await Resource.create(resourceData);

  await resource.populate('author', 'firstName lastName profilePicture');

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'resource_share',
    entityType: 'resource',
    entityId: resource._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json(
    new ApiResponse(201, { resource }, 'Resource created successfully')
  );
});

/**
 * @desc    Update resource
 * @route   PUT /api/v1/resources/:id
 * @access  Private (Owner only)
 */
const updateResource = asyncHandler(async (req, res) => {
  let resource = await Resource.findById(req.params.id);

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  // Check ownership
  if (resource.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this resource');
  }

  const allowedFields = ['title', 'description', 'type', 'category', 'url', 'tags', 'difficulty', 'content'];
  const updates = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Handle file upload if present
  if (req.file) {
    // Delete old file if exists
    if (resource.fileUrl) {
      await FileUploadService.deleteFile(resource.fileUrl);
    }

    const uploadResult = await FileUploadService.uploadResourceFile(
      req.file,
      req.user._id,
      updates.type || resource.type
    );
    updates.fileUrl = uploadResult.url;
  }

  resource = await Resource.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('author', 'firstName lastName profilePicture');

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'update',
    entityType: 'resource',
    entityId: resource._id,
    metadata: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { resource }, 'Resource updated successfully')
  );
});

/**
 * @desc    Delete resource
 * @route   DELETE /api/v1/resources/:id
 * @access  Private (Owner only)
 */
const deleteResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  // Check ownership
  if (resource.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this resource');
  }

  // Delete associated file if exists
  if (resource.fileUrl) {
    await FileUploadService.deleteFile(resource.fileUrl);
  }

  // Soft delete
  resource.isActive = false;
  await resource.save();

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'delete',
    entityType: 'resource',
    entityId: resource._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, null, 'Resource deleted successfully')
  );
});

/**
 * @desc    Upvote/Remove upvote from resource
 * @route   POST /api/v1/resources/:id/vote
 * @access  Private
 */
const toggleVote = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  const userId = req.user._id.toString();
  const upvoteIndex = resource.upvotes.indexOf(userId);
  const downvoteIndex = resource.downvotes.indexOf(userId);

  // Remove from downvotes if exists
  if (downvoteIndex > -1) {
    resource.downvotes.splice(downvoteIndex, 1);
  }

  if (upvoteIndex > -1) {
    // Remove upvote
    resource.upvotes.splice(upvoteIndex, 1);
  } else {
    // Add upvote
    resource.upvotes.push(userId);
    
    // Log activity
    await AnalyticsService.logActivity({
      user: req.user._id,
      action: 'resource_vote',
      entityType: 'resource',
      entityId: resource._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Update vote count
  resource.voteCount = resource.upvotes.length - resource.downvotes.length;
  await resource.save();

  res.json(
    new ApiResponse(200, {
      upvoted: upvoteIndex === -1,
      voteCount: resource.voteCount,
    }, 'Vote updated successfully')
  );
});

/**
 * @desc    Downvote/Remove downvote from resource
 * @route   POST /api/v1/resources/:id/downvote
 * @access  Private
 */
const toggleDownvote = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  const userId = req.user._id.toString();
  const downvoteIndex = resource.downvotes.indexOf(userId);
  const upvoteIndex = resource.upvotes.indexOf(userId);

  // Remove from upvotes if exists
  if (upvoteIndex > -1) {
    resource.upvotes.splice(upvoteIndex, 1);
  }

  if (downvoteIndex > -1) {
    // Remove downvote
    resource.downvotes.splice(downvoteIndex, 1);
  } else {
    // Add downvote
    resource.downvotes.push(userId);
  }

  // Update vote count
  resource.voteCount = resource.upvotes.length - resource.downvotes.length;
  await resource.save();

  res.json(
    new ApiResponse(200, {
      downvoted: downvoteIndex === -1,
      voteCount: resource.voteCount,
    }, 'Vote updated successfully')
  );
});

/**
 * @desc    Add comment to resource
 * @route   POST /api/v1/resources/:id/comments
 * @access  Private
 */
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  resource.comments.push({
    user: req.user._id,
    content,
    createdAt: new Date(),
  });

  await resource.save();
  await resource.populate('comments.user', 'firstName lastName profilePicture');

  const newComment = resource.comments[resource.comments.length - 1];

  res.status(201).json(
    new ApiResponse(201, { comment: newComment }, 'Comment added successfully')
  );
});

/**
 * @desc    Delete comment from resource
 * @route   DELETE /api/v1/resources/:id/comments/:commentId
 * @access  Private
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;

  const resource = await Resource.findById(id);

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  const comment = resource.comments.id(commentId);

  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  // Check ownership
  if (comment.user.toString() !== req.user._id.toString() && 
      resource.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this comment');
  }

  comment.deleteOne();
  await resource.save();

  res.json(
    new ApiResponse(200, null, 'Comment deleted successfully')
  );
});

/**
 * @desc    Bookmark/Unbookmark resource
 * @route   POST /api/v1/resources/:id/bookmark
 * @access  Private
 */
const toggleBookmark = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  // Check if already bookmarked
  const existingBookmark = await Bookmark.findOne({
    user: req.user._id,
    resource: resource._id,
  });

  if (existingBookmark) {
    // Remove bookmark
    await existingBookmark.deleteOne();
    
    res.json(
      new ApiResponse(200, { bookmarked: false }, 'Resource removed from bookmarks')
    );
  } else {
    // Create bookmark
    await Bookmark.create({
      user: req.user._id,
      resource: resource._id,
    });

    // Log activity
    await AnalyticsService.logActivity({
      user: req.user._id,
      action: 'bookmark',
      entityType: 'resource',
      entityId: resource._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json(
      new ApiResponse(200, { bookmarked: true }, 'Resource added to bookmarks')
    );
  }
});

/**
 * @desc    Get resources by category
 * @route   GET /api/v1/resources/category/:category
 * @access  Public
 */
const getResourcesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 10, sortBy = 'voteCount', sortOrder = 'desc' } = req.query;

  const validCategories = [
    'frontend',
    'backend',
    'fullstack',
    'mobile',
    'devops',
    'data-science',
    'machine-learning',
    'blockchain',
    'design',
    'project-management',
    'other',
  ];

  if (!validCategories.includes(category)) {
    throw new ApiError(400, 'Invalid category');
  }

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [resources, total] = await Promise.all([
    Resource.find({ category, isActive: true })
      .populate('author', 'firstName lastName profilePicture')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    Resource.countDocuments({ category, isActive: true }),
  ]);

  res.json(
    new ApiResponse(200, {
      resources,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Resources retrieved successfully')
  );
});

/**
 * @desc    Get resources by type
 * @route   GET /api/v1/resources/type/:type
 * @access  Public
 */
const getResourcesByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { page = 1, limit = 10, sortBy = 'voteCount', sortOrder = 'desc' } = req.query;

  const validTypes = ['article', 'video', 'tutorial', 'tool', 'template', 'course', 'book', 'other'];

  if (!validTypes.includes(type)) {
    throw new ApiError(400, 'Invalid type');
  }

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [resources, total] = await Promise.all([
    Resource.find({ type, isActive: true })
      .populate('author', 'firstName lastName profilePicture')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    Resource.countDocuments({ type, isActive: true }),
  ]);

  res.json(
    new ApiResponse(200, {
      resources,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Resources retrieved successfully')
  );
});

/**
 * @desc    Get top/popular resources
 * @route   GET /api/v1/resources/popular
 * @access  Public
 */
const getPopularResources = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const resources = await Resource.find({ isActive: true })
    .populate('author', 'firstName lastName profilePicture')
    .sort({ voteCount: -1, viewCount: -1 })
    .limit(parseInt(limit));

  res.json(
    new ApiResponse(200, { resources }, 'Popular resources retrieved successfully')
  );
});

/**
 * @desc    Get resource tags
 * @route   GET /api/v1/resources/tags
 * @access  Public
 */
const getResourceTags = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  const tags = await Resource.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit) },
  ]);

  res.json(
    new ApiResponse(200, { 
      tags: tags.map((t) => ({ tag: t._id, count: t.count })) 
    }, 'Tags retrieved successfully')
  );
});

module.exports = {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  toggleVote,
  toggleDownvote,
  addComment,
  deleteComment,
  toggleBookmark,
  getResourcesByCategory,
  getResourcesByType,
  getPopularResources,
  getResourceTags,
};
