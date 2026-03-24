const mongoose = require('mongoose');

const collegeDomainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    collegeName: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
    },
    country: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    verifiedStudentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
collegeDomainSchema.index({ domain: 1 }, { unique: true });

// Static method to verify domain exists and is active
collegeDomainSchema.statics.verifyDomain = async function (domain) {
  const collegeDomain = await this.findOne({ domain: domain.toLowerCase(), isActive: true });
  return collegeDomain;
};

// Static method to get college name from domain
collegeDomainSchema.statics.getCollegeName = async function (domain) {
  const collegeDomain = await this.findOne({ domain: domain.toLowerCase() });
  return collegeDomain ? collegeDomain.collegeName : null;
};

// Static method to increment verified students count
collegeDomainSchema.statics.incrementVerifiedCount = async function (domain) {
  return this.findOneAndUpdate(
    { domain: domain.toLowerCase() },
    { $inc: { verifiedStudentsCount: 1 } },
    { new: true }
  );
};

// Static method to get all active domains
collegeDomainSchema.statics.getActiveDomains = function () {
  return this.find({ isActive: true })
    .select('domain collegeName country verifiedStudentsCount')
    .sort({ collegeName: 1 });
};

const CollegeDomain = mongoose.model('CollegeDomain', collegeDomainSchema);

module.exports = CollegeDomain;
