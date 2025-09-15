// Script to populate sample data for testing dashboard
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import CheckIn from './models/CheckIn.js';
import Goal from './models/Goal.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data (optional - remove if you want to keep existing data)
    // await User.deleteMany({});
    // await CheckIn.deleteMany({});
    // await Goal.deleteMany({});

    // Create sample users if they don't exist
    const existingUser = await User.findOne({ email: 'test@aktiv.com' });
    
    if (!existingUser) {
      const user1 = new User({
        username: 'TestUser',
        email: 'test@aktiv.com',
        password: 'password123',
        bio: 'Fitness enthusiast',
        goals: ['Run 5K', 'Lose weight', 'Build muscle'],
        location: 'New York',
        gender: 'Male',
        onboarded: true
      });
      await user1.save();

      const user2 = new User({
        username: 'SarahM',
        email: 'sarah@aktiv.com',
        password: 'password123',
        bio: 'Yoga lover and runner',
        goals: ['Complete marathon', 'Daily yoga'],
        location: 'California',
        gender: 'Female',
        onboarded: true
      });
      await user2.save();

      const user3 = new User({
        username: 'MikeT',
        email: 'mike@aktiv.com',
        password: 'password123',
        bio: 'Weightlifting enthusiast',
        goals: ['Bench press 200lbs', 'Squat 300lbs'],
        location: 'Texas',
        gender: 'Male',
        onboarded: true
      });
      await user3.save();

      console.log('Created sample users');

      // Create sample goals
      const goal1 = new Goal({
        user1: user1._id,
        user2: user2._id,
        goal: 'Run 5K together every weekend'
      });
      await goal1.save();

      const goal2 = new Goal({
        user1: user1._id,
        user2: user3._id,
        goal: 'Complete 30-day fitness challenge'
      });
      await goal2.save();

      console.log('Created sample goals');

      // Create sample check-ins
      const checkIns = [
        {
          user: user1._id,
          message: 'Completed morning run - 3 miles in 25 minutes!'
        },
        {
          user: user2._id,
          message: 'Finished yoga session - feeling energized!'
        },
        {
          user: user1._id,
          message: 'Gym workout completed - chest and triceps'
        },
        {
          user: user3._id,
          message: 'Deadlift PR - 315lbs!'
        },
        {
          user: user1._id,
          message: 'Weekend 5K run with Sarah - great weather!'
        }
      ];

      for (const checkInData of checkIns) {
        const checkIn = new CheckIn(checkInData);
        await checkIn.save();
        
        // Add check-in to user's checkIns array
        await User.findByIdAndUpdate(
          checkInData.user,
          { $push: { checkIns: checkIn._id } }
        );
      }

      console.log('Created sample check-ins');
      console.log('Sample data seeded successfully!');
      console.log('\nLogin credentials:');
      console.log('Email: test@aktiv.com');
      console.log('Password: password123');
    } else {
      console.log('Sample user already exists. Skipping seed data creation.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();
