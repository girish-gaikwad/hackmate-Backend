const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
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
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: ['code', 'design', 'documentation', 'tutorial', 'other'],
      index: true,
    },
    category: {
      type: String,
      enum: ['web-dev', 'mobile', 'ai-ml', 'design', 'devops', 'other'],
      default: 'other',
      index: true,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileType: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    externalUrl: {
      type: String,
      default: '',
      match: [/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$|^$/, 'Invalid external URL'],
    },
    tags: {
      type: [String],
      default: [],
      validate: [(val) => val.length <= 10, 'Cannot have more than 10 tags'],
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    voters: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        vote: {
          type: Number,
          enum: [1, -1],
          required: true,
        },
      },
    ],
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: [500, 'Comment cannot exceed 500 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
resourceSchema.index({ collegeDomain: 1, resourceType: 1 });
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });
resourceSchema.index({ upvotes: -1, createdAt: -1 });

// Virtual for score (upvotes - downvotes)
resourceSchema.virtual('score').get(function () {
  return this.upvotes - this.downvotes;
});

// Virtual for comment count
resourceSchema.virtual('commentCount').get(function () {
  return this.comments ? this.comments.length : 0;
});

// Instance method to vote
resourceSchema.methods.vote = function (userId, voteValue) {
  const existingVoteIndex = this.voters.findIndex(
    (voter) => voter.userId.toString() === userId.toString()
  );

  if (existingVoteIndex !== -1) {
    const existingVote = this.voters[existingVoteIndex].vote;

    if (existingVote === voteValue) {
      // Remove vote (unvote)
      this.voters.splice(existingVoteIndex, 1);
      if (voteValue === 1) {
        this.upvotes = Math.max(0, this.upvotes - 1);
      } else {
        this.downvotes = Math.max(0, this.downvotes - 1);
      }
      return { action: 'removed', vote: null };
    } else {
      // Change vote
      this.voters[existingVoteIndex].vote = voteValue;
      if (voteValue === 1) {
        this.upvotes += 1;
        this.downvotes = Math.max(0, this.downvotes - 1);
      } else {
        this.downvotes += 1;
        this.upvotes = Math.max(0, this.upvotes - 1);
      }
      return { action: 'changed', vote: voteValue };
    }
  } else {
    // New vote
    this.voters.push({ userId, vote: voteValue });
    if (voteValue === 1) {
      this.upvotes += 1;
    } else {
      this.downvotes += 1;
    }
    return { action: 'added', vote: voteValue };
  }
};

// Instance method to get user's vote
resourceSchema.methods.getUserVote = function (userId) {
  const voter = this.voters.find(
    (v) => v.userId.toString() === userId.toString()
  );
  return voter ? voter.vote : 0;
};

// Instance method to add comment
resourceSchema.methods.addComment = function (userId, content) {
  this.comments.push({
    userId,
    content,
    createdAt: new Date(),
  });
  return this.comments[this.comments.length - 1];
};

// Instance method to remove comment
resourceSchema.methods.removeComment = function (commentId, userId) {
  const commentIndex = this.comments.findIndex(
    (c) => c._id.toString() === commentId.toString()
  );

  if (commentIndex === -1) {
    throw new Error('Comment not found');
  }

  const comment = this.comments[commentIndex];
  if (comment.userId.toString() !== userId.toString()) {
    throw new Error('Not authorized to delete this comment');
  }

  this.comments.splice(commentIndex, 1);
  return true;
};

// Instance method to increment view count
resourceSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  return await this.save({ validateBeforeSave: false });
};

// Instance method to increment download count
resourceSchema.methods.incrementDownloadCount = async function () {
  this.downloadCount += 1;
  return await this.save({ validateBeforeSave: false });
};

// Static method to get resources by college domain
resourceSchema.statics.getByCollegeDomain = function (domain, options = {}) {
  const { resourceType, category, page = 1, limit = 20, sort = '-createdAt' } = options;
  const query = { collegeDomain: domain, isActive: true };

  if (resourceType) {
    query.resourceType = resourceType;
  }

  if (category) {
    query.category = category;
  }

  let sortOption = {};
  if (sort === 'popular') {
    sortOption = { upvotes: -1, createdAt: -1 };
  } else if (sort === 'upvotes') {
    sortOption = { upvotes: -1 };
  } else {
    sortOption = { createdAt: -1 };
  }

  return this.find(query)
    .populate('userId', 'firstName lastName profilePicture')
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get popular resources
resourceSchema.statics.getPopular = function (domain, limit = 10) {
  return this.find({ collegeDomain: domain, isActive: true })
    .populate('userId', 'firstName lastName profilePicture')
    .sort({ upvotes: -1, viewCount: -1 })
    .limit(limit);
};

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
