const User = require('../models/User');
const Team = require('../models/Team');
const TeammateRequest = require('../models/TeammateRequest');
const Resource = require('../models/Resource');
const Bookmark = require('../models/Bookmark');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { FileUploadService, AnalyticsService } = require('../services');

/**
 * @desc    Get user profile by ID
 * @route   GET /api/v1/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-verificationToken -verificationTokenExpires -passwordResetToken -passwordResetExpires');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Log view activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'view',
    entityType: 'user',
    entityId: user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { user }, 'User retrieved successfully')
  );
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'firstName',
    'lastName',
    'bio',
    'college',
    'graduationYear',
    'skills',
    'interests',
    'socialLinks',
    'experienceLevel',
    'lookingForTeam',
    'preferredRoles',
  ];

  // Filter out non-allowed fields
  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'update',
    entityType: 'user',
    entityId: user._id,
    metadata: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { user }, 'Profile updated successfully')
  );
});

/**
 * @desc    Update profile picture
 * @route   PUT /api/v1/users/profile/picture
 * @access  Private
 */
const updateProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an image file');
  }

  const user = await User.findById(req.user._id);

  // Delete old profile picture if exists
  if (user.profilePicture) {
    await FileUploadService.deleteFile(user.profilePicture);
  }

  // The file is already uploaded by multer middleware
  user.profilePicture = req.file.path;
  await user.save();

  res.json(
    new ApiResponse(200, { 
      profilePicture: user.profilePicture 
    }, 'Profile picture updated successfully')
  );
});

/**
 * @desc    Delete profile picture
 * @route   DELETE /api/v1/users/profile/picture
 * @access  Private
 */
const deleteProfilePicture = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.profilePicture) {
    await FileUploadService.deleteFile(user.profilePicture);
    user.profilePicture = undefined;
    await user.save();
  }

  res.json(
    new ApiResponse(200, null, 'Profile picture deleted successfully')
  );
});

/**
 * @desc    Get user's teams
 * @route   GET /api/v1/users/:id/teams
 * @access  Private
 */
const getUserTeams = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.user._id;

  const teams = await Team.find({
    'members.user': userId,
    isActive: true,
  })
    .populate('leader', 'firstName lastName profilePicture')
    .populate('hackathon', 'name startDate endDate status')
    .populate('members.user', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 });

  res.json(
    new ApiResponse(200, { teams }, 'Teams retrieved successfully')
  );
});

/**
 * @desc    Get user's teammate requests
 * @route   GET /api/v1/users/:id/requests
 * @access  Private
 */
const getUserRequests = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.user._id;
  const { status } = req.query;

  const filter = { author: userId };
  if (status) {
    filter.status = status;
  }

  const requests = await TeammateRequest.find(filter)
    .populate('hackathon', 'name startDate endDate')
    .sort({ createdAt: -1 });

  res.json(
    new ApiResponse(200, { requests }, 'Teammate requests retrieved successfully')
  );
});

/**
 * @desc    Get user's resources
 * @route   GET /api/v1/users/:id/resources
 * @access  Private
 */
const getUserResources = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const [resources, total] = await Promise.all([
    Resource.find({ author: userId, isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Resource.countDocuments({ author: userId, isActive: true }),
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
 * @desc    Get user's bookmarks
 * @route   GET /api/v1/users/bookmarks
 * @access  Private
 */
const getUserBookmarks = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 10 } = req.query;

  const filter = { user: req.user._id };
  if (type) {
    filter[type] = { $exists: true };
  }

  const skip = (page - 1) * limit;

  const [bookmarks, total] = await Promise.all([
    Bookmark.find(filter)
      .populate('hackathon', 'name startDate endDate status mode')
      .populate('resource', 'title type category voteCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Bookmark.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      bookmarks,
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
 * @desc    Get users looking for team
 * @route   GET /api/v1/users/looking-for-team
 * @access  Private
 */
const getUsersLookingForTeam = asyncHandler(async (req, res) => {
  const { 
    skills, 
    college, 
    experienceLevel,
    page = 1, 
    limit = 10 
  } = req.query;

  const filter = { 
    lookingForTeam: true, 
    isActive: true,
    _id: { $ne: req.user._id }, // Exclude current user
  };

  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : skills.split(',');
    filter.skills = { $in: skillsArray };
  }

  if (college) {
    filter.college = college;
  }

  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('firstName lastName profilePicture college skills bio experienceLevel')
      .sort({ lastLogin: -1 })
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
 * @desc    Update notification settings
 * @route   PUT /api/v1/users/notifications/settings
 * @access  Private
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { notificationPreferences } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { notificationPreferences },
    { new: true, runValidators: true }
  );

  res.json(
    new ApiResponse(200, { 
      notificationPreferences: user.notificationPreferences 
    }, 'Notification settings updated successfully')
  );
});

/**
 * @desc    Deactivate user account
 * @route   DELETE /api/v1/users/account
 * @access  Private
 */
const deactivateAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid password');
  }

  // Deactivate account
  user.isActive = false;
  await user.save();

  // Log activity
  await AnalyticsService.logActivity({
    user: user._id,
    action: 'deactivate',
    entityType: 'user',
    entityId: user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, null, 'Account deactivated successfully')
  );
});

/**
 * @desc    Get user's activity feed
 * @route   GET /api/v1/users/activity
 * @access  Private
 */
const getUserActivity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const activity = await AnalyticsService.getUserActivity(req.user._id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  res.json(
    new ApiResponse(200, activity, 'Activity retrieved successfully')
  );
});

/**
 * @desc    Get user's engagement score
 * @route   GET /api/v1/users/engagement-score
 * @access  Private
 */
const getEngagementScore = asyncHandler(async (req, res) => {
  const score = await AnalyticsService.getUserEngagementScore(req.user._id);

  res.json(
    new ApiResponse(200, score, 'Engagement score retrieved successfully')
  );
});

module.exports = {
  getUserById,
  updateProfile,
  updateProfilePicture,
  deleteProfilePicture,
  getUserTeams,
  getUserRequests,
  getUserResources,
  getUserBookmarks,
  getUsersLookingForTeam,
  updateNotificationSettings,
  deactivateAccount,
  getUserActivity,
  getEngagementScore,
};
