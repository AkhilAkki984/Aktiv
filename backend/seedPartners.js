import mongoose from 'mongoose';
import User from './models/User.js';
import connectDB from './config/db.js';

const seedPartners = async () => {
  try {
    await connectDB();
    
    // Clear existing users (except the first one if it exists)
    const existingUsers = await User.find();
    if (existingUsers.length > 1) {
      await User.deleteMany({ _id: { $ne: existingUsers[0]._id } });
    }

    // Sample partner data
    const samplePartners = [
      {
        username: 'sarahm',
        email: 'sarah.miller@example.com',
        firstName: 'Sarah',
        lastName: 'Miller',
        bio: 'Looking for a workout buddy to stay motivated! 💪 Love early morning sessions.',
        city: 'New York',
        state: 'NY',
        geoLocation: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        partnerPreference: 'BOTH',
        goals: ['Fitness', 'Morning Routine', 'Health'],
        connectionCount: 12,
        postsCount: 8
      },
      {
        username: 'davidj',
        email: 'david.johnson@example.com',
        firstName: 'David',
        lastName: 'Johnson',
        bio: 'Reading 50 books this year! Currently diving into productivity and psychology books.',
        city: 'San Francisco',
        state: 'CA',
        geoLocation: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        partnerPreference: 'VIRTUAL',
        goals: ['Reading', 'Learning', 'Productivity'],
        connectionCount: 5,
        postsCount: 3
      },
      {
        username: 'emmal',
        email: 'emma.liu@example.com',
        firstName: 'Emma',
        lastName: 'Liu',
        bio: 'Daily meditation practice for mental clarity. Love sharing mindfulness tips! 🙏',
        city: 'San Francisco',
        state: 'CA',
        geoLocation: {
          latitude: 37.7849,
          longitude: -122.4094
        },
        partnerPreference: 'BOTH',
        goals: ['Meditation', 'Mindfulness', 'Mental Health'],
        connectionCount: 8,
        postsCount: 12
      },
      {
        username: 'miker',
        email: 'mike.rodriguez@example.com',
        firstName: 'Mike',
        lastName: 'Rodriguez',
        bio: 'Training for my first marathon! Looking for a running partner to keep me accountable.',
        city: 'Austin',
        state: 'TX',
        geoLocation: {
          latitude: 30.2672,
          longitude: -97.7431
        },
        partnerPreference: 'LOCAL',
        goals: ['Running', 'Nutrition', 'Fitness'],
        connectionCount: 15,
        postsCount: 6
      },
      {
        username: 'lisak',
        email: 'lisa.kim@example.com',
        firstName: 'Lisa',
        lastName: 'Kim',
        bio: 'Learning Python and improving my Spanish! Love connecting with fellow learners.',
        city: 'Seattle',
        state: 'WA',
        geoLocation: {
          latitude: 47.6062,
          longitude: -122.3321
        },
        partnerPreference: 'VIRTUAL',
        goals: ['Language Learning', 'Coding', 'Programming'],
        connectionCount: 7,
        postsCount: 4
      },
      {
        username: 'jamesw',
        email: 'james.wilson@example.com',
        firstName: 'James',
        lastName: 'Wilson',
        bio: 'Gym enthusiast working on better sleep schedule. Let\'s motivate each other!',
        city: 'Chicago',
        state: 'IL',
        geoLocation: {
          latitude: 41.8781,
          longitude: -87.6298
        },
        partnerPreference: 'BOTH',
        goals: ['Fitness', 'Sleep Schedule', 'Health'],
        connectionCount: 10,
        postsCount: 9
      },
      {
        username: 'alexchen',
        email: 'alex.chen@example.com',
        firstName: 'Alex',
        lastName: 'Chen',
        bio: 'Photography enthusiast and nature lover. Always looking for adventure buddies!',
        city: 'Portland',
        state: 'OR',
        geoLocation: {
          latitude: 45.5152,
          longitude: -122.6784
        },
        partnerPreference: 'LOCAL',
        goals: ['Photography', 'Nature', 'Adventure'],
        connectionCount: 6,
        postsCount: 15
      },
      {
        username: 'mariag',
        email: 'maria.garcia@example.com',
        firstName: 'Maria',
        lastName: 'Garcia',
        bio: 'Yoga instructor and wellness coach. Passionate about helping others achieve balance.',
        city: 'Miami',
        state: 'FL',
        geoLocation: {
          latitude: 25.7617,
          longitude: -80.1918
        },
        partnerPreference: 'BOTH',
        goals: ['Yoga', 'Wellness', 'Meditation'],
        connectionCount: 20,
        postsCount: 25
      },
      {
        username: 'tomlee',
        email: 'tom.lee@example.com',
        firstName: 'Tom',
        lastName: 'Lee',
        bio: 'Software engineer learning guitar. Looking for music and tech accountability partners!',
        city: 'Denver',
        state: 'CO',
        geoLocation: {
          latitude: 39.7392,
          longitude: -104.9903
        },
        partnerPreference: 'VIRTUAL',
        goals: ['Music', 'Programming', 'Learning'],
        connectionCount: 4,
        postsCount: 2
      },
      {
        username: 'sophiew',
        email: 'sophie.williams@example.com',
        firstName: 'Sophie',
        lastName: 'Williams',
        bio: 'Writer and book lover. Working on my first novel and need motivation to write daily!',
        city: 'Boston',
        state: 'MA',
        geoLocation: {
          latitude: 42.3601,
          longitude: -71.0589
        },
        partnerPreference: 'BOTH',
        goals: ['Writing', 'Reading', 'Creativity'],
        connectionCount: 9,
        postsCount: 18
      }
    ];

    // Create users
    const createdUsers = await User.insertMany(samplePartners);
    console.log(`Created ${createdUsers.length} sample partners`);
    
    // Update the first user (if exists) with some goals to test shared goals functionality
    const firstUser = await User.findOne();
    if (firstUser) {
      firstUser.goals = ['Fitness', 'Reading', 'Meditation', 'Learning'];
      firstUser.firstName = firstUser.firstName || 'John';
      firstUser.lastName = firstUser.lastName || 'Doe';
      firstUser.city = firstUser.city || 'New York';
      firstUser.state = firstUser.state || 'NY';
      firstUser.geoLocation = firstUser.geoLocation || {
        latitude: 40.7589,
        longitude: -73.9851
      };
      firstUser.partnerPreference = 'BOTH';
      await firstUser.save();
      console.log('Updated first user with goals and location data');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding partners:', error);
    process.exit(1);
  }
};

seedPartners();
