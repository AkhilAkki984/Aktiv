// backend/config/Db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aktiv';
    console.log('Connecting to MongoDB with URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected ✅');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

export default connectDB;