const mongoose = require("mongoose");
const config = require("../config/env");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
