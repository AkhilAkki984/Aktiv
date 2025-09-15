import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { dashboardAPI } from "../utils/api";
import { useSnackbar } from "notistack";
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

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStats();
        setDashboardData(response.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
        // Fallback to dummy data if API fails
        setDashboardData({
          stats: [
            {
              icon: <Users />,
              label: 'Active Partners',
              value: '0',
              sub: 'No partners yet',
              color: '#3b82f6'
            },
            {
              icon: <Calendar />,
              label: 'Check-ins This Week',
              value: '0',
              sub: 'Start checking in!',
              color: '#22c55e'
            },
            {
              icon: <Activity />,
              label: 'Current Streak',
              value: '0 days',
              sub: 'Start your streak!',
              color: '#f97316'
            },
            {
              icon: <Target />,
              label: 'Goals Achieved',
              value: '0/0',
              sub: 'Create your first goal',
              color: '#a855f7'
            }
          ],
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
  }, [enqueueSnackbar]);

  // Add icons to stats data
  const statsWithIcons = dashboardData.stats.map((stat, index) => ({
    ...stat,
    icon: [<Users />, <Calendar />, <Activity />, <Target />][index] || <Activity />
  }));

  const activities = dashboardData.activities || [];
  const goals = dashboardData.goals || [];
  const userGoals = dashboardData.userGoals || [];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0f172a] transition-colors">
      {/* 🔹 Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white dark:bg-[#1e293b] shadow-md">
        {/* Logo + Name */}
        <div
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">
            A
          </div>
          <span className="text-xl font-bold text-blue-600">Aktiv</span>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-gray-700 dark:text-gray-200 font-medium">
          <button onClick={() => navigate("/dashboard")} className="cursor-pointer">Dashboard</button>
          <button onClick={() => navigate("/goals")} className="cursor-pointer">Goals</button>
          <button onClick={() => navigate("/matches")} className="cursor-pointer">Matches</button>
          <button onClick={() => navigate("/chat/samplePartnerId")} className="cursor-pointer">Chat</button>
          <button onClick={() => navigate("/feed")} className="cursor-pointer">Feed</button>
          <button onClick={() => navigate("/partners")} className="cursor-pointer">Partners</button>
          <button onClick={() => navigate("/leaderboard")} className="cursor-pointer">Leaderboard</button>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4 relative">
          {/* Theme toggle */}
          <button
            onClick={toggleMode}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer"
          >
            {mode === "light" ? (
              <Moon className="w-5 h-5 text-gray-800" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative cursor-pointer">
            <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          </div>

          {/* Profile Dropdown */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <img
                    src={user?.profilePic || "https://placehold.co/40x40"}
                    alt="profile"
                    className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600"
            />

            <span className="hidden sm:block font-medium text-gray-800 dark:text-gray-100">
              {user?.username || "Guest User"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          </div>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-14 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2">
              <button
                onClick={() => {
                  navigate("/profile");
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
              <hr className="border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
          className="text-2xl font-bold text-gray-800 dark:text-white"
        >
          Welcome back, {user?.username || "Guest"} 👋
        </motion.div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex flex-col p-5 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div>
                    <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
                <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded mt-2"></div>
              </div>
            ))
          ) : (
            statsWithIcons.map((s, idx) => (
              <StatCard key={idx} {...s} />
            ))
          )}
        </div>

        {/* Recent Activity + Active Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card title="Recent Activity" linkText="View All">
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
              activities.map((a, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-[#0f172a]">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">{a.title}</p>
                    <p className="text-sm text-gray-500">with {a.user} • {a.time}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity yet</p>
                <p className="text-sm">Start by checking in or creating goals!</p>
              </div>
            )}
          </Card>

          {/* My Goals */}
          <Card title="My Goals" linkText="View All" linkAction={() => navigate("/goals")}>
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
              userGoals.slice(0, 4).map((goal, i) => (
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
                    {goal.completedCheckIns}/{goal.targetCheckIns} check-ins • {goal.currentStreak} day streak
                  </p>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
                    ></div>
                  </div>
                  <p className="text-xs mt-1 text-gray-400">{goal.progress}%</p>
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
      </main>
    </div>
  );
};

/* 🔹 Reusable Components */
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="flex flex-col p-5 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition">
    <div className="flex items-center gap-3">
      <span
        className="p-3 rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <div>
        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
    {sub && <span className="text-xs mt-2" style={{ color }}>{sub}</span>}
  </div>
);

const Card = ({ title, linkText, linkAction, children }) => (
  <div className="p-5 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      <button 
        onClick={linkAction}
        className="text-sm text-blue-500 hover:underline cursor-pointer"
      >
        {linkText}
      </button>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    completed: "text-green-500",
    achieved: "text-purple-500",
    new: "text-blue-500",
  };
  return (
    <span className={`text-xs font-medium ${colors[status] || "text-gray-400"}`}>
      {status}
    </span>
  );
};

export default Dashboard;
