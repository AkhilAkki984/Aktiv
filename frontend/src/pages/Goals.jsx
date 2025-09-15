import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { goalsAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";
import {
  Sun,
  Moon,
  Bell,
  Plus,
  Calendar,
  Clock,
  Edit3,
  ChevronDown,
  LogOut,
  Target,
  CheckCircle,
  Pause,
  Play,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import GoalForm from "../components/GoalForm.jsx";

const Goals = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Fetch goals data
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await goalsAPI.getGoals();
        setGoals(response.data);
      } catch (err) {
        console.error('Failed to fetch goals:', err);
        enqueueSnackbar('Failed to load goals', { variant: 'error' });
        setGoals(getDummyGoals());
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [enqueueSnackbar]);

  // Dummy data for demonstration
  const getDummyGoals = () => [
    {
      _id: '1',
      title: 'Morning Workout',
      status: 'active',
      schedule: { frequency: 'daily', time: '6:00 AM' },
      progress: { completedCheckIns: 5, targetCheckIns: 7, currentStreak: 3 },
      category: 'fitness',
      createdAt: new Date()
    },
    {
      _id: '2',
      title: 'Read 30 Pages',
      status: 'active',
      schedule: { frequency: 'daily', time: '8:00 PM' },
      progress: { completedCheckIns: 4, targetCheckIns: 7, currentStreak: 2 },
      category: 'learning',
      createdAt: new Date()
    },
    {
      _id: '3',
      title: 'Meditation',
      status: 'active',
      schedule: { frequency: 'daily', time: '7:00 AM' },
      progress: { completedCheckIns: 7, targetCheckIns: 7, currentStreak: 7 },
      category: 'health',
      createdAt: new Date()
    },
    {
      _id: '4',
      title: 'Learn Spanish',
      status: 'paused',
      schedule: { frequency: 'weekdays', time: '7:30 PM' },
      progress: { completedCheckIns: 2, targetCheckIns: 5, currentStreak: 0 },
      category: 'learning',
      createdAt: new Date()
    },
    {
      _id: '5',
      title: 'Drink 8 Glasses Water',
      status: 'active',
      schedule: { frequency: 'daily', time: 'Throughout day' },
      progress: { completedCheckIns: 6, targetCheckIns: 7, currentStreak: 4 },
      category: 'health',
      createdAt: new Date()
    }
  ];

  const handleCheckIn = async (goalId) => {
    try {
      const response = await goalsAPI.checkIn(goalId, { notes: '' });
      setGoals(goals.map(goal => 
        goal._id === goalId ? response.data : goal
      ));
      enqueueSnackbar('Check-in successful!', { variant: 'success' });
    } catch (err) {
      console.error('Check-in error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Check-in failed', { variant: 'error' });
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setShowGoalForm(true);
  };

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setShowGoalForm(true);
  };

  const handleGoalSaved = (savedGoal) => {
    if (editingGoal) {
      setGoals(goals.map(goal => 
        goal._id === editingGoal._id ? savedGoal : goal
      ));
    } else {
      setGoals([savedGoal, ...goals]);
    }
    setShowGoalForm(false);
    setEditingGoal(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getProgressPercentage = (goal) => {
    if (goal.progress.targetCheckIns === 0) return 0;
    return Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100);
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
          <button onClick={() => navigate("/goals")} className="cursor-pointer text-blue-600 font-semibold">Goals</button>
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
      <main className="max-w-6xl mx-auto p-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              My Goals
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your progress and stay consistent.
            </p>
          </div>
          <button
            onClick={handleCreateGoal}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create New Goal
          </button>
        </motion.div>

        {/* Goals Grid */}
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
          ) : (
            <>
              {/* Goal Cards */}
              {goals.map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  onCheckIn={handleCheckIn}
                  onEdit={handleEditGoal}
                  getStatusColor={getStatusColor}
                  getProgressPercentage={getProgressPercentage}
                  getFrequencyText={getFrequencyText}
                />
              ))}
              
              {/* Create New Goal Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateGoal}
                className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Create New Goal
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Set a new goal and stay accountable with partners
                </p>
              </motion.div>
            </>
          )}
        </div>
      </main>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalForm
          goal={editingGoal}
          onSave={handleGoalSaved}
          onClose={() => {
            setShowGoalForm(false);
            setEditingGoal(null);
          }}
        />
      )}
    </div>
  );
};

// Goal Card Component
const GoalCard = ({ goal, onCheckIn, onEdit, getStatusColor, getProgressPercentage, getFrequencyText }) => {
  const progressPercentage = getProgressPercentage(goal);
  const isCheckedInToday = goal.progress.lastCheckIn && 
    new Date(goal.progress.lastCheckIn).toDateString() === new Date().toDateString();

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
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            {goal.title}
          </h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Weekly Progress</span>
          <span>{goal.progress.completedCheckIns}/{goal.progress.targetCheckIns} days</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
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

      {/* Actions */}
      <div className="flex gap-2">
        {goal.status === 'active' ? (
          <button
            onClick={() => onCheckIn(goal._id)}
            disabled={isCheckedInToday}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isCheckedInToday
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isCheckedInToday ? 'Checked In' : 'Check In'}
          </button>
        ) : goal.status === 'paused' ? (
          <button
            onClick={() => onCheckIn(goal._id)}
            className="flex-1 py-2 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Resume
          </button>
        ) : null}
        
        <button
          onClick={() => onEdit(goal)}
          className="py-2 px-4 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Edit
        </button>
      </div>
    </motion.div>
  );
};

export default Goals;
