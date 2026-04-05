const mongoose = require("mongoose");
const config = require("../config/env");

let cachedConnection = null;
let cachedConnectionPromise = null;

const connectDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  try {
    cachedConnectionPromise = mongoose.connect(config.MONGODB_URI);
    const conn = await cachedConnectionPromise;
    cachedConnection = conn;

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    cachedConnectionPromise = null;
    console.error("MongoDB Connection Error:", error.message);
    throw error;
  }
};

module.exports = connectDB;
