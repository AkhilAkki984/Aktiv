import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import CheckIn from '../models/CheckIn.js';
import Connection from '../models/Connection.js';
import { PartnerGoal } from '../models/Goal.js';
import { UserGoal } from '../models/Goal.js';
import Post from '../models/Post.js';

const router = express.Router();

// Test endpoint without authentication
router.get('/test', (req, res) => {
  res.json({ message: 'Dashboard API is working!' });
});

// Get dashboard statistics for the current user
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current user with populated check-ins
    const currentUser = await User.findById(userId)
      .populate({
        path: 'checkIns',
        options: { sort: { createdAt: -1 } }
      })
      .select('-password');

    console.log('Current User:', currentUser.username);
    console.log('User Check-ins Count:', currentUser.checkIns.length);
    console.log('User Check-ins:', currentUser.checkIns);
    console.log('User Connection Count:', currentUser.connectionCount);

    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get all partner goals where user is involved
    const partnerGoals = await PartnerGoal.find({
      $or: [{ user1: userId }, { user2: userId }]
    }).populate('user1 user2', 'username');

    // Get user's individual goals
    const userGoals = await UserGoal.find({ user: userId })
      .sort({ createdAt: -1 });

    console.log('User Goals Found:', userGoals.length);
    console.log('Partner Goals Found:', partnerGoals.length);

    // Get active partners from connections
    const connections = await Connection.find({
      $or: [
        { user1: userId, status: 'accepted' },
        { user2: userId, status: 'accepted' },
        { user1: userId, status: 'ACCEPTED' },
        { user2: userId, status: 'ACCEPTED' }
      ]
    }).populate('user1 user2', 'username');

    const partnerIds = connections.map(conn => 
      conn.user1._id.toString() === userId ? conn.user2._id : conn.user1._id
    );

    console.log('Connections found:', connections.length);
    console.log('Partner IDs from connections:', partnerIds);
    console.log('Connection details:', connections.map(c => ({
      user1: c.user1.username,
      user2: c.user2.username,
      status: c.status
    })));

    const recentCheckIns = await CheckIn.find({
      user: { $in: [userId, ...partnerIds] }
    })
    .populate('user', 'username')
    .sort({ createdAt: -1 })
    .limit(10);

    // Calculate statistics
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active partners count - use user's connectionCount field
    const activePartners = currentUser.connectionCount || 0;
    
    console.log('Active Partners (from connectionCount):', activePartners);
    console.log('Partner IDs from connections query:', partnerIds);

    // Get total check-ins from all user goals (real data)
    const totalCheckInsFromGoals = userGoals.reduce((sum, goal) => {
      return sum + (goal.progress?.completedCheckIns || 0);
    }, 0);
    
    // Get check-ins this week from goals
    const checkInsThisWeekFromGoals = userGoals.reduce((sum, goal) => {
      if (!goal.checkIns) return sum;
      const weekCheckIns = goal.checkIns.filter(checkIn => {
        const checkInDate = new Date(checkIn.date);
        return checkInDate >= weekAgo && checkInDate <= now;
      }).length;
      return sum + weekCheckIns;
    }, 0);
    
    console.log('Total Check-ins from Goals:', totalCheckInsFromGoals);
    console.log('Check-ins This Week from Goals:', checkInsThisWeekFromGoals);
    console.log('User Goals with Check-ins:', userGoals.map(g => ({
      title: g.title,
      completedCheckIns: g.progress?.completedCheckIns || 0,
      checkIns: g.checkIns?.length || 0
    })));

    // Previous week check-ins for comparison
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const checkInsLastWeek = currentUser.checkIns.filter(
      checkIn => {
        const checkInDate = new Date(checkIn.createdAt);
        return checkInDate >= twoWeeksAgo && checkInDate < weekAgo;
      }
    ).length;

    // Calculate current streak from goals (real data)
    let currentStreak = 0;
    const allCheckInDates = [];
    
    // Collect all check-in dates from all goals
    userGoals.forEach(goal => {
      if (goal.checkIns) {
        goal.checkIns.forEach(checkIn => {
          allCheckInDates.push(new Date(checkIn.date).toDateString());
        });
      }
    });
    
    // Sort dates and get unique dates
    const uniqueDates = [...new Set(allCheckInDates)].sort((a, b) => new Date(b) - new Date(a));
    
    // Calculate consecutive streak
    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const expectedDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    console.log('Current Streak from Goals:', currentStreak);
    console.log('All Check-in Dates:', uniqueDates);

    // Get user's posts count (only posts with images)
    const allUserPosts = await Post.find({ user: userId }).select('mediaUrl mediaType text');
    const userPostsCount = await Post.countDocuments({ 
      user: userId, 
      mediaUrl: { $exists: true, $ne: null, $ne: '' },
      mediaType: { $in: ['image', 'video'] }
    });
    
    console.log('All user posts for user:', currentUser.username);
    console.log('Posts details:', allUserPosts.map(p => ({
      text: p.text?.substring(0, 50) + '...',
      mediaUrl: p.mediaUrl ? 'HAS_MEDIA' : 'NO_MEDIA',
      mediaType: p.mediaType
    })));
    console.log('Posts with media count:', userPostsCount);
    console.log('User ID:', userId);
    
    // Goals statistics
    const totalPartnerGoals = partnerGoals.length;
    const totalUserGoals = userGoals.length;
    const activeUserGoals = userGoals.filter(goal => goal.status === 'active').length;
    const activePartnerGoals = partnerGoals.filter(goal => {
      // Consider a goal active if it was created in the last 30 days
      return new Date(goal.createdAt) >= monthAgo;
    }).length;

    // Format recent activities
    const activities = recentCheckIns.map(checkIn => ({
      title: checkIn.message,
      user: checkIn.user.username,
      time: getTimeAgo(checkIn.createdAt),
      status: checkIn.user._id.toString() === userId ? 'completed' : 'new',
      createdAt: checkIn.createdAt
    }));

    // Format user goals with progress
    const formattedUserGoals = userGoals.slice(0, 5).map((goal, index) => {
      const progressPercentage = goal.progress.targetCheckIns > 0 
        ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100)
        : 0;
      
      return {
        _id: goal._id,
        title: goal.title,
        status: goal.status,
        progress: progressPercentage,
        completedCheckIns: goal.progress.completedCheckIns,
        targetCheckIns: goal.progress.targetCheckIns,
        currentStreak: goal.progress.currentStreak,
        schedule: goal.schedule,
        category: goal.category,
        color: ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#a855f7'][index % 5]
      };
    });

    // Format partner goals with progress simulation
    const formattedPartnerGoals = partnerGoals.slice(0, 3).map((goal, index) => {
      const partner = goal.user1._id.toString() === userId ? goal.user2 : goal.user1;
      const daysSinceCreated = Math.floor((now - new Date(goal.createdAt)) / (1000 * 60 * 60 * 24));
      const progress = Math.min(90, Math.max(10, daysSinceCreated * 3)); // Simulate progress based on days
      
      return {
        title: goal.goal,
        user: partner.username,
        due: new Date(new Date(goal.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        progress: progress,
        color: ['#22c55e', '#3b82f6', '#a855f7'][index % 3]
      };
    });

    // Calculate goals achieved (completed goals) - MUST be calculated first
    const completedUserGoals = userGoals.filter(goal => goal.status === 'completed').length;
    const completedPartnerGoals = partnerGoals.filter(goal => {
      // Simulate completed partner goals (goals older than 30 days with good progress)
      const daysSinceCreated = Math.floor((now - new Date(goal.createdAt)) / (1000 * 60 * 60 * 24));
      return daysSinceCreated >= 30;
    }).length;
    const totalGoalsAchieved = completedUserGoals + completedPartnerGoals;

    // Calculate dynamic consistency score based on real user activity
    const daysSinceJoined = Math.max(1, Math.floor((now - new Date(currentUser.createdAt)) / (1000 * 60 * 60 * 24)));
    
    // Dynamic consistency calculation:
    // 1. Check-in frequency (40 points) - based on actual check-ins vs expected
    // 2. Streak consistency (30 points) - based on current streak
    // 3. Goal progress (30 points) - based on goal completion and progress
    
    // Check-in frequency score (0-40 points) - using real data from goals
    const expectedCheckIns = Math.max(1, daysSinceJoined);
    const checkInFrequencyScore = Math.min(40, Math.round((totalCheckInsFromGoals / expectedCheckIns) * 40));
    
    // Streak consistency score (0-30 points) - more weight for longer streaks
    const streakScore = Math.min(30, currentStreak * 3); // 3 points per day of streak, max 30
    
    // Goal progress score (0-30 points) - based on overall goal progress
    const totalGoals = totalUserGoals + partnerGoals.length;
    let goalProgressScore = 0;
    if (totalGoals > 0) {
      // Calculate average progress across all goals
      const userGoalProgress = userGoals.reduce((sum, goal) => {
        const progress = goal.progress?.completedCheckIns || 0;
        const target = goal.progress?.targetCheckIns || 1;
        return sum + (progress / target);
      }, 0);
      
      const avgProgress = userGoalProgress / totalGoals;
      goalProgressScore = Math.min(30, Math.round(avgProgress * 30));
    }
    
    const consistencyScore = Math.min(100, checkInFrequencyScore + streakScore + goalProgressScore);
    
    console.log('Consistency Calculation:');
    console.log('- Check-in Frequency Score:', checkInFrequencyScore);
    console.log('- Streak Score:', streakScore);
    console.log('- Goal Progress Score:', goalProgressScore);
    console.log('- Total Consistency Score:', consistencyScore);

    // Prepare stats for dashboard
    const stats = [
      {
        label: "Active Partners",
        value: activePartners.toString(),
        sub: activePartners > 0 ? `${activePartners} partner${activePartners > 1 ? 's' : ''} active` : "No partners yet",
        color: "#3b82f6"
      },
      {
        label: "Total Check-ins",
        value: totalCheckInsFromGoals.toString(),
        sub: totalCheckInsFromGoals > 0 ? `${checkInsThisWeekFromGoals} this week` : "Start checking in!",
        color: "#22c55e"
      },
      {
        label: "Current Streak",
        value: `${currentStreak} days`,
        sub: currentStreak > 0 ? (currentStreak >= 7 ? "Great streak!" : "Keep it up!") : "Start your streak!",
        color: "#f97316"
      },
      {
        label: "Goals Achieved",
        value: `${totalGoalsAchieved}/${totalUserGoals + partnerGoals.length}`,
        sub: totalGoalsAchieved > 0 ? `${totalGoalsAchieved} goal${totalGoalsAchieved > 1 ? 's' : ''} completed` : "Complete your first goal!",
        color: "#a855f7"
      },
      {
        label: "Consistency Score",
        value: `${consistencyScore}%`,
        sub: consistencyScore >= 80 ? "Excellent consistency!" : consistencyScore >= 60 ? "Good progress!" : "Keep improving!",
        color: consistencyScore >= 80 ? "#10b981" : consistencyScore >= 60 ? "#f59e0b" : "#ef4444"
      }
    ];

    // Debug information
    console.log('Dashboard Stats for user:', currentUser.username);
    console.log('- Active Partners:', activePartners);
    console.log('- Check-ins This Week:', checkInsThisWeekFromGoals);
    console.log('- Current Streak:', currentStreak);
    console.log('- Total Goals Achieved:', totalGoalsAchieved);
    console.log('- Consistency Score:', consistencyScore);
    console.log('- Total Check-ins:', totalCheckInsFromGoals);

    res.json({
      stats,
      activities,
      goals: formattedPartnerGoals,
      userGoals: formattedUserGoals,
      user: {
        username: currentUser.username,
        score: currentUser.score,
        totalCheckIns: totalCheckInsFromGoals,
        postsCount: userPostsCount
      },
      // Additional data for frontend
      postsCount: userPostsCount,
      connectionsCount: activePartners,
      consistencyScore: consistencyScore,
      currentStreak: currentStreak,
      goalsAchieved: totalGoalsAchieved
    });

  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays === 1) {
    return '1 day ago';
  } else {
    return `${diffInDays} days ago`;
  }
}

// Test endpoint to debug user data
router.get('/debug/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const user = await User.findById(userId).populate('checkIns');
    const connections = await Connection.find({
      $or: [
        { user1: userId, status: 'accepted' },
        { user2: userId, status: 'accepted' }
      ]
    });
    const userGoals = await UserGoal.find({ user: userId });
    
    res.json({
      user: {
        username: user.username,
        checkInsCount: user.checkIns.length,
        checkIns: user.checkIns
      },
      connections: connections.length,
      userGoals: userGoals.length,
      goals: userGoals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
