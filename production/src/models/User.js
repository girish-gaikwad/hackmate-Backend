const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../config/env");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    registrationOTP: {
      type: String,
      default: null,
    },
    forgotPasswordOTP: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    lastRegistrationOTPSentAt: {
      type: Date,
      default: null,
    },
    lastForgotPasswordOTPSentAt: {
      type: Date,
      default: null,
    },
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 604800, // 7 days in seconds
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Method to clear sensitive fields
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.registrationOTP;
  delete userObject.forgotPasswordOTP;
  delete userObject.refreshTokens;
  delete userObject.lastRegistrationOTPSentAt;
  delete userObject.lastForgotPasswordOTPSentAt;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
