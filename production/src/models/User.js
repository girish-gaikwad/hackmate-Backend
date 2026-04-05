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
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    username: {
      type: String,
      trim: true,
      unique: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    previousProjects: {
      type: [
        {
          title: {
            type: String,
            required: true,
            trim: true,
          },
          description: {
            type: String,
            default: "",
            trim: true,
          },
          link: {
            type: String,
            default: "",
            trim: true,
          },
          techStack: {
            type: [String],
            default: [],
          },
          completedAt: {
            type: Date,
            default: null,
          },
        },
      ],
      default: [],
    },
    bookmarkedHackathons: {
      type: [
        {
          source: {
            type: String,
            enum: ["unstop", "devpost", "other"],
            required: true,
          },
          sourceId: {
            type: String,
            required: true,
          },
          title: {
            type: String,
            required: true,
            trim: true,
          },
          url: {
            type: String,
            default: "",
            trim: true,
          },
          thumbnailUrl: {
            type: String,
            default: "",
            trim: true,
          },
          organization: {
            type: String,
            default: "",
            trim: true,
          },
          bookmarkedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    socialLinks: {
      type: Map,
      of: String,
      default: {},
    },
    stats: {
      hackathonsParticipated: {
        type: Number,
        default: 0,
      },
      hackathonsWon: {
        type: Number,
        default: 0,
      },
      lastActive: {
        type: Date,
        default: null,
      },
    },
    clg : {
        type : String,
        trim : true,
        default : "",
    },
    year : {
        type : Number,
        default : null,
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
    isProfileComplete: {
      type: Boolean,
      default: false,
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
