const mongoose = require('mongoose');
const slugify = require('slugify');

const hackathonSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: [true, 'Hackathon name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    platformSource: {
      type: String,
      required: [true, 'Platform source is required'],
      enum: ['devpost', 'mlh', 'hackerearth', 'hackathon.com', 'manual', 'other'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    registrationDeadline: {
      type: Date,
      index: true,
    },
    prizePool: {
      type: Number,
      default: 0,
      min: 0,
    },
    prizeCurrency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    themes: {
      type: [String],
      default: [],
      index: true,
    },
    eligibility: {
      type: String,
      enum: ['students-only', 'open-to-all', 'professionals', 'specific'],
      default: 'open-to-all',
    },
    locationType: {
      type: String,
      enum: ['online', 'in-person', 'hybrid'],
      default: 'online',
    },
    location: {
      city: String,
      country: String,
      venue: String,
    },
    externalUrl: {
      type: String,
      required: [true, 'External URL is required'],
      match: [/^https?:\/\//, 'Please provide a valid URL'],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    organizerName: {
      type: String,
      default: '',
    },
    organizerLogo: {
      type: String,
      default: '',
    },
    schedule: [
      {
        title: String,
        datetime: Date,
        description: String,
      },
    ],
    prizes: [
      {
        position: String,
        amount: Number,
        description: String,
      },
    ],
    sponsors: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'ended'],
      default: 'upcoming',
      index: true,
    },
    bookmarkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSynced: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
hackathonSchema.index({ status: 1, startDate: -1 });
hackathonSchema.index({ themes: 1, status: 1 });
hackathonSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Pre-save middleware to generate slug
hackathonSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
    // Add unique suffix if needed
    this.slug = `${this.slug}-${Date.now().toString(36)}`;
  }
  next();
});

// Pre-save middleware to update status based on dates
hackathonSchema.pre('save', function (next) {
  const now = new Date();
  if (this.endDate < now) {
    this.status = 'ended';
  } else if (this.startDate <= now && this.endDate >= now) {
    this.status = 'ongoing';
  } else {
    this.status = 'upcoming';
  }
  next();
});

// Static method to update all hackathon statuses
hackathonSchema.statics.updateAllStatuses = async function () {
  const now = new Date();

  // Update ended hackathons
  await this.updateMany(
    { endDate: { $lt: now }, status: { $ne: 'ended' } },
    { $set: { status: 'ended' } }
  );

  // Update ongoing hackathons
  await this.updateMany(
    {
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: { $ne: 'ongoing' },
    },
    { $set: { status: 'ongoing' } }
  );

  // Update upcoming hackathons
  await this.updateMany(
    { startDate: { $gt: now }, status: { $ne: 'upcoming' } },
    { $set: { status: 'upcoming' } }
  );
};

// Virtual for duration in days
hackathonSchema.virtual('durationDays').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days until start
hackathonSchema.virtual('daysUntilStart').get(function () {
  if (!this.startDate) return null;
  const now = new Date();
  if (now >= this.startDate) return 0;
  const diffTime = this.startDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to increment view count
hackathonSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  return await this.save({ validateBeforeSave: false });
};

const Hackathon = mongoose.model('Hackathon', hackathonSchema);

module.exports = Hackathon;
