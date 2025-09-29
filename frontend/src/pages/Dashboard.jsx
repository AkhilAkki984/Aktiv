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
  TrendingUp,
  LogOut,
  Edit3,
  ChevronDown,
  CheckCircle,
  Menu,
  X,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    stats: [],
    activities: [],
    goals: [],
    userGoals: [],
    user: {}
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socket = useSocket();
  
  // AI Coach state
  const [showAICoachPopup, setShowAICoachPopup] = useState(false);
  const [showAICoachChat, setShowAICoachChat] = useState(false);

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

  // Function to refresh dashboard data
  const refreshDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await dashboardAPI.getStats();
      
      try {
        const [completedGoalsResponse, activeGoalsResponse, partnersResponse] = await Promise.allSettled([
          goalsAPI.getGoals({ status: 'completed' }),
          goalsAPI.getGoals({ status: 'active' }),
          partnersAPI.getPartners({ status: 'accepted' })
        ]);
        
        const completedGoals = completedGoalsResponse.status === 'fulfilled' ? completedGoalsResponse.value.data || [] : [];
        const activeGoals = activeGoalsResponse.status === 'fulfilled' ? activeGoalsResponse.value.data || [] : [];
        const activePartners = partnersResponse.status === 'fulfilled' ? partnersResponse.value.data || [] : [];
        
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
        
        // Update stats with real data
        if (dashboardData.stats && dashboardData.stats.length > 0) {
          // Update partner count from user profile
          const partnersStatIndex = dashboardData.stats.findIndex(stat => 
            stat.label && stat.label.toLowerCase().includes('partner')
          );
          if (partnersStatIndex !== -1) {
            const connectionCount = user?.connectionCount || 0;
            dashboardData.stats[partnersStatIndex].value = connectionCount;
            dashboardData.stats[partnersStatIndex].sub = connectionCount > 0 
              ? `${connectionCount} active connection${connectionCount > 1 ? 's' : ''}`
              : 'No partners yet';
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
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh dashboard data:', err);
      enqueueSnackbar('Failed to refresh data', { variant: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  // Show AI Coach popup on first login
  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('hasSeenAICoachPopup');
    if (!hasSeenPopup && user) {
      setShowAICoachPopup(true);
    }
  }, [user]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        if (!user || !localStorage.getItem('token')) {
          setLoading(false);
          return;
        }
        
        await refreshDashboardData();
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        
        if (err.response?.status === 401) {
          enqueueSnackbar('Please log in to view dashboard', { variant: 'error' });
          navigate('/login');
        } else {
          enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
        }
        
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
  }, [enqueueSnackbar, user, navigate]);

  // Add icons to stats data
  const statsWithIcons = dashboardData.stats.map((stat, index) => ({
    ...stat,
    icon: [<Activity />, <Calendar />, <Users />, <Target />, <TrendingUp />][index] || <Activity />
  }));

  const activities = dashboardData.activities || [];
  const userGoals = dashboardData.userGoals || [];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Welcome to Aktiv
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in to access your personalized dashboard and track your goals.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div 
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-3 cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Aktiv</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {[
                { name: 'Dashboard', path: '/dashboard' },
                { name: 'Goals', path: '/goals' },
                { name: 'Partners', path: '/find-partners' },
                 { name: 'Chat', path: '/chat/inbox' },
                { name: 'Feed', path: '/feed' },
                { name: 'Leaderboard', path: '/leaderboard' }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleMode}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle theme"
              >
                {mode === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {/* Notifications */}
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={getAvatarSrc(user?.avatar, user?.username)}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user?.username}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                    >
                      <button
                        onClick={() => { navigate("/profile"); setMenuOpen(false); }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit3 size={16} />
                        <span>Edit Profile</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-200"
            >
              <div className="px-4 py-3 space-y-1">
                {[
                  { name: 'Dashboard', path: '/dashboard' },
                  { name: 'Goals', path: '/goals' },
                  { name: 'Partners', path: '/find-partners' },
                   { name: 'Chat', path: '/chat/inbox' },
                  { name: 'Feed', path: '/feed' },
                  { name: 'Leaderboard', path: '/leaderboard' }
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back, {user?.username} 👋
              </h1>
              <p className="text-gray-600 mt-2">
                Here's your progress overview for today
              </p>
            </div>
            <button
              onClick={refreshDashboardData}
              disabled={refreshing}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <StatCardSkeleton key={idx} />
              ))
            ) : statsWithIcons.length > 0 ? (
              statsWithIcons.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No data available</p>
              </div>
            )}
          </div>
        </section>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <DashboardCard
            title="Recent Completed Goals"
            action={{
              label: "View All",
              onClick: () => navigate("/completed-goals")
            }}
            onRefresh={refreshDashboardData}
          >
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <ActivityItemSkeleton key={i} />
              ))
            ) : activities.length > 0 ? (
              activities
                .filter(a => a.status === 'completed')
                .sort((a, b) => new Date(b.completedAt || b.time) - new Date(a.completedAt || a.time))
                .slice(0, 3)
                .map((activity, index) => (
                  <ActivityItem key={activity._id} activity={activity} index={index} />
                ))
            ) : (
              <EmptyState
                icon={<CheckCircle size={48} />}
                title="No completed goals"
                description="Complete your first goal to see it here!"
              />
            )}
          </DashboardCard>

          {/* Active Goals */}
          <DashboardCard
            title="Active Goals"
            action={{
              label: "View All", 
              onClick: () => navigate("/goals")
            }}
            onRefresh={refreshDashboardData}
          >
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <GoalItemSkeleton key={i} />
              ))
            ) : userGoals.length > 0 ? (
              userGoals
                .filter(goal => goal.status !== 'completed')
                .slice(0, 3)
                .map((goal, index) => (
                  <GoalItem key={goal._id} goal={goal} index={index} />
                ))
            ) : (
              <EmptyState
                icon={<Target size={48} />}
                title="No active goals"
                description="Create your first goal to get started!"
                action={{
                  label: "Create Goal",
                  onClick: () => navigate("/goals")
                }}
              />
            )}
          </DashboardCard>
        </div>
      </main>

      {/* AI Coach Components */}
      <AICoachPopup
        isOpen={showAICoachPopup}
        onClose={handleAICoachClose}
        onOpenChat={handleAICoachOpen}
        user={user}
      />

      <AICoachChat
        isOpen={showAICoachChat}
        onClose={handleAICoachChatClose}
        user={user}
      />

      {!showAICoachChat && (
        <AICoachButton onClick={handleAICoachOpen} />
      )}
    </div>
  );
};

// Reusable Components
const StatCard = ({ icon, label, value, sub, color = '#3b82f6' }) => (
  <motion.div
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all"
  >
    <div className="flex items-center space-x-4">
      <div 
        className="p-3 rounded-xl text-white flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
        <p className="text-sm font-medium text-gray-600 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  </motion.div>
);

const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-7 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

const DashboardCard = ({ title, action, onRefresh, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
    <div className="p-6 space-y-4">
      {children}
    </div>
  </div>
);

const ActivityItem = ({ activity, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
      <p className="text-xs text-gray-500 mt-1">
        Completed • {activity.time}
      </p>
    </div>
    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
      <CheckCircle size={16} className="text-green-500" />
      <span className="text-xs font-medium text-green-600">Done</span>
    </div>
  </motion.div>
);

const ActivityItemSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 animate-pulse">
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="w-12 h-6 bg-gray-200 rounded ml-4"></div>
  </div>
);

const GoalItem = ({ goal, index }) => {
  const progress = goal.progress?.targetCheckIns > 0 
    ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{goal.title}</h4>
          <p className="text-xs text-gray-500 mt-1">
            {goal.progress?.completedCheckIns || 0}/{goal.progress?.targetCheckIns || 0} check-ins • {goal.progress?.currentStreak || 0} day streak
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-3 flex-shrink-0 ${
          goal.status === 'active' ? 'bg-green-100 text-green-800' :
          goal.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {goal.status}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${progress}%`,
              backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6'
            }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">{progress}% complete</span>
          {progress >= 90 && progress < 100 && (
            <span className="text-xs text-yellow-600 font-medium">Almost there!</span>
          )}
          {progress >= 100 && (
            <span className="text-xs text-green-600 font-medium">Completed! 🎉</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const GoalItemSkeleton = () => (
  <div className="p-4 rounded-lg border border-gray-200 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="w-16 h-6 bg-gray-200 rounded ml-3"></div>
    </div>
    <div className="space-y-2">
      <div className="w-full bg-gray-200 rounded-full h-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
    </div>
  </div>
);

const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-8">
    <div className="text-gray-400 mb-3 inline-block">{icon}</div>
    <h4 className="text-sm font-medium text-gray-900 mb-1">{title}</h4>
    <p className="text-sm text-gray-500 mb-4">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default Dashboard;