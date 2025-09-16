import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import CheckIn from "../models/CheckIn.js";
import Goal from "../models/Goal.js";

const router = express.Router();

// Helper function to get date range based on filter
const getDateRange = (filter) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'thisWeek':
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      return { start: startOfWeek, end: now };
    
    case 'lastWeek':
      const lastWeekEnd = new Date(startOfDay);
      lastWeekEnd.setDate(startOfDay.getDate() - startOfDay.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 7);
      return { start: lastWeekStart, end: lastWeekEnd };
    
    case 'lastMonth':
      const lastMonth = new Date(startOfDay);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { start: lastMonth, end: now };
    
    case 'custom':
      // For custom range, we'll expect startDate and endDate in query params
      return null; // Will be handled separately
    
    default:
      return { start: startOfWeek, end: now }; // Default to this week
  }
};

// Helper function to get user's partners (mutual connections)
const getUserPartners = async (userId) => {
  const connections = await Connection.find({
    $or: [
      { requester: userId, status: 'ACCEPTED' },
      { receiver: userId, status: 'ACCEPTED' }
    ]
  });
  
  return connections.map(conn => 
    conn.requester.toString() === userId ? conn.receiver : conn.requester
  );
};

// Helper function to calculate user metrics
const calculateUserMetrics = async (userId, metric, dateRange) => {
  const user = await User.findById(userId);
  if (!user) return 0;

  switch (metric) {
    case 'goals':
      const goals = await Goal.find({ 
        userId, 
        status: 'COMPLETED',
        ...(dateRange && { completedAt: { $gte: dateRange.start, $lte: dateRange.end } })
      });
      return goals.length;
    
    case 'streak':
      const checkIns = await CheckIn.find({ 
        userId,
        ...(dateRange && { createdAt: { $gte: dateRange.start, $lte: dateRange.end } })
      }).sort({ createdAt: -1 });
      
      if (checkIns.length === 0) return 0;
      
      let streak = 0;
      let currentDate = new Date(checkIns[0].createdAt);
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < checkIns.length; i++) {
        const checkInDate = new Date(checkIns[i].createdAt);
        checkInDate.setHours(0, 0, 0, 0);
        
        if (checkInDate.getTime() === currentDate.getTime()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    
    case 'checkins':
      const checkInsCount = await CheckIn.countDocuments({ 
        userId,
        ...(dateRange && { createdAt: { $gte: dateRange.start, $lte: dateRange.end } })
      });
      return checkInsCount;
    
    case 'partners':
      const partners = await getUserPartners(userId);
      return partners.length;
    
    default:
      return user.score || 0;
  }
};

// Helper function to get achievement badges
const getAchievementBadges = (user, metric, value) => {
  const badges = [];
  
  switch (metric) {
    case 'goals':
      if (value >= 50) badges.push({ name: 'Goal Crusher', icon: '🏆', color: 'gold' });
      else if (value >= 25) badges.push({ name: 'Goal Achiever', icon: '🎯', color: 'silver' });
      else if (value >= 10) badges.push({ name: 'Goal Starter', icon: '⭐', color: 'bronze' });
      break;
    
    case 'streak':
      if (value >= 100) badges.push({ name: 'Streak Master', icon: '🔥', color: 'gold' });
      else if (value >= 30) badges.push({ name: 'Streak Champion', icon: '⚡', color: 'silver' });
      else if (value >= 7) badges.push({ name: 'Streak Builder', icon: '💪', color: 'bronze' });
      break;
    
    case 'checkins':
      if (value >= 200) badges.push({ name: 'Check-in King', icon: '👑', color: 'gold' });
      else if (value >= 100) badges.push({ name: 'Check-in Pro', icon: '🏅', color: 'silver' });
      else if (value >= 50) badges.push({ name: 'Check-in Regular', icon: '🎖️', color: 'bronze' });
      break;
    
    case 'partners':
      if (value >= 20) badges.push({ name: 'Social Butterfly', icon: '🦋', color: 'gold' });
      else if (value >= 10) badges.push({ name: 'Team Player', icon: '🤝', color: 'silver' });
      else if (value >= 5) badges.push({ name: 'Connector', icon: '🔗', color: 'bronze' });
      break;
  }
  
  return badges;
};

// Get leaderboard with enhanced filtering and metrics
router.get("/", auth, async (req, res) => {
  try {
    const { 
      metric = 'score', 
      filter = 'thisWeek', 
      startDate, 
      endDate,
      partnersOnly = 'true' 
    } = req.query;

    // Get date range
    let dateRange = getDateRange(filter);
    if (filter === 'custom' && startDate && endDate) {
      dateRange = { 
        start: new Date(startDate), 
        end: new Date(endDate) 
      };
    }

    // Get user's partners if partnersOnly is true
    let partnerIds = [];
    if (partnersOnly === 'true') {
      partnerIds = await getUserPartners(req.user.id);
      partnerIds.push(req.user.id); // Include current user
    }

    // Get all users to calculate metrics
    const query = partnersOnly === 'true' ? { _id: { $in: partnerIds } } : {};
    const allUsers = await User.find(query).select('username firstName lastName avatar score checkIns');

    // Calculate metrics for all users
    const usersWithMetrics = await Promise.all(
      allUsers.map(async (user) => {
        const metricValue = await calculateUserMetrics(user._id, metric, dateRange);
        const badges = getAchievementBadges(user, metric, metricValue);
        
        // Add rank change for each user (mock data)
        const userRankChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
        
        return {
          ...user.toObject(),
          metricValue,
          badges,
          checkInsCount: user.checkIns.length,
          rankChange: userRankChange
        };
      })
    );

    // Sort by metric value
    usersWithMetrics.sort((a, b) => b.metricValue - a.metricValue);

    // Get top 10
    const leaders = usersWithMetrics.slice(0, 10);

    // Find current user's rank and data
    const currentUserIndex = usersWithMetrics.findIndex(
      user => user._id.toString() === req.user.id
    );
    
    const currentUser = currentUserIndex >= 0 ? usersWithMetrics[currentUserIndex] : null;
    const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;

    // Calculate rank change (simplified - in real app, you'd store previous rankings)
    const rankChange = currentUser ? Math.floor(Math.random() * 5) - 2 : 0; // Mock data (-2 to +2)

    res.json({
      leaders,
      currentUser: currentUser ? {
        ...currentUser,
        rank: currentUserRank,
        rankChange
      } : null,
      metric,
      filter,
      dateRange,
      totalUsers: usersWithMetrics.length
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's rank history (for rank movement indicators)
router.get("/rank-history/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { metric = 'score', days = 30 } = req.query;
    
    // This would typically come from a separate rank history collection
    // For now, we'll return mock data
    const history = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      history.push({
        date,
        rank: Math.floor(Math.random() * 50) + 1,
        metricValue: Math.floor(Math.random() * 100) + 10
      });
    }
    
    res.json({ history });
  } catch (err) {
    console.error('Rank history error:', err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
