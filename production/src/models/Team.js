const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    hackathon: {
      source: {
        type: String,
        enum: ["unstop", "devpost", "other"],
        required: true,
      },
      hackathonId: {
        type: String,
        required: true,
        index: true,
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
      url: {
        type: String,
        default: null,
      },
      deadlineText: {
        type: String,
        default: null,
      },
    },
    college: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 60,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    requirements: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    maxMembers: {
      type: Number,
      default: 4,
      min: 2,
      max: 10,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    tags: {
      type: [String],
      default: [],
    },
    openForRequests: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ "hackathon.source": 1, "hackathon.hackathonId": 1, college: 1 });

module.exports = mongoose.model("Team", teamSchema);
