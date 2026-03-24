const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    hackathonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hackathon',
      index: true,
    },
    customHackathonName: {
      type: String,
      trim: true,
      maxlength: [200, 'Custom hackathon name cannot exceed 200 characters'],
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true,
    },
    collegeDomain: {
      type: String,
      required: [true, 'College domain is required'],
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    techStack: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['forming', 'formed', 'competing', 'completed'],
      default: 'forming',
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          default: 'Member',
          maxlength: [50, 'Role cannot exceed 50 characters'],
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    maxMembers: {
      type: Number,
      default: 4,
      min: [2, 'Team must have at least 2 members capacity'],
      max: [10, 'Team cannot have more than 10 members'],
    },
    invitations: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          default: 'Member',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined'],
          default: 'pending',
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    projectUrl: {
      type: String,
      default: '',
      match: [/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$|^$/, 'Invalid project URL'],
    },
    achievements: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
teamSchema.index({ collegeDomain: 1, status: 1 });
teamSchema.index({ 'members.userId': 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

// Virtual for available spots
teamSchema.virtual('availableSpots').get(function () {
  return this.maxMembers - (this.members ? this.members.length : 0);
});

// Virtual for pending invitations count
teamSchema.virtual('pendingInvitationsCount').get(function () {
  return this.invitations
    ? this.invitations.filter((inv) => inv.status === 'pending').length
    : 0;
});

// Pre-save middleware to add creator as first member
teamSchema.pre('save', function (next) {
  if (this.isNew && this.members.length === 0) {
    this.members.push({
      userId: this.creatorId,
      role: 'Team Lead',
      joinedAt: new Date(),
    });
  }
  next();
});

// Instance method to check if user is a member
teamSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) => member.userId.toString() === userId.toString()
  );
};

// Instance method to check if user is the creator
teamSchema.methods.isCreator = function (userId) {
  return this.creatorId.toString() === userId.toString();
};

// Instance method to add member
teamSchema.methods.addMember = function (userId, role = 'Member') {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this team');
  }

  if (this.members.length >= this.maxMembers) {
    throw new Error('Team is already full');
  }

  this.members.push({
    userId,
    role,
    joinedAt: new Date(),
  });

  // Update status if team is now full
  if (this.members.length >= this.maxMembers) {
    this.status = 'formed';
  }

  return this;
};

// Instance method to remove member
teamSchema.methods.removeMember = function (userId) {
  if (this.isCreator(userId)) {
    throw new Error('Creator cannot be removed from the team');
  }

  this.members = this.members.filter(
    (member) => member.userId.toString() !== userId.toString()
  );

  // Update status if team is no longer full
  if (this.members.length < this.maxMembers && this.status === 'formed') {
    this.status = 'forming';
  }

  return this;
};

// Instance method to send invitation
teamSchema.methods.sendInvitation = function (userId, role = 'Member') {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this team');
  }

  const existingInvitation = this.invitations.find(
    (inv) =>
      inv.userId.toString() === userId.toString() && inv.status === 'pending'
  );

  if (existingInvitation) {
    throw new Error('User already has a pending invitation');
  }

  this.invitations.push({
    userId,
    role,
    status: 'pending',
    sentAt: new Date(),
  });

  return this;
};

// Instance method to respond to invitation
teamSchema.methods.respondToInvitation = function (userId, accept = true) {
  const invitation = this.invitations.find(
    (inv) =>
      inv.userId.toString() === userId.toString() && inv.status === 'pending'
  );

  if (!invitation) {
    throw new Error('No pending invitation found');
  }

  if (accept) {
    invitation.status = 'accepted';
    this.addMember(userId, invitation.role);
  } else {
    invitation.status = 'declined';
  }

  return this;
};

// Instance method to get pending invitation for a user
teamSchema.methods.getPendingInvitation = function (userId) {
  return this.invitations.find(
    (inv) =>
      inv.userId.toString() === userId.toString() && inv.status === 'pending'
  );
};

// Static method to get teams by college domain
teamSchema.statics.getByCollegeDomain = function (domain, options = {}) {
  const { status, page = 1, limit = 20 } = options;
  const query = { collegeDomain: domain };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('creatorId', 'firstName lastName profilePicture')
    .populate('members.userId', 'firstName lastName profilePicture skills')
    .populate('hackathonId', 'name slug startDate')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get user's teams
teamSchema.statics.getUserTeams = function (userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  return this.find({ 'members.userId': userId })
    .populate('creatorId', 'firstName lastName profilePicture')
    .populate('members.userId', 'firstName lastName profilePicture skills')
    .populate('hackathonId', 'name slug startDate')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
