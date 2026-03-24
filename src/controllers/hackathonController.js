const Hackathon = require('../models/Hackathon');
const Bookmark = require('../models/Bookmark');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { SearchService, AnalyticsService } = require('../services');

/**
 * @desc    Get all hackathons
 * @route   GET /api/v1/hackathons
 * @access  Public
 */
const getHackathons = asyncHandler(async (req, res) => {
  const {
    query,
    mode,
    status,
    startDate,
    endDate,
    minTeamSize,
    maxTeamSize,
    page = 1,
    limit = 10,
    sortBy = 'startDate',
    sortOrder = 'asc',
  } = req.query;

  const result = await SearchService.searchHackathons({
    query,
    mode,
    status,
    startDate,
    endDate,
    minTeamSize: minTeamSize ? parseInt(minTeamSize) : undefined,
    maxTeamSize: maxTeamSize ? parseInt(maxTeamSize) : undefined,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Hackathons retrieved successfully')
  );
});

/**
 * @desc    Get single hackathon by ID or slug
 * @route   GET /api/v1/hackathons/:idOrSlug
 * @access  Public
 */
const getHackathon = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;

  // Try to find by ID first, then by slug
  let hackathon;
  if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    hackathon = await Hackathon.findById(idOrSlug);
  }

  if (!hackathon) {
    hackathon = await Hackathon.findOne({ slug: idOrSlug });
  }

  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  // Increment view count
  hackathon.viewCount = (hackathon.viewCount || 0) + 1;
  await hackathon.save();

  // Log view activity if user is authenticated
  if (req.user) {
    await AnalyticsService.logActivity({
      user: req.user._id,
      action: 'view',
      entityType: 'hackathon',
      entityId: hackathon._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  res.json(
    new ApiResponse(200, { hackathon }, 'Hackathon retrieved successfully')
  );
});

/**
 * @desc    Create new hackathon
 * @route   POST /api/v1/hackathons
 * @access  Private/Admin
 */
const createHackathon = asyncHandler(async (req, res) => {
  const hackathonData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const hackathon = await Hackathon.create(hackathonData);

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'create',
    entityType: 'hackathon',
    entityId: hackathon._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json(
    new ApiResponse(201, { hackathon }, 'Hackathon created successfully')
  );
});

/**
 * @desc    Update hackathon
 * @route   PUT /api/v1/hackathons/:id
 * @access  Private/Admin
 */
const updateHackathon = asyncHandler(async (req, res) => {
  let hackathon = await Hackathon.findById(req.params.id);

  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  // Update hackathon
  hackathon = await Hackathon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'update',
    entityType: 'hackathon',
    entityId: hackathon._id,
    metadata: { updatedFields: Object.keys(req.body) },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { hackathon }, 'Hackathon updated successfully')
  );
});

/**
 * @desc    Delete hackathon
 * @route   DELETE /api/v1/hackathons/:id
 * @access  Private/Admin
 */
const deleteHackathon = asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.id);

  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  // Soft delete
  hackathon.isActive = false;
  await hackathon.save();

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'delete',
    entityType: 'hackathon',
    entityId: hackathon._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, null, 'Hackathon deleted successfully')
  );
});

/**
 * @desc    Get upcoming hackathons
 * @route   GET /api/v1/hackathons/upcoming
 * @access  Public
 */
const getUpcomingHackathons = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const hackathons = await Hackathon.find({
    status: 'upcoming',
    isActive: true,
    startDate: { $gte: new Date() },
  })
    .sort({ startDate: 1 })
    .limit(parseInt(limit));

  res.json(
    new ApiResponse(200, { hackathons }, 'Upcoming hackathons retrieved successfully')
  );
});

/**
 * @desc    Get ongoing hackathons
 * @route   GET /api/v1/hackathons/ongoing
 * @access  Public
 */
const getOngoingHackathons = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // Update status of hackathons
  await Hackathon.updateMany(
    {
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      status: 'upcoming',
    },
    { status: 'ongoing' }
  );

  const hackathons = await Hackathon.find({
    status: 'ongoing',
    isActive: true,
  })
    .sort({ endDate: 1 })
    .limit(parseInt(limit));

  res.json(
    new ApiResponse(200, { hackathons }, 'Ongoing hackathons retrieved successfully')
  );
});

/**
 * @desc    Get past hackathons
 * @route   GET /api/v1/hackathons/past
 * @access  Public
 */
const getPastHackathons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Update status of ended hackathons
  await Hackathon.updateMany(
    {
      endDate: { $lt: new Date() },
      status: { $ne: 'completed' },
    },
    { status: 'completed' }
  );

  const [hackathons, total] = await Promise.all([
    Hackathon.find({
      status: 'completed',
      isActive: true,
    })
      .sort({ endDate: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Hackathon.countDocuments({
      status: 'completed',
      isActive: true,
    }),
  ]);

  res.json(
    new ApiResponse(200, {
      hackathons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Past hackathons retrieved successfully')
  );
});

/**
 * @desc    Bookmark/Unbookmark hackathon
 * @route   POST /api/v1/hackathons/:id/bookmark
 * @access  Private
 */
const toggleBookmark = asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.id);

  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  // Check if already bookmarked
  const existingBookmark = await Bookmark.findOne({
    user: req.user._id,
    hackathon: hackathon._id,
  });

  if (existingBookmark) {
    // Remove bookmark
    await existingBookmark.deleteOne();
    
    res.json(
      new ApiResponse(200, { bookmarked: false }, 'Hackathon removed from bookmarks')
    );
  } else {
    // Create bookmark
    await Bookmark.create({
      user: req.user._id,
      hackathon: hackathon._id,
    });

    // Log activity
    await AnalyticsService.logActivity({
      user: req.user._id,
      action: 'bookmark',
      entityType: 'hackathon',
      entityId: hackathon._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json(
      new ApiResponse(200, { bookmarked: true }, 'Hackathon added to bookmarks')
    );
  }
});

/**
 * @desc    Check if hackathon is bookmarked
 * @route   GET /api/v1/hackathons/:id/bookmark
 * @access  Private
 */
const checkBookmark = asyncHandler(async (req, res) => {
  const bookmark = await Bookmark.findOne({
    user: req.user._id,
    hackathon: req.params.id,
  });

  res.json(
    new ApiResponse(200, { bookmarked: !!bookmark }, 'Bookmark status retrieved')
  );
});

/**
 * @desc    Get hackathon engagement stats
 * @route   GET /api/v1/hackathons/:id/stats
 * @access  Public
 */
const getHackathonStats = asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.id);

  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  const stats = await AnalyticsService.getHackathonEngagement(hackathon._id);

  res.json(
    new ApiResponse(200, stats, 'Hackathon stats retrieved successfully')
  );
});

/**
 * @desc    Get popular/featured hackathons
 * @route   GET /api/v1/hackathons/featured
 * @access  Public
 */
const getFeaturedHackathons = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;

  const hackathons = await Hackathon.find({
    isFeatured: true,
    isActive: true,
    status: { $in: ['upcoming', 'ongoing'] },
  })
    .sort({ startDate: 1 })
    .limit(parseInt(limit));

  res.json(
    new ApiResponse(200, { hackathons }, 'Featured hackathons retrieved successfully')
  );
});

/**
 * @desc    Get hackathons by source (devpost, mlh, etc.)
 * @route   GET /api/v1/hackathons/source/:source
 * @access  Public
 */
const getHackathonsBySource = asyncHandler(async (req, res) => {
  const { source } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const validSources = ['devpost', 'mlh', 'manual'];
  if (!validSources.includes(source)) {
    throw new ApiError(400, 'Invalid source. Must be one of: devpost, mlh, manual');
  }

  const skip = (page - 1) * limit;

  const [hackathons, total] = await Promise.all([
    Hackathon.find({ source, isActive: true })
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Hackathon.countDocuments({ source, isActive: true }),
  ]);

  res.json(
    new ApiResponse(200, {
      hackathons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Hackathons retrieved successfully')
  );
});

module.exports = {
  getHackathons,
  getHackathon,
  createHackathon,
  updateHackathon,
  deleteHackathon,
  getUpcomingHackathons,
  getOngoingHackathons,
  getPastHackathons,
  toggleBookmark,
  checkBookmark,
  getHackathonStats,
  getFeaturedHackathons,
  getHackathonsBySource,
};
