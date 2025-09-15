import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import CheckIn from '../models/CheckIn.js';
import { PartnerGoal } from '../models/Goal.js';
import { UserGoal } from '../models/Goal.js';

const router = express.Router();

// Get dashboard statistics for the current user
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current user with populated check-ins
    const currentUser = await User.findById(userId)
      .populate('checkIns')
      .select('-password');

    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get all partner goals where user is involved
    const partnerGoals = await PartnerGoal.find({
      $or: [{ user1: userId }, { user2: userId }]
    }).populate('user1 user2', 'username');

    // Get user's individual goals
    const userGoals = await UserGoal.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent check-ins from user and their partners
    const partnerIds = [...new Set(partnerGoals.flatMap(goal => 
      [goal.user1._id.toString(), goal.user2._id.toString()]
    ).filter(id => id !== userId))];

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

    // Active partners count (users who have goals with current user)
    const activePartners = partnerIds.length;

    // Check-ins this week
    const checkInsThisWeek = currentUser.checkIns.filter(
      checkIn => new Date(checkIn.createdAt) >= weekAgo
    ).length;

    // Previous week check-ins for comparison
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const checkInsLastWeek = currentUser.checkIns.filter(
      checkIn => {
        const checkInDate = new Date(checkIn.createdAt);
        return checkInDate >= twoWeeksAgo && checkInDate < weekAgo;
      }
    ).length;

    // Calculate current streak (consecutive days with check-ins)
    let currentStreak = 0;
    const checkInDates = currentUser.checkIns
      .map(checkIn => new Date(checkIn.createdAt).toDateString())
      .sort((a, b) => new Date(b) - new Date(a));

    const uniqueDates = [...new Set(checkInDates)];
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const expectedDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        currentStreak++;
      } else {
        break;
      }
    }

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

    // Prepare stats for dashboard
    const stats = [
      {
        label: "Active Partners",
        value: activePartners.toString(),
        sub: activePartners > 0 ? `+${Math.max(0, activePartners - 1)} this month` : "No partners yet",
        color: "#3b82f6"
      },
      {
        label: "Check-ins This Week",
        value: checkInsThisWeek.toString(),
        sub: `${checkInsThisWeek >= checkInsLastWeek ? '+' : ''}${checkInsThisWeek - checkInsLastWeek} from last week`,
        color: "#22c55e"
      },
      {
        label: "Current Streak",
        value: `${currentStreak} days`,
        sub: currentStreak > 0 ? (currentStreak >= 7 ? "Great streak!" : "Keep it up!") : "Start your streak!",
        color: "#f97316"
      },
      {
        label: "My Goals",
        value: `${activeUserGoals}/${totalUserGoals}`,
        sub: `${totalUserGoals - activeUserGoals} remaining`,
        color: "#a855f7"
      }
    ];

    res.json({
      stats,
      activities,
      goals: formattedPartnerGoals,
      userGoals: formattedUserGoals,
      user: {
        username: currentUser.username,
        score: currentUser.score,
        totalCheckIns: currentUser.checkIns.length
      }
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

export default router;
