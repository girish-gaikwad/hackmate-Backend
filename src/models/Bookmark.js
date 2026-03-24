const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
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
      required: [true, 'Hackathon ID is required'],
      index: true,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate bookmarks
bookmarkSchema.index({ userId: 1, hackathonId: 1 }, { unique: true });

// Static method to check if bookmark exists
bookmarkSchema.statics.exists = async function (userId, hackathonId) {
  const bookmark = await this.findOne({ userId, hackathonId });
  return !!bookmark;
};

// Static method to get user's bookmarks with hackathon details
bookmarkSchema.statics.getUserBookmarks = function (userId, options = {}) {
  const { page = 1, limit = 20, status } = options;

  let pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'hackathons',
        localField: 'hackathonId',
        foreignField: '_id',
        as: 'hackathon',
      },
    },
    { $unwind: '$hackathon' },
  ];

  if (status) {
    pipeline.push({ $match: { 'hackathon.status': status } });
  }

  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        notificationsEnabled: 1,
        createdAt: 1,
        hackathon: {
          _id: 1,
          name: 1,
          slug: 1,
          description: 1,
          startDate: 1,
          endDate: 1,
          prizePool: 1,
          themes: 1,
          locationType: 1,
          status: 1,
          imageUrl: 1,
        },
      },
    }
  );

  return this.aggregate(pipeline);
};

// Static method to get users who bookmarked a hackathon with notifications enabled
bookmarkSchema.statics.getUsersForNotification = function (hackathonId) {
  return this.find({
    hackathonId,
    notificationsEnabled: true,
  })
    .populate('userId', 'email firstName preferences')
    .lean();
};

// Post-save hook to update hackathon bookmark count
bookmarkSchema.post('save', async function () {
  const Hackathon = mongoose.model('Hackathon');
  const count = await this.constructor.countDocuments({
    hackathonId: this.hackathonId,
  });
  await Hackathon.findByIdAndUpdate(this.hackathonId, { bookmarkCount: count });
});

// Post-remove hook to update hackathon bookmark count
bookmarkSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Hackathon = mongoose.model('Hackathon');
    const count = await mongoose.model('Bookmark').countDocuments({
      hackathonId: doc.hackathonId,
    });
    await Hackathon.findByIdAndUpdate(doc.hackathonId, { bookmarkCount: count });
  }
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

module.exports = Bookmark;
