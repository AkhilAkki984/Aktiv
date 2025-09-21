import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { goalsAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";
import { getAvatarSrc } from "../utils/avatarUtils.js";
import {
  Sun,
  Moon,
  Bell,
  ArrowLeft,
  Edit3,
  ChevronDown,
  LogOut,
  Target,
  CheckCircle,
  Trash2,
  Calendar,
  Clock,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";

const CompletedGoals = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [completedGoals, setCompletedGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Fetch completed goals data
  useEffect(() => {
    const fetchCompletedGoals = async () => {
      try {
        setLoading(true);
        const response = await goalsAPI.getGoals({ status: 'completed' });
        // Sort by completion date (most recent first)
        const sortedGoals = response.data.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        );
        setCompletedGoals(sortedGoals);
      } catch (err) {
        console.error('Failed to fetch completed goals:', err);
        enqueueSnackbar('Failed to load completed goals', { variant: 'error' });
        setCompletedGoals(getDummyCompletedGoals());
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedGoals();
  }, [enqueueSnackbar]);

  // Dummy data for demonstration
  const getDummyCompletedGoals = () => [
    {
      _id: '1',
      title: '30-Day Morning Workout',
      status: 'completed',
      schedule: { frequency: 'daily', time: '6:00 AM' },
      progress: { completedCheckIns: 30, targetCheckIns: 30, currentStreak: 30 },
      category: 'fitness',
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000) // 32 days ago
    },
    {
      _id: '2',
      title: 'Read 10 Books',
      status: 'completed',
      schedule: { frequency: 'daily', time: '8:00 PM' },
      progress: { completedCheckIns: 10, targetCheckIns: 10, currentStreak: 10 },
      category: 'learning',
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
    },
    {
      _id: '3',
      title: 'Meditation Challenge',
      status: 'completed',
      schedule: { frequency: 'daily', time: '7:00 AM' },
      progress: { completedCheckIns: 21, targetCheckIns: 21, currentStreak: 21 },
      category: 'health',
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) // 28 days ago
    },
    {
      _id: '4',
      title: 'Learn Spanish Basics',
      status: 'completed',
      schedule: { frequency: 'daily', time: '7:30 PM' },
      progress: { completedCheckIns: 14, targetCheckIns: 14, currentStreak: 14 },
      category: 'learning',
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000) // 24 days ago
    }
  ];

  const handleDeleteCompletedGoal = async (goalId) => {
    if (window.confirm('Are you sure you want to delete this completed goal from your history? This action cannot be undone.')) {
      try {
        await goalsAPI.deleteGoal(goalId);
        setCompletedGoals(completedGoals.filter(goal => goal._id !== goalId));
        enqueueSnackbar('Completed goal deleted successfully', { variant: 'success' });
      } catch (err) {
        console.error('Delete completed goal error:', err);
        enqueueSnackbar(err.response?.data?.msg || 'Failed to delete completed goal', { variant: 'error' });
      }
    }
  };

  const getFrequencyText = (frequency) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekdays': return 'Weekdays';
      case 'weekends': return 'Weekends';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0f172a] transition-colors">
      {/* 🔹 Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white dark:bg-[#1e293b] shadow-md">
        {/* Back Button + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">
              A
            </div>
            <span className="text-xl font-bold text-blue-600">Aktiv</span>
          </div>
        </div>

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
              src={getAvatarSrc(user?.avatar, user?.username)}
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
      <main className="max-w-6xl mx-auto p-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Completed Goals
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Your achievements and completed goals history.
          </p>
        </motion.div>

        {/* Completed Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
                <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            ))
          ) : completedGoals.length > 0 ? (
            completedGoals.map((goal) => (
              <CompletedGoalCard
                key={goal._id}
                goal={goal}
                onDelete={handleDeleteCompletedGoal}
                getFrequencyText={getFrequencyText}
                formatDate={formatDate}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                No completed goals yet
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Complete your first goal to see it here!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Completed Goal Card Component
const CompletedGoalCard = ({ goal, onDelete, getFrequencyText, formatDate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {goal.title}
            </h3>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Completed
          </span>
        </div>
        <button
          onClick={() => onDelete(goal._id)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete from history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Completion Info */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Final Progress</span>
          <span>{goal.progress.completedCheckIns}/{goal.progress.targetCheckIns} days</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className="bg-green-600 h-2 rounded-full w-full"></div>
        </div>
      </div>

      {/* Schedule */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{getFrequencyText(goal.schedule.frequency)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{goal.schedule.time}</span>
        </div>
      </div>

      {/* Completion Date */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <span className="font-medium">Completed on:</span> {formatDate(goal.completedAt)}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>Final Streak: {goal.progress.currentStreak} days</span>
        <span className="text-green-600 dark:text-green-400 font-medium">100% Complete</span>
      </div>
    </motion.div>
  );
};

export default CompletedGoals;
