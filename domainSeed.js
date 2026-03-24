import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ✅ Schema
const collegeDomainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: "",
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
  { timestamps: true }
);

const CollegeDomain = mongoose.model("CollegeDomain", collegeDomainSchema);

// ✅ Sample Data
const data = [
  { domain: "iitb.ac.in", collegeName: "Indian Institute of Technology Bombay", country: "India", verifiedStudentsCount: 1245 },
  { domain: "mit.edu", collegeName: "Massachusetts Institute of Technology", country: "USA", verifiedStudentsCount: 980 },
  { domain: "stanford.edu", collegeName: "Stanford University", country: "USA", verifiedStudentsCount: 860 },
  { domain: "iisc.ac.in", collegeName: "Indian Institute of Science Bangalore", country: "India", verifiedStudentsCount: 540 },
  { domain: "ox.ac.uk", collegeName: "University of Oxford", country: "United Kingdom", verifiedStudentsCount: 670 },
  { domain: "nitrkl.ac.in", collegeName: "National Institute of Technology Rourkela", country: "India", verifiedStudentsCount: 410 },
  { domain: "harvard.edu", collegeName: "Harvard University", country: "USA", verifiedStudentsCount: 720 },
  { domain: "unsw.edu.au", collegeName: "University of New South Wales", country: "Australia", verifiedStudentsCount: 390 },
];

// 🚀 Connect & Seed
const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    await CollegeDomain.deleteMany(); // optional: clear existing
    await CollegeDomain.insertMany(data);

    console.log("🌱 Data Seeded Successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding DB:", error);
    process.exit(1);
  }
};

seedDB();
