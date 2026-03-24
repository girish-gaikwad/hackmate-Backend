const TeammateRequest = require('../models/TeammateRequest');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { NotificationService, SearchService, AnalyticsService } = require('../services');

/**
 * @desc    Get all teammate requests
 * @route   GET /api/v1/teammate-requests
 * @access  Private
 */
const getTeammateRequests = asyncHandler(async (req, res) => {
  const {
    query,
    skills,
    hackathon,
    college,
    roleNeeded,
    experienceLevel,
    status = 'open',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Parse skills if provided as comma-separated string
  const skillsArray = skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined;

  const result = await SearchService.searchTeammateRequests({
    query,
    skills: skillsArray,
    hackathon,
    college,
    roleNeeded,
    experienceLevel,
    status,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Teammate requests retrieved successfully')
  );
});

/**
 * @desc    Get single teammate request
 * @route   GET /api/v1/teammate-requests/:id
 * @access  Private
 */
const getTeammateRequest = asyncHandler(async (req, res) => {
  const request = await TeammateRequest.findById(req.params.id)
    .populate('author', 'firstName lastName profilePicture college skills bio')
    .populate('hackathon', 'name startDate endDate mode teamSize')
    .populate('interestedUsers.user', 'firstName lastName profilePicture college skills');

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Increment view count
  request.viewCount = (request.viewCount || 0) + 1;
  await request.save();

  // Log view activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'view',
    entityType: 'teammate_request',
    entityId: request._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { request }, 'Teammate request retrieved successfully')
  );
});

/**
 * @desc    Create teammate request
 * @route   POST /api/v1/teammate-requests
 * @access  Private
 */
const createTeammateRequest = asyncHandler(async (req, res) => {
  const { hackathon: hackathonId, ...requestData } = req.body;

  // Verify hackathon exists
  if (hackathonId) {
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      throw new ApiError(404, 'Hackathon not found');
    }
    if (hackathon.status === 'completed') {
      throw new ApiError(400, 'Cannot create request for a completed hackathon');
    }
  }

  // Check for existing open request for same hackathon
  if (hackathonId) {
    const existingRequest = await TeammateRequest.findOne({
      author: req.user._id,
      hackathon: hackathonId,
      status: 'open',
    });

    if (existingRequest) {
      throw new ApiError(400, 'You already have an open request for this hackathon');
    }
  }

  const request = await TeammateRequest.create({
    ...requestData,
    hackathon: hackathonId,
    author: req.user._id,
    college: req.user.college,
  });

  await request.populate('author', 'firstName lastName profilePicture college');
  await request.populate('hackathon', 'name startDate endDate');

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'create',
    entityType: 'teammate_request',
    entityId: request._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json(
    new ApiResponse(201, { request }, 'Teammate request created successfully')
  );
});

/**
 * @desc    Update teammate request
 * @route   PUT /api/v1/teammate-requests/:id
 * @access  Private (Owner only)
 */
const updateTeammateRequest = asyncHandler(async (req, res) => {
  let request = await TeammateRequest.findById(req.params.id);

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Check ownership
  if (request.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this request');
  }

  // Don't allow updating if request is fulfilled
  if (request.status === 'fulfilled') {
    throw new ApiError(400, 'Cannot update a fulfilled request');
  }

  // Allowed fields to update
  const allowedFields = [
    'title',
    'description',
    'skillsNeeded',
    'rolesNeeded',
    'experienceLevel',
    'teamSize',
    'communicationPreference',
    'deadline',
  ];

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  request = await TeammateRequest.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
    .populate('author', 'firstName lastName profilePicture college')
    .populate('hackathon', 'name startDate endDate');

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'update',
    entityType: 'teammate_request',
    entityId: request._id,
    metadata: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { request }, 'Teammate request updated successfully')
  );
});

/**
 * @desc    Delete teammate request
 * @route   DELETE /api/v1/teammate-requests/:id
 * @access  Private (Owner only)
 */
const deleteTeammateRequest = asyncHandler(async (req, res) => {
  const request = await TeammateRequest.findById(req.params.id);

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Check ownership
  if (request.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to delete this request');
  }

  await request.deleteOne();

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'delete',
    entityType: 'teammate_request',
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, null, 'Teammate request deleted successfully')
  );
});

/**
 * @desc    Express interest in a teammate request
 * @route   POST /api/v1/teammate-requests/:id/interest
 * @access  Private
 */
const expressInterest = asyncHandler(async (req, res) => {
  const { message } = req.body;

  const request = await TeammateRequest.findById(req.params.id)
    .populate('author', 'firstName lastName email');

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  if (request.status !== 'open') {
    throw new ApiError(400, 'This request is no longer accepting interests');
  }

  // Can't express interest in own request
  if (request.author._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'Cannot express interest in your own request');
  }

  // Check if already expressed interest
  const existingInterest = request.interestedUsers.find(
    (i) => i.user.toString() === req.user._id.toString()
  );

  if (existingInterest) {
    throw new ApiError(400, 'You have already expressed interest in this request');
  }

  // Add interest
  request.interestedUsers.push({
    user: req.user._id,
    message,
    expressedAt: new Date(),
  });

  await request.save();

  // Send notification to request author
  await NotificationService.createInterestNotification(
    request.author._id,
    req.user._id,
    request._id
  );

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'express_interest',
    entityType: 'teammate_request',
    entityId: request._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, null, 'Interest expressed successfully')
  );
});

/**
 * @desc    Withdraw interest from a teammate request
 * @route   DELETE /api/v1/teammate-requests/:id/interest
 * @access  Private
 */
const withdrawInterest = asyncHandler(async (req, res) => {
  const request = await TeammateRequest.findById(req.params.id);

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Find and remove interest
  const interestIndex = request.interestedUsers.findIndex(
    (i) => i.user.toString() === req.user._id.toString()
  );

  if (interestIndex === -1) {
    throw new ApiError(400, 'You have not expressed interest in this request');
  }

  request.interestedUsers.splice(interestIndex, 1);
  await request.save();

  res.json(
    new ApiResponse(200, null, 'Interest withdrawn successfully')
  );
});

/**
 * @desc    Accept an interested user
 * @route   POST /api/v1/teammate-requests/:id/accept/:userId
 * @access  Private (Owner only)
 */
const acceptInterest = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const request = await TeammateRequest.findById(id);

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Check ownership
  if (request.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to accept interests for this request');
  }

  // Find the interested user
  const interest = request.interestedUsers.find(
    (i) => i.user.toString() === userId
  );

  if (!interest) {
    throw new ApiError(404, 'User has not expressed interest in this request');
  }

  // Update interest status
  interest.status = 'accepted';
  await request.save();

  // Send notification to the accepted user
  await NotificationService.createInterestAcceptedNotification(
    userId,
    req.user._id,
    request._id
  );

  res.json(
    new ApiResponse(200, null, 'Interest accepted successfully')
  );
});

/**
 * @desc    Reject an interested user
 * @route   POST /api/v1/teammate-requests/:id/reject/:userId
 * @access  Private (Owner only)
 */
const rejectInterest = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const request = await TeammateRequest.findById(id);

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Check ownership
  if (request.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to reject interests for this request');
  }

  // Find the interested user
  const interest = request.interestedUsers.find(
    (i) => i.user.toString() === userId
  );

  if (!interest) {
    throw new ApiError(404, 'User has not expressed interest in this request');
  }

  // Update interest status
  interest.status = 'rejected';
  await request.save();

  res.json(
    new ApiResponse(200, null, 'Interest rejected')
  );
});

/**
 * @desc    Close teammate request
 * @route   PUT /api/v1/teammate-requests/:id/close
 * @access  Private (Owner only)
 */
const closeRequest = asyncHandler(async (req, res) => {
  const request = await TeammateRequest.findById(req.params.id);

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Check ownership
  if (request.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to close this request');
  }

  request.status = 'closed';
  await request.save();

  res.json(
    new ApiResponse(200, { request }, 'Request closed successfully')
  );
});

/**
 * @desc    Mark request as fulfilled
 * @route   PUT /api/v1/teammate-requests/:id/fulfill
 * @access  Private (Owner only)
 */
const fulfillRequest = asyncHandler(async (req, res) => {
  const request = await TeammateRequest.findById(req.params.id);

  if (!request) {
    throw new ApiError(404, 'Teammate request not found');
  }

  // Check ownership
  if (request.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this request');
  }

  request.status = 'fulfilled';
  await request.save();

  res.json(
    new ApiResponse(200, { request }, 'Request marked as fulfilled')
  );
});

/**
 * @desc    Get requests from same college
 * @route   GET /api/v1/teammate-requests/college
 * @access  Private
 */
const getCollegeRequests = asyncHandler(async (req, res) => {
  if (!req.user.college) {
    throw new ApiError(400, 'You must have a college set to view college-specific requests');
  }

  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    TeammateRequest.find({
      college: req.user.college,
      status: 'open',
      author: { $ne: req.user._id }, // Exclude own requests
    })
      .populate('author', 'firstName lastName profilePicture skills')
      .populate('hackathon', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TeammateRequest.countDocuments({
      college: req.user.college,
      status: 'open',
      author: { $ne: req.user._id },
    }),
  ]);

  res.json(
    new ApiResponse(200, {
      requests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'College requests retrieved successfully')
  );
});

/**
 * @desc    Get requests by hackathon
 * @route   GET /api/v1/teammate-requests/hackathon/:hackathonId
 * @access  Private
 */
const getRequestsByHackathon = asyncHandler(async (req, res) => {
  const { hackathonId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    TeammateRequest.find({
      hackathon: hackathonId,
      status: 'open',
    })
      .populate('author', 'firstName lastName profilePicture college skills')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TeammateRequest.countDocuments({
      hackathon: hackathonId,
      status: 'open',
    }),
  ]);

  res.json(
    new ApiResponse(200, {
      hackathon: {
        _id: hackathon._id,
        name: hackathon.name,
      },
      requests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Hackathon requests retrieved successfully')
  );
});

module.exports = {
  getTeammateRequests,
  getTeammateRequest,
  createTeammateRequest,
  updateTeammateRequest,
  deleteTeammateRequest,
  expressInterest,
  withdrawInterest,
  acceptInterest,
  rejectInterest,
  closeRequest,
  fulfillRequest,
  getCollegeRequests,
  getRequestsByHackathon,
};
