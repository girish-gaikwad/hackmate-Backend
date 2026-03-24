const Team = require('../models/Team');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const TeammateRequest = require('../models/TeammateRequest');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');
const { NotificationService, EmailService, SearchService, AnalyticsService } = require('../services');

/**
 * @desc    Get all teams
 * @route   GET /api/v1/teams
 * @access  Private
 */
const getTeams = asyncHandler(async (req, res) => {
  const {
    query,
    hackathon,
    lookingForMembers,
    skills,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const skillsArray = skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined;

  const result = await SearchService.searchTeams({
    query,
    hackathon,
    lookingForMembers: lookingForMembers === 'true',
    skills: skillsArray,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  res.json(
    new ApiResponse(200, result, 'Teams retrieved successfully')
  );
});

/**
 * @desc    Get single team
 * @route   GET /api/v1/teams/:id
 * @access  Private
 */
const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate('leader', 'firstName lastName profilePicture college email')
    .populate('hackathon', 'name startDate endDate mode teamSize')
    .populate('members.user', 'firstName lastName profilePicture college skills')
    .populate('invitations.user', 'firstName lastName profilePicture email')
    .populate('joinRequests.user', 'firstName lastName profilePicture college skills');

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Log view activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'view',
    entityType: 'team',
    entityId: team._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { team }, 'Team retrieved successfully')
  );
});

/**
 * @desc    Create team
 * @route   POST /api/v1/teams
 * @access  Private
 */
const createTeam = asyncHandler(async (req, res) => {
  const { hackathon: hackathonId, name, description, skillsNeeded, lookingForMembers, maxSize } = req.body;

  // Verify hackathon exists
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
    throw new ApiError(404, 'Hackathon not found');
  }

  if (hackathon.status === 'completed') {
    throw new ApiError(400, 'Cannot create team for a completed hackathon');
  }

  // Check if user is already in a team for this hackathon
  const existingTeam = await Team.findOne({
    hackathon: hackathonId,
    'members.user': req.user._id,
    isActive: true,
  });

  if (existingTeam) {
    throw new ApiError(400, 'You are already in a team for this hackathon');
  }

  // Validate max size against hackathon rules
  if (hackathon.teamSize) {
    if (maxSize && maxSize > hackathon.teamSize.max) {
      throw new ApiError(400, `Team size cannot exceed hackathon limit of ${hackathon.teamSize.max}`);
    }
  }

  const team = await Team.create({
    name,
    description,
    hackathon: hackathonId,
    leader: req.user._id,
    members: [{ user: req.user._id, role: 'leader', joinedAt: new Date() }],
    skillsNeeded,
    lookingForMembers: lookingForMembers !== false,
    maxSize: maxSize || hackathon.teamSize?.max || 5,
  });

  await team.populate('leader', 'firstName lastName profilePicture');
  await team.populate('hackathon', 'name startDate endDate');
  await team.populate('members.user', 'firstName lastName profilePicture');

  // Update user's looking for team status
  await User.findByIdAndUpdate(req.user._id, { lookingForTeam: false });

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'create_team',
    entityType: 'team',
    entityId: team._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json(
    new ApiResponse(201, { team }, 'Team created successfully')
  );
});

/**
 * @desc    Update team
 * @route   PUT /api/v1/teams/:id
 * @access  Private (Leader only)
 */
const updateTeam = asyncHandler(async (req, res) => {
  let team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is leader
  if (team.leader.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only team leader can update the team');
  }

  const allowedFields = ['name', 'description', 'skillsNeeded', 'lookingForMembers', 'maxSize', 'projectUrl', 'projectDescription'];
  const updates = {};
  
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  team = await Team.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
    .populate('leader', 'firstName lastName profilePicture')
    .populate('hackathon', 'name startDate endDate')
    .populate('members.user', 'firstName lastName profilePicture');

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'update',
    entityType: 'team',
    entityId: team._id,
    metadata: { updatedFields: Object.keys(updates) },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, { team }, 'Team updated successfully')
  );
});

/**
 * @desc    Delete team
 * @route   DELETE /api/v1/teams/:id
 * @access  Private (Leader only)
 */
const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is leader
  if (team.leader.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only team leader can delete the team');
  }

  // Notify all members
  for (const member of team.members) {
    if (member.user.toString() !== req.user._id.toString()) {
      await NotificationService.createTeamDisbandNotification(
        member.user,
        team._id,
        team.name
      );
    }
  }

  // Soft delete
  team.isActive = false;
  await team.save();

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'delete',
    entityType: 'team',
    entityId: team._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, null, 'Team deleted successfully')
  );
});

/**
 * @desc    Invite user to team
 * @route   POST /api/v1/teams/:id/invite
 * @access  Private (Leader only)
 */
const inviteToTeam = asyncHandler(async (req, res) => {
  const { userId, role = 'member' } = req.body;

  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is leader
  if (team.leader.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only team leader can invite members');
  }

  // Check if team is full
  if (team.members.length >= team.maxSize) {
    throw new ApiError(400, 'Team is already full');
  }

  // Check if user exists
  const invitedUser = await User.findById(userId);
  if (!invitedUser) {
    throw new ApiError(404, 'User not found');
  }

  // Check if user is already a member
  const isMember = team.members.some((m) => m.user.toString() === userId);
  if (isMember) {
    throw new ApiError(400, 'User is already a team member');
  }

  // Check if invitation already exists
  const existingInvitation = team.invitations.find(
    (i) => i.user.toString() === userId && i.status === 'pending'
  );
  if (existingInvitation) {
    throw new ApiError(400, 'Invitation already sent to this user');
  }

  // Check if user is already in another team for this hackathon
  const existingTeam = await Team.findOne({
    hackathon: team.hackathon,
    'members.user': userId,
    isActive: true,
  });
  if (existingTeam) {
    throw new ApiError(400, 'User is already in another team for this hackathon');
  }

  // Add invitation
  team.invitations.push({
    user: userId,
    role,
    invitedBy: req.user._id,
    invitedAt: new Date(),
  });

  await team.save();

  // Send notification and email
  await NotificationService.createTeamInviteNotification(
    userId,
    req.user._id,
    team._id
  );

  const hackathon = await Hackathon.findById(team.hackathon);
  await EmailService.sendTeamInvitationEmail(
    invitedUser.email,
    invitedUser.firstName,
    team.name,
    req.user.firstName,
    hackathon.name
  );

  res.json(
    new ApiResponse(200, null, 'Invitation sent successfully')
  );
});

/**
 * @desc    Accept team invitation
 * @route   POST /api/v1/teams/:id/accept-invite
 * @access  Private
 */
const acceptInvitation = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Find pending invitation
  const invitation = team.invitations.find(
    (i) => i.user.toString() === req.user._id.toString() && i.status === 'pending'
  );

  if (!invitation) {
    throw new ApiError(404, 'No pending invitation found');
  }

  // Check if team is full
  if (team.members.length >= team.maxSize) {
    throw new ApiError(400, 'Team is already full');
  }

  // Check if user is already in another team for this hackathon
  const existingTeam = await Team.findOne({
    hackathon: team.hackathon,
    'members.user': req.user._id,
    isActive: true,
    _id: { $ne: team._id },
  });
  if (existingTeam) {
    throw new ApiError(400, 'You are already in another team for this hackathon');
  }

  // Update invitation status
  invitation.status = 'accepted';

  // Add as member
  team.members.push({
    user: req.user._id,
    role: invitation.role,
    joinedAt: new Date(),
  });

  await team.save();

  // Update user's looking for team status
  await User.findByIdAndUpdate(req.user._id, { lookingForTeam: false });

  // Notify team leader
  await NotificationService.createMemberJoinNotification(
    team.leader,
    req.user._id,
    team._id
  );

  // Log activity
  await AnalyticsService.logActivity({
    user: req.user._id,
    action: 'join_team',
    entityType: 'team',
    entityId: team._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json(
    new ApiResponse(200, null, 'Invitation accepted. You are now a team member!')
  );
});

/**
 * @desc    Decline team invitation
 * @route   POST /api/v1/teams/:id/decline-invite
 * @access  Private
 */
const declineInvitation = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Find pending invitation
  const invitation = team.invitations.find(
    (i) => i.user.toString() === req.user._id.toString() && i.status === 'pending'
  );

  if (!invitation) {
    throw new ApiError(404, 'No pending invitation found');
  }

  // Update invitation status
  invitation.status = 'declined';
  await team.save();

  res.json(
    new ApiResponse(200, null, 'Invitation declined')
  );
});

/**
 * @desc    Request to join team
 * @route   POST /api/v1/teams/:id/request-join
 * @access  Private
 */
const requestToJoin = asyncHandler(async (req, res) => {
  const { message } = req.body;

  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  if (!team.lookingForMembers) {
    throw new ApiError(400, 'This team is not accepting join requests');
  }

  // Check if team is full
  if (team.members.length >= team.maxSize) {
    throw new ApiError(400, 'Team is already full');
  }

  // Check if user is already a member
  const isMember = team.members.some((m) => m.user.toString() === req.user._id.toString());
  if (isMember) {
    throw new ApiError(400, 'You are already a team member');
  }

  // Check if request already exists
  const existingRequest = team.joinRequests.find(
    (r) => r.user.toString() === req.user._id.toString() && r.status === 'pending'
  );
  if (existingRequest) {
    throw new ApiError(400, 'You have already requested to join this team');
  }

  // Check if user is in another team for this hackathon
  const existingTeam = await Team.findOne({
    hackathon: team.hackathon,
    'members.user': req.user._id,
    isActive: true,
  });
  if (existingTeam) {
    throw new ApiError(400, 'You are already in another team for this hackathon');
  }

  // Add join request
  team.joinRequests.push({
    user: req.user._id,
    message,
    requestedAt: new Date(),
  });

  await team.save();

  // Notify team leader
  await NotificationService.createJoinRequestNotification(
    team.leader,
    req.user._id,
    team._id
  );

  res.json(
    new ApiResponse(200, null, 'Join request sent successfully')
  );
});

/**
 * @desc    Accept join request
 * @route   POST /api/v1/teams/:id/accept-request/:userId
 * @access  Private (Leader only)
 */
const acceptJoinRequest = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const team = await Team.findById(id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is leader
  if (team.leader.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only team leader can accept join requests');
  }

  // Find pending request
  const joinRequest = team.joinRequests.find(
    (r) => r.user.toString() === userId && r.status === 'pending'
  );

  if (!joinRequest) {
    throw new ApiError(404, 'No pending join request found from this user');
  }

  // Check if team is full
  if (team.members.length >= team.maxSize) {
    throw new ApiError(400, 'Team is already full');
  }

  // Update request status
  joinRequest.status = 'accepted';

  // Add as member
  team.members.push({
    user: userId,
    role: 'member',
    joinedAt: new Date(),
  });

  await team.save();

  // Update user's looking for team status
  await User.findByIdAndUpdate(userId, { lookingForTeam: false });

  // Notify the user
  await NotificationService.createRequestAcceptedNotification(
    userId,
    team.leader,
    team._id
  );

  res.json(
    new ApiResponse(200, null, 'Join request accepted')
  );
});

/**
 * @desc    Reject join request
 * @route   POST /api/v1/teams/:id/reject-request/:userId
 * @access  Private (Leader only)
 */
const rejectJoinRequest = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const team = await Team.findById(id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is leader
  if (team.leader.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only team leader can reject join requests');
  }

  // Find pending request
  const joinRequest = team.joinRequests.find(
    (r) => r.user.toString() === userId && r.status === 'pending'
  );

  if (!joinRequest) {
    throw new ApiError(404, 'No pending join request found from this user');
  }

  // Update request status
  joinRequest.status = 'rejected';
  await team.save();

  res.json(
    new ApiResponse(200, null, 'Join request rejected')
  );
});

/**
 * @desc    Remove member from team
 * @route   DELETE /api/v1/teams/:id/members/:userId
 * @access  Private (Leader only)
 */
const removeMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const team = await Team.findById(id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is leader
  if (team.leader.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only team leader can remove members');
  }

  // Can't remove self (leader)
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, 'Leader cannot remove themselves. Transfer leadership first or delete the team.');
  }

  // Find member
  const memberIndex = team.members.findIndex((m) => m.user.toString() === userId);
  if (memberIndex === -1) {
    throw new ApiError(404, 'User is not a team member');
  }

  // Remove member
  team.members.splice(memberIndex, 1);
  await team.save();

  // Notify removed member
  await NotificationService.createRemovedFromTeamNotification(
    userId,
    team._id,
    team.name
  );

  res.json(
    new ApiResponse(200, null, 'Member removed from team')
  );
});

/**
 * @desc    Leave team
 * @route   POST /api/v1/teams/:id/leave
 * @access  Private
 */
const leaveTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member
  const memberIndex = team.members.findIndex(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (memberIndex === -1) {
    throw new ApiError(400, 'You are not a member of this team');
  }

  // Leader can't leave - must transfer leadership first
  if (team.leader.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'Team leader cannot leave. Transfer leadership first or delete the team.');
  }

  // Remove from members
  team.members.splice(memberIndex, 1);
  await team.save();

  // Notify team leader
  await NotificationService.createMemberLeftNotification(
    team.leader,
    req.user._id,
    team._id
  );

  res.json(
    new ApiResponse(200, null, 'You have left the team')
  );
});

/**
 * @desc    Transfer leadership
 * @route   POST /api/v1/teams/:id/transfer-leadership
 * @access  Private (Leader only)
 */
const transferLeadership = asyncHandler(async (req, res) => {
  const { newLeaderId } = req.body;

  const team = await Team.findById(req.params.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is leader
  if (team.leader.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only team leader can transfer leadership');
  }

  // Check if new leader is a member
  const newLeaderMember = team.members.find((m) => m.user.toString() === newLeaderId);
  if (!newLeaderMember) {
    throw new ApiError(400, 'New leader must be a team member');
  }

  // Update roles
  const currentLeaderMember = team.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );
  currentLeaderMember.role = 'member';
  newLeaderMember.role = 'leader';
  team.leader = newLeaderId;

  await team.save();

  // Notify new leader
  await NotificationService.createLeadershipTransferNotification(
    newLeaderId,
    req.user._id,
    team._id
  );

  res.json(
    new ApiResponse(200, null, 'Leadership transferred successfully')
  );
});

/**
 * @desc    Get my teams
 * @route   GET /api/v1/teams/my-teams
 * @access  Private
 */
const getMyTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({
    'members.user': req.user._id,
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
 * @desc    Get my pending invitations
 * @route   GET /api/v1/teams/invitations
 * @access  Private
 */
const getMyInvitations = asyncHandler(async (req, res) => {
  const teams = await Team.find({
    'invitations.user': req.user._id,
    'invitations.status': 'pending',
    isActive: true,
  })
    .populate('leader', 'firstName lastName profilePicture')
    .populate('hackathon', 'name startDate endDate')
    .select('name description hackathon leader invitations');

  // Filter to only include relevant invitation info
  const invitations = teams.map((team) => {
    const invitation = team.invitations.find(
      (i) => i.user.toString() === req.user._id.toString() && i.status === 'pending'
    );
    return {
      team: {
        _id: team._id,
        name: team.name,
        description: team.description,
        hackathon: team.hackathon,
        leader: team.leader,
      },
      invitation: {
        role: invitation.role,
        invitedAt: invitation.invitedAt,
      },
    };
  });

  res.json(
    new ApiResponse(200, { invitations }, 'Invitations retrieved successfully')
  );
});

/**
 * @desc    Get teams looking for members
 * @route   GET /api/v1/teams/looking-for-members
 * @access  Private
 */
const getTeamsLookingForMembers = asyncHandler(async (req, res) => {
  const { hackathon, skills, page = 1, limit = 10 } = req.query;

  const filter = {
    lookingForMembers: true,
    isActive: true,
    $expr: { $lt: [{ $size: '$members' }, '$maxSize'] }, // Has space for more members
    'members.user': { $ne: req.user._id }, // Exclude teams user is already in
  };

  if (hackathon) {
    filter.hackathon = hackathon;
  }

  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : skills.split(',');
    filter.skillsNeeded = { $in: skillsArray };
  }

  const skip = (page - 1) * limit;

  const [teams, total] = await Promise.all([
    Team.find(filter)
      .populate('leader', 'firstName lastName profilePicture college')
      .populate('hackathon', 'name startDate endDate')
      .populate('members.user', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Team.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      teams,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }, 'Teams retrieved successfully')
  );
});

module.exports = {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  inviteToTeam,
  acceptInvitation,
  declineInvitation,
  requestToJoin,
  acceptJoinRequest,
  rejectJoinRequest,
  removeMember,
  leaveTeam,
  transferLeadership,
  getMyTeams,
  getMyInvitations,
  getTeamsLookingForMembers,
};
