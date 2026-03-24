const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const TeammateRequest = require('../models/TeammateRequest');
const Team = require('../models/Team');
const Resource = require('../models/Resource');
const CollegeDomain = require('../models/CollegeDomain');
const ActivityLog = require('../models/ActivityLog');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { AnalyticsService, HackathonSyncService } = require('../services');

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/v1/admin/stats
 * @access  Private/Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await AnalyticsService.getPlatformStats();

  res.json(
    new ApiResponse(200, stats, 'Dashboard stats retrieved successfully')
  );
});

/**
 * @desc    Get user growth stats
 * @route   GET /api/v1/admin/stats/user-growth
 * @access  Private/Admin
 */
const getUserGrowthStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const growth = await AnalyticsService.getUserGrowthStats(parseInt(days));

  res.json(
    new ApiResponse(200, { growth }, 'User growth stats retrieved successfully')
  );
});

/**
 * @desc    Get all users (admin)
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const {
    search,
    role,
    isVerified,
    isActive,
    college,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) filter.role = role;
  if (typeof isVerified !== 'undefined') filter.isVerified = isVerified === 'true';
  if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';
  if (college) filter.college = college;

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -verificationToken -passwordResetToken')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Users retrieved successfully')
  );
});

/**
 * @desc    Get single user (admin)
 * @route   GET /api/v1/admin/users/:id
 * @access  Private/Admin
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -verificationToken -passwordResetToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Get user's activity summary
  const [teamsCount, requestsCount, resourcesCount] = await Promise.all([
    Team.countDocuments({ 'members.user': user._id }),
    TeammateRequest.countDocuments({ author: user._id }),
    Resource.countDocuments({ author: user._id }),
  ]);

  res.json(
    new ApiResponse(200, {
      user,
      stats: {
        teams: teamsCount,
        requests: requestsCount,
        resources: resourcesCount,
      },
    }, 'User retrieved successfully')
  );
});

/**
 * @desc    Update user (admin)
 * @route   PUT /api/v1/admin/users/:id
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const allowedFields = ['role', 'isActive', 'isVerified'];
  const updates = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password -verificationToken -passwordResetToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json(
    new ApiResponse(200, { user }, 'User updated successfully')
  );
});

/**
 * @desc    Delete user (admin)
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Don't allow deleting yourself or other admins
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'Cannot delete your own account');
  }

  if (user.role === 'admin') {
    throw new ApiError(400, 'Cannot delete admin accounts');
  }

  // Soft delete
  user.isActive = false;
  await user.save();

  res.json(
    new ApiResponse(200, null, 'User deactivated successfully')
  );
});

/**
 * @desc    Get all hackathons (admin)
 * @route   GET /api/v1/admin/hackathons
 * @access  Private/Admin
 */
const getHackathons = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    source,
    isActive,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { organizer: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) filter.status = status;
  if (source) filter.source = source;
  if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [hackathons, total] = await Promise.all([
    Hackathon.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    Hackathon.countDocuments(filter),
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

/**
 * @desc    Toggle hackathon featured status
 * @route   PUT /api/v1/admin/hackathons/:id/featured
 * @access  Private/Admin
 */
const toggleFeatured = asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.id);

  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  hackathon.isFeatured = !hackathon.isFeatured;
  await hackathon.save();

  res.json(
    new ApiResponse(200, {
      isFeatured: hackathon.isFeatured,
    }, `Hackathon ${hackathon.isFeatured ? 'featured' : 'unfeatured'} successfully`)
  );
});

/**
 * @desc    Sync hackathons from external sources
 * @route   POST /api/v1/admin/hackathons/sync
 * @access  Private/Admin
 */
const syncHackathons = asyncHandler(async (req, res) => {
  const { source } = req.body;

  if (source && !['devpost', 'mlh', 'all'].includes(source)) {
    throw new ApiError(400, 'Invalid source. Must be devpost, mlh, or all');
  }

  const results = {};

  if (!source || source === 'all' || source === 'devpost') {
    results.devpost = await HackathonSyncService.syncFromDevpost();
  }

  if (!source || source === 'all' || source === 'mlh') {
    results.mlh = await HackathonSyncService.syncFromMLH();
  }

  res.json(
    new ApiResponse(200, results, 'Hackathon sync completed')
  );
});

/**
 * @desc    Manage college domains
 * @route   GET /api/v1/admin/college-domains
 * @access  Private/Admin
 */
const getCollegeDomains = asyncHandler(async (req, res) => {
  const { search, isActive, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { domain: { $regex: search, $options: 'i' } },
      { collegeName: { $regex: search, $options: 'i' } },
    ];
  }

  if (typeof isActive !== 'undefined') {
    filter.isActive = isActive === 'true';
  }

  const skip = (page - 1) * limit;

  const [domains, total] = await Promise.all([
    CollegeDomain.find(filter)
      .sort({ collegeName: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    CollegeDomain.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      domains,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'College domains retrieved successfully')
  );
});

/**
 * @desc    Add college domain
 * @route   POST /api/v1/admin/college-domains
 * @access  Private/Admin
 */
const addCollegeDomain = asyncHandler(async (req, res) => {
  const { domain, collegeName, location } = req.body;

  // Check if domain already exists
  const existing = await CollegeDomain.findOne({ domain: domain.toLowerCase() });
  if (existing) {
    throw new ApiError(400, 'Domain already exists');
  }

  const collegeDomain = await CollegeDomain.create({
    domain: domain.toLowerCase(),
    collegeName,
    location,
  });

  res.status(201).json(
    new ApiResponse(201, { collegeDomain }, 'College domain added successfully')
  );
});

/**
 * @desc    Update college domain
 * @route   PUT /api/v1/admin/college-domains/:id
 * @access  Private/Admin
 */
const updateCollegeDomain = asyncHandler(async (req, res) => {
  const { collegeName, location, isActive } = req.body;

  const collegeDomain = await CollegeDomain.findByIdAndUpdate(
    req.params.id,
    { collegeName, location, isActive },
    { new: true, runValidators: true }
  );

  if (!collegeDomain) {
    throw new ApiError(404, 'College domain not found');
  }

  res.json(
    new ApiResponse(200, { collegeDomain }, 'College domain updated successfully')
  );
});

/**
 * @desc    Delete college domain
 * @route   DELETE /api/v1/admin/college-domains/:id
 * @access  Private/Admin
 */
const deleteCollegeDomain = asyncHandler(async (req, res) => {
  const collegeDomain = await CollegeDomain.findByIdAndDelete(req.params.id);

  if (!collegeDomain) {
    throw new ApiError(404, 'College domain not found');
  }

  res.json(
    new ApiResponse(200, null, 'College domain deleted successfully')
  );
});

/**
 * @desc    Get activity logs
 * @route   GET /api/v1/admin/activity-logs
 * @access  Private/Admin
 */
const getActivityLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    action,
    entityType,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const filter = {};

  if (userId) filter.user = userId;
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    ActivityLog.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Activity logs retrieved successfully')
  );
});

/**
 * @desc    Get resource stats
 * @route   GET /api/v1/admin/stats/resources
 * @access  Private/Admin
 */
const getResourceStats = asyncHandler(async (req, res) => {
  const stats = await AnalyticsService.getResourceStats();

  res.json(
    new ApiResponse(200, stats, 'Resource stats retrieved successfully')
  );
});

/**
 * @desc    Get team formation stats
 * @route   GET /api/v1/admin/stats/teams
 * @access  Private/Admin
 */
const getTeamStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const stats = await AnalyticsService.getTeamFormationStats(parseInt(days));

  res.json(
    new ApiResponse(200, stats, 'Team stats retrieved successfully')
  );
});

/**
 * @desc    Get popular skills
 * @route   GET /api/v1/admin/stats/skills
 * @access  Private/Admin
 */
const getSkillsStats = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const skills = await AnalyticsService.getPopularSkills(parseInt(limit));

  res.json(
    new ApiResponse(200, { skills }, 'Skills stats retrieved successfully')
  );
});

/**
 * @desc    Get popular colleges
 * @route   GET /api/v1/admin/stats/colleges
 * @access  Private/Admin
 */
const getCollegesStats = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const colleges = await AnalyticsService.getPopularColleges(parseInt(limit));

  res.json(
    new ApiResponse(200, { colleges }, 'Colleges stats retrieved successfully')
  );
});

/**
 * @desc    Bulk import college domains
 * @route   POST /api/v1/admin/college-domains/bulk
 * @access  Private/Admin
 */
const bulkImportCollegeDomains = asyncHandler(async (req, res) => {
  const { domains } = req.body;

  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    throw new ApiError(400, 'domains array is required');
  }

  const results = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  for (const item of domains) {
    try {
      const existing = await CollegeDomain.findOne({ domain: item.domain.toLowerCase() });
      if (existing) {
        results.skipped++;
        continue;
      }

      await CollegeDomain.create({
        domain: item.domain.toLowerCase(),
        collegeName: item.collegeName,
        location: item.location,
      });
      results.created++;
    } catch (error) {
      results.errors.push({ domain: item.domain, error: error.message });
    }
  }

  res.json(
    new ApiResponse(200, results, 'Bulk import completed')
  );
});

module.exports = {
  getDashboardStats,
  getUserGrowthStats,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getHackathons,
  toggleFeatured,
  syncHackathons,
  getCollegeDomains,
  addCollegeDomain,
  updateCollegeDomain,
  deleteCollegeDomain,
  bulkImportCollegeDomains,
  getActivityLogs,
  getResourceStats,
  getTeamStats,
  getSkillsStats,
  getCollegesStats,
};
