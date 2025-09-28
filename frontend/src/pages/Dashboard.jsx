import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { dashboardAPI, goalsAPI, partnersAPI } from "../utils/api";
import { useSnackbar } from "notistack";
import { useSocket } from "../hooks/useSocket";
import { getAvatarSrc } from "../utils/avatarUtils";
import AICoachPopup from "../components/AICoachPopup";
import AICoachChat from "../components/AICoachChat";
import AICoachButton from "../components/AICoachButton";
import {
  Sun,
  Moon,
  Bell,
  Activity,
  Target,
  Calendar,
  Users,
  LogOut,
  Edit3,
  ChevronDown,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    stats: [],
    activities: [],
    goals: [],
    userGoals: [],
    user: {}
  });
  const [loading, setLoading] = useState(true);
  const socket = useSocket();
  
  // AI Coach state
  const [showAICoachPopup, setShowAICoachPopup] = useState(false);
  const [showAICoachChat, setShowAICoachChat] = useState(false);
  const [hasSeenAICoach, setHasSeenAICoach] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // AI Coach handlers
  const handleAICoachClose = () => {
    setShowAICoachPopup(false);
    localStorage.setItem('hasSeenAICoachPopup', 'true');
  };

  const handleAICoachOpen = () => {
    setShowAICoachChat(true);
  };

  const handleAICoachChatClose = () => {
    setShowAICoachChat(false);
  };

  const handleAICoachMinimize = () => {
    setShowAICoachChat(false);
  };

  // Function to refresh dashboard data
  const refreshDashboardData = async () => {
    try {
      const response = await dashboardAPI.getStats();
      
      // Fetch completed goals, active goals, and partners separately to ensure we have real data
      try {
        const [completedGoalsResponse, activeGoalsResponse, partnersResponse] = await Promise.allSettled([
          goalsAPI.getGoals({ status: 'completed' }),
          goalsAPI.getGoals({ status: 'active' }),
          partnersAPI.getPartners({ status: 'accepted' })
        ]);
        
        const completedGoals = completedGoalsResponse.status === 'fulfilled' ? completedGoalsResponse.value.data || [] : [];
        const activeGoals = activeGoalsResponse.status === 'fulfilled' ? activeGoalsResponse.value.data || [] : [];
        const activePartners = partnersResponse.status === 'fulfilled' ? partnersResponse.value.data || [] : [];
        
        console.log('Partners API Response (Refresh):', partnersResponse);
        console.log('Active Partners Data (Refresh):', activePartners);
        console.log('Partners Count (Refresh):', activePartners.length);
        
        // Transform completed goals into activities format
        const completedActivities = completedGoals.map(goal => ({
          _id: goal._id,
          title: goal.title,
          status: 'completed',
          time: goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          completedAt: goal.completedAt || new Date(),
          category: goal.category,
          progress: goal.progress
        }));
        
        // Update dashboard data with real data
        const dashboardData = response.data;
        dashboardData.activities = completedActivities;
        dashboardData.userGoals = activeGoals;
        dashboardData.activePartners = activePartners;
        
        // Update stats with real partner count from user profile
        if (dashboardData.stats && dashboardData.stats.length > 0) {
          // Find the Active Partners stat and update it
          const partnersStatIndex = dashboardData.stats.findIndex(stat => 
            stat.label && stat.label.toLowerCase().includes('partner')
          );
          if (partnersStatIndex !== -1) {
            // Use user's connectionCount from profile data
            const connectionCount = user?.connectionCount || 0;
            dashboardData.stats[partnersStatIndex].value = connectionCount;
            
            // Update the sub text to show actual count
            if (connectionCount > 0) {
              dashboardData.stats[partnersStatIndex].sub = `${connectionCount} active connection${connectionCount > 1 ? 's' : ''}`;
            } else {
              dashboardData.stats[partnersStatIndex].sub = 'No partners yet';
            }
          }

          // Ensure Current Streak stat is present and accurate
          const streakStatIndex = dashboardData.stats.findIndex(stat => 
            stat.label && stat.label.toLowerCase().includes('streak')
          );
          const apiStreak = (dashboardData.currentStreak ?? 0);
          const maxGoalStreak = Math.max(0, ...activeGoals.map(g => g?.progress?.currentStreak || 0));
          const currentStreakValue = Math.max(apiStreak, maxGoalStreak);
          const streakSub = currentStreakValue > 0 ? (currentStreakValue >= 7 ? 'Great streak!' : 'Keep it up!') : 'Start your streak!';
          const streakStat = {
            label: 'Current Streak',
            value: `${currentStreakValue} days`,
            sub: streakSub,
            color: '#f97316'
          };

          if (streakStatIndex !== -1) {
            dashboardData.stats[streakStatIndex] = { ...dashboardData.stats[streakStatIndex], ...streakStat };
          } else {
            dashboardData.stats.push(streakStat);
          }
        }
        
        setDashboardData(dashboardData);
      } catch (goalsErr) {
        console.error('Failed to fetch goals:', goalsErr);
        // Fallback to original data
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh dashboard data:', err);
    }
  };

  // Show AI Coach popup on first login
  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('hasSeenAICoachPopup');
    if (!hasSeenPopup && user) {
      setShowAICoachPopup(true);
      setHasSeenAICoach(true);
    }
  }, [user]);

  // Listen for goal completion and dashboard refresh triggers
  useEffect(() => {
    const handleStorageChange = () => {
      const goalCompleted = localStorage.getItem('goal_completed');
      const dashboardRefresh = localStorage.getItem('dashboard_refresh');
      
      if (goalCompleted || dashboardRefresh) {
        console.log('Goal completion or dashboard refresh detected, refreshing data...');
        refreshDashboardData();
        
        // Clear the triggers
        localStorage.removeItem('goal_completed');
        localStorage.removeItem('dashboard_refresh');
      }
    };

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Check for existing triggers on mount
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('Fetching dashboard data...');
        console.log('User:', user);
        console.log('Token:', localStorage.getItem('token'));
        
        // Check if user is logged in
        if (!user || !localStorage.getItem('token')) {
          console.log('User not logged in, skipping dashboard fetch');
          setLoading(false);
          return;
        }
        
        const response = await dashboardAPI.getStats();
        console.log('Dashboard data received:', response.data);
        console.log('Stats array:', response.data.stats);
        console.log('Stats length:', response.data.stats?.length);
        
        // Fetch completed goals, active goals, and partners separately to ensure we have real data
        try {
          const [completedGoalsResponse, activeGoalsResponse, partnersResponse] = await Promise.allSettled([
            goalsAPI.getGoals({ status: 'completed' }),
            goalsAPI.getGoals({ status: 'active' }),
            partnersAPI.getPartners({ status: 'accepted' })
          ]);
          
          const completedGoals = completedGoalsResponse.status === 'fulfilled' ? completedGoalsResponse.value.data || [] : [];
          const activeGoals = activeGoalsResponse.status === 'fulfilled' ? activeGoalsResponse.value.data || [] : [];
          const activePartners = partnersResponse.status === 'fulfilled' ? partnersResponse.value.data || [] : [];
          
          console.log('User Profile:', user);
          console.log('User Connection Count:', user?.connectionCount);
          console.log('Partners API Response:', partnersResponse);
          console.log('Active Partners Data:', activePartners);
          console.log('Partners Count:', activePartners.length);
          
          // Transform completed goals into activities format
          const completedActivities = completedGoals.map(goal => ({
            _id: goal._id,
            title: goal.title,
            status: 'completed',
            time: goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            completedAt: goal.completedAt || new Date(),
            category: goal.category,
            progress: goal.progress
          }));
          
          // Update dashboard data with real data
          const dashboardData = response.data;
          dashboardData.activities = completedActivities;
          dashboardData.userGoals = activeGoals;
          dashboardData.activePartners = activePartners;
          
          // Update stats with real partner count from user profile
          if (dashboardData.stats && dashboardData.stats.length > 0) {
            // Find the Active Partners stat and update it
            const partnersStatIndex = dashboardData.stats.findIndex(stat => 
              stat.label && stat.label.toLowerCase().includes('partner')
            );
            if (partnersStatIndex !== -1) {
              // Use user's connectionCount from profile data
              const connectionCount = user?.connectionCount || 0;
              dashboardData.stats[partnersStatIndex].value = connectionCount;
              
              // Update the sub text to show actual count
              if (connectionCount > 0) {
                dashboardData.stats[partnersStatIndex].sub = `${connectionCount} active connection${connectionCount > 1 ? 's' : ''}`;
              } else {
                dashboardData.stats[partnersStatIndex].sub = 'No partners yet';
              }
            }

            // Ensure Current Streak stat is present and accurate
            const streakStatIndex = dashboardData.stats.findIndex(stat => 
              stat.label && stat.label.toLowerCase().includes('streak')
            );
            const apiStreak = (dashboardData.currentStreak ?? 0);
            const maxGoalStreak = Math.max(0, ...activeGoals.map(g => g?.progress?.currentStreak || 0));
            const currentStreakValue = Math.max(apiStreak, maxGoalStreak);
            const streakSub = currentStreakValue > 0 ? (currentStreakValue >= 7 ? 'Great streak!' : 'Keep it up!') : 'Start your streak!';
            const streakStat = {
              label: 'Current Streak',
              value: `${currentStreakValue} days`,
              sub: streakSub,
              color: '#f97316'
            };

            if (streakStatIndex !== -1) {
              dashboardData.stats[streakStatIndex] = { ...dashboardData.stats[streakStatIndex], ...streakStat };
            } else {
              dashboardData.stats.push(streakStat);
            }
          }
          
          setDashboardData(dashboardData);
        } catch (goalsErr) {
          console.error('Failed to fetch goals:', goalsErr);
          // Fallback to original data
          setDashboardData(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        console.error('Error details:', err.response?.data || err.message);
        
        // Check if it's an authentication error
        if (err.response?.status === 401) {
          console.log('Authentication error - user not logged in');
          enqueueSnackbar('Please log in to view dashboard', { variant: 'error' });
          // Redirect to login or show login prompt
          navigate('/login');
        } else {
          enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
        }
        
        // Show error state instead of fallback data
        console.log('Using error state - no fallback data');
        setDashboardData({
          stats: [],
          activities: [],
          goals: [],
          userGoals: [],
          user: {}
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [enqueueSnackbar, user]);

  // Listen for storage changes (when goals are completed in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'goal_completed' || e.key === 'dashboard_refresh') {
        refreshDashboardData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update partner count when user data changes
  useEffect(() => {
    if (user?.connectionCount !== undefined && dashboardData.stats) {
      const partnersStatIndex = dashboardData.stats.findIndex(stat => 
        stat.label && stat.label.toLowerCase().includes('partner')
      );
      if (partnersStatIndex !== -1) {
        const connectionCount = user.connectionCount || 0;
        setDashboardData(prevData => {
          const newData = { ...prevData };
          if (newData.stats && newData.stats[partnersStatIndex]) {
            newData.stats[partnersStatIndex].value = connectionCount;
            if (connectionCount > 0) {
              newData.stats[partnersStatIndex].sub = `${connectionCount} active connection${connectionCount > 1 ? 's' : ''}`;
            } else {
              newData.stats[partnersStatIndex].sub = 'No partners yet';
            }
          }
          return newData;
        });
      }
    }
  }, [user?.connectionCount]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleDashboardUpdate = () => {
      // Refresh dashboard data when user activity occurs
      refreshDashboardData();
    };

    socket.on('leaderboard_activity', handleDashboardUpdate);
    socket.on('user_activity', handleDashboardUpdate);
    socket.on('goal_completed', handleDashboardUpdate);

    return () => {
      socket.off('leaderboard_activity', handleDashboardUpdate);
      socket.off('user_activity', handleDashboardUpdate);
      socket.off('goal_completed', handleDashboardUpdate);
    };
  }, [socket]);

  // Add icons to stats data
  const statsWithIcons = dashboardData.stats.map((stat, index) => ({
    ...stat,
    icon: [<Users />, <Calendar />, <Activity />, <Target />, <TrendingUp />][index] || <Activity />
  }));

  const activities = dashboardData.activities || [];
  const goals = dashboardData.goals || [];
  const userGoals = dashboardData.userGoals || [];

  // Show loading or login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#0f172a] transition-colors flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Please log in to view your dashboard
          </h2>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white transition-colors">
      {/* 🔹 Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-md">
        {/* Logo + Name */}
        <div
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full font-bold text-white" style={{backgroundColor: '#0046ff'}}>
            A
          </div>
          <span className="text-xl font-bold text-black">Aktiv</span>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 font-medium">
          <button onClick={() => navigate("/dashboard")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Dashboard</button>
          <button onClick={() => navigate("/goals")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Goals</button>
          <button onClick={() => navigate("/find-partners")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Find Partners</button>
          <button onClick={() => navigate("/chat/samplePartnerId")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Chat</button>
          <button onClick={() => navigate("/feed")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Feed</button>
          <button onClick={() => navigate("/leaderboard")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Leaderboard</button>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4 relative">
          {/* Theme toggle */}
          <button
            onClick={toggleMode}
            className="p-2 rounded-full bg-white hover:bg-gray-100 border border-gray-200 transition cursor-pointer"
          >
            {mode === "light" ? (
              <Moon className="w-5 h-5 text-gray-600" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative cursor-pointer">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full" style={{backgroundColor: '#0046ff'}}></span>
          </div>

          {/* Profile Dropdown */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <img
                    src={getAvatarSrc(user?.avatar, user?.username)}
                    alt="profile"
                    className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600"
            />

            <span className="hidden sm:block font-medium text-black">
              {user?.username || "Guest User"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-14 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
              <button
                onClick={() => {
                  navigate("/profile");
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
              <hr className="border-gray-200 my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 🔹 Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-2xl font-bold text-black"
        >
          Welcome back, {user?.username || "Guest"} 👋
        </motion.div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex flex-col p-5 rounded-xl bg-white shadow-md border border-gray-200 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-6 w-16 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="h-3 w-20 bg-gray-200 rounded mt-2"></div>
              </div>
            ))
          ) : statsWithIcons.length > 0 ? (
            statsWithIcons.map((s, idx) => (
              <StatCard key={idx} {...s} />
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Unable to load dashboard data</p>
              <p className="text-sm">Please check your connection and try again</p>
            </div>
          )}
        </div>

        {/* Recent Activity + Active Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card 
            title="Recent Completed Goals" 
            linkText="View All" 
            linkAction={() => navigate("/completed-goals")}
            onRefresh={refreshDashboardData}
          >
            {loading ? (
              // Loading skeleton for activities
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-[#0f172a] animate-pulse">
                  <div>
                    <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))
            ) : activities.length > 0 ? (
              activities
                .filter(a => a.status === 'completed')
                .sort((a, b) => new Date(b.completedAt || b.time) - new Date(a.completedAt || a.time))
                .slice(0, 3)
                .map((a, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-[#0f172a]">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{a.title}</p>
                      <p className="text-sm text-gray-500">Completed • {a.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No completed goals yet</p>
                <p className="text-sm">Complete your first goal to see it here!</p>
              </div>
            )}
          </Card>

          {/* My Goals */}
          <Card 
            title="My Goals" 
            linkText="View All" 
            linkAction={() => navigate("/goals")}
            onRefresh={refreshDashboardData}
          >
            {loading ? (
              // Loading skeleton for goals
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full mt-2"></div>
                  <div className="h-3 w-8 bg-gray-300 dark:bg-gray-600 rounded mt-1"></div>
                </div>
              ))
            ) : userGoals.length > 0 ? (
              userGoals
                .filter(goal => goal.status !== 'completed')
                .slice(0, 3)
                .map((goal, i) => (
                <div key={goal._id} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{goal.title}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      goal.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      goal.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {goal.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {goal.progress?.completedCheckIns || 0}/{goal.progress?.targetCheckIns || 0} check-ins • {goal.progress?.currentStreak || 0} day streak
                  </p>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${goal.progress?.targetCheckIns > 0 ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100) : 0}%`, 
                        backgroundColor: goal.color || '#3b82f6' 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs mt-1 text-gray-400">
                    {goal.progress?.targetCheckIns > 0 ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100) : 0}%
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No goals yet</p>
                <p className="text-sm">Create your first goal to get started!</p>
              </div>
            )}
          </Card>
        </div>

        {/* Active Partners Section */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card title="Active Partners" linkText="View All" linkAction={() => navigate("/partners")}>
            {loading ? (
              // Loading skeleton for partners
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0f172a] animate-pulse">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                    <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))
            ) : dashboardData.activePartners && dashboardData.activePartners.length > 0 ? (
              dashboardData.activePartners.slice(0, 4).map((partner, i) => (
                <div key={partner._id || i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0f172a] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <img
                    src={getAvatarSrc(partner.avatar, partner.name)}
                    alt={partner.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{partner.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {partner.goalsCount || 0} shared goals • {partner.streak || 0} day streak
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active partners yet</p>
                <p className="text-sm">Connect with others to start your journey together!</p>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* AI Coach Components */}
      {showAICoachPopup && (
        <AICoachPopup
          user={user}
          onClose={handleAICoachClose}
          onOpenChat={handleAICoachOpen}
        />
      )}

      {showAICoachChat && (
        <AICoachChat
          user={user}
          isOpen={showAICoachChat}
          onClose={handleAICoachChatClose}
          onMinimize={handleAICoachMinimize}
        />
      )}

      {!showAICoachChat && (
        <AICoachButton
          onClick={handleAICoachOpen}
          hasUnreadMessages={false}
        />
      )}
    </div>
  );
};

/* 🔹 Reusable Components */
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="flex flex-col p-5 rounded-xl bg-white shadow-md border border-gray-200 cursor-pointer hover:shadow-lg hover:bg-gray-50 transition">
    <div className="flex items-center gap-3">
      <span
        className="p-3 rounded-full text-white"
        style={{ backgroundColor: color || '#0046ff' }}
      >
        {icon}
      </span>
      <div>
        <p className="text-xl font-bold text-black">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
    {sub && <span className="text-xs mt-2 text-gray-600">{sub}</span>}
  </div>
);

const Card = ({ title, linkText, linkAction, onRefresh, children }) => (
  <div className="p-5 rounded-xl bg-white shadow-md border border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-black">{title}</h2>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="text-sm text-gray-600 hover:text-black cursor-pointer"
            title="Refresh"
          >
            ↻
          </button>
        )}
        <button 
          onClick={linkAction}
          className="text-sm hover:underline cursor-pointer"
          style={{color: '#0046ff'}}
        >
          {linkText}
        </button>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  return (
    <span className="text-xs font-medium" style={{color: '#0046ff'}}>
      {status}
    </span>
  );
};

export default Dashboard;
