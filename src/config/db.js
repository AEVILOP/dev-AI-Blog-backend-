const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined in .env file");
    }
    console.log("Connecting to MongoDB Atlas...");
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// log disconnected

mongoose.connection.on("disconnected", () => {
  console.warn("disconnected - attempting to reconnect...");
});

// log reconnected

mongoose.connection.on("reconnected", () => {
  console.log("reconnected");
});

// log error

mongoose.connection.on("error", (error) => {
  console.log(`Error: ${error.message}`);
});

module.exports = connectDB;
