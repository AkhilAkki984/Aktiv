import mongoose from 'mongoose';
import { UserGoal } from './models/Goal.js';
import User from './models/User.js';
import connectDB from './config/db.js';

const seedGoals = async () => {
  try {
    await connectDB();
    
    // Get a user to assign goals to
    const user = await User.findOne();
    if (!user) {
      console.log('No users found. Please create a user first.');
      return;
    }

    // Clear existing goals for this user
    await UserGoal.deleteMany({ user: user._id });

    // Create sample goals
    const sampleGoals = [
      {
        user: user._id,
        title: 'Morning Workout',
        description: 'Start each day with a 30-minute workout',
        category: 'fitness',
        status: 'active',
        schedule: {
          frequency: 'daily',
          time: '6:00 AM',
          days: []
        },
        duration: {
          type: 'month',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        progress: {
          targetCheckIns: 30,
          completedCheckIns: 5,
          currentStreak: 3,
          longestStreak: 5,
          lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        checkIns: [
          {
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            notes: 'Great workout!',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          },
          {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notes: 'Feeling strong',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            notes: 'Quick session',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        user: user._id,
        title: 'Read 30 Pages',
        description: 'Read at least 30 pages of a book daily',
        category: 'learning',
        status: 'active',
        schedule: {
          frequency: 'daily',
          time: '8:00 PM',
          days: []
        },
        duration: {
          type: 'month',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        progress: {
          targetCheckIns: 30,
          completedCheckIns: 4,
          currentStreak: 2,
          longestStreak: 7,
          lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        checkIns: [
          {
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            notes: 'Read about productivity',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          },
          {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notes: 'Great chapter on habits',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        user: user._id,
        title: 'Meditation',
        description: 'Practice mindfulness meditation daily',
        category: 'health',
        status: 'active',
        schedule: {
          frequency: 'daily',
          time: '7:00 AM',
          days: []
        },
        duration: {
          type: 'month',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        progress: {
          targetCheckIns: 30,
          completedCheckIns: 7,
          currentStreak: 7,
          longestStreak: 12,
          lastCheckIn: new Date()
        },
        checkIns: [
          {
            date: new Date(),
            notes: 'Peaceful morning',
            createdAt: new Date()
          },
          {
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            notes: 'Focused session',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          },
          {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notes: 'Mindful breathing',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        user: user._id,
        title: 'Learn Spanish',
        description: 'Practice Spanish for 30 minutes daily',
        category: 'learning',
        status: 'paused',
        schedule: {
          frequency: 'weekdays',
          time: '7:30 PM',
          days: []
        },
        duration: {
          type: 'quarter',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        },
        progress: {
          targetCheckIns: 65,
          completedCheckIns: 2,
          currentStreak: 0,
          longestStreak: 3,
          lastCheckIn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        checkIns: [
          {
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            notes: 'Basic vocabulary',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          },
          {
            date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            notes: 'Grammar practice',
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        user: user._id,
        title: 'Drink 8 Glasses Water',
        description: 'Stay hydrated by drinking 8 glasses of water daily',
        category: 'health',
        status: 'active',
        schedule: {
          frequency: 'daily',
          time: 'Throughout day',
          days: []
        },
        duration: {
          type: 'month',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        progress: {
          targetCheckIns: 30,
          completedCheckIns: 6,
          currentStreak: 4,
          longestStreak: 8,
          lastCheckIn: new Date()
        },
        checkIns: [
          {
            date: new Date(),
            notes: 'Stayed hydrated',
            createdAt: new Date()
          },
          {
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            notes: 'Good water intake',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          },
          {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notes: 'Met daily goal',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          }
        ]
      }
    ];

    // Insert sample goals
    const createdGoals = await UserGoal.insertMany(sampleGoals);
    console.log(`Created ${createdGoals.length} sample goals for user: ${user.username}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding goals:', error);
    process.exit(1);
  }
};

seedGoals();
