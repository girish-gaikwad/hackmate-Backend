const mongoose = require('mongoose');

const teammateRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
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
    collegeDomain: {
      type: String,
      required: [true, 'College domain is required'],
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [10, 'Title must be at least 10 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [50, 'Description must be at least 50 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    requiredSkills: {
      type: [String],
      required: [true, 'Required skills are required'],
      validate: [
        {
          validator: (val) => val.length >= 1,
          message: 'At least one required skill is needed',
        },
        {
          validator: (val) => val.length <= 15,
          message: 'Cannot have more than 15 required skills',
        },
      ],
    },
    preferredSkills: {
      type: [String],
      default: [],
      validate: [
        (val) => val.length <= 15,
        'Cannot have more than 15 preferred skills',
      ],
    },
    teamSizeNeeded: {
      type: Number,
      required: [true, 'Team size needed is required'],
      min: [1, 'Team size must be at least 1'],
      max: [10, 'Team size cannot exceed 10'],
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'any'],
      default: 'any',
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'completed'],
      default: 'open',
      index: true,
    },
    interestedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        message: {
          type: String,
          maxlength: [500, 'Interest message cannot exceed 500 characters'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
teammateRequestSchema.index({ collegeDomain: 1, status: 1, createdAt: -1 });
teammateRequestSchema.index({ title: 'text', description: 'text' });
teammateRequestSchema.index({ requiredSkills: 1 });

// Validate that either hackathonId or customHackathonName is provided
teammateRequestSchema.pre('validate', function (next) {
  if (!this.hackathonId && !this.customHackathonName) {
    this.invalidate(
      'hackathonId',
      'Either hackathonId or customHackathonName must be provided'
    );
  }
  next();
});

// Virtual to get interested users count
teammateRequestSchema.virtual('interestedCount').get(function () {
  return this.interestedUsers ? this.interestedUsers.length : 0;
});

// Instance method to add interested user
teammateRequestSchema.methods.addInterestedUser = function (userId, message = '') {
  // Check if user already expressed interest
  const existingInterest = this.interestedUsers.find(
    (interest) => interest.userId.toString() === userId.toString()
  );

  if (existingInterest) {
    throw new Error('You have already expressed interest in this request');
  }

  this.interestedUsers.push({
    userId,
    message,
    timestamp: new Date(),
  });

  return this;
};

// Instance method to remove interested user
teammateRequestSchema.methods.removeInterestedUser = function (userId) {
  this.interestedUsers = this.interestedUsers.filter(
    (interest) => interest.userId.toString() !== userId.toString()
  );
  return this;
};

// Instance method to check if user has expressed interest
teammateRequestSchema.methods.hasUserExpressedInterest = function (userId) {
  return this.interestedUsers.some(
    (interest) => interest.userId.toString() === userId.toString()
  );
};

// Instance method to increment view count
teammateRequestSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  return await this.save({ validateBeforeSave: false });
};

// Static method to get requests by college domain
teammateRequestSchema.statics.getByCollegeDomain = function (domain, options = {}) {
  const { status = 'open', page = 1, limit = 20 } = options;

  return this.find({ collegeDomain: domain, status })
    .populate('userId', 'firstName lastName profilePicture skills')
    .populate('hackathonId', 'name slug startDate')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

const TeammateRequest = mongoose.model('TeammateRequest', teammateRequestSchema);

module.exports = TeammateRequest;
