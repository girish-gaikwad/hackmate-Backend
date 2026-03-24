const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    collegeName: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
    },
    collegeDomain: {
      type: String,
      required: [true, 'College domain is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    graduationYear: {
      type: Number,
      required: [true, 'Graduation year is required'],
      min: [2020, 'Invalid graduation year'],
      max: [2035, 'Invalid graduation year'],
    },
    major: {
      type: String,
      required: [true, 'Major is required'],
      trim: true,
      maxlength: [100, 'Major cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    skills: {
      type: [String],
      default: [],
      validate: [
        (val) => val.length <= 20,
        'Cannot have more than 20 skills',
      ],
    },
    profilePicture: {
      type: String,
      default: '',
    },
    socialLinks: {
      github: {
        type: String,
        default: '',
        match: [/^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/?$|^$/, 'Invalid GitHub URL'],
      },
      linkedin: {
        type: String,
        default: '',
        match: [/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$|^$/, 'Invalid LinkedIn URL'],
      },
      portfolio: {
        type: String,
        default: '',
        match: [/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$|^$/, 'Invalid portfolio URL'],
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    reputation: {
      type: Number,
      default: 0,
      min: 0,
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
    },
    lastLogin: Date,
    refreshToken: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ collegeDomain: 1, isVerified: 1 });
userSchema.index({ email: 1 }, { unique: true });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();

  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate verification token
userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Static method to extract domain from email
userSchema.statics.extractDomain = function (email) {
  return email.split('@')[1];
};

const User = mongoose.model('User', userSchema);

module.exports = User;
