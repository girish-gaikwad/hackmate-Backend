const Bookmark = require('../models/Bookmark');
const Hackathon = require('../models/Hackathon');
const Resource = require('../models/Resource');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { AnalyticsService } = require('../services');

/**
 * @desc    Get all bookmarks
 * @route   GET /api/v1/bookmarks
 * @access  Private
 */
const getBookmarks = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 10 } = req.query;

  const filter = { user: req.user._id };

  // Filter by type if provided
  if (type === 'hackathon') {
    filter.hackathon = { $exists: true, $ne: null };
  } else if (type === 'resource') {
    filter.resource = { $exists: true, $ne: null };
  }

  const skip = (page - 1) * limit;

  const [bookmarks, total] = await Promise.all([
    Bookmark.find(filter)
      .populate({
        path: 'hackathon',
        select: 'name description startDate endDate mode status registrationDeadline url',
      })
      .populate({
        path: 'resource',
        select: 'title description type category tags voteCount author',
        populate: {
          path: 'author',
          select: 'firstName lastName profilePicture',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Bookmark.countDocuments(filter),
  ]);

  // Filter out bookmarks where the item was deleted
  const validBookmarks = bookmarks.filter((b) => b.hackathon || b.resource);

  res.json(
    new ApiResponse(200, {
      bookmarks: validBookmarks,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Bookmarks retrieved successfully')
  );
});

/**
 * @desc    Create hackathon bookmark
 * @route   POST /api/v1/bookmarks/hackathon/:hackathonId
 * @access  Private
 */
const createHackathonBookmark = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  const { notifyBeforeDeadline, notifyOneDayBefore, notifyOneWeekBefore } = req.body;

  // Check if hackathon exists
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  // Check if already bookmarked
  const existingBookmark = await Bookmark.findOne({
    user: req.user._id,
    hackathon: hackathonId,
  });

  if (existingBookmark) {
    throw new ApiError(400, 'Hackathon is already bookmarked');
  }

  const bookmark = await Bookmark.create({
    user: req.user._id,
    hackathon: hackathonId,
    notifyBeforeDeadline: notifyBeforeDeadline !== false,
    notifyOneDayBefore: notifyOneDayBefore !== false,
    notifyOneWeekBefore: notifyOneWeekBefore !== false,
  });

  await bookmark.populate('hackathon', 'name startDate endDate mode status');

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'bookmark',
    entityType: 'hackathon',
    entityId: hackathonId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json(
    new ApiResponse(201, { bookmark }, 'Hackathon bookmarked successfully')
  );
});

/**
 * @desc    Create resource bookmark
 * @route   POST /api/v1/bookmarks/resource/:resourceId
 * @access  Private
 */
const createResourceBookmark = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  // Check if resource exists
  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  // Check if already bookmarked
  const existingBookmark = await Bookmark.findOne({
    user: req.user._id,
    resource: resourceId,
  });

  if (existingBookmark) {
    throw new ApiError(400, 'Resource is already bookmarked');
  }

  const bookmark = await Bookmark.create({
    user: req.user._id,
    resource: resourceId,
  });

  await bookmark.populate('resource', 'title type category voteCount');

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'bookmark',
    entityType: 'resource',
    entityId: resourceId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json(
    new ApiResponse(201, { bookmark }, 'Resource bookmarked successfully')
  );
});

/**
 * @desc    Delete bookmark
 * @route   DELETE /api/v1/bookmarks/:id
 * @access  Private
 */
const deleteBookmark = asyncHandler(async (req, res) => {
  const bookmark = await Bookmark.findById(req.params.id);

  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  // Check ownership
  if (bookmark.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to delete this bookmark');
  }

  await bookmark.deleteOne();

  res.json(
    new ApiResponse(200, null, 'Bookmark removed successfully')
  );
});

/**
 * @desc    Delete hackathon bookmark by hackathon ID
 * @route   DELETE /api/v1/bookmarks/hackathon/:hackathonId
 * @access  Private
 */
const deleteHackathonBookmark = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;

  const bookmark = await Bookmark.findOneAndDelete({
    user: req.user._id,
    hackathon: hackathonId,
  });

  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  res.json(
    new ApiResponse(200, null, 'Hackathon bookmark removed successfully')
  );
});

/**
 * @desc    Delete resource bookmark by resource ID
 * @route   DELETE /api/v1/bookmarks/resource/:resourceId
 * @access  Private
 */
const deleteResourceBookmark = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  const bookmark = await Bookmark.findOneAndDelete({
    user: req.user._id,
    resource: resourceId,
  });

  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  res.json(
    new ApiResponse(200, null, 'Resource bookmark removed successfully')
  );
});

/**
 * @desc    Update bookmark notification settings
 * @route   PUT /api/v1/bookmarks/:id/notifications
 * @access  Private
 */
const updateBookmarkNotifications = asyncHandler(async (req, res) => {
  const { notifyBeforeDeadline, notifyOneDayBefore, notifyOneWeekBefore } = req.body;

  const bookmark = await Bookmark.findById(req.params.id);

  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  // Check ownership
  if (bookmark.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this bookmark');
  }

  // Update notification settings
  if (typeof notifyBeforeDeadline === 'boolean') {
    bookmark.notifyBeforeDeadline = notifyBeforeDeadline;
  }
  if (typeof notifyOneDayBefore === 'boolean') {
    bookmark.notifyOneDayBefore = notifyOneDayBefore;
  }
  if (typeof notifyOneWeekBefore === 'boolean') {
    bookmark.notifyOneWeekBefore = notifyOneWeekBefore;
  }

  await bookmark.save();

  res.json(
    new ApiResponse(200, { bookmark }, 'Notification settings updated successfully')
  );
});

/**
 * @desc    Check if item is bookmarked
 * @route   GET /api/v1/bookmarks/check
 * @access  Private
 */
const checkBookmark = asyncHandler(async (req, res) => {
  const { hackathonId, resourceId } = req.query;

  if (!hackathonId && !resourceId) {
    throw new ApiError(400, 'Either hackathonId or resourceId is required');
  }

  const filter = { user: req.user._id };
  
  if (hackathonId) {
    filter.hackathon = hackathonId;
  }
  if (resourceId) {
    filter.resource = resourceId;
  }

  const bookmark = await Bookmark.findOne(filter);

  res.json(
    new ApiResponse(200, {
      bookmarked: !!bookmark,
      bookmark: bookmark || null,
    }, 'Bookmark status retrieved')
  );
});

/**
 * @desc    Get bookmarked hackathons
 * @route   GET /api/v1/bookmarks/hackathons
 * @access  Private
 */
const getBookmarkedHackathons = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  // Find bookmarks
  const bookmarkQuery = Bookmark.find({
    user: req.user._id,
    hackathon: { $exists: true, $ne: null },
  });

  const bookmarks = await bookmarkQuery
    .populate({
      path: 'hackathon',
      match: status ? { status } : {},
      select: 'name description startDate endDate mode status registrationDeadline url prizes',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Filter out null hackathons (due to status filter or deleted)
  const validBookmarks = bookmarks.filter((b) => b.hackathon);

  const total = await Bookmark.countDocuments({
    user: req.user._id,
    hackathon: { $exists: true, $ne: null },
  });

  res.json(
    new ApiResponse(200, {
      bookmarks: validBookmarks,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Bookmarked hackathons retrieved successfully')
  );
});

/**
 * @desc    Get bookmarked resources
 * @route   GET /api/v1/bookmarks/resources
 * @access  Private
 */
const getBookmarkedResources = asyncHandler(async (req, res) => {
  const { type, category, page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const matchQuery = { isActive: true };
  if (type) matchQuery.type = type;
  if (category) matchQuery.category = category;

  const bookmarks = await Bookmark.find({
    user: req.user._id,
    resource: { $exists: true, $ne: null },
  })
    .populate({
      path: 'resource',
      match: matchQuery,
      select: 'title description type category tags voteCount url author',
      populate: {
        path: 'author',
        select: 'firstName lastName profilePicture',
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Filter out null resources
  const validBookmarks = bookmarks.filter((b) => b.resource);

  const total = await Bookmark.countDocuments({
    user: req.user._id,
    resource: { $exists: true, $ne: null },
  });

  res.json(
    new ApiResponse(200, {
      bookmarks: validBookmarks,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Bookmarked resources retrieved successfully')
  );
});

module.exports = {
  getBookmarks,
  createHackathonBookmark,
  createResourceBookmark,
  deleteBookmark,
  deleteHackathonBookmark,
  deleteResourceBookmark,
  updateBookmarkNotifications,
  checkBookmark,
  getBookmarkedHackathons,
  getBookmarkedResources,
};
